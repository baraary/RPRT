param(
    [string]$RootDir = "",
    [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$effectiveDir = if ([string]::IsNullOrWhiteSpace($RootDir)) { $PSScriptRoot } else { $RootDir.Trim().Trim('"') }
$root = [System.IO.Path]::GetFullPath($effectiveDir).TrimEnd('\')

$mimeTypes = @{
    '.html'        = 'text/html; charset=utf-8'
    '.htm'         = 'text/html; charset=utf-8'
    '.js'          = 'application/javascript; charset=utf-8'
    '.mjs'         = 'application/javascript; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.svg'         = 'image/svg+xml'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.gif'         = 'image/gif'
    '.ico'         = 'image/x-icon'
    '.ttf'         = 'font/ttf'
    '.otf'         = 'font/otf'
    '.woff'        = 'font/woff'
    '.woff2'       = 'font/woff2'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    Write-Host "RadioReport is already running on http://localhost:$Port/ (opening browser tab)."
    Start-Process "http://localhost:$Port/"
    exit 0
}

Write-Host "RadioReport Fast Offline Server active at http://localhost:$Port/"
Write-Host "Serving folder: $root"
Write-Host "Do not close this window while using RadioReport."

Start-Process "http://localhost:$Port/"

# Non-blocking event loop + RAM cache:
# Never stalls on Chrome speculative preconnect sockets, zero admin rights, zero compilation delay.
$fileCache = @{}
$pendingClients = New-Object System.Collections.ArrayList

function Serve-ClientRequest {
    param([System.Net.Sockets.TcpClient]$Client)
    try {
        $Client.ReceiveTimeout = 500
        $Client.SendTimeout = 5000
        $stream = $Client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
        $reqLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($reqLine)) {
            return
        }
        while ($true) {
            $headerLine = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($headerLine)) { break }
        }

        $parts = $reqLine.Split(' ')
        $method = if ($parts.Length -ge 1) { $parts[0].ToUpperInvariant() } else { 'GET' }
        $rawUrl = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
        $pathOnly = ($rawUrl -split '\?')[0]
        $decodedPath = [System.Uri]::UnescapeDataString($pathOnly).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($decodedPath)) {
            $decodedPath = 'index.html'
        }

        $relativeWinPath = $decodedPath -replace '/', '\'
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativeWinPath))

        $isInsideRoot = $candidate.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase) -or
                        $candidate.Equals($root, [System.StringComparison]::OrdinalIgnoreCase)

        if (-not $isInsideRoot -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            $candidate = Join-Path $root 'index.html'
        }

        $cached = $fileCache[$candidate]
        if ($null -eq $cached) {
            $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($candidate)
            $cacheHeader = if ($ext -eq '.html' -or $ext -eq '.htm') { 'no-cache' } else { 'public, max-age=86400' }
            $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: $cacheHeader`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($responseHeader)
            $cached = @{ Header = $headerBytes; Body = $bytes }
            $fileCache[$candidate] = $cached
        }

        $stream.Write($cached.Header, 0, $cached.Header.Length)
        if ($method -ne 'HEAD') {
            $stream.Write($cached.Body, 0, $cached.Body.Length)
        }
        $stream.Flush()
    } catch {
        # Ignore client resets or speculative drops
    } finally {
        try { $Client.Close() } catch {}
    }
}

try {
    while ($true) {
        $didWork = $false

        while ($listener.Pending()) {
            $newClient = $listener.AcceptTcpClient()
            [void]$pendingClients.Add(@{ Client = $newClient; AddedAt = [DateTime]::UtcNow })
            $didWork = $true
        }

        if ($pendingClients.Count -gt 0) {
            $now = [DateTime]::UtcNow
            for ($i = $pendingClients.Count - 1; $i -ge 0; $i--) {
                $entry = $pendingClients[$i]
                $c = $entry.Client
                $ready = $false
                try { $ready = ($c.Available -gt 0) } catch { $ready = $false }

                if ($ready) {
                    $pendingClients.RemoveAt($i)
                    Serve-ClientRequest -Client $c
                    $didWork = $true
                } elseif (($now - $entry.AddedAt).TotalMilliseconds -gt 2500) {
                    $pendingClients.RemoveAt($i)
                    try { $c.Close() } catch {}
                }
            }
        }

        if (-not $didWork) {
            [System.Threading.Thread]::Sleep(2)
        }
    }
} finally {
    foreach ($entry in $pendingClients) {
        try { $entry.Client.Close() } catch {}
    }
    $listener.Stop()
}
