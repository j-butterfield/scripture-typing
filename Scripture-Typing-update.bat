@echo off
title The Butter Typing Trainer - Update
cd /d "%~dp0"

rem Updates THIS computer's copy of the Butter Typing Trainer from GitHub.
rem To update the copy the kids use on the NAS, run Scripture-Typing-nas-update.bat instead.

echo.
echo   Fetching the latest Butter Typing Trainer...
echo   (Close the Butter Typing Trainer server window first if it is running.)
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo   Git is required to pull updates.
  echo   Install it from https://git-scm.com/download/win then run this again.
  echo.
  pause
  exit /b 1
)

if not exist .git (
  echo   This folder was downloaded as a zip, so it can't pull updates.
  echo   One-time fix: delete the folder and in a terminal run
  echo     git clone https://github.com/j-butterfield/scripture-typing.git "%~dp0."
  echo   Copy the data\ folder out first if this computer has the kids' progress in it.
  echo.
  pause
  exit /b 1
)

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

rem The pull can rewrite this very file, and cmd reads a running .bat a line at a time,
rem so the pull and everything after it sit in one block that cmd reads whole first.
(
  git pull --ff-only origin main || goto :pullfailed
  echo.
  echo   All updated! Double-click Scripture-Typing-play.bat to type on this computer,
  echo   or Scripture-Typing-nas-update.bat to put this version on the NAS.
  echo.
  pause
  exit /b 0
)

:pullfailed
echo.
echo   The update couldn't be applied automatically - usually this means a
echo   file here was edited by hand. Ask for help, or stash the edits with:
echo     git stash
echo   and run this again. The kids' progress in data\ is never touched.
echo.
pause
exit /b 1
