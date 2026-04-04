import React, { createContext, useContext } from 'react';
import type { Decision, ZKProof, LogEntry, ReputationData } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAgentData } from '../hooks/useAgentData';

function dedupe<T extends Record<string, unknown>>(arr: T[], key: keyof T): T[] {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

const emptyReputation: ReputationData = {
  score: 0,
  avgRoi: 0,
  proofSuccessRate: 0,
  winRate: 0,
  totalTrades: 0,
  agentAge: '—',
  history: [],
  contractAddress: '—',
  winLoss: [],
  proofHistory: [],
};

interface AgentDataContextValue {
  decisions: Decision[];
  proofs: ZKProof[];
  logs: LogEntry[];
  reputation: ReputationData;
  connected: boolean;
}

const AgentDataContext = createContext<AgentDataContextValue | null>(null);

export function AgentDataProvider({ children }: { children: React.ReactNode }) {
  const ws   = useWebSocket();
  const http = useAgentData(ws.connected);

  // Merge WS (real-time new items) with HTTP (historical base), deduplicated by id
  const decisions = dedupe([...ws.decisions, ...http.decisions], 'id').slice(0, 50);
  const proofs    = dedupe([...ws.proofs,    ...http.proofs],    'id').slice(0, 50);
  // Logs only come via WS — no HTTP endpoint for them
  const logs       = ws.logs;
  const reputation = ws.reputation ?? http.reputation ?? emptyReputation;

  return (
    <AgentDataContext.Provider value={{ decisions, proofs, logs, reputation, connected: ws.connected }}>
      {children}
    </AgentDataContext.Provider>
  );
}

export function useAgentContext(): AgentDataContextValue {
  const ctx = useContext(AgentDataContext);
  if (!ctx) throw new Error('useAgentContext must be used within AgentDataProvider');
  return ctx;
}
