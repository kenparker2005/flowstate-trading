import type { DeepPartial, ChartOptions, CandlestickStyleOptions, SeriesPartialOptions } from 'lightweight-charts';

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
