@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js was not found. Please install Node.js.
 pause
 exit /b 1
)
if not exist "server.js" (
 echo server.js was not found. Extract all files first.
 pause
 exit /b 1
)
start "Mini Game Server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
exit /b 0
