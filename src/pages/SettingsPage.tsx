import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AppNav } from '../components/Nav/AppNav';

type Tab = 'account' | 'preferences' | 'billing' | 'notifications';

type Market = 'Forex' | 'Futures' | 'Other';
type AccountPreset = 50000 | 100000 | 250000 | 'custom';

const SESSIONS = ['Asian', 'London', 'New York', 'All Sessions'];
const MARKETS: { value: Market; label: string }[] = [
  { value: 'Forex',   label: 'Forex'   },
  { value: 'Futures', label: 'Futures' },
  { value: 'Other',   label: 'Other'   },
];
const ACCOUNT_PRESETS: { value: AccountPreset; label: string; sub: string }[] = [
  { value: 50000,    label: 'Beginner',     sub: '$50,000'      },
  { value: 100000,   label: 'Intermediate', sub: '$100,000'     },
  { value: 250000,   label: 'Expert',       sub: '$250,000'     },
  { value: 'custom', label: 'Custom',       sub: 'Set your own' },
];

interface PrefForm {
  market: Market;
  session: string;
  accountPreset: AccountPreset;
  customAmount: string;
  maxRisk: string;
  targetRR: string;
}

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('account');

  // ── Account state ──────────────────────────────
  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Username state ─────────────────────────────
  const [username, setUsername] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile?.username]);

  // ── Preferences state ──────────────────────────
  const [prefForm, setPrefForm] = useState<PrefForm>({
    market: 'Futures', session: 'New York',
    accountPreset: 100000, customAmount: '',
    maxRisk: '', targetRR: '',
  });
  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_preferences')
      .select('market, session, account_size, max_risk, target_rr')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const presets = [50000, 100000, 250000];
          const isPreset = presets.includes(data.account_size);
          setPrefForm({
            market: (data.market as Market) ?? 'Futures',
            session: data.session ?? 'New York',
            accountPreset: isPreset ? (data.account_size as AccountPreset) : 'custom',
            customAmount: isPreset ? '' : String(data.account_size),
            maxRisk: String(data.max_risk ?? ''),
            targetRR: String(data.target_rr ?? ''),
          });
        }
        setPrefLoading(false);
      });
  }, [user]);

  async function handlePasswordChange() {
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Passwords do not match.' });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwSaving(false);
    if (error) {
      setPwMsg({ type: 'err', text: error.message });
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
      setPwForm({ newPassword: '', confirm: '' });
    }
  }

  async function handleUsernameSave() {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) { setUsernameMsg({ type: 'err', text: 'Username cannot be empty.' }); return; }
    if (trimmed.length < 3) { setUsernameMsg({ type: 'err', text: 'Username must be at least 3 characters.' }); return; }
    if (trimmed.length > 30) { setUsernameMsg({ type: 'err', text: 'Username must be 30 characters or less.' }); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setUsernameMsg({ type: 'err', text: 'Only letters, numbers, and underscores allowed.' }); return; }

    setUsernameSaving(true);
    setUsernameMsg(null);

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles').select('id').eq('username', trimmed).neq('id', user.id).maybeSingle();
    if (existing) {
      setUsernameSaving(false);
      setUsernameMsg({ type: 'err', text: 'That username is already taken.' });
      return;
    }

    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id);
    setUsernameSaving(false);
    if (error) {
      setUsernameMsg({ type: 'err', text: error.message });
    } else {
      setUsernameMsg({ type: 'ok', text: 'Username updated.' });
      setTimeout(() => setUsernameMsg(null), 3000);
    }
  }

  async function handlePrefSave() {
    if (!user) return;
    const risk = parseFloat(prefForm.maxRisk);
    const rr = parseFloat(prefForm.targetRR);
    if (isNaN(risk) || risk <= 0) { setPrefMsg({ type: 'err', text: 'Enter a valid max risk amount.' }); return; }
    if (isNaN(rr) || rr < 0.5)   { setPrefMsg({ type: 'err', text: 'Target R:R must be at least 0.5.' }); return; }
    if (prefForm.accountPreset === 'custom') {
      const n = parseFloat(prefForm.customAmount.replace(/,/g, ''));
      if (isNaN(n) || n < 1000) { setPrefMsg({ type: 'err', text: 'Custom account size must be at least $1,000.' }); return; }
    }

    const accountSize = prefForm.accountPreset === 'custom'
      ? parseInt(prefForm.customAmount.replace(/,/g, ''), 10)
      : prefForm.accountPreset;

    setPrefSaving(true);
    setPrefMsg(null);

    const { error } = await supabase.from('user_preferences').upsert({
      user_id:    user.id,
      market:     prefForm.market,
      session:    prefForm.session,
      account_size: accountSize,
      max_risk:   risk,
      target_rr:  rr,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setPrefSaving(false);
    setPrefMsg(error
      ? { type: 'err', text: error.message }
      : { type: 'ok', text: 'Preferences saved.' }
    );
    if (!error) setTimeout(() => setPrefMsg(null), 3000);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'account',       label: 'Account'      },
    { key: 'preferences',   label: 'Preferences'  },
    { key: 'billing',       label: 'Billing'       },
    { key: 'notifications', label: 'Notifications' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', fontFamily: 'Inter, sans-serif' }}>
      <AppNav />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 24px 60px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: 24 }}>
          Settings
        </h1>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, background: '#F3F4F6',
          borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#111827' : '#6B7280',
                background: tab === t.key ? '#fff' : 'transparent',
                boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Account tab ──────────────────────────── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title="Email address" sub="Your login email cannot be changed here.">
              <div style={{
                padding: '11px 14px', background: '#F3F4F6', borderRadius: 10,
                fontSize: 14, color: '#374151', fontWeight: 500,
              }}>
                {user?.email}
              </div>
            </Card>

            <Card title="Username" sub="Your public handle in FlowState Trading. Letters, numbers, and underscores only.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, fontWeight: 600, color: '#9CA3AF', pointerEvents: 'none',
                  }}>@</span>
                  <input
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    maxLength={30}
                    style={{ ...fieldInput, paddingLeft: 28 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                {usernameMsg && <FeedbackMsg type={usernameMsg.type} text={usernameMsg.text} />}
                <button
                  onClick={handleUsernameSave}
                  disabled={usernameSaving || !username.trim()}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '10px 20px',
                    background: (usernameSaving || !username.trim()) ? '#E5E7EB' : '#111827',
                    border: 'none', borderRadius: 10,
                    color: (usernameSaving || !username.trim()) ? '#9CA3AF' : '#fff',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                    cursor: (usernameSaving || !username.trim()) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {usernameSaving ? 'Saving…' : 'Update username'}
                </button>
              </div>
            </Card>

            <Card title="Change password" sub="Choose a strong password of at least 8 characters.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <FieldLabel>New password</FieldLabel>
                  <input
                    type="password"
                    placeholder="New password"
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                    style={fieldInput}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                <div>
                  <FieldLabel>Confirm password</FieldLabel>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    style={fieldInput}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
                {pwMsg && (
                  <FeedbackMsg type={pwMsg.type} text={pwMsg.text} />
                )}
                <button
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !pwForm.newPassword}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '10px 20px',
                    background: (pwSaving || !pwForm.newPassword) ? '#E5E7EB' : '#111827',
                    border: 'none', borderRadius: 10,
                    color: (pwSaving || !pwForm.newPassword) ? '#9CA3AF' : '#fff',
                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                    cursor: (pwSaving || !pwForm.newPassword) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── Preferences tab ───────────────────────── */}
        {tab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prefLoading ? (
              <div style={{ color: '#9CA3AF', fontSize: 14, padding: 20 }}>Loading…</div>
            ) : (
              <>
                <Card title="Market & session" sub="Which market and trading session you primarily trade.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <FieldLabel>Market</FieldLabel>
                      <StyledSelect
                        value={prefForm.market}
                        onChange={v => setPrefForm(p => ({ ...p, market: v as Market }))}
                        options={MARKETS.map(m => ({ value: m.value, label: m.label }))}
                      />
                    </div>
                    <div>
                      <FieldLabel>Trading session</FieldLabel>
                      <StyledSelect
                        value={prefForm.session}
                        onChange={v => setPrefForm(p => ({ ...p, session: v }))}
                        options={SESSIONS.map(s => ({ value: s, label: s }))}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Account size" sub="Your simulated starting account balance.">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {ACCOUNT_PRESETS.map(preset => {
                      const selected = prefForm.accountPreset === preset.value;
                      return (
                        <div key={String(preset.value)}>
                          <button
                            type="button"
                            onClick={() => setPrefForm(p => ({ ...p, accountPreset: preset.value }))}
                            style={{
                              width: '100%', padding: '12px 14px', borderRadius: 10,
                              border: '2px solid', borderColor: selected ? '#2962FF' : '#E5E7EB',
                              background: selected ? '#EEF2FF' : '#F9FAFB',
                              cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: selected ? '#2962FF' : '#111827', marginBottom: 1 }}>
                              {preset.label}
                            </div>
                            <div style={{ fontSize: 11, color: selected ? '#6366F1' : '#9CA3AF', fontWeight: 500 }}>
                              {preset.sub}
                            </div>
                          </button>
                          {preset.value === 'custom' && selected && (
                            <div style={{ position: 'relative', marginTop: 6 }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: '#374151' }}>$</span>
                              <input
                                type="text"
                                placeholder="e.g. 150000"
                                value={prefForm.customAmount}
                                onChange={e => setPrefForm(p => ({ ...p, customAmount: e.target.value }))}
                                style={{ ...fieldInput, paddingLeft: 22 }}
                                onFocus={onFocus}
                                onBlur={onBlur}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Risk rules" sub="Your default risk limits applied every session.">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <FieldLabel>Max risk per trade ($)</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: '#374151' }}>$</span>
                        <input
                          type="number" min="1" placeholder="500"
                          value={prefForm.maxRisk}
                          onChange={e => setPrefForm(p => ({ ...p, maxRisk: e.target.value }))}
                          style={{ ...fieldInput, paddingLeft: 24 }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Target R:R</FieldLabel>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>1 :</span>
                        <input
                          type="number" min="0.5" step="0.5" placeholder="2.0"
                          value={prefForm.targetRR}
                          onChange={e => setPrefForm(p => ({ ...p, targetRR: e.target.value }))}
                          style={fieldInput}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {prefMsg && <FeedbackMsg type={prefMsg.type} text={prefMsg.text} />}

                <button
                  onClick={handlePrefSave}
                  disabled={prefSaving}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '11px 24px',
                    background: prefSaving ? '#9CA3AF' : 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                    border: 'none', borderRadius: 999,
                    color: '#fff', fontFamily: 'Inter, sans-serif',
                    fontSize: 13, fontWeight: 700,
                    cursor: prefSaving ? 'not-allowed' : 'pointer',
                    boxShadow: prefSaving ? 'none' : '0 4px 16px rgba(41,98,255,0.28)',
                  }}
                >
                  {prefSaving ? 'Saving…' : 'Save preferences'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Billing tab ───────────────────────────── */}
        {tab === 'billing' && (
          <Card title="Subscription" sub="Manage your FlowState Trading plan.">
            <div style={{
              padding: '20px', background: '#F8F9FA', borderRadius: 12,
              border: '1px solid #E5E7EB', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Free plan</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>Limited replay sessions</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#6B7280',
                  background: '#E5E7EB', padding: '4px 10px', borderRadius: 999,
                }}>
                  FREE
                </span>
              </div>
            </div>
            <a
              href="/pricing"
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #2962FF 0%, #1E4FFF 100%)',
                color: '#fff', textDecoration: 'none',
                borderRadius: 999, fontSize: 13, fontWeight: 700,
                boxShadow: '0 4px 16px rgba(41,98,255,0.28)',
              }}
            >
              Upgrade plan →
            </a>
          </Card>
        )}

        {/* ── Notifications tab ─────────────────────── */}
        {tab === 'notifications' && (
          <Card title="Email notifications" sub="Choose which emails you'd like to receive.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Weekly performance summary', desc: 'A digest of your stats every Monday', on: true },
                { label: 'New Pro Trade alerts',       desc: 'Get notified when top traders place a trade', on: false },
                { label: 'Product updates',            desc: 'Feature releases and changelog', on: true },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: '#F9FAFB', borderRadius: 10,
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{item.desc}</div>
                  </div>
                  <div style={{
                    width: 40, height: 22, borderRadius: 999,
                    background: item.on ? '#2962FF' : '#E5E7EB',
                    position: 'relative', cursor: 'not-allowed', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 3,
                      left: item.on ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.15s',
                    }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                Notification preferences will be fully editable in V2.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 22px',
      border: '1px solid #F3F4F6', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 3 }}>{title}</h2>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>{sub}</p>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{children}</div>;
}

function FeedbackMsg({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div style={{
      padding: '9px 12px', borderRadius: 9, fontSize: 13, fontWeight: 500,
      background: type === 'ok' ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${type === 'ok' ? '#BBF7D0' : '#FCA5A5'}`,
      color: type === 'ok' ? '#15803D' : '#DC2626',
    }}>
      {text}
    </div>
  );
}

function StyledSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 32px 10px 12px',
          background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10,
          color: '#111827', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
          outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9CA3AF', fontSize: 11 }}>▼</span>
    </div>
  );
}

const fieldInput: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10,
  color: '#111827', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#2962FF';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)';
}

function onBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = '#E5E7EB';
  e.currentTarget.style.boxShadow = 'none';
}
