import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'DONOR') return '/donor/dashboard';
    if (user.role === 'NGO') return '/ngo/dashboard';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    return '/';
  };

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="brand">
          <span className="brand-icon">🍲</span>
          <span className="brand-text">SharePlate</span>
        </Link>

        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>

          {isAuthenticated ? (
            <>
              {/* Role specific quick links */}
              {user.role === 'DONOR' && (
                <>
                  <Link to="/donor/create-donation" className="nav-link">
                    + Donate Food
                  </Link>
                  <Link to="/donor/my-donations" className="nav-link">
                    My Listings
                  </Link>
                  <Link to="/donor/requests" className="nav-link">
                    Requests
                  </Link>
                </>
              )}

              {user.role === 'NGO' && (
                <>
                  <Link to="/ngo/browse" className="nav-link">
                    Browse Surplus
                  </Link>
                  <Link to="/ngo/my-requests" className="nav-link">
                    My Requests
                  </Link>
                </>
              )}

              <Link to={getDashboardPath()} className="nav-link dashboard-link">
                Dashboard
                <span className={`badge-pill badge-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </Link>

              <Link to="/profile" className="nav-link">
                Profile
              </Link>

              {/* Notification Bell */}
              <NotificationBell />

              <div className="nav-user">
                <span className="user-greeting">Hi, {user.name.split(' ')[0]}</span>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
