const fs = require("fs");
const path = require("path");

async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "cache-control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function readLocalConfig() {
  const p1 = path.join(__dirname, "..", "remote-config.json");
  const p2 = path.join(process.cwd(), "remote-config.json");

  for (const p of [p1, p2]) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {}
  }
  return null;
}

async function loadRemoteConfig() {
  const local = readLocalConfig();
  const url =
    process.env.REMOTE_CONFIG_URL ||
    "https://raw.githubusercontent.com/ahmed885q/vrbot-site/main/remote-config.json";

  try {
    const remote = await fetchJson(url);
    return { config: remote, source: url };
  } catch {
    if (local) return { config: local, source: "local-file" };
    return { config: {}, source: "fallback" };
  }
}

module.exports = { loadRemoteConfig };
