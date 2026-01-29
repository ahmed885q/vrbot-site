import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '0.0.0.0'
}

function isExcluded(pathname: string) {
  // استثناءات “لازم”
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/favicon')) return true
  if (pathname.startsWith('/robots.txt')) return true
  if (pathname.startsWith('/sitemap')) return true
  if (pathname.startsWith('/assets')) return true

  // ملفات ثابتة شائعة
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2)$/.test(pathname))
    return true

  // استثناءات حسب مشروعك (مهم)
  if (pathname.startsWith('/api/auth')) return true // لو عندك auth callbacks
  if (pathname.startsWith('/api/stripe/webhook')) return true // لو عندك Stripe webhook

  return false
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (isExcluded(pathname)) return NextResponse.next()

  const ip = getIp(req)

  const { data, error } = await supabase.rpc('vrbot_check_request', { p_ip: ip })

  // لو صار خطأ بالاتصال — لا نكسر الموقع
  if (error || !data) return NextResponse.next()

  if (data.allowed === false) {
    // صفحة حظر بسيطة (بدون redirect loops)
    return new NextResponse(
      `Too Many Requests. Try again later.\nBlocked until: ${data.blocked_until ?? ''}`,
      { status: 429 }
    )
  }

  return NextResponse.next()
}

// ✅ يطبق على كل شيء “ما عدا” assets / _next / ملفات ثابتة (بالـ regex)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)',
  ],
}
