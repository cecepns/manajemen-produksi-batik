import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-batik-indigo">
        <p className="text-sm font-medium">Memuat…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTES.login} state={{ from: loc }} replace />;
  }

  return children;
}
