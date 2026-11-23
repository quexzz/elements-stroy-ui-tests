@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
set "EXITCODE=%ERRORLEVEL%"
pause
exit /b %EXITCODE%
