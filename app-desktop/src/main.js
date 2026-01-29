"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const extract = require("extract-zip");
const { spawn, execFile } = require("child_process");

let mainWindow = null;
let setupWindow = null;
let agentProcess = null;

// ✅ GitHub Pages Remote Config (Root)
const REMOTE_CONFIG_URL =
  "https://ahmed885q.github.io/vrbot-site/remote-config.json";

// -----------------------------
// Windows
// -----------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "dashboard.html"));
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 860,
    height: 640,
    resizable: false,
    backgroundColor: "#0b1020",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  setupWindow.loadFile(path.join(__dirname, "renderer", "setup.html"));
}

// -----------------------------
// Paths (Tools + Temp)
// -----------------------------
function getToolDir() {
  return path.join(app.getPath("userData"), "bin");
}
function getTmpDir() {
  return path.join(app.getPath("userData"), "tmp");
}
function getTesseractDir() {
  return path.join(getToolDir(), "tesseract");
}
function getTessdataDir() {
  return path.join(getToolDir(), "tessdata");
}

function toolsReady() {
  const dir = getToolDir();
  const tesseractExe = path.join(getTesseractDir(), "tesseract.exe");
  const tessdata = getTessdataDir();
  return (
    fs.existsSync(path.join(dir, "ffmpeg.exe")) &&
    fs.existsSync(path.join(dir, "ffprobe.exe")) &&
    fs.existsSync(path.join(dir, "mediamtx.exe")) &&
    fs.existsSync(path.join(dir, "mediamtx.yml")) &&
    fs.existsSync(tesseractExe) &&
    fs.existsSync(path.join(tessdata, "eng.traineddata")) &&
    fs.existsSync(path.join(tessdata, "ara.traineddata"))
  );
}

// -----------------------------
// Remote config
// -----------------------------
function getConfigCachePath() {
  return path.join(app.getPath("userData"), "remote-config-cache.json");
}

function httpsGetJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpsGetJson(res.headers.location, timeoutMs));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`remote-config http ${res.statusCode}`));
      }
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(buf));
        } catch {
          reject(new Error("remote-config invalid JSON"));
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("remote-config timeout")));
    req.on("error", reject);
  });
}

function validateRemoteConfig(j) {
  const ff = j?.tools?.ffmpeg?.url;
  const mx = j?.tools?.mediamtx?.url;
  const te = j?.tools?.tesseract?.url;
  const eng = j?.tools?.tessdata?.eng?.url;
  const ara = j?.tools?.tessdata?.ara?.url;

  if (!ff || !mx || !te || !eng || !ara) {
    throw new Error("remote-config missing urls (ffmpeg/mediamtx/tesseract/tessdata)");
  }

  const mustHttps = [ff, mx, te, eng, ara].every((u) => String(u).startsWith("https://"));
  if (!mustHttps) throw new Error("remote-config urls must be https");

  return {
    ffUrl: String(ff),
    mtxUrl: String(mx),
    ffSha256: String(j?.tools?.ffmpeg?.sha256 || ""),
    mtxSha256: String(j?.tools?.mediamtx?.sha256 || ""),

    tesseractUrl: String(te),
    tesseractSha256: String(j?.tools?.tesseract?.sha256 || ""),

    tessEngUrl: String(eng),
    tessEngSha256: String(j?.tools?.tessdata?.eng?.sha256 || ""),
    tessAraUrl: String(ara),
    tessAraSha256: String(j?.tools?.tessdata?.ara?.sha256 || "")
  };
}

