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

REM Switch to the script's own folder so relative paths
REM (node_modules, dist, server/server.js) resolve correctly.
REM The Startup VBS launches this script with a working
REM directory of C:\Windows\System32, which would otherwise
REM make node fail to find server/server.js.
cd /d "%~dp0"

REM 日志文件：记录 node 真实 stdout/stderr（带时间戳），用于排查。
set "LOGFILE=%TEMP%\TaskSorter-autostart.log"
set "ERRFILE=%TEMP%\TaskSorter-autostart-error.log"

title TaskSorter - Team Task Board (port 80)

echo ========================================================
echo        TaskSorter Team Task Service (port 80)
echo ========================================================
echo.

REM 开机自启动时：先等待若干秒，避开其它开机程序的端口抢占高峰。
REM 使用 ping 做延时（不依赖控制台/stdin，隐藏模式下同样可用）。
if "!HIDDEN!"=="1" (
    echo [INFO] 开机自启动模式：等待 10 秒后启动，避开端口竞争...
    ping -n 11 127.0.0.1 >nul
)

where node >nul 2>nul
if errorlevel 1 (
    if "!HIDDEN!"=="1" (
        echo [%date% %time%] [ERROR] Node.js not found. Install from https://nodejs.org > "%ERRFILE%"
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
    REM 隐藏模式：把 node 真实 stdout/stderr 追加写入日志（带时间戳），
    REM 方便事后排查端口竞争等真实原因。
    echo [%date% %time%] TaskSorter auto-start begin >> "%LOGFILE%"
    node server/server.js >> "%LOGFILE%" 2>&1
) else (
    REM 前台模式：控制台直接显示输出。
    node server/server.js
)

set "EXITCODE=%errorlevel%"

if not "!EXITCODE!"=="0" (
    if "!HIDDEN!"=="1" (
        echo [%date% %time%] [ERROR] Service exited with code !EXITCODE!. See log below. >> "%ERRFILE%"
        echo ---- last 30 lines of %LOGFILE% ---- >> "%ERRFILE%"
        powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-Content '%LOGFILE%' -Tail 30 -Encoding UTF8 | Out-File -Append -Encoding UTF8 '%ERRFILE%'"
        exit /b 1
    )
    echo.
    echo [ERROR] 服务异常退出（退出码 !EXITCODE!）。详情见日志：%LOGFILE%
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
