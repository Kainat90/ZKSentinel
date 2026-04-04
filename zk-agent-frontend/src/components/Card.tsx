import React from 'react';

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function Card({ children, style, className }: Props) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-primary)',
        border: '0.5px solid var(--border-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>
        {title}
      </span>
      {right}
    </div>
  );
}
