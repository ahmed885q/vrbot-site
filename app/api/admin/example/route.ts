import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await validateSession()

 return {
  user: {
    id: 'admin',
    role: 'admin',
  },
}
