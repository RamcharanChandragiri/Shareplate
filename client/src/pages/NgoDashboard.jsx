import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { requestAPI, donationAPI } from '../services/api';

export default function NgoDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    completedRequests: 0,
    totalQuantityCollected: 0
  });
  const [activeClaims, setActiveClaims] = useState([]);
  const [featuredDonations, setFeaturedDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  const isVerified = user?.ngoVerificationStatus === 'VERIFIED';
  const isPending = user?.ngoVerificationStatus === 'PENDING';
  const isRejected = user?.ngoVerificationStatus === 'REJECTED';

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      requestAPI.getNgoStats(),
      requestAPI.getMy(),
      donationAPI.getAll('?limit=4')
    ])
      .then(([statsRes, reqRes, donRes]) => {
        if (isMounted) {
          if (statsRes.success) setStats(statsRes.stats);
          if (reqRes.success) {
            setActiveClaims(
              reqRes.requests.filter((r) =>
                ['PENDING', 'APPROVED', 'READY_FOR_PICKUP'].includes(r.status)
              )
            );
          }
          if (donRes.success) setFeaturedDonations(donRes.donations || []);
        }
      })
      .catch((err) => console.error('NGO dashboard load error:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-page container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-badge badge-ngo">NGO Partner Portal</div>
          <h1>Welcome, {user?.ngoDetails?.ngoName || user?.name}</h1>
          <p className="text-muted">
            Claim available food donations, manage distribution logistics, and track pickup orders.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/ngo/browse" className="btn btn-primary">
            🔍 Browse Surplus Food
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {/* Verification Banner */}
      <div
        className={`verification-banner ${
          isVerified ? 'banner-verified' : isPending ? 'banner-pending' : 'banner-rejected'
        }`}
      >
        <div className="banner-icon">
          {isVerified ? '✅' : isPending ? '⏳' : '❌'}
        </div>
        <div>
          <h4>
            Verification Status:{' '}
            <span className="status-highlight">{user?.ngoVerificationStatus || 'PENDING'}</span>
          </h4>
          <p>
            {isVerified &&
              'Your organization is fully verified. You have full access to browse and claim surplus food donations.'}
            {isPending &&
              'Your registration is currently under review by our administrators. You can browse available surplus listings, but food claiming is restricted until verified.'}
            {isRejected &&
              'Your registration verification could not be approved. Please contact SharePlate support.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-number">{stats.availableFoodDonations ?? featuredDonations.length}</span>
          <span className="metric-label">Available Food Listings</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.totalDonationsClaimed ?? stats.totalRequests}</span>
          <span className="metric-label">Total Donations Claimed</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.pendingPickups ?? stats.approvedRequests}</span>
          <span className="metric-label">Pending Pickups</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.completedPickups ?? stats.completedRequests}</span>
          <span className="metric-label">Completed Pickups</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.totalFoodReceived ?? stats.totalQuantityCollected}</span>
          <span className="metric-label">Total Quantity Received</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="quick-links-grid" style={{ marginBottom: '2rem' }}>
        <Link to="/ngo/browse" className="quick-link-card">
          <span className="quick-icon">🔍</span>
          <div>
            <h4>Browse Available Food</h4>
            <p>Find surplus cooked meals, bakery goods, and produce from local donors.</p>
          </div>
        </Link>
        <Link to="/ngo/my-requests" className="quick-link-card">
          <span className="quick-icon">📦</span>
          <div>
            <h4>View Claimed Donations</h4>
            <p>Track claim statuses, pickup coordination schedules, and confirmations.</p>
          </div>
        </Link>
        <Link to="/notifications" className="quick-link-card">
          <span className="quick-icon">🔔</span>
          <div>
            <h4>Notification History</h4>
            <p>Check approval notices, pickup alerts, and platform announcements.</p>
          </div>
        </Link>
        <Link to="/profile" className="quick-link-card">
          <span className="quick-icon">🏢</span>
          <div>
            <h4>Manage NGO Profile</h4>
            <p>View verification status, update shelter address and contact details.</p>
          </div>
        </Link>
      </div>

      {/* Active Food Claims */}
      <div className="dashboard-section">
        <div className="section-header-inline">
          <h3>Active Claim Orders ({activeClaims.length})</h3>
          <Link to="/ngo/my-requests" className="btn-link-xs">
            View All Claims &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading claim requests...</p>
          </div>
        ) : activeClaims.length === 0 ? (
          <div className="empty-box">
            <p className="text-muted">You have no active claims in progress.</p>
            <Link to="/ngo/browse" className="btn btn-outline btn-sm">
              Browse Available Food
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Food Listing</th>
                  <th>Donor Facility</th>
                  <th>Claim Qty</th>
                  <th>Status</th>
                  <th>Pickup Address & Window</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeClaims.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.donation?.title}</strong>
                      <div className="table-subtext">{r.donation?.category?.replace('_', ' ')}</div>
                    </td>
                    <td>
                      <strong>{r.donor?.donorDetails?.organizationName || r.donor?.name}</strong>
                      <div className="table-subtext">📞 {r.donor?.phone}</div>
                    </td>
                    <td>
                      <span className="qty-highlight">
                        {r.requestedQuantity} {r.donation?.quantityUnit}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${r.status.toLowerCase()}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div>📍 {r.donation?.pickupLocation}</div>
                      <div className="table-subtext">Window: {r.donation?.pickupWindow}</div>
                    </td>
                    <td>
                      <Link to="/ngo/my-requests" className="btn btn-primary btn-xs">
                        View Pickup Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Surplus Preview */}
      <div className="dashboard-section">
        <div className="section-header-inline">
          <h3>Fresh Surplus Available for Rescue</h3>
          <Link to="/ngo/browse" className="btn-link-xs">
            Browse All &rarr;
          </Link>
        </div>

        <div className="donations-grid">
          {featuredDonations.map((d) => (
            <div key={d._id} className="donation-card browse-card">
              <div className="card-top">
                <span className="category-pill">{d.category.replace('_', ' ')}</span>
                <span className="qty-tag">
                  {d.availableQuantity} {d.quantityUnit} left
                </span>
              </div>
              <h4 className="card-title">{d.title}</h4>
              <p className="card-donor">
                By <strong>{d.donor?.donorDetails?.organizationName || d.donor?.name}</strong>
              </p>
              <div className="card-meta">
                <div>📍 {d.pickupLocation}</div>
                <div>⏰ Window: {d.pickupWindow}</div>
              </div>
              <div className="card-actions">
                <Link to={`/donations/${d._id}`} className="btn btn-secondary btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
