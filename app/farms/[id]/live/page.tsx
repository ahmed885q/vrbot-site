'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'

export default function LivePage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const url = `http://127.0.0.1:8888/live/${params.id}/index.m3u8`
    const v = videoRef.current
    if (!v) return

    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = url
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true })
      hls.loadSource(url)
      hls.attachMedia(v)
      return () => hls.destroy()
    }
  }, [params.id])

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>VR Farm Manager â€” Live</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>Farm: {params.id}</p>

      <div style={{ marginTop: 12 }}>
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          playsInline
          style={{ width: '100%', borderRadius: 12, background: '#000' }}
        />
      </div>
    </div>
  )
}
