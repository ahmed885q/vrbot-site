// lib/orchestrator.ts
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "https://cloud.vrbot.me";
const API_KEY = process.env.VRBOT_API_KEY || "vrbot_admin_2026";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SystemStatus {
  total_farms: number;
  enabled_farms: number;
  idle_farms: number;
  running_farms: number;
  error_farms: number;
  farming_due: number;
  daily_due: number;
  nifling_queued: number;
  total_tasks_today: number;
  running: boolean;
  total_customers: number;
  active_customers: number;
}

export interface Farm {
  farm_id: number;
  customer_id: string;
  status: string;
}

export interface Customer {
  customer_id: string;
  email: string;
  name: string;
  plan: string;
  max_farms: number;
  nifling_enabled: number;
  api_key: string;
  status: string;
  current_farms: number;
}

export interface ProvisionJob {
  job_id: string;
  customer_id: string;
  farm_count: number;
  status: string;
  farms_created: number;
  farms_ready: number;
  error_message: string;
}

export interface BatchStatus {
  cycle_id: string;
  current_batch: number;
  total_batches: number;
  farms_in_batch: number;
  batch_start_time: string;
  batch_elapsed_seconds: number;
  batch_timeout_seconds: number;
  cycle_start_time: string;
  cycle_type: 'farming' | 'daily' | 'nifling';
  status: 'running' | 'paused' | 'idle' | 'error';
  progress_percent: number;
  farms_completed: number;
  farms_failed: number;
  next_cycle_at: string;
}