async function loadRemoteConfig() {
  try {
    const j = await httpsGetJson(REMOTE_CONFIG_URL);
    const cfg = validateRemoteConfig(j);
    fs.writeFileSync(getConfigCachePath(), JSON.stringify(j, null, 2), "utf8");
    return cfg;
  } catch {
    try {
      const cached = JSON.parse(fs.readFileSync(getConfigCachePath(), "utf8"));
      return validateRemoteConfig(cached);
    } catch {
      // fallback hardcoded (آخر حل)
      return {
        ffUrl: "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
        mtxUrl:
          "https://github.com/bluenviron/mediamtx/releases/download/v1.15.6/mediamtx_v1.15.6_windows_amd64.zip",
        ffSha256: "",
        mtxSha256: "",
        tesseractUrl:
          "https://sourceforge.net/projects/tesseract-ocr.mirror/files/5.5.0/tesseract-ocr-w64-setup-5.5.0.20241111.exe/download",
        tesseractSha256: "",
        tessEngUrl: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata",
        tessEngSha256: "",
        tessAraUrl: "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/ara.traineddata",
        tessAraSha256: ""
      };
    }
  }
}

// -----------------------------
// Download + Extract + SHA256
// -----------------------------
function downloadFile(url, outPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outPath);

    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(outPath); } catch {}
          return resolve(downloadFile(res.headers.location, outPath, onProgress));
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed: http ${res.statusCode}`));
        }

        const total = Number(res.headers["content-length"] || 0);
        let done = 0;

        res.on("data", (chunk) => {
          done += chunk.length;
          if (total && onProgress) onProgress(done, total);
        });

        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        try { file.close(); } catch {}
        reject(err);
      });
  });
}

async function extractZip(zipPath, destDir) {
  await extract(zipPath, { dir: destDir });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(filePath);
    s.on("data", (d) => h.update(d));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex")));
  });
}

function normSha(s) {
  return String(s || "").trim().toLowerCase();
}

async function verifySha256OrThrow(filePath, expectedSha, label, sendStatus, sendProgress) {
  const exp = normSha(expectedSha);
  if (!exp) return { verified: false };

  sendStatus?.(`التحقق من SHA256 (${label})...`);
  sendProgress?.(0, `Hashing ${label}...`);

  const got = await sha256File(filePath);
  if (got !== exp) {
    throw new Error(`SHA256 mismatch for ${label}\nExpected: ${exp}\nGot:      ${got}`);
  }
  return { verified: true, sha256: got };
}

function findFileRecursive(baseDir, fileNameLower) {
  const items = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(baseDir, it.name);
    if (it.isFile() && it.name.toLowerCase() === fileNameLower) return p;
    if (it.isDirectory()) {
      const hit = findFileRecursive(p, fileNameLower);
      if (hit) return hit;
    }
  }
  return null;
}

function runExe(file, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

// -----------------------------
// Install Tesseract silently into toolsDir/tesseract
// (NSIS-style silent, /D= must be last)
// -----------------------------
async function installTesseractSilently(installerExe, installDir) {
  fs.mkdirSync(installDir, { recursive: true });

  // /S is widely used for silent on this installer family :contentReference[oaicite:3]{index=3}
  const args = ["/S", `/D=${installDir}`];
  await runExe(installerExe, args, { cwd: path.dirname(installerExe) });

  const tesseractExe = path.join(installDir, "tesseract.exe");
  if (!fs.existsSync(tesseractExe)) {
    // بعض الحزم تضعه داخل Tesseract-OCR/
    const alt = path.join(installDir, "Tesseract-OCR", "tesseract.exe");
    if (fs.existsSync(alt)) return path.dirname(alt);
    throw new Error("Tesseract install finished but tesseract.exe not found");
  }
  return installDir;
}

// -----------------------------
// Agent process
// -----------------------------
function getAgentPath() {
  return path.join(app.getAppPath(), "..", "agent-windows", "agent.js");
}

function startAgent() {
  if (agentProcess) return { ok: true, already: true };

  const agentPath = getAgentPath();
  const toolsDir = getToolDir();

  agentProcess = spawn(process.execPath, [agentPath], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TOOLS_DIR: toolsDir,
      // مهم: tesseract يحتاج TESSDATA_PREFIX لتحديد مكان ملفات اللغة
      TESSDATA_PREFIX: getTessdataDir()
    },
  });

  agentProcess.stdout.on("data", (d) => mainWindow?.webContents.send("agent:log", String(d)));
  agentProcess.stderr.on("data", (d) => mainWindow?.webContents.send("agent:log", String(d)));

  agentProcess.on("exit", (code) => {
    mainWindow?.webContents.send("agent:status", { running: false, code });
    agentProcess = null;
  });

  mainWindow?.webContents.send("agent:status", { running: true });
  return { ok: true };
}

function stopAgent() {
  if (!agentProcess) return { ok: true, already: true };
  try {
    agentProcess.kill();
    agentProcess = null;
    mainWindow?.webContents.send("agent:status", { running: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// -----------------------------
// IPC - Setup
// -----------------------------
ipcMain.handle("setup:openFolder", async () => {
  const dir = getToolDir();
  fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return { ok: true, dir };
});

ipcMain.handle("setup:start", async (_, payload) => {
  const sendStatus = (s) => setupWindow?.webContents.send("setup:status", s);
  const sendProgress = (percent, detail = "") =>
    setupWindow?.webContents.send("setup:progress", { percent, detail });

  const toolsDir = getToolDir();
  const tmpDir = getTmpDir();
  fs.mkdirSync(toolsDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(getTessdataDir(), { recursive: true });
  fs.mkdirSync(getTesseractDir(), { recursive: true });

  // urls
  const ffUrl = String(payload?.ffUrl || "").trim();
  const mtxUrl = String(payload?.mtxUrl || "").trim();
  const tesseractUrl = String(payload?.tesseractUrl || "").trim();
  const tessEngUrl = String(payload?.tessEngUrl || "").trim();
  const tessAraUrl = String(payload?.tessAraUrl || "").trim();

  // sha
  const ffSha256 = String(payload?.ffSha256 || "");
  const mtxSha256 = String(payload?.mtxSha256 || "");
  const tesseractSha256 = String(payload?.tesseractSha256 || "");
  const tessEngSha256 = String(payload?.tessEngSha256 || "");
  const tessAraSha256 = String(payload?.tessAraSha256 || "");

  const mustHttps = [ffUrl, mtxUrl, tesseractUrl, tessEngUrl, tessAraUrl].every((u) => u.startsWith("https://"));
  if (!mustHttps) throw new Error("URLs must be https");

  const ffZip = path.join(tmpDir, "ffmpeg.zip");
  const mtxZip = path.join(tmpDir, "mediamtx.zip");
  const tessExe = path.join(tmpDir, "tesseract-setup.exe");
  const engFile = path.join(getTessdataDir(), "eng.traineddata");
  const araFile = path.join(getTessdataDir(), "ara.traineddata");

  try {
    // 1) FFmpeg
    sendStatus("تنزيل FFmpeg...");
    await downloadFile(ffUrl, ffZip, (d, t) => sendProgress(Math.round((d / t) * 25), `FFmpeg ${Math.round((d / t) * 100)}%`));
    await verifySha256OrThrow(ffZip, ffSha256, "FFmpeg", sendStatus, (p, d) => sendProgress(Math.min(28, p), d));

    sendStatus("فك ضغط FFmpeg...");
    const ffExtractDir = path.join(tmpDir, "ffmpeg_extracted");
    fs.rmSync(ffExtractDir, { recursive: true, force: true });
    fs.mkdirSync(ffExtractDir, { recursive: true });
    await extractZip(ffZip, ffExtractDir);

    const ffmpegSrc = findFileRecursive(ffExtractDir, "ffmpeg.exe");
    const ffprobeSrc = findFileRecursive(ffExtractDir, "ffprobe.exe");
    if (!ffmpegSrc || !ffprobeSrc) throw new Error("FFmpeg zip structure unexpected");

    fs.copyFileSync(ffmpegSrc, path.join(toolsDir, "ffmpeg.exe"));
    fs.copyFileSync(ffprobeSrc, path.join(toolsDir, "ffprobe.exe"));
    sendProgress(30, "FFmpeg جاهز ✅");

    // 2) MediaMTX
    sendStatus("تنزيل MediaMTX...");
    await downloadFile(mtxUrl, mtxZip, (d, t) => sendProgress(30 + Math.round((d / t) * 20), `MediaMTX ${Math.round((d / t) * 100)}%`));
    await verifySha256OrThrow(mtxZip, mtxSha256, "MediaMTX", sendStatus, (p, d) => sendProgress(Math.min(55, 30 + p), d));

    sendStatus("فك ضغط MediaMTX...");
    const mtxExtractDir = path.join(tmpDir, "mediamtx_extracted");
    fs.rmSync(mtxExtractDir, { recursive: true, force: true });
    fs.mkdirSync(mtxExtractDir, { recursive: true });
    await extractZip(mtxZip, mtxExtractDir);

    const mtxSrc = findFileRecursive(mtxExtractDir, "mediamtx.exe");
    if (!mtxSrc) throw new Error("mediamtx.exe not found");
    fs.copyFileSync(mtxSrc, path.join(toolsDir, "mediamtx.exe"));

    const yml = `
