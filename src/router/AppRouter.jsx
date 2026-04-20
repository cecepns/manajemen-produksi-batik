import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OrdersPage } from '../pages/OrdersPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { MyTasksPage } from '../pages/MyTasksPage';
import { HppCalculatorPage } from '../pages/HppCalculatorPage';
import { DailyWagesPage } from '../pages/DailyWagesPage';
import { UsersAdminPage } from '../pages/UsersAdminPage';
import { ROUTES } from '../constants/routes';

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-batik-indigo">Memuat…</p>
      </div>
    );
  }
  if (user) return <Navigate to={ROUTES.dashboard} replace />;
  return children;
}

export function AppRouter() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path={ROUTES.login}
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.orders} element={<OrdersPage />} />
          <Route path={ROUTES.orderHistory} element={<OrderHistoryPage />} />
          <Route path="/pesanan/:id" element={<OrderDetailPage />} />
          <Route path={ROUTES.myTasks} element={<MyTasksPage />} />
          <Route path={ROUTES.hppCalculator} element={<HppCalculatorPage />} />
          <Route path={ROUTES.dailyWages} element={<DailyWagesPage />} />
          <Route path={ROUTES.adminUsers} element={<UsersAdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </AuthProvider>
  );
}
