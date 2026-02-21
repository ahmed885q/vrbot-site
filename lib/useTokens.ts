"use client";

import { useState, useEffect, useCallback } from "react";

export type TokenStatus = {
  tokens_total: number;
  tokens_used: number;
  tokens_available: number;
  trial_granted: boolean;
  trial_expired: boolean;
  trial_expires_at?: string;
  loading: boolean;
  error: string | null;
};

export function useTokens() {
  const [status, setStatus] = useState<TokenStatus>({
    tokens_total: 0,
    tokens_used: 0,
    tokens_available: 0,
    trial_granted: false,
    trial_expired: false,
    loading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/status");
      if (!res.ok) {
        setStatus((s) => ({ ...s, loading: false, error: "Failed to load" }));
        return;
      }
      const data = await res.json();

      // If user has no tokens at all, auto-grant trial
      if (
        data.tokens_total === 0 &&
        !data.trial_granted &&
        !data.trial_expired
      ) {
        const trialRes = await fetch("/api/tokens/grant-trial", {
          method: "POST",
        });
        if (trialRes.ok) {
          // Re-fetch after granting
          const res2 = await fetch("/api/tokens/status");
          if (res2.ok) {
            const data2 = await res2.json();
            setStatus({ ...data2, loading: false, error: null });
            return;
          }
        }
      }

      setStatus({ ...data, loading: false, error: null });
    } catch (err: any) {
      setStatus((s) => ({
        ...s,
        loading: false,
        error: err.message || "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, refresh: fetchStatus };
}