logLevel: info
rtmp: yes
rtmpAddress: 127.0.0.1:1935
hls: yes
hlsAddress: 127.0.0.1:8888
paths:
  all:
    source: publisher
`.trim();
    fs.writeFileSync(path.join(toolsDir, "mediamtx.yml"), yml, "utf8");
    sendProgress(60, "MediaMTX جاهز ✅");

    // 3) Tesseract installer
    sendStatus("تنزيل Tesseract...");
    await downloadFile(tesseractUrl, tessExe, (d, t) => sendProgress(60 + Math.round((d / t) * 15), `Tesseract ${Math.round((d / t) * 100)}%`));
    await verifySha256OrThrow(tessExe, tesseractSha256, "Tesseract Installer", sendStatus, (p, d) => sendProgress(Math.min(77, 60 + p), d));

    sendStatus("تثبيت Tesseract (Silent)...");
    const installedDir = await installTesseractSilently(tessExe, getTesseractDir());
    // لو ثبت داخل subfolder رجعنا المسار الصحيح
    const tessExePath = path.join(installedDir, "tesseract.exe");
    if (!fs.existsSync(tessExePath)) throw new Error("tesseract.exe not found after install");
    sendProgress(80, "Tesseract جاهز ✅");

    // 4) tessdata (eng + ara)
    sendStatus("تنزيل ملفات اللغة (eng/ara)...");
    await downloadFile(tessEngUrl, engFile, (d, t) => sendProgress(80 + Math.round((d / t) * 8), `eng.traineddata ${Math.round((d / t) * 100)}%`));
    await verifySha256OrThrow(engFile, tessEngSha256, "tessdata eng", sendStatus, (p, d) => sendProgress(Math.min(90, 80 + p), d));

    await downloadFile(tessAraUrl, araFile, (d, t) => sendProgress(90 + Math.round((d / t) * 8), `ara.traineddata ${Math.round((d / t) * 100)}%`));
    await verifySha256OrThrow(araFile, tessAraSha256, "tessdata ara", sendStatus, (p, d) => sendProgress(Math.min(98, 90 + p), d));

    if (!toolsReady()) throw new Error("Tools not ready after setup");

    sendProgress(100, "تمت التهيئة ✅");
    setupWindow?.webContents.send("setup:done", true);

    setupWindow?.close();
    setupWindow = null;

    createMainWindow();
    startAgent();

    return { ok: true, toolsDir };
  } catch (e) {
    setupWindow?.webContents.send("setup:done", false);
    throw e;
  }
});

// -----------------------------
// IPC - Agent controls
// -----------------------------
ipcMain.handle("agent:start", () => startAgent());
ipcMain.handle("agent:stop", () => stopAgent());
ipcMain.handle("agent:restart", () => {
  stopAgent();
  return startAgent();
});

// -----------------------------
// App lifecycle
// -----------------------------
app.whenReady().then(async () => {
  const remote = await loadRemoteConfig();

  if (!toolsReady()) {
    createSetupWindow();
    setupWindow.webContents.on("did-finish-load", () => {
      setupWindow.webContents.send("setup:defaults", remote);
    });
    return;
  }

  createMainWindow();
  startAgent();
});

app.on("before-quit", () => stopAgent());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
