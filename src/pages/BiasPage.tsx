import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AppNav } from '../components/Nav/AppNav';

const PRESET_BIAS_KEYS = [
  'daily_trend', '4h_trend', '4h_candle_structure',
  'liquidity_sweeps', 'optimal_trade_timing', 'key_confluences',
];

const BIAS_LABELS: Record<string, string> = {
  'daily_trend':          'Daily trend',
  '4h_trend':             '4H trend',
  '4h_candle_structure':  '4H candle structure',
  'liquidity_sweeps':     'Liquidity sweeps',
  'optimal_trade_timing': 'Optimal trade timing',
  'key_confluences':      'Key confluences',
};

function formatBiasLabel(key: string): string {
  return BIAS_LABELS[key] ?? key;
}

interface FormState {
  strategyNotes: string;
  biasItems: string[];
  maxRisk: string;
  targetRR: string;
}

export function BiasPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({
    strategyNotes: '',
    biasItems: [],
    maxRisk: '',
    targetRR: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_preferences')
      .select('strategy_notes, bias_items, max_risk, target_rr')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            strategyNotes: data.strategy_notes ?? '',
            biasItems: data.bias_items ?? [],
            maxRisk: String(data.max_risk ?? ''),
            targetRR: String(data.target_rr ?? ''),
          });
        }
        setLoading(false);
      });
  }, [user]);

  function toggleItem(key: string) {
    setForm(prev => ({
      ...prev,
      biasItems: prev.biasItems.includes(key)
        ? prev.biasItems.filter(b => b !== key)
        : [...prev.biasItems, key],
    }));
    setSaved(false);
  }

  function addCustomItem(text: string) {
    const trimmed = text.trim();
    if (!trimmed || form.biasItems.includes(trimmed)) return;
    setForm(prev => ({ ...prev, biasItems: [...prev.biasItems, trimmed] }));
    setSaved(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addCustomItem(customText); setCustomText(''); setShowCustomInput(false); }
    if (e.key === 'Escape') { setShowCustomInput(false); setCustomText(''); }
  }

  async function handleSave() {
    if (!user) return;
    const risk = parseFloat(form.maxRisk);
    const rr = parseFloat(form.targetRR);
    if (isNaN(risk) || risk <= 0) { setError('Enter a valid max risk amount.'); return; }
    if (isNaN(rr) || rr < 0.5) { setError('Target R:R must be at least 0.5.'); return; }

    setSaving(true);
    setError(null);

    const { error: dbErr } = await supabase.from('user_preferences').upsert({
      user_id:        user.id,
      strategy_notes: form.strategyNotes,
      bias_items:     form.biasItems,
      max_risk:       risk,
      target_rr:      rr,
      updated_at:     new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setSaving(false);

    if (dbErr) {
      setError(`Save failed: ${dbErr.message}`);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const customBiasItems = form.biasItems.filter(b => !PRESET_BIAS_KEYS.includes(b));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
        <AppNav />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)' }}>
          <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <AppNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 24px 60px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>
              Bias & Strategy
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              Your trading playbook — updated whenever your edge evolves.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 22px',
              background: saved
                ? '#10B981'
                : saving
                  ? '#9CA3AF'
                  : 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
              border: 'none',
              borderRadius: 999,
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saved || saving ? 'none' : '0 4px 16px rgba(41,98,255,0.28)',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* ── Strategy Notes ─────────────────────────── */}
        <Section title="Strategy Notes" sub="Write your market thesis, confluence rules, or anything that defines your current edge.">
          <textarea
            value={form.strategyNotes}
            onChange={e => { setForm(prev => ({ ...prev, strategyNotes: e.target.value })); setSaved(false); }}
            placeholder={"Example:\n- Only trade during NY open (9:30–11:00am)\n- Look for liquidity sweeps on H4 before entry\n- Min 2:1 RR, no trade without 3+ confluences"}
            rows={8}
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              lineHeight: 1.7,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2962FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </Section>

        {/* ── Pre-Trade Checklist ─────────────────────── */}
        <Section title="Pre-Trade Checklist" sub="These items appear in the simulator before you enter every trade.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

            {/* Preset items */}
            {PRESET_BIAS_KEYS.map(key => {
              const on = form.biasItems.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleItem(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '2px solid',
                    borderColor: on ? '#2962FF' : '#E5E7EB',
                    background: on ? '#2962FF' : '#F9FAFB',
                    color: on ? '#fff' : '#374151',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  {on && <span style={{ fontSize: 10 }}>✓</span>}
                  {formatBiasLabel(key)}
                </button>
              );
            })}

            {/* Custom items */}
            {customBiasItems.map(text => (
              <div
                key={text}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px 8px 14px',
                  borderRadius: 999,
                  border: '2px solid #7C3AED',
                  background: '#7C3AED',
                  color: '#fff',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 10 }}>✓</span>
                <span>{text}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(text)}
                  style={{
                    background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '50%',
                    width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 11, padding: 0, flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add custom item */}
          <div style={{ marginTop: 12 }}>
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => { setShowCustomInput(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 999,
                  border: '1.5px dashed #D1D5DB', background: 'transparent',
                  color: '#6B7280', fontFamily: 'Inter, sans-serif',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                + Add custom item
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g. Weekly POI confluence"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={60}
                  style={{
                    flex: 1, padding: '8px 12px', background: '#F9FAFB',
                    border: '1.5px solid #7C3AED', borderRadius: 10,
                    color: '#111827', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, outline: 'none',
                    boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { addCustomItem(customText); setCustomText(''); setShowCustomInput(false); }}
                  disabled={!customText.trim()}
                  style={{
                    padding: '8px 14px', background: customText.trim() ? '#7C3AED' : '#E5E7EB',
                    border: 'none', borderRadius: 10,
                    color: customText.trim() ? '#fff' : '#9CA3AF',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                    cursor: customText.trim() ? 'pointer' : 'default',
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCustomInput(false); setCustomText(''); }}
                  style={{
                    padding: '8px 12px', background: 'transparent',
                    border: '1.5px solid #E5E7EB', borderRadius: 10,
                    color: '#9CA3AF', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {form.biasItems.length === 0 && (
            <p style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF' }}>
              No items selected — the checklist won't appear in the simulator.
            </p>
          )}
        </Section>

        {/* ── Risk Rules ─────────────────────────────── */}
        <Section title="Risk Rules" sub="Your hard rules for every trade. Stay consistent.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <FieldLabel>Max risk per trade</FieldLabel>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 14, fontWeight: 600, color: '#374151',
                }}>$</span>
                <input
                  type="number"
                  min="1"
                  placeholder="500"
                  value={form.maxRisk}
                  onChange={e => { setForm(prev => ({ ...prev, maxRisk: e.target.value })); setSaved(false); }}
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Target R:R ratio</FieldLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>1 :</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="2.0"
                  value={form.targetRR}
                  onChange={e => { setForm(prev => ({ ...prev, targetRR: e.target.value })); setSaved(false); }}
                  style={{ ...inputStyle, paddingLeft: 12 }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {['1.5', '2', '2.5', '3'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, targetRR: v })); setSaved(false); }}
                    style={{
                      padding: '4px 12px', borderRadius: 999, border: '1.5px solid',
                      borderColor: form.targetRR === v ? '#2962FF' : '#E5E7EB',
                      background: form.targetRR === v ? '#EEF2FF' : 'transparent',
                      color: form.targetRR === v ? '#2962FF' : '#6B7280',
                      fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    1:{v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '22px 24px',
      border: '1px solid #F3F4F6',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      marginBottom: 16,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{sub}</p>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 28px',
  background: '#F9FAFB',
  border: '1.5px solid #E5E7EB',
  borderRadius: 10,
  color: '#111827',
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  outline: 'none',
  boxSizing: 'border-box',
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
