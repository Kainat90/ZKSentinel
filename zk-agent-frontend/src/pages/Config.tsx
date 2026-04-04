import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Toggle } from '../components/Toggle';
import { getSafeApiBase } from '../utils/network';
import styles from './Config.module.css';

const API_URL = getSafeApiBase(import.meta.env.VITE_API_URL);

interface AgentStatus {
  agentId: string;
  wallet: string;
  pair: string;
  sandbox: boolean;
  network: string;
  interval: number;
  contracts: {
    agentRegistry: string | null;
    hackathonVault: string | null;
    riskRouter: string | null;
    reputationRegistry: string | null;
    validationRegistry: string | null;
  };
}

export function Config() {
  const [maxPos,             setMaxPos]             = useState(25);
  const [maxDraw,            setMaxDraw]            = useState(10);
  const [maxAsset,           setMaxAsset]           = useState(50);
  const [decisionInterval,   setDecisionInterval]   = useState(300);
  const [claudeOn,           setClaudeOn]           = useState(true);
  const [defiOn,             setDefiOn]             = useState(true);
  const [zkOn,               setZkOn]               = useState(true);
  const [liveOn,             setLiveOn]             = useState(false);
  const [status,             setStatus]             = useState<AgentStatus | null>(null);
  const [statusError,        setStatusError]        = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/status`)
      .then(r => r.json())
      .then(data => {
        setStatus(data as AgentStatus);
        setLiveOn(!(data as AgentStatus).sandbox);
        if ((data as AgentStatus).interval) setDecisionInterval((data as AgentStatus).interval);
      })
      .catch(() => setStatusError(true));
  }, []);

  const truncAddr = (addr: string | null) =>
    addr ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : '—';

  const envRows = status
    ? [
        { k: 'AGENT_ID',               v: status.agentId                              },
        { k: 'TRADING_PAIR',           v: status.pair                                 },
        { k: 'KRAKEN_SANDBOX',         v: String(status.sandbox)                      },
        { k: 'NETWORK',                v: status.network                              },
        { k: 'POLL_INTERVAL_MS',       v: `${status.interval * 1000}ms`              },
        { k: 'AGENT_REGISTRY',         v: truncAddr(status.contracts.agentRegistry)   },
        { k: 'RISK_ROUTER',            v: truncAddr(status.contracts.riskRouter)       },
        { k: 'REPUTATION_REGISTRY',    v: truncAddr(status.contracts.reputationRegistry) },
        { k: 'VALIDATION_REGISTRY',    v: truncAddr(status.contracts.validationRegistry) },
      ]
    : [];

  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>Strategy Configuration</h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
          Adjust risk parameters and strategy settings
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        {/* Risk parameters */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>Risk parameters</span>
            <Badge variant="blue">RiskRouter contract</Badge>
          </div>

          {[
            { label: 'Max position size', desc: 'Maximum allocation per trade as % of portfolio', val: maxPos, set: setMaxPos, max: 100, unit: '%' },
            { label: 'Max drawdown', desc: 'Stop trading if drawdown exceeds this threshold', val: maxDraw, set: setMaxDraw, max: 50, unit: '%' },
            { label: 'Single asset max', desc: 'Maximum exposure to any single asset', val: maxAsset, set: setMaxAsset, max: 100, unit: '%' },
          ].map(({ label, desc, val, set, max, unit }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>{label}</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12,
                  background: 'var(--brand-100)', color: 'var(--brand-700)',
                  padding: '1px 6px', borderRadius: 6,
                }}>{val}{unit}</span>
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>{desc}</div>
              <input
                type="range"
                min={0}
                max={max}
                value={val}
                onChange={e => set(Number(e.target.value))}
                className={styles.slider}
                style={{ '--slider-pct': `${(val / max) * 100}%` } as React.CSSProperties}
              />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Decision interval</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>How often the agent evaluates market conditions</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={decisionInterval}
                onChange={e => setDecisionInterval(Number(e.target.value))}
                style={{ width: 80, height: 32, padding: '0 8px', border: '0.5px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-secondary)', outline: 'none' }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'var(--text-tertiary)' }}>seconds</span>
            </div>
          </div>

          <button style={{
            width: '100%', height: 36,
            background: 'var(--brand-800)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.15s, transform 0.1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-700)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-800)')}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.99)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Save risk parameters
          </button>
        </Card>

        {/* Strategy settings */}
        <Card>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', marginBottom: 16 }}>Strategy settings</div>
          {[
            { label: 'VolumeConfirmedMomentum', desc: 'Rule-based strategy: OBV + VWAP + volume', val: claudeOn, set: setClaudeOn },
            { label: 'DeFi yield context',      desc: 'Include Aave/Compound APY in prompt',       val: defiOn,   set: setDefiOn   },
            { label: 'ZK proof layer',           desc: 'Validate decisions via Risc0',              val: zkOn,     set: setZkOn     },
            { label: 'Live mode (Kraken)',        desc: 'Switch from sandbox to live trading',       val: liveOn,   set: setLiveOn   },
          ].map(({ label, desc, val, set }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>
                </div>
                <Toggle checked={val} onChange={set} />
              </div>
              {label === 'Live mode (Kraken)' && val && (
                <div style={{ marginTop: 8, background: 'var(--amber-bg)', borderLeft: '3px solid var(--amber-mid)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 12, color: 'var(--amber-text)' }}>
                  Warning: This will execute real trades on Kraken. Ensure you have reviewed all risk parameters before enabling.
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>

      {/* Live environment card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>Environment</span>
          <Badge variant={statusError ? 'red' : status ? 'green' : 'gray'}>
            {statusError ? 'Backend offline' : status ? 'Live' : 'Loading…'}
          </Badge>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 12 }}>
          {statusError ? (
            <div style={{ color: 'var(--text-tertiary)' }}>
              Could not reach backend at {API_URL} — make sure <code style={{ color: 'var(--brand-600)' }}>npm run dashboard</code> is running
            </div>
          ) : envRows.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)' }}>Fetching environment…</div>
          ) : (
            envRows.map(({ k, v }) => (
              <div key={k} style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
                <span style={{ color: 'var(--brand-600)', minWidth: 200 }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
