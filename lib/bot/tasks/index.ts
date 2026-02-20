import { BotTask } from './types'
import { heartbeatTask } from './heartbeat'
import { sampleActionTask } from './sample-action'

export const TASKS: BotTask[] = [
  heartbeatTask,
  sampleActionTask,
]
