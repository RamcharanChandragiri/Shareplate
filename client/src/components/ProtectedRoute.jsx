import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized dashboard if trying to access unauthorized role page
    if (user.role === 'DONOR') return <Navigate to="/donor/dashboard" replace />;
    if (user.role === 'NGO') return <Navigate to="/ngo/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
