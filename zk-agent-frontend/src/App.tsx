import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './pages/Dashboard';
import { ZKProofs } from './pages/ZKProofs';
import { TradeHistory } from './pages/TradeHistory';
import { Reputation } from './pages/Reputation';
import { Config } from './pages/Config';
import { AgentDataProvider, useAgentContext } from './context/AgentDataContext';
import './styles/global.css';

const PAGE_TITLES: Record<string, string> = {
  '/': 'ZK Agent — Dashboard',
  '/zk-proofs': 'ZK Agent — ZK Proofs',
  '/trade-history': 'ZK Agent — Trade History',
  '/reputation': 'ZK Agent — Reputation',
  '/config': 'ZK Agent — Config',
};

function AppContent() {
  const location = useLocation();
  const { connected } = useAgentContext();

  React.useEffect(() => {
    document.title = PAGE_TITLES[location.pathname] || 'ZK Agent';
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
          <Route path="/zk-proofs" element={<ZKProofs />} />
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
