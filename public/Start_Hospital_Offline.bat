@echo off
title RadioReport Offline Hospital Launcher
setlocal
set "PORT=8765"

echo ============================================================
echo   RadioReport - 100%% Offline Hospital Mode (No Admin/Internet)
echo   Starting local browser host on http://localhost:%PORT%/
echo   Keep this window open while using RadioReport.
echo ============================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0offline_server.ps1" -Port %PORT%

if errorlevel 1 (
  echo.
  echo Error starting local server. Press any key to close.
  pause >nul
)
