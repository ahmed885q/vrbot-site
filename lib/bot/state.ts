export type BotState = 'idle' | 'running' | 'stopped'

const stateStore = new Map<string, BotState>()

export async function setBotState(userId: string, state: BotState) {
  stateStore.set(userId, state)
}

export async function getBotState(userId: string): Promise<BotState> {
  return stateStore.get(userId) ?? 'idle'
}