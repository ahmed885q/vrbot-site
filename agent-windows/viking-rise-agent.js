// agent-windows/agent.js
// Viking Rise Windows Agent - Version 2.0.0

const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

const CONFIG_PATH = path.join(__dirname, 'viking-rise-config.json')
const LOG_PATH = path.join(__dirname, 'viking-rise-agent.log')
const STATE_PATH = path.join(__dirname, 'agent-state.json')

// Agent Configuration
const AGENT_VERSION = "2.0.0"
const AGENT_NAME = "VikingRiseBot-Agent"
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const LOG_ROTATION_SIZE = 10 * 1024 * 1024 // 10MB

class VikingRiseAgent {
  constructor() {
    this.config = null
    this.isRunning = false
    this.heartbeatInterval = null
    this.botProcesses = new Map()
    this.systemStats = {}
  }

  async initialize() {
    console.log(`🎮 ${AGENT_NAME} v${AGENT_VERSION}`)
    console.log('📡 Initializing Viking Rise Windows Agent...\n')
    
    await this.loadConfig()
    
    if (!this.config || !this.config.appUrl || !this.config.token) {
      await this.promptForConfig()
    }
    
    await this.registerWithServer()
    await this.startMonitoring()
    
    console.log('✅ Agent initialized successfully!')
    console.log(`📊 Monitoring: ${this.config.appUrl}`)
    console.log(`🆔 Token: ${this.config.token.substring(0, 10)}...`)
  }

