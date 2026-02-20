export const dynamic = "force-dynamic";
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  cookies().set({
    name: 'admin_session',
    value: '',
    maxAge: 0,
    path: '/',
  })

  return NextResponse.json({ success: true })
}
