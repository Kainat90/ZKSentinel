import { ExternalLink, ShieldCheck, Cpu, BarChart3, Database, Fingerprint } from 'lucide-react';
import { Card } from '../components/Card';

// Brand icons removed from lucide-react v1 — inline SVG replacements
function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

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
    stack: ['TypeScript', 'Solidity', 'ethers.js', 'Hardhat', 'ERC-8004', 'EIP-712', 'ccxt'],
    links: [
      { icon: GitHubIcon,   label: 'GitHub',   href: 'https://github.com/Kainat90' },
      { icon: LinkedInIcon, label: 'LinkedIn',  href: 'https://linkedin.com/in/kainat-khan-4699012a7' },
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
    stack: ['React', 'TypeScript', 'Vite', 'Node.js', 'Express', 'Nginx'],
    links: [
      { icon: GitHubIcon,   label: 'GitHub',              href: 'https://github.com/kelvinmomanyi' },
      { icon: LinkedInIcon, label: 'LinkedIn',             href: 'https://linkedin.com/in/kelvin-momanyi' },
      { icon: ExternalLink, label: 'kelvinmomanyi.codes',  href: 'https://kelvinmomanyi.codes' },
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
                    <LinkIcon />
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
