const logBox = document.getElementById('logBox');
const agentState = document.getElementById('agentState');
const updateState = document.getElementById('updateState');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnRestart = document.getElementById('btnRestart');
const btnUpdate = document.getElementById('btnUpdate');

const farmName = document.getElementById('farmName');
const btnAddFarm = document.getElementById('btnAddFarm');
const farmBody = document.getElementById('farmBody');

function appendLog(msg) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`.trim();
  logBox.textContent += line + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}

function setAgentRunning(running) {
  agentState.textContent = `Agent: ${running ? 'Running ✅' : 'Stopped ⛔'}`;
}

function setUpdateStatus(s) {
  updateState.textContent = `Update: ${s}`;
}

async function api(path, opts) {
  // حالياً نستخدم agent api على localhost: 9797 (من agent.js)
  const res = await fetch(`http://127.0.0.1:9797${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function refreshFarms() {
  try {
    const data = await api('/api/farms');
    farmBody.innerHTML = '';
    for (const f of data.farms) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(f.name)}</td>
        <td>${escapeHtml(f.status || 'idle')}</td>
        <td>${escapeHtml(f.last || '-')}</td>
        <td>
          <div class="mini">
            <button class="smallBtn" data-act="start" data-id="${f.id}">Start</button>
            <button class="smallBtn" data-act="stop" data-id="${f.id}">Stop</button>
            <button class="smallBtn" data-act="detect" data-id="${f.id}">Detect</button>
          </div>
        </td>
      `;
      farmBody.appendChild(tr);
    }
  } catch (e) {
    appendLog(`refreshFarms error: ${e.message}`);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* Buttons */
btnStart.addEventListener('click', async () => {
  const r = await window.VR.agentStart();
  appendLog(`agentStart: ${JSON.stringify(r)}`);
  setAgentRunning(true);
});

btnStop.addEventListener('click', async () => {
  const r = await window.VR.agentStop();
  appendLog(`agentStop: ${JSON.stringify(r)}`);
  setAgentRunning(false);
});

btnRestart.addEventListener('click', async () => {
  const r = await window.VR.agentRestart();
  appendLog(`agentRestart: ${JSON.stringify(r)}`);
  setAgentRunning(true);
});

btnUpdate.addEventListener('click', async () => {
  const r = await window.VR.updateCheck();
  appendLog(`updateCheck: ${JSON.stringify(r)}`);
});

btnAddFarm.addEventListener('click', async () => {
  const name = farmName.value.trim();
  if (!name) return;
  try {
    await api('/api/farms', { method: 'POST', body: JSON.stringify({ name }) });
    farmName.value = '';
    await refreshFarms();
  } catch (e) {
    appendLog(`add farm error: ${e.message}`);
  }
});

/* Table actions */
farmBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;

  try {
    if (act === 'start') await api(`/api/farms/${id}/start`, { method: 'POST' });
    if (act === 'stop') await api(`/api/farms/${id}/stop`, { method: 'POST' });
    if (act === 'detect') await api(`/api/farms/${id}/detect`, { method: 'POST' });
    await refreshFarms();
  } catch (err) {
    appendLog(`${act} error: ${err.message}`);
  }
});

/* IPC listeners */
window.VR.onAgentLog((msg) => appendLog(msg));
window.VR.onAgentStatus((s) => setAgentRunning(!!s?.running));
window.VR.onUpdateStatus((s) => setUpdateStatus(s));
window.VR.onUpdateProgress((p) => setUpdateStatus(`downloading ${p.percent}%`));

/* init */
setAgentRunning(false);
setUpdateStatus('...');
refreshFarms();
