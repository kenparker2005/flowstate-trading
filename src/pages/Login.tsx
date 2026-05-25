import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
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
        Welcome back
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
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 6,
            }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p style={{ fontSize: 14, color: '#6B7280', marginTop: 24 }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#2962FF', textDecoration: 'none', fontWeight: 600 }}>
          Sign up free
        </Link>
      </p>
    </div>
  );
}
