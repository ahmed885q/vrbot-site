=== Viking Rise Windows Agent ===
Version: 2.0.0

1) Install Node.js 18 or higher on Windows
   Download from: https://nodejs.org/

2) Open Command Prompt or PowerShell

3) Navigate to the agent folder:
   cd "C:\path\to\agent-windows"

4) Install dependencies (if needed):
   npm install node-fetch@2

5) Run the agent:
   node agent.js

6) On first run, you'll be asked for:
   - APP_URL: Your Viking Rise application URL
   - DEVICE TOKEN: Get this from the /bot page -> Devices tab

7) The agent will:
   - Register your device with the server
   - Send regular heartbeats every 30 seconds
   - Monitor system resources
   - Send logs to the dashboard
   - Check for updates automatically

8) To run as a Windows Service (optional):
   - Use PM2: npm install -g pm2
   - pm2 start agent.js --name "viking-rise-agent"
   - pm2 save
   - pm2 startup

9) View logs:
   - Real-time logs: pm2 logs viking-rise-agent
   - File logs: Check agent.log in the same folder

10) For troubleshooting:
    - Check agent.log file
    - Verify network connectivity to APP_URL
    - Ensure token is valid and not expired

=== Features ===
- Automatic device registration
- System monitoring
- Heartbeat and status updates
- Remote logging
- Automatic update checks
- Graceful shutdown

=== Support ===
For issues or questions, contact: ahmed85q@hotmail.com