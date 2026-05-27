import { useRef, useEffect } from 'react';
import { useChart } from './useChart';
import { DrawingCanvas } from './DrawingCanvas';
import type { Candle, ActiveTrade, TradeResult } from '../../types';

interface ChartContainerProps {
  candles: Candle[];
  resetVersion: number;
  activeTrade: ActiveTrade | null;
  lastResult: TradeResult | null;
  revealDate: boolean;
  clearSignal: number;
}

export function ChartContainer({ candles, resetVersion, activeTrade, lastResult, clearSignal }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { chartRef, seriesRef, updateCandles, appendCandle, fitContent, drawTradeLines, addMarker } = useChart(containerRef);
  const prevCandleCount  = useRef(0);
  const prevResetVersion = useRef(-1);
  const entryMarkerSet   = useRef(false);

  useEffect(() => {
    const newLen = candles.length;
    const prevLen = prevCandleCount.current;
    if (newLen === 0) return;

    const isFullReload = resetVersion !== prevResetVersion.current || prevLen === 0;

    if (isFullReload) {
      // Initial load, TF switch, or new session — replace all series data and fit
      updateCandles(candles);
      fitContent();
      prevResetVersion.current = resetVersion;
      prevCandleCount.current  = newLen;
    } else if (newLen > prevLen) {
      // Incremental advance — append only new candle(s) without disturbing zoom
      for (let i = prevLen; i < newLen; i++) {
        appendCandle(candles[i]);
      }
      prevCandleCount.current = newLen;
    }
  }, [candles, resetVersion, updateCandles, appendCandle, fitContent]);

  useEffect(() => {
    drawTradeLines(activeTrade);
    if (activeTrade && !entryMarkerSet.current) {
      const entryCandle = candles[activeTrade.entryBar];
      if (entryCandle) {
        addMarker(entryCandle.time, 'entry', activeTrade.direction);
        entryMarkerSet.current = true;
      }
    }
    if (!activeTrade) entryMarkerSet.current = false;
  }, [activeTrade, candles, drawTradeLines, addMarker]);

  useEffect(() => {
    if (lastResult) {
      const exitCandle = candles[lastResult.exitBar];
      if (exitCandle) addMarker(exitCandle.time, 'exit', lastResult.direction, lastResult.outcome);
    }
  }, [lastResult, candles, addMarker]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Lightweight-charts mounts here */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* Drawing overlay + toolbar */}
      <DrawingCanvas chartRef={chartRef} seriesRef={seriesRef} clearSignal={clearSignal} />
    </div>
  );
}
