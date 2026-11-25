import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initialize role from URL query param if present (e.g. /register?role=NGO)
  const initialRole = searchParams.get('role') === 'NGO' ? 'NGO' : 'DONOR';

  const [role, setRole] = useState(initialRole);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Donor specific
    organizationName: '',
    organizationType: 'RESTAURANT',
    address: '',
    // NGO specific
    ngoName: '',
    registrationNumber: '',
    contactPerson: '',
    organizationDetails: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend Validations
    if (!formData.name.trim()) return setError('Full name is required.');
    if (!formData.email.trim()) return setError('Email address is required.');
    if (!formData.phone.trim()) return setError('Phone number is required.');
    if (!formData.password) return setError('Password is required.');
    if (formData.password.length < 8) return setError('Password must be at least 8 characters long.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      role
    };

    if (role === 'DONOR') {
      if (!formData.organizationName.trim()) return setError('Organization / Business name is required.');
      if (!formData.address.trim()) return setError('Pickup address is required.');
      payload.donorDetails = {
        organizationName: formData.organizationName.trim(),
        organizationType: formData.organizationType,
        address: formData.address.trim()
      };
    } else {
      if (!formData.ngoName.trim()) return setError('NGO Name is required.');
      if (!formData.registrationNumber.trim()) return setError('Official registration number is required.');
      if (!formData.contactPerson.trim()) return setError('Contact person is required.');
      if (!formData.address.trim()) return setError('Official address is required.');
      payload.ngoDetails = {
        ngoName: formData.ngoName.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        contactPerson: formData.contactPerson.trim(),
        address: formData.address.trim(),
        organizationDetails: formData.organizationDetails.trim()
      };
    }

    try {
      setLoading(true);
      setError('');
      await register(payload);

      if (role === 'DONOR') {
        navigate('/donor/dashboard', {
          state: { message: 'Donor account created successfully! Welcome to SharePlate.' }
        });
      } else {
        navigate('/ngo/dashboard', {
          state: {
            message: 'NGO account created successfully! Verification status is currently PENDING.'
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h2>Create Your Account</h2>
          <p>Join the movement to rescue surplus food and empower communities</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="role-selector" role="tablist">
          <button
            type="button"
            className={`role-tab ${role === 'DONOR' ? 'active' : ''}`}
            onClick={() => handleRoleChange('DONOR')}
            role="tab"
            aria-selected={role === 'DONOR'}
          >
            <span className="tab-icon">🏪</span>
            <div className="tab-text">
              <strong>Food Donor</strong>
              <small>Restaurant, Hotel, Cafeteria</small>
            </div>
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'NGO' ? 'active' : ''}`}
            onClick={() => handleRoleChange('NGO')}
            role="tab"
            aria-selected={role === 'NGO'}
          >
            <span className="tab-icon">🤝</span>
            <div className="tab-text">
              <strong>Charitable NGO</strong>
              <small>Shelter, Trust, Foundation</small>
            </div>
          </button>
        </div>

        {role === 'NGO' && (
          <div className="notice-box">
            <strong>ℹ Note on NGO Verification:</strong> All NGO accounts initially hold a{' '}
            <code>PENDING</code> verification status until reviewed and verified by an Administrator.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Common Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. contact@domain.org"
              required
            />
          </div>

          {/* Role-Specific Fields */}
          {role === 'DONOR' ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="organizationName">Business / Organization Name *</label>
                  <input
                    id="organizationName"
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g. Sunset Bistro"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="organizationType">Organization Type *</label>
                  <select
                    id="organizationType"
                    name="organizationType"
                    value={formData.organizationType}
                    onChange={handleChange}
                  >
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="CAFETERIA">Cafeteria / College</option>
                    <option value="EVENT_ORGANIZER">Event Organizer</option>
                    <option value="INDIVIDUAL">Individual Donor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="donorAddress">Pickup Address *</label>
                <input
                  id="donorAddress"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address, City, Postal Code"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ngoName">NGO / Trust Name *</label>
                  <input
                    id="ngoName"
                    type="text"
                    name="ngoName"
                    value={formData.ngoName}
                    onChange={handleChange}
                    placeholder="e.g. Hope For All Foundation"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registrationNumber">Registration / Trust Number *</label>
                  <input
                    id="registrationNumber"
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. REG-12345/2024"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contactPerson">Primary Contact Person *</label>
                  <input
                    id="contactPerson"
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="e.g. Jane Smith"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ngoAddress">Official Address *</label>
                  <input
                    id="ngoAddress"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Headquarters address, City"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="organizationDetails">Mission / Food Distribution Scope</label>
                <textarea
                  id="organizationDetails"
                  name="organizationDetails"
                  rows="2"
                  value={formData.organizationDetails}
                  onChange={handleChange}
                  placeholder="Briefly describe the communities or shelters you serve..."
                ></textarea>
              </div>
            </>
          )}

          {/* Password Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password (min 8 chars) *</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="btn-spinner">Registering Account...</span> : `Register as ${role}`}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
