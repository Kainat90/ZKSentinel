import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, History, Star, Settings } from 'lucide-react';
import { StatusDot } from './StatusDot';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/' },
  { icon: ShieldCheck,      label: 'ZK Proofs',    path: '/zk-proofs' },
  { icon: History,          label: 'Trade History', path: '/trade-history' },
  { icon: Star,             label: 'Reputation',   path: '/reputation' },
  { icon: Settings,         label: 'Config',       path: '/config' },
];

export function Sidebar() {
  return (
    <nav style={{
      width: 220,
      position: 'fixed',
      left: 0, top: 54, bottom: 0,
      background: 'var(--bg-secondary)',
      borderRight: '0.5px solid var(--border-primary)',
      overflowY: 'auto',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 12px 8px', flex: 1 }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}>
          Navigation
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: isActive ? '0 10px 0 8px' : '0 10px',
                borderRadius: 'var(--radius-md)',
                borderLeft: isActive ? '2px solid var(--brand-700)' : '2px solid transparent',
                background: isActive ? 'var(--brand-100)' : 'transparent',
                color: isActive ? 'var(--brand-700)' : 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: 13,
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'var(--bg-tertiary)';
                  el.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = '';
                  el.style.color = '';
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} style={{ color: isActive ? 'var(--brand-700)' : 'var(--text-tertiary)', flexShrink: 0 }} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom status */}
      <div style={{
        padding: 12,
        borderTop: '0.5px solid var(--border-primary)',
      }}>
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot state="running" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 12, color: 'var(--green-text)' }}>
              Running
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>
            ClaudeStrategy
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Uptime: 14h 23m
          </span>
        </div>
      </div>
    </nav>
  );
}
