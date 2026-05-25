import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { key: 'trade',      label: 'Trade',      href: '/app/trade'      },
  { key: 'stats',      label: 'Stats',      href: '/app/stats'      },
  { key: 'bias',       label: 'Bias',       href: '/app/bias'       },
  { key: 'review',     label: 'Review',     href: '/app/review'     },
  { key: 'pro-trades', label: 'Pro Trades', href: '/app/pro-trades' },
  { key: 'settings',   label: 'Settings',   href: '/app/settings'   },
] as const;

export function AppNav() {
  const { pathname } = useLocation();

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #F3F4F6',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
    }}>
      <Link to="/app/dashboard" style={{
        fontWeight: 800,
        fontSize: 17,
        color: '#111827',
        textDecoration: 'none',
        letterSpacing: '-0.03em',
        marginRight: 28,
        whiteSpace: 'nowrap',
      }}>
        FlowState<span style={{ color: '#2962FF' }}>Trading</span>
      </Link>

      <div style={{ display: 'flex', gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              to={item.href}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#111827' : '#6B7280',
                background: active ? '#F3F4F6' : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
