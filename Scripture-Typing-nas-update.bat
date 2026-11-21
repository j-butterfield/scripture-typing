@echo off
setlocal EnableExtensions
title Scripture Typing - Update the NAS
cd /d "%~dp0"

rem Puts the latest Scripture Typing on the family's QNAP NAS, where Container Station runs it.
rem The NAS side is deploy\qnap\docker-compose.yml: the shared folder, the port and the
rem restart marker below must match it. deploy\QNAP.md explains the whole set-up.
set "SHARE=Container"
set "PORT=3316"
set "MARKER=.update-ready"

rem This folder with no backslash on the end, because a quoted path that ends in \
rem escapes its own closing quote when robocopy reads it.
set "SRC=%CD%"
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

rem The first pass pulls the latest version, then hands over to the fresh copy of this
rem file, which runs again from the top with --pulled (see the pull below).
set "PULLED="
if "%~1"=="--pulled" set "PULLED=1"

if not defined PULLED (
  echo.
  echo   Updating Scripture Typing on the NAS...
  echo.
)

where git >nul 2>nul
if errorlevel 1 (
  echo   Git is required to pull updates.
  echo   Install it from https://git-scm.com/download/win then run this again.
  echo.
  pause
  exit /b 1
)

if exist .git goto :hasgit
echo   This folder was downloaded as a zip, so it can't pull updates.
echo   One-time fix: delete the folder and in a terminal run
echo     git clone https://github.com/j-butterfield/scripture-typing.git "%SRC%"
echo.
pause
exit /b 1
:hasgit

rem ---- which NAS: remembered in nas-address.txt next to this file ----------------

set "NAS="
set "ASKED="
if exist nas-address.txt set /p NAS=<nas-address.txt
if defined NAS goto :tidyaddress

