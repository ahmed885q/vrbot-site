import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ====== الصفحات المحمية (تحتاج تسجيل دخول) ======
const PROTECTED_ROUTES = [
  '/dashboard',
  '/farms',
  '/billing',
  '/viking-rise',
  '/admin',
]

// ====== الصفحات العامة (مفتوحة للجميع) ======
// / (الرئيسية), /login, /signup, /download, /pricing, /api/...

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

function isExcluded(pathname: string) {
  if (pathname.startsWith('/_next')) return true
  if (pathname.startsWith('/favicon')) return true
  if (pathname.startsWith('/robots.txt')) return true
  if (pathname.startsWith('/sitemap')) return true
  if (pathname.startsWith('/assets')) return true
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2)$/.test(pathname)) return true
  if (pathname.startsWith('/api/auth')) return true
  if (pathname.startsWith('/api/stripe/webhook')) return true
  if (pathname.startsWith('/api/billing/paypal-success')) return true
  return false
}

function getIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '0.0.0.0'
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // استثناء الملفات الثابتة و API callbacks
  if (isExcluded(pathname)) return NextResponse.next()

  // ====== Auth Guard: حماية الصفحات المحمية ======
  if (isProtectedRoute(pathname)) {
    // تحقق من وجود Supabase session cookie
    const supabaseAuthToken = req.cookies.get('sb-xmanyfpojzkjlwatkrcc-auth-token')?.value
      || req.cookies.get('sb-xmanyfpojzkjlwatkrcc-auth-token.0')?.value

    if (!supabaseAuthToken) {
      // لا يوجد جلسة → حوّل لصفحة تسجيل الدخول
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ====== Rate Limiting (اختياري) ======
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const ip = getIp(req)
      const { data, error } = await supabase.rpc('vrbot_check_request', { p_ip: ip })

      if (!error && data && data.allowed === false) {
        return new NextResponse(
          `Too Many Requests. Try again later.\nBlocked until: ${data.blocked_until ?? ''}`,
          { status: 429 }
        )
      }
    }
  } catch {
    // لا نكسر الموقع لو صار خطأ
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)',
  ],
}
