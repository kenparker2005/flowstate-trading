import { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DrawingTool = 'cursor' | 'hline' | 'trendline' | 'rect' | 'text' | 'eraser';

const COLORS = ['#2962FF', '#EF5350', '#26A69A', '#FF9800', '#9C27B0'] as const;
type DrawColor = typeof COLORS[number] | string;

interface HLine    { id: string; type: 'hline';     price: number; color: DrawColor; }
interface TrendLine { id: string; type: 'trendline'; p1: {price:number;time:number}; p2: {price:number;time:number}; color: DrawColor; }
interface Rect     { id: string; type: 'rect';      p1: {price:number;time:number}; p2: {price:number;time:number}; color: DrawColor; }
interface TextLabel { id: string; type: 'text';     price: number; time: number; text: string; color: DrawColor; }
export type Drawing = HLine | TrendLine | Rect | TextLabel;

interface InProgress {
  type: 'trendline' | 'rect';
  p1Price: number; p1Time: number;
  curPrice: number; curTime: number;
}

interface ContextMenuState { clientX: number; clientY: number; id: string; }
interface TextInputState   { canvasX: number; canvasY: number; price: number; time: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

let _uid = 0;
function uid() { return `d${++_uid}`; }

function distToSegment(px:number, py:number, ax:number, ay:number, bx:number, by:number): number {
  const dx = bx-ax, dy = by-ay, lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / lenSq));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

// ── Toolbar icons (SVG paths) ─────────────────────────────────────────────────

const TOOLS: { id: DrawingTool; label: string; icon: ReactElement }[] = [
  {
    id: 'cursor', label: 'Select / Pan',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0l16 12-7 1-4 7z"/></svg>,
  },
  {
    id: 'hline', label: 'Horizontal Line',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="2" y1="12" x2="22" y2="12"/><circle cx="2" cy="12" r="2" fill="currentColor"/><circle cx="22" cy="12" r="2" fill="currentColor"/></svg>,
  },
  {
    id: 'trendline', label: 'Trend Line',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="21" x2="21" y2="3"/><circle cx="3" cy="21" r="2" fill="currentColor"/><circle cx="21" cy="3" r="2" fill="currentColor"/></svg>,
  },
  {
    id: 'rect', label: 'Rectangle / Zone',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="1"/></svg>,
  },
  {
    id: 'text', label: 'Text Label',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><text x="3" y="18" fontSize="18" fontWeight="700" fontFamily="sans-serif">T</text></svg>,
  },
  {
    id: 'eraser', label: 'Eraser',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l11-11 7 7-1 8z"/><path d="M6.5 17.5l4-4"/></svg>,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  chartRef:  React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<SeriesType> | null>;
  clearSignal: number;
}

export function DrawingCanvas({ chartRef, seriesRef, clearSignal }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const [tool, setTool]             = useState<DrawingTool>('cursor');
  const [drawings, setDrawings]     = useState<Drawing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [textInput, setTextInput]   = useState<TextInputState | null>(null);
  const [textValue, setTextValue]   = useState('');

  // Keep refs current every render so the rAF loop always reads fresh state
  const toolRef       = useRef(tool);       toolRef.current       = tool;
  const drawingsRef   = useRef(drawings);   drawingsRef.current   = drawings;
  const selectedIdRef = useRef(selectedId); selectedIdRef.current = selectedId;

  const inProgressRef = useRef<InProgress | null>(null);
  const mouseDownPos  = useRef<{x:number;y:number} | null>(null);

  // ── Coordinate conversion ──────────────────────────────────────────────────

  const py = useCallback((price: number): number | null => {
    const v = seriesRef.current?.priceToCoordinate(price);
    return v != null ? v : null;
  }, [seriesRef]);

  const tx = useCallback((time: number): number | null => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    const direct = ts.timeToCoordinate(time as Time);
    if (direct != null) return direct;
    // Extrapolate for times beyond the last bar (future space)
    const range = ts.getVisibleRange();
    if (!range) return null;
    const t1 = range.from as number, t2 = range.to as number;
    const x1 = ts.timeToCoordinate(range.from), x2 = ts.timeToCoordinate(range.to);
    if (x1 == null || x2 == null || t1 === t2) return null;
    return x1 + ((time - t1) / (t2 - t1)) * (x2 - x1);
  }, [chartRef]);

  const toPrice = useCallback((y: number): number | null => {
    const v = seriesRef.current?.coordinateToPrice(y);
    return v != null ? v : null;
  }, [seriesRef]);

  const toTime = useCallback((x: number): number | null => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    const direct = ts.coordinateToTime(x);
    if (direct != null) return direct as number;
    // Extrapolate for coordinates beyond the visible range
    const range = ts.getVisibleRange();
    if (!range) return null;
    const t1 = range.from as number, t2 = range.to as number;
    const x1 = ts.timeToCoordinate(range.from), x2 = ts.timeToCoordinate(range.to);
    if (x1 == null || x2 == null || x1 === x2) return null;
    return t1 + ((x - x1) / (x2 - x1)) * (t2 - t1);
  }, [chartRef]);

  // ── Canvas sizing ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = parent!.clientWidth  * dpr;
      canvas.height = parent!.clientHeight * dpr;
      canvas.style.width  = parent!.clientWidth  + 'px';
      canvas.style.height = parent!.clientHeight + 'px';
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // ── Clear on new session ───────────────────────────────────────────────────

  useEffect(() => {
    if (clearSignal > 0) {
      setDrawings([]);
      setSelectedId(null);
      inProgressRef.current = null;
      setTextInput(null);
      setContextMenu(null);
    }
  }, [clearSignal]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        // Don't intercept when typing in text input
        if (document.activeElement?.tagName === 'INPUT') return;
        setDrawings(prev => prev.filter(d => d.id !== selectedIdRef.current));
        setSelectedId(null);
      }
      if (e.key === 'Escape') {
        inProgressRef.current = null;
        setSelectedId(null);
        setTextInput(null);
        setContextMenu(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render loop ────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const allDrawings = drawingsRef.current;
    const selId = selectedIdRef.current;

    for (const d of allDrawings) {
      const isSel = d.id === selId;
      ctx.globalAlpha = 1;

      if (d.type === 'hline') {
        const y = py(d.price);
        if (y === null) continue;
        ctx.strokeStyle = d.color;
        ctx.lineWidth = isSel ? 2 : 1.5;
        ctx.setLineDash(isSel ? [6, 3] : []);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.setLineDash([]);
        // price badge
        ctx.font = '10px Inter, sans-serif';
        const label = d.price.toFixed(2);
        const tw = ctx.measureText(label).width;
        const bw = tw + 10, bh = 16;
        const bx = W - bw - 52; // leave room for price scale
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.roundRect(bx, y - bh / 2, bw, bh, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, bx + bw / 2, y + 3.5);
        ctx.textAlign = 'left';
      }

      else if (d.type === 'trendline') {
        const x1 = tx(d.p1.time), y1 = py(d.p1.price);
        const x2 = tx(d.p2.time), y2 = py(d.p2.price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

        // Extend to canvas edges
        let lx1 = 0, lx2 = W, ly1: number, ly2: number;
        if (Math.abs(x2 - x1) < 0.5) {
          lx1 = lx2 = x1; ly1 = 0; ly2 = H;
        } else {
          const slope = (y2 - y1) / (x2 - x1);
          ly1 = y1 + slope * (0 - x1);
          ly2 = y1 + slope * (W - x1);
        }

        ctx.strokeStyle = d.color;
        ctx.lineWidth = isSel ? 2 : 1.5;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2); ctx.stroke();

        // Anchor dots
        ctx.fillStyle = d.color;
        for (const [ax, ay] of [[x1, y1], [x2, y2]] as [number,number][]) {
          ctx.beginPath(); ctx.arc(ax, ay, isSel ? 4 : 3, 0, Math.PI * 2); ctx.fill();
        }
      }

      else if (d.type === 'rect') {
        const x1 = tx(d.p1.time), y1 = py(d.p1.price);
        const x2 = tx(d.p2.time), y2 = py(d.p2.price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) continue;

        const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = d.color;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = d.color;
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.setLineDash([]);
        ctx.strokeRect(rx, ry, rw, rh);
      }

      else if (d.type === 'text') {
        const x = tx(d.time), y = py(d.price);
        if (x === null || y === null) continue;
        ctx.font = '600 12px Inter, sans-serif';
        const tw = ctx.measureText(d.text).width;
        ctx.fillStyle = 'rgba(15,23,42,0.75)';
        ctx.beginPath(); ctx.roundRect(x - 2, y - 14, tw + 10, 18, 3); ctx.fill();
        ctx.fillStyle = d.color;
        ctx.fillText(d.text, x + 3, y);
        if (isSel) {
          ctx.strokeStyle = d.color; ctx.lineWidth = 1; ctx.setLineDash([3,2]);
          ctx.strokeRect(x - 2, y - 14, tw + 10, 18);
          ctx.setLineDash([]);
        }
      }
    }

    // In-progress ghost
    const ip = inProgressRef.current;
    if (ip) {
      const x1 = tx(ip.p1Time), y1 = py(ip.p1Price);
      const x2 = tx(ip.curTime), y2 = py(ip.curPrice);
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        ctx.strokeStyle = '#2962FF'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
        if (ip.type === 'rect') {
          ctx.globalAlpha = 0.10; ctx.fillStyle = '#2962FF';
          ctx.fillRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
          ctx.globalAlpha = 1;
          ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
        } else {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.fillStyle = '#2962FF';
          ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }, [py, tx]);

  useEffect(() => {
    let id: number;
    function loop() { render(); id = requestAnimationFrame(loop); }
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [render]);

  // ── Hit testing ────────────────────────────────────────────────────────────

  function hitTest(mx: number, my: number): string | null {
    const all = drawingsRef.current;
    const HIT = 8;
    for (let i = all.length - 1; i >= 0; i--) {
      const d = all[i];
      if (d.type === 'hline') {
        const y = py(d.price);
        if (y !== null && Math.abs(my - y) <= HIT) return d.id;
      } else if (d.type === 'trendline') {
        const x1 = tx(d.p1.time), y1 = py(d.p1.price);
        const x2 = tx(d.p2.time), y2 = py(d.p2.price);
        if (x1!==null && y1!==null && x2!==null && y2!==null &&
            distToSegment(mx, my, x1, y1, x2, y2) <= HIT) return d.id;
      } else if (d.type === 'rect') {
        const x1 = tx(d.p1.time), y1 = py(d.p1.price);
        const x2 = tx(d.p2.time), y2 = py(d.p2.price);
        if (x1!==null && y1!==null && x2!==null && y2!==null) {
          const rx=Math.min(x1,x2), ry=Math.min(y1,y2);
          if (mx>=rx && mx<=rx+Math.abs(x2-x1) && my>=ry && my<=ry+Math.abs(y2-y1)) return d.id;
        }
      } else if (d.type === 'text') {
        const x = tx(d.time), y = py(d.price);
        if (x!==null && y!==null && Math.hypot(mx-x, my-y) <= 20) return d.id;
      }
    }
    return null;
  }

  // ── Mouse events ───────────────────────────────────────────────────────────

  function pos(e: React.MouseEvent): {x:number;y:number} {
    const r = captureRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setContextMenu(null);
    const { x, y } = pos(e);
    mouseDownPos.current = { x, y };

    const price = toPrice(y), time = toTime(x);
    if (price === null || time === null) return;
    const t = toolRef.current;

    if (t === 'trendline' || t === 'rect') {
      if (!inProgressRef.current) {
        inProgressRef.current = { type: t, p1Price: price, p1Time: time, curPrice: price, curTime: time };
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!inProgressRef.current) return;
    const { x, y } = pos(e);
    const price = toPrice(y), time = toTime(x);
    if (price !== null && time !== null)
      inProgressRef.current = { ...inProgressRef.current, curPrice: price, curTime: time };
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const { x, y } = pos(e);
    const price = toPrice(y), time = toTime(x);
    if (price === null || time === null) { mouseDownPos.current = null; return; }

    const t = toolRef.current;
    const down = mouseDownPos.current;
    mouseDownPos.current = null;

    if (t === 'hline') {
      setDrawings(prev => [...prev, { id: uid(), type: 'hline', price, color: '#2962FF' }]);
      return;
    }

    if (t === 'text') {
      setTextValue('');
      setTextInput({ canvasX: x, canvasY: y, price, time });
      return;
    }

    if (t === 'eraser') {
      const hit = hitTest(x, y);
      if (hit) { setDrawings(prev => prev.filter(d => d.id !== hit)); setSelectedId(null); }
      return;
    }

    if ((t === 'trendline' || t === 'rect') && inProgressRef.current) {
      const ip = inProgressRef.current;
      const moved = down ? Math.hypot(x - down.x, y - down.y) : 0;
      if (moved > 4) {
        // Drag complete — finish on mouseup
        const newD: Drawing = t === 'trendline'
          ? { id: uid(), type: 'trendline', p1: { price: ip.p1Price, time: ip.p1Time }, p2: { price, time }, color: '#2962FF' }
          : { id: uid(), type: 'rect',      p1: { price: ip.p1Price, time: ip.p1Time }, p2: { price, time }, color: '#2962FF' };
        setDrawings(prev => [...prev, newD]);
        inProgressRef.current = null;
      }
      // If barely moved (< 4px), treat as "first click" of a two-click flow — leave inProgress set
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const { x, y } = pos(e);
    const hit = hitTest(x, y);
    if (hit) {
      setSelectedId(hit);
      setContextMenu({ clientX: e.clientX, clientY: e.clientY, id: hit });
    }
  }

  // Allow two-click placement for trendlines/rects: second click when already in-progress
  function handleClick(e: React.MouseEvent) {
    if (e.button !== 0) return;
    const { x, y } = pos(e);
    const price = toPrice(y), time = toTime(x);
    if (price === null || time === null) return;
    const t = toolRef.current;

    if ((t === 'trendline' || t === 'rect') && inProgressRef.current) {
      const ip = inProgressRef.current;
      // Only commit via click if the drag didn't already commit on mouseup
      // Check: if inProgress still exists here, the drag was < 4px → it's a two-click flow
      const newD: Drawing = t === 'trendline'
        ? { id: uid(), type: 'trendline', p1: { price: ip.p1Price, time: ip.p1Time }, p2: { price, time }, color: '#2962FF' }
        : { id: uid(), type: 'rect',      p1: { price: ip.p1Price, time: ip.p1Time }, p2: { price, time }, color: '#2962FF' };
      setDrawings(prev => [...prev, newD]);
      inProgressRef.current = null;
    }
  }

  // Text submit
  function submitText() {
    if (textInput && textValue.trim()) {
      setDrawings(prev => [...prev, {
        id: uid(), type: 'text',
        price: textInput.price, time: textInput.time,
        text: textValue.trim(), color: '#2962FF',
      }]);
    }
    setTextInput(null);
    setTextValue('');
  }

  // Color change from context menu
  function applyColor(id: string, color: string) {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, color } : d));
    setContextMenu(null);
  }

  const CURSOR: Record<DrawingTool, string> = {
    cursor: 'default', hline: 'crosshair', trendline: 'crosshair',
    rect: 'crosshair', text: 'text', eraser: 'cell',
  };

  return (
    <>
      {/* Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        zIndex: 6,
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
        padding: '4px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {TOOLS.map(({ id, label, icon }) => (
          <ToolBtn
            key={id}
            active={tool === id}
            label={label}
            onClick={() => { setTool(id); inProgressRef.current = null; setSelectedId(null); }}
          >
            {icon}
          </ToolBtn>
        ))}

        {/* Divider + clear all */}
        {drawings.length > 0 && (
          <>
            <div style={{ height: 1, background: '#F3F4F6', margin: '2px 4px' }} />
            <button
              title="Clear all drawings"
              onClick={() => { setDrawings([]); setSelectedId(null); inProgressRef.current = null; }}
              style={{
                width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                background: 'transparent', color: '#9CA3AF', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF5350'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Drawing canvas (always pointer-events: none — just visual) ────────── */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
      />

      {/* Event capture div — only mounted when a drawing tool is active ───── */}
      {tool !== 'cursor' && (
        <div
          ref={captureRef}
          style={{ position: 'absolute', inset: 0, zIndex: 3, cursor: CURSOR[tool] }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Text input ──────────────────────────────────────────────────────── */}
      {textInput && (
        <input
          autoFocus
          value={textValue}
          placeholder="Label…"
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitText(); if (e.key === 'Escape') { setTextInput(null); setTextValue(''); } }}
          onBlur={submitText}
          style={{
            position: 'absolute',
            left: textInput.canvasX + 4,
            top:  textInput.canvasY - 16,
            zIndex: 10,
            minWidth: 90,
            background: '#F8FAFC',
            border: '1.5px solid #2962FF',
            borderRadius: 5,
            padding: '3px 8px',
            fontSize: 12,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            color: '#111827',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(41,98,255,0.2)',
          }}
        />
      )}

      {/* Context menu ────────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', zIndex: 1000,
            top: contextMenu.clientY, left: contextMenu.clientX,
            background: '#1E293B', borderRadius: 10, padding: '10px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', gap: 8,
            minWidth: 140,
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Color
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => applyColor(contextMenu.id, c)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', background: c,
                  border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                  padding: 0, flexShrink: 0,
                }}
              />
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <button
            onClick={() => {
              setDrawings(prev => prev.filter(d => d.id !== contextMenu.id));
              setSelectedId(null);
              setContextMenu(null);
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: '#EF5350', fontWeight: 600,
              textAlign: 'left', padding: '2px 0', fontFamily: 'Inter, sans-serif',
            }}
          >
            Delete drawing
          </button>
        </div>
      )}
    </>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({ active, label, onClick, children }: {
  active: boolean; label: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
        background: active ? '#EEF2FF' : 'transparent',
        color: active ? '#2962FF' : '#6B7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}
    >
      {children}
    </button>
  );
}