:askaddress
echo   Which NAS should Scripture Typing live on? Type its IP address, for example
echo   192.168.1.50 (Qfinder Pro shows it - it's the same NAS as Adventures in Shajun).
echo.
set "NAS="
set /p "NAS=NAS address: "
echo.
if not defined NAS goto :askaddress
set "ASKED=1"

:tidyaddress
rem Whatever was typed, keep only the name: no \\ in front, no http://, no :port after it.
set "HOST="
for /f "tokens=1,2 delims=\/: " %%a in ("%NAS%") do (
  set "HOST=%%a"
  if /i "%%a"=="http" set "HOST=%%b"
  if /i "%%a"=="https" set "HOST=%%b"
)
set "NAS=%HOST%"
if not defined NAS goto :askaddress
set "DEST=\\%NAS%\%SHARE%\scripture-typing"

set "REACHED="
pushd "\\%NAS%\%SHARE%" >nul 2>nul && set "REACHED=1"
if not defined REACHED goto :noshare
popd
if defined ASKED (>nas-address.txt echo %NAS%)
if defined PULLED goto :pulled
echo   The NAS: \\%NAS%\%SHARE%
echo.

rem ---- the latest version from GitHub ---------------------------------------------

echo   Fetching the latest Scripture Typing...
git fetch origin main
if errorlevel 1 (
  echo.
  echo   Couldn't reach GitHub - check your internet connection and try again.
  echo.
  pause
  exit /b 1
)

echo   What's new:
git log --oneline --no-decorate HEAD..origin/main
for /f %%n in ('git rev-list --count HEAD..origin/main') do set NEWCOUNT=%%n
if "%NEWCOUNT%"=="0" (
  echo     (nothing - you're already up to date!^)
)
echo.

rem The pull can rewrite this very file, and cmd reads a running .bat a line at a
rem time from where it left off, so the lines after the pull could come from the
rem middle of the new copy. The pull and the hand-over are one block, which cmd
rem reads whole before running either; the fresh copy then starts from the top
rem with --pulled (every later version of this file must keep accepting it), and
rem without CALL the old copy is never read again.
(
  git pull --ff-only origin main || goto :pullfailed
  "%~f0" --pulled
)

:pulled
echo.

rem ---- the app's two folders on the NAS ------------------------------------------

for %%d in (app data) do if not exist "%DEST%\%%d" mkdir "%DEST%\%%d"
if not exist "%DEST%\app" goto :cantwrite
if not exist "%DEST%\data" goto :cantwrite

rem ---- this computer's progress, the first time only ------------------------------
rem Only when this computer has progress (from Scripture-Typing-play.bat) and the NAS
rem has none yet. The copy never overwrites anything on the NAS.

if not exist "data\db.json" goto :app
if exist "data\moved-to-nas.txt" goto :app
if exist "%DEST%\data\db.json" goto :app
echo   This computer has typing progress saved, and the NAS has none yet.
choice /c YN /m "  Copy this computer's kids and progress to the NAS"
if errorlevel 2 goto :skippeddata
echo.
echo   Copying the progress to %DEST%\data ...
robocopy "%SRC%\data" "%DEST%\data" db.json /XC /XN /XO /R:2 /W:2 /NP /NFL /NDL /NJH /NJS
if errorlevel 8 goto :datafailed
(
  echo The kids' typing progress moved to the NAS on %DATE%.
  echo It lives in %DEST%\data now,
  echo and Scripture Typing is at http://%NAS%:%PORT% on every computer.
  echo This folder is the copy left behind.
) > "data\moved-to-nas.txt"
echo   Done. From now on the progress lives on the NAS.
echo.
goto :app

:skippeddata
echo.
echo   Not copied. The NAS starts fresh the first time it runs.
echo.

rem ---- the app itself --------------------------------------------------------------
rem /MIR makes the app folder match this one exactly. The kids' progress is in the data
rem folder beside it, out of its reach, and this computer's own data\ is never sent.

:app
echo   Copying Scripture Typing to %DEST%\app ...
robocopy "%SRC%" "%DEST%\app" /MIR /R:2 /W:2 /XJ /FFT /NP /NFL /NDL /NJH /NJS ^
  /XD .git node_modules "%SRC%\data" "%SRC%\test" "%DEST%\app\data" ^
  /XF nas-address.txt %MARKER% *.log Thumbs.db .DS_Store
set "RC=%ERRORLEVEL%"
if %RC% GEQ 8 goto :copyfailed

rem ---- and the app on the NAS restarts onto it --------------------------------------
rem When nothing changed (robocopy code 0: nothing copied, nothing removed) it asks first,
rem because a restart in the middle of a speed test interrupts it.

if not "%RC%"=="0" goto :restart
echo.
echo   Nothing new was copied: the NAS already has this version.
choice /c YN /m "  Restart Scripture Typing on the NAS anyway"
if errorlevel 2 goto :norestart

:restart
(echo Scripture-Typing-nas-update.bat, %DATE% %TIME%) > "%DEST%\app\%MARKER%"
if not exist "%DEST%\app\%MARKER%" (
  echo   Couldn't leave the restart note on the NAS. Restart the scripture-typing
  echo   app in Container Station to use the new version.
)

echo.
echo   All copied! If Scripture Typing is running on the NAS it restarts itself
echo   in a few seconds. Kids already typing should refresh the page.
goto :typeat

:norestart
echo.
echo   Scripture Typing on the NAS carries on as it is.

:typeat
echo.
echo   Type at:  http://%NAS%:%PORT%
echo.
echo   First time? Follow deploy\QNAP.md to create the app in Container Station,
echo   with this line in its settings:  PUBLIC_URL=http://%NAS%:%PORT%
echo.
pause
exit /b 0

rem ---- when something goes wrong ----------------------------------------------------

:noshare
echo   Can't open \\%NAS%\%SHARE% from this computer.
echo.
echo   - In File Explorer, type \\%NAS%\%SHARE% in the address bar and press Enter.
echo     Sign in with your NAS administrator account, tick "Remember my credentials",
echo     then run this again.
echo   - Wrong address? Delete nas-address.txt next to this file and run this again.
echo.
pause
exit /b 1

:pullfailed
echo.
echo   The update couldn't be applied automatically - usually this means a
echo   file here was edited by hand. Ask for help, or stash the edits with:
echo     git stash
echo   and run this again. Nothing on the NAS was touched.
echo.
pause
exit /b 1

:cantwrite
echo   Couldn't make the app's folders in %DEST%.
echo   Check that your NAS account may write to the %SHARE% folder, then run this again.
echo.
pause
exit /b 1

:datafailed
echo.
echo   The progress didn't copy, so this computer still keeps it. Check the NAS is
echo   on and %DEST%\data opens in File Explorer, then run this again.
echo.
pause
exit /b 1

:copyfailed
echo.
echo   The copy to the NAS didn't finish (robocopy code %RC%), so the app there
echo   was not restarted. Check the NAS is on and %DEST%\app opens in File Explorer,
echo   then run this again.
echo.
pause
exit /b 1
