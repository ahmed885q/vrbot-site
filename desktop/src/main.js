// app-desktop/src/main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const CONFIG_NAME = "agent-config.json";
let agentProc = null;

function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_NAME);
}

function readConfig() {
  try {
    const p = getConfigPath();
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    return j;
  } catch {
    return null;
  }
}

function writeConfig(cfg) {
  const p = getConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), "utf8");
  return p;
}

function createWindowForSetup() {
  const win = new BrowserWindow({
    width: 520,
    height: 620,
    resizable: false,
    title: "Viking Rais Agent - First Setup",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "setup.html"));
  return win;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 520,
    height: 420,
    resizable: false,
    title: "Viking Rais Agent",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "setup.html"), { query: { view: "running" } });
  return win;
}

function stopAgent() {
  if (!agentProc) return;
  try {
    agentProc.kill();
  } catch {}
  agentProc = null;
}

function startAgentWithConfig(cfg) {
  stopAgent();

  const agentPath = path.join(process.resourcesPath || process.cwd(), "agent-windows", "agent.js");
  const devAgentPath = path.join(process.cwd(), "agent-windows", "agent.js");
  const finalAgentPath = fs.existsSync(devAgentPath) ? devAgentPath : agentPath;

  const env = {
    ...process.env,

    WS_BASE_URL: cfg.wsBaseUrl,
    // ✅ device من hostname تلقائي
    AGENT_DEVICE: cfg.device || os.hostname(),
    AGENT_TOKEN: cfg.token,

    STREAM_STATUS_URL: cfg.streamStatusUrl || "http://127.0.0.1:9797/stream/status",

    GITHUB_OWNER: cfg.githubOwner || process.env.GITHUB_OWNER || "ahmed885q",
    GITHUB_REPO: cfg.githubRepo || process.env.GITHUB_REPO || "vrbot-site",
    AGENT_VERSION: cfg.agentVersion || process.env.AGENT_VERSION || "1.0.0",
  };

  agentProc = spawn(process.execPath, [finalAgentPath], {
    env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: "inherit",
    windowsHide: true,
  });

  agentProc.on("exit", (code) => {
    agentProc = null;
    console.log("[agent] exited with code:", code);
  });

  console.log("[agent] started:", finalAgentPath);
}

// IPC
ipcMain.handle("cfg:load", async () => {
  // نرجّع hostname للواجهة عشان تعرضه
  return { cfg: readConfig(), hostname: os.hostname() };
});

ipcMain.handle("cfg:save", async (_ev, cfg) => {
  if (!cfg?.wsBaseUrl || !cfg?.token) {
    throw new Error("Missing required fields: wsBaseUrl + token");
  }

  const fixed = {
    wsBaseUrl: String(cfg.wsBaseUrl || "").trim(),
    token: String(cfg.token || "").trim(),
    // ✅ device ثابت من hostname
    device: os.hostname(),
    streamStatusUrl: String(cfg.streamStatusUrl || "").trim(),
    githubOwner: String(cfg.githubOwner || "").trim(),
    githubRepo: String(cfg.githubRepo || "").trim(),
    agentVersion: String(cfg.agentVersion || "").trim(),
  };

  const savedPath = writeConfig(fixed);
  return { ok: true, path: savedPath, device: fixed.device };
});

ipcMain.handle("agent:start", async () => {
  const cfg = readConfig();
  if (!cfg) return { ok: false, error: "No config found" };
  startAgentWithConfig(cfg);
  return { ok: true };
});

ipcMain.handle("agent:stop", async () => {
  stopAgent();
  return { ok: true };
});

ipcMain.handle("app:revealConfig", async () => {
  const p = getConfigPath();
  try {
    await dialog.showMessageBox({ type: "info", message: "Config path", detail: p });
  } catch {}
  return { ok: true, path: p };
});

// App flow
app.whenReady().then(() => {
  const cfg = readConfig();
  if (!cfg) {
    const setupWin = createWindowForSetup();
    setupWin.on("closed", () => {
      if (!readConfig()) app.quit();
    });
    return;
  }

  startAgentWithConfig(cfg);
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  stopAgent();
  app.quit();
});
