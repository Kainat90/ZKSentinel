import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import logoMark from '../assets/logo-mark.svg';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 54,
      background: isDark ? 'var(--brand-700)' : 'var(--brand-800)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      width: '100%',
      transition: 'background 0.2s',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={logoMark}
          alt="ZK Sentinel"
          style={{ width: 32, height: 32, flexShrink: 0 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 15, color: '#FFFFFF', lineHeight: 1.4 }}>
            ZK Sentinel Trading Agent
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
            agentId: #0x7f3a…e921
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.85)',
          whiteSpace: 'nowrap',
        }}>
          Sepolia testnet
        </span>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>
          <span style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: '#5DCAA5',
            animation: 'pulse 1.6s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 11, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
            Agent live
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            position: 'relative',
            width: 36, height: 20,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Toggle theme"
        >
          <span style={{
            position: 'absolute',
            width: 16, height: 16,
            borderRadius: '50%',
            background: '#FFFFFF',
            top: 2, left: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isDark ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.2s ease',
          }}>
            {isDark
              ? <Moon size={10} style={{ color: 'var(--brand-800)' }} />
              : <Sun size={10} style={{ color: 'var(--brand-800)' }} />
            }
          </span>
        </button>
      </div>
    </header>
  );
}
