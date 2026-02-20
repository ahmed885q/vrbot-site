"use client";

import { useEffect, useState } from "react";

type RemoteConfig = {
  wsUrl?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function useRemoteConfig(url = "/remote-config.json") {
  const [config, setConfig] = useState<RemoteConfig>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        const data: unknown = await r.json();

        if (!alive) return;

        if (isRecord(data)) {
          setConfig({
            wsUrl: typeof data.wsUrl === "string" ? data.wsUrl : undefined,
          });
        } else {
          setConfig({});
        }
      } catch (e) {
        if (!alive) return;
        setError(String((e as Error)?.message || e));
      }
    })();

    return () => {
      alive = false;
    };
  }, [url]);

  return { config, error };
}
