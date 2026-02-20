export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    // تحقق بسيط مؤقت (بدون قاعدة بيانات)
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // ✅ نجاح تسجيل الدخول (مؤقت)
    return NextResponse.json({
      success: true,
      message: 'Login successful (temporary)',
      user: {
        email,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 500 }
    )
  }
}
