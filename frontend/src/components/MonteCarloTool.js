import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import MetricCard from './MetricCard';
import TickerManager from './TickerManager';

const API_BASE = '';

const fmt = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtK = (v) => {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return fmt(v);
};

// Custom SVG Fan Chart
const FanChart = ({ paths, initialInvestment }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width: Math.max(300, width), height: 320 });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!paths || paths.length === 0) return null;

  const { width, height } = dimensions;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find global min/max
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const path of paths) {
    for (const v of path) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  }

  const valRange = maxVal - minVal || 1;
  const nPoints = paths[0].length;

  const xScale = (i) => padding.left + (i / (nPoints - 1)) * chartW;
  const yScale = (v) => padding.top + chartH - ((v - minVal) / valRange) * chartH;

  const getColor = (path) => {
    const final = path[path.length - 1];
    if (final >= initialInvestment * 1.1) return 'rgba(16,185,129,0.35)';
    if (final < initialInvestment * 0.9) return 'rgba(239,68,68,0.35)';
    return 'rgba(148,163,184,0.25)';
  };

  // Y axis ticks
  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (i / yTicks) * valRange);

  // X axis ticks
  const xTicks = 5;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        {/* Grid lines */}
        {yTickVals.map((val, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={yScale(val)}
            x2={padding.left + chartW}
            y2={yScale(val)}
            stroke="#1f2937"
            strokeWidth={1}
          />
        ))}

        {/* Paths */}
        {paths.map((path, idx) => {
          const points = path
            .map((v, i) => `${xScale(i)},${yScale(v)}`)
            .join(' ');
          return (
            <polyline
              key={idx}
              points={points}
              fill="none"
              stroke={getColor(path)}
              strokeWidth={1}
            />
          );
        })}

        {/* Initial investment line */}
        <line
          x1={padding.left}
          y1={yScale(initialInvestment)}
          x2={padding.left + chartW}
          y2={yScale(initialInvestment)}
          stroke="#6366f1"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />

        {/* Y axis labels */}
        {yTickVals.map((val, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={yScale(val) + 4}
            textAnchor="end"
            fill="#64748b"
            fontSize={11}
          >
            {fmtK(val)}
          </text>
        ))}

        {/* X axis labels */}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const idx = Math.round((i / xTicks) * (nPoints - 1));
          const day = Math.round((idx / (nPoints - 1)) * (nPoints - 1));
          return (
            <text
              key={i}
              x={xScale(idx)}
              y={height - 8}
              textAnchor="middle"
              fill="#64748b"
              fontSize={11}
            >
              {`Day ${Math.round((day / (nPoints - 1)) * (paths[0].length - 1))}`}
            </text>
          );
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="#374151"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={padding.left + chartW}
          y2={padding.top + chartH}
          stroke="#374151"
          strokeWidth={1}
        />

        {/* Legend */}
        <circle cx={padding.left + 12} cy={padding.top + 12} r={4} fill="rgba(16,185,129,0.7)" />
        <text x={padding.left + 20} y={padding.top + 16} fill="#94a3b8" fontSize={10}>Gain (&gt;10%)</text>
        <circle cx={padding.left + 90} cy={padding.top + 12} r={4} fill="rgba(239,68,68,0.7)" />
        <text x={padding.left + 98} y={padding.top + 16} fill="#94a3b8" fontSize={10}>Loss (&gt;10%)</text>
        <circle cx={padding.left + 166} cy={padding.top + 12} r={4} fill="rgba(148,163,184,0.5)" />
        <text x={padding.left + 174} y={padding.top + 16} fill="#94a3b8" fontSize={10}>Neutral</text>
        <line
          x1={padding.left + 225}
          y1={padding.top + 12}
          x2={padding.left + 245}
          y2={padding.top + 12}
          stroke="#6366f1"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
        <text x={padding.left + 249} y={padding.top + 16} fill="#94a3b8" fontSize={10}>Initial</text>
      </svg>
    </div>
  );
};

