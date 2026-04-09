import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './pages/Dashboard';
import { Proofs } from './pages/ZKProofs';
import { TradeHistory } from './pages/TradeHistory';
import { Reputation } from './pages/Reputation';
import { Config } from './pages/Config';
import { AgentDataProvider, useAgentContext } from './context/AgentDataContext';
import './styles/global.css';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Sentinel — Dashboard',
  '/proofs': 'Sentinel — EIP-712 Proofs',
  '/trade-history': 'Sentinel — Trade History',
  '/reputation': 'Sentinel — Reputation',
  '/config': 'Sentinel — Config',
};

function AppContent() {
  const location = useLocation();
  const { connected } = useAgentContext();

  React.useEffect(() => {
    document.title = PAGE_TITLES[location.pathname] || 'Sentinel';
  }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Header />

      {!connected && (
        <div style={{
          background: 'var(--amber-bg)',
          color: 'var(--amber-text)',
          padding: '6px 24px',
          borderBottom: '0.5px solid var(--amber-mid)',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          position: 'sticky',
          top: 54,
          zIndex: 99,
        }}>
          WebSocket disconnected — polling for updates every 30s
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{
        marginLeft: 'var(--sidebar-width, 220px)',
        padding: 24,
        minHeight: 'calc(100vh - 54px)',
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/proofs" element={<Proofs />} />
          <Route path="/trade-history" element={<TradeHistory />} />
          <Route path="/reputation" element={<Reputation />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <MobileNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AgentDataProvider>
        <AppContent />
      </AgentDataProvider>
    </BrowserRouter>
  );
}
