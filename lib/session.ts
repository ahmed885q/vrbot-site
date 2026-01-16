export type Session = {
  userId: string
  role: 'admin' | 'user'
}

export async function validateSession(): Promise<Session> {
  // مؤقتًا Session ثابتة
  return {
    userId: 'admin',
    role: 'admin',
  }
}
