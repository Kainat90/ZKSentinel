import type { Proof } from '../types';

interface Props {
  proof: Proof;
}

export function ProofRow({ proof }: Props) {
  const isPass = proof.status === 'PASS';
  const truncated = `${proof.hash.slice(0, 7)}…${proof.hash.slice(-4)}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      borderRadius: 'var(--radius-md)',
      border: '0.5px solid var(--border-secondary)',
      opacity: isPass ? 1 : 0.55,
    }}>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isPass ? 'var(--green-bg)' : 'var(--red-bg)',
        color: isPass ? 'var(--green-text)' : 'var(--red-text)',
        fontSize: 11,
        fontFamily: "'DM Mono', monospace",
        animation: isPass ? 'popIn 0.3s ease' : undefined,
      }}>
        {isPass ? '✓' : '✕'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontWeight: 400,
          fontSize: 11,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {truncated}
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          marginTop: 1,
        }}>
          {proof.decision} · {new Date(proof.timestamp).toLocaleTimeString()} · {proof.rule}
        </div>
      </div>

      <span style={{
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        fontSize: 11,
        color: isPass ? 'var(--green-text)' : 'var(--red-text)',
      }}>
        {proof.status}
      </span>
    </div>
  );
}
