@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed for the local static preview.
  echo Open index.html for standard cropping only, or host this folder on HTTPS.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:8765/"
node preview.mjs
pause
