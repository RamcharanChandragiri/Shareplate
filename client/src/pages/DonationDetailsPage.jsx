import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { donationAPI, requestAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function DonationDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestQty, setRequestQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCoordinationForm, setShowCoordinationForm] = useState(false);
  const [pickupCoordination, setPickupCoordination] = useState({
    pickupScheduledTime: '',
    pickupNotes: ''
  });

  const isNgo = user?.role === 'NGO';
  const isVerifiedNgo = isNgo && user?.ngoVerificationStatus === 'VERIFIED';
  const isOwner = donation?.donor?._id === user?.id || donation?.donor === user?.id;
  const isClaimedNgo = donation?.claimedBy?._id === user?.id || donation?.claimedBy === user?.id;

  const handleDirectClaim = async () => {
    if (!isVerifiedNgo) {
      setError('Only verified NGOs can claim food donations.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await donationAPI.claim(donation._id);
      if (res.success) {
        setMessage('Food donation claimed successfully! The donor has been notified.');
        setDonation(res.donation);
      }
    } catch (err) {
      setError(err.message || 'Failed to claim food donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPickedUp = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await donationAPI.pickup(donation._id);
      if (res.success) {
        setMessage('Status updated: Food marked as picked up.');
        setDonation(res.donation);
      }
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await donationAPI.complete(donation._id);
      if (res.success) {
        setMessage('Status updated: Food donation completed!');
        setDonation(res.donation);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete donation.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    donationAPI
      .getById(id)
      .then((res) => {
        if (res.success && res.donation) {
          setDonation(res.donation);
          setRequestQty(res.donation.availableQuantity);
          setPickupCoordination({
            pickupScheduledTime: res.donation.pickupScheduledTime
              ? new Date(res.donation.pickupScheduledTime).toISOString().slice(0, 16)
              : '',
            pickupNotes: res.donation.pickupNotes || ''
          });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveCoordination = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const res = await donationAPI.schedulePickup(donation._id, pickupCoordination);
      if (res.success) {
        setMessage('Pickup logistics and coordination notes saved successfully.');
        setDonation(res.donation);
        setShowCoordinationForm(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to update pickup coordination.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!isVerifiedNgo) {
      setError('Only verified NGOs can request food donations.');
      return;
    }
    const qty = Number(requestQty);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (qty > donation.availableQuantity) {
      setError(`Cannot request more than the remaining ${donation.availableQuantity} ${donation.quantityUnit}.`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await requestAPI.create({
        donationId: donation._id,
        requestedQuantity: qty
      });
      if (res.success) {
        setMessage('Your food request has been submitted! Redirecting to your requests...');
        setTimeout(() => navigate('/ngo/my-requests'), 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading donation details...</p>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="container page-container">
        <div className="empty-state">
          <h3>Listing Not Found</h3>
          <p>The requested food listing does not exist or may have been removed.</p>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <button type="button" onClick={() => navigate(-1)} className="btn-link-xs back-btn">
            &larr; Back
          </button>
          <h2>{donation.title}</h2>
          <div className="card-top-inline">
            <span className="category-pill">{donation.category.replace('_', ' ')}</span>
            <span className={`status-pill status-${donation.status.toLowerCase()}`}>
              {donation.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {donation.imageUrl && (
        <div style={{ maxHeight: '320px', overflow: 'hidden', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <img
            src={donation.imageUrl}
            alt={donation.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="details-layout">
        {/* Main Details */}
        <div className="details-main">
          <div className="details-card">
            <h3>Description & Notes</h3>
            <p className="details-text">{donation.description}</p>
            {donation.specialInstructions && (
              <div className="notice-box">
                <strong>Special Instructions:</strong> {donation.specialInstructions}
              </div>
            )}
          </div>

          <div className="details-card">
            <h3>Pickup & Expiry Timeline</h3>
            <div className="details-grid">
              <div>
                <span className="profile-label">Pickup Location:</span>
                <strong>{donation.pickupLocation}</strong>
              </div>
              <div>
                <span className="profile-label">Pickup Window:</span>
                <strong>{donation.pickupWindow}</strong>
              </div>
              <div>
                <span className="profile-label">Preparation Time:</span>
                <div>{new Date(donation.preparationDateTime).toLocaleString()}</div>
              </div>
              <div>
                <span className="profile-label">Safe Expiry Deadline:</span>
                <div>{new Date(donation.expiryDateTime).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="details-card">
            <h3>Donor Information</h3>
            <div className="details-grid">
              <div>
                <span className="profile-label">Organization:</span>
                <strong>{donation.donor?.donorDetails?.organizationName || donation.donor?.name}</strong>
              </div>
              <div>
                <span className="profile-label">Type:</span>
                <div>{donation.donor?.donorDetails?.organizationType || 'Surplus Food Donor'}</div>
              </div>
              <div>
                <span className="profile-label">Contact:</span>
                <div>{donation.donor?.phone || 'Available after request confirmation'}</div>
              </div>
            </div>
          </div>

          {donation.claimedBy && (
            <div className="details-card" style={{ borderLeft: '4px solid #10b981' }}>
              <h3>🤝 Claiming NGO Details</h3>
              <div className="details-grid">
                <div>
                  <span className="profile-label">NGO Name:</span>
                  <strong>{donation.claimedBy?.ngoDetails?.ngoName || donation.claimedBy?.name}</strong>
                </div>
                <div>
                  <span className="profile-label">Contact Person:</span>
                  <div>{donation.claimedBy?.ngoDetails?.contactPerson || donation.claimedBy?.name}</div>
                </div>
                <div>
                  <span className="profile-label">Phone & Email:</span>
                  <div>{donation.claimedBy?.phone} | {donation.claimedBy?.email}</div>
                </div>
                <div>
                  <span className="profile-label">Claimed At:</span>
                  <div>{donation.claimedAt ? new Date(donation.claimedAt).toLocaleString() : 'Recently'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pickup Coordination & Logistics Card */}
          {(donation.pickupScheduledTime || donation.pickupNotes || isOwner || isClaimedNgo) && (
            <div className="details-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3>🚚 Pickup Logistics & Coordination</h3>
                {(isOwner || isClaimedNgo) && ['CLAIMED', 'PICKED_UP', 'AVAILABLE'].includes(donation.status) && (
                  <button
                    type="button"
                    onClick={() => setShowCoordinationForm(!showCoordinationForm)}
                    className="btn btn-outline btn-xs"
                  >
                    {showCoordinationForm ? 'Cancel' : 'Edit Logistics'}
                  </button>
                )}
              </div>

              {!showCoordinationForm ? (
                <div className="details-grid">
                  <div>
                    <span className="profile-label">Scheduled Pickup:</span>
                    <div>
                      {donation.pickupScheduledTime
                        ? new Date(donation.pickupScheduledTime).toLocaleString()
                        : 'Not yet scheduled'}
                    </div>
                  </div>
                  <div>
                    <span className="profile-label">Coordination Notes:</span>
                    <div>{donation.pickupNotes || 'No coordination notes provided yet.'}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveCoordination} style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="scheduledPickupInput">Scheduled Pickup Date & Time:</label>
                    <input
                      id="scheduledPickupInput"
                      type="datetime-local"
                      value={pickupCoordination.pickupScheduledTime}
                      onChange={(e) =>
                        setPickupCoordination((prev) => ({
                          ...prev,
                          pickupScheduledTime: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pickupNotesInput">Pickup & Delivery Notes (Gate instructions, vehicle, etc.):</label>
                    <textarea
                      id="pickupNotesInput"
                      rows="2"
                      value={pickupCoordination.pickupNotes}
                      onChange={(e) =>
                        setPickupCoordination((prev) => ({
                          ...prev,
                          pickupNotes: e.target.value
                        }))
                      }
                      placeholder="e.g. Van driver arriving at 4:30 PM with thermal containers"
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Logistics'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Claim Action */}
        <div className="details-sidebar">
          <div className="claim-box">
            <h4>Available Surplus</h4>
            <div className="claim-qty-display">
              <span className="qty-huge">{donation.availableQuantity}</span>
              <span className="qty-unit">{donation.quantityUnit} available</span>
            </div>
            <div className="total-sub">
              Total published: {donation.totalQuantity} {donation.quantityUnit}
            </div>

            {isNgo && (
              <>
                <hr className="divider" />
                {isVerifiedNgo ? (
                  donation.availableQuantity > 0 && !['COMPLETED', 'CANCELLED', 'EXPIRED', 'CLAIMED', 'PICKED_UP'].includes(donation.status) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={handleDirectClaim}
                        className="btn btn-success btn-block"
                        disabled={submitting}
                      >
                        {submitting ? 'Claiming...' : 'Claim Full Donation'}
                      </button>

                      <div className="text-center text-muted" style={{ fontSize: '0.85rem' }}>— OR REQUEST SPECIFIC QUANTITY —</div>

                      <form onSubmit={handleRequestSubmit}>
                        <div className="form-group">
                          <label htmlFor="quantityClaim">Request Quantity ({donation.quantityUnit}):</label>
                          <input
                            id="quantityClaim"
                            type="number"
                            min="1"
                            max={donation.availableQuantity}
                            value={requestQty}
                            onChange={(e) => setRequestQty(e.target.value)}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn-primary btn-block"
                          disabled={submitting}
                        >
                          {submitting ? 'Submitting...' : 'Submit Partial Request'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="notice-box text-center">
                      This listing is currently {donation.status.toLowerCase().replace('_', ' ')}.
                    </div>
                  )
                ) : (
                  <div className="notice-box">
                    <strong>Pending Verification:</strong> Your NGO account must be verified by an Administrator before requesting food.
                  </div>
                )}
              </>
            )}

            {isOwner && (
              <div className="owner-box">
                <hr className="divider" />
                <p className="text-muted">You are the donor of this food listing.</p>
                {donation.status === 'AVAILABLE' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/donor/edit-donation/${donation._id}`)}
                    className="btn btn-outline btn-block btn-sm"
                  >
                    Edit Listing
                  </button>
                )}
                {donation.status === 'CLAIMED' && (
                  <button
                    type="button"
                    onClick={handleMarkPickedUp}
                    disabled={submitting}
                    className="btn btn-primary btn-block btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Mark as Picked Up
                  </button>
                )}
                {donation.status === 'PICKED_UP' && (
                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    disabled={submitting}
                    className="btn btn-success btn-block btn-sm"
                    style={{ marginTop: '0.5rem' }}
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
