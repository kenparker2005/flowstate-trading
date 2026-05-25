import { useState } from 'react';

export interface DayStat {
  sessionCount: number;
  tradeCount: number;
  wins: number;
  totalPts: number;
}

interface CalendarHeatmapProps {
  data: Record<string, DayStat>; // keyed by YYYY-MM-DD
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const CELL_SIZE = 30;
const CELL_GAP = 4;

function getColor(count: number): string {
  if (count === 0) return '#F1F3F5';
  if (count <= 2) return '#BFDBFE';
  if (count <= 4) return '#60A5FA';
  return '#2563EB';
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// Return [{year, month}] for the last N months including current
function getLastNMonths(n: number): { year: number; month: number }[] {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

interface TooltipState {
  date: string;
  stat: DayStat;
  x: number;
  y: number;
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const months = getLastNMonths(4);
  const todayStr = toLocalDateStr(new Date());

  function handleCellEnter(e: React.MouseEvent, date: string, stat: DayStat | undefined) {
    if (!stat || stat.sessionCount === 0) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      date,
      stat,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function handleCellLeave() {
    setTooltip(null);
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Month grid — 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
      }}>
        {months.map(({ year, month }) => {
          const totalDays = daysInMonth(year, month);
          const startDow = firstDayOfWeek(year, month); // 0=Sun
          // Build cell array: null = empty padding, string = YYYY-MM-DD
          const cells: (string | null)[] = [
            ...Array(startDow).fill(null),
            ...Array.from({ length: totalDays }, (_, i) => {
              const d = String(i + 1).padStart(2, '0');
              const m = String(month + 1).padStart(2, '0');
              return `${year}-${m}-${d}`;
            }),
          ];
          // Pad to full weeks
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div key={`${year}-${month}`} style={{
              background: '#fff',
              borderRadius: 16,
              padding: '20px 20px 16px',
              border: '1px solid #F3F4F6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              {/* Month name */}
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 12 }}>
                {MONTH_NAMES[month]} {year}
              </div>

              {/* Day-of-week header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`,
                gap: CELL_GAP,
                marginBottom: CELL_GAP,
              }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textAlign: 'center',
                    lineHeight: `${CELL_SIZE}px`,
                    letterSpacing: '0.02em',
                  }}>
                    {d[0]}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`,
                gap: CELL_GAP,
              }}>
                {cells.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                  }
                  const stat = data[date];
                  const count = stat?.sessionCount ?? 0;
                  const isToday = date === todayStr;
                  const dayNum = parseInt(date.slice(8), 10);

                  return (
                    <div
                      key={date}
                      onMouseEnter={e => handleCellEnter(e, date, stat)}
                      onMouseLeave={handleCellLeave}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 6,
                        background: getColor(count),
                        outline: isToday ? '2px solid #2962FF' : 'none',
                        outlineOffset: 1,
                        cursor: count > 0 ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.1s, filter 0.1s',
                        position: 'relative',
                      }}
                      onMouseDown={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.92)'; }}
                      onMouseUp={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                    >
                      <span style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: count >= 3 ? 'rgba(255,255,255,0.8)' : '#9CA3AF',
                        userSelect: 'none',
                        lineHeight: 1,
                      }}>
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', marginRight: 2 }}>No sessions</span>
        {[0, 1, 3, 5].map(n => (
          <div key={n} style={{ width: 14, height: 14, borderRadius: 3, background: getColor(n) }} />
        ))}
        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 2 }}>5+ sessions</span>
      </div>

      {/* Floating tooltip — fixed so it's never clipped */}
      {tooltip && (
        <TooltipCard tooltip={tooltip} />
      )}
    </div>
  );
}

function TooltipCard({ tooltip }: { tooltip: TooltipState }) {
  const { date, stat, x, y } = tooltip;
  const winRate = stat.tradeCount > 0
    ? ((stat.wins / stat.tradeCount) * 100).toFixed(0)
    : '—';
  const ptsSign = stat.totalPts >= 0 ? '+' : '';
  const [month, day] = (() => {
    const d = new Date(date + 'T12:00:00');
    return [
      d.toLocaleDateString('en-US', { month: 'short' }),
      d.getDate(),
    ];
  })();

  return (
    <div style={{
      position: 'fixed',
      left: x,
      top: y - 12,
      transform: 'translate(-50%, -100%)',
      background: '#111827',
      color: '#fff',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: 12,
      fontFamily: 'Inter, sans-serif',
      zIndex: 9999,
      pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      minWidth: 160,
      whiteSpace: 'nowrap',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#F9FAFB' }}>
        {month} {day}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TooltipRow label="Sessions" value={String(stat.sessionCount)} />
        <TooltipRow label="Trades" value={String(stat.tradeCount)} />
        <TooltipRow label="Win rate" value={stat.tradeCount > 0 ? `${winRate}%` : '—'} />
        <TooltipRow
          label="Total pts"
          value={stat.tradeCount > 0 ? `${ptsSign}${stat.totalPts.toFixed(2)}` : '—'}
          color={stat.totalPts > 0 ? '#6EE7B7' : stat.totalPts < 0 ? '#FCA5A5' : undefined}
        />
      </div>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        bottom: -6,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 12,
        height: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 12,
          height: 12,
          background: '#111827',
          transform: 'rotate(45deg)',
          marginTop: -6,
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function TooltipRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? '#F9FAFB' }}>{value}</span>
    </div>
  );
}
