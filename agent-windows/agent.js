"use strict";

/**
 * Agent API (Local) + Auto Window Detect + Anchor OCR + Smart Bind
 *
 * Features:
 * - List open windows (PowerShell Get-Process MainWindowTitle)
 * - Capture screenshot from a window by title using ffmpeg gdigrab
 * - OCR on Anchor region (top-left) using Tesseract
 * - Match extracted name with farm name: "Viking Rais | Name"
 * - Auto-bind farm.windowTitle to the matching window title
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const PORT = 9797;

// ---- Tools directory (downloaded by Electron Setup)
const TOOLS_DIR = process.env.TOOLS_DIR || path.join(__dirname, "bin");
const FFMPEG = path.join(TOOLS_DIR, "ffmpeg.exe");
const FFPROBE = path.join(TOOLS_DIR, "ffprobe.exe");
const MEDIAMTX = path.join(TOOLS_DIR, "mediamtx.exe");
const MEDIAMTX_YML = path.join(TOOLS_DIR, "mediamtx.yml");

// ---- OCR (Tesseract)
function findTesseract() {
  const envPath = process.env.TESSERACT_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const bundled1 = path.join(TOOLS_DIR, "tesseract.exe");
  if (fs.existsSync(bundled1)) return bundled1;

  const bundled2 = path.join(TOOLS_DIR, "tesseract", "tesseract.exe");
  if (fs.existsSync(bundled2)) return bundled2;

  const p1 = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
  const p2 = "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe";
  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;

  return "";
}


// ---- User config storage
const APP_DIR = path.join(os.homedir(), "AppData", "Roaming", "VikingRais");
const CONFIG_PATH = path.join(APP_DIR, "config.json");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadConfig() {
  ensureDir(APP_DIR);
  if (!fs.existsSync(CONFIG_PATH)) {
    const init = { farms: [] };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(init, null, 2), "utf8");
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    const init = { farms: [] };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(init, null, 2), "utf8");
    return init;
  }
}

function saveConfig(cfg) {
  ensureDir(APP_DIR);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toolsCheck() {
  return {
    toolsDir: TOOLS_DIR,
    ffmpeg: fs.existsSync(FFMPEG),
    ffprobe: fs.existsSync(FFPROBE),
    mediamtx: fs.existsSync(MEDIAMTX),
    mediamtxYml: fs.existsSync(MEDIAMTX_YML),
    tesseract: findTesseract() || "",
  };
}

// -----------------------------
// Window enumeration (PowerShell)
// -----------------------------
function runExecFile(file, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function listWindows() {
  // Returns: [{ pid, processName, title, hwnd }]
  // Note: MainWindowTitle sometimes empty; filter it.
  const ps = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `
$procs = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne "" } |
  Select-Object Id, ProcessName, MainWindowTitle, MainWindowHandle
$procs | ConvertTo-Json -Depth 3
    `.trim(),
  ];

  const { stdout } = await runExecFile("powershell.exe", ps);
  let data = [];
  try {
    const parsed = JSON.parse(stdout || "[]");
    data = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    data = [];
  }

  return data
    .map((p) => ({
      pid: p.Id,
      processName: p.ProcessName,
      title: p.MainWindowTitle,
      hwnd: String(p.MainWindowHandle),
    }))
    .filter((x) => x.title && x.title.trim().length > 0);
}

// -----------------------------
// Capture frame from window title (FFmpeg gdigrab)
// -----------------------------
async function captureAnchorPngFromWindowTitle(windowTitle, outPngPath, anchor) {
  if (!fs.existsSync(FFMPEG)) throw new Error("ffmpeg.exe not found");

  const a = anchor || { x: 0.02, y: 0.02, w: 0.5, h: 0.18 };

  // Use expression crop based on input width/height
  // crop=iw*w:ih*h:iw*x:ih*y
  const cropExpr = `crop=iw*${a.w}:ih*${a.h}:iw*${a.x}:ih*${a.y}`;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "gdigrab",
    "-framerate",
    "5",
    "-i",
    `title=${windowTitle}`,
    "-frames:v",
    "1",
    "-vf",
    cropExpr,
    outPngPath,
  ];

  await runExecFile(FFMPEG, args, { cwd: TOOLS_DIR });
}

// -----------------------------
// OCR using Tesseract
// -----------------------------
function cleanOcrText(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Remove common junk
  const filtered = lines.filter((l) => !/power|القوة/i.test(l));

  // Pick best candidate line
  const candidate =
    filtered.find((l) => /^[\p{L}\p{N}\s_\-.'|]{2,}$/u.test(l)) ||
    filtered[0] ||
    "";

  return candidate.replace(/\s{2,}/g, " ").trim();
}

async function ocrPng(pngPath) {
  const t = findTesseract();
  if (!t) throw new Error("Tesseract not found. Install it or add it to TOOLS_DIR as tesseract.exe");

  const args = [pngPath, "stdout", "-l", "eng+ara", "--psm", "6"];
  const { stdout } = await runExecFile(t, args);
  return cleanOcrText(stdout);
}

// -----------------------------
// Smart match: farm.name = "Viking Rais | Name"
// -----------------------------
function extractTargetNameFromFarmLabel(label) {
  const s = String(label || "");
  const parts = s.split("|");
  if (parts.length >= 2) return parts.slice(1).join("|").trim();
  return s.trim();
}

function nameLooseEquals(a, b) {
  const norm = (x) =>
    String(x || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
  return norm(a) === norm(b) && norm(a).length > 0;
}

// -----------------------------
// Auto bind logic
// -----------------------------
async function detectAndBindFarm(farm, options = {}) {
  // options:
  // - anchor: {x,y,w,h} relative floats
  // - windowFilter: string contains
  // - maxScan: number
  const anchor = options.anchor || farm.anchor || { x: 0.02, y: 0.02, w: 0.5, h: 0.18 };
  const targetName = extractTargetNameFromFarmLabel(farm.name);

  const windows = await listWindows();
  const filtered = options.windowFilter
    ? windows.filter((w) => w.title.toLowerCase().includes(String(options.windowFilter).toLowerCase()))
    : windows;

  const maxScan = Math.max(1, Math.min(60, Number(options.maxScan || 25)));
  const candidates = filtered.slice(0, maxScan);

  const tmpDir = path.join(os.tmpdir(), "vr-ocr");
  ensureDir(tmpDir);

  for (const w of candidates) {
    const outPng = path.join(tmpDir, `anchor_${Date.now()}_${Math.random().toString(16).slice(2)}.png`);

    try {
      await captureAnchorPngFromWindowTitle(w.title, outPng, anchor);
      const gotName = await ocrPng(outPng);

      if (gotName && nameLooseEquals(gotName, targetName)) {
        farm.windowTitle = w.title; // bind to exact window title
        farm.lastDetectedName = gotName;
        farm.lastDetectAt = new Date().toISOString();
        farm.status = "bound";
        farm.last = farm.lastDetectAt;
        return { ok: true, bound: true, window: w, gotName, targetName };
      } else {
        // keep debug last read
        farm.lastDetectedName = gotName || farm.lastDetectedName || "";
        farm.lastDetectAt = new Date().toISOString();
      }
    } catch (e) {
      // ignore and continue
    } finally {
      try {
        fs.unlinkSync(outPng);
      } catch {}
    }
  }

  farm.status = "not_found";
  farm.last = new Date().toISOString();
  return { ok: true, bound: false, targetName, scanned: candidates.length };
}

/* ====== Hooks (تشغيل/إيقاف) ====== */
async function farmStart(farm) {
  // لاحقًا نربطها بتشغيل ستريم/تحكم
  farm.status = "running";
  farm.last = new Date().toISOString();
}

