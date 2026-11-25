import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    donorDetails: {
      organizationName: '',
      organizationType: 'RESTAURANT',
      address: ''
    },
    ngoDetails: {
      ngoName: '',
      registrationNumber: '',
      contactPerson: '',
      address: '',
      organizationDetails: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    userAPI
      .getProfile()
      .then((res) => {
        if (res.success && res.user) {
          const u = res.user;
          setFormData({
            name: u.name || '',
            phone: u.phone || '',
            donorDetails: {
              organizationName: u.donorDetails?.organizationName || '',
              organizationType: u.donorDetails?.organizationType || 'RESTAURANT',
              address: u.donorDetails?.address || ''
            },
            ngoDetails: {
              ngoName: u.ngoDetails?.ngoName || '',
              registrationNumber: u.ngoDetails?.registrationNumber || '',
              contactPerson: u.ngoDetails?.contactPerson || '',
              address: u.ngoDetails?.address || '',
              organizationDetails: u.ngoDetails?.organizationDetails || ''
            }
          });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load profile details.'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleDonorChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      donorDetails: { ...prev.donorDetails, [name]: value }
    }));
  };

  const handleNgoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      ngoDetails: { ...prev.ngoDetails, [name]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Name is required.');
    if (!formData.phone.trim()) return setError('Contact phone is required.');

    try {
      setSaving(true);
      setError('');
      setMessage('');
      const res = await userAPI.updateProfile(formData);
      if (res.success) {
        setMessage('Your profile details have been saved successfully.');
        if (login && res.user) {
          // Refresh context user session
          const token = localStorage.getItem('shareplate_token');
          login(res.user, token);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading profile information...</p>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>Account Profile & Logistics Settings</h2>
          <p className="text-muted">
            Manage your personal profile, organization information, and default pickup coordination details.
          </p>
        </div>
      </div>

      <div className="form-card profile-card">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Account Role & Status Summary */}
        <div className="profile-status-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div>
            <span className="profile-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Account Role:</span>
            <div><span className={`badge-pill badge-${user?.role?.toLowerCase()}`}>{user?.role}</span></div>
          </div>
          <div>
            <span className="profile-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Account Email (Immutable):</span>
            <div><strong>{user?.email}</strong></div>
          </div>
          <div>
            <span className="profile-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>Account Status:</span>
            <div><span className={`status-pill ${user?.accountStatus === 'ACTIVE' ? 'status-verified' : 'status-rejected'}`}>{user?.accountStatus || 'ACTIVE'}</span></div>
          </div>
          {user?.role === 'NGO' && (
            <div>
              <span className="profile-label" style={{ fontSize: '0.85rem', color: '#64748b' }}>NGO Verification Status:</span>
              <div>
                <span className={`status-pill status-${(user?.ngoVerificationStatus || 'PENDING').toLowerCase()}`}>
                  {user?.ngoVerificationStatus || 'PENDING'}
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="name">Full Name / Primary Contact *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="phone">Contact Phone Number *</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* DONOR SPECIFIC FIELDS */}
          {user?.role === 'DONOR' && (
            <>
              <h3 style={{ margin: '1.5rem 0 1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                🏢 Donor Facility & Logistics
              </h3>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label htmlFor="orgName">Organization / Business Name</label>
                  <input
                    id="orgName"
                    name="organizationName"
                    type="text"
                    value={formData.donorDetails.organizationName}
                    onChange={handleDonorChange}
                  />
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="orgType">Organization Type</label>
                  <select
                    id="orgType"
                    name="organizationType"
                    value={formData.donorDetails.organizationType}
                    onChange={handleDonorChange}
                  >
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="CAFETERIA">Cafeteria / Canteen</option>
                    <option value="SUPERMARKET">Supermarket / Grocery</option>
                    <option value="EVENT_ORGANIZER">Event Organizer</option>
                    <option value="INDIVIDUAL">Individual Donor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="donorAddress">Default Pickup Address / Location</label>
                <input
                  id="donorAddress"
                  name="address"
                  type="text"
                  placeholder="Facility address, loading bay, or kitchen entrance"
                  value={formData.donorDetails.address}
                  onChange={handleDonorChange}
                />
              </div>
            </>
          )}

          {/* NGO SPECIFIC FIELDS */}
          {user?.role === 'NGO' && (
            <>
              <h3 style={{ margin: '1.5rem 0 1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                🤝 Charitable Organization Details
              </h3>
              <div className="form-row">
                <div className="form-group flex-2">
                  <label htmlFor="ngoName">NGO / Foundation Name</label>
                  <input
                    id="ngoName"
                    name="ngoName"
                    type="text"
                    value={formData.ngoDetails.ngoName}
                    onChange={handleNgoChange}
                  />
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="regNum">Government Registration Number</label>
                  <input
                    id="regNum"
                    name="registrationNumber"
                    type="text"
                    value={formData.ngoDetails.registrationNumber}
                    onChange={handleNgoChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="contactPerson">NGO Coordinator / Contact Person</label>
                  <input
                    id="contactPerson"
                    name="contactPerson"
                    type="text"
                    value={formData.ngoDetails.contactPerson}
                    onChange={handleNgoChange}
                  />
                </div>
                <div className="form-group flex-2">
                  <label htmlFor="ngoAddress">Headquarters / Shelter Address</label>
                  <input
                    id="ngoAddress"
                    name="address"
                    type="text"
                    value={formData.ngoDetails.address}
                    onChange={handleNgoChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="orgDetails">Mission & Beneficiary Coverage Notes</label>
                <textarea
                  id="orgDetails"
                  name="organizationDetails"
                  rows="3"
                  value={formData.ngoDetails.organizationDetails}
                  onChange={handleNgoChange}
                ></textarea>
              </div>
            </>
          )}

          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