  async loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8')
        this.config = JSON.parse(data)
        console.log('📂 Loaded configuration from file')
        return true
      }
    } catch (error) {
      console.error('❌ Error loading config:', error.message)
    }
    return false
  }

  async saveConfig(config) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
      this.config = config
      console.log('💾 Configuration saved')
      return true
    } catch (error) {
      console.error('❌ Error saving config:', error.message)
      return false
    }
  }

  async promptForConfig() {
    console.log('\n🔧 First-time setup required\n')
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const question = (query) => new Promise(resolve => {
      readline.question(query, resolve)
    })

    try {
      const appUrl = await question('Enter your Viking Rise App URL (e.g., https://your-app.com): ')
      const token = await question('Enter your Device Token (from /bot → Devices tab): ')
      
      const config = {
        appUrl: appUrl.trim(),
        token: token.trim(),
        agentVersion: AGENT_VERSION,
        registeredAt: new Date().toISOString(),
        settings: {
          autoStart: true,
          monitorSystem: true,
          sendLogs: true,
          maxBots: 3
        }
      }

      await this.saveConfig(config)
    } finally {
      readline.close()
    }
  }

  async registerWithServer() {
    console.log('📡 Registering with Viking Rise server...')
    
    try {
      const systemInfo = this.getSystemInfo()
      
      const response = await this.makeRequest(`${this.config.appUrl}/api/agent/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify({
          agentId: this.config.token,
          agentVersion: AGENT_VERSION,
          systemInfo,
          capabilities: [
            'bot-management',
            'live-streaming',
            'protection-system',
            'auto-update',
            'remote-control'
          ]
        })
      })

      console.log('✅ Registration successful:', response.message || 'Connected')
      
    } catch (error) {
      console.error('❌ Registration failed:', error.message)
      throw error
    }
  }

  async startMonitoring() {
    console.log('📊 Starting system monitoring...')
    
    this.isRunning = true
    
    // Initial heartbeat
    await this.sendHeartbeat()
    
    // Start periodic heartbeat
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat()
        process.stdout.write('.')
      } catch (error) {
        console.error('\n❌ Heartbeat failed:', error.message)
      }
    }, HEARTBEAT_INTERVAL)
    
    // Monitor system resources
    setInterval(() => {
      this.updateSystemStats()
    }, 10000)
    
    // Log rotation
    setInterval(() => {
      this.rotateLogs()
    }, 3600000) // Every hour
    
    console.log('✅ Monitoring started')
  }

  async sendHeartbeat() {
    try {
      const stats = this.getSystemStats()
      
      const response = await this.makeRequest(`${this.config.appUrl}/api/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify({
          agentId: this.config.token,
          timestamp: new Date().toISOString(),
          status: 'online',
          systemStats: stats,
          activeBots: this.botProcesses.size,
          agentVersion: AGENT_VERSION
        })
      })
      
      // Check for commands from server
      if (response.commands && response.commands.length > 0) {
        await this.processCommands(response.commands)
      }
      
      return response
      
    } catch (error) {
      await this.logError('Heartbeat failed', error)
      throw error
    }
  }

  async processCommands(commands) {
    for (const command of commands) {
      try {
        switch (command.type) {
          case 'start_bot':
            await this.startBot(command.botId, command.config)
            break
          
          case 'stop_bot':
            await this.stopBot(command.botId)
            break
          
          case 'update_settings':
            await this.updateSettings(command.settings)
            break
          
          case 'restart_agent':
            await this.restartAgent()
            break
          
          case 'run_script':
            await this.runScript(command.script)
            break
        }
        
        await this.logInfo(`Command executed: ${command.type}`, command)
        
      } catch (error) {
        await this.logError(`Command failed: ${command.type}`, error)
      }
    }
  }

  async startBot(botId, config) {
    console.log(`🤖 Starting bot: ${botId}`)
    
    try {
      // هنا يمكنك إضافة منطق تشغيل البوت الحقيقي
      // هذا مثال بسيط:
      const botScript = `
        const { VikingRiseSystem } = require('./VikingRiseSystem');
        const bot = new VikingRiseSystem();
        bot.startBot('${botId}');
      `
      
      const process = exec(`node -e "${botScript}"`, {
        cwd: __dirname
      })
      
      this.botProcesses.set(botId, {
        process,
        startedAt: new Date(),
        config
      })
      
      await this.logInfo(`Bot started: ${botId}`, config)
      
    } catch (error) {
      await this.logError(`Failed to start bot: ${botId}`, error)
      throw error
    }
  }

  async stopBot(botId) {
    console.log(`⏹️ Stopping bot: ${botId}`)
    
    const botInfo = this.botProcesses.get(botId)
    if (botInfo && botInfo.process) {
      botInfo.process.kill('SIGTERM')
      this.botProcesses.delete(botId)
      await this.logInfo(`Bot stopped: ${botId}`)
    }
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      userInfo: os.userInfo(),
      networkInterfaces: Object.keys(os.networkInterfaces()).length,
      version: AGENT_VERSION,
      timestamp: new Date().toISOString()
    }
  }

  updateSystemStats() {
    this.systemStats = {
      cpuUsage: os.loadavg(),
      memoryUsage: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      uptime: os.uptime(),
      timestamp: new Date().toISOString()
    }
  }

  getSystemStats() {
    return {
      ...this.systemStats,
      activeProcesses: this.botProcesses.size,
      agentUptime: process.uptime()
    }
  }

  async makeRequest(url, options) {
    const fetch = require('node-fetch')
    
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      return await response.json()
      
    } catch (error) {
      throw error
    }
  }

  async logInfo(message, data = null) {
    await this.log('INFO', message, data)
  }

  async logError(message, error = null) {
    await this.log('ERROR', message, error)
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      agentId: this.config?.token
    }
    
    // Log to file
    const logLine = `[${timestamp}] [${level}] ${message}`
    fs.appendFileSync(LOG_PATH, logLine + '\n', 'utf8')
    
    // Send to server if enabled
    if (this.config?.settings?.sendLogs) {
      try {
        await this.makeRequest(`${this.config.appUrl}/api/agent/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.token}`
          },
          body: JSON.stringify(logEntry)
        })
      } catch (error) {
        // Silent fail for logging errors
      }
    }
    
    // Console output for errors
    if (level === 'ERROR') {
      console.error(`❌ ${message}:`, error?.message || '')
    }
  }

  rotateLogs() {
    try {
      const stats = fs.statSync(LOG_PATH)
      if (stats.size > LOG_ROTATION_SIZE) {
        const backupPath = `${LOG_PATH}.${Date.now()}.bak`
        fs.copyFileSync(LOG_PATH, backupPath)
        fs.writeFileSync(LOG_PATH, '', 'utf8')
        console.log('🔄 Logs rotated')
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  async updateSettings(newSettings) {
    this.config.settings = { ...this.config.settings, ...newSettings }
    await this.saveConfig(this.config)
    console.log('⚙️ Settings updated')
  }

  async restartAgent() {
    console.log('🔄 Restarting agent...')
    await this.logInfo('Agent restart requested')
    process.exit(0) // Process manager should restart
  }

  async runScript(script) {
    try {
      const { stdout, stderr } = await execAsync(script)
      await this.logInfo('Script executed', { script, stdout, stderr })
      return { stdout, stderr }
    } catch (error) {
      await this.logError('Script execution failed', error)
      throw error
    }
  }

  async shutdown() {
    console.log('\n🛑 Shutting down agent...')
    
    this.isRunning = false
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    // Stop all bots
    for (const [botId] of this.botProcesses) {
      await this.stopBot(botId)
    }
    
    // Send final log
    await this.logInfo('Agent shutting down')
    
    console.log('👋 Agent stopped')
  }
}

// Start the agent
async function main() {
  const agent = new VikingRiseAgent()
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await agent.shutdown()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await agent.shutdown()
    process.exit(0)
  })
  
  try {
    await agent.initialize()
    
    // Keep the process alive
    await new Promise(() => {})
    
  } catch (error) {
    console.error('❌ Agent failed to start:', error.message)
    process.exit(1)
  }
}

// Run if this is the main module
if (require.main === module) {
  main()
}

module.exports = { VikingRiseAgent }