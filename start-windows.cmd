@echo off
setlocal
cd /d "%~dp0"
node -e "const [m,n]=process.versions.node.split('.').map(Number);process.exit(m>=24||(m===22&&n>=13)||m===23?0:1)"
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\next\package.json" (
  call npm.cmd ci
  if errorlevel 1 (
    echo Dependency installation failed. See the error above.
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:3000 in Edge or Chrome after the server says Ready.
call npm.cmd run dev
if errorlevel 1 pause
