// lib/env-check.ts
// Validates required environment variables at startup.
// Import this in layout.tsx or instrumentation.ts to catch misconfig early.

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  "VRBOT_API_KEY",
  "ORCHESTRATOR_URL",
] as const;

const OPTIONAL_WITH_WARNINGS: Record<string, string> = {
  ADMIN_EMAILS: "No admin emails configured — admin panel will be inaccessible",
  HETZNER_IP: "Using ORCHESTRATOR_URL instead of direct IP",
  REDIS_URL: "Using in-memory fallback instead of Redis",
  ADMIN_SESSION_SECRET: "Admin session signing disabled",
};

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const [key, warning] of Object.entries(OPTIONAL_WITH_WARNINGS)) {
    if (!process.env[key]) {
      console.warn(`[env-check] WARNING: ${key} not set — ${warning}`);
    }
  }

  if (missing.length > 0) {
    const msg =
      `[VRBOT] Missing required environment variables:\n` +
      missing.map((k) => `  - ${k}`).join("\n") +
      `\nPlease set these in .env.local or Vercel dashboard.`;

    // In development, throw hard. In production, log error but don't crash
    // (Vercel may not have all vars available during build phase)
    if (process.env.NODE_ENV === "development") {
      throw new Error(msg);
    } else {
      console.error(msg);
    }
  } else {
    console.log("[env-check] All required environment variables present");
  }
}
