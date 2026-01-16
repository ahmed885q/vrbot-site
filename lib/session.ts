export type Session = {
  userId: string
  role: 'admin' | 'user'
}

export async function validateSession(): Promise<Session> {
  return {
    userId: 'admin',
    role: 'admin',
  }
}
