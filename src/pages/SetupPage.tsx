import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Market = 'Forex' | 'Futures' | 'Other';
type AccountPreset = 50000 | 100000 | 250000 | 'custom';

interface FormData {
  username: string;
  market: Market;
  session: string;
  accountPreset: AccountPreset;
  customAmount: string;
  biases: string[];
  maxRiskDollars: string;
  targetRR: string;
}

const PRESET_BIAS_KEYS = [
  'daily_trend',
  '4h_trend',
  '4h_candle_structure',
  'liquidity_sweeps',
  'optimal_trade_timing',
  'key_confluences',
];

const INITIAL: FormData = {
  username: '',
  market: 'Futures',
  session: 'New York',
  accountPreset: 100000,
  customAmount: '',
  biases: [...PRESET_BIAS_KEYS], // all recommended items pre-selected
  maxRiskDollars: '',
  targetRR: '',
};

const MARKETS: { value: Market; label: string }[] = [
  { value: 'Forex',   label: 'Forex'   },
  { value: 'Futures', label: 'Futures' },
  { value: 'Other',   label: 'Other'   },
];

const SESSIONS = ['Asian', 'London', 'New York', 'All Sessions'];

const ACCOUNT_PRESETS: { value: AccountPreset; label: string; sub: string }[] = [
  { value: 50000,    label: 'Beginner',     sub: '$50,000'     },
  { value: 100000,   label: 'Intermediate', sub: '$100,000'    },
  { value: 250000,   label: 'Expert',       sub: '$250,000'    },
  { value: 'custom', label: 'Custom',       sub: 'Set your own' },
];

const BIAS_OPTIONS: { key: string; label: string }[] = [
  { key: 'daily_trend',          label: 'Daily trend'          },
  { key: '4h_trend',             label: '4H trend'             },
  { key: '4h_candle_structure',  label: '4H candle structure'  },
  { key: 'liquidity_sweeps',     label: 'Liquidity sweeps'     },
  { key: 'optimal_trade_timing', label: 'Optimal trade timing' },
  { key: 'key_confluences',      label: 'Key confluences'      },
];

