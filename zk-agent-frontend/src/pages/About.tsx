import { ExternalLink, ShieldCheck, Cpu, BarChart3, Database, Fingerprint } from 'lucide-react';
import { Card } from '../components/Card';

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Verifiable Intent',
    body: 'EIP-712 signed checkpoints prove exactly what the agent decided and why, at every tick.',
  },
  {
    icon: Fingerprint,
    title: 'ERC-8004 Identity',
    body: 'Each agent is registered as an on-chain NFT with signed metadata, capabilities, and a verifiable performance record.',
  },
  {
    icon: Cpu,
    title: 'Immutable Risk Guardrails',
    body: 'On-chain enforcement of max position size, drawdown BPS, and rate limits. Even the agent cannot bypass these.',
  },
  {
    icon: BarChart3,
    title: 'Strategy-in-Loop Backtesting',
    body: 'The same production logic that runs live is used to validate against historical data. Zero divergence.',
  },
  {
    icon: Database,
    title: 'Multi-Source Data Standard',
    body: 'CoinGecko and Kraken feeds are normalised into a unified OHLCV schema for consistent signal generation.',
  },
];

const team = [
  {
    name: 'Kainat Khan',
    role: 'Backend Core · Strategist',
    avatar: 'KK',
    contributions: [
      'Designed the Volume Confirmed Momentum strategy',
      'Backtested against 1 year of Kraken OHLCV data',
      'Built the on-chain risk parameter system',
    ],
    stack: ['TypeScript', 'Java', 'Spring Boot', 'ERC-8004', 'EIP-712'],
    links: [
      {
        icon: ExternalLink,
        label: 'LinkedIn',
        href: 'https://linkedin.com/in/kainat-khan-4699012a7',
      },
    ],
  },
  {
    name: 'Kelvin Momanyi',
    role: 'Frontend Engineer · UI/UX',
    avatar: 'KM',
    contributions: [
      'Built the agent dashboard and live checkpoint visualiser',
      'Designed the equity curve and reputation interface',
      'Secure system design & cross-platform architecture',
    ],
    stack: ['React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Firebase'],
    links: [
      {
        icon: ExternalLink,
        label: 'kelvinmomanyi.codes',
        href: 'https://kelvinmomanyi.codes',
      },
    ],
  },
];

export function About() {
  return (
    <div className="page-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860 }}>

      {/* ── Page header ────────────────────────────────── */}
      <div>
        <h1 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: 20,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          About ZKSentinel
        </h1>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 13,
          color: 'var(--text-tertiary)',
        }}>
          Trustless · Verifiable · Secure — ZKSentinel AI Trading Infrastructure · v1.1.0
        </p>
      </div>

      {/* ── Mission card ───────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 22,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}>
            Trust.&nbsp;&nbsp;Verify.&nbsp;&nbsp;Execute.
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: 620,
          }}>
            Billions of dollars flow through AI trading agents every day — yet nobody can verify what
            they are actually doing. ZKSentinel is the first framework to treat every agent decision as a
            first-class on-chain artifact, backed by cryptographic proof at the protocol level, not in
            application code.
          </p>
          <div style={{
            marginTop: 4,
            padding: '10px 14px',
            background: 'var(--brand-100)',
            borderLeft: '2px solid var(--brand-700)',
            borderRadius: 'var(--radius-md)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--brand-800)',
          }}>
            Every AI agent economy needs a trust primitive. ZKSentinel is that primitive.
          </div>
        </div>
      </Card>

      {/* ── What we built ──────────────────────────────── */}
      <div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--text-primary)',
          marginBottom: 10,
        }}>
          What We Built
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 10,
        }}>
          {pillars.map(({ icon: Icon, title, body }) => (
            <Card key={title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'var(--brand-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={15} style={{ color: 'var(--brand-700)' }} />
                </div>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}>
                  {title}
                </span>
              </div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {body}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* ── The Team ───────────────────────────────────── */}
      <div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}>
          The Team
        </div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          marginBottom: 10,
        }}>
          Two engineers, one vision — built ZKSentinel from scratch.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {team.map(({ name, role, avatar, contributions, stack, links }) => (
            <Card key={name} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--brand-100)',
                  border: '1.5px solid var(--brand-200, var(--border-primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--brand-700)',
                  flexShrink: 0,
                }}>
                  {avatar}
                </div>
                <div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginTop: 1,
                  }}>
                    {role}
                  </div>
                </div>
              </div>

              {/* Contributions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {contributions.map(c => (
                  <div key={c} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--green-text)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {c}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stack */}
              <div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Stack
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {stack.map(s => (
                    <span key={s} style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      border: '0.5px solid var(--border-primary)',
                      borderRadius: 6,
                      padding: '2px 7px',
                    }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                {links.map(({ icon: LinkIcon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--brand-700)',
                      textDecoration: 'none',
                    }}
                  >
                    <LinkIcon size={13} />
                    {label}
                  </a>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Open source footer ─────────────────────────── */}
      <Card style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: 'var(--text-primary)',
            marginBottom: 3,
          }}>
            Open Source
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            fontSize: 12,
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}>
            The ZKSentinel repository is public. The codebase implements ERC-8004, EIP-712,
            multi-source data ingestion, and the full backtesting engine.
          </p>
        </div>
        <a
          href="https://github.com/Kainat90/ZKSentinel"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--brand-700)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)')}
        >
          <ExternalLink size={14} />
          github.com/Kainat90/ZKSentinel
        </a>
      </Card>

    </div>
  );
}
