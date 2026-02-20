import { canRunBot } from './policy'

export async function startBot()
 {
  const allowed = await canRunBot()

  if (!allowed) {
    throw new Error('BOT_NOT_ALLOWED')
  }

  // هنا منطق تشغيل البوت لاحقًا
}
