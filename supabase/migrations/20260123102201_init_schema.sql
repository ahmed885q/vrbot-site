-- VRBOT schema (local + production ready)

-- Extensions
create extension if not exists "pgcrypto";

-- =========================
-- Farms
-- =========================
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  game_farm_id text,                 -- optional: ID داخل اللعبة
  level int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farms_user_id_idx on public.farms(user_id);

-- =========================
-- Devices (اختياري لكن مفيد)
-- =========================
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  device_fingerprint text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists devices_user_id_idx on public.devices(user_id);

-- =========================
-- Logs
-- =========================
create table if not exists public.logs (
  id bigserial primary key,
  user_id uuid not null,
  kind text not null,               -- info/warn/error/bot
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_user_id_created_idx on public.logs(user_id, created_at desc);

-- =========================
-- Transfers (إرسال الموارد)
-- =========================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'transfer_status') then
    create type public.transfer_status as enum ('queued','running','sent','canceled','failed');
  end if;
end $$;

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  target_name text,                 -- اسم اللاعب
  target_id text,                   -- ID اللاعب (إذا موجود)
  resource_type text not null,      -- wood/food/iron... حسب لعبتك
  amount bigint not null check (amount > 0),
  status public.transfer_status not null default 'queued',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transfers_user_id_idx on public.transfers(user_id);
create index if not exists transfers_farm_id_idx on public.transfers(farm_id);
create index if not exists transfers_status_idx on public.transfers(status);

-- =========================
-- Entitlements (Trial/Slots)
-- =========================
create table if not exists public.entitlements (
  user_id uuid primary key,
  plan text not null default 'free',       -- free/pro
  slots int not null default 1,
  status text not null default 'active',   -- active/blocked
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- updated_at trigger helper
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists farms_set_updated_at on public.farms;
create trigger farms_set_updated_at
before update on public.farms
for each row execute function public.set_updated_at();

drop trigger if exists transfers_set_updated_at on public.transfers;
create trigger transfers_set_updated_at
before update on public.transfers
for each row execute function public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

-- =========================
-- RLS
-- =========================
alter table public.farms enable row level security;
alter table public.devices enable row level security;
alter table public.logs enable row level security;
alter table public.transfers enable row level security;
alter table public.entitlements enable row level security;

-- Farms policies
drop policy if exists farms_select on public.farms;
create policy farms_select on public.farms
for select using (auth.uid() = user_id);

drop policy if exists farms_insert on public.farms;
create policy farms_insert on public.farms
for insert with check (auth.uid() = user_id);

drop policy if exists farms_update on public.farms;
create policy farms_update on public.farms
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists farms_delete on public.farms;
create policy farms_delete on public.farms
for delete using (auth.uid() = user_id);

-- Devices policies
drop policy if exists devices_all on public.devices;
create policy devices_all on public.devices
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Logs policies
drop policy if exists logs_all on public.logs;
create policy logs_all on public.logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transfers policies
drop policy if exists transfers_all on public.transfers;
create policy transfers_all on public.transfers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entitlements policies (صف واحد لكل مستخدم)
drop policy if exists entitlements_all on public.entitlements;
create policy entitlements_all on public.entitlements
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Migration لتوسيع جدول farms وإضافة Anti-Detection
-- ===================================================

-- 1. توسيع جدول farms بإضافة حقول Anti-Detection
ALTER TABLE public.farms 
ADD COLUMN IF NOT EXISTS bot_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bot_status text NOT NULL DEFAULT 'stopped' CHECK (bot_status IN ('stopped', 'running', 'paused', 'error')),
ADD COLUMN IF NOT EXISTS bot_settings jsonb NOT NULL DEFAULT '{
  "security": {
    "antiDetection": true,
    "randomDelays": true,
    "maxActionsPerHour": 180,
    "useProxy": false,
    "proxyAddress": "",
    "humanizeMouse": true,
    "avoidPatterns": true
  },
  "automation": {
    "autoFarm": true,
    "autoBuild": true,
    "autoResearch": true,
    "autoUpgrade": true,
    "targetLevel": 17,
    "priorityBuilding": "hall",
    "upgradeQueue": ["hall", "barracks", "farm", "hospital", "wall"]
  },
  "resources": {
    "gatherWood": true,
    "gatherFood": true,
    "gatherStone": true,
    "gatherGold": false,
    "autoCollect": true,
    "minResourceThreshold": 10000
  },
  "combat": {
    "huntMonsters": true,
    "monsterStrength": "weak",
    "autoJoinRallies": true,
    "supportAllies": true,
    "autoHeal": true,
    "crowdSupport": true,
    "troopPresets": ["attack1", "defense1", "gather1"]
  },
  "messaging": {
    "autoSendGifts": true,
    "giftMessage": "From your alliance friend!",
    "recipients": [],
    "checkMail": true,
    "replyToAlliance": true
  },
  "ai": {
    "enabled": true,
    "learningMode": true,
    "optimizeStrategy": true,
    "predictAttacks": true,
    "autoAdjust": true,
    "visionModel": "hybrid"
  },
  "scheduling": {
    "enabled": false,
    "startTime": "09:00",
    "endTime": "23:00",
    "pauseDuringEvents": true,
    "stopOnLowResources": true
  }
}'::jsonb,
ADD COLUMN IF NOT EXISTS last_bot_activity timestamptz,
ADD COLUMN IF NOT EXISTS actions_count int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_detection_check timestamptz;

