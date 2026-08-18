@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo EasyMD dependencies are not installed.
  echo Please run npm install once in this folder.
  pause
  exit /b 1
)

if not exist "dist-electron\main.cjs" (
  echo EasyMD has not been built yet. Building now...
  call npm run build
  if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
  )
)

start "" "%CD%\node_modules\electron\dist\electron.exe" .
endlocal
