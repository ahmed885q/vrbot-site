import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateSession } from './lib/session'

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const session = await validateSession()

  if (session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}
