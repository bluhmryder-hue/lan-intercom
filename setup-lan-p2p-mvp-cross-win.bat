@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   EchoLAN One-Click Deploy for Windows
echo ============================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    goto :end
)

:: 2. Check for NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not installed or not in your PATH.
    echo NPM usually comes with Node.js. Please check your installation.
    echo.
    pause
    goto :end
)

:: 3. Get Project Directory
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: 4. Run the deployment script
echo [INFO] Starting EchoLAN deployment...
node "scripts\oneclick-deploy.mjs"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] One-click deploy failed with exit code %errorlevel%.
    echo Please check the output above for specific errors.
    echo.
    pause
    goto :end
)

echo.
echo [SUCCESS] EchoLAN deployment completed.
pause

:end
endlocal
