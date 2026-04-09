import type { Decision, Proof, LogEntry, ReputationData } from '../types';

const hashes = [
  '0x3fa8c2e1d9b47f5a6c0e82b4d1f9a3c7',
  '0x7b2d4e6f8a1c3e5d9f2b4a6c8e0d1f3a',
  '0x1c5e9a2d4f6b8c0e2a4d6f8b0c2e4a6d',
  '0x9d3f7b1e5a2c6f0d4b8e2a6c0f4d8b2e',
  '0x4a8c2f6b0e4d8a2f6c0e4b8d2f6a0c4e',
  '0x6e0b4f8d2a6c0e4b8f2d6a0c4e8b2f6d',
  '0x2f6a0d4e8b2c6f0a4d8e2b6f0a4c8d2f',
  '0x8b2e6a0f4c8d2b6e0a4f8c2d6b0e4a8c',
  '0x5d9b3e7a1f5c9d3b7e1a5f9c3d7b1e5a',
  '0x0e4a8d2f6b0c4e8a2f6d0b4c8e2a6f0d',
  '0xa3d7f1b5e9c3a7d1f5b9e3c7a1d5f9b3',
  '0xf1b5e9a3d7c1f5b9e3a7d1c5f9b3e7a1',
];

const reasonings = [
  "BTC/USD showing strong momentum at $67,420 with RSI 58 — not overbought. Aave USDC APY dropped to 3.1%, making direct BTC exposure more attractive. ETH/BTC ratio stable at 0.053. Position size within 25% max. Confidence high.",
  "SOL/USD stalled at resistance $142.30 after 8% rally. ETH gas fees elevated suggesting network congestion risk. Aave v3 ETH supply APY 2.4% — holding current allocation is optimal until momentum resumes.",
  "ETH/USD break below $3,180 support with volume spike. Compound USDC rate at 4.2% offers better risk-adjusted return than holding ETH here. Max drawdown rule prevents sizing below -8% from entry.",
  "BTC dominance increased to 54.2% — risk-off signal for alts. BTC/USD holding $65,800 support, Kraken order book shows strong bid wall at $65,500. DeFi TVL stable. Initiating BUY with 20% position.",
  "ETH/USD printing higher lows on 4h chart. Aave ETH APY 2.1% plus expected price appreciation makes hold position justified. EIP-712 proof validates position within single-asset 50% limit.",
  "BTC/USD rejected at $68,000 resistance three times. Profit taking triggered at +4.2% gain. Kraken liquidity thin above $68k. Rotating to stablecoin yield — Compound USDC at 4.1%.",
  "SOL ecosystem activity surging — Jito restaking APY 7.3%. SOL/USD breakout from $138 consolidation zone. Position sizing at 15% respects max drawdown constraint. Conviction: high.",
  "Market maker spread widening on ETH/USD — liquidity degrading. Aave utilization rate at 87% warning signal. HOLD current BTC position which is +2.1% and within risk parameters.",
  "BTC halving supply effect materializing — daily issuance dropped 50%. Long-term holder accumulation on-chain. Current price $66,100 offers favorable entry vs $70k target. Initiating BUY.",
  "ETH/USD momentum fading at $3,250 after Fed minutes release. DXY strengthening to 104.2. Risk management protocol: reduce exposure. Selling 0.4 ETH to lock in +1.8% gain.",
  "Cross-asset correlation spike — BTC and ETH both dipping with S&P500. Macro uncertainty from FOMC statement. Holding USDC in Aave at 3.8% APY until clarity. EIP-712 proof confirms HOLD rule compliance.",
  "BTC/USD double bottom pattern at $64,800 confirmed with volume. Order flow analysis shows institutional accumulation. Max position 25%, current 18% — room to add. Confidence: 91%.",
  "SOL/USD rejected at $150 psychological level. Profit target hit at +6.3%. Reallocating to ETH/USD which shows better momentum profile on 1D chart. Rule check: all limits satisfied.",
  "Aave v3 WBTC collateral ratio adjusted — slightly less efficient for leveraged exposure. Direct BTC position on Kraken preferred. Initiating 0.08 BTC buy at $66,800 market price.",
  "ETH staking APY via Lido at 4.1% — higher than current DeFi yields. HOLD ETH position and collect staking rewards. Rule validation: position 22% < 25% max. Proof passing.",
];

