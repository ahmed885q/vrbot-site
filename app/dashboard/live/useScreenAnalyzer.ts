'use client'
import { useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════
// SYSTEM 6 — AI VISION (FOUNDATION)
// ═══════════════════════════════════════════════════════════════════
// Lightweight screenshot analyzer using canvas pixel sampling.
// Detects basic screen states (idle, menu, loading, battle, unknown)
// without heavy ML — just color zone analysis and brightness detection.
//
// This is the foundation layer. Future upgrades can add:
// - OCR for text detection
// - Template matching for known UI elements
// - ML-based classification
// ═══════════════════════════════════════════════════════════════════

export type ScreenState = 'idle' | 'menu' | 'loading' | 'battle' | 'dialog' | 'unknown'

export type AnalysisResult = {
  state: ScreenState
  confidence: number          // 0-100
  brightness: number          // 0-255 average
  dominantColor: string       // hex
  regions: {
    top: number               // avg brightness of top 20%
    center: number            // avg brightness of center 40%
    bottom: number            // avg brightness of bottom 20%
  }
  ts: number
}

type AnalyzerConfig = {
  /** Sample grid size (NxN points) for faster analysis */
  sampleGridSize: number
  /** Minimum time between analyses (ms) */
  cooldownMs: number
  /** Canvas size for analysis (downscale for speed) */
  analysisWidth: number
  analysisHeight: number
}

const DEFAULT_CONFIG: AnalyzerConfig = {
  sampleGridSize: 16,
  cooldownMs: 2000,
  analysisWidth: 160,
  analysisHeight: 90,
}

export function useScreenAnalyzer(config: Partial<AnalyzerConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastAnalysisRef = useRef(0)
  const lastResultRef = useRef<AnalysisResult | null>(null)

  // Lazy-init offscreen canvas
  const getCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      canvasRef.current.width = cfg.analysisWidth
      canvasRef.current.height = cfg.analysisHeight
    }
    return canvasRef.current
  }, [cfg.analysisWidth, cfg.analysisHeight])

  // ── Analyze a screenshot blob ─────────────────────────────────
  const analyze = useCallback(async (blob: Blob): Promise<AnalysisResult | null> => {
    const now = Date.now()
    if (now - lastAnalysisRef.current < cfg.cooldownMs) {
      return lastResultRef.current // return cached result during cooldown
    }
    lastAnalysisRef.current = now

    try {
      const canvas = getCanvas()
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null

      // Load blob into image
      const url = URL.createObjectURL(blob)
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = url
      })

      // Draw downscaled
      ctx.drawImage(img, 0, 0, cfg.analysisWidth, cfg.analysisHeight)
      URL.revokeObjectURL(url)

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, cfg.analysisWidth, cfg.analysisHeight)
      const pixels = imageData.data // RGBA

      // ── Sample grid for speed ───────────────────────────────
      const stepX = Math.floor(cfg.analysisWidth / cfg.sampleGridSize)
      const stepY = Math.floor(cfg.analysisHeight / cfg.sampleGridSize)
      let totalR = 0, totalG = 0, totalB = 0, totalBrightness = 0
      let samples = 0

      // Region accumulators
      const topThreshold = Math.floor(cfg.analysisHeight * 0.2)
      const bottomThreshold = Math.floor(cfg.analysisHeight * 0.8)
      let topBright = 0, topCount = 0
      let centerBright = 0, centerCount = 0
      let bottomBright = 0, bottomCount = 0

      // Color histogram (simplified: 8 buckets per channel)
      const colorBuckets: Record<string, number> = {}

      for (let y = 0; y < cfg.analysisHeight; y += stepY) {
        for (let x = 0; x < cfg.analysisWidth; x += stepX) {
          const idx = (y * cfg.analysisWidth + x) * 4
          const r = pixels[idx]
          const g = pixels[idx + 1]
          const b = pixels[idx + 2]
          const brightness = (r + g + b) / 3

          totalR += r
          totalG += g
          totalB += b
          totalBrightness += brightness
          samples++

          // Region tracking
          if (y < topThreshold) { topBright += brightness; topCount++ }
          else if (y >= bottomThreshold) { bottomBright += brightness; bottomCount++ }
          else { centerBright += brightness; centerCount++ }

          // Simplified color bucket
          const bucketKey = `${Math.floor(r / 32)}_${Math.floor(g / 32)}_${Math.floor(b / 32)}`
          colorBuckets[bucketKey] = (colorBuckets[bucketKey] || 0) + 1
        }
      }

      if (samples === 0) return null

      const avgBrightness = totalBrightness / samples
      const avgR = Math.round(totalR / samples)
      const avgG = Math.round(totalG / samples)
      const avgB = Math.round(totalB / samples)

      const regions = {
        top: topCount > 0 ? topBright / topCount : 0,
        center: centerCount > 0 ? centerBright / centerCount : 0,
        bottom: bottomCount > 0 ? bottomBright / bottomCount : 0,
      }

      // Find dominant color bucket
      let maxBucket = ''
      let maxBucketCount = 0
      for (const [key, count] of Object.entries(colorBuckets)) {
        if (count > maxBucketCount) { maxBucket = key; maxBucketCount = count }
      }
      const [dr, dg, db] = maxBucket.split('_').map(n => parseInt(n) * 32 + 16)
      const dominantColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`

      // ── State classification (rule-based) ─────────────────────
      let state: ScreenState = 'unknown'
      let confidence = 50

      if (avgBrightness < 20) {
        // Very dark screen — likely loading or off
        state = 'loading'
        confidence = 75
      } else if (avgBrightness < 50 && regions.center < 30) {
        // Dark center — probably loading screen
        state = 'loading'
        confidence = 65
      } else if (regions.top > 150 && regions.center < 100 && regions.bottom > 100) {
        // Bright top bar + darker center — menu/dialog pattern
        state = 'menu'
        confidence = 70
      } else if (regions.center > 180 && regions.top > 150) {
        // Very bright screen — likely a dialog/popup
        state = 'dialog'
        confidence = 60
      } else if (avgR > avgG * 1.5 && avgR > avgB * 1.5 && avgBrightness > 80) {
        // Red-dominant — battle indicators
        state = 'battle'
        confidence = 55
      } else if (avgBrightness > 60 && avgBrightness < 180) {
        // Normal brightness range — likely game idle/world view
        state = 'idle'
        confidence = 65
      }

      const result: AnalysisResult = {
        state,
        confidence,
        brightness: Math.round(avgBrightness),
        dominantColor,
        regions: {
          top: Math.round(regions.top),
          center: Math.round(regions.center),
          bottom: Math.round(regions.bottom),
        },
        ts: now,
      }

      lastResultRef.current = result
      return result
    } catch (e) {
      console.error('[VISION] Analysis failed:', e)
      return null
    }
  }, [cfg, getCanvas])

  // ── Quick state check (returns cached result) ───────────────────
  const getLastResult = useCallback((): AnalysisResult | null => {
    return lastResultRef.current
  }, [])

  // ── Cleanup ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    canvasRef.current = null
    lastResultRef.current = null
  }, [])

  return {
    analyze,
    getLastResult,
    cleanup,
  }
}
