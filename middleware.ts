import { NextRequest, NextResponse } from 'next/server'
import { validateSession, getUserRole } from '@/lib/session'


export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const session = await validateSession(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
