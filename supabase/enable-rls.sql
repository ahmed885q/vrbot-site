-- ============================================================
-- VRBOT: Enable Row Level Security (RLS) on all user tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- 1. cloud_farms — users can only see/modify their own farms
ALTER TABLE public.cloud_farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own farms" ON public.cloud_farms;
CREATE POLICY "Users see own farms" ON public.cloud_farms
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own farms" ON public.cloud_farms;
CREATE POLICY "Users insert own farms" ON public.cloud_farms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own farms" ON public.cloud_farms;
CREATE POLICY "Users update own farms" ON public.cloud_farms
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own farms" ON public.cloud_farms;
CREATE POLICY "Users delete own farms" ON public.cloud_farms
  FOR DELETE USING (auth.uid() = user_id);

-- Service role (used by API routes) bypasses RLS automatically

-- 2. farm_events — users can only see their own events
ALTER TABLE public.farm_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON public.farm_events;
CREATE POLICY "Users see own events" ON public.farm_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own events" ON public.farm_events;
CREATE POLICY "Users insert own events" ON public.farm_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. license_keys — users can only see keys they used
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own keys" ON public.license_keys;
CREATE POLICY "Users see own keys" ON public.license_keys
  FOR SELECT USING (auth.uid()::text = used_by);

DROP POLICY IF EXISTS "Users update own keys" ON public.license_keys;
CREATE POLICY "Users update own keys" ON public.license_keys
  FOR UPDATE USING (auth.uid()::text = used_by);

-- ============================================================
-- VERIFICATION: Run after applying to confirm RLS is active
-- ============================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('cloud_farms', 'farm_events', 'license_keys');
-- Expected: all rows show rowsecurity = true
