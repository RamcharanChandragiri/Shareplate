import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { donationAPI, requestAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function BrowseDonationsPage() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [message, setMessage] = useState('');
  const [requestModal, setRequestModal] = useState(null); // active donation to request
  const [requestQty, setRequestQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isVerified = user?.ngoVerificationStatus === 'VERIFIED';

  useEffect(() => {
    let isMounted = true;
    let query = `?sortBy=${sortBy}&`;
    if (category) query += `category=${category}&`;
    if (search) query += `search=${encodeURIComponent(search)}&`;

    donationAPI
      .getAll(query)
      .then((res) => {
        if (isMounted && res.success && res.donations) {
          setDonations(res.donations);
        }
      })
      .catch((err) => {
        if (isMounted) setMessage(err.message || 'Failed to load surplus listings.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category, search, sortBy, refreshKey]);

  const handleOpenRequest = (donation) => {
    if (!isVerified) {
      setMessage('Access restricted: Only verified NGOs can request food donations.');
      return;
    }
    setRequestModal(donation);
    setRequestQty(donation.availableQuantity); // default to full available
    setMessage('');
  };

  const handleConfirmRequest = async (e) => {
    e.preventDefault();
    if (!requestQty || Number(requestQty) <= 0) {
      setMessage('Please enter a valid requested quantity.');
      return;
    }
    if (Number(requestQty) > requestModal.availableQuantity) {
      setMessage(`Requested quantity cannot exceed available quantity (${requestModal.availableQuantity} ${requestModal.quantityUnit}).`);
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      const res = await requestAPI.create({
        donationId: requestModal._id,
        requestedQuantity: Number(requestQty)
      });
      if (res.success) {
        setMessage(`Success! Claim request for ${requestQty} ${requestModal.quantityUnit} submitted. The donor has been notified.`);
        setRequestModal(null);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to submit food request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectClaim = async (donation) => {
    if (!isVerified) {
      setMessage('Access restricted: Only verified NGOs can claim food donations.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      const res = await donationAPI.claim(donation._id);
      if (res.success) {
        setMessage(`Success! You have officially claimed '${donation.title}'. The donor has been notified.`);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setMessage(err.message || 'Failed to claim food donation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>Available Surplus Food Listings</h2>
          <p className="text-muted">
            Browse fresh, verified food donations from local restaurants, hotels, and cafeterias.
          </p>
        </div>
      </div>

      {!isVerified && (
        <div className="verification-banner banner-pending">
          <div className="banner-icon">⏳</div>
          <div>
            <h4>Account Verification Pending</h4>
            <p>
              Your NGO account is currently under review by our administrators. You can browse
              available donations, but request submission will be unlocked upon verification.
            </p>
          </div>
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}

      {/* Search and Category Filters */}
      <div className="search-filter-card">
        <div className="search-sort-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrap" style={{ flex: '1', minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Search by food name, description, or pickup location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="sort-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="sortBySelect" style={{ fontSize: '0.9rem', fontWeight: '500' }}>Sort:</label>
            <select
              id="sortBySelect"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-sm"
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="latest">Latest Donations</option>
              <option value="expiry">Nearest Expiry First</option>
            </select>
          </div>
        </div>

        <div className="category-scroll-pills">
          <button
            type="button"
            className={`pill-btn ${category === '' ? 'active' : ''}`}
            onClick={() => setCategory('')}
          >
            All Categories
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'COOKED_MEALS' ? 'active' : ''}`}
            onClick={() => setCategory('COOKED_MEALS')}
          >
            🍲 Cooked Meals
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'BAKED_GOODS' ? 'active' : ''}`}
            onClick={() => setCategory('BAKED_GOODS')}
          >
            🍞 Baked Goods
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'RAW_INGREDIENTS' ? 'active' : ''}`}
            onClick={() => setCategory('RAW_INGREDIENTS')}
          >
            🥦 Raw Ingredients
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'PACKAGED_FOOD' ? 'active' : ''}`}
            onClick={() => setCategory('PACKAGED_FOOD')}
          >
            🥫 Packaged Food
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'FRUITS_VEGETABLES' ? 'active' : ''}`}
            onClick={() => setCategory('FRUITS_VEGETABLES')}
          >
            🍎 Fruits & Veggies
          </button>
          <button
            type="button"
            className={`pill-btn ${category === 'DAIRY' ? 'active' : ''}`}
            onClick={() => setCategory('DAIRY')}
          >
            🥛 Dairy
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Finding available food...</p>
        </div>
      ) : donations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No surplus food listings found</h3>
          <p className="text-muted">
            Try adjusting your search query or category filters, or check back soon.
          </p>
        </div>
      ) : (
        <div className="donations-grid">
          {donations.map((d) => (
            <div key={d._id} className="donation-card browse-card">
              {d.imageUrl && (
                <div style={{ maxHeight: '180px', overflow: 'hidden', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  <img
                    src={d.imageUrl}
                    alt={d.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div className="card-top">
                <span className="category-pill">{d.category.replace('_', ' ')}</span>
                <span className="qty-tag">
                  {d.availableQuantity} {d.quantityUnit} left
                </span>
              </div>

              <h3 className="card-title">{d.title}</h3>
              <p className="card-donor">
                By <strong>{d.donor?.donorDetails?.organizationName || d.donor?.name}</strong>
              </p>
              <p className="card-desc">{d.description}</p>

              <div className="card-meta">
                <div>📍 {d.pickupLocation}</div>
                <div>⏰ Window: {d.pickupWindow}</div>
                <div>⏳ Expiry: {new Date(d.expiryDateTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div className="card-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Link to={`/donations/${d._id}`} className="btn btn-secondary btn-sm" style={{ flex: '1' }}>
                  Details
                </Link>
                <button
                  type="button"
                  onClick={() => handleDirectClaim(d)}
                  disabled={!isVerified || d.availableQuantity <= 0 || submitting}
                  className="btn btn-success btn-sm"
                  style={{ flex: '1' }}
                  title="Claim the complete available donation"
                >
                  Claim All
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenRequest(d)}
                  disabled={!isVerified || d.availableQuantity <= 0 || submitting}
                  className="btn btn-primary btn-sm"
                  style={{ flex: '1' }}
                >
                  Request Qty
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Submitting Food Request */}
      {requestModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Request Food: {requestModal.title}</h3>
            <p className="text-muted">
              Offered by {requestModal.donor?.donorDetails?.organizationName || requestModal.donor?.name}
            </p>

            <form onSubmit={handleConfirmRequest} className="modal-form">
              <div className="info-box-summary">
                <div><strong>Available:</strong> {requestModal.availableQuantity} {requestModal.quantityUnit}</div>
                <div><strong>Pickup Location:</strong> {requestModal.pickupLocation}</div>
                <div><strong>Pickup Window:</strong> {requestModal.pickupWindow}</div>
                <div><strong>Expiry:</strong> {new Date(requestModal.expiryDateTime).toLocaleString()}</div>
              </div>

              <div className="form-group">
                <label htmlFor="reqQty">Requested Quantity ({requestModal.quantityUnit}) *</label>
                <input
                  id="reqQty"
                  type="number"
                  min="1"
                  max={requestModal.availableQuantity}
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  required
                />
                <div className="quantity-quick-btns">
                  <button
                    type="button"
                    onClick={() => setRequestQty(requestModal.availableQuantity)}
                    className="btn-link-xs"
                  >
                    Request Full Quantity ({requestModal.availableQuantity})
                  </button>
                  {requestModal.availableQuantity > 1 && (
                    <button
                      type="button"
                      onClick={() => setRequestQty(Math.ceil(requestModal.availableQuantity / 2))}
                      className="btn-link-xs"
                    >
                      Request Half ({Math.ceil(requestModal.availableQuantity / 2)})
                    </button>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setRequestModal(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting Request...' : `Confirm Claim (${requestQty} ${requestModal.quantityUnit})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
