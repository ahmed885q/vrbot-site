-- ============================================================
-- VRBOT: Enable Row Level Security (RLS) on all tables
-- Safe to run multiple times (idempotent)
-- ============================================================

-- =========================
-- Table: cloud_farms
-- =========================
ALTER TABLE cloud_farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own farms" ON cloud_farms;
DROP POLICY IF EXISTS "Users insert own farms" ON cloud_farms;
DROP POLICY IF EXISTS "Users update own farms" ON cloud_farms;
DROP POLICY IF EXISTS "Users delete own farms" ON cloud_farms;
DROP POLICY IF EXISTS "users see own farms" ON cloud_farms;

CREATE POLICY "users see own farms" ON cloud_farms
  FOR ALL USING (auth.uid() = user_id);

-- =========================
-- Table: farms
-- =========================
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own farms" ON farms;
DROP POLICY IF EXISTS "users see own farms" ON farms;

CREATE POLICY "users see own farms" ON farms
  FOR ALL USING (auth.uid() = user_id);

-- =========================
-- Table: farm_events
-- =========================
ALTER TABLE farm_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON farm_events;
DROP POLICY IF EXISTS "Users insert own events" ON farm_events;
DROP POLICY IF EXISTS "users see own events" ON farm_events;

CREATE POLICY "users see own events" ON farm_events
  FOR ALL USING (auth.uid() = user_id);

-- =========================
-- Table: license_keys
-- =========================
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own keys" ON license_keys;
DROP POLICY IF EXISTS "Users update own keys" ON license_keys;
DROP POLICY IF EXISTS "users see own keys" ON license_keys;

CREATE POLICY "users see own keys" ON license_keys
  FOR ALL USING (auth.uid()::text = used_by);

-- =========================
-- Table: vrbot_releases (public read)
-- =========================
ALTER TABLE vrbot_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read releases" ON vrbot_releases;

CREATE POLICY "public read releases" ON vrbot_releases
  FOR SELECT USING (true);
