param(
    [string]$RootDir = $PSScriptRoot,
    [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($RootDir).TrimEnd('\')

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

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    Write-Host "RadioReport is already running on http://localhost:$Port/ (opening browser tab)."
    exit 0
}

Write-Host "RadioReport Offline Server active at http://localhost:$Port/"
Write-Host "Serving folder: $root"
Write-Host "Do not close this window while using RadioReport."

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 3000
            $client.SendTimeout = 10000
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $reqLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($reqLine)) {
                continue
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

            $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($candidate)

            $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($responseHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne 'HEAD') {
                $stream.Write($bytes, 0, $bytes.Length)
            }
            $stream.Flush()
        } catch {
            # Ignore speculative browser preconnect drops or aborted reads
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
