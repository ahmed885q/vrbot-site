-- ===============================
-- Anti Detection Settings (FINAL)
-- ===============================

CREATE TABLE IF NOT EXISTS public.anti_detection_settings (
  id SERIAL PRIMARY KEY,
  setting_name TEXT NOT NULL,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  value_type TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.anti_detection_settings
(setting_name, setting_key, setting_value, value_type, category)
VALUES
  ('system_enabled', 'system_enabled', 'true', 'boolean', 'general'),
  ('behavior_score_threshold', 'behavior_score_threshold', '70', 'number', 'security'),
  ('human_likeness_threshold', 'human_likeness_threshold', '75', 'number', 'security'),
  ('rate_limit_mode', 'rate_limit_mode', 'smart', 'string', 'security')
ON CONFLICT (setting_key)
DO UPDATE SET
  setting_name  = EXCLUDED.setting_name,
  setting_value = EXCLUDED.setting_value,
  value_type    = EXCLUDED.value_type,
  category      = EXCLUDED.category,
  updated_at    = now();
