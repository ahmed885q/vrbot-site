"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://ws.vrbot.me/ws";

export type AgentInfo = {
  clientId: string;
  deviceId: string | null;
  connectedAt: number;
};

export type HubMessage = {
  type: string;
  payload?: any;
  agentId?: string;
  deviceId?: string | null;
  timestamp?: number;
  [key: string]: any;
};

type UseHubOptions = {
  userId: string;
  onMessage?: (msg: HubMessage) => void;
  autoConnect?: boolean;
};

export function useHub({ userId, onMessage, autoConnect = true }: UseHubOptions) {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [logs, setLogs] = useState<HubMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const addLog = useCallback((msg: HubMessage) => {
    setLogs((prev) => [...prev.slice(-99), msg]); // Keep last 100
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send auth
        ws.send(
          JSON.stringify({
            type: "auth",
            role: "dashboard",
            userId,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg: HubMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "auth_ok":
              setConnected(true);
              addLog({ type: "system", payload: { text: "Connected to Hub" } });
              break;

            case "agents_list":
              setAgents(msg.agents || []);
              break;

            case "agent_online":
              setAgents((prev) => [
                ...prev.filter((a) => a.clientId !== msg.agentId),
                {
                  clientId: msg.agentId!,
                  deviceId: msg.deviceId || null,
                  connectedAt: Date.now(),
                },
              ]);
              addLog(msg);
              break;

            case "agent_offline":
              setAgents((prev) =>
                prev.filter((a) => a.clientId !== msg.agentId)
              );
              addLog(msg);
              break;

            case "task_status":
            case "task_complete":
            case "task_error":
            case "agent_status":
            case "log":
              addLog(msg);
              break;

            case "command_sent":
              addLog({ type: "system", payload: { text: "Command sent to agent" } });
              break;

            case "error":
              addLog({ type: "error", payload: { text: msg.message } });
              break;
          }

          onMessageRef.current?.(msg);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Auto reconnect after 3s
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [userId, addLog]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // Send command to agent
  const runTasks = useCallback(
    (farmId: string, tasks: string[], targetAgent?: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
      wsRef.current.send(
        JSON.stringify({
          type: "run_tasks",
          payload: { farmId, tasks, targetAgent },
        })
      );
      addLog({
        type: "command",
        payload: { farmId, tasks },
        timestamp: Date.now(),
      });
      return true;
    },
    [addLog]
  );

  const stopTasks = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify({ type: "stop_tasks" }));
    addLog({
      type: "command",
      payload: { text: "Stop all tasks" },
      timestamp: Date.now(),
    });
    return true;
  }, [addLog]);

  // Ping every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto connect
  useEffect(() => {
    if (autoConnect && userId) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, userId, connect, disconnect]);

  return {
    connected,
    agents,
    logs,
    connect,
    disconnect,
    runTasks,
    stopTasks,
  };
}
