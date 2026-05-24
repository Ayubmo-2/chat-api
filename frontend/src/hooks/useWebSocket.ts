import { useEffect, useRef, useCallback, useState } from 'react';
import type { ServerMessage, ClientMessage } from '@chat-api/shared';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000';
const HEARTBEAT_INTERVAL = 15_000;
const RECONNECT_DELAY = 3_000;

interface UseWebSocketOptions {
  onMessage: (msg: ServerMessage) => void;
  enabled: boolean;
}

export function useWebSocket({ onMessage, enabled }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [connected, setConnected] = useState(false);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      heartbeatRef.current = setInterval(() => {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => ws.close();
  }, [enabled, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { send, connected };
}
