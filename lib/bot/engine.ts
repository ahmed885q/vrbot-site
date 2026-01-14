import { canRunBot } from './policy'
import { startRunner, stopRunner } from './runner'

export async function startBot(userId: string) {
  const allowed = await canRunBot(userId)
  if (!allowed) {
    throw new Error('BOT_NOT_ALLOWED')
  }

  startRunner(userId)
  return { status: 'running' }
}

export async function stopBot(userId: string) {
  stopRunner(userId)
  return { status: 'stopped' }
}
