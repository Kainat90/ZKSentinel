import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { useAgentContext } from '../context/AgentDataContext';

export function Reputation() {
  const { reputation, decisions, proofs } = useAgentContext();

  const cs          = getComputedStyle(document.documentElement);
  const greenMid    = cs.getPropertyValue('--green-mid').trim()    || '#1D9E75';
  const redMid      = cs.getPropertyValue('--red-mid').trim()      || '#D85A30';
  const purpleMid   = cs.getPropertyValue('--purple-mid').trim()   || '#7F77DD';
  const brandColor  = cs.getPropertyValue('--brand-700').trim()    || '#8B2235';
  const textTertiary = cs.getPropertyValue('--text-tertiary').trim() || '#9A9893';

  // Compute win/loss bar chart from decisions grouped by day
  const winLoss = useMemo(() => {
    if (reputation.winLoss && reputation.winLoss.length > 0) return reputation.winLoss;
    // Fallback: compute from decisions in context
    const byDay: Record<string, { wins: number; losses: number }> = {};
    decisions.forEach(d => {
      const day = new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDay[day]) byDay[day] = { wins: 0, losses: 0 };
      if (d.action !== 'HOLD') byDay[day].wins++;
      else byDay[day].losses++;
    });
    return Object.entries(byDay).slice(-14).map(([date, v]) => ({ date, ...v }));
  }, [reputation.winLoss, decisions]);

  // Compute proof history from proofs grouped by day
  const proofHistory = useMemo(() => {
    if (reputation.proofHistory && reputation.proofHistory.length > 0) return reputation.proofHistory;
    const byDay: Record<string, number> = {};
    proofs.forEach(p => {
      const day = new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      byDay[day] = (byDay[day] ?? 0) + 1;
    });
    return Object.entries(byDay).slice(-14).map(([date, count]) => ({ date, count }));
  }, [reputation.proofHistory, proofs]);

  const hasHistory = reputation.history.length > 0;

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>On-Chain Reputation</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          Live data from ReputationRegistry contract · Sepolia
        </p>
      </div>

      {/* Score hero */}
      <Card style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 48, color: 'var(--brand-700)', lineHeight: 1.0 }}>
          {reputation.score}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4, marginBottom: 16 }}>
          Reputation score
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          {[
            { label: 'Total trades', value: reputation.totalTrades.toString() },
            { label: 'Avg ROI',      value: `${reputation.avgRoi >= 0 ? '+' : ''}${reputation.avgRoi.toFixed(2)}%` },
            { label: 'Agent age',    value: reputation.agentAge },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Two column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Performance metrics</div>
          {winLoss.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={winLoss} barGap={2}>
                <XAxis dataKey="date" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} width={20} />
                <Bar dataKey="wins" fill={greenMid} radius={2} />
                <Bar dataKey="losses" fill={redMid} radius={2} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
              No trade history yet
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[
              { label: 'Win rate',            pct: `${reputation.winRate}%`,            val: reputation.winRate,            color: greenMid },
              { label: 'Average confidence',  pct: `${reputation.proofSuccessRate}%`,   val: reputation.proofSuccessRate,   color: purpleMid },
              { label: 'Proof pass rate',      pct: `${reputation.proofSuccessRate}%`,   val: reputation.proofSuccessRate,   color: brandColor },
            ].map(({ label, pct, val, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-secondary)' }}>{pct}</span>
                </div>
                <ProgressBar value={val} color={color} height={4} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Proof history</div>
          {proofHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={proofHistory}>
                <XAxis dataKey="date" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} width={25} />
                <Line type="monotone" dataKey="count" stroke={purpleMid} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
              No proof history yet
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[
              { k: 'Total proofs submitted', v: String(proofs.length) },
              { k: 'Proofs on-chain',        v: String(proofs.length) },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>Contract address</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)' }}>
                  {reputation.contractAddress !== '—' ? `${reputation.contractAddress.slice(0, 10)}…` : '—'}
                </span>
                {reputation.contractAddress !== '—' && (
                  <a
                    href={`https://sepolia.etherscan.io/address/${reputation.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={11} style={{ color: 'var(--blue-text)' }} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reputation timeline */}
      <Card>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Reputation history</div>
        {hasHistory ? (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={reputation.history}>
              <defs>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={brandColor} stopOpacity={0.1} />
                  <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: textTertiary }} axisLine={false} tickLine={false} width={35} />
              <Area type="monotone" dataKey="score" stroke={brandColor} strokeWidth={1.5} fill="url(#repGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
            Reputation history builds as the agent runs
          </div>
        )}
      </Card>

      {/* Registry contracts */}
      <Card>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 }}>Registry contracts</div>
        <div style={{ border: '0.5px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
            <tbody>
              {[
                { name: 'AgentRegistry',      addr: import.meta.env.VITE_AGENT_REGISTRY_ADDRESS      || '—' },
                { name: 'ValidationRegistry', addr: import.meta.env.VITE_VALIDATION_REGISTRY_ADDRESS || '—' },
                { name: 'ReputationRegistry', addr: reputation.contractAddress },
              ].map(({ name, addr }, i, arr) => (
                <tr key={name} style={{ height: 44, borderBottom: i < arr.length - 1 ? '0.5px solid var(--border-secondary)' : 'none' }}>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>{name}</td>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {addr !== '—' ? `${addr.slice(0, 14)}…` : '—'}
                  </td>
                  <td style={{ padding: '0 14px', textAlign: 'right' }}>
                    {addr !== '—' && (
                      <a
                        href={`https://sepolia.etherscan.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--blue-text)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}
                      >
                        View → <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
