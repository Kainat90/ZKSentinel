interface Props {
  state: 'running' | 'paused' | 'error';
  size?: number;
}

export function StatusDot({ state, size = 6 }: Props) {
  const colors: Record<string, string> = {
    running: 'var(--green-mid)',
    paused: 'var(--amber-mid)',
    error: 'var(--red-mid)',
  };

  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: colors[state],
      flexShrink: 0,
      animation: state === 'running' ? 'pulse 1.6s ease-in-out infinite' : undefined,
    }} />
  );
}
