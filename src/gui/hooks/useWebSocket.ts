import { useState, useEffect, useCallback, useRef } from "react";

interface WebSocketData {
  nodes: Array<{
    id: string;
    status: "online" | "offline" | "pending" | "active";
    ip?: string;
    country?: string;
    city?: string;
    lat?: number | null;
    lng?: number | null;
    last_heartbeat?: string | null;
  }>;
  credentials: Array<{
    id: string;
    username: string;
    email: string;
    password?: string;
    timestamp: string;
    node_id?: string;
    service?: string;
  }>;
  stats: {
    total_nodes: number;
    active_nodes: number;
    credentials: number;
  };
  evasion: {
    node_id: string;
    score: number;
    threat_level: "low" | "medium" | "high" | "critical";
    methods_detected: string[];
    last_analysis: string;
  };
  simulation_enabled?: boolean;
  bytes_harvested?: number;
  last_harvest?: string | null;
  last_heartbeat?: string | null;
  events?: Array<{
    timestamp: string;
    type: string;
    payload?: Record<string, unknown>;
  }>;
  last_event?: {
    timestamp: string;
    type: string;
    payload?: Record<string, unknown>;
  };
}

const WS_URL = "ws://localhost:8000/ws/dashboard";

export interface UseWebSocketReturn {
  data: WebSocketData | null;
  error: Error | null;
  loading: boolean;
  connected: boolean;
  usingMock: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  sendMessage: (msg: string) => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const [data, setData] = useState<WebSocketData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const hasConnectedOnce = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    if (!hasConnectedOnce.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        hasConnectedOnce.current = true;
        retryCountRef.current = 0;
        setConnected(true);
        setUsingMock(false);
        setLoading(false);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const payload: WebSocketData = JSON.parse(event.data);
          setData(payload);
        } catch {
          console.warn("[WS] Bad message");
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setUsingMock(true);
        setLoading(false);
        setError(new Error("Server unreachable"));
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        wsRef.current = null;

        // Exponential backoff: 1s → 2s → 4s → 8s → 16s → cap at 30s
        retryCountRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 30000);
        if (mountedRef.current && !reconnectTimerRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch {
      if (!mountedRef.current) return;
      setLoading(false);
      setError(new Error("Connection failed"));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 500);
  }, [disconnect, connect]);

  const sendMessage = useCallback((msg: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { data, error, loading, connected, usingMock, connect, disconnect, reconnect, sendMessage };
};
