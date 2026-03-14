import React, { useState } from 'react';

export default function TickerManager({ tickers, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const ticker = inputValue.trim().toUpperCase();
    if (!ticker) {
      setError('Enter a ticker symbol');
      return;
    }
    if (tickers.includes(ticker)) {
      setError(`${ticker} is already added`);
      return;
    }
    if (ticker.length > 10) {
      setError('Ticker symbol too long');
      return;
    }
    onChange([...tickers, ticker]);
    setInputValue('');
    setError('');
  };

  const handleRemove = (ticker) => {
    onChange(tickers.filter((t) => t !== ticker));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div>
      {/* Ticker chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
          minHeight: '36px',
        }}
      >
        {tickers.map((ticker) => (
          <div
            key={ticker}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px 4px 12px',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#a5b4fc',
              letterSpacing: '0.03em',
            }}
          >
            {ticker}
            <button
              onClick={() => handleRemove(ticker)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(99,102,241,0.3)',
                color: '#a5b4fc',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                lineHeight: 1,
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239,68,68,0.5)';
                e.target.style.color = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(99,102,241,0.3)';
                e.target.style.color = '#a5b4fc';
              }}
              title={`Remove ${ticker}`}
            >
              ×
            </button>
          </div>
        ))}
        {tickers.length === 0 && (
          <span style={{ fontSize: '12px', color: '#4b5563', fontStyle: 'italic' }}>
            No tickers added
          </span>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value.toUpperCase());
            setError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. TSLA"
          maxLength={10}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#0a0e1a',
            border: `1px solid ${error ? '#ef4444' : '#1f2937'}`,
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
            fontFamily: 'inherit',
            letterSpacing: '0.05em',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#6366f1';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#1f2937';
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          + Add
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#f87171',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
