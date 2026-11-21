@echo off
title Scripture Typing
cd /d "%~dp0"

rem Runs Scripture Typing on THIS computer (handy for trying it out).
rem The family normally uses the copy on the NAS - see deploy\QNAP.md.

set "NASADDR="
if exist nas-address.txt set /p NASADDR=<nas-address.txt
if exist data\moved-to-nas.txt (
  echo.
  echo   The kids' progress lives on the NAS now, not on this computer.
  if defined NASADDR echo   Type at http://%NASADDR%:3316 on any computer instead.
  echo   Starting it here uses the old copy left behind, separate from the NAS.
  echo.
  choice /c YN /m "  Start a separate copy on this computer anyway"
  if errorlevel 2 exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required to run Scripture Typing.
  echo   Install the LTS version from https://nodejs.org then run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Starting Scripture Typing...
echo   Your browser will open at http://localhost:8080
echo   Leave this window open while typing. Close it to stop.
echo.
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8080"
node server.js
pause
