import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Donor Pages
import DonorDashboard from './pages/DonorDashboard';
import CreateDonationPage from './pages/CreateDonationPage';
import EditDonationPage from './pages/EditDonationPage';
import MyDonationsPage from './pages/MyDonationsPage';
import IncomingRequestsPage from './pages/IncomingRequestsPage';

// NGO Pages
import NgoDashboard from './pages/NgoDashboard';
import BrowseDonationsPage from './pages/BrowseDonationsPage';
import MyRequestsPage from './pages/MyRequestsPage';

// Shared / Details Page
import DonationDetailsPage from './pages/DonationDetailsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Shared Food Details Route */}
              <Route
                path="/donations/:id"
                element={
                  <ProtectedRoute>
                    <DonationDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Donor Routes */}
              <Route
                path="/donor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/create-donation"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <CreateDonationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/edit-donation/:id"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <EditDonationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/my-donations"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <MyDonationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/donor/requests"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <IncomingRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* NGO Routes */}
              <Route
                path="/ngo/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['NGO']}>
                    <NgoDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ngo/browse"
                element={
                  <ProtectedRoute allowedRoles={['NGO', 'DONOR', 'ADMIN']}>
                    <BrowseDonationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ngo/my-requests"
                element={
                  <ProtectedRoute allowedRoles={['NGO']}>
                    <MyRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* User Profile and Notifications Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="footer">
            <div className="container footer-content">
              <p>&copy; {new Date().getFullYear()} SharePlate – Surplus Food Rescue and Distribution System.</p>
              <p className="footer-subtext">Academic Software Engineering Project | MERN Stack</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
