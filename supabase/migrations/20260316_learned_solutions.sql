-- Smart Retry: learned_solutions table
-- Stores AI-discovered solutions for task failures

CREATE TABLE IF NOT EXISTS learned_solutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name text NOT NULL,
  screen_hash text NOT NULL,
  action_name text NOT NULL,
  action_params jsonb DEFAULT '{}'::jsonb,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  source text DEFAULT 'local',
  last_used timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_name, screen_hash)
);

ALTER TABLE learned_solutions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for sync from server)
CREATE POLICY "service_role_full" ON learned_solutions
  FOR ALL USING (true) WITH CHECK (true);

-- Authenticated users can read
CREATE POLICY "authenticated_read" ON learned_solutions
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learned_solutions_task ON learned_solutions(task_name);
CREATE INDEX IF NOT EXISTS idx_learned_solutions_source ON learned_solutions(source);
