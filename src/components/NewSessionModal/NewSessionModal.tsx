import { useState, useEffect, useRef } from 'react';
import { loadM1Data, getAvailableDates } from '../../lib/replayData';
import type { SessionConfig } from '../../types';

const PAIRS = [
  { symbol: 'ES' as const, label: 'ES', sub: 'E-mini S&P 500' },
  { symbol: 'NQ' as const, label: 'NQ', sub: 'E-mini Nasdaq-100' },
];

// All times are UTC. Data window is 12:00–21:00 UTC (pre-market through NY close).
const TIME_PRESETS = [
  { value: '12:00', label: '7 AM ET',   sub: 'Pre-market'   },
  { value: '13:30', label: '8:30 AM',   sub: 'Econ data'    },
  { value: '14:30', label: '9:30 AM',   sub: 'NY Open'      },
  { value: '17:00', label: '12 PM ET',  sub: 'Mid-session'  },
  { value: '19:30', label: '2:30 PM',   sub: 'Power hour'   },
];

type DateMode     = 'random' | 'specific';
type SessionStart = 'any' | 'asian' | 'london' | 'ny' | 'custom';

/** UTC times for each named session open */
const SESSION_UTC: Record<Exclude<SessionStart, 'any' | 'custom'>, string> = {
  asian:  '23:00',
  london: '08:00',
  ny:     '14:30',
};

const SESSION_OPTS: { id: SessionStart; label: string; sub: string }[] = [
  { id: 'any',    label: 'Any time',    sub: 'fully random' },
  { id: 'asian',  label: 'Asian open',  sub: '23:00 UTC · 6 PM ET'  },
  { id: 'london', label: 'London open', sub: '08:00 UTC · 3 AM ET'  },
  { id: 'ny',     label: 'NY open',     sub: '14:30 UTC · 9:30 AM ET' },
  { id: 'custom', label: 'Custom',      sub: 'pick a time'  },
];

interface Props {
  onStart: (config: SessionConfig) => void;
  onCancel: () => void;
}

