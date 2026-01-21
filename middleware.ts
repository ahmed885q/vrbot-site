import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const pathname = req.nextUrl.pathname

  // ✅ مسارات تحتاج تسجيل دخول
  const protectedPaths = ['/dashboard', '/bot']
  const isProtectedPage = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  // ✅ API لازم تكون خاصة بالمستخدمين المسجلين
  const isProtectedApi =
    pathname.startsWith('/api/bot') ||
    pathname.startsWith('/api/subscription') ||
    pathname.startsWith('/api/stripe') // إذا ما زلت تستخدمه مؤقتاً
    // paypal حالياً placeholder، تقدر تحميه أو تخليه مفتوح حسب رغبتك:
    // || pathname.startsWith('/api/paypal')

  if (!isProtectedPage && !isProtectedApi) {
    return res
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ❌ غير مسجل
  if (!user) {
    // API يرجع 401 بدل تحويل
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // صفحات: تحويل للصفحة الرئيسية مع next
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

// مهم: لا تشغل middleware على كل شيء (خصوصاً assets)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bot/:path*',
    '/api/bot/:path*',
    '/api/subscription/:path*',
    '/api/stripe/:path*',
    // '/api/paypal/:path*', // فعّله إذا تبي PayPal API محمي
  ],
}
