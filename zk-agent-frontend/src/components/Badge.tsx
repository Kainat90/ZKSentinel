import React from 'react';

type Variant = 'green' | 'amber' | 'red' | 'purple' | 'blue' | 'brand' | 'gray';

interface Props {
  variant: Variant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  green:  { background: 'var(--green-bg)',  color: 'var(--green-text)' },
  amber:  { background: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  red:    { background: 'var(--red-bg)',    color: 'var(--red-text)' },
  purple: { background: 'var(--purple-bg)', color: 'var(--purple-text)' },
  blue:   { background: 'var(--blue-bg)',   color: 'var(--blue-text)' },
  brand:  { background: 'var(--brand-50)',  color: 'var(--brand-700)' },
  gray:   { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' },
};

export function Badge({ variant, children, style }: Props) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 10,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 500,
      fontSize: 11,
      whiteSpace: 'nowrap',
      ...variantStyles[variant],
      ...style,
    }}>
      {children}
    </span>
  );
}
