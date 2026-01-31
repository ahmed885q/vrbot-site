const { windowManager } = require("node-window-manager");
const screenshot = require("screenshot-desktop");
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");
const { getCached } = require("./ocr-cache");

let OCR_CFG = {
  enabled: true,
  ttlMs: 10000,
  langs: ["eng"],
  whitelist: "",
  threshold: 180,
  anchor: { x: 0.02, y: 0.02, w: 0.3, h: 0.12 }
};

let workerPromise = null;

function setOcrConfig(cfg) {
  OCR_CFG = { ...OCR_CFG, ...cfg, anchor: { ...OCR_CFG.anchor, ...cfg?.anchor } };
  workerPromise = null;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker(OCR_CFG.langs);
      await w.setParameters({ tessedit_char_whitelist: OCR_CFG.whitelist || "" });
      return w;
    })();
  }
  return workerPromise;
}

async function discoverLdplayerWithNames() {
  if (!OCR_CFG.enabled) return [];

  const wins = windowManager.getWindows().filter(w =>
    w.getTitle().toLowerCase().includes("ldplayer")
  );

  if (!wins.length) return [];

  const screen = await screenshot({ format: "png" });
  const worker = await getWorker();

  const res = [];
  for (const w of wins) {
    const b = w.getBounds();
    const a = OCR_CFG.anchor;

    const crop = await sharp(screen)
      .extract({
        left: Math.floor(b.x + b.width * a.x),
        top: Math.floor(b.y + b.height * a.y),
        width: Math.floor(b.width * a.w),
        height: Math.floor(b.height * a.h)
      })
      .threshold(OCR_CFG.threshold)
      .toBuffer();

    const { data } = await worker.recognize(crop);
    res.push({
      windowId: String(w.hwnd),
      title: w.getTitle(),
      ocr: data.text.trim()
    });
  }

  return res;
}

module.exports = { discoverLdplayerWithNames, setOcrConfig };
