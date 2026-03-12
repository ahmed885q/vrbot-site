import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'

export async function GET() {
  const result = await requireAdmin()
  if (result.ok) {
    return NextResponse.json({ isAdmin: true })
  }
  return NextResponse.json({ isAdmin: false })
}
