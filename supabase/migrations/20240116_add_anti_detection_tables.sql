-- supabase/migrations/20240116_add_anti_detection_tables.sql
-- Clean + safe migration

BEGIN;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Anti-detection settings table
CREATE TABLE IF NOT EXISTS public.anti_detection_settings (
  id BIGSERIAL PRIMARY KEY,

  setting_key   TEXT NOT NULL UNIQUE,
  setting_name  TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  value_type    TEXT NOT NULL DEFAULT 'string',
  category      TEXT NOT NULL DEFAULT 'security',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_anti_detection_settings_category
  ON public.anti_detection_settings (category);

-- 2) Detection incidents table
CREATE TABLE IF NOT EXISTS public.detection_incidents (
  id BIGSERIAL PRIMARY KEY,

  incident_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- نخليه nullable لتفادي فشل الـ FK إذا جدول user_farms غير موجود
  farm_id UUID NULL,

  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',

  title TEXT NULL,
  description TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_detection_incidents_created_at
  ON public.detection_incidents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_detection_incidents_farm_id
  ON public.detection_incidents (farm_id);

-- 3) Add FK only if user_farms exists (اختياري وآمن)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema='public' AND table_name='user_farms'
  ) THEN
    -- Add FK if not already exists
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema='public'
        AND table_name='detection_incidents'
        AND constraint_name='fk_detection_incidents_farm_id'
    ) THEN
      ALTER TABLE public.detection_incidents
        ADD CONSTRAINT fk_detection_incidents_farm_id
        FOREIGN KEY (farm_id)
        REFERENCES public.user_farms(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 4) Seed default settings (Upsert)
INSERT INTO public.anti_detection_settings
  (setting_key, setting_name, setting_value, value_type, category)
VALUES
  ('enabled', 'Anti Detection Enabled', 'true', 'boolean', 'security'),
  ('behavior_score_threshold', 'Behavior Score Threshold', '70', 'number', 'security'),
  ('human_likeness_threshold', 'Human Likeness Threshold', '70', 'number', 'security'),
  ('rate_limit_mode', 'Rate Limit Mode', 'smart', 'string', 'security')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_name  = EXCLUDED.setting_name,
  setting_value = EXCLUDED.setting_value,
  value_type    = EXCLUDED.value_type,
  category      = EXCLUDED.category,
  updated_at    = now();


COMMIT;
