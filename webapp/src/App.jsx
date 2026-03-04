import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BlueDashboard from './pages/BlueDashboard';
import RedDashboard from './pages/RedDashboard';
import WhiteDashboard from './pages/WhiteDashboard';
import KonamiEgg from './components/KonamiEgg';

const ROLE_HOME = {
  blue: '/blue',
  red: '/red',
  white: '/admin',
};

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <>
      <KonamiEgg />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/:token" element={<RegisterPage />} />
          <Route
            path="/blue"
            element={
              <ProtectedRoute allowedRoles={['blue']}>
                <BlueDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/red"
            element={
              <ProtectedRoute allowedRoles={['red']}>
                <RedDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['white']}>
                <WhiteDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </main>
    </>
  );
}
