import React, { useState, useMemo } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { useAgentContext } from '../context/AgentDataContext';
import type { Decision } from '../types';

function PnlTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div style={{
      background: 'var(--bg-primary)',
      border: '0.5px solid var(--border-primary)',
      borderRadius: 6,
      padding: '4px 8px',
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      color: val >= 0 ? 'var(--green-text)' : 'var(--red-text)',
      pointerEvents: 'none',
    }}>
      {val >= 0 ? '+' : ''}${Math.abs(val).toFixed(2)}
    </div>
  );
}

export function TradeHistory() {
  const { decisions } = useAgentContext();

  const [filter, setFilter]         = useState<'All' | 'BUY' | 'SELL' | 'HOLD'>('All');
  const [search, setSearch]         = useState('');
  const [range, setRange]           = useState<'24h' | '7d' | '30d'>('7d');
  const [selected, setSelected]     = useState<Decision | null>(null);
  const [activeValue, setActiveValue] = useState<number | null>(null);

  // Compute cumulative PnL chart from real decisions (oldest → newest)
  const allChartData = useMemo(() => {
    const sorted = [...decisions].reverse(); // oldest first
    let cum = 0;
    return sorted.map((d, i) => {
      cum += d.pnl;
      return {
        t: i,
        label: new Date(d.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: parseFloat(cum.toFixed(2)),
      };
    });
  }, [decisions]);

  const chartData = useMemo(() => {
    if (range === '24h') return allChartData.slice(-24);
    if (range === '7d')  return allChartData.slice(-7);
    return allChartData.slice(-30);
  }, [allChartData, range]);

  const lastValue       = chartData[chartData.length - 1]?.value ?? 0;
  const firstValue      = chartData[0]?.value ?? 0;
  const displayValue    = activeValue !== null ? activeValue : lastValue;
  const periodChangePct = firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0;

  const rows = decisions.slice(0, 50).filter(d => {
    if (filter !== 'All' && d.action !== filter) return false;
    if (search && !d.pair.toLowerCase().includes(search.toLowerCase()) && !d.proofHash.includes(search)) return false;
    return true;
  });

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 20,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12,
    cursor: 'pointer',
    border: active ? '0.5px solid var(--brand-200)' : '0.5px solid var(--border-primary)',
    background: active ? 'var(--brand-100)' : 'var(--bg-secondary)',
    color: active ? 'var(--brand-700)' : 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  });

  const greenMid = getComputedStyle(document.documentElement).getPropertyValue('--green-mid').trim() || '#1D9E75';

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>Trade History</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          Full audit trail · EIP-712 signed checkpoints
        </p>
      </div>

      {/* PnL Sparkline Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>Cumulative PnL</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['24h', '7d', '30d'] as const).map(r => (
              <button key={r} style={pillStyle(range === r)} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ color: displayValue >= 0 ? 'var(--green-text)' : 'var(--red-text)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 28, lineHeight: 1.0, transition: 'color 0.1s' }}>
          {displayValue >= 0 ? '+' : '-'}${Math.abs(displayValue).toFixed(2)}
        </div>
        {chartData.length > 0 ? (
          <>
            <div style={{ color: periodChangePct >= 0 ? 'var(--green-text)' : 'var(--red-text)', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, marginBottom: 8 }}>
              {periodChangePct >= 0 ? '↑' : '↓'} {Math.abs(periodChangePct).toFixed(1)}% vs last period
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart
                data={chartData}
                onMouseMove={(state: unknown) => {
                  const s = state as { activePayload?: { value: number }[] };
                  if (s.activePayload?.length) setActiveValue(s.activePayload[0].value);
                }}
                onMouseLeave={() => setActiveValue(null)}
              >
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={greenMid} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={greenMid} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  content={<PnlTooltip />}
                  cursor={{ stroke: greenMid, strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area type="monotone" dataKey="value" stroke={greenMid} strokeWidth={1.5} fill="url(#pnlGrad)" dot={false} activeDot={{ r: 3, fill: greenMid, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
            No trade data yet — start the agent to populate this chart
          </div>
        )}
      </Card>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(['All', 'BUY', 'SELL', 'HOLD'] as const).map(f => (
          <button key={f} style={pillStyle(filter === f)} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search pair or hash…"
          style={{ marginLeft: 'auto', width: 200, height: 32, padding: '0 10px', border: '0.5px solid var(--border-primary)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}
          onFocus={e => (e.target.style.borderColor = 'var(--brand-600)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-primary)')}
        />
      </div>

      {/* Table */}
      <div style={{ border: '0.5px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        {rows.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            {decisions.length === 0 ? 'No trades yet — start the agent to see trade history' : 'No trades match the current filter'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', height: 38, borderBottom: '0.5px solid var(--border-primary)' }}>
                {['Time', 'Pair', 'Action', 'Amount', 'Price', 'EIP-712 Proof', 'PnL', 'Checkpoint'].map(col => (
                  <th key={col} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', padding: '0 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  style={{ height: 48, borderBottom: i < rows.length - 1 ? '0.5px solid var(--border-secondary)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '0 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{d.timeAgo}</td>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{d.pair}</td>
                  <td style={{ padding: '0 14px' }}>
                    <Badge variant={d.action === 'BUY' ? 'green' : d.action === 'SELL' ? 'red' : 'amber'}>{d.action}</Badge>
                  </td>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{d.amount}</td>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{d.price}</td>
                  <td style={{ padding: '0 14px' }}>
                    <Badge variant={d.proofStatus === 'PASS' ? 'green' : 'red'}>{d.proofStatus}</Badge>
                  </td>
                  <td style={{ padding: '0 14px', fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12, color: d.pnl >= 0 ? 'var(--green-text)' : 'var(--red-text)', whiteSpace: 'nowrap' }}>
                    {d.pnl >= 0 ? '+' : ''}${Math.abs(d.pnl).toFixed(2)}
                  </td>
                  <td style={{ padding: '0 14px' }}>
                    <a
                      href={`https://sepolia.etherscan.io/search?q=${d.checkpointHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--blue-text)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{d.checkpointHash.slice(0, 7)}…</span>
                      <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer overlay */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 199 }}
          />
          <div style={{
            position: 'fixed', right: 0, top: 54, bottom: 0,
            width: 380,
            background: 'var(--bg-primary)',
            borderLeft: '0.5px solid var(--border-primary)',
            zIndex: 200,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
            overflowY: 'auto',
            padding: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>Decision Reasoning</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ height: '0.5px', background: 'var(--border-primary)', marginBottom: 16 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{selected.pair}</span>
              <Badge variant={selected.action === 'BUY' ? 'green' : selected.action === 'SELL' ? 'red' : 'amber'}>{selected.action}</Badge>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>{selected.timeAgo}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'var(--text-tertiary)' }}>Confidence</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-tertiary)' }}>{selected.confidence}%</span>
              </div>
              <ProgressBar value={selected.confidence} color="var(--green-mid)" height={4} />
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              {selected.reasoning}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>EIP-712 Proof</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)' }}>{selected.proofHash.slice(0, 10)}…</span>
                <Badge variant={selected.proofStatus === 'PASS' ? 'green' : 'red'}>{selected.proofStatus}</Badge>
              </div>
              {['Max position size ≤ 25%', 'Max drawdown ≤ 10%', 'Single asset ≤ 50%'].map(rule => (
                <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ color: 'var(--green-text)', fontSize: 11 }}>✓</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>{rule}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>EIP-712 Checkpoint</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {selected.checkpointHash.slice(0, 16)}…
              </div>
              {selected.eip712 && (
                <a
                  href={`https://sepolia.etherscan.io/search?q=${selected.checkpointHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--blue-text)' }}
                >
                  View on Etherscan →
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
