import { BotTask, TaskContext } from './tasks/types'

const timers = new Map<string, NodeJS.Timeout[]>()

export function startTasks(userId: string, tasks: BotTask[]) {
  const ctx: TaskContext = { userId }

  const userTimers: NodeJS.Timeout[] = []

  for (const task of tasks) {
    const timer = setInterval(async () => {
      try {
        await task.run(ctx)
      } catch (err) {
        console.error(`Task ${task.id} failed`, err)
      }
    }, task.intervalMs)

    userTimers.push(timer)
  }

  timers.set(userId, userTimers)
}

export function stopTasks(userId: string) {
  const userTimers = timers.get(userId)
  if (!userTimers) return

  for (const timer of userTimers) {
    clearInterval(timer)
  }

  timers.delete(userId)
}
