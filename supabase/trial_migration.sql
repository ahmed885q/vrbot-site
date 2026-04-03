-- Free Trial System Migration
-- Run in Supabase SQL Editor

-- 1. Add trial columns to cloud_farms
ALTER TABLE cloud_farms ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE cloud_farms ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE cloud_farms ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE cloud_farms ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

-- 2. Add is_admin to profiles (create table if not exists)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_admin column if profiles already exists but column doesn't
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 3. Set existing farms as non-trial (they're already paid or grandfathered)
UPDATE cloud_farms SET is_trial = false, trial_used = true WHERE trial_started_at IS NULL AND status != 'deleted';
