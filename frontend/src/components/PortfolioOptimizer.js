import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import MetricCard from './MetricCard';
import TickerManager from './TickerManager';

const API_BASE = '';

const fmtPct = (v) => `${(v * 100).toFixed(2)}%`;
const fmtPct2 = (v) => `${v.toFixed(2)}%`;

// Viridis-like color scale: dark purple → blue → teal → green → yellow
const VIRIDIS = [
  [68,  1,  84],
  [72,  40, 120],
  [62,  83, 160],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [110, 206, 88],
  [181, 222, 43],
  [253, 231, 37],
];

const viridisColor = (t) => {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (VIRIDIS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, VIRIDIS.length - 1);
  const f = idx - lo;
  const [r1, g1, b1] = VIRIDIS[lo];
  const [r2, g2, b2] = VIRIDIS[hi];
  return `rgb(${Math.round(r1 + f * (r2 - r1))},${Math.round(g1 + f * (g2 - g1))},${Math.round(b1 + f * (b2 - b1))})`;
};

const sharpeColor = (sharpe, minS, maxS) =>
  viridisColor(maxS === minS ? 0.5 : (sharpe - minS) / (maxS - minS));

// Custom SVG Efficient Frontier chart with colorbar
const FrontierChart = ({ data, minVarPoint, maxSharpePoint }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 380 });
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setSize({ width: Math.max(320, width), height: 380 });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const { width, height } = size;
  const pad = { top: 20, right: 80, bottom: 50, left: 60 };
  const colorBarW = 16;
  const colorBarX = width - pad.right + 24;
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const xVals = data.map((d) => d.volatility);
  const yVals = data.map((d) => d.return);
  const sharpes = data.map((d) => d.sharpe);
  const minX = Math.min(...xVals), maxX = Math.max(...xVals);
  const minY = Math.min(...yVals), maxY = Math.max(...yVals);
  const minS = Math.min(...sharpes), maxS = Math.max(...sharpes);

  const xPadding = (maxX - minX) * 0.05 || 0.01;
  const yPadding = (maxY - minY) * 0.05 || 0.01;
  const x0 = minX - xPadding, x1 = maxX + xPadding;
  const y0 = minY - yPadding, y1 = maxY + yPadding;

  const px = (v) => pad.left + ((v - x0) / (x1 - x0)) * chartW;
  const py = (v) => pad.top + (1 - (v - y0) / (y1 - y0)) * chartH;

  // Axis ticks
  const xTicks = 5, yTicks = 5;
  const xTickVals = Array.from({ length: xTicks + 1 }, (_, i) => x0 + (i / xTicks) * (x1 - x0));
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => y0 + (i / yTicks) * (y1 - y0));

  // Colorbar gradient stops
  const colorBarStops = Array.from({ length: 10 }, (_, i) => {
    const t = 1 - i / 9;
    return <stop key={i} offset={`${((1 - t) * 100).toFixed(0)}%`} stopColor={viridisColor(t)} />;
  });

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Find nearest point
    let best = null, bestDist = 100;
    data.forEach((d, i) => {
      const dx = px(d.volatility) - mx;
      const dy = py(d.return) - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { bestDist = dist; best = { ...d, sx: px(d.volatility), sy: py(d.return) }; }
    });
    setTooltip(best ? { ...best, mx, my } : null);
  }, [data, px, py]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="viridisBar" x1="0" y1="0" x2="0" y2="1">
            {colorBarStops}
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={pad.left} y={pad.top} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Grid */}
        {xTickVals.map((v, i) => (
          <line key={`xg${i}`} x1={px(v)} y1={pad.top} x2={px(v)} y2={pad.top + chartH} stroke="#1e2a3a" strokeWidth={1} />
        ))}
        {yTickVals.map((v, i) => (
          <line key={`yg${i}`} x1={pad.left} y1={py(v)} x2={pad.left + chartW} y2={py(v)} stroke="#1e2a3a" strokeWidth={1} />
        ))}

        {/* Dots */}
        <g clipPath="url(#chartClip)">
          {data.map((d, i) => (
            <circle
              key={i}
              cx={px(d.volatility)}
              cy={py(d.return)}
              r={2.5}
              fill={sharpeColor(d.sharpe, minS, maxS)}
              fillOpacity={0.85}
            />
          ))}

          {/* Min Variance */}
          {minVarPoint && (
            <g>
              <circle cx={px(minVarPoint.volatility)} cy={py(minVarPoint.return)} r={10} fill="none" stroke="#fff" strokeWidth={2} />
              <circle cx={px(minVarPoint.volatility)} cy={py(minVarPoint.return)} r={5} fill="#fff" />
            </g>
          )}

          {/* Max Sharpe star */}
          {maxSharpePoint && (() => {
            const cx = px(maxSharpePoint.volatility), cy = py(maxSharpePoint.return);
            const R = 10, r = 5, n = 5;
            const pts = Array.from({ length: n * 2 }, (_, i) => {
              const angle = (Math.PI / n) * i - Math.PI / 2;
              const rad = i % 2 === 0 ? R : r;
              return `${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`;
            }).join(' ');
            return (
              <g>
                <circle cx={cx} cy={cy} r={14} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeOpacity={0.4} />
                <polygon points={pts} fill="#f59e0b" stroke="#d97706" strokeWidth={1.5} />
              </g>
            );
          })()}
        </g>

        {/* Axes */}
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="#374151" strokeWidth={1.5} />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + chartH} stroke="#374151" strokeWidth={1.5} />

        {/* X ticks */}
        {xTickVals.map((v, i) => (
          <text key={i} x={px(v)} y={pad.top + chartH + 18} textAnchor="middle" fill="#64748b" fontSize={11}>
            {(v * 100).toFixed(0)}%
          </text>
        ))}
        {/* Y ticks */}
        {yTickVals.map((v, i) => (
          <text key={i} x={pad.left - 8} y={py(v) + 4} textAnchor="end" fill="#64748b" fontSize={11}>
            {(v * 100).toFixed(0)}%
          </text>
        ))}

        {/* Axis labels */}
        <text x={pad.left + chartW / 2} y={height - 4} textAnchor="middle" fill="#94a3b8" fontSize={12} fontWeight="500">
          Volatility (Std Dev)
        </text>
        <text
          x={-(pad.top + chartH / 2)}
          y={14}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          fontWeight="500"
          transform="rotate(-90)"
        >
          Expected Returns
        </text>

        {/* Colorbar */}
        <rect x={colorBarX} y={pad.top} width={colorBarW} height={chartH} fill="url(#viridisBar)" rx={2} />
        <rect x={colorBarX} y={pad.top} width={colorBarW} height={chartH} fill="none" stroke="#374151" strokeWidth={1} rx={2} />
        {/* Colorbar ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = (minS + t * (maxS - minS)).toFixed(2);
          const yt = pad.top + (1 - t) * chartH;
          return (
            <g key={t}>
              <line x1={colorBarX + colorBarW} y1={yt} x2={colorBarX + colorBarW + 4} y2={yt} stroke="#64748b" strokeWidth={1} />
              <text x={colorBarX + colorBarW + 7} y={yt + 4} fill="#64748b" fontSize={10}>{val}</text>
            </g>
          );
        })}
        <text
          x={colorBarX + colorBarW / 2}
          y={pad.top - 6}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
        >
          Sharpe
        </text>

        {/* Legend */}
        <circle cx={pad.left + 12} cy={pad.top + 12} r={5} fill="#fff" stroke="#6366f1" strokeWidth={1.5} />
        <text x={pad.left + 22} y={pad.top + 16} fill="#94a3b8" fontSize={10}>Min Variance</text>
        <polygon
          points={`${pad.left + 110},${pad.top + 7} ${pad.left + 116},${pad.top + 17} ${pad.left + 104},${pad.top + 17}`}
          fill="#f59e0b"
        />
        <text x={pad.left + 122} y={pad.top + 16} fill="#94a3b8" fontSize={10}>Max Sharpe</text>
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.mx + 12,
          top: tooltip.my - 10,
          background: '#0f172a',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '12px',
          color: '#e2e8f0',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div>Vol: <b>{fmtPct2(tooltip.volatility * 100)}</b></div>
          <div>Ret: <b>{fmtPct2(tooltip.return * 100)}</b></div>
          <div style={{ color: viridisColor((tooltip.sharpe - (Math.min(...data.map(d=>d.sharpe)))) / ((Math.max(...data.map(d=>d.sharpe))) - (Math.min(...data.map(d=>d.sharpe)))) || 0.5) }}>
            Sharpe: <b>{tooltip.sharpe.toFixed(3)}</b>
          </div>
        </div>
      )}
    </div>
  );
};

