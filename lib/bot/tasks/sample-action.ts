import { BotTask } from './types'

export const sampleActionTask: BotTask = {
  id: 'sample-action',
  name: 'Sample Action',
  intervalMs: 10000,
  async run(ctx) {
    console.log(`[${ctx.userId}] sample action`)
  },
}
