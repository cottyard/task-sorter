@echo off
chcp 65001 >nul
title TaskSorter - 团队任务看板 (端口 80)

echo ========================================================
echo        🚀 TaskSorter 团队任务跟踪服务 (常驻 80 端口)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先在电脑上安装 Node.js (https://nodejs.org)
    echo.
    pause
    exit /b
)

if not exist "node_modules\" (
    echo [提示] 正在安装必要依赖...
    call npm install --production
    echo.
)

if not exist "dist\" (
    echo [提示] 正在编译前端界面...
    call npm run build
    echo.
)

echo [提示] 服务正在 80 端口运行，请勿关闭本窗口（可最小化）...
echo.

node server/server.js

if %errorlevel% neq 0 (
    echo.
    echo [提示] 若提示端口冲突，请检查是否有其他程序占用 80 端口，或右键“以管理员身份运行”。
    pause
)
