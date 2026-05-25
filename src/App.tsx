import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthState } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Pricing } from './pages/Pricing';
import { SetupPage } from './pages/SetupPage';
import { Dashboard } from './pages/Dashboard';
import { Simulator } from './pages/Simulator';
import { StatsPage } from './pages/StatsPage';
import { ReviewPage } from './pages/ReviewPage';
import { BiasPage } from './pages/BiasPage';
import { ProTradesPage } from './pages/ProTradesPage';
import { SettingsPage } from './pages/SettingsPage';

function LoadingSpinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#2962FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ color: '#9CA3AF', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading…</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, hasPreferences } = useAuth();
  if (loading || (!!user && hasPreferences === null)) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (hasPreferences === false) return <Navigate to="/app/setup" replace />;
  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, hasPreferences } = useAuth();
  if (loading || (!!user && hasPreferences === null)) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (hasPreferences === true) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* Onboarding */}
      <Route path="/app/setup" element={<SetupRoute><SetupPage /></SetupRoute>} />

      {/* App */}
      <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/app/trade"     element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
      <Route path="/app/stats"     element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
      <Route path="/app/review"    element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
      <Route path="/app/bias"      element={<ProtectedRoute><BiasPage /></ProtectedRoute>} />
      <Route path="/app/pro-trades" element={<ProtectedRoute><ProTradesPage /></ProtectedRoute>} />
      <Route path="/app/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Legacy redirect */}
      <Route path="/app/simulator" element={<Navigate to="/app/trade" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