export function NewSessionModal({ onStart, onCancel }: Props) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState<'ES' | 'NQ'>('ES');
  const [dateMode, setDateMode] = useState<DateMode>('random');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [specificTime, setSpecificTime] = useState<string>('14:30');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  // Random-mode session start time picker
  const [sessionStart, setSessionStart] = useState<SessionStart>('ny');
  const [customSessionTime, setCustomSessionTime] = useState('14:30');
  const nameRef = useRef<HTMLInputElement>(null);

  /** Resolved UTC 'HH:MM' for the random session, or undefined for 'any' */
  const resolvedSessionTime: string | undefined =
    sessionStart === 'any'    ? undefined :
    sessionStart === 'custom' ? customSessionTime :
    SESSION_UTC[sessionStart];

  useEffect(() => {
    // Use cache if already loaded; otherwise trigger fetch
    const cached = getAvailableDates(symbol);
    if (cached.length > 0) {
      setAvailableDates(cached);
      if (specificDate === '') setSpecificDate(cached[0]);
      return;
    }
    setDatesLoading(true);
    loadM1Data(symbol)
      .then(() => {
        const dates = getAvailableDates(symbol);
        setAvailableDates(dates);
        if (specificDate === '' && dates.length > 0) setSpecificDate(dates[0]);
      })
      .catch(console.error)
      .finally(() => setDatesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => { nameRef.current?.focus(); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function handleStart() {
    if (dateMode === 'specific' && !specificDate) return;
    onStart({
      name: name.trim(),
      symbol,
      dateMode,
      specificDate: dateMode === 'specific' ? `${specificDate}T${specificTime}` : undefined,
      sessionTime:  dateMode === 'random'   ? resolvedSessionTime : undefined,
    });
  }

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      timeZone: 'UTC',
    });
  }

  const canStart = dateMode === 'random' || (dateMode === 'specific' && !!specificDate);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(17, 24, 39, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        animation: 'modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);   }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', flexShrink: 0,
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 3 }}>
              New Session
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Set up your next practice session</p>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: '#F3F4F6', color: '#6B7280', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, marginTop: 2,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22, overflowY: 'auto' }}>

          {/* Session Name */}
          <div>
            <SectionLabel>Session name <Muted>(optional)</Muted></SectionLabel>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canStart) handleStart(); }}
              placeholder="e.g. Morning ES session, NQ breakout practice"
              maxLength={80}
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Market */}
          <div>
            <SectionLabel>Market</SectionLabel>
            <div style={{ display: 'flex', gap: 10 }}>
              {PAIRS.map(p => {
                const active = symbol === p.symbol;
                return (
                  <button
                    key={p.symbol}
                    type="button"
                    onClick={() => setSymbol(p.symbol)}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 12,
                      border: `2px solid ${active ? '#2962FF' : '#E5E7EB'}`,
                      background: active ? '#EEF2FF' : '#F9FAFB',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: active ? '#2962FF' : '#111827', marginBottom: 2, letterSpacing: '-0.02em' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 11, color: active ? '#6366F1' : '#9CA3AF', fontWeight: 500 }}>
                      {p.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <SectionLabel>Date & time</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Random option */}
              <label style={radioCard(dateMode === 'random')}>
                <input
                  type="radio" name="dateMode" value="random"
                  checked={dateMode === 'random'}
                  onChange={() => setDateMode('random')}
                  style={{ marginTop: 2, accentColor: '#2962FF', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dateMode === 'random' ? '#2962FF' : '#111827', marginBottom: 2 }}>
                    Random date (hidden)
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4, marginBottom: dateMode === 'random' ? 14 : 0 }}>
                    A random historical date — test your reading, not your memory
                  </div>

                  {dateMode === 'random' && (
                    <div onClick={e => e.preventDefault()}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Session start time
                      </div>

                      {/* Session preset buttons */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: sessionStart === 'custom' ? 10 : 0 }}>
                        {SESSION_OPTS.map(opt => {
                          const active = sessionStart === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSessionStart(opt.id)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                border: `1.5px solid ${active ? '#2962FF' : '#E5E7EB'}`,
                                background: active ? '#EEF2FF' : '#fff',
                                transition: 'all 0.1s',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#2962FF' : '#374151', lineHeight: 1.2 }}>
                                {opt.label}
                              </div>
                              <div style={{ fontSize: 10, color: active ? '#6366F1' : '#9CA3AF', marginTop: 2, whiteSpace: 'nowrap' }}>
                                {opt.sub}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom time input */}
                      {sessionStart === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="time"
                            value={customSessionTime}
                            onChange={e => setCustomSessionTime(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              background: '#fff',
                              border: '1.5px solid #C7D2FE',
                              borderRadius: 8,
                              color: '#1E40AF',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: 13,
                              fontWeight: 600,
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#2962FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.boxShadow = 'none'; }}
                          />
                          <span style={{ fontSize: 12, color: '#6B7280' }}>UTC</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* Specific date option */}
              <label style={radioCard(dateMode === 'specific')}>
                <input
                  type="radio" name="dateMode" value="specific"
                  checked={dateMode === 'specific'}
                  onChange={() => setDateMode('specific')}
                  style={{ marginTop: 2, accentColor: '#2962FF', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: dateMode === 'specific' ? '#2962FF' : '#111827', marginBottom: 2 }}>
                    Pick specific date & time
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.4, marginBottom: dateMode === 'specific' ? 14 : 0 }}>
                    Choose a historical date — visible throughout the session
                  </div>

                  {dateMode === 'specific' && (
                    <>
                      {/* Date chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {datesLoading ? (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Loading dates…</span>
                        ) : availableDates.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>No dates available.</span>
                        ) : availableDates.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={e => { e.preventDefault(); setSpecificDate(d); }}
                            style={{
                              padding: '6px 14px', borderRadius: 999,
                              border: `2px solid ${specificDate === d ? '#2962FF' : '#C7D2FE'}`,
                              background: specificDate === d ? '#2962FF' : '#fff',
                              color: specificDate === d ? '#fff' : '#4338CA',
                              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.12s',
                            }}
                          >
                            {formatDate(d)}
                          </button>
                        ))}
                      </div>

                      {/* Time picker — only shown after a date is selected */}
                      {specificDate && (
                        <div style={{
                          padding: '14px 16px',
                          background: '#F8F9FF',
                          borderRadius: 12,
                          border: '1px solid #E0E7FF',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                            Start time <span style={{ color: '#9CA3AF', fontWeight: 500 }}>(UTC)</span>
                          </div>

                          {/* Quick preset grid */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {TIME_PRESETS.map(t => {
                              const active = specificTime === t.value;
                              return (
                                <button
                                  key={t.value}
                                  type="button"
                                  onClick={e => { e.preventDefault(); setSpecificTime(t.value); }}
                                  style={{
                                    padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                                    border: `1.5px solid ${active ? '#2962FF' : '#E5E7EB'}`,
                                    background: active ? '#EEF2FF' : '#fff',
                                    transition: 'all 0.1s', textAlign: 'center',
                                  }}
                                >
                                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#2962FF' : '#374151', lineHeight: 1.2 }}>
                                    {t.value}
                                  </div>
                                  <div style={{ fontSize: 10, color: active ? '#6366F1' : '#9CA3AF', marginTop: 2 }}>
                                    {t.label}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Native time input for custom time */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="time"
                              value={specificTime}
                              onChange={e => setSpecificTime(e.target.value)}
                              style={{
                                padding: '8px 12px',
                                background: '#fff',
                                border: '1.5px solid #C7D2FE',
                                borderRadius: 8,
                                color: '#1E40AF',
                                fontFamily: 'Inter, sans-serif',
                                fontSize: 13, fontWeight: 600,
                                outline: 'none', cursor: 'pointer',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = '#2962FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = '#C7D2FE'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>or enter custom time</span>
                          </div>

                          {/* Preview */}
                          <div style={{
                            marginTop: 12, padding: '8px 12px',
                            background: '#EEF2FF', borderRadius: 8,
                            fontSize: 12, color: '#3730A3', fontWeight: 600,
                          }}>
                            Session starts: {formatDate(specificDate)} at {formatTime(specificTime)} UTC
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px 24px', flexShrink: 0,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          borderTop: '1px solid #F3F4F6',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 22px', borderRadius: 999,
              border: '1.5px solid #E5E7EB', background: 'transparent',
              color: '#6B7280', fontFamily: 'Inter, sans-serif',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              padding: '10px 24px', borderRadius: 999, border: 'none',
              background: canStart ? 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)' : '#E5E7EB',
              color: canStart ? '#fff' : '#9CA3AF',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
              cursor: canStart ? 'pointer' : 'not-allowed',
              boxShadow: canStart ? '0 4px 16px rgba(41,98,255,0.3)' : 'none',
              transition: 'all 0.12s',
            }}
          >
            Start Session →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '-0.01em' }}>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#D1D5DB', fontWeight: 400 }}>{children}</span>;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function radioCard(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
    border: `2px solid ${active ? '#2962FF' : '#E5E7EB'}`,
    background: active ? '#EEF2FF' : '#F9FAFB',
    transition: 'all 0.12s',
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10,
  color: '#111827', fontFamily: 'Inter, sans-serif', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#2962FF';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)';
}
function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#E5E7EB';
  e.currentTarget.style.boxShadow = 'none';
}
