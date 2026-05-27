import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  type IPriceLine,
  type CreatePriceLineOptions,
  type ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import { chartOptions, candlestickOptions } from './chartConfig';
import type { Candle, ActiveTrade } from '../../types';

export function useChart(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      ...chartOptions,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    const series = chart.addSeries(CandlestickSeries, candlestickOptions);
    const markersPlugin = createSeriesMarkers(series);
    chartRef.current = chart;
    seriesRef.current = series;
    markersPluginRef.current = markersPlugin;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [containerRef]);

  const updateCandles = useCallback((candles: Candle[]) => {
    if (!seriesRef.current) return;
    const data: CandlestickData[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    seriesRef.current.setData(data);
  }, []);

  const appendCandle = useCallback((candle: Candle) => {
    seriesRef.current?.update({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });
  }, []);

  const fitContent = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
  }, [chartRef]);

  const addMarker = useCallback((
    time: number,
    type: 'entry' | 'exit',
    direction: 'long' | 'short',
    outcome?: 'win' | 'loss' | 'breakeven'
  ) => {
    if (!markersPluginRef.current) return;

    let color = '#2962FF';
    let shape: SeriesMarker<Time>['shape'] = 'arrowUp';
    let text = 'ENTRY';

    if (type === 'entry') {
      color = '#2962FF';
      shape = direction === 'long' ? 'arrowUp' : 'arrowDown';
      text = direction === 'long' ? 'BUY' : 'SELL';
    } else {
      color = outcome === 'win' ? '#26A69A' : outcome === 'loss' ? '#EF5350' : '#787B86';
      shape = outcome === 'win' ? 'arrowUp' : 'arrowDown';
      text = outcome === 'win' ? 'WIN' : outcome === 'loss' ? 'LOSS' : 'BE';
    }

    const existing = markersPluginRef.current.markers() ?? [];
    const newMarker: SeriesMarker<Time> = {
      time: time as Time,
      position: direction === 'long' ? 'belowBar' : 'aboveBar',
      color,
      shape,
      text,
    };
    markersPluginRef.current.setMarkers([...existing, newMarker]);
  }, []);

  const drawTradeLines = useCallback((trade: ActiveTrade | null) => {
    if (!seriesRef.current) return;

    if (slLineRef.current) {
      seriesRef.current.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      seriesRef.current.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }
    if (entryLineRef.current) {
      seriesRef.current.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }

    if (!trade) return;

    const slOpts: CreatePriceLineOptions = {
      price: trade.stopLoss,
      color: '#EF5350',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'SL',
    };
    const tpOpts: CreatePriceLineOptions = {
      price: trade.takeProfit,
      color: '#26A69A',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'TP',
    };
    const entryOpts: CreatePriceLineOptions = {
      price: trade.entryPrice,
      color: '#2962FF',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'ENTRY',
    };

    slLineRef.current = seriesRef.current.createPriceLine(slOpts);
    tpLineRef.current = seriesRef.current.createPriceLine(tpOpts);
    entryLineRef.current = seriesRef.current.createPriceLine(entryOpts);
  }, []);

  const clearMarkers = useCallback(() => {
    markersPluginRef.current?.setMarkers([]);
  }, []);

  return { chartRef, seriesRef, updateCandles, appendCandle, fitContent, addMarker, drawTradeLines, clearMarkers };
}
