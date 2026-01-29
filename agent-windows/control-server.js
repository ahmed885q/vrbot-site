const http = require('http')

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
  })
}

/**
 * streams: StreamManager من streaming.js
 * port: افتراضي 9797
 */
function startControlServer(streams, port = 9797) {
  const server = http.createServer(async (req, res) => {
    // CORS بسيط للـ localhost
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }

    try {
      if (req.method === 'POST' && req.url === '/stream/start') {
        await readBody(req) // (حاليًا غير مستخدمة)
        streams.startAll()
        const status = streams.getStatus()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ ok: true, status }))
      }

      if (req.method === 'POST' && req.url === '/stream/stop') {
        await readBody(req)
        streams.stopAll()
        const status = streams.getStatus()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ ok: true, status }))
      }

      if (req.method === 'GET' && req.url === '/stream/status') {
        const status = streams.getStatus()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ ok: true, status }))
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'Not found' }))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }))
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`[control] listening on http://127.0.0.1:${port}`)
  })

  return server
}

module.exports = { startControlServer }
