@echo off
echo Installing Viking Rise Windows Agent...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is installed.
echo Installing dependencies...

REM Install dependencies
npm install node-fetch@2

echo.
echo Installation complete!
echo.
echo To run the agent:
echo   1. Open Command Prompt
echo   2. Navigate to this folder
echo   3. Run: node agent.js
echo.
pause