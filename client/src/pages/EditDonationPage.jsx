import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { donationAPI } from '../services/api';

export default function EditDonationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'COOKED_MEALS',
    description: '',
    totalQuantity: '',
    quantityUnit: '',
    preparationDateTime: '',
    expiryDateTime: '',
    pickupLocation: '',
    pickupWindow: '',
    imageUrl: '',
    specialInstructions: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    donationAPI
      .getById(id)
      .then((res) => {
        if (res.success && res.donation) {
          const d = res.donation;
          setImagePreview(d.imageUrl || '');
          setFormData({
            title: d.title || '',
            category: d.category || 'COOKED_MEALS',
            description: d.description || '',
            totalQuantity: d.totalQuantity || '',
            quantityUnit: d.quantityUnit || '',
            preparationDateTime: d.preparationDateTime
              ? new Date(d.preparationDateTime).toISOString().slice(0, 16)
              : '',
            expiryDateTime: d.expiryDateTime
              ? new Date(d.expiryDateTime).toISOString().slice(0, 16)
              : '',
            pickupLocation: d.pickupLocation || '',
            pickupWindow: d.pickupWindow || '',
            imageUrl: d.imageUrl || '',
            specialInstructions: d.specialInstructions || ''
          });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load donation listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      await donationAPI.update(id, formData);
      navigate('/donor/my-donations', {
        state: { message: 'Donation listing updated successfully.' }
      });
    } catch (err) {
      setError(err.message || 'Failed to update donation.');
    } finally {
      setSaving(false);
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

  return (
    <div className="container page-container">
      <div className="page-header">
        <h2>Edit Food Donation Listing</h2>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="title">Food Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="COOKED_MEALS">Cooked Meals</option>
                <option value="BAKED_GOODS">Baked Goods</option>
                <option value="RAW_INGREDIENTS">Raw Ingredients</option>
                <option value="PACKAGED_FOOD">Packaged / Canned Food</option>
                <option value="FRUITS_VEGETABLES">Fruits & Vegetables</option>
                <option value="DAIRY">Dairy</option>
                <option value="BEVERAGES">Beverages</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="totalQuantity">Total Quantity *</label>
              <input
                id="totalQuantity"
                name="totalQuantity"
                type="number"
                min="1"
                value={formData.totalQuantity}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="quantityUnit">Unit *</label>
              <input
                id="quantityUnit"
                name="quantityUnit"
                type="text"
                value={formData.quantityUnit}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="preparationDateTime">Preparation Date & Time</label>
              <input
                id="preparationDateTime"
                name="preparationDateTime"
                type="datetime-local"
                value={formData.preparationDateTime}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiryDateTime">Expiry Deadline</label>
              <input
                id="expiryDateTime"
                name="expiryDateTime"
                type="datetime-local"
                value={formData.expiryDateTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="pickupLocation">Pickup Location</label>
              <input
                id="pickupLocation"
                name="pickupLocation"
                type="text"
                value={formData.pickupLocation}
                onChange={handleChange}
              />
            </div>
            <div className="form-group flex-1">
              <label htmlFor="pickupWindow">Pickup Window</label>
              <input
                id="pickupWindow"
                name="pickupWindow"
                type="text"
                value={formData.pickupWindow}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="foodImageFile">Food Photo / Image Upload</label>
            <input
              id="foodImageFile"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="file-input"
            />
            {imagePreview && (
              <div className="image-preview-box" style={{ marginTop: '0.5rem' }}>
                <img
                  src={imagePreview}
                  alt="Food Preview"
                  style={{ maxHeight: '140px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn btn-secondary btn-xs"
                  style={{ display: 'block', marginTop: '0.25rem' }}
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="specialInstructions">Special Instructions</label>
            <input
              id="specialInstructions"
              name="specialInstructions"
              type="text"
              value={formData.specialInstructions}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/donor/my-donations')}
              className="btn btn-secondary"
            >
              Back to Listings
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
