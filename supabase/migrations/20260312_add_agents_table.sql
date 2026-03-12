-- ═══════════════════════════════════════════════════════════
-- Agent Registry — persistent tracking of connected agents
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,             -- from hub_client (e.g., "agent-default")
  device_id text,                     -- hostname or container name
  status text NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'offline', 'error', 'paused')),

  -- Live state from BotStateManager
  bot_state text DEFAULT 'STOPPED',   -- RUNNING, PAUSED, ERROR_RECOVERY, etc.
  current_task text DEFAULT '',
  cycle int DEFAULT 0,
  total_ok int DEFAULT 0,
  total_fail int DEFAULT 0,
  total_skip int DEFAULT 0,
  uptime_seconds int DEFAULT 0,
  game_restarts int DEFAULT 0,
  captchas_detected int DEFAULT 0,
  last_error text DEFAULT '',

  -- Connection tracking
  ip_address text,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_heartbeat timestamptz,
  last_seen timestamptz DEFAULT now(),

  -- Config
  config jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique: one agent per user+agent_id combo
  UNIQUE(user_id, agent_id)
);

CREATE INDEX IF NOT EXISTS agents_user_id_idx ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS agents_status_idx ON public.agents(status);
CREATE INDEX IF NOT EXISTS agents_last_seen_idx ON public.agents(last_seen DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS agents_set_updated_at ON public.agents;
CREATE TRIGGER agents_set_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agents_select ON public.agents;
CREATE POLICY agents_select ON public.agents
FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update (from API routes)
DROP POLICY IF EXISTS agents_service ON public.agents;
CREATE POLICY agents_service ON public.agents
FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Agent Tokens — secure auth for WebSocket connections
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,         -- generated secure token
  label text DEFAULT 'default',       -- human-readable label
  is_active boolean NOT NULL DEFAULT true,
  last_used timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz              -- optional expiry
);

CREATE INDEX IF NOT EXISTS agent_tokens_token_idx ON public.agent_tokens(token);
CREATE INDEX IF NOT EXISTS agent_tokens_user_id_idx ON public.agent_tokens(user_id);

ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_tokens_all ON public.agent_tokens;
CREATE POLICY agent_tokens_all ON public.agent_tokens
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role policy for token verification
DROP POLICY IF EXISTS agent_tokens_service ON public.agent_tokens;
CREATE POLICY agent_tokens_service ON public.agent_tokens
FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════
-- Helper: Verify agent token and return user_id
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.verify_agent_token(p_token text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.agent_tokens
  WHERE token = p_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF v_user_id IS NOT NULL THEN
    UPDATE public.agent_tokens
    SET last_used = now()
    WHERE token = p_token;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- Helper: Upsert agent status (called from API/Hub)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.upsert_agent_status(
  p_user_id uuid,
  p_agent_id text,
  p_device_id text DEFAULT NULL,
  p_status text DEFAULT 'online',
  p_bot_state text DEFAULT NULL,
  p_current_task text DEFAULT NULL,
  p_cycle int DEFAULT NULL,
  p_total_ok int DEFAULT NULL,
  p_total_fail int DEFAULT NULL,
  p_total_skip int DEFAULT NULL,
  p_uptime_seconds int DEFAULT NULL,
  p_game_restarts int DEFAULT NULL,
  p_captchas_detected int DEFAULT NULL,
  p_last_error text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.agents (
    user_id, agent_id, device_id, status,
    bot_state, current_task, cycle, total_ok, total_fail, total_skip,
    uptime_seconds, game_restarts, captchas_detected, last_error,
    ip_address, connected_at, last_heartbeat, last_seen
  ) VALUES (
    p_user_id, p_agent_id, p_device_id, p_status,
    COALESCE(p_bot_state, 'STOPPED'),
    COALESCE(p_current_task, ''),
    COALESCE(p_cycle, 0),
    COALESCE(p_total_ok, 0),
    COALESCE(p_total_fail, 0),
    COALESCE(p_total_skip, 0),
    COALESCE(p_uptime_seconds, 0),
    COALESCE(p_game_restarts, 0),
    COALESCE(p_captchas_detected, 0),
    COALESCE(p_last_error, ''),
    p_ip_address,
    CASE WHEN p_status = 'online' THEN now() ELSE NULL END,
    now(), now()
  )
  ON CONFLICT (user_id, agent_id) DO UPDATE SET
    device_id = COALESCE(EXCLUDED.device_id, agents.device_id),
    status = EXCLUDED.status,
    bot_state = COALESCE(EXCLUDED.bot_state, agents.bot_state),
    current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
    cycle = COALESCE(EXCLUDED.cycle, agents.cycle),
    total_ok = COALESCE(EXCLUDED.total_ok, agents.total_ok),
    total_fail = COALESCE(EXCLUDED.total_fail, agents.total_fail),
    total_skip = COALESCE(EXCLUDED.total_skip, agents.total_skip),
    uptime_seconds = COALESCE(EXCLUDED.uptime_seconds, agents.uptime_seconds),
    game_restarts = COALESCE(EXCLUDED.game_restarts, agents.game_restarts),
    captchas_detected = COALESCE(EXCLUDED.captchas_detected, agents.captchas_detected),
    last_error = COALESCE(EXCLUDED.last_error, agents.last_error),
    ip_address = COALESCE(EXCLUDED.ip_address, agents.ip_address),
    connected_at = CASE WHEN EXCLUDED.status = 'online' AND agents.status != 'online'
                        THEN now() ELSE agents.connected_at END,
    disconnected_at = CASE WHEN EXCLUDED.status = 'offline' THEN now()
                           ELSE agents.disconnected_at END,
    last_heartbeat = now(),
    last_seen = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.agents IS 'Persistent registry of bot agents with live status';
COMMENT ON TABLE public.agent_tokens IS 'Secure authentication tokens for agent WebSocket connections';
