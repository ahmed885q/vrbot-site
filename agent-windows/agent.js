// agent-windows/agent.js
// Usage:
//   node agent.js
// It will ask for: APP_URL + TOKEN (once) and then run ping + log demo.

const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_PATH = path.join(__dirname, 'config.json')
const LOG_FILE = path.join(__dirname, 'agent.log')

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    } catch (e) {
      console.error('Error loading config:', e.message)
    }
  }
  return null
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

function logToFile(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8')
}

async function prompt(question) {
  process.stdout.write(question)
  return await new Promise((resolve) => {
    process.stdin.once('data', (d) => resolve(String(d).trim()))
  })
}

async function postJSON(url, body, timeout = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'VikingRise-Windows-Agent/2.0.0'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const text = await res.text()
    let json = null
    try { 
      json = JSON.parse(text) 
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text}`)
    }
    
    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}: ${text}`)
    }
    
    return json
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

async function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    cpus: os.cpus().length,
    uptime: os.uptime(),
    networkInterfaces: Object.keys(os.networkInterfaces()).length
  }
}

async function registerDevice(appUrl, token) {
  const registerUrl = `${appUrl}/api/devices/register`
  const systemInfo = await getSystemInfo()
  
  const deviceData = {
    token,
    name: `Windows-${os.hostname()}`,
    type: 'windows',
    version: '2.0.0',
    capabilities: ['viking-rise', 'bot-management', 'live-streaming', 'protection-system'],
    systemInfo
  }
  
  const response = await postJSON(registerUrl, deviceData)
  logToFile(`Device registered: ${JSON.stringify(response)}`)
  return response
}

async function sendHeartbeat(appUrl, token) {
  const pingUrl = `${appUrl}/api/devices/ping`
  const systemInfo = await getSystemInfo()
  
  const pingData = {
    token,
    status: 'online',
    systemInfo,
    timestamp: new Date().toISOString()
  }
  
  const response = await postJSON(pingUrl, pingData)
  logToFile(`Heartbeat sent: ${response.status}`)
  return response
}

async function sendLog(appUrl, token, level, message, data = {}) {
  const logUrl = `${appUrl}/api/logs/append`
  
  const logData = {
    token,
    level,
    message,
    data,
    timestamp: new Date().toISOString()
  }
  
  const response = await postJSON(logUrl, logData)
  logToFile(`Log sent [${level}]: ${message}`)
  return response
}

async function checkForUpdates(appUrl, token) {
  const updatesUrl = `${appUrl}/api/devices/check-updates`
  
  const updateData = {
    token,
    currentVersion: '2.0.0',
    system: 'windows'
  }
  
  try {
    const response = await postJSON(updatesUrl, updateData)
    if (response.updateAvailable) {
      logToFile(`Update available: ${response.latestVersion}`)
      await sendLog(appUrl, token, 'info', `Update available: ${response.latestVersion}`, response)
    }
    return response
  } catch (error) {
    logToFile(`Failed to check updates: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('=== Viking Rise Windows Agent ===')
  console.log('Version: 2.0.0')
  console.log('===============================\n')
  
  let cfg = loadConfig()
  let needsRegistration = false

  if (!cfg || !cfg.appUrl || !cfg.token) {
    console.log('First time setup required.\n')
    
    const appUrl = await prompt('Enter APP_URL (e.g., https://your-viking-rise-app.com): ')
    const token = await prompt('Enter DEVICE TOKEN (from /bot -> Devices): ')
    
    cfg = { appUrl, token }
    saveConfig(cfg)
    needsRegistration = true
    
    console.log('\nConfig saved to config.json ✅')
  } else {
    console.log('Loaded existing configuration.')
    console.log(`App URL: ${cfg.appUrl}`)
    console.log(`Token: ${cfg.token.substring(0, 10)}...\n`)
  }

  const { appUrl, token } = cfg
  
  try {
    // Register device if needed
    if (needsRegistration) {
      console.log('Registering device with server...')
      await registerDevice(appUrl, token)
      console.log('Device registered successfully! ✅')
    }
    
    // Initial heartbeat
    console.log('Sending initial heartbeat...')
    await sendHeartbeat(appUrl, token)
    console.log('Initial heartbeat sent! ✅')
    
    // Check for updates
    console.log('Checking for updates...')
    await checkForUpdates(appUrl, token)
    
    // Send startup log
    await sendLog(appUrl, token, 'info', 'Viking Rise Windows Agent started', {
      version: '2.0.0',
      system: await getSystemInfo()
    })
    
    console.log('\nAgent is now running!')
    console.log('Press Ctrl+C to stop.\n')
    
    // Regular heartbeat every 30 seconds
    let heartbeatCounter = 0
    setInterval(async () => {
      try {
        heartbeatCounter++
        
        // Send heartbeat
        await sendHeartbeat(appUrl, token)
        
        // Send log every 10th heartbeat (5 minutes)
        if (heartbeatCounter % 10 === 0) {
          await sendLog(appUrl, token, 'info', 'Regular heartbeat', {
            counter: heartbeatCounter,
            uptime: process.uptime()
          })
          
          // Check for updates every 30 minutes
          if (heartbeatCounter % 60 === 0) {
            await checkForUpdates(appUrl, token)
          }
        }
        
        process.stdout.write('.')
      } catch (error) {
        console.error(`\nHeartbeat error: ${error.message}`)
        logToFile(`Heartbeat error: ${error.message}`)
      }
    }, 30000)
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down agent...')
      await sendLog(appUrl, token, 'info', 'Windows Agent shutting down')
      console.log('Goodbye! 👋')
      process.exit(0)
    })
    
  } catch (error) {
    console.error(`\nFatal error: ${error.message}`)
    logToFile(`Fatal error: ${error.message}`)
    
    // Try to send error log
    try {
      await sendLog(appUrl, token, 'error', `Agent startup failed: ${error.message}`)
    } catch (e) {
      // Ignore if we can't send the error
    }
    
    process.exit(1)
  }
}

// Run the agent
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

module.exports = {
  loadConfig,
  saveConfig,
  sendHeartbeat,
  sendLog,
  getSystemInfo
}