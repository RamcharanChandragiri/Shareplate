import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

export default function CreateDonationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      title: '',
      category: 'COOKED_MEALS',
      description: '',
      totalQuantity: '',
      quantityUnit: 'meals',
      preparationDateTime: now.toISOString().slice(0, 16),
      expiryDateTime: tomorrow.toISOString().slice(0, 16),
      pickupLocation: user?.donorDetails?.address || '',
      pickupWindow: '2:00 PM - 5:00 PM',
      imageUrl: '',
      specialInstructions: ''
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file size must be less than 8MB.');
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

    if (!formData.title.trim()) return setError('Food title is required.');
    if (!formData.description.trim()) return setError('Description is required.');
    if (!formData.totalQuantity || Number(formData.totalQuantity) <= 0) {
      return setError('Total quantity must be a positive number.');
    }
    if (!formData.quantityUnit.trim()) return setError('Quantity unit is required.');
    if (!formData.pickupLocation.trim()) return setError('Pickup location is required.');
    if (!formData.pickupWindow.trim()) return setError('Pickup window is required.');

    const expDate = new Date(formData.expiryDateTime);
    if (expDate <= new Date()) {
      return setError('Expiry deadline must be in the future.');
    }

    try {
      setLoading(true);
      setError('');
      const res = await donationAPI.create(formData);
      if (res.success) {
        navigate('/donor/my-donations', {
          state: { message: 'Food donation published successfully!' }
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to publish food donation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container">
      <div className="page-header">
        <div>
          <h2>Donate Surplus Food</h2>
          <p className="text-muted">
            List excess prepared meals, baked items, or groceries for verified NGO collection.
          </p>
        </div>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="standard-form">
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="title">Food Name / Title *</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. 40 Packed Rice & Curry Trays"
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
            <label htmlFor="description">Food Description & Ingredients *</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              placeholder="Describe the food, packaging details, dietary notes (e.g. vegetarian, nut-free), and storage conditions."
              value={formData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="totalQuantity">Available Quantity *</label>
              <input
                id="totalQuantity"
                name="totalQuantity"
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={formData.totalQuantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantityUnit">Unit of Measure *</label>
              <input
                id="quantityUnit"
                name="quantityUnit"
                type="text"
                placeholder="e.g. meals, kg, packets, boxes"
                value={formData.quantityUnit}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="preparationDateTime">Preparation Date & Time *</label>
              <input
                id="preparationDateTime"
                name="preparationDateTime"
                type="datetime-local"
                value={formData.preparationDateTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="expiryDateTime">Safe Consumption Deadline (Expiry) *</label>
              <input
                id="expiryDateTime"
                name="expiryDateTime"
                type="datetime-local"
                value={formData.expiryDateTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="pickupLocation">Pickup Location / Address *</label>
              <input
                id="pickupLocation"
                name="pickupLocation"
                type="text"
                placeholder="Kitchen entrance, street address, gate number"
                value={formData.pickupLocation}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="pickupWindow">Pickup Time Window *</label>
              <input
                id="pickupWindow"
                name="pickupWindow"
                type="text"
                placeholder="e.g. 3:00 PM - 6:00 PM"
                value={formData.pickupWindow}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="foodImageFile">Food Photo / Image Upload (Optional)</label>
            <input
              id="foodImageFile"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="file-input"
            />
            <p className="form-help text-muted">
              Upload a clear photo of the prepared food or packaging (PNG, JPG, max 8MB).
            </p>
            {imagePreview && (
              <div className="image-preview-box">
                <img src={imagePreview} alt="Food Preview" className="preview-thumbnail" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="btn btn-secondary btn-xs"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="specialInstructions">Special Instructions / Requirements (Optional)</label>
            <input
              id="specialInstructions"
              name="specialInstructions"
              type="text"
              placeholder="e.g. Bring own thermal bags; ask for Chef Marco at rear gate"
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
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Surplus Food Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
