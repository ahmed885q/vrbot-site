import { validateSession } from '../session'

export async function canRunBot() {
  const session = await validateSession()

  return session.role === 'admin'
}
