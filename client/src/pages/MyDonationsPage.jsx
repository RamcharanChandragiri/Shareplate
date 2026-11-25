import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { donationAPI } from '../services/api';

export default function MyDonationsPage() {
  const location = useLocation();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState(
    () => location.state?.message || ''
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    donationAPI
      .getMy()
      .then((res) => {
        if (isMounted && res.success && res.donations) {
          setDonations(res.donations);
        }
      })
      .catch((err) => {
        if (isMounted) setActionMessage(err.message || 'Failed to load donations.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleCancel = async (id, title) => {
    if (!window.confirm(`Are you sure you want to cancel the listing '${title}'?`)) {
      return;
    }
    try {
      setActionMessage('');
      const res = await donationAPI.cancel(id);
      if (res.success) {
        setActionMessage(`Listing '${title}' has been cancelled.`);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Could not cancel listing.');
    }
  };

  const filtered = donations.filter((d) => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>My Food Donation Listings</h2>
          <p className="text-muted">
            Track surplus listings, monitor remaining inventory, and manage active donations.
          </p>
        </div>
        <Link to="/donor/create-donation" className="btn btn-primary">
          + New Donation
        </Link>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      {/* Filter Tabs */}
      <div className="filter-bar">
        <label htmlFor="statusSelect">Filter by Status: </label>
        <select
          id="statusSelect"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-sm"
        >
          <option value="ALL">All Statuses ({donations.length})</option>
          <option value="AVAILABLE">Available</option>
          <option value="CLAIMED">Claimed</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="PARTIALLY_RESERVED">Partially Reserved</option>
          <option value="FULLY_RESERVED">Fully Reserved</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your donations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🍲</div>
          <h3>No food donations found</h3>
          <p className="text-muted">
            {statusFilter === 'ALL'
              ? 'You have not published any surplus food listings yet.'
              : `No listings with status '${statusFilter}'.`}
          </p>
          <Link to="/donor/create-donation" className="btn btn-primary btn-sm">
            Publish Food Donation Now
          </Link>
        </div>
      ) : (
        <div className="donations-grid">
          {filtered.map((d) => (
            <div key={d._id} className="donation-card">
              <div className="card-top">
                <span className="category-pill">{d.category.replace('_', ' ')}</span>
                <span className={`status-pill status-${d.status.toLowerCase()}`}>
                  {d.status.replace('_', ' ')}
                </span>
              </div>

              {d.imageUrl && (
                <div style={{ maxHeight: '150px', overflow: 'hidden', borderRadius: '6px', marginBottom: '0.5rem' }}>
                  <img
                    src={d.imageUrl}
                    alt={d.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <h3 className="card-title">{d.title}</h3>
              <p className="card-desc">{d.description}</p>

              {d.claimedBy && (
                <div className="notice-box" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  🤝 <strong>Claimed by:</strong> {d.claimedBy?.ngoDetails?.ngoName || d.claimedBy?.name}
                </div>
              )}

              {/* Progress and quantities */}
              <div className="quantity-bar-container">
                <div className="quantity-labels">
                  <span>Available: <strong>{d.availableQuantity} {d.quantityUnit}</strong></span>
                  <span>Total: {d.totalQuantity} {d.quantityUnit}</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill progress-fulfilled"
                    style={{ width: `${(d.fulfilledQuantity / d.totalQuantity) * 100}%` }}
                    title={`Fulfilled: ${d.fulfilledQuantity}`}
                  ></div>
                  <div
                    className="progress-fill progress-reserved"
                    style={{ width: `${(d.reservedQuantity / d.totalQuantity) * 100}%` }}
                    title={`Reserved: ${d.reservedQuantity}`}
                  ></div>
                </div>
                <div className="quantity-sublabels">
                  <span>Reserved: {d.reservedQuantity}</span>
                  <span>Fulfilled: {d.fulfilledQuantity}</span>
                </div>
              </div>

              <div className="card-meta">
                <div>📍 {d.pickupLocation}</div>
                <div>⏰ Window: {d.pickupWindow}</div>
                <div>⏳ Expiry: {new Date(d.expiryDateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div className="card-actions">
                <Link to={`/donations/${d._id}`} className="btn btn-secondary btn-sm">
                  Details
                </Link>
                {!['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status) && (
                  <>
                    <Link to={`/donor/edit-donation/${d._id}`} className="btn btn-outline btn-sm">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleCancel(d._id, d.title)}
                      className="btn btn-danger btn-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
