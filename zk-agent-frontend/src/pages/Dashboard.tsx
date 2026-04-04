import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { MetricCard } from '../components/MetricCard';
import { DecisionRow } from '../components/DecisionRow';
import { ZKProofRow } from '../components/ZKProofRow';
import { ProgressBar } from '../components/ProgressBar';
import { Toggle } from '../components/Toggle';
import { useAgentContext } from '../context/AgentDataContext';

function renderSafeLogMessage(message: string) {
  const regex = /<code>(.*?)<\/code>/g;
  const nodes: ReactNode[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(message.slice(lastIndex, match.index));
    }
    nodes.push(
      <code
        key={`${match.index}-${match[1]}`}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          background: 'var(--bg-tertiary)',
          padding: '1px 4px',
          borderRadius: 3,
          color: 'var(--text-primary)',
        }}
      >
        {match[1]}
      </code>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < message.length) {
    nodes.push(message.slice(lastIndex));
  }

  return nodes;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState({ defi: true, zk: true, live: false });
  const { decisions, proofs, logs, reputation } = useAgentContext();

  const recentDecisions = decisions.slice(0, 4);
  const recentProofs    = proofs.slice(0, 4);
  const recentLogs      = logs.slice(0, 7);

  const totalPnl    = decisions.reduce((sum, d) => sum + d.pnl, 0);
  const passedProofs = proofs.filter(p => p.status === 'PASS').length;

  const emptyState = (label: string) => (
    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
      No {label} yet — start the agent to see live data
    </div>
  );

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section 1 — Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <MetricCard
          label="Total PnL"
          value={<span style={{ color: totalPnl >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>
            {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
          </span>}
          sub="Since deployment"
        />
        <MetricCard
          label="Win rate"
          value={`${reputation.winRate}%`}
          sub={`${reputation.totalTrades} trades`}
        />
        <MetricCard
          label="ZK proofs"
          value={<span>{passedProofs} <span style={{ fontSize: 14, color: 'var(--green-text)' }}>/ {proofs.length}</span></span>}
          sub={proofs.length > 0 ? 'All passing' : 'No proofs yet'}
          subColor={proofs.length > 0 ? 'var(--green-text)' : undefined}
        />
        <MetricCard
          label="Reputation"
          value={<span style={{ color: 'var(--brand-700)' }}>{reputation.score}</span>}
          sub="On-chain registry"
        />
      </div>

      {/* Section 2 — Two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        {/* Live Decisions */}
        <Card>
          <CardHeader
            title="Live decisions"
            right={<Badge variant="brand">Agent strategy</Badge>}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentDecisions.length > 0
              ? recentDecisions.map((d, i) => <DecisionRow key={d.id} decision={d} index={i} />)
              : emptyState('decisions')}
          </div>
          {recentDecisions.length > 0 && (
            <button
              onClick={() => navigate('/trade-history')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-700)',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                marginTop: 10,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View all decisions →
            </button>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ZK Proof Status */}
          <Card>
            <CardHeader
              title="ZK proof status"
              right={<Badge variant="purple">Risc0</Badge>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {recentProofs.length > 0
                ? recentProofs.map(p => <ZKProofRow key={p.id} proof={p} />)
                : emptyState('proofs')}
            </div>
          </Card>

          {/* On-chain Reputation */}
          <Card>
            <CardHeader
              title="On-chain reputation"
              right={<Badge variant="blue">ValidationRegistry</Badge>}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { k: 'Reputation score', v: `${reputation.score} pts`, vc: 'var(--brand-700)' as string | undefined },
                { k: 'Avg ROI per trade', v: `${reputation.avgRoi > 0 ? '+' : ''}${reputation.avgRoi.toFixed(2)}%`, vc: undefined },
                { k: 'Proof success rate', v: `${reputation.proofSuccessRate}%`, vc: undefined },
              ].map(({ k, v, vc }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 13, color: vc || 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ height: '0.5px', background: 'var(--border-primary)', margin: '8px 0' }} />
            {[
              { label: 'Win rate', pct: `${reputation.winRate}%`, val: reputation.winRate, color: 'var(--green-mid)' },
              { label: 'ZK pass rate', pct: `${reputation.proofSuccessRate}%`, val: reputation.proofSuccessRate, color: 'var(--purple-mid)' },
            ].map(({ label, pct, val, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>{pct}</span>
                </div>
                <ProgressBar value={val} color={color} height={5} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Section 3 — Bottom two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Agent Log */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>Agent log</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>checkpoints.jsonl</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentLogs.length > 0
              ? recentLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', paddingTop: 1 }}>
                    {log.timestamp}
                  </span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {renderSafeLogMessage(log.message)}
                  </span>
                </div>
              ))
              : <div style={{ color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                  Logs stream in via WebSocket — connect to see live activity
                </div>
            }
          </div>
        </Card>

        {/* Strategy Config */}
        <Card>
          <CardHeader title="Strategy config" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { k: 'Strategy', v: 'VolumeConfirmedMomentum' },
              { k: 'Market', v: 'BTC/USD' },
              { k: 'Max position size', v: '25%' },
              { k: 'Max drawdown', v: '10%' },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
            {[
              { k: 'DeFi yield context', key: 'defi' as const },
              { k: 'ZK proof layer', key: 'zk' as const },
              { k: 'Live mode', key: 'live' as const },
            ].map(({ k, key }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                <Toggle checked={toggles[key]} onChange={v => setToggles(t => ({ ...t, [key]: v }))} />
              </div>
            ))}
            <div style={{ height: '0.5px', background: 'var(--border-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>Network</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12, color: 'var(--blue-text)' }}>Sepolia</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>Proof engine</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12, color: 'var(--purple-text)' }}>Risc0 / Bonsai</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
