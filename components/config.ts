export const VIKING_RISE_CONFIG = {
  // إعدادات البوتات
  BOTS: {
    MAX_CONCURRENT: 5,
    AUTO_ROTATION: true,
    COOLDOWN_MINUTES: 30
  },
  
  // إعدادات الحماية
  PROTECTION: {
    STEALTH_MODE: true,
    HUMAN_SCORE_THRESHOLD: 80,
    RISK_ALERT_LEVEL: 30
  },
  
  // إعدادات البث
  STREAMING: {
    ENABLED: true,
    QUALITY: '720p',
    MAX_VIEWERS: 10
  },
  
  // إعدادات التقارير
  REPORTING: {
    AUTO_GENERATE: true,
    SAVE_TO_FILE: true,
    BACKUP_DAYS: 7
  }
};