-- 2. إنشاء جدول action_logs (تسجيل إجراءات البوت)
CREATE TABLE IF NOT EXISTS public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- click, gather, attack, upgrade, etc.
  coordinates jsonb, -- {x: 100, y: 200}
  delay_applied int NOT NULL DEFAULT 0, -- التأخير المطبق بالمللي ثانية
  security_applied boolean NOT NULL DEFAULT false,
  detection_risk int NOT NULL DEFAULT 0 CHECK (detection_risk >= 0 AND detection_risk <= 100),
  pattern_detected boolean NOT NULL DEFAULT false,
  via_proxy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهارس لجدول action_logs
CREATE INDEX IF NOT EXISTS action_logs_user_id_idx ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS action_logs_farm_id_idx ON public.action_logs(farm_id);
CREATE INDEX IF NOT EXISTS action_logs_created_at_idx ON public.action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS action_logs_action_type_idx ON public.action_logs(action_type);

-- 3. إنشاء جدول detection_patterns (أنماط الاكتشاف)
CREATE TABLE IF NOT EXISTS public.detection_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_type text NOT NULL, -- repetitive_actions, perfect_timing, etc.
  pattern_data jsonb NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS detection_patterns_user_id_idx ON public.detection_patterns(user_id);
CREATE INDEX IF NOT EXISTS detection_patterns_detected_at_idx ON public.detection_patterns(detected_at DESC);

-- 4. إنشاء جدول security_alerts (التنبيهات الأمنية)
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  alert_type text NOT NULL, -- rate_limit, pattern_detected, suspicious_activity
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message text NOT NULL,
  details jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS security_alerts_user_id_idx ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS security_alerts_farm_id_idx ON public.security_alerts(farm_id);
CREATE INDEX IF NOT EXISTS security_alerts_created_at_idx ON public.security_alerts(created_at DESC);

-- 5. إنشاء جدول proxy_settings (إعدادات البروكسي)
CREATE TABLE IF NOT EXISTS public.proxy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  proxy_url text NOT NULL,
  proxy_type text NOT NULL CHECK (proxy_type IN ('http', 'https', 'socks4', 'socks5')),
  username text,
  password text,
  is_active boolean NOT NULL DEFAULT true,
  last_used timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proxy_settings_user_id_idx ON public.proxy_settings(user_id);
CREATE INDEX IF NOT EXISTS proxy_settings_is_active_idx ON public.proxy_settings(is_active);

-- 6. توسيع جدول entitlements لإضافة إعدادات الأمان
ALTER TABLE public.entitlements 
ADD COLUMN IF NOT EXISTS bot_security_settings jsonb NOT NULL DEFAULT '{
  "antiDetection": true,
  "randomDelays": true,
  "maxActionsPerHour": 180,
  "useProxy": false,
  "proxyAddress": "",
  "humanizeMouse": true,
  "avoidPatterns": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS detection_score int NOT NULL DEFAULT 0 CHECK (detection_score >= 0 AND detection_score <= 100),
ADD COLUMN IF NOT EXISTS last_security_alert timestamptz;

-- 7. تمكين RLS للجداول الجديدة
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_settings ENABLE ROW LEVEL SECURITY;

