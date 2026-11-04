@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "VITE_JS=%~dp0node_modules\vite\bin\vite.js"

if not exist "%NODE_EXE%" (
  echo The Node.js runtime used by Codex was not found:
  echo %NODE_EXE%
  pause
  exit /b 1
)

if not exist "%VITE_JS%" (
  echo Vite is not installed in this game folder:
  echo %VITE_JS%
  pause
  exit /b 1
)

start "Anomy Game Preview Server" /D "%~dp0" "%NODE_EXE%" "%VITE_JS%" --host 127.0.0.1 --port 3000 --strictPort
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3000/"