export interface NiflingRequest {
  request_id: string;
  farm_id: number;
  customer_id: string;
  customer_email: string;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface NiflingStats {
  queued: number;
  running: number;
  completed_today: number;
  failed_today: number;
  avg_wait_seconds: number;
  avg_duration_seconds: number;
}

export interface Server {
  server_id: string;
  name: string;
  ip: string;
  type: string;
  status: 'active' | 'provisioning' | 'draining' | 'error' | 'offline';
  total_slots: number;
  used_slots: number;
  farms: number[];
  cpu_percent: number;
  memory_percent: number;
  monthly_cost: number;
  created_at: string;
  region: string;
}

export interface ScalerStatus {
  mode: 'AUTO' | 'NOTIFY' | 'MANUAL';
  running: boolean;
  total_servers: number;
  total_capacity: number;
  used_capacity: number;
  utilization_percent: number;
  monthly_budget: number;
  monthly_cost: number;
  pending_alerts: number;
  last_scale_action: string | null;
  last_scale_time: string | null;
  thresholds: {
    scale_up_percent: number;
    scale_down_percent: number;
    min_servers: number;
    max_servers: number;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details: Record<string, any> | null;
  farm_id: number | null;
  customer_id: string | null;
}

export interface LogFilter {
  level?: string;
  source?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  farm_id?: number;
  customer_id?: string;
  page?: number;
  per_page?: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function orchFetch(path: string, options?: RequestInit) {
  const res = await fetch(ORCHESTRATOR_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Orchestrator error: ${res.status}`);
  return res.json();
}

// ─── Status: map new API format → SystemStatus ────────────────────────────────

export async function getStatus(): Promise<SystemStatus> {
  const raw = await orchFetch("/api/status");

  // raw.scheduler = { total_farms, active_tasks, farming_queue, daily_queue, nifling_queue, error_rate }
  // raw.schedules  = { total_customers, customers: {...} }
  const s   = raw.scheduler  || {};
  const sc  = raw.schedules  || {};
  const nif = raw.nifling    || {};

  // حساب total_tasks_today من master_scheduler log عبر endpoint مخصص
  let tasks_today = 0;
  try {
    const tr = await orchFetch("/api/tasks/today");
    tasks_today = tr.total ?? 0;
  } catch { /* endpoint قد يكون غير موجود */ }

  return {
    total_farms:       s.total_farms        ?? 0,
    enabled_farms:     s.total_farms        ?? 0,
    idle_farms:        (s.total_farms ?? 0) - (s.active_tasks ?? 0),
    running_farms:     s.active_tasks       ?? 0,
    error_farms:       0,
    farming_due:       s.farming_queue      ?? 0,
    daily_due:         s.daily_queue        ?? 0,
    nifling_queued:    nif.queue_length     ?? s.nifling_queue ?? 0,
    total_tasks_today: tasks_today,
    running:           (s.active_tasks ?? 0) > 0,
    total_customers:   sc.total_customers   ?? 1,
    active_customers:  sc.total_customers   ?? 1,
  };
}

// ─── Other Functions ──────────────────────────────────────────────────────────

export async function getFarms(): Promise<{ farms: Farm[]; count: number }> {
  return orchFetch("/api/batch/farms");
}

export async function getCustomers(): Promise<{ customers: Customer[]; count: number }> {
  return orchFetch("/api/customers");
}

export async function provisionFarms(params: {
  customerEmail: string;
  customerName: string;
  plan: string;
  farmCount: number;
  nifling?: boolean;
  orderId: string;
  agentUserId?: string;
  agentToken?: string;
  agentId?: string;
}): Promise<{ success: boolean; job_id: string; customer_id: string }> {
  return orchFetch("/api/webhook/order", {
    method: "POST",
    body: JSON.stringify({
      event: "order.created",
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      plan: params.plan,
      farm_count: params.farmCount,
      nifling: params.nifling || false,
      order_id: params.orderId,
      ...(params.agentUserId ? {
        agent_user_id: params.agentUserId,
        agent_token: params.agentToken,
        agent_id: params.agentId,
      } : {}),
    }),
  });
}

export async function getProvisionStatus(jobId: string): Promise<ProvisionJob> {
  return orchFetch("/api/provision/" + jobId);
}

export async function requestNifling(farmId: number, priority?: number): Promise<any> {
  return orchFetch("/api/nifling", {
    method: "POST",
    body: JSON.stringify({ farm_id: farmId, priority: priority || 5 }),
  });
}

export async function startScheduler(): Promise<any> {
  return orchFetch("/api/scheduler/start", { method: "POST" });
}

export async function stopScheduler(): Promise<any> {
  return orchFetch("/api/scheduler/stop", { method: "POST" });
}

export async function getBatchStatus(): Promise<BatchStatus> {
  return orchFetch("/api/batch/current");
}

export async function getBatchHistory(limit: number = 20): Promise<BatchStatus[]> {
  return orchFetch(`/api/batch/history?limit=${limit}`);
}

export async function getNiflingQueue(): Promise<{ requests: NiflingRequest[]; stats: NiflingStats }> {
  return orchFetch("/api/nifling/queue");
}

export async function cancelNifling(requestId: string): Promise<any> {
  return orchFetch(`/api/nifling/${requestId}/cancel`, { method: "POST" });
}

export async function setNiflingPriority(requestId: string, priority: number): Promise<any> {
  return orchFetch(`/api/nifling/${requestId}/priority`, {
    method: "PUT",
    body: JSON.stringify({ priority }),
  });
}

export async function getScalerStatus(): Promise<ScalerStatus> {
  return orchFetch("/api/scaler/status");
}

export async function setScalerMode(mode: 'AUTO' | 'NOTIFY' | 'MANUAL'): Promise<any> {
  return orchFetch("/api/scaler/mode", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}

export async function getServers(): Promise<{ servers: Server[]; count: number }> {
  return orchFetch("/api/servers");
}

export async function provisionServer(serverType: string, region: string): Promise<any> {
  return orchFetch("/api/servers/provision", {
    method: "POST",
    body: JSON.stringify({ server_type: serverType, region }),
  });
}

export async function drainServer(serverId: string): Promise<any> {
  return orchFetch(`/api/servers/${serverId}/drain`, { method: "POST" });
}

export async function setScalerBudget(budget: number): Promise<any> {
  return orchFetch("/api/scaler/budget", {
    method: "PUT",
    body: JSON.stringify({ monthly_budget: budget }),
  });
}

export async function getLogs(filter?: LogFilter): Promise<{ logs: LogEntry[]; total: number; page: number; per_page: number }> {
  const params = new URLSearchParams();
  if (filter) {
    Object.entries(filter).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    });
  }
  const query = params.toString();
  return orchFetch(`/api/logs${query ? '?' + query : ''}`);
}

export async function getLogSources(): Promise<string[]> {
  return orchFetch("/api/logs/sources");
}
