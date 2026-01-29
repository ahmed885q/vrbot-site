import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Settings = {
  enabled: boolean
  sensitivity: number
  max_requests: number
  block_duration_minutes: number
  setting_key: string
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ هنا آمن لأنه داخل Route (Node runtime)
)

// كاش بسيط يقلل الضغط على DB
let cached: { v: Settings; at: number } | null = null
const TTL_MS = 10_000

async function getSettings(): Promise<Settings> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.v

  const { data, error } = await supabaseAdmin
    .from('anti_detection_settings')
    .select('*')
    .eq('setting_key', 'global')
    .maybeSingle()

  if (error) {
    // لو صار خطأ نرجّع defaults بدل ما نكسر الـ API
    const fallback: Settings = {
      setting_key: 'global',
      enabled: true,
      sensitivity: 3,
      max_requests: 100,
      block_duration_minutes: 60,
    }
    cached = { v: fallback, at: Date.now() }
    return fallback
  }

  const v: Settings =
    data ?? {
      setting_key: 'global',
      enabled: true,
      sensitivity: 3,
      max_requests: 100,
      block_duration_minutes: 60,
    }

  cached = { v, at: Date.now() }
  return v
}

function getIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// (مرحلة 1) فقط تفعيل/تعطيل
// (مرحلة 2) نضيف rate limit فعلي
export async function protectApi(req: NextRequest) {
  const s = await getSettings()
  if (!s.enabled) return null

  // استثناءات اختيارية (لو عندك webhooks أو auth callbacks)
  const pathname = new URL(req.url).pathname
  if (pathname.startsWith('/api/auth')) return null
  if (pathname.startsWith('/api/webhooks')) return null

  // حاليا: لا نمنع، بس نجهّز للخطوة التالية (Rate limit)
  // تقدر هنا تسجل ip أو تضيف منطق منع لاحقاً
  const ip = getIp(req)
  void ip

  return null
}

// helper: لو رجع Response معناها blocked
export function blocked(message: string, status = 429) {
  return NextResponse.json({ error: message }, { status })
}
