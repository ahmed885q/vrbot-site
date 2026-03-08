-- Add cloud orchestrator columns to user_farms table
ALTER TABLE user_farms ADD COLUMN IF NOT EXISTS cloud_farm_id INTEGER;
ALTER TABLE user_farms ADD COLUMN IF NOT EXISTS cloud_customer_id TEXT;
ALTER TABLE user_farms ADD COLUMN IF NOT EXISTS cloud_job_id TEXT;
ALTER TABLE user_farms ADD COLUMN IF NOT EXISTS cloud_status TEXT DEFAULT 'local';

-- Index for looking up by cloud identifiers
CREATE INDEX IF NOT EXISTS idx_user_farms_cloud_farm_id ON user_farms(cloud_farm_id) WHERE cloud_farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_farms_cloud_customer_id ON user_farms(cloud_customer_id) WHERE cloud_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_farms_cloud_job_id ON user_farms(cloud_job_id) WHERE cloud_job_id IS NOT NULL;
