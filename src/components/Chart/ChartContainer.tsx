import { useRef, useEffect } from 'react';
import { useChart } from './useChart';
import type { Candle, ActiveTrade, TradeResult } from '../../types';

interface ChartContainerProps {
  candles: Candle[];
  activeTrade: ActiveTrade | null;
  lastResult: TradeResult | null;
  revealDate: boolean;
}

export function ChartContainer({ candles, activeTrade, lastResult }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateCandles, drawTradeLines, addMarker } = useChart(containerRef);
  const prevCandleCount = useRef(0);
  const entryMarkerSet = useRef(false);

  useEffect(() => {
    if (candles.length !== prevCandleCount.current) {
      updateCandles(candles);
      prevCandleCount.current = candles.length;
    }
  }, [candles, updateCandles]);

  useEffect(() => {
    drawTradeLines(activeTrade);
    if (activeTrade && !entryMarkerSet.current) {
      const entryCandle = candles[activeTrade.entryBar];
      if (entryCandle) {
        addMarker(entryCandle.time, 'entry', activeTrade.direction);
        entryMarkerSet.current = true;
      }
    }
    if (!activeTrade) {
      entryMarkerSet.current = false;
    }
  }, [activeTrade, candles, drawTradeLines, addMarker]);

  useEffect(() => {
    if (lastResult) {
      const exitCandle = candles[lastResult.exitBar];
      if (exitCandle) {
        addMarker(exitCandle.time, 'exit', lastResult.direction, lastResult.outcome);
      }
    }
  }, [lastResult, candles, addMarker]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
