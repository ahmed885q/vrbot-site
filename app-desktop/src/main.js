const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');

let mainWindow = null;
let agentProcess = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'dashboard.html'));
}

function getAgentPath() {
  // agent-windows/agent.js موجود جنب المشروع (ضمن files في builder)
  // بعد build سيبقى نفس المسار النسبي من app.asar unpacked حسب إعداداتك
  // للبساطة هنا نستخدم مسار النسخة وقت التشغيل:
  return path.join(app.getAppPath(), '..', 'agent-windows', 'agent.js');
}

function startAgent() {
  if (agentProcess) return { ok: true, already: true };

  const agentPath = getAgentPath();

  agentProcess = spawn(process.execPath, [agentPath], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  agentProcess.stdout.on('data', (d) => {
    mainWindow?.webContents.send('agent:log', String(d));
  });

  agentProcess.stderr.on('data', (d) => {
    mainWindow?.webContents.send('agent:log', String(d));
  });

  agentProcess.on('exit', (code) => {
    mainWindow?.webContents.send('agent:status', { running: false, code });
    agentProcess = null;
  });

  mainWindow?.webContents.send('agent:status', { running: true });
  return { ok: true };
}

function stopAgent() {
  if (!agentProcess) return { ok: true, already: true };
  try {
    agentProcess.kill();
    agentProcess = null;
    mainWindow?.webContents.send('agent:status', { running: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function setupAutoUpdate() {
  // اختياري: فعل التحديث فقط في build
  autoUpdater.autoDownload = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update:status', 'checking');
  });
  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update:status', 'available');
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:status', 'none');
  });
  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update:status', `error: ${err?.message || err}`);
  });
  autoUpdater.on('download-progress', (p) => {
    mainWindow?.webContents.send('update:progress', {
      percent: Math.round(p.percent || 0),
      bytesPerSecond: p.bytesPerSecond || 0
    });
  });
  autoUpdater.on('update-downloaded', async () => {
    mainWindow?.webContents.send('update:status', 'downloaded');
    const res = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      message: 'Update downloaded. Restart to apply?'
    });
    if (res.response === 0) autoUpdater.quitAndInstall();
  });
}

app.whenReady().then(() => {
  createMainWindow();

  // تشغيل agent تلقائيًا عند فتح التطبيق
  startAgent();

  // التحديث التلقائي (يفضل فقط في النسخة الموزعة)
  if (!app.isPackaged) {
    mainWindow?.webContents.send('update:status', 'dev-mode');
  } else {
    setupAutoUpdate();
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  // لو تبي يخلي agent شغال بالخلفية بدون نافذة غير هذا السلوك
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopAgent();
});

/* IPC API للواجهة */
ipcMain.handle('agent:start', () => startAgent());
ipcMain.handle('agent:stop', () => stopAgent());
ipcMain.handle('agent:restart', () => {
  stopAgent();
  return startAgent();
});

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { ok: false, error: 'dev-mode' };
  await autoUpdater.checkForUpdatesAndNotify();
  return { ok: true };
});
