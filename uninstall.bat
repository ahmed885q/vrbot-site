@echo off
echo Uninstalling Viking Rise Windows Agent...
echo.

REM Stop the agent if running with PM2
pm2 delete viking-rise-agent 2>nul

REM Remove files
if exist config.json del config.json
if exist agent.log del agent.log
if exist node_modules rmdir /s /q node_modules

echo.
echo Uninstall complete!
pause