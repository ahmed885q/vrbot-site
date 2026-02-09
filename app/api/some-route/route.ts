export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from 'next/server'
import { protectApi } from '@/lib/protection/api-guard'

export async function GET(req: NextRequest) {
  const deny = await protectApi(req)
  if (deny) return deny

  return NextResponse.json({ ok: true })
}
