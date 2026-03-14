import React, { useState } from 'react';
import MonteCarloTool from './components/MonteCarloTool';
import PortfolioOptimizer from './components/PortfolioOptimizer';

const TABS = [
  { id: 'montecarlo', label: 'Monte Carlo Simulation' },
  { id: 'optimizer', label: 'Portfolio Optimization' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('montecarlo');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1a1f35 100%)',
          borderBottom: '1px solid #1f2937',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: '700',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              F
            </div>
            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#f1f5f9',
                  letterSpacing: '-0.02em',
                }}
              >
                FinDash Pro
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.05em' }}>
                QUANTITATIVE ANALYTICS
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav style={{ display: 'flex', gap: '4px' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.15s ease',
                  background:
                    activeTab === tab.id
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#94a3b8',
                  boxShadow:
                    activeTab === tab.id ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = '#1f2937';
                    e.target.style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#94a3b8';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
              }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>Live Data</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {activeTab === 'montecarlo' && <MonteCarloTool />}
        {activeTab === 'optimizer' && <PortfolioOptimizer />}
      </main>
    </div>
  );
}
