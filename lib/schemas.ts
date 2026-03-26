// lib/schemas.ts
import { z } from "zod";

// ── Farms ──────────────────────────────────────────────
export const FarmIdSchema = z.object({
  farm_id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/, "Invalid farm_id"),
});

export const AdbCommandSchema = z.object({
  farm_id: z.string().min(1).max(50),
  command: z.string().min(1).max(200).regex(
    /^(tap:\d+,\d+|swipe:\d+,\d+,\d+,\d+|key:[A-Z_]+|text:.+)$/,
    "Invalid ADB command format"
  ),
});

export const RunTasksSchema = z.object({
  farm_id: z.string().min(1).max(50),
  tasks: z.array(z.string().min(1).max(100)).min(1).max(50),
  action: z.enum(["start", "stop", "status", "reset"]).optional(),
});

export const LaunchSchema = z.object({
  farm_id: z.string().min(1).max(50),
});

export const TransferSchema = z.object({
  farm_id: z.string().min(1).max(50),
  target_name: z.string().min(1).max(100),
  resources: z.array(z.enum(["food", "wood", "stone", "gold"])).min(1),
  amount: z.enum(["all", "half"]),
  max_marches: z.number().int().min(1).max(5).optional().default(1),
  method: z.enum(["tribe_hall", "world_map"]).optional().default("tribe_hall"),
});

// ── Auth ───────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const SignupSchema = LoginSchema.extend({
  full_name: z.string().min(1).max(100).optional(),
});

// ── Admin ──────────────────────────────────────────────
export const AdminLoginSchema = z.object({
  password: z.string().min(1),
});

export const ProKeySchema = z.object({
  key: z.string().min(1).max(100),
  plan: z.enum(["basic", "pro", "enterprise"]).optional(),
  farms: z.number().int().min(1).max(100).optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
});

// ── Helpers ────────────────────────────────────────────
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data, error: null };
  }
  const messages = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
  return { data: null, error: messages };
}