const STEP_META = [
  { label: 'Username',    heading: 'Choose your username',          sub: 'Pick a unique handle — letters, numbers, and underscores only.'    },
  { label: 'Preferences', heading: 'Trading preferences',           sub: 'What market and conditions do you trade?'           },
  { label: 'Bias',        heading: "What's your daily bias checklist?", sub: 'These items will appear before each session as a quick checklist.' },
  { label: 'Risk',        heading: 'Risk management',               sub: 'Set your personal risk rules for every session.'    },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, data: FormData): string | null {
  if (step === 1) {
    if (!data.username.trim()) return 'Please choose a username.';
    if (data.username.length < 3) return 'Username must be at least 3 characters.';
    if (data.username.length > 30) return 'Username must be 30 characters or less.';
    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) return 'Username can only contain letters, numbers, and underscores.';
  }
  if (step === 2 && data.accountPreset === 'custom') {
    const n = parseFloat(data.customAmount.replace(/,/g, ''));
    if (isNaN(n) || n < 1000) return 'Enter a valid account size (minimum $1,000).';
  }
  if (step === 3 && data.biases.length === 0) {
    return 'Add at least one checklist item.';
  }
  if (step === 4) {
    const risk = parseFloat(data.maxRiskDollars);
    const rr   = parseFloat(data.targetRR);
    if (isNaN(risk) || risk <= 0) return 'Enter a valid max risk amount greater than $0.';
    if (isNaN(rr)   || rr < 0.5) return 'Target R:R must be at least 0.5.';
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupPage() {
  const { user, hasPreferences, markSetupComplete } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (hasPreferences === true) navigate('/app/dashboard', { replace: true });
  }, [hasPreferences, navigate]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  }

  function toggleBias(key: string) {
    setForm(prev => ({
      ...prev,
      biases: prev.biases.includes(key)
        ? prev.biases.filter(b => b !== key)
        : [...prev.biases, key],
    }));
    setError(null);
  }

  function addCustomBias(text: string) {
    const trimmed = text.trim();
    if (!trimmed || form.biases.includes(trimmed)) return;
    setForm(prev => ({ ...prev, biases: [...prev.biases, trimmed] }));
    setError(null);
  }

  async function handleNext() {
    const err = validateStep(step, form);
    if (err) { setError(err); return; }

    // Check username uniqueness before advancing past step 1
    if (step === 1) {
      setChecking(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username.trim())
        .neq('id', user?.id ?? '')
        .maybeSingle();
      setChecking(false);
      if (data) {
        setError('That username is already taken. Please choose another.');
        return;
      }
    }

    setError(null);
    setStep(s => s + 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateStep(4, form);
    if (err) { setError(err); return; }
    if (!user) return;

    setSaving(true);
    setError(null);

    const accountSize =
      form.accountPreset === 'custom'
        ? parseInt(form.customAmount.replace(/,/g, ''), 10)
        : form.accountPreset;

    // Upsert profile — saves username and ensures FK for user_preferences exists.
    const { error: profileErr } = await supabase.from('profiles').upsert(
      { id: user.id, email: user.email ?? '', username: form.username.trim() },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.error('[SetupPage] profile upsert failed:', profileErr);
      setSaving(false);
      setError(`Profile error: ${profileErr.message}`);
      return;
    }

    const payload = {
      user_id:          user.id,
      market:           form.market,
      session:          form.session,
      account_size:     accountSize,
      bias_items: form.biases,
      max_risk:   parseFloat(form.maxRiskDollars),
      target_rr:  parseFloat(form.targetRR),
      updated_at:       new Date().toISOString(),
    };

    console.log('[SetupPage] upserting preferences:', payload);

    const { error: dbErr } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    setSaving(false);

    if (dbErr) {
      console.error('[SetupPage] preferences upsert failed:', dbErr);
      setError(`Save failed (${dbErr.code}): ${dbErr.message}`);
      return;
    }

    markSetupComplete();
    navigate('/app/dashboard', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FA',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <div style={{ fontWeight: 800, fontSize: 20, color: '#111827', letterSpacing: '-0.03em', marginBottom: 32 }}>
        FlowState<span style={{ color: '#2962FF' }}>Trading</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            Step {step} of {STEP_META.length}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 4 }}>
            {STEP_META[step - 1].heading}
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            {STEP_META[step - 1].sub}
          </p>
          <ProgressStepper current={step} total={STEP_META.length} labels={STEP_META.map(s => s.label)} />
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '28px 32px' }}>
            {step === 1 && <StepUsername form={form} setField={setField} />}
            {step === 2 && <Step1 form={form} setField={setField} />}
            {step === 3 && <Step2 form={form} toggleBias={toggleBias} addCustomBias={addCustomBias} />}
            {step === 4 && <Step3 form={form} setField={setField} />}

            {error && (
              <div style={{
                marginTop: 20,
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 10,
                fontSize: 13,
                color: '#DC2626',
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer navigation */}
          <div style={{ padding: '0 32px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => { setStep(s => s - 1); setError(null); }}
                style={{
                  padding: '10px 22px',
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                ← Back
              </button>
            ) : <div />}

            {step < STEP_META.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={checking}
                style={{
                  padding: '11px 28px',
                  background: checking ? '#9CA3AF' : 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: checking ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: checking ? 'none' : '0 4px 16px rgba(41,98,255,0.3)',
                  transition: 'background 0.15s',
                }}
              >
                {checking ? 'Checking…' : 'Continue →'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '11px 28px',
                  background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(41,98,255,0.3)',
                  transition: 'background 0.15s',
                }}
              >
                {saving ? 'Saving…' : 'Save & start trading →'}
              </button>
            )}
          </div>
        </form>
      </div>

      <p style={{ fontSize: 12, color: '#D1D5DB', marginTop: 20 }}>
        You can update these settings anytime from your profile.
      </p>
    </div>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────

function ProgressStepper({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start' }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', flex: n < total ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done ? '#10B981' : active ? '#2962FF' : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}>
                {done
                  ? <span style={{ fontSize: 14, color: '#fff' }}>✓</span>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : '#9CA3AF' }}>{n}</span>
                }
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: active ? '#2962FF' : done ? '#10B981' : '#9CA3AF' }}>
                {labels[i]}
              </span>
            </div>
            {n < total && (
              <div style={{
                flex: 1, height: 2, marginTop: 13, marginLeft: 4, marginRight: 4,
                background: done ? '#10B981' : '#F3F4F6', transition: 'background 0.2s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Username ─────────────────────────────────────────────────────────

function StepUsername({ form, setField }: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const isValid = form.username.length === 0 || /^[a-zA-Z0-9_]+$/.test(form.username);
  const charCount = form.username.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <FieldLabel>Username</FieldLabel>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 15, fontWeight: 600, color: '#9CA3AF', pointerEvents: 'none',
          }}>@</span>
          <input
            type="text"
            placeholder="yourname"
            value={form.username}
            onChange={e => setField('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
            maxLength={30}
            autoFocus
            autoComplete="off"
            style={{
              width: '100%',
              padding: '13px 14px 13px 32px',
              background: '#F9FAFB',
              border: `1.5px solid ${!isValid ? '#EF4444' : '#E5E7EB'}`,
              borderRadius: 10,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2962FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = isValid ? '#E5E7EB' : '#EF4444';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
            Letters, numbers, and underscores only · min 3 chars
          </span>
          <span style={{ fontSize: 12, color: charCount > 25 ? '#F59E0B' : '#9CA3AF' }}>
            {charCount}/30
          </span>
        </div>
      </div>

      {form.username.length >= 3 && isValid && (
        <div style={{
          padding: '14px 16px',
          background: '#EEF2FF',
          borderRadius: 12,
          border: '1px solid #C7D2FE',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>
              {form.username[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>@{form.username}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>This is how you'll appear in FlowState Trading</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Trading Preferences ──────────────────────────────────────────────

function Step1({ form, setField }: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Market */}
      <div>
        <FieldLabel>What market do you trade?</FieldLabel>
        <div style={{ position: 'relative' }}>
          <select
            value={form.market}
            onChange={e => setField('market', e.target.value as Market)}
            style={{
              width: '100%',
              padding: '11px 36px 11px 14px',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 10,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: '#9CA3AF', fontSize: 12,
          }}>▼</span>
        </div>
      </div>

      {/* Session */}
      <div>
        <FieldLabel>Trading session</FieldLabel>
        <div style={{ position: 'relative' }}>
          <select
            value={form.session}
            onChange={e => setField('session', e.target.value)}
            style={{
              width: '100%',
              padding: '11px 36px 11px 14px',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 10,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: '#9CA3AF', fontSize: 12,
          }}>▼</span>
        </div>
      </div>

      {/* Account size */}
      <div>
        <FieldLabel>Simulated account size</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACCOUNT_PRESETS.map(preset => {
            const selected = form.accountPreset === preset.value;
            return (
              <div key={String(preset.value)}>
                <button
                  type="button"
                  onClick={() => setField('accountPreset', preset.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '2px solid',
                    borderColor: selected ? '#2962FF' : '#E5E7EB',
                    background: selected ? '#EEF2FF' : '#F9FAFB',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: selected ? '#2962FF' : '#111827', marginBottom: 2 }}>
                    {preset.label}
                  </div>
                  <div style={{ fontSize: 12, color: selected ? '#6366F1' : '#9CA3AF', fontWeight: 500 }}>
                    {preset.sub}
                  </div>
                </button>
                {preset.value === 'custom' && selected && (
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 14, fontWeight: 600, color: '#374151',
                    }}>$</span>
                    <input
                      type="text"
                      placeholder="e.g. 150000"
                      value={form.customAmount}
                      onChange={e => setField('customAmount', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 26px',
                        background: '#F9FAFB',
                        border: '1.5px solid #2962FF',
                        borderRadius: 10,
                        color: '#111827',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Daily Bias Checklist ─────────────────────────────────────────────

function Step2({ form, toggleBias, addCustomBias }: {
  form: FormData;
  toggleBias: (key: string) => void;
  addCustomBias: (text: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAddCustom() {
    if (customText.trim()) {
      addCustomBias(customText);
      setCustomText('');
      setShowInput(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); }
    if (e.key === 'Escape') { setShowInput(false); setCustomText(''); }
  }

  function openInput() {
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const customBiases = form.biases.filter(b => !PRESET_BIAS_KEYS.includes(b));

  return (
    <div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
        Recommended items are pre-selected. Uncheck anything you don't need, and add your own.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {/* Preset chips */}
        {BIAS_OPTIONS.map(({ key, label }) => {
          const on = form.biases.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleBias(key)}
              style={{
                padding: '9px 16px',
                borderRadius: 999,
                border: '2px solid',
                borderColor: on ? '#2962FF' : '#E5E7EB',
                background: on ? '#2962FF' : '#F9FAFB',
                color: on ? '#fff' : '#374151',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {on && <span style={{ fontSize: 11 }}>✓</span>}
              {label}
              {on && (
                <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>recommended</span>
              )}
            </button>
          );
        })}

        {/* Custom chips */}
        {customBiases.map(text => (
          <div
            key={text}
            style={{
              padding: '9px 12px 9px 16px',
              borderRadius: 999,
              border: '2px solid #7C3AED',
              background: '#7C3AED',
              color: '#fff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>✓</span>
            <span>{text}</span>
            <button
              type="button"
              onClick={() => toggleBias(text)}
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                fontSize: 11,
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
              aria-label={`Remove ${text}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add custom item */}
      <div style={{ marginTop: 16 }}>
        {!showInput ? (
          <button
            type="button"
            onClick={openInput}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 999,
              border: '1.5px dashed #D1D5DB',
              background: 'transparent',
              color: '#6B7280',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#7C3AED';
              (e.currentTarget as HTMLButtonElement).style.color = '#7C3AED';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB';
              (e.currentTarget as HTMLButtonElement).style.color = '#6B7280';
            }}
          >
            + Add custom item
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. Weekly level confluence"
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={60}
              style={{
                flex: 1,
                padding: '9px 14px',
                background: '#F9FAFB',
                border: '1.5px solid #7C3AED',
                borderRadius: 10,
                color: '#111827',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
              }}
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customText.trim()}
              style={{
                padding: '9px 16px',
                background: customText.trim() ? '#7C3AED' : '#E5E7EB',
                border: 'none',
                borderRadius: 10,
                color: customText.trim() ? '#fff' : '#9CA3AF',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                cursor: customText.trim() ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowInput(false); setCustomText(''); }}
              style={{
                padding: '9px 12px',
                background: 'transparent',
                border: '1.5px solid #E5E7EB',
                borderRadius: 10,
                color: '#9CA3AF',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {form.biases.length > 0 && (
        <div style={{
          marginTop: 20,
          padding: '12px 16px',
          background: '#F0FDF4',
          borderRadius: 10,
          border: '1px solid #BBF7D0',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#15803D', marginBottom: 4 }}>
            {form.biases.length} item{form.biases.length !== 1 ? 's' : ''} in your checklist
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
            These appear before each session so you never skip your pre-trade process.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Risk Management ──────────────────────────────────────────────────

function Step3({ form, setField }: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Max risk */}
      <div>
        <FieldLabel>Max risk per trade</FieldLabel>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10, marginTop: -2 }}>
          The maximum dollar amount you're willing to lose on a single trade.
        </p>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, fontWeight: 600, color: '#374151',
          }}>$</span>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 500"
            value={form.maxRiskDollars}
            onChange={e => setField('maxRiskDollars', e.target.value)}
            style={{
              width: '100%',
              padding: '13px 14px 13px 32px',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 10,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2962FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Target R:R */}
      <div>
        <FieldLabel>Target R:R ratio</FieldLabel>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10, marginTop: -2 }}>
          Only take trades where the reward is at least this multiple of your risk.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>1 :</span>
          <input
            type="number"
            min="0.5"
            step="0.5"
            placeholder="2.0"
            value={form.targetRR}
            onChange={e => setField('targetRR', e.target.value)}
            style={{
              flex: 1,
              padding: '13px 14px',
              background: '#F9FAFB',
              border: '1.5px solid #E5E7EB',
              borderRadius: 10,
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2962FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {['1.5', '2', '2.5', '3'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setField('targetRR', v)}
              style={{
                padding: '6px 16px',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: form.targetRR === v ? '#2962FF' : '#E5E7EB',
                background: form.targetRR === v ? '#EEF2FF' : 'transparent',
                color: form.targetRR === v ? '#2962FF' : '#6B7280',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              1:{v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary preview */}
      {form.maxRiskDollars && form.targetRR && (
        <div style={{
          padding: '16px 18px',
          background: '#EEF2FF',
          borderRadius: 12,
          border: '1px solid #C7D2FE',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4338CA', marginBottom: 8 }}>
            Your risk profile
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SummaryRow label="Max loss per trade" value={`$${parseFloat(form.maxRiskDollars).toLocaleString()}`} />
            <SummaryRow
              label="Target reward"
              value={`$${(parseFloat(form.maxRiskDollars) * parseFloat(form.targetRR)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <SummaryRow label="R:R ratio" value={`1 : ${form.targetRR}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: '-0.01em' }}>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#2962FF' }}>{value}</span>
    </div>
  );
}
