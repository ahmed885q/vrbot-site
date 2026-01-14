import { BotTask } from './types'

export const heartbeatTask: BotTask = {
  id: 'heartbeat',
  name: 'Heartbeat',
  intervalMs: 5000,
  async run(ctx) {
    console.log(`[${ctx.userId}] heartbeat`)
  },
}
