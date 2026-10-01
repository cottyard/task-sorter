@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  TaskSorter launcher
REM  start.bat           -> run server in foreground (port 80)
REM  start.bat install   -> install auto-start (scheduled task)
REM  start.bat uninstall -> remove auto-start
REM  start.bat --hidden  -> silent mode (used by auto-start)
REM
REM  IMPORTANT - encoding rules for this file:
REM  cmd.exe parses .bat files with the system ANSI codepage
REM  (GBK / cp936 on Chinese Windows). UTF-8 Chinese bytes get
REM  mis-decoded and corrupt the batch syntax (commands turn
REM  into garbage, launch fails silently). So this file MUST
REM  stay PURE ASCII with CRLF line endings. Keep every message
REM  in English. Runtime expansions such as %date% may hold
REM  Chinese - that is fine, they are not stored in this file.
REM ============================================================

if /i "%~1"=="install"   goto :install
if /i "%~1"=="uninstall" goto :uninstall

set "HIDDEN=0"
if /i "%~1"=="--hidden" set "HIDDEN=1"

REM Switch to the script's own folder so relative paths
REM (node_modules, dist, server/server.js) resolve correctly.
REM The Startup VBS launches this script with a working
REM directory of C:\Windows\System32, which would otherwise
REM make node fail to find server/server.js.
cd /d "%~dp0"

REM Log files: capture node's real stdout/stderr for diagnosis.
set "LOGFILE=%TEMP%\TaskSorter-autostart.log"
set "ERRFILE=%TEMP%\TaskSorter-autostart-error.log"
REM Time only: %date% starts with a locale weekday on Chinese Windows
REM (e.g. "Sun 2026/09/27"), so slicing it is unsafe and non-ASCII.
REM %time% is pure ASCII; the log file's mtime supplies the date.
set "STAMP=%time%"

title TaskSorter - Team Task Board (port 80)

echo ========================================================
echo        TaskSorter Team Task Service (port 80)
echo ========================================================
echo.

REM On boot: wait so other startup programs settle and release
REM port 80. ping is used as a delay needing no console/stdin.
if "!HIDDEN!"=="1" (
    echo [INFO] Auto-start mode: waiting 10s before launch...
    ping -n 11 127.0.0.1 >nul
)

where node >nul 2>nul
if errorlevel 1 (
    if "!HIDDEN!"=="1" (
        echo [%STAMP%] [ERROR] Node.js not found. Install from https://nodejs.org > "%ERRFILE%"
        exit /b 1
    )
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    echo.
    pause
    exit /b
)

if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

if not exist "dist\" (
    echo [INFO] Building frontend...
    call npm run build
    echo.
)

echo [INFO] Service running on port 80. Keep this window open (can be minimized).
echo.

if "!HIDDEN!"=="1" (
    REM Hidden mode: append node's real stdout/stderr to the log.
    echo [%STAMP%] TaskSorter auto-start begin >> "%LOGFILE%"
    node server/server.js >> "%LOGFILE%" 2>&1
) else (
    REM Foreground mode: show output on the console.
    node server/server.js
)

set "EXITCODE=%errorlevel%"

if not "!EXITCODE!"=="0" (
    if "!HIDDEN!"=="1" (
        echo [%STAMP%] [ERROR] Service exited with code !EXITCODE!. See log tail below. >> "%ERRFILE%"
        echo ---- last 30 lines of %LOGFILE% ---- >> "%ERRFILE%"
        powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-Content '%LOGFILE%' -Tail 30 -Encoding UTF8 | Out-File -Append -Encoding UTF8 '%ERRFILE%'"
        exit /b 1
    )
    echo.
    echo [ERROR] Service exited with code !EXITCODE!. See log: %LOGFILE%
    pause
)
goto :eof

:install
REM Registering a scheduled task needs Administrator rights, so
REM re-launch this script elevated (UAC prompt) when needed.
net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Administrator rights are required. Requesting elevation...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList 'install' -Verb RunAs"
    exit /b
)
REM Install a Windows scheduled task that starts the server on
REM boot, on logon AND on resume from sleep (the old Startup-folder
REM shortcut never fired on sleep/wake, which is how this PC is used).
set "PS1=%~dp0scripts\install-task.ps1"
if not exist "%PS1%" (
    echo [ERROR] Installer not found: %PS1%
    pause
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install the scheduled task.
    pause
    exit /b 1
)
REM Remove the legacy Startup-folder launcher to avoid a double start.
set "LEGACY_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TaskSorter.vbs"
if exist "%LEGACY_VBS%" del /f /q "%LEGACY_VBS%"
echo.
echo [DONE] Scheduled task TaskSorter installed.
echo It starts on: boot, logon and resume from sleep.
echo To remove it, run: start.bat uninstall
pause
goto :eof

:uninstall
net session >nul 2>&1
if errorlevel 1 (
    echo [INFO] Administrator rights are required. Requesting elevation...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList 'uninstall' -Verb RunAs"
    exit /b
)
set "PS1=%~dp0scripts\uninstall-task.ps1"
if exist "%PS1%" powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "LEGACY_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TaskSorter.vbs"
if exist "%LEGACY_VBS%" (
    del /f /q "%LEGACY_VBS%"
    echo [DONE] Legacy Startup-folder launcher removed.
)
pause
goto :eof
