import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // احمِ مسارات البوت فقط (عدّلها حسب مشروعك)
  if (!pathname.startsWith('/api/bot')) {
    return NextResponse.next()
  }

  // استدعاء داخلي لـ status
  const url = new URL('/api/subscription/status', req.url)
  const res = await fetch(url, {
    headers: {
      cookie: req.headers.get('cookie') || '',
    },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => null)
  const plan = data?.plan ?? 'free'

  if (plan !== 'pro') {
    return NextResponse.json(
      { error: 'Pro subscription required' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/bot/:path*'],
}
