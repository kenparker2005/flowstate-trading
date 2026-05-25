interface BadgeProps {
  label: string;
  variant?: 'win' | 'loss' | 'breakeven' | 'neutral';
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    win:       { background: '#DCFCE7', color: '#15803D' },
    loss:      { background: '#FEE2E2', color: '#B91C1C' },
    breakeven: { background: '#F3F4F6', color: '#4B5563' },
    neutral:   { background: '#F3F4F6', color: '#6B7280' },
  };

  return (
    <span style={{
      ...styles[variant],
      fontSize: 11,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 999,
      fontFamily: 'Inter, sans-serif',
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}
