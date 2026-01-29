const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

function spawnLogged(cmd, args, name) {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  p.stdout.on('data', d => process.stdout.write(`[${name}] ${d}`))
  p.stderr.on('data', d => process.stderr.write(`[${name}] ${d}`))
  p.on('exit', code => console.log(`[${name}] exited with code ${code}`))
  return p
}

function loadConfig() {
  const cfgPath = path.join(__dirname, 'farms.json')
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
}

class StreamManager {
  constructor() {
    this.mediamtx = null
    this.streams = new Map() // farmId -> child
    this.cfg = loadConfig()

    this.binDir = path.join(__dirname, 'bin')
    this.mediamtxExe = path.join(this.binDir, 'mediamtx.exe')
    this.mediamtxYml = path.join(this.binDir, 'mediamtx.yml')
    this.ffmpegExe = path.join(this.binDir, 'ffmpeg.exe')
  }

  startMediaMTX() {
    if (this.mediamtx) return
    this.mediamtx = spawnLogged(this.mediamtxExe, [this.mediamtxYml], 'mediamtx')
  }

  stopMediaMTX() {
    if (!this.mediamtx) return
    this.mediamtx.kill('SIGTERM')
    this.mediamtx = null
  }

  startFarmStream(farm) {
    if (this.streams.has(farm.id)) return

    const rtmpUrl = `${this.cfg.rtmpBaseUrl}/${farm.id}`

    // gdigrab: التقاط نافذة حسب title (ويندوز)
    // scale: تثبيت عرض الفيديو لتخفيف الحمل
    const args = [
      '-hide_banner',
      '-f', 'gdigrab',
      '-framerate', String(farm.fps ?? 15),
      '-i', `title=${farm.windowTitle}`,
      '-vf', `scale=${farm.width ?? 1280}:-2`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', `${farm.bitrateK ?? 1800}k`,
      '-maxrate', `${farm.bitrateK ?? 1800}k`,
      '-bufsize', `${(farm.bitrateK ?? 1800) * 2}k`,
      '-an',
      '-f', 'flv',
      rtmpUrl
    ]

    const p = spawnLogged(this.ffmpegExe, args, `ffmpeg:${farm.id}`)
    this.streams.set(farm.id, p)
  }

  stopFarmStream(farmId) {
    const p = this.streams.get(farmId)
    if (!p) return
    p.kill('SIGTERM')
    this.streams.delete(farmId)
  }

  startAll() {
    this.startMediaMTX()
    for (const farm of this.cfg.farms) this.startFarmStream(farm)
  }

  stopAll() {
    for (const farmId of Array.from(this.streams.keys())) this.stopFarmStream(farmId)
    this.stopMediaMTX()
  }

  getHlsUrl(farmId) {
    // MediaMTX عادة: /live/<stream>/index.m3u8
    return `${this.cfg.hlsBaseUrl}/live/${farmId}/index.m3u8`
  }
}

module.exports = { StreamManager }
