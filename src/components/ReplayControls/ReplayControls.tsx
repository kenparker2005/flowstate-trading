interface ReplayControlsProps {
  onAdvance: (bars: number) => void;
  onAutoPlay: () => void;
  onStop: () => void;
  isRunning: boolean;
  currentIndex: number;
  totalCandles: number;
}

export function ReplayControls({
  onAdvance,
  onAutoPlay,
  onStop,
  isRunning,
  currentIndex,
  totalCandles,
}: ReplayControlsProps) {
  const pct = Math.min((currentIndex / Math.max(totalCandles - 1, 1)) * 100, 100);

  return (
    <div style={{
      height: 48,
      flexShrink: 0,
      borderTop: '1px solid #F3F4F6',
      background: '#FAFAFA',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
      gap: 6,
      borderRadius: '0 0 16px 16px',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* Label */}
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#D1D5DB',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginRight: 4,
        flexShrink: 0,
      }}>
        Replay
      </span>

      {/* Step buttons */}
      <StepBtn onClick={() => onAdvance(1)}>+1</StepBtn>
      <StepBtn onClick={() => onAdvance(5)}>+5</StepBtn>
      <StepBtn onClick={() => onAdvance(15)}>+15</StepBtn>
      <StepBtn onClick={() => onAdvance(60)}>+1H</StepBtn>

      {isRunning ? (
        <button
          onClick={onStop}
          style={{
            ...btnBase,
            background: '#FEF2F2',
            color: '#EF4444',
            border: '1.5px solid #FCA5A5',
          }}
        >
          ■ Stop
        </button>
      ) : (
        <button
          onClick={onAutoPlay}
          style={{
            ...btnBase,
            background: '#EEF2FF',
            color: '#2962FF',
            border: '1.5px solid #A5B4FC',
          }}
        >
          ▶ Play
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 80, height: 4, background: '#E5E7EB', borderRadius: 999, flexShrink: 0, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2962FF, #6366F1)',
            borderRadius: 999,
            transition: 'width 0.1s',
          }} />
        </div>
        <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {(currentIndex + 1).toLocaleString()} / {totalCandles.toLocaleString()}
          <span style={{ color: '#D1D5DB', marginLeft: 5 }}>{pct.toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 10px',
  fontFamily: 'Inter, sans-serif',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 8,
  cursor: 'pointer',
  gap: 4,
  transition: 'opacity 0.12s',
  whiteSpace: 'nowrap',
};

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        background: '#FFFFFF',
        color: '#374151',
        border: '1.5px solid #E5E7EB',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        minWidth: 36,
      }}
    >
      {children}
    </button>
  );
}
