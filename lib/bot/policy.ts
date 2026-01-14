import { getUserRole } from '../session'

export async function canRunBot(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin'
}
