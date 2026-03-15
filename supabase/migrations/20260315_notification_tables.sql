-- ⚔️ VRBOT — Notification Tables Migration
-- Run in Supabase Dashboard → SQL Editor

-- جدول تفضيلات الإشعارات
CREATE TABLE IF NOT EXISTS notification_prefs (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  web_push           BOOLEAN DEFAULT false,
  email_alerts       BOOLEAN DEFAULT true,
  telegram_chat_id   TEXT DEFAULT '',
  alert_on_offline   BOOLEAN DEFAULT true,
  alert_on_crash     BOOLEAN DEFAULT true,
  alert_on_recovery  BOOLEAN DEFAULT true,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- جدول سجل التنبيهات
CREATE TABLE IF NOT EXISTS farm_alerts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id     TEXT NOT NULL,
  alert_type  TEXT NOT NULL,
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_alerts         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_prefs"   ON notification_prefs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_own_alerts"  ON farm_alerts         FOR ALL USING (auth.uid() = user_id);
