import { cookies } from 'next/headers'

export async function createSession(token: string) {
  const cookieStore = cookies()

  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}
