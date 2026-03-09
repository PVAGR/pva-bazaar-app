/**
 * MarketplaceTab
 * 
 * PURPOSE: Manage marketplace items (artifacts/products)
 * 
 * FEATURES:
 * - View all marketplace items in a list
 * - Create new items
 * - Edit existing items
 * - Delete items
 * - Upload images
 * - Set pricing and inventory
 * 
 * API ENDPOINTS USED:
 * - GET /api/items - Fetch all items
 * - POST /api/items - Create new item
 * - PUT /api/items/:id - Update item
 * - DELETE /api/items/:id - Delete item
 */

import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { createLogger } from '../lib/logger';
import { SkeletonList } from '../components/SkeletonLoader.jsx';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './MarketplaceTab.css';

const logger = createLogger('MarketplaceTab');

export default function MarketplaceTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Handicrafts',
    origin: '',
    imageUrl: '',
    stock: '1',
    condition: 'New',
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/items');
      if (response.ok && Array.isArray(response.items)) {
        setItems(response.items);
      } else {
        setError(response.error || 'Failed to load items');
      }
    } catch (err) {
      logger.error('Failed to load marketplace items', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const itemData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock, 10) || 0,
      };

      let response;
      if (isEditing && selectedItem) {
        response = await apiPut(`/items/${selectedItem.id}`, itemData);
      } else {
        response = await apiPost('/items', itemData);
      }

      if (response.ok) {
        setSuccess(isEditing ? 'Item updated successfully!' : 'Item created successfully!');
        setTimeout(() => setSuccess(''), 3000);
        resetForm();
        await loadItems();
      } else {
        setError(response.error || 'Operation failed');
      }
    } catch (err) {
      logger.error('Failed to save item', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditing(true);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || 'Handicrafts',
      origin: item.origin || '',
      imageUrl: item.imageUrl || '',
      stock: item.stock?.toString() || '1',
      condition: item.condition || 'New',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"? This action cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await apiDelete(`/items/${item.id}`);
      if (response.ok) {
        setSuccess('Item deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadItems();
      } else {
        setError(response.error || 'Failed to delete item');
      }
    } catch (err) {
      logger.error('Failed to delete item', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setIsEditing(false);
    setFormData({
      title: '',
      description: '',
      price: '',
      category: 'Handicrafts',
      origin: '',
      imageUrl: '',
      stock: '1',
      condition: 'New',
    });
  };

  return (
    <div className="marketplace-tab" role="tabpanel" id="marketplace-panel">
      <div className="tab-header">
        <h2>🛒 Marketplace Management</h2>
        <p className="tab-description">
          Create and manage marketplace items. Items appear on the marketplace page for customers to purchase.
        </p>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      <div className="marketplace-layout">
        <div className="marketplace-sidebar">
          <h3>Items ({items.length})</h3>
          {loading ? (
            <SkeletonList count={5} />
          ) : items.length === 0 ? (
            <p className="empty-message">No items yet. Create your first item!</p>
          ) : (
            <div className="items-list">
              {items.map(item => (
                <div
                  key={item.id || item._id}
                  className={`item-preview ${selectedItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => handleEdit(item)}
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.title} className="item-thumbnail" />
                  )}
                  <div className="item-info">
                    <strong>{item.title}</strong>
                    <span className="item-price">${item.price || 0}</span>
                    <span className="item-stock">Stock: {item.stock || 0}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="delete-btn-small"
                    title="Delete item"
                    disabled={submitting}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="marketplace-main">
          <div className="form-card">
            <h3>{isEditing ? '✏️ Edit Item' : '➕ Create New Item'}</h3>
            {isEditing && (
              <button onClick={resetForm} className="cancel-edit-btn">
                ✕ Cancel Edit
              </button>
            )}

            <form onSubmit={handleSubmit} className="marketplace-form">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Hand-carved Wooden Bowl"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price (USD) *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="49.99"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="stock">Stock *</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="1"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Handicrafts">Handicrafts</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Pottery">Pottery</option>
                    <option value="Art">Art</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="condition">Condition *</label>
                  <select
                    id="condition"
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Vintage">Vintage</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="origin">Origin</label>
                <input
                  type="text"
                  id="origin"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  placeholder="Kenya, Nairobi"
                />
              </div>

              <div className="form-group">
                <label htmlFor="imageUrl">Image URL</label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/image.jpg"
                />
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="image-preview" />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the item, its history, materials, and craftsmanship..."
                  rows="6"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? (
                  <LoadingDots inline={true} label={isEditing ? 'Updating...' : 'Creating...'} />
                ) : (
                  isEditing ? '✅ Update Item' : '💾 Create Item'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
