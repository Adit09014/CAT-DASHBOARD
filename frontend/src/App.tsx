import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './services/auth';
import { LanguageProvider } from './services/i18n';
import { LoginPage } from './pages/LoginPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function ProtectedRoute({ role, children }: { role?: 'ADMIN' | 'OPERATOR'; children: ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return <div className="screen-center text-slate-300">Loading CAT Guardian...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/operator'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/operator" element={<ProtectedRoute role="OPERATOR"><OperatorDashboardPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Navigate to="/operator" replace /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </LanguageProvider>
  );
}
