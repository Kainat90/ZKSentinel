export type Action = 'BUY' | 'SELL' | 'HOLD';
export type ProofStatus = 'PASS' | 'FAIL';

export interface Decision {
  id: string;
  action: Action;
  reasoning: string;
  confidence: number;
  timestamp: string;
  timeAgo: string;
  pair: string;
  amount: string;
  price: string;
  pnl: number;
  proofHash: string;
  proofStatus: ProofStatus;
  checkpointHash: string;
  eip712: boolean;
}

export interface Proof {
  id: string;
  hash: string;
  decision: Action;
  rule: string;
  status: ProofStatus;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
}

export interface ReputationData {
  score: number;
  avgRoi: number;
  proofSuccessRate: number;
  winRate: number;
  totalTrades: number;
  agentAge: string;
  history: { date: string; score: number }[];
  contractAddress: string;
  winLoss?: { date: string; wins: number; losses: number }[];
  proofHistory?: { date: string; count: number }[];
}

export interface AgentData {
  decisions: Decision[];
  proofs: Proof[];
  logs: LogEntry[];
  reputation: ReputationData;
  connected: boolean;
}
