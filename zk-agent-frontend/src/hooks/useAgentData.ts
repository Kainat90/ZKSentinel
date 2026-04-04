import { useState, useEffect, useRef } from 'react';
import type { Decision, ZKProof, LogEntry, ReputationData } from '../types';
import { getSafeApiBase } from '../utils/network';

const API_URL = getSafeApiBase(import.meta.env.VITE_API_URL);

export function useAgentData(wsConnected: boolean) {
  const [decisions,  setDecisions]  = useState<Decision[]>([]);
  const [proofs,     setProofs]     = useState<ZKProof[]>([]);
  const [logs,       _setLogs]      = useState<LogEntry[]>([]);   // logs come via WS only
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = async (skipIfConnected = false) => {
    if (skipIfConnected && wsConnected) return; // skip interval polls when WS is live
    try {
      const [dRes, pRes, rRes] = await Promise.all([
        fetch(`${API_URL}/api/decisions`),
        fetch(`${API_URL}/api/proofs`),
        fetch(`${API_URL}/api/reputation`),
      ]);
      if (dRes.ok) setDecisions(await dRes.json());
      if (pRes.ok) setProofs(await pRes.json());
      if (rRes.ok) setReputation(await rRes.json());
    } catch {
      // keep previous data on network error
    }
  };

  useEffect(() => {
    fetchAll(); // always seed from HTTP on mount/reconnect
    intervalRef.current = setInterval(() => fetchAll(true), 30000); // interval polls skip when WS live
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConnected]);

  return { decisions, proofs, logs, reputation };
}