-- 8. سياسات RLS للجداول الجديدة
-- action_logs
DROP POLICY IF EXISTS action_logs_all ON public.action_logs;
CREATE POLICY action_logs_all ON public.action_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- detection_patterns
DROP POLICY IF EXISTS detection_patterns_all ON public.detection_patterns;
CREATE POLICY detection_patterns_all ON public.detection_patterns
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- security_alerts
DROP POLICY IF EXISTS security_alerts_all ON public.security_alerts;
CREATE POLICY security_alerts_all ON public.security_alerts
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- proxy_settings
DROP POLICY IF EXISTS proxy_settings_all ON public.proxy_settings;
CREATE POLICY proxy_settings_all ON public.proxy_settings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. تحديث trigger لجدول farms
CREATE OR REPLACE FUNCTION public.handle_farms_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS farms_set_updated_at ON public.farms;
CREATE TRIGGER farms_set_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW EXECUTE FUNCTION public.handle_farms_update();

-- 10. إضافة trigger لـ security_alerts
CREATE OR REPLACE FUNCTION public.handle_security_alert_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS security_alerts_resolved ON public.security_alerts;
CREATE TRIGGER security_alerts_resolved
BEFORE UPDATE ON public.security_alerts
FOR EACH ROW EXECUTE FUNCTION public.handle_security_alert_resolved();

-- 11. وظيفة مساعدة للكشف عن الأنماط
CREATE OR REPLACE FUNCTION public.detect_suspicious_pattern(
  p_user_id uuid,
  p_farm_id uuid,
  p_action_type text
)
RETURNS TABLE (
  pattern_detected boolean,
  pattern_type text,
  severity text,
  details jsonb
) AS $$
DECLARE
  v_recent_actions text[];
  v_pattern record;
BEGIN
  -- جمع آخر 10 إجراءات
  SELECT array_agg(action_type ORDER BY created_at DESC)
  INTO v_recent_actions
  FROM public.action_logs
  WHERE user_id = p_user_id
    AND farm_id = p_farm_id
    AND created_at > now() - interval '1 hour'
  LIMIT 10;

  -- التحقق من الأنماط المتكررة
  IF array_length(v_recent_actions, 1) >= 3 THEN
    -- نمط: 3 إجراءات متتالية متطابقة
    IF v_recent_actions[1] = v_recent_actions[2] 
       AND v_recent_actions[2] = v_recent_actions[3] 
       AND v_recent_actions[1] = p_action_type THEN
      RETURN QUERY SELECT 
        true, 
        'repetitive_actions',
        'medium',
        jsonb_build_object(
          'pattern', v_recent_actions[1:3],
          'count', 3
        );
      RETURN;
    END IF;
  END IF;

  -- لا يوجد نمط مكتشف
  RETURN QUERY SELECT false, NULL, NULL, NULL;
END;
$$ LANGUAGE plpgsql;

-- 12. إضافة تعليقات للتوثيق
COMMENT ON TABLE public.action_logs IS 'تسجيل جميع إجراءات البوت لاكتشاف الأنماط المشبوهة';
COMMENT ON TABLE public.detection_patterns IS 'أنماط اكتشاف السلوك الآلي';
COMMENT ON TABLE public.security_alerts IS 'تنبيهات أمنية للمستخدمين';
COMMENT ON TABLE public.proxy_settings IS 'إعدادات البروكسي للمستخدمين';

COMMENT ON COLUMN public.farms.bot_enabled IS 'حالة تشغيل البوت للمزرعة';
COMMENT ON COLUMN public.farms.bot_status IS 'حالة البوت: stopped/running/paused/error';
COMMENT ON COLUMN public.farms.bot_settings IS 'إعدادات البوت الكاملة بما فيها Anti-Detection';
COMMENT ON COLUMN public.farms.last_bot_activity IS 'آخر نشاط للبوت';
COMMENT ON COLUMN public.farms.actions_count IS 'عدد الإجراءات المنفذة';
COMMENT ON COLUMN public.farms.last_detection_check IS 'آخر فحص لاكتشاف الأنماط';

-- 13. إنشاء عرض (view) للإحصائيات
CREATE OR REPLACE VIEW public.bot_security_stats AS
SELECT 
  f.user_id,
  f.id as farm_id,
  f.name as farm_name,
  f.bot_enabled,
  f.bot_status,
  f.actions_count,
  COUNT(al.id) as total_actions_last_hour,
  COUNT(CASE WHEN al.pattern_detected THEN 1 END) as patterns_detected,
  COUNT(sa.id) as security_alerts_count,
  MAX(sa.created_at) as last_alert_time
FROM public.farms f
LEFT JOIN public.action_logs al ON al.farm_id = f.id AND al.created_at > now() - interval '1 hour'
LEFT JOIN public.security_alerts sa ON sa.farm_id = f.id AND sa.resolved = false
GROUP BY f.id, f.user_id, f.name, f.bot_enabled, f.bot_status, f.actions_count;