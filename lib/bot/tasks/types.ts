// سياق تشغيل المهمة (يمرر لكل Task)
export type TaskContext = {
  userId: string
}

// عقد أي مهمة Bot (Task Contract)
export type BotTask = {
  // معرف فريد للمهمة
  id: string

  // اسم وصفي (للعرض / اللوج)
  name: string

  // كل كم ملي ثانية تعمل المهمة
  intervalMs: number

  // منطق التنفيذ
  run(ctx: TaskContext): Promise<void>
}
