@echo off
title RadioReport Offline Hospital Launcher
setlocal
set "APP_DIR=%~dp0"
set "PORT=8765"

echo ============================================================
echo   RadioReport - 100%% Offline Hospital Mode (No Admin/Internet)
echo   Starting local browser host on http://localhost:%PORT%/
echo   Keep this window open while using RadioReport.
echo ============================================================

start "" "http://localhost:%PORT%/"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = [System.IO.Path]::GetFullPath('%APP_DIR%').TrimEnd('\'); " ^
  "$mime = @{'.html'='text/html; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.mjs'='application/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.json'='application/json; charset=utf-8';'.webmanifest'='application/manifest+json; charset=utf-8';'.svg'='image/svg+xml';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.ico'='image/x-icon';'.ttf'='font/ttf';'.woff'='font/woff';'.woff2'='font/woff2'}; " ^
  "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, %PORT%); " ^
  "$listener.Start(); " ^
  "Write-Host ('Listening on http://localhost:%PORT%/ serving ' + $root); " ^
  "try { while ($true) { " ^
  "  $client = $listener.AcceptTcpClient(); " ^
  "  try { " ^
  "    $stream = $client.GetStream(); " ^
  "    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true); " ^
  "    $reqLine = $reader.ReadLine(); " ^
  "    if (-not $reqLine) { $client.Close(); continue; } " ^
  "    while (($h = $reader.ReadLine()) -ne '' -and $h -ne $null) {} " ^
  "    $parts = $reqLine.Split(' '); " ^
  "    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }; " ^
  "    $cleanPath = ($rawPath -split '\?')[0]; " ^
  "    $cleanPath = [System.Uri]::UnescapeDataString($cleanPath).TrimStart('/'); " ^
  "    if ([string]::IsNullOrWhiteSpace($cleanPath)) { $cleanPath = 'index.html'; } " ^
  "    $candidate = [System.IO.Path]::GetFullPath((Join-Path $root ($cleanPath -replace '/', '\'))); " ^
  "    if (-not $candidate.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) { " ^
  "      $candidate = Join-Path $root 'index.html'; " ^
  "    } " ^
  "    $ext = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant(); " ^
  "    $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }; " ^
  "    $bytes = [System.IO.File]::ReadAllBytes($candidate); " ^
  "    $header = \"HTTP/1.1 200 OK`r`nContent-Type: $ctype`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n\"; " ^
  "    $hBytes = [System.Text.Encoding]::ASCII.GetBytes($header); " ^
  "    $stream.Write($hBytes, 0, $hBytes.Length); " ^
  "    if ($parts[0] -ne 'HEAD') { $stream.Write($bytes, 0, $bytes.Length); } " ^
  "    $stream.Flush(); " ^
  "  } catch {} finally { $client.Close(); } " ^
  "} } finally { $listener.Stop(); }"
