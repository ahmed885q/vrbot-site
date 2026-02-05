const logBox = document.getElementById("logBox");
const agentState = document.getElementById("agentState");
const apiState = document.getElementById("apiState");
const toolsState = document.getElementById("toolsState");

const btnAgentStart = document.getElementById("btnAgentStart");
const btnAgentStop = document.getElementById("btnAgentStop");
const btnAgentRestart = document.getElementById("btnAgentRestart");

const farmName = document.getElementById("farmName");
const btnAddFarm = document.getElementById("btnAddFarm");
const btnRefresh = document.getElementById("btnRefresh");
const btnRefreshWindows = document.getElementById("btnRefreshWindows");
const farmBody = document.getElementById("farmBody");

let windowsCache = [];

function appendLog(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${String(msg).trim()}`;
  logBox.textContent += line + "\n";
  logBox.scrollTop = logBox.scrollHeight;
}

function setAgentRunning(running) {
  agentState.textContent = `Agent: ${running ? "Running ✅" : "Stopped ⛔"}`;
}

function setApiOk(ok) {
  apiState.textContent = `API: ${ok ? "OK" : "Down"}`;
}

function setToolsText(s) {
  toolsState.textContent = `Tools: ${s}`;
}

async function api(path, opts) {
  const res = await fetch(`http://127.0.0.1:9797${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function windowOptionsHtml(selectedTitle) {
  const sel = String(selectedTitle || "");
  const opts = windowsCache.map(w => {
    const t = w.title || "";
    const label = `${t}  (${w.processName || ""} / ${w.pid || ""})`;
    const selected = t === sel ? "selected" : "";
    return `<option value="${escapeHtml(t)}" ${selected}>${escapeHtml(label)}</option>`;
  });
  return `<option value="">— اختر نافذة —</option>` + opts.join("");
}

async function refreshWindows() {
  try {
    const r = await api("/api/windows");
    windowsCache = r.windows || [];
    appendLog(`Windows: ${windowsCache.length}`);
  } catch (e) {
    appendLog(`refreshWindows error: ${e.message}`);
  }
}

async function pingApi() {
  try {
    const h = await api("/health");
    setApiOk(true);

    const tools = h.tools || {};
    const t = [];
    t.push(tools.ffmpeg ? "ffmpeg✅" : "ffmpeg❌");
    t.push(tools.ffprobe ? "ffprobe✅" : "ffprobe❌");
    t.push(tools.tesseract ? "tesseract✅" : "tesseract❌");
    setToolsText(t.join(" | "));
  } catch {
    setApiOk(false);
    setToolsText("—");
  }
}

async function refreshFarms() {
  try {
    const data = await api("/api/farms");
    const farms = data.farms || [];
    farmBody.innerHTML = "";

    for (const f of farms) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${escapeHtml(f.name)}</td>
        <td>${escapeHtml(f.status || "idle")}</td>
        <td>
          <select class="winSel" data-id="${f.id}">
            ${windowOptionsHtml(f.windowTitle)}
          </select>
          <div style="margin-top:6px;color:rgba(230,236,255,.65);font-size:11px">
            الحالي: ${escapeHtml(f.windowTitle || "-")}
          </div>
        </td>
        <td>
          <div>${escapeHtml(f.lastDetectedName || "-")}</div>
          <div style="color:rgba(230,236,255,.65);font-size:11px">${escapeHtml(f.lastDetectAt || "-")}</div>
        </td>
        <td>
          <div class="mini">
            <button class="smallBtn" data-act="start" data-id="${f.id}">Start</button>
            <button class="smallBtn" data-act="stop" data-id="${f.id}">Stop</button>
            <button class="smallBtn" data-act="detect" data-id="${f.id}">Detect & Bind</button>
          </div>
        </td>
      `;
      farmBody.appendChild(tr);
    }
  } catch (e) {
    appendLog(`refreshFarms error: ${e.message}`);
  }
}

// Agent buttons
btnAgentStart.addEventListener("click", async () => {
  const r = await window.VR.agentStart();
  appendLog(`agentStart: ${JSON.stringify(r)}`);
  setAgentRunning(true);
  setTimeout(pingApi, 600);
});

btnAgentStop.addEventListener("click", async () => {
  const r = await window.VR.agentStop();
  appendLog(`agentStop: ${JSON.stringify(r)}`);
  setAgentRunning(false);
  setTimeout(pingApi, 300);
});

btnAgentRestart.addEventListener("click", async () => {
  const r = await window.VR.agentRestart();
  appendLog(`agentRestart: ${JSON.stringify(r)}`);
  setAgentRunning(true);
  setTimeout(pingApi, 600);
});

// Add farm
btnAddFarm.addEventListener("click", async () => {
  const name = farmName.value.trim();
  if (!name) return;

  try {
    await api("/api/farms", { method: "POST", body: JSON.stringify({ name }) });
    farmName.value = "";
    await refreshFarms();
  } catch (e) {
    appendLog(`add farm error: ${e.message}`);
  }
});

btnRefresh.addEventListener("click", async () => {
  await pingApi();
  await refreshFarms();
});

btnRefreshWindows.addEventListener("click", async () => {
  await refreshWindows();
  await refreshFarms(); // so dropdowns get updated
});

// Bind dropdown change
farmBody.addEventListener("change", async (e) => {
  const sel = e.target.closest("select.winSel");
  if (!sel) return;
  const id = sel.dataset.id;
  const title = sel.value;

  try {
    await api(`/api/farms/${id}/update`, {
      method: "POST",
      body: JSON.stringify({ windowTitle: title }),
    });
    appendLog(`Bound farm ${id} -> ${title}`);
    await refreshFarms();
  } catch (err) {
    appendLog(`bind error: ${err.message}`);
  }
});

// Table actions
farmBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;

  try {
    if (act === "start" || act === "stop") {
      await api(`/api/farms/${id}/${act}`, { method: "POST" });
    }

    if (act === "detect") {
      // You can optionally filter by LDPlayer:
      // windowFilter: "LDPlayer"
      const r = await api(`/api/farms/${id}/detect`, {
        method: "POST",
        body: JSON.stringify({
          windowFilter: "",   // ضع "LDPlayer" لو تبغى يركز عليه
          maxScan: 25
        }),
      });
      appendLog(`detect result: ${JSON.stringify(r)}`);
    }

    await refreshWindows();
    await refreshFarms();
  } catch (err) {
    appendLog(`${act} error: ${err.message}`);
  }
});

// IPC logs from agent
window.VR.onAgentLog((msg) => appendLog(msg));
window.VR.onAgentStatus((s) => setAgentRunning(!!s?.running));

// Init
setAgentRunning(true);
(async () => {
  await refreshWindows();
  await pingApi();
  await refreshFarms();
})();