async function farmStop(farm) {
  farm.status = "stopped";
  farm.last = new Date().toISOString();
}

async function farmDetect(farm, body) {
  // 1) لو المستخدم اختار نافذة يدويًا:
  if (body?.bindTitle && String(body.bindTitle).trim()) {
    farm.windowTitle = String(body.bindTitle).trim();
    farm.status = "bound";
    farm.last = new Date().toISOString();
    saveConfig(config);
    return { ok: true, bound: true, manual: true, windowTitle: farm.windowTitle };
  }

  // 2) auto detect + bind
  const r = await detectAndBindFarm(farm, {
    windowFilter: body?.windowFilter || "", // e.g. "LDPlayer"
    maxScan: body?.maxScan || 25,
    anchor: body?.anchor || farm.anchor,
  });

  farm.anchor = body?.anchor || farm.anchor || { x: 0.02, y: 0.02, w: 0.5, h: 0.18 };
  saveConfig(config);
  return r;
}
/* ================================ */

let config = loadConfig();

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method || "GET";

  try {
    if (method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        agent: "1.1.0",
        port: PORT,
        tools: toolsCheck(),
      });
    }

    // List windows
    if (method === "GET" && url.pathname === "/api/windows") {
      const windows = await listWindows();
      return json(res, 200, { ok: true, windows });
    }

    // Farms list
    if (method === "GET" && url.pathname === "/api/farms") {
      return json(res, 200, { farms: config.farms });
    }

    // Add farm
    if (method === "POST" && url.pathname === "/api/farms") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      if (!name) return json(res, 400, { ok: false, error: "name required" });

      const farm = {
        id: uid(),
        name,
        status: "idle",
        last: new Date().toISOString(),
        windowTitle: "",
        anchor: { x: 0.02, y: 0.02, w: 0.5, h: 0.18 }, // default top-left
        lastDetectedName: "",
        lastDetectAt: "",
      };

      config.farms.unshift(farm);
      saveConfig(config);
      return json(res, 200, { ok: true, farm });
    }

    // Update farm (anchor/windowTitle)
    const updateMatch = url.pathname.match(/^\/api\/farms\/([^/]+)\/update$/);
    if (method === "POST" && updateMatch) {
      const [, id] = updateMatch;
      const body = await readBody(req);
      const farm = config.farms.find((f) => f.id === id);
      if (!farm) return json(res, 404, { ok: false, error: "farm not found" });

      if (body.windowTitle !== undefined) farm.windowTitle = String(body.windowTitle || "");
      if (body.anchor !== undefined) farm.anchor = body.anchor;
      farm.last = new Date().toISOString();
      saveConfig(config);
      return json(res, 200, { ok: true, farm });
    }

    // start/stop/detect
    const match = url.pathname.match(/^\/api\/farms\/([^/]+)\/(start|stop|detect)$/);
    if (method === "POST" && match) {
      const [, id, action] = match;
      const farm = config.farms.find((f) => f.id === id);
      if (!farm) return json(res, 404, { ok: false, error: "farm not found" });

      const body = await readBody(req);

      if (action === "start") await farmStart(farm);
      if (action === "stop") await farmStop(farm);
      if (action === "detect") {
        const r = await farmDetect(farm, body);
        return json(res, 200, r);
      }

      saveConfig(config);
      return json(res, 200, { ok: true, farm });
    }

    return json(res, 404, { ok: false, error: "not found" });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Agent] running on http://127.0.0.1:${PORT}`);
  console.log(`[Agent] toolsDir: ${TOOLS_DIR}`);
});
