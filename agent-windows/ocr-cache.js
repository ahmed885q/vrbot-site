// agent-windows/ocr-cache.js
const DEFAULT_TTL_MS = 10_000;
const CLEANUP_EVERY_MS = 60_000;

// key -> { value, at }
const cache = new Map();

/**
 * Cache getter for expensive OCR computations
 * @param {string} key
 * @param {() => Promise<any>} computeFn
 * @param {number} ttlMs
 */
async function getCached(key, computeFn, ttlMs = DEFAULT_TTL_MS) {
  const t = Date.now();
  const prev = cache.get(key);

  if (prev && t - prev.at < ttlMs) {
    return { ...prev.value, _cached: true, _cachedAt: prev.at };
  }

  const value = await computeFn();
  cache.set(key, { value, at: t });

  return { ...value, _cached: false, _cachedAt: t };
}

function clearCache(key) {
  if (key) cache.delete(key);
  else cache.clear();
}

// تنظيف تلقائي لعناصر قديمة
setInterval(() => {
  const t = Date.now();
  for (const [k, v] of cache.entries()) {
    if (t - v.at > DEFAULT_TTL_MS * 6) cache.delete(k); // ~60s
  }
}, CLEANUP_EVERY_MS).unref?.();

module.exports = {
  getCached,
  clearCache,
};
