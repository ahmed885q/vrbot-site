import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()

  const url = new URL('/login', req.url)
  return NextResponse.redirect(url)
}
