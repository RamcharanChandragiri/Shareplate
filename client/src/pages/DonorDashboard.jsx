import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { donationAPI, requestAPI } from '../services/api';

export default function DonorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalDonations: 0,
    activeListings: 0,
    completedDonations: 0,
    totalQuantityRescued: 0,
    pendingRequests: 0,
    approvedRequests: 0
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([donationAPI.getDonorStats(), requestAPI.getIncoming()])
      .then(([statsRes, reqRes]) => {
        if (isMounted) {
          if (statsRes.success) setStats(statsRes.stats);
          if (reqRes.success) setRecentRequests(reqRes.requests.slice(0, 5));
        }
      })
      .catch((err) => console.error('Dashboard load error:', err))
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
          <div className="dashboard-badge badge-donor">Donor Portal</div>
          <h1>Welcome, {user?.donorDetails?.organizationName || user?.name}</h1>
          <p className="text-muted">
            Manage surplus food donations, review claims, and monitor distribution impact.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/donor/create-donation" className="btn btn-primary">
            + Donate Surplus Food
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-number">{stats.totalDonations}</span>
          <span className="metric-label">Total Published Listings</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.activeListings}</span>
          <span className="metric-label">Active Available Listings</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.claimedDonations || 0}</span>
          <span className="metric-label">Claimed & In-Transit</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.completedDonations || 0}</span>
          <span className="metric-label">Completed Donations</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.cancelledOrExpiredDonations || 0}</span>
          <span className="metric-label">Cancelled / Expired</span>
        </div>
        <div className="metric-card">
          <span className="metric-number">{stats.totalQuantityRescued}</span>
          <span className="metric-label">Total Quantity Rescued</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="quick-links-grid">
        <Link to="/donor/create-donation" className="quick-link-card">
          <span className="quick-icon">🍲</span>
          <div>
            <h4>Publish Surplus Food</h4>
            <p>Post excess meals, bread, or fresh groceries with pickup times.</p>
          </div>
        </Link>
        <Link to="/donor/my-donations" className="quick-link-card">
          <span className="quick-icon">📋</span>
          <div>
            <h4>Manage My Listings</h4>
            <p>View remaining quantities, edit active details, or cancel listings.</p>
          </div>
        </Link>
        <Link to="/donor/requests" className="quick-link-card">
          <span className="quick-icon">🤝</span>
          <div>
            <h4>Incoming NGO Claims ({stats.pendingRequests} new)</h4>
            <p>Review requests, coordinate pickup times, and confirm handovers.</p>
          </div>
        </Link>
        <Link to="/profile" className="quick-link-card">
          <span className="quick-icon">⚙️</span>
          <div>
            <h4>Account & Pickup Profile</h4>
            <p>Update facility name, pickup instructions, and emergency contact details.</p>
          </div>
        </Link>
      </div>

      {/* Recent Requests Section */}
      <div className="dashboard-section">
        <div className="section-header-inline">
          <h3>Recent Incoming Requests</h3>
          <Link to="/donor/requests" className="btn-link-xs">
            View All Requests &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="loading-box">
            <div className="spinner"></div>
            <p>Loading requests...</p>
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="empty-box">
            <p className="text-muted">No NGO requests received yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>NGO Partner</th>
                  <th>Food Listing</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.ngo?.ngoDetails?.ngoName || r.ngo?.name}</strong>
                      <div className="table-subtext">📞 {r.ngo?.phone}</div>
                    </td>
                    <td>{r.donation?.title}</td>
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
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link to="/donor/requests" className="btn btn-outline btn-xs">
                        Review &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Organization Details Footer Card */}
      <div className="profile-card">
        <h3>🏢 Registered Facility Details</h3>
        <div className="profile-grid">
          <div>
            <span className="profile-label">Organization Name:</span>
            <strong>{user?.donorDetails?.organizationName || 'Not Specified'}</strong>
          </div>
          <div>
            <span className="profile-label">Organization Type:</span>
            <strong>{user?.donorDetails?.organizationType || 'Not Specified'}</strong>
          </div>
          <div>
            <span className="profile-label">Contact Person:</span>
            <strong>{user?.name}</strong>
          </div>
          <div>
            <span className="profile-label">Pickup Address:</span>
            <strong>{user?.donorDetails?.address || 'Not Specified'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
