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

import React, { useState, useEffect, useCallback } from 'react';
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  fetchItemInquiries,
  releaseItemInquiryReservation,
  updateItemInquiryStatus,
} from '../lib/api';
import { createLogger } from '../lib/logger';
import { SkeletonList } from '../components/SkeletonLoader.jsx';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './MarketplaceTab.css';

const logger = createLogger('MarketplaceTab');
const CHANNELS = ['facebook', 'etsy', 'ebay'];

const getItemId = (item) => item?._id || item?.id;

export default function MarketplaceTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [bulkRetryLimit, setBulkRetryLimit] = useState('80');
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState('');
  const [inquirySearchQuery, setInquirySearchQuery] = useState('');
  const [updatingInquiryId, setUpdatingInquiryId] = useState('');
  const [selectedBulkChannels, setSelectedBulkChannels] = useState({
    facebook: true,
    etsy: true,
    ebay: true,
  });

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

  const loadInquiries = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setInquiriesLoading(true);
    try {
      const response = await fetchItemInquiries({
        limit: 60,
        status: inquiryFilter || '',
        q: inquirySearchQuery || '',
      });
      if (response.ok) {
        setInquiries(response.items);
      } else if (!silent) {
        setError(response.error || 'Failed to load inquiries');
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load inquiries');
    } finally {
      if (!silent) setInquiriesLoading(false);
    }
  }, [inquiryFilter, inquirySearchQuery]);

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    loadInquiries();
    const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
    const id = timerApi?.setInterval
      ? timerApi.setInterval(() => {
          loadInquiries({ silent: true });
        }, 30000)
      : null;
    return () => {
      if (id && timerApi?.clearInterval) timerApi.clearInterval(id);
    };
  }, [loadInquiries]);

  const filteredItems = items
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return [
        item.title,
        item.description,
        item.category,
        item.origin,
      ].some((field) => String(field || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });

  const stats = {
    total: items.length,
    outOfStock: items.filter((item) => Number(item.stock || 0) === 0).length,
    lowStock: items.filter((item) => Number(item.stock || 0) > 0 && Number(item.stock || 0) < 5).length,
    drafts: items.filter((item) => item.status === 'draft').length,
    syndicationAttention: items.filter((item) => {
      const jobs = item?.syndication?.jobs || [];
      return jobs.some((job) => ['failed', 'manual_required'].includes(job.status));
    }).length,
  };

  const bulkChannels = CHANNELS.filter((channel) => selectedBulkChannels[channel]);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiGet('/items?includeDrafts=true&limit=200');
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

  const handleUpdateInquiryStatus = async (inquiryId, status) => {
    if (!inquiryId || !status) return;
    setUpdatingInquiryId(inquiryId);
    setError('');
    setSuccess('');
    const response = await updateItemInquiryStatus(inquiryId, { status });
    setUpdatingInquiryId('');
    if (!response.ok) {
      setError(response.error || 'Failed to update inquiry status');
      return;
    }
    setSuccess(`Inquiry updated to ${status}.`);
    loadInquiries({ silent: true });
  };

  const handleReleaseInquiryReservation = async (inquiryId) => {
    if (!inquiryId) return;
    setUpdatingInquiryId(inquiryId);
    setError('');
    setSuccess('');
    const response = await releaseItemInquiryReservation(inquiryId);
    setUpdatingInquiryId('');
    if (!response.ok) {
      setError(response.error || 'Failed to release reservation');
      return;
    }
    setSuccess('Reservation released and inquiry updated.');
    loadInquiries({ silent: true });
    loadItems();
  };

  const handleBulkRetrySyndication = async () => {
    if (!bulkChannels.length) {
      setError('Select at least one syndication channel to retry.');
      return;
    }
    if (!(typeof globalThis !== 'undefined' && globalThis.confirm && globalThis.confirm('Retry syndication for listings with failed/manual-required jobs?'))) {
      return;
    }
    setBulkRetrying(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiPost('/items/syndication/retry-bulk', {
        limit: Number(bulkRetryLimit) || 80,
        channels: bulkChannels,
      });
      if (!response?.ok) {
        setError(response?.error || 'Bulk retry failed');
        return;
      }
      const aggregate = response.aggregate || {};
      setSuccess(
        `Bulk retry (${bulkChannels.join(', ')}) complete: ${aggregate.items || 0} listings, ${aggregate.success || 0} success, ${aggregate.failed || 0} failed, ${aggregate.manualRequired || 0} manual required.`,
      );
      await loadItems();
    } catch (err) {
      logger.error('Bulk syndication retry failed', err);
      setError(err.message || 'Bulk retry failed');
    } finally {
      setBulkRetrying(false);
    }
  };

  const toggleBulkChannel = (channel) => {
    setSelectedBulkChannels((prev) => ({
      ...prev,
      [channel]: !prev[channel],
    }));
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
        response = await apiPut(`/items/${getItemId(selectedItem)}`, itemData);
      } else {
        response = await apiPost('/items', itemData);
      }

      if (response.ok) {
        setSuccess(isEditing ? 'Item updated successfully!' : 'Item created successfully!');
        const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
        if (timerApi?.setTimeout) timerApi.setTimeout(() => setSuccess(''), 3000);
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
    const browserApi = typeof globalThis !== 'undefined' ? globalThis : null;
    if (browserApi?.scrollTo) {
      browserApi.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (item) => {
    if (!(typeof globalThis !== 'undefined' && globalThis.confirm && globalThis.confirm(`Delete "${item.title}"? This action cannot be undone.`))) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await apiDelete(`/items/${getItemId(item)}`);
      if (response.ok) {
        setSuccess('Item deleted successfully!');
        const timerApi = typeof globalThis !== 'undefined' ? globalThis : null;
        if (timerApi?.setTimeout) timerApi.setTimeout(() => setSuccess(''), 3000);
        if (selectedItem && getItemId(selectedItem) === getItemId(item)) {
          resetForm();
        }
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

      <div className="marketplace-stats">
        <div className="market-stat">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="market-stat">
          <span>Out of stock</span>
          <strong>{stats.outOfStock}</strong>
        </div>
        <div className="market-stat">
          <span>Low stock</span>
          <strong>{stats.lowStock}</strong>
        </div>
        <div className="market-stat">
          <span>Drafts</span>
          <strong>{stats.drafts}</strong>
        </div>
        <div className="market-stat warning">
          <span>Syndication queue</span>
          <strong>{stats.syndicationAttention}</strong>
        </div>
      </div>

      <div className="marketplace-ops-row">
        <div className="ops-controls">
          <label className="ops-limit">
            Queue limit
            <input
              type="number"
              min="1"
              max="200"
              value={bulkRetryLimit}
              onChange={(e) => setBulkRetryLimit(e.target.value)}
            />
          </label>

          <div className="ops-channels" aria-label="Syndication retry channels">
            {CHANNELS.map((channel) => (
              <label key={channel} className="ops-check">
                <input
                  type="checkbox"
                  checked={selectedBulkChannels[channel]}
                  onChange={() => toggleBulkChannel(channel)}
                />
                {channel}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="submit-btn"
          onClick={handleBulkRetrySyndication}
          disabled={bulkRetrying}
        >
          {bulkRetrying ? 'Retrying Syndication Queue...' : 'Retry Syndication Queue'}
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}

      <section className="marketplace-inquiries-panel">
        <div className="inquiries-header-row">
          <h3>B2B Inquiries</h3>
          <div className="inquiries-controls">
            <input
              type="text"
              className="sidebar-search"
              placeholder="Search email, SKU, name..."
              value={inquirySearchQuery}
              onChange={(e) => setInquirySearchQuery(e.target.value)}
            />
            <select
              className="sidebar-sort"
              value={inquiryFilter}
              onChange={(e) => setInquiryFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="reserved">Reserved</option>
              <option value="closed">Closed</option>
            </select>
            <button type="button" className="submit-btn" onClick={() => loadInquiries()} disabled={inquiriesLoading}>
              {inquiriesLoading ? 'Refreshing...' : 'Refresh Inquiries'}
            </button>
          </div>
        </div>

        {inquiriesLoading ? <SkeletonList count={3} /> : null}
        {!inquiriesLoading && inquiries.length === 0 ? (
          <p className="empty-message">No inquiries yet.</p>
        ) : null}

        {!inquiriesLoading && inquiries.length > 0 ? (
          <div className="inquiries-list">
            {inquiries.map((row) => (
              <article className="inquiry-card" key={row.id}>
                <div className="inquiry-top">
                  <strong>{row.itemName || 'Unnamed item'}</strong>
                  <span className={`inquiry-status status-${row.status}`}>{row.status}</span>
                </div>
                <p className="inquiry-meta">
                  SKU: {row.itemSku || 'n/a'} | {row.requestType} | Qty: {row.quantityRequested}
                </p>
                <p className="inquiry-meta">
                  {row.requesterName} ({row.requesterEmail})
                  {row.requesterCompany ? ` - ${row.requesterCompany}` : ''}
                </p>
                <p className="inquiry-message">{row.message}</p>
                <div className="inquiry-actions">
                  <select
                    value={row.status}
                    onChange={(e) => handleUpdateInquiryStatus(row.id, e.target.value)}
                    disabled={updatingInquiryId === row.id}
                  >
                    <option value="new">new</option>
                    <option value="contacted">contacted</option>
                    <option value="reserved">reserved</option>
                    <option value="closed">closed</option>
                  </select>
                  {row.reservationApplied ? (
                    <button
                      type="button"
                      className="release-btn"
                      onClick={() => handleReleaseInquiryReservation(row.id)}
                      disabled={updatingInquiryId === row.id}
                    >
                      Release reservation
                    </button>
                  ) : null}
                  <span className="inquiry-time">{new Date(row.createdAt).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="marketplace-layout">
        <div className="marketplace-sidebar">
          <div className="sidebar-controls">
            <h3>Items ({filteredItems.length})</h3>
            <input
              type="text"
              className="sidebar-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
            />
            <select
              className="sidebar-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="stock-desc">Stock: High to Low</option>
            </select>
          </div>
          {loading ? (
            <SkeletonList count={5} />
          ) : filteredItems.length === 0 ? (
            <p className="empty-message">No items yet. Create your first item!</p>
          ) : (
            <div className="items-list">
              {filteredItems.map(item => (
                <div
                  key={getItemId(item)}
                  className={`item-preview ${getItemId(selectedItem) === getItemId(item) ? 'active' : ''}`}
                  onClick={() => handleEdit(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEdit(item);
                    }
                  }}
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="item-thumbnail"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
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
