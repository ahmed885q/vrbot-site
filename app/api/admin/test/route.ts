import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'


export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  // 1️⃣ تحقق من الجلسة
  const session = await validateSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2️⃣ تحقق من الدور
  if (session.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  // 3️⃣ منطق الـ API (مثال)
  return NextResponse.json({
    success: true,
    message: 'Welcome Admin',
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
  })
}
