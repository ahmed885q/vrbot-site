import { appendLog } from './logs'
import { startTasks, stopTasks } from './scheduler'
import { TASKS } from './tasks'

const runningBots = new Set<string>()

export async function startRunner(userId: string) {
  if (runningBots.has(userId)) return

  runningBots.add(userId)
  await appendLog(userId, 'info', 'Bot started')

  startTasks(userId, TASKS)
}

export async function stopRunner(userId: string) {
  if (!runningBots.has(userId)) return

  runningBots.delete(userId)
  stopTasks(userId)

  await appendLog(userId, 'info', 'Bot stopped')
}

export function isRunnerRunning(userId: string) {
  return runningBots.has(userId)
}
