import React from 'react';

interface Props {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
}

export function MetricCard({ label, value, sub, subColor }: Props) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
    }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 20, lineHeight: 1.0 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 11, color: subColor || 'var(--text-tertiary)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
