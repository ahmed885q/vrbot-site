// lib/protection/getProtectionSettingsEdge.ts
type ProtectionSettings = {
  enabled: boolean
  sensitivity: number
  max_requests: number
  block_duration_minutes: number
}

let cache: { value: ProtectionSettings; expiresAt: number } | null = null

export async function getProtectionSettingsEdge(): Promise<ProtectionSettings> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.value

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // REST Data API
  const endpoint =
    `${url}/rest/v1/anti_detection_settings` +
    `?select=enabled,sensitivity,max_requests,block_duration_minutes` +
    `&setting_key=eq.global` +
    `&limit=1`

  const res = await fetch(endpoint, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    // مهم للميدلوير: لا تخليه يخزن نسخة قديمة طويل
    cache: 'no-store',
  })

  // fallback defaults لو فشل
  if (!res.ok) {
    const fallback = {
      enabled: true,
      sensitivity: 3,
      max_requests: 100,
      block_duration_minutes: 60,
    }
    cache = { value: fallback, expiresAt: now + 15_000 }
    return fallback
  }

  const rows = (await res.json()) as any[]
  const s = rows?.[0]

  const value: ProtectionSettings = {
    enabled: !!s?.enabled,
    sensitivity: Number(s?.sensitivity ?? 3),
    max_requests: Number(s?.max_requests ?? 100),
    block_duration_minutes: Number(s?.block_duration_minutes ?? 60),
  }

  // كاش 15 ثانية (عدّلها حسب راحتك)
  cache = { value, expiresAt: now + 15_000 }
  return value
}
