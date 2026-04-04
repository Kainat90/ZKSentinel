import { useState, useEffect, useRef, useCallback } from 'react';
import type { Decision, ZKProof, LogEntry, ReputationData } from '../types';
import { getSafeWsUrl } from '../utils/network';

const WS_URL = getSafeWsUrl(import.meta.env.VITE_WS_URL);

export function useWebSocket() {
  const [decisions,   setDecisions]   = useState<Decision[]>([]);
  const [proofs,      setProofs]      = useState<ZKProof[]>([]);
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [reputation,  setReputation]  = useState<ReputationData | null>(null);
  const [connected,   setConnected]   = useState(false);
  const wsRef            = useRef<WebSocket | null>(null);
  const reconnectDelay   = useRef(3000);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectDelay.current = 3000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'decision') {
            setDecisions(prev => [msg.data as Decision, ...prev].slice(0, 50));
          } else if (msg.type === 'proof') {
            setProofs(prev => [msg.data as ZKProof, ...prev].slice(0, 50));
          } else if (msg.type === 'log') {
            setLogs(prev => [msg.data as LogEntry, ...prev].slice(0, 100));
          } else if (msg.type === 'reputation') {
            setReputation(msg.data as ReputationData);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          connect();
        }, reconnectDelay.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WS not available — HTTP polling fallback handles it
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { decisions, proofs, logs, reputation, connected };
}