export const mockDecisions: Decision[] = Array.from({ length: 50 }, (_, i) => {
  const actions: Decision['action'][] = ['BUY', 'SELL', 'HOLD'];
  const action = actions[i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 1];
  const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
  const pair = pairs[i % 3];
  const confidence = 55 + Math.round((i * 17 + 31) % 41);
  const pnl = action === 'SELL' ? -(Math.random() * 20) : (Math.random() * 30);
  const hoursAgo = i * 0.5;
  const timeAgo = hoursAgo < 1 ? `${Math.round(hoursAgo * 60)} min ago` : `${Math.round(hoursAgo)}h ago`;
  const amounts: Record<string, string> = { 'BTC/USD': '0.12 BTC', 'ETH/USD': '0.8 ETH', 'SOL/USD': '12 SOL' };
  const prices: Record<string, string> = { 'BTC/USD': `$${(67420 - i * 50).toLocaleString()}`, 'ETH/USD': `$${(3180 - i * 10).toLocaleString()}`, 'SOL/USD': `$${(142 - i * 0.5).toFixed(2)}` };

  return {
    id: `dec-${i}`,
    action,
    reasoning: reasonings[i % reasonings.length],
    confidence,
    timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    timeAgo,
    pair,
    amount: amounts[pair],
    price: prices[pair],
    pnl: parseFloat(pnl.toFixed(2)),
    proofHash: hashes[i % hashes.length],
    proofStatus: i === 7 ? 'FAIL' : 'PASS',
    checkpointHash: hashes[(i + 3) % hashes.length],
    eip712: true,
  };
});

export const mockProofs: Proof[] = Array.from({ length: 50 }, (_, i) => ({
  id: `proof-${i}`,
  hash: hashes[i % hashes.length],
  decision: (['BUY', 'SELL', 'HOLD'] as const)[i % 3],
  rule: i === 7 ? 'max pos. exceeded' : 'rules satisfied',
  status: i === 7 ? 'FAIL' : 'PASS',
  timestamp: new Date(Date.now() - i * 1800000).toISOString(),
}));

const logMessages = [
  'EIP-712 proof generated · receipt_<code>0x3fa8c</code> stored',
  'TradeDecision → EIP-712 checkpoint signed',
  'Claude strategy: BUY 0.12 BTC · confidence 88%',
  'Market data fetched · Aave APY 3.1% · Kraken $67,420',
  'ReputationRegistry updated · score 712 +4',
  'HOLD decision · proof hash posted on-chain',
  'Agent started · strategy: <code>ClaudeStrategy</code>',
  'EIP-712 proof verified · receipt_<code>0x7b2d4</code> confirmed',
  'Market data fetched · Compound USDC 4.2% · ETH $3,180',
  'SELL 0.8 ETH · proof hash <code>0x1c5e9a</code> posted',
  'ReputationRegistry updated · score 708 +2',
  'BTC/USD tick: $66,850 · spread 0.01%',
  'ClaudeStrategy inference: 340ms latency',
  'EIP-712 domain separator validated',
  'Bonsai proof generation started · estimate 2.1s',
];

export const mockLogs: LogEntry[] = Array.from({ length: 100 }, (_, i) => {
  const d = new Date(Date.now() - i * 120000);
  const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  return {
    id: `log-${i}`,
    timestamp: ts,
    message: logMessages[i % logMessages.length],
  };
});

export const mockReputation: ReputationData = {
  score: 712,
  avgRoi: 2.85,
  proofSuccessRate: 98,
  winRate: 68,
  totalTrades: 50,
  agentAge: '14 days',
  contractAddress: '0x4a9f3c2e1d8b5a7f0c3e6d9b2a5f8c1e4d7b0a3',
  history: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.round(600 + (112 / 13) * i + (Math.random() - 0.5) * 8),
  })),
};

export const mockPnlHistory = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  label: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  value: parseFloat((i * 4.75 + (i % 5 - 2) * 3.1).toFixed(2)),
}));

export const mockPnlHistory7d = mockPnlHistory.slice(-7);

export const mockPnlHistory24h = Array.from({ length: 24 }, (_, i) => ({
  t: i,
  label: `${String(i).padStart(2, '0')}:00`,
  value: parseFloat((i * 0.38 + (i % 4 - 1.5) * 1.2).toFixed(2)),
}));

export const mockWinLoss = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  wins: Math.round(2 + Math.random() * 3),
  losses: Math.round(Math.random() * 2),
}));

export const mockProofHistory = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  count: Math.round(2 + i * 3.2),
}));
