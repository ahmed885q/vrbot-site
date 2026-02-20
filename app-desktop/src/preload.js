// app-desktop/src/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("VR", {
  loadConfig: () => ipcRenderer.invoke("cfg:load"),
  saveConfig: (cfg) => ipcRenderer.invoke("cfg:save", cfg),

  startAgent: () => ipcRenderer.invoke("agent:start"),
  stopAgent: () => ipcRenderer.invoke("agent:stop"),

  revealConfig: () => ipcRenderer.invoke("app:revealConfig"),
});
