// agent-windows/agent.js
// Usage:
//   node agent.js
// It will ask for: APP_URL + TOKEN (once) and then run ping + log demo.

const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.join(__dirname, 'config.json')

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    } catch {}
  }
  return null
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

async function prompt(question) {
  process.stdout.write(question)
  return await new Promise((resolve) => {
    process.stdin.once('data', (d) => resolve(String(d).trim()))
  })
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  if (!res.ok) {
    throw new Error((json && json.error) ? json.error : text)
  }
  return json
}

async function main() {
  let cfg = loadConfig()

  if (!cfg) {
    const appUrl = await prompt('APP_URL (e.g. https://vrbot-site.vercel.app): ')
    const token = await prompt('DEVICE TOKEN (from /bot -> Devices): ')
    cfg = { appUrl, token }
    saveConfig(cfg)
    console.log('Saved config.json ✅')
  }

  const { appUrl, token } = cfg
  if (!appUrl || !token) throw new Error('Missing appUrl/token in config.json')

  const pingUrl = `${appUrl}/api/devices/ping`
  const logUrl = `${appUrl}/api/logs/append`

  console.log('Starting agent... ✅')
  console.log('Ping:', pingUrl)

  // initial ping
  await postJSON(pingUrl, { token })
  console.log('Ping OK')

  // demo log
  await postJSON(logUrl, { token, level: 'info', message: 'Windows agent started ✅' })
  console.log('Log sent')

  // keep alive every 60s
  setInterval(async () => {
    try {
      await postJSON(pingUrl, { token })
      await postJSON(logUrl, { token, level: 'info', message: 'heartbeat' })
      process.stdout.write('.')
    } catch (e) {
      console.error('\nAgent error:', e.message)
    }
  }, 60_000)
}

main().catch((e) => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
