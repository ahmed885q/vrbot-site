"use client";

import { useEffect, useRef, useState } from "react";

export type WsMsg = {
  type: string;
  payload?: unknown;
  id?: string;
  ts?: number;
};

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function useAgentWs(baseUrl: string, token?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMsg, setLastMsg] = useState<WsMsg | null>(null);

  useEffect(() => {
    if (!baseUrl) return;

    let alive = true;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!alive) return;

      const url =
        token && token.length > 0
          ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
          : baseUrl;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        try {
          setLastMsg(JSON.parse(ev.data));
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        const delay = Math.min(30000, 1000 * 2 ** attempt);
        attempt++;
        timer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    connect();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [baseUrl, token]);

  const send = (type: string, payload?: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    wsRef.current.send(
      JSON.stringify({
        type,
        payload,
        id: uuid(),
        ts: Date.now(),
      })
    );

    return true;
  };

  return { connected, lastMsg, send };
}
