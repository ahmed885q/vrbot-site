-- Add new agent status values
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_status_check;
ALTER TABLE public.agents ADD CONSTRAINT agents_status_check
  CHECK (status IN ('online', 'offline', 'error', 'paused', 'unresponsive', 'fatal_error'));
