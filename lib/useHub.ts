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

// ── Agent Live Status (from BotStateManager) ──
export type AgentLiveStatus = {
  state: string; // STOPPED, STARTING, RUNNING, PAUSED, CAPTCHA_WAIT, ERROR_RECOVERY, SHUTTING_DOWN
  current_task: string;
  task_state: string;
  cycle: number;
  total_ok: number;
  total_fail: number;
  total_skip: number;
  uptime_seconds: number;
  game_restarts: number;
  captchas_detected: number;
  last_error: string;
  last_updated: number;
};

// ── Alert from agent ──
export type AgentAlert = {
  alert_type: string; // task_final_failure, captcha, error_recovery
  message: string;
  task?: string;
  error?: string;
  recovered?: boolean;
  timestamp: number;
};

const EMPTY_STATUS: AgentLiveStatus = {
  state: "OFFLINE",
  current_task: "",
  task_state: "",
  cycle: 0,
  total_ok: 0,
  total_fail: 0,
  total_skip: 0,
  uptime_seconds: 0,
  game_restarts: 0,
  captchas_detected: 0,
  last_error: "",
  last_updated: 0,
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
  const [agentStatus, setAgentStatus] = useState<AgentLiveStatus>(EMPTY_STATUS);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const addLog = useCallback((msg: HubMessage) => {
    setLogs((prev) => [...prev.slice(-99), msg]); // Keep last 100
  }, []);

  const addAlert = useCallback((alert: AgentAlert) => {
    setAlerts((prev) => [...prev.slice(-49), alert]); // Keep last 50
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Fetch auth token from Supabase session for secure WS auth
        let token: string | undefined;
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token;
        } catch {}

        if (!token) {
          console.warn("[Hub] No auth token — WS auth may be weak");
        }

        ws.send(
          JSON.stringify({
            type: "auth",
            role: "dashboard",
            userId,
            token, // Secure: server should validate this JWT
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg: HubMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "auth_ok":
              setConnected(true);
              lastPongRef.current = Date.now();
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
              setAgentStatus(EMPTY_STATUS);
              addLog(msg);
              break;

            // ── NEW: Agent live status from BotStateManager ──
            case "agent_status":
              if (msg.payload) {
                setAgentStatus({
                  state: msg.payload.state || "UNKNOWN",
                  current_task: msg.payload.current_task || "",
                  task_state: msg.payload.task_state || "",
                  cycle: msg.payload.cycle || 0,
                  total_ok: msg.payload.total_ok || 0,
                  total_fail: msg.payload.total_fail || 0,
                  total_skip: msg.payload.total_skip || 0,
                  uptime_seconds: msg.payload.uptime_seconds || 0,
                  game_restarts: msg.payload.game_restarts || 0,
                  captchas_detected: msg.payload.captchas_detected || 0,
                  last_error: msg.payload.last_error || "",
                  last_updated: Date.now(),
                });
              }
              addLog(msg);
              break;

            // ── NEW: Agent heartbeat (periodic status snapshot) ──
            case "agent_heartbeat":
              if (msg.payload?.state) {
                setAgentStatus((prev) => ({
                  ...prev,
                  ...msg.payload,
                  last_updated: Date.now(),
                }));
              }
              break;

            // ── NEW: Agent alerts (errors, captchas, failures) ──
            case "agent_alert":
              if (msg.payload) {
                const alert: AgentAlert = {
                  alert_type: msg.payload.alert_type || "unknown",
                  message: msg.payload.message || "",
                  task: msg.payload.task,
                  error: msg.payload.error,
                  recovered: msg.payload.recovered,
                  timestamp: msg.timestamp || Date.now(),
                };
                addAlert(alert);
                addLog(msg);
              }
              break;

            case "task_status":
            case "task_complete":
            case "task_error":
            case "log":
              addLog(msg);
              break;

            case "command_sent":
              addLog({ type: "system", payload: { text: "Command sent to agent" } });
              break;

            case "error":
              addLog({ type: "error", payload: { text: msg.message } });
              break;

            case "pong":
              lastPongRef.current = Date.now();
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
  }, [userId, addLog, addAlert]);

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

  // Send pause/resume commands
  const sendCommand = useCallback((command: string, params?: Record<string, any>) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify({
      type: command,
      ...(params || {}),
    }));
    addLog({
      type: "command",
      payload: { text: command, ...params },
      timestamp: Date.now(),
    });
    return true;
  }, [addLog]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Ping every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Stale agent detection — mark offline if no pong for 90s
  useEffect(() => {
    const staleCheck = setInterval(() => {
      if (connected && agents.length > 0) {
        const elapsed = Date.now() - lastPongRef.current;
        if (elapsed > 90000) {
          // No pong for 90s — agent likely disconnected
          setAgentStatus((prev) => ({
            ...prev,
            state: prev.state === "OFFLINE" ? "OFFLINE" : "UNRESPONSIVE",
            last_updated: Date.now(),
          }));
        }
      }
    }, 15000); // Check every 15s
    return () => clearInterval(staleCheck);
  }, [connected, agents.length]);

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
    agentStatus,
    alerts,
    connect,
    disconnect,
    runTasks,
    stopTasks,
    sendCommand,
    clearAlerts,
  };
}