// Histogram of final values
const buildHistogram = (values, bins = 30) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins;
  const counts = Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  return counts.map((count, i) => ({
    midpoint: min + (i + 0.5) * binWidth,
    start: min + i * binWidth,
    count,
  }));
};

const CustomHistTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div
        style={{
          background: '#1e2538',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#e2e8f0',
        }}
      >
        <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
          Around {fmt(d.midpoint)}
        </div>
        <div style={{ fontWeight: '600' }}>{d.count} simulations</div>
      </div>
    );
  }
  return null;
};

const sectionStyle = {
  marginBottom: '24px',
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

export default function MonteCarloTool() {
  const [tickers, setTickers] = useState(['AAPL', 'MSFT', 'GOOGL']);
  const [weights, setWeights] = useState([0.33, 0.33, 0.34]);
  const [investment, setInvestment] = useState(10000);
  const [days, setDays] = useState(252);
  const [simulations, setSimulations] = useState(500);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleTickersChange = useCallback((newTickers) => {
    setTickers(newTickers);
    if (newTickers.length === 0) {
      setWeights([]);
      return;
    }
    const equal = 1 / newTickers.length;
    const newWeights = Array(newTickers.length).fill(equal);
    // Make last weight absorb rounding error
    const sum = newWeights.slice(0, -1).reduce((a, b) => a + b, 0);
    newWeights[newWeights.length - 1] = Math.max(0, 1 - sum);
    setWeights(newWeights.map((w) => parseFloat(w.toFixed(4))));
  }, []);

  const handleWeightChange = (index, newPct) => {
    const newVal = Math.max(0, Math.min(100, parseFloat(newPct) || 0)) / 100;
    const newWeights = [...weights];
    newWeights[index] = newVal;

    // Normalize others proportionally
    const otherIndices = newWeights.map((_, i) => i).filter((i) => i !== index);
    const remaining = Math.max(0, 1 - newVal);
    const otherSum = otherIndices.reduce((s, i) => s + weights[i], 0);

    if (otherSum > 0) {
      otherIndices.forEach((i) => {
        newWeights[i] = (weights[i] / otherSum) * remaining;
      });
    } else if (otherIndices.length > 0) {
      const share = remaining / otherIndices.length;
      otherIndices.forEach((i) => {
        newWeights[i] = share;
      });
    }

    setWeights(newWeights);
  };

  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weightValid = Math.abs(weightSum - 1) < 0.02;

  const handleRun = async () => {
    if (tickers.length === 0) {
      setError('Add at least one ticker');
      return;
    }
    if (!weightValid) {
      setError(`Weights must sum to 100%. Current: ${(weightSum * 100).toFixed(1)}%`);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.post(`${API_BASE}/api/monte-carlo`, {
        tickers,
        weights,
        investment,
        days,
        simulations,
      });
      setResults(response.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to run simulation';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const histData = results ? buildHistogram(results.final_values, 30) : [];

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Left Panel - Configuration */}
      <div
        style={{
          width: '340px',
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
          Simulation Parameters
        </div>

        {/* Tickers */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Tickers</label>
          <TickerManager tickers={tickers} onChange={handleTickersChange} />
        </div>

        {/* Weights */}
        {tickers.length > 0 && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              Weights{' '}
              <span
                style={{
                  color: weightValid ? '#10b981' : '#f87171',
                  fontWeight: '400',
                  textTransform: 'none',
                  fontSize: '11px',
                }}
              >
                (sum: {(weightSum * 100).toFixed(1)}%)
              </span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickers.map((ticker, i) => (
                <div key={ticker}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: '600' }}>
                      {ticker}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={parseFloat((weights[i] * 100).toFixed(1))}
                        onChange={(e) => handleWeightChange(i, e.target.value)}
                        style={{
                          ...inputStyle,
                          width: '64px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          textAlign: 'right',
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={parseFloat((weights[i] * 100).toFixed(1))}
                    onChange={(e) => handleWeightChange(i, e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment Amount */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Investment Amount</label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '14px',
                pointerEvents: 'none',
              }}
            >
              $
            </span>
            <input
              type="number"
              min="100"
              max="100000000"
              step="100"
              value={investment}
              onChange={(e) => setInvestment(Math.max(100, parseInt(e.target.value) || 100))}
              style={{ ...inputStyle, paddingLeft: '24px' }}
              onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.target.style.borderColor = '#1f2937')}
            />
          </div>
        </div>

        {/* Time Horizon */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Time Horizon{' '}
            <span style={{ color: '#a5b4fc', fontWeight: '400', textTransform: 'none' }}>
              {days} days ({(days / 252).toFixed(1)} years)
            </span>
          </label>
          <input
            type="range"
            min="30"
            max="1260"
            step="21"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
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
            <span>30d</span>
            <span>1260d</span>
          </div>
        </div>

        {/* Simulations */}
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Simulations{' '}
            <span style={{ color: '#a5b4fc', fontWeight: '400', textTransform: 'none' }}>
              {simulations.toLocaleString()}
            </span>
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={simulations}
            onChange={(e) => setSimulations(parseInt(e.target.value))}
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
            <span>100</span>
            <span>2000</span>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={loading || tickers.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            background:
              loading || tickers.length === 0
                ? '#1f2937'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            borderRadius: '10px',
            color: loading || tickers.length === 0 ? '#4b5563' : '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading || tickers.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow:
              !loading && tickers.length > 0
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
              Running Simulation...
            </>
          ) : (
            'Run Simulation'
          )}
        </button>

        {/* Error */}
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#4b5563' }}>
              Configure and run a simulation
            </div>
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '8px' }}>
              Results will appear here
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
              Running {simulations.toLocaleString()} simulations...
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
              Fetching market data & computing paths
            </div>
          </div>
        )}

        {results && (
          <>
            {/* Metric Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <MetricCard
                title="Expected Final Value"
                value={fmt(results.expected_return)}
                subtitle={`${((results.expected_return / results.initial_investment - 1) * 100).toFixed(1)}% return`}
                color="#6366f1"
              />
              <MetricCard
                title="VaR 95% (5th Percentile)"
                value={fmt(results.var_95)}
                subtitle={`${((results.var_95 / results.initial_investment - 1) * 100).toFixed(1)}% vs initial`}
                color="#f59e0b"
              />
              <MetricCard
                title="VaR 99% (1st Percentile)"
                value={fmt(results.var_99)}
                subtitle={`${((results.var_99 / results.initial_investment - 1) * 100).toFixed(1)}% vs initial`}
                color="#ef4444"
              />
              <MetricCard
                title="Best Case"
                value={fmt(results.best_case)}
                subtitle={`${((results.best_case / results.initial_investment - 1) * 100).toFixed(1)}% return`}
                color="#10b981"
              />
            </div>

            {/* Fan Chart */}
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#f1f5f9',
                  marginBottom: '16px',
                }}
              >
                Simulation Paths
                <span
                  style={{
                    marginLeft: '10px',
                    fontSize: '12px',
                    color: '#64748b',
                    fontWeight: '400',
                  }}
                >
                  ({results.paths.length} paths shown)
                </span>
              </div>
              <FanChart
                paths={results.paths}
                initialInvestment={results.initial_investment}
              />
            </div>

            {/* Final Value Distribution */}
            <div
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#f1f5f9',
                  marginBottom: '16px',
                }}
              >
                Final Value Distribution
                <span
                  style={{
                    marginLeft: '10px',
                    fontSize: '12px',
                    color: '#64748b',
                    fontWeight: '400',
                  }}
                >
                  ({results.final_values.length} simulations)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={histData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis
                    dataKey="midpoint"
                    tickFormatter={fmtK}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomHistTooltip />} />
                  <ReferenceLine
                    x={results.initial_investment}
                    stroke="#6366f1"
                    strokeDasharray="4 2"
                    label={{ value: 'Initial', fill: '#6366f1', fontSize: 11 }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {histData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.midpoint >= results.initial_investment
                            ? 'rgba(16,185,129,0.7)'
                            : 'rgba(239,68,68,0.7)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