const WeightsTable = ({ title, portfolio, color }) => {
  if (!portfolio) return null;
  const entries = Object.entries(portfolio.weights).sort((a, b) => b[1] - a[1]);
  const maxWeight = Math.max(...entries.map(([, w]) => w));

  return (
    <div
      style={{
        flex: 1,
        background: '#0f172a',
        border: `1px solid ${color}30`,
        borderTop: `3px solid ${color}`,
        borderRadius: '12px',
        padding: '20px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: '700',
          color: '#f1f5f9',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            flexShrink: 0,
          }}
        />
        {title}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                fontSize: '10px',
                color: '#64748b',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                paddingBottom: '8px',
                borderBottom: '1px solid #1f2937',
              }}
            >
              Ticker
            </th>
            <th
              style={{
                textAlign: 'right',
                fontSize: '10px',
                color: '#64748b',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                paddingBottom: '8px',
                borderBottom: '1px solid #1f2937',
              }}
            >
              Weight
            </th>
            <th
              style={{
                textAlign: 'left',
                fontSize: '10px',
                color: '#64748b',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                paddingBottom: '8px',
                borderBottom: '1px solid #1f2937',
                paddingLeft: '12px',
                width: '40%',
              }}
            >
              Allocation
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([ticker, weight]) => (
            <tr key={ticker}>
              <td
                style={{
                  padding: '10px 0',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#a5b4fc',
                  borderBottom: '1px solid #111827',
                }}
              >
                {ticker}
              </td>
              <td
                style={{
                  padding: '10px 0',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  textAlign: 'right',
                  borderBottom: '1px solid #111827',
                }}
              >
                {(weight * 100).toFixed(1)}%
              </td>
              <td
                style={{
                  padding: '10px 0 10px 12px',
                  borderBottom: '1px solid #111827',
                }}
              >
                <div
                  style={{
                    height: '6px',
                    background: '#1f2937',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(weight / maxWeight) * 100}%`,
                      background: `linear-gradient(90deg, ${color}99, ${color})`,
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: '#0a0e1a',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};

export default function PortfolioOptimizer() {
  const [tickers, setTickers] = useState(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2024-01-01');
  const [numPortfolios, setNumPortfolios] = useState(3000);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    if (tickers.length < 2) {
      setError('Add at least 2 tickers');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(`${API_BASE}/api/optimize`, {
        tickers,
        start_date: startDate,
        end_date: endDate,
        num_portfolios: numPortfolios,
      });
      setResults(response.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to optimize portfolio';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Prepare scatter data
  let scatterData = [];

  if (results) {
    scatterData = results.frontier.map((p) => ({
      volatility: p.volatility,
      return: p.return,
      sharpe: p.sharpe,
    }));
  }

  const minVarPoint = results
    ? { volatility: results.min_variance.volatility, return: results.min_variance.return, sharpe: results.min_variance.sharpe }
    : null;

  const maxSharpePoint = results
    ? { volatility: results.max_sharpe.volatility, return: results.max_sharpe.return, sharpe: results.max_sharpe.sharpe }
    : null;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Left Panel - Configuration */}
      <div
        style={{
          width: '300px',
          flexShrink: 0,
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#f1f5f9',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '1px solid #1f2937',
          }}
        >
          Optimization Parameters
        </div>

        {/* Tickers */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Tickers (min 2)</label>
          <TickerManager tickers={tickers} onChange={setTickers} />
        </div>

        {/* Date Range */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = '#1f2937')}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.target.style.borderColor = '#1f2937')}
          />
        </div>

        {/* Number of Portfolios */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>
            Portfolios{' '}
            <span style={{ color: '#a5b4fc', fontWeight: '400', textTransform: 'none' }}>
              {numPortfolios.toLocaleString()}
            </span>
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={numPortfolios}
            onChange={(e) => setNumPortfolios(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#4b5563',
              marginTop: '4px',
            }}
          >
            <span>500</span>
            <span>5,000</span>
          </div>
        </div>

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={loading || tickers.length < 2}
          style={{
            width: '100%',
            padding: '12px',
            background:
              loading || tickers.length < 2
                ? '#1f2937'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            borderRadius: '10px',
            color: loading || tickers.length < 2 ? '#4b5563' : '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading || tickers.length < 2 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow:
              !loading && tickers.length >= 2
                ? '0 4px 16px rgba(99,102,241,0.35)'
                : 'none',
          }}
        >
          {loading ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Optimizing...
            </>
          ) : (
            'Optimize Portfolio'
          )}
        </button>

        {error && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#f87171',
            }}
          >
            {error}
          </div>
        )}

      </div>

      {/* Right Panel - Results */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!results && !loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '16px',
              color: '#374151',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#374151"
              strokeWidth="1.5"
              style={{ marginBottom: '16px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#4b5563' }}>
              Configure and run optimization
            </div>
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '8px' }}>
              Efficient frontier will appear here
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '16px',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
              Generating {numPortfolios.toLocaleString()} portfolios...
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
              Computing efficient frontier
            </div>
          </div>
        )}

        {results && (
          <>
            {/* Metric Cards - two rows */}
            <div style={{ marginBottom: '24px' }}>
              {/* Row 1: Min Variance */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                  }}
                />
                Minimum Variance Portfolio
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <MetricCard
                  title="Volatility"
                  value={fmtPct(results.min_variance.volatility)}
                  subtitle="Annualized std deviation"
                  color="#94a3b8"
                />
                <MetricCard
                  title="Expected Return"
                  value={fmtPct(results.min_variance.return)}
                  subtitle="Annualized return"
                  color="#60a5fa"
                />
                <MetricCard
                  title="Sharpe Ratio"
                  value={results.min_variance.sharpe.toFixed(3)}
                  subtitle="Return / Volatility"
                  color="#818cf8"
                />
              </div>

              {/* Row 2: Max Sharpe */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    boxShadow: '0 0 8px rgba(245,158,11,0.6)',
                  }}
                />
                Maximum Sharpe Portfolio
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                <MetricCard
                  title="Volatility"
                  value={fmtPct(results.max_sharpe.volatility)}
                  subtitle="Annualized std deviation"
                  color="#94a3b8"
                />
                <MetricCard
                  title="Expected Return"
                  value={fmtPct(results.max_sharpe.return)}
                  subtitle="Annualized return"
                  color="#34d399"
                />
                <MetricCard
                  title="Sharpe Ratio"
                  value={results.max_sharpe.sharpe.toFixed(3)}
                  subtitle="Return / Volatility"
                  color="#f59e0b"
                />
              </div>
            </div>

            {/* Efficient Frontier Chart */}
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '16px' }}>
                Efficient Frontier
                <span style={{ marginLeft: '10px', fontSize: '11px', color: '#64748b', fontWeight: '400' }}>
                  X: Volatility — Y: Expected Return — Color: Sharpe Ratio
                </span>
              </div>

              <FrontierChart
                data={scatterData}
                minVarPoint={minVarPoint}
                maxSharpePoint={maxSharpePoint}
              />
            </div>

            {/* Optimal Weights Tables */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <WeightsTable
                title="Min Variance Portfolio"
                portfolio={results.min_variance}
                color="#94a3b8"
              />
              <WeightsTable
                title="Max Sharpe Portfolio"
                portfolio={results.max_sharpe}
                color="#f59e0b"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
