@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  TaskSorter launcher
REM  start.bat           -> run server in foreground (port 80)
REM  start.bat install   -> install auto-start on boot (hidden)
REM  start.bat uninstall -> remove auto-start on boot
REM  start.bat --hidden  -> silent mode (used by auto-start)
REM ============================================================

if /i "%~1"=="install"   goto :install
if /i "%~1"=="uninstall" goto :uninstall

set "HIDDEN=0"
if /i "%~1"=="--hidden" set "HIDDEN=1"

title TaskSorter - Team Task Board (port 80)

echo ========================================================
echo        TaskSorter Team Task Service (port 80)
echo ========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    if "!HIDDEN!"=="1" (
        echo [ERROR] Node.js not found. Install from https://nodejs.org > "%TEMP%\TaskSorter-autostart-error.log"
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

node server/server.js

if errorlevel 1 (
    if "!HIDDEN!"=="1" (
        echo [ERROR] Service failed to start. Port 80 may be in use. > "%TEMP%\TaskSorter-autostart-error.log"
        exit /b 1
    )
    echo.
    echo [INFO] If port conflict, check what is using port 80, or run as Administrator.
    pause
)
goto :eof

:install
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VB_FILE=%STARTUP_DIR%\TaskSorter.vbs"
if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"
> "%VB_FILE%" echo Set sh = CreateObject("WScript.Shell")
>> "%VB_FILE%" echo sh.Run "cmd /c ""%~dp0start.bat"" --hidden", 0, False
echo [DONE] Auto-start installed: %VB_FILE%
echo TaskSorter will start on port 80 (hidden) after next boot.
echo To remove it, run: start.bat uninstall
pause
goto :eof

:uninstall
set "VB_FILE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TaskSorter.vbs"
if exist "%VB_FILE%" (
    del /f /q "%VB_FILE%"
    echo [DONE] Auto-start removed.
) else (
    echo [INFO] No auto-start entry found.
)
pause
goto :eof
