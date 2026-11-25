import { useState, useEffect } from 'react';
import { requestAPI } from '../services/api';

export default function IncomingRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null); // { type: 'REJECT' | 'APPROVE', requestId }
  const [modalInput, setModalInput] = useState({ reason: '', notes: '', time: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    requestAPI
      .getIncoming()
      .then((res) => {
        if (isMounted && res.success && res.requests) {
          setRequests(res.requests);
        }
      })
      .catch((err) => {
        if (isMounted) setActionMessage(err.message || 'Failed to load incoming requests.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleApprove = async (id) => {
    try {
      setActionMessage('');
      const res = await requestAPI.approve(id, {
        donorResponse: modalInput.notes || 'Approved. Ready for scheduled pickup.',
        pickupNotes: modalInput.notes,
        pickupScheduledTime: modalInput.time ? new Date(modalInput.time) : undefined
      });
      if (res.success) {
        setActionMessage('Request approved successfully!');
        setActiveModal(null);
        setModalInput({ reason: '', notes: '', time: '' });
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Could not approve request.');
    }
  };

  const handleReject = async (id) => {
    try {
      setActionMessage('');
      const res = await requestAPI.reject(id, modalInput.reason || 'Cannot fulfill at this time');
      if (res.success) {
        setActionMessage('Request rejected. Reserved quantity restored to surplus.');
        setActiveModal(null);
        setModalInput({ reason: '', notes: '', time: '' });
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Could not reject request.');
    }
  };

  const handleMarkReady = async (id) => {
    try {
      setActionMessage('');
      const res = await requestAPI.markReady(id);
      if (res.success) {
        setActionMessage('Food marked as ready for pickup! NGO notified.');
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Action failed.');
    }
  };

  const handleConfirmHandover = async (id) => {
    try {
      setActionMessage('');
      const res = await requestAPI.confirmHandover(id);
      if (res.success) {
        setActionMessage(res.message);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Handover confirmation failed.');
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
          <h2>Incoming NGO Food Requests</h2>
          <p className="text-muted">
            Review food claims from verified NGOs, coordinate pickups, and confirm handovers.
          </p>
        </div>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      <div className="filter-bar">
        <label htmlFor="filterStatus">Filter Status: </label>
        <select
          id="filterStatus"
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
          <p>Loading incoming requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📬</div>
          <h3>No requests found</h3>
          <p className="text-muted">No NGO requests match the selected status.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>NGO Organization</th>
                <th>Donation Item</th>
                <th>Requested Qty</th>
                <th>Status</th>
                <th>Pickup Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.ngo?.ngoDetails?.ngoName || r.ngo?.name}</strong>
                    <div className="table-subtext">Contact: {r.ngo?.name} ({r.ngo?.phone})</div>
                    <div className="table-subtext">Reg: {r.ngo?.ngoDetails?.registrationNumber}</div>
                  </td>
                  <td>
                    <strong>{r.donation?.title}</strong>
                    <div className="table-subtext">Location: {r.donation?.pickupLocation}</div>
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
                    {r.handoverConfirmedByDonor && !r.collectionConfirmedByNgo && (
                      <div className="table-subtext text-warning">
                        Handover confirmed (Waiting for NGO)
                      </div>
                    )}
                  </td>
                  <td>
                    {r.pickupScheduledTime ? (
                      <div>
                        {new Date(r.pickupScheduledTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    ) : (
                      <span className="text-muted">Window: {r.donation?.pickupWindow}</span>
                    )}
                    {r.pickupNotes && <div className="table-subtext">{r.pickupNotes}</div>}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModal({ type: 'APPROVE', requestId: r._id, itemTitle: r.donation?.title });
                            }}
                            className="btn btn-success btn-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModal({ type: 'REJECT', requestId: r._id, itemTitle: r.donation?.title });
                            }}
                            className="btn btn-danger btn-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {r.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkReady(r._id)}
                          className="btn btn-primary btn-xs"
                        >
                          Mark Ready
                        </button>
                      )}

                      {['APPROVED', 'READY_FOR_PICKUP'].includes(r.status) && (
                        <button
                          type="button"
                          onClick={() => handleConfirmHandover(r._id)}
                          disabled={r.handoverConfirmedByDonor}
                          className="btn btn-outline btn-xs"
                        >
                          {r.handoverConfirmedByDonor ? 'Handover Confirmed' : 'Confirm Handover'}
                        </button>
                      )}

                      {r.status === 'COMPLETED' && (
                        <span className="badge-pill badge-donor">Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Approve / Reject */}
      {activeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>
              {activeModal.type === 'APPROVE'
                ? `Approve Request for ${activeModal.itemTitle}`
                : `Reject Request for ${activeModal.itemTitle}`}
            </h3>

            {activeModal.type === 'APPROVE' ? (
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="scheduledTime">Scheduled Pickup Time (Optional)</label>
                  <input
                    id="scheduledTime"
                    type="datetime-local"
                    value={modalInput.time}
                    onChange={(e) => setModalInput((p) => ({ ...p, time: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pickupNotes">Pickup Instructions / Notes</label>
                  <input
                    id="pickupNotes"
                    type="text"
                    placeholder="e.g. Bring boxes, ring buzzer at Door B"
                    value={modalInput.notes}
                    onChange={(e) => setModalInput((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(activeModal.requestId)}
                    className="btn btn-success"
                  >
                    Confirm Approval
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-form">
                <div className="form-group">
                  <label htmlFor="rejectionReason">Reason for Rejection *</label>
                  <textarea
                    id="rejectionReason"
                    rows="3"
                    placeholder="Provide a clear reason (e.g. food was accidentally spoiled, already reserved, etc.)"
                    value={modalInput.reason}
                    onChange={(e) => setModalInput((p) => ({ ...p, reason: e.target.value }))}
                    required
                  ></textarea>
                </div>
                <p className="notice-subtext">
                  Note: Rejecting this request immediately releases the reserved quantity back to available surplus.
                </p>
                <div className="modal-actions">
                  <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(activeModal.requestId)}
                    className="btn btn-danger"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
