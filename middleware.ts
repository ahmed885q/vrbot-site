import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ استثناء مسارات Stripe
  if (
    pathname.startsWith('/api/stripe') ||
    pathname.startsWith('/billing/success') ||
    pathname.startsWith('/billing/cancel') ||
    pathname.startsWith('/test-success')
  ) {
    return NextResponse.next()
  }

  // ⛔ باقي منطق الحماية (مثال)
  // const session = ...
  // if (!session) redirect

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
