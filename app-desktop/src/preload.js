const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('VR', {
  agentStart: () => ipcRenderer.invoke('agent:start'),
  agentStop: () => ipcRenderer.invoke('agent:stop'),
  agentRestart: () => ipcRenderer.invoke('agent:restart'),

  updateCheck: () => ipcRenderer.invoke('update:check'),

  onAgentLog: (cb) => ipcRenderer.on('agent:log', (_, msg) => cb(msg)),
  onAgentStatus: (cb) => ipcRenderer.on('agent:status', (_, s) => cb(s)),
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_, s) => cb(s)),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_, p) => cb(p))
});
