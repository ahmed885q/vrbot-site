"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("VR", {
  agentStart: () => ipcRenderer.invoke("agent:start"),
  agentStop: () => ipcRenderer.invoke("agent:stop"),
  agentRestart: () => ipcRenderer.invoke("agent:restart"),

  setupStart: (payload) => ipcRenderer.invoke("setup:start", payload),
  openFolder: () => ipcRenderer.invoke("setup:openFolder"),

  onSetupDefaults: (cb) => ipcRenderer.on("setup:defaults", (_, d) => cb(d)),
  onSetupStatus: (cb) => ipcRenderer.on("setup:status", (_, s) => cb(s)),
  onSetupProgress: (cb) => ipcRenderer.on("setup:progress", (_, p) => cb(p)),
  onSetupDone: (cb) => ipcRenderer.on("setup:done", (_, ok) => cb(ok)),

  onAgentLog: (cb) => ipcRenderer.on("agent:log", (_, msg) => cb(msg)),
  onAgentStatus: (cb) => ipcRenderer.on("agent:status", (_, s) => cb(s))
});
