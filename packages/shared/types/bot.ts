// أنواع إجراءات البوت
export type BotAction = 
  | 'click'
  | 'type'
  | 'scroll'
  | 'navigate'
  | 'collect'
  | 'upgrade'
  | 'train'
  | 'attack'
  | 'gather'
  | 'heal'
  | 'send_gift'
  | 'check_mail'
  | 'join_rally'
  | 'support_ally'
  | 'research'
  | 'build'

// حالة البوت
export type BotStatus = 
  | 'stopped'
  | 'running'
  | 'paused'
  | 'error'
  | 'maintenance'

// مستوى سجل الأحداث
export type LogLevel = 
  | 'debug'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'critical'

// قوة الوحوش
export type MonsterStrength = 
  | 'weak'
  | 'medium'
  | 'strong'
  | 'elite'
  | 'boss'

// نوع المورد
export type ResourceType = 
  | 'wood'
  | 'food'
  | 'stone'
  | 'gold'
  | 'gems'
  | 'speedups'

// نوع المبنى
export type BuildingType = 
  | 'hall'
  | 'barracks'
  | 'hospital'
  | 'wall'
  | 'farm'
  | 'lumber_mill'
  | 'quarry'
  | 'mine'
  | 'market'
  | 'academy'
  | 'warehouse'
  | 'watchtower'

// نوع القوات
export type TroopType = 
  | 'infantry'
  | 'cavalry'
  | 'archers'
  | 'siege'
  | 'gatherers'
  | 'defenders'

// نموذج الذكاء الاصطناعي
export type AIModel = 
  | 'yolo'
  | 'custom'
  | 'hybrid'
  | 'openai'
  | 'anthropic'
  | 'local'