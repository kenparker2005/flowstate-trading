import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/app/dashboard');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F9FA',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        fontWeight: 800,
        fontSize: 20,
        color: '#111827',
        textDecoration: 'none',
        letterSpacing: '-0.03em',
        marginBottom: 8,
      }}>
        FlowState<span style={{ color: '#2962FF' }}>Trading</span>
      </Link>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32, fontWeight: 400 }}>
        Create your free account
      </p>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        border: '1px solid #F3F4F6',
        padding: '36px 32px',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mkt-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="min. 8 characters"
              required
              className="mkt-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="repeat password"
              required
              className="mkt-input"
            />
          </div>

          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              color: '#DC2626',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mkt-btn-primary"
            style={{
              width: '100%',
              fontSize: 15,
              padding: '13px',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating account…' : 'Create free account'}
          </button>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
            By signing up you agree to our terms of service.
          </p>
        </form>
      </div>

      <p style={{ fontSize: 14, color: '#6B7280', marginTop: 24 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2962FF', textDecoration: 'none', fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
