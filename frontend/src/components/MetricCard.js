import React from 'react';

export default function MetricCard({ title, value, subtitle, color = '#6366f1' }) {
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderTop: `3px solid ${color}`,
        borderRadius: '12px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: `linear-gradient(180deg, ${color}10 0%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          fontSize: '10px',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '10px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: color,
          marginBottom: '6px',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: '12px',
            color: '#64748b',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
