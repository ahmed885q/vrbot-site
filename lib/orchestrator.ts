// lib/orchestrator.ts
// Orchestrator client for farm management

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://65.109.214.187:8080";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "vrbot_webhook_secret_2026";

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
  name: string;
  container_name: string;
  port: number;
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

export async function getStatus(): Promise<SystemStatus> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/status");
  return res.json();
}

export async function getFarms(): Promise<{ farms: Farm[]; count: number }> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/farms");
  return res.json();
}

export async function getCustomers(): Promise<{ customers: Customer[]; count: number }> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/customers");
  return res.json();
}

export async function provisionFarms(params: {
  customerEmail: string;
  customerName: string;
  plan: string;
  farmCount: number;
  nifling?: boolean;
  orderId: string;
}): Promise<{ success: boolean; job_id: string; customer_id: string }> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/webhook/order", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET },
    body: JSON.stringify({
      event: "order.created",
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      plan: params.plan,
      farm_count: params.farmCount,
      nifling: params.nifling || false,
      order_id: params.orderId,
    }),
  });
  return res.json();
}

export async function getProvisionStatus(jobId: string): Promise<ProvisionJob> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/provision/" + jobId);
  return res.json();
}

export async function requestNifling(farmId: number, priority?: number): Promise<any> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/nifling", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ farm_id: farmId, priority: priority || 5 }),
  });
  return res.json();
}

export async function startScheduler(): Promise<any> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/scheduler/start", { method: "POST" });
  return res.json();
}

export async function stopScheduler(): Promise<any> {
  const res = await fetch(ORCHESTRATOR_URL + "/api/scheduler/stop", { method: "POST" });
  return res.json();
}
