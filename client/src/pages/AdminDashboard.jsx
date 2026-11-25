import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { adminAPI, userAPI } from '../services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('METRICS');
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [donationStatusFilter, setDonationStatusFilter] = useState('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminAPI.getMetrics(),
      userAPI.getAllUsers(),
      adminAPI.getAllDonations(),
      adminAPI.getAllRequests()
    ])
      .then(([metricsRes, usersRes, donRes, reqRes]) => {
        if (isMounted) {
          if (metricsRes.success) setMetrics(metricsRes.metrics);
          if (usersRes.success) setUsers(usersRes.users || []);
          if (donRes.success) setDonations(donRes.donations || []);
          if (reqRes.success) setRequests(reqRes.requests || []);
        }
      })
      .catch((err) => {
        if (isMounted) setActionMessage(err.message || 'Failed to load administration data.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (activeTab === 'REPORTS') {
      let isMounted = true;
      let query = '';
      if (startDate) query += `?startDate=${startDate}`;
      if (endDate) query += `${query ? '&' : '?'}endDate=${endDate}`;

      adminAPI
        .getReports(query)
        .then((res) => {
          if (isMounted && res.success) {
            setReportData(res.report);
          }
        })
        .catch((err) => console.error('Reports load error:', err))
        .finally(() => {
          if (isMounted) setReportLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, startDate, endDate]);

  const handleVerifyNgo = async (userId, status) => {
    try {
      setActionMessage('');
      const res = await userAPI.verifyNgo(userId, status);
      if (res.success) {
        setActionMessage(`NGO verification status changed to ${status}.`);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Failed to update verification status.');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      setActionMessage('');
      const res = await adminAPI.updateUserStatus(userId, newStatus);
      if (res.success) {
        setActionMessage(`User account status updated to ${newStatus}.`);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setActionMessage(err.message || 'Failed to update account status.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pendingNgos = users.filter(
    (u) => u.role === 'NGO' && u.ngoVerificationStatus === 'PENDING'
  );

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'ALL') return true;
    return u.role === userRoleFilter;
  });

  const filteredDonations = donations.filter((d) => {
    if (donationStatusFilter === 'ALL') return true;
    return d.status === donationStatusFilter;
  });

  return (
    <div className="dashboard-page container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-badge badge-admin">Master Administrator Portal</div>
          <h1>System Governance – {user?.name}</h1>
          <p className="text-muted">
            Oversee user verifications, manage platform security, monitor surplus redistributions, and review analytics.
          </p>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Sign Out
        </button>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'METRICS' ? 'active' : ''}`}
          onClick={() => setActiveTab('METRICS')}
        >
          📊 Overview Metrics
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'VERIFICATIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('VERIFICATIONS')}
        >
          🛡️ NGO Verifications {pendingNgos.length > 0 && <span className="tab-pill-badge">{pendingNgos.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'USERS' ? 'active' : ''}`}
          onClick={() => setActiveTab('USERS')}
        >
          👥 User Accounts ({users.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'DONATIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('DONATIONS')}
        >
          🍲 Food Listings ({donations.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REQUESTS')}
        >
          📦 Food Requests ({requests.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'REPORTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REPORTS')}
        >
          📈 Reports & Analytics
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading administration data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === 'METRICS' && metrics && (
            <div className="tab-pane">
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-number">{metrics.totalMealsRescued}</span>
                  <span className="metric-label">Total Meals & Units Rescued</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.totalDonations}</span>
                  <span className="metric-label">Total Food Listings</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.activeDonations}</span>
                  <span className="metric-label">Active Surplus Listings</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.completedRequests}</span>
                  <span className="metric-label">Fulfilled Pickups</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.totalDonors}</span>
                  <span className="metric-label">Registered Donors</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.totalNgos}</span>
                  <span className="metric-label">Registered NGOs ({metrics.verifiedNgos || 0} Verified)</span>
                </div>
                <div className="metric-card">
                  <span className="metric-number">{metrics.claimedDonations || 0}</span>
                  <span className="metric-label">Claimed & In-Transit Listings</span>
                </div>
                <div className={`metric-card ${metrics.pendingNgos > 0 ? 'metric-alert' : ''}`}>
                  <span className="metric-number">{metrics.pendingNgos}</span>
                  <span className="metric-label">Pending NGO Reviews</span>
                </div>
              </div>

              {pendingNgos.length > 0 && (
                <div className="notice-box">
                  <strong>⚡ Action Required:</strong> There are currently{' '}
                  <strong>{pendingNgos.length} NGO registration(s)</strong> awaiting credential verification.
                  <button
                    type="button"
                    onClick={() => setActiveTab('VERIFICATIONS')}
                    className="btn-link-xs ml-2"
                  >
                    Go to NGO Verifications &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NGO VERIFICATIONS */}
          {activeTab === 'VERIFICATIONS' && (
            <div className="tab-pane">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>NGO Name</th>
                      <th>Gov Registration #</th>
                      <th>Contact Person</th>
                      <th>Address & Notes</th>
                      <th>Current Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((u) => u.role === 'NGO')
                      .map((u) => (
                        <tr key={u._id}>
                          <td>
                            <strong>{u.ngoDetails?.ngoName || u.name}</strong>
                            <div className="table-subtext">{u.email}</div>
                          </td>
                          <td>
                            <code>{u.ngoDetails?.registrationNumber || 'Not Provided'}</code>
                          </td>
                          <td>
                            <div>{u.ngoDetails?.contactPerson || u.name}</div>
                            <div className="table-subtext">{u.phone}</div>
                          </td>
                          <td>
                            <div>📍 {u.ngoDetails?.address || 'Not Provided'}</div>
                            {u.ngoDetails?.organizationDetails && (
                              <div className="table-subtext text-muted">{u.ngoDetails.organizationDetails}</div>
                            )}
                          </td>
                          <td>
                            <span className={`status-pill status-${(u.ngoVerificationStatus || 'PENDING').toLowerCase()}`}>
                              {u.ngoVerificationStatus || 'PENDING'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              {u.ngoVerificationStatus !== 'VERIFIED' && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyNgo(u._id, 'VERIFIED')}
                                  className="btn btn-success btn-xs"
                                >
                                  Approve
                                </button>
                              )}
                              {u.ngoVerificationStatus !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifyNgo(u._id, 'REJECTED')}
                                  className="btn btn-danger btn-xs"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: USER ACCOUNTS */}
          {activeTab === 'USERS' && (
            <div className="tab-pane">
              <div className="filter-bar">
                <label htmlFor="adminRoleFilter">Filter Role: </label>
                <select
                  id="adminRoleFilter"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="select-sm"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  <option value="DONOR">Donors</option>
                  <option value="NGO">NGOs</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User / Entity Name</th>
                      <th>Role</th>
                      <th>Email & Phone</th>
                      <th>Account Status</th>
                      <th>Joined Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <strong>{u.name}</strong>
                          {u.donorDetails?.organizationName && (
                            <div className="table-subtext">🏢 {u.donorDetails.organizationName}</div>
                          )}
                          {u.ngoDetails?.ngoName && (
                            <div className="table-subtext">🤝 {u.ngoDetails.ngoName}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge-pill badge-${u.role.toLowerCase()}`}>{u.role}</span>
                        </td>
                        <td>
                          <div>{u.email}</div>
                          <div className="table-subtext">{u.phone}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${u.accountStatus === 'ACTIVE' ? 'status-verified' : 'status-rejected'}`}>
                            {u.accountStatus}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {u.role !== 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u._id, u.accountStatus)}
                              className={`btn btn-xs ${u.accountStatus === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                            >
                              {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ALL DONATIONS */}
          {activeTab === 'DONATIONS' && (
            <div className="tab-pane">
              <div className="filter-bar" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label htmlFor="adminDonationStatusFilter" style={{ fontWeight: '500' }}>Filter Status: </label>
                <select
                  id="adminDonationStatusFilter"
                  value={donationStatusFilter}
                  onChange={(e) => setDonationStatusFilter(e.target.value)}
                  className="select-sm"
                  style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="ALL">All Statuses ({donations.length})</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="CLAIMED">Claimed</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Food Title & Category</th>
                      <th>Donor Facility</th>
                      <th>Quantities (Avail / Res / Fulfilled / Total)</th>
                      <th>Status</th>
                      <th>Claimed By</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonations.map((d) => (
                      <tr key={d._id}>
                        <td>
                          <strong>{d.title}</strong>
                          <div className="table-subtext">{d.category?.replace('_', ' ')}</div>
                        </td>
                        <td>
                          <strong>{d.donor?.donorDetails?.organizationName || d.donor?.name}</strong>
                          <div className="table-subtext">📍 {d.pickupLocation}</div>
                        </td>
                        <td>
                          <div><strong>Available:</strong> {d.availableQuantity} {d.quantityUnit}</div>
                          <div className="table-subtext">Reserved: {d.reservedQuantity} | Fulfilled: {d.fulfilledQuantity} | Total: {d.totalQuantity}</div>
                        </td>
                        <td>
                          <span className={`status-pill status-${d.status.toLowerCase()}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {d.claimedBy ? (
                            <div>
                              <strong>{d.claimedBy?.ngoDetails?.ngoName || d.claimedBy?.name}</strong>
                              <div className="table-subtext">{d.claimedBy?.phone}</div>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{new Date(d.expiryDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ALL REQUESTS */}
          {activeTab === 'REQUESTS' && (
            <div className="tab-pane">
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Food Item</th>
                      <th>Donor</th>
                      <th>Requesting NGO</th>
                      <th>Claim Qty</th>
                      <th>Status</th>
                      <th>Handover Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.donation?.title}</strong>
                        </td>
                        <td>{r.donor?.donorDetails?.organizationName || r.donor?.name}</td>
                        <td>
                          <strong>{r.ngo?.ngoDetails?.ngoName || r.ngo?.name}</strong>
                          <div className="table-subtext">📞 {r.ngo?.phone}</div>
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
                          {r.status === 'COMPLETED' ? (
                            <span className="text-success font-semibold">✔ Fully Handed Over & Collected</span>
                          ) : (
                            <div className="table-subtext">
                              Donor Handover: {r.handoverConfirmedByDonor ? '✔ Confirmed' : 'Pending'} <br />
                              NGO Collection: {r.collectionConfirmedByNgo ? '✔ Confirmed' : 'Pending'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: REPORTS & ANALYTICS */}
          {activeTab === 'REPORTS' && (
            <div className="tab-pane">
              {/* Date Range Filter */}
              <div
                className="filter-bar"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: '1rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="startDateInput" style={{ fontWeight: '500', fontSize: '0.9rem' }}>From:</label>
                  <input
                    id="startDateInput"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="endDateInput" style={{ fontWeight: '500', fontSize: '0.9rem' }}>To:</label>
                  <input
                    id="endDateInput"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {reportLoading ? (
                <div className="loading-screen">
                  <div className="spinner"></div>
                  <p>Aggregating reporting metrics from database records...</p>
                </div>
              ) : !reportData ? (
                <div className="empty-state">
                  <p>No report data available.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Summary KPI Cards */}
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span className="metric-number">{reportData.totalFoodRedistributed}</span>
                      <span className="metric-label">Food Quantity Redistributed</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-number">{reportData.totalDonations}</span>
                      <span className="metric-label">Total Listings in Range</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-number">{reportData.completedDonations}</span>
                      <span className="metric-label">Successfully Completed</span>
                    </div>
                  </div>

                  {/* Status & Category Distributions Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Status Distribution */}
                    <div className="details-card">
                      <h3>📊 Donation Status Distribution</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {reportData.statusDistribution?.map((s) => {
                          const pct = reportData.totalDonations > 0 ? Math.round((s.count / reportData.totalDonations) * 100) : 0;
                          return (
                            <div key={s._id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                                <strong>{s._id?.replace('_', ' ')}</strong>
                                <span>{s.count} ({pct}%)</span>
                              </div>
                              <div style={{ background: '#e2e8f0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background:
                                      s._id === 'COMPLETED'
                                        ? '#10b981'
                                        : s._id === 'AVAILABLE'
                                        ? '#3b82f6'
                                        : s._id === 'CLAIMED'
                                        ? '#f59e0b'
                                        : s._id === 'EXPIRED'
                                        ? '#ef4444'
                                        : '#64748b'
                                  }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="details-card">
                      <h3>🍲 Category Breakdown</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {reportData.categoryDistribution?.map((c) => (
                          <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>
                            <div>
                              <strong>{c._id?.replace('_', ' ')}</strong>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.quantity} total units/meals</div>
                            </div>
                            <span className="badge-pill badge-primary">{c.count} items</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Volume Timeline */}
                  {reportData.monthlyVolume?.length > 0 && (
                    <div className="details-card">
                      <h3>📅 Monthly Surplus Volume & Redistribution Timeline</h3>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', minHeight: '160px', padding: '1rem 0', overflowX: 'auto' }}>
                        {reportData.monthlyVolume.map((m) => (
                          <div key={m._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', flex: '1' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>{m.quantityRescued} units</span>
                            <div
                              style={{
                                width: '36px',
                                height: `${Math.max(20, Math.min(120, m.donationsCount * 25))}px`,
                                background: '#10b981',
                                borderRadius: '4px 4px 0 0',
                                marginTop: '0.4rem'
                              }}
                              title={`${m.donationsCount} donations`}
                            ></div>
                            <span style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: '#475569' }}>{m._id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leaderboards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {/* Top Donors */}
                    <div className="details-card">
                      <h3>🏆 Top Donor Facilities</h3>
                      <table className="admin-table" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th>Donor Facility</th>
                            <th>Donations</th>
                            <th>Food Supplied</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topDonors?.map((td) => (
                            <tr key={td._id}>
                              <td>
                                <strong>{td.organizationName || td.name}</strong>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{td.organizationType}</div>
                              </td>
                              <td>{td.donationCount}</td>
                              <td><strong>{td.totalFoodSupplied}</strong> units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Top NGOs */}
                    <div className="details-card">
                      <h3>🤝 Top Participating NGOs</h3>
                      <table className="admin-table" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                        <thead>
                          <tr>
                            <th>NGO Partner</th>
                            <th>Claims</th>
                            <th>Food Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topNgos?.map((tn) => (
                            <tr key={tn._id}>
                              <td>
                                <strong>{tn.ngoName || tn.name}</strong>
                              </td>
                              <td>{tn.claimsCount}</td>
                              <td><strong>{tn.quantityReceived}</strong> units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
