import type { DeepPartial, ChartOptions, CandlestickStyleOptions, SeriesPartialOptions, Time } from 'lightweight-charts';

// ── Eastern Time helpers ──────────────────────────────────────────────────────

function nthSundayOfMonth(year: number, month: number, n: number): number {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const firstSunday = (7 - firstDay.getUTCDay()) % 7;
  return 1 + firstSunday + (n - 1) * 7;
}

// Returns Eastern Time UTC offset in seconds (negative — behind UTC)
function etOffsetSec(utcSec: number): number {
  const d = new Date(utcSec * 1000);
  const y = d.getUTCFullYear();

  // DST start: 2nd Sunday in March at 2:00 AM EST = 07:00 UTC
  const dstStart = Date.UTC(y, 2, nthSundayOfMonth(y, 2, 2), 7, 0, 0) / 1000;
  // DST end:   1st Sunday in November at 2:00 AM EDT = 06:00 UTC
  const dstEnd   = Date.UTC(y, 10, nthSundayOfMonth(y, 10, 1), 6, 0, 0) / 1000;

  return (utcSec >= dstStart && utcSec < dstEnd) ? -4 * 3600 : -5 * 3600;
}

// Shift a UTC unix timestamp to its Eastern equivalent for display
function toET(utcSec: number): Date {
  return new Date((utcSec + etOffsetSec(utcSec)) * 1000);
}

// TickMarkType numeric values from lightweight-charts const enum
// 0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function etTickMarkFormatter(time: Time, tickMarkType: number): string {
  const ts = time as number;

  if (tickMarkType === 3 || tickMarkType === 4) {
    // Time ticks — convert to Eastern
    const d = toET(ts);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return tickMarkType === 4
      ? `${h}:${m}:${String(d.getUTCSeconds()).padStart(2, '0')}`
      : `${h}:${m}`;
  }

  // Date ticks — keep UTC date (correct for D1/W1 trading day labels)
  const d = new Date(ts * 1000);
  if (tickMarkType === 0) return String(d.getUTCFullYear());
  if (tickMarkType === 1) return MONTHS_SHORT[d.getUTCMonth()];
  return String(d.getUTCDate()); // DayOfMonth
}

function etTimeFormatter(time: Time): string {
  const ts = time as number;
  const d = toET(ts);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Chart options ─────────────────────────────────────────────────────────────

export const chartOptions: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: '#FFFFFF' },
    textColor: '#6B7280',
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: '#F3F4F6', style: 0 },
    horzLines: { color: '#F3F4F6', style: 0 },
  },
  crosshair: {
    mode: 1,
    vertLine: {
      color: '#D1D5DB',
      width: 1,
      style: 3,
      labelBackgroundColor: '#374151',
    },
    horzLine: {
      color: '#D1D5DB',
      width: 1,
      style: 3,
      labelBackgroundColor: '#374151',
    },
  },
  rightPriceScale: {
    borderColor: '#F3F4F6',
    scaleMargins: { top: 0.1, bottom: 0.1 },
  },
  timeScale: {
    borderColor: '#F3F4F6',
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 100,
    fixLeftEdge: true,
    tickMarkFormatter: etTickMarkFormatter,
  },
  localization: {
    timeFormatter: etTimeFormatter,
  },
  handleScroll: { mouseWheel: true, pressedMouseMove: true },
  handleScale: { mouseWheel: true, pinch: true },
};

export const candlestickOptions: SeriesPartialOptions<CandlestickStyleOptions> = {
  upColor: '#10B981',
  downColor: '#EF4444',
  borderUpColor: '#10B981',
  borderDownColor: '#EF4444',
  wickUpColor: '#10B981',
  wickDownColor: '#EF4444',
};
