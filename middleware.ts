import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/billing',
  '/admin',
]

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
  if (pathname.startsWith('/auth/')) return true
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

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // API versioning: /api/v1/* â†’ /api/*
  // This allows /api/v1/farms/list to work same as /api/farms/list
  if (pathname.startsWith("/api/v1/")) {
    const newPath = pathname.replace("/api/v1/", "/api/");
    const url = req.nextUrl.clone();
    url.pathname = newPath;
    const res = NextResponse.rewrite(url);
    res.headers.set("X-API-Version", "v1");
    return res;
  }

  if (isExcluded(pathname)) return NextResponse.next()

  if (isProtectedRoute(pathname)) {
    const supabaseAuthToken =
      req.cookies.get('sb-xmanyfpojzkjlwatkrcc-auth-token')?.value ||
      req.cookies.get('sb-xmanyfpojzkjlwatkrcc-auth-token.0')?.value

    if (!supabaseAuthToken) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin route protection: verify user is admin by email
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      try {
        const res = NextResponse.next()
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() { return req.cookies.getAll() },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  res.cookies.set(name, value, options)
                })
              },
            },
          }
        )
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user) {
          return NextResponse.redirect(new URL('/login', req.url))
        }
        const admins = getAdminEmails()
        const isAdmin = !!user.email && admins.includes(user.email.toLowerCase())
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
        return res
      } catch {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

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
  } catch {}

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|assets).*)',
  ],
}

