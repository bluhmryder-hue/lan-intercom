@echo off
setlocal
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"
node "scripts\oneclick-deploy.mjs"
if errorlevel 1 (
  echo.
  echo One-click deploy failed.
  pause
  exit /b 1
)
endlocal
