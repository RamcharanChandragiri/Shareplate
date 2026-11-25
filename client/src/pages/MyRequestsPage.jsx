import { useState, useEffect } from 'react';
import { requestAPI } from '../services/api';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    requestAPI
      .getMy()
      .then((res) => {
        if (isMounted && res.success && res.requests) {
          setRequests(res.requests);
        }
      })
      .catch((err) => {
        if (isMounted) setActionMessage(err.message || 'Failed to load requests.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleCancel = async (id, title) => {
    if (!window.confirm(`Are you sure you want to cancel your request for '${title}'?`)) {
      return;
    }
    try {
      setActionMessage('');
      const res = await requestAPI.cancel(id);
      if (res.success) {
        setActionMessage('Request cancelled and surplus quantity restored to available.');
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Could not cancel request.');
    }
  };

  const handleConfirmCollection = async (id) => {
    try {
      setActionMessage('');
      const res = await requestAPI.confirmCollection(id);
      if (res.success) {
        setActionMessage(res.message);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Collection confirmation failed.');
    }
  };

  const filtered = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>My Food Claim Requests</h2>
          <p className="text-muted">
            Track your requested donations, coordinate pickup times, and confirm food handovers.
          </p>
        </div>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      <div className="filter-bar">
        <label htmlFor="filterNgoStatus">Filter by Status: </label>
        <select
          id="filterNgoStatus"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-sm"
        >
          <option value="ALL">All Requests ({requests.length})</option>
          <option value="PENDING">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No food requests found</h3>
          <p className="text-muted">
            You haven&apos;t submitted any requests matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Donation Item</th>
                <th>Donor Organization</th>
                <th>Claimed Quantity</th>
                <th>Request Status</th>
                <th>Pickup Instructions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.donation?.title}</strong>
                    <div className="table-subtext">Category: {r.donation?.category?.replace('_', ' ')}</div>
                  </td>
                  <td>
                    <strong>{r.donor?.donorDetails?.organizationName || r.donor?.name}</strong>
                    <div className="table-subtext">📞 {r.donor?.phone}</div>
                    <div className="table-subtext">📍 {r.donation?.pickupLocation}</div>
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
                    {r.collectionConfirmedByNgo && !r.handoverConfirmedByDonor && (
                      <div className="table-subtext text-warning">
                        Collection confirmed (Awaiting donor)
                      </div>
                    )}
                  </td>
                  <td>
                    {r.status === 'APPROVED' || r.status === 'READY_FOR_PICKUP' ? (
                      <div>
                        <strong>Window:</strong> {r.donation?.pickupWindow}
                        {r.pickupScheduledTime && (
                          <div className="table-subtext">
                            Scheduled: {new Date(r.pickupScheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {r.pickupNotes && (
                          <div className="table-subtext text-muted">Notes: {r.pickupNotes}</div>
                        )}
                      </div>
                    ) : r.status === 'REJECTED' ? (
                      <span className="text-danger">
                        {r.rejectionReason || 'Declined by donor'}
                      </span>
                    ) : (
                      <span className="text-muted">Awaiting donor approval</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {['APPROVED', 'READY_FOR_PICKUP'].includes(r.status) && (
                        <button
                          type="button"
                          onClick={() => handleConfirmCollection(r._id)}
                          disabled={r.collectionConfirmedByNgo}
                          className="btn btn-success btn-xs"
                        >
                          {r.collectionConfirmedByNgo ? 'Collection Confirmed' : 'Confirm Collection'}
                        </button>
                      )}

                      {['PENDING', 'APPROVED'].includes(r.status) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(r._id, r.donation?.title)}
                          className="btn btn-danger btn-xs"
                        >
                          Cancel Request
                        </button>
                      )}

                      {r.status === 'COMPLETED' && (
                        <span className="badge-pill badge-ngo">Collected</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
