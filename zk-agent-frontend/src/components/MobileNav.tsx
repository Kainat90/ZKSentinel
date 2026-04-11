import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, History, Star, Info } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/' },
  { icon: ShieldCheck,      label: 'EIP-712 Proofs', path: '/proofs' },
  { icon: History,          label: 'History',   path: '/trade-history' },
  { icon: Star,             label: 'Reputation',path: '/reputation' },
  { icon: Info,             label: 'About',     path: '/about' },
];

export function MobileNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 56,
      background: 'var(--bg-primary)',
      borderTop: '0.5px solid var(--border-primary)',
      zIndex: 100,
      display: 'flex',
    }}>
      {navItems.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          style={({ isActive }) => ({
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            color: isActive ? 'var(--brand-700)' : 'var(--text-tertiary)',
            textDecoration: 'none',
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} style={{ color: isActive ? 'var(--brand-700)' : 'var(--text-tertiary)' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 10 }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
