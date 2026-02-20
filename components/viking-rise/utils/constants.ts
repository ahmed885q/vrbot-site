export const VIKING_RISE_CONFIG = {
  GAME_NAME: 'Viking Rise',
  SUPPORTED_WINDOW_PATTERNS: [
    'Viking Rise',
    'LDPlayer',
    'BlueStacks',
    'NoxPlayer',
    'MEmu',
    'MuMu',
    'GameLoop'
  ],
  
  SCREEN_RESOLUTIONS: {
    MOBILE: { width: 1080, height: 2400 },
    TABLET: { width: 1600, height: 2560 },
    DESKTOP: { width: 1920, height: 1080 }
  },
  
  TAP_POSITIONS: {
    SHIELD: { x: 800, y: 1800 },
    HELPS: { x: 540, y: 800 },
    CASTLE: { x: 540, y: 1200 },
    CONFIRM: { x: 540, y: 2200 },
    RESOURCES: { x: 900, y: 100 }
  },
  
  TASK_INTERVALS: {
    SHIELD: 6 * 60 * 60 * 1000, // 6 ساعات
    HELPS: 2 * 60 * 60 * 1000,  // ساعتين
    COLLECTION: 60 * 60 * 1000,  // ساعة
    MAINTENANCE: 24 * 60 * 60 * 1000 // يوم
  },
  
  BEHAVIOR_SETTINGS: {
    MIN_DELAY: 800,
    MAX_DELAY: 2200,
    HUMAN_ERROR_RATE: 0.03,
    MOUSE_VARIANCE: 15,
    SWIPE_DURATION: 1000
  }
}