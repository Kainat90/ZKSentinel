import { useEffect, useState } from 'react';

interface Props {
  value: number;
  color: string;
  height?: number;
}

export function ProgressBar({ value, color, height = 5 }: Props) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 50);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div style={{
      background: 'var(--border-primary)',
      borderRadius: 3,
      height,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        backgroundColor: color,
        borderRadius: 3,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}
