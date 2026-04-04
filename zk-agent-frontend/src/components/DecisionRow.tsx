import React from 'react';
import type { Decision } from '../types';

interface Props {
  decision: Decision;
  index?: number;
  onClick?: () => void;
  clickable?: boolean;
}

const actionColor: Record<string, string> = {
  BUY: 'var(--green-mid)',
  SELL: 'var(--red-mid)',
  HOLD: 'var(--amber-mid)',
};

const actionBadge: Record<string, React.CSSProperties> = {
  BUY:  { background: 'var(--green-bg)', color: 'var(--green-text)' },
  SELL: { background: 'var(--red-bg)',   color: 'var(--red-text)' },
  HOLD: { background: 'var(--amber-bg)', color: 'var(--amber-text)' },
};

export function DecisionRow({ decision, index = 0, onClick, clickable }: Props) {
  const signalColor = actionColor[decision.action];

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: '0.5px solid var(--border-secondary)',
        borderLeft: `2.5px solid ${signalColor}`,
        animation: 'fadeSlideIn 0.2s ease forwards',
        animationDelay: `${index * 40}ms`,
        opacity: 0,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
      onMouseLeave={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <span style={{
        flexShrink: 0,
        marginTop: 1,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        fontSize: 11,
        ...actionBadge[decision.action],
      }}>
        {decision.action}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginTop: 2,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {decision.reasoning}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 40, height: 3,
              background: 'var(--border-primary)',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'inline-block',
            }}>
              <div style={{ height: '100%', width: `${decision.confidence}%`, backgroundColor: signalColor, borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>
              conf: {decision.confidence}%
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--text-tertiary)' }}>
            {decision.timeAgo}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 400, fontSize: 11, color: 'var(--green-text)' }}>
            EIP-712 ✓
          </span>
        </div>
      </div>
    </div>
  );
}
