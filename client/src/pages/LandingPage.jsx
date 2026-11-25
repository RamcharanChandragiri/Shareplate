import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'DONOR') return '/donor/dashboard';
    if (user.role === 'NGO') return '/ngo/dashboard';
    return '/admin/dashboard';
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <span className="hero-pill">🌱 Zero Waste, Zero Hunger</span>
            <h1 className="hero-title">
              Rescuing Surplus Food, <br />
              <span className="text-highlight">Feeding Communities.</span>
            </h1>
            <p className="hero-subtitle">
              SharePlate seamlessly bridges the gap between commercial surplus food donors
              (restaurants, hotels, cafeterias) and verified charitable organizations (NGOs)
              to ensure no fresh food goes to waste.
            </p>

            <div className="hero-cta-group">
              {isAuthenticated ? (
                <Link to={getDashboardPath()} className="btn btn-primary btn-lg">
                  Go to {user.role} Dashboard &rarr;
                </Link>
              ) : (
                <>
                  <Link to="/register?role=DONOR" className="btn btn-primary btn-lg">
                    Donate Food as Donor
                  </Link>
                  <Link to="/register?role=NGO" className="btn btn-outline btn-lg">
                    Request Food as NGO
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Role Overview Section */}
      <section className="roles-section">
        <div className="container">
          <div className="section-header">
            <h2>Designed for Impact Across Three Key Roles</h2>
            <p>A unified ecosystem with tailored workflows and security guarantees.</p>
          </div>

          <div className="roles-grid">
            <div className="role-card">
              <div className="role-icon donor-icon">🏪</div>
              <h3>Surplus Food Donors</h3>
              <p>
                Restaurants, event caterers, hotels, and university cafeterias can list excess
                edible food with details on quantity, packaging, and pickup deadlines.
              </p>
              <ul className="role-benefits">
                <li>✔ Quick listing of surplus items</li>
                <li>✔ Direct pickup coordination</li>
                <li>✔ Track food waste reduction metrics</li>
              </ul>
              <Link to="/register?role=DONOR" className="card-link">
                Register as Donor &rarr;
              </Link>
            </div>

            <div className="role-card featured-role">
              <div className="role-badge">Verified Access</div>
              <div className="role-icon ngo-icon">🤝</div>
              <h3>Charitable NGOs</h3>
              <p>
                Verified orphanages, community shelters, and non-profits browse available
                donations and claim food for immediate distribution to those in need.
              </p>
              <ul className="role-benefits">
                <li>✔ Real-time food availability alerts</li>
                <li>✔ Transparent reservation system</li>
                <li>✔ Vetted NGO network integrity</li>
              </ul>
              <Link to="/register?role=NGO" className="card-link">
                Register as NGO &rarr;
              </Link>
            </div>

            <div className="role-card">
              <div className="role-icon admin-icon">🛡️</div>
              <h3>Platform Administrators</h3>
              <p>
                Dedicated verification and monitoring controls to ensure quality, compliance, and
                safety throughout the food redistribution lifecycle.
              </p>
              <ul className="role-benefits">
                <li>✔ Strict NGO vetting workflows</li>
                <li>✔ Secure role-based provisioning</li>
                <li>✔ Platform audit trails and reports</li>
              </ul>
              <Link to="/login" className="card-link">
                Administrator Sign In &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
