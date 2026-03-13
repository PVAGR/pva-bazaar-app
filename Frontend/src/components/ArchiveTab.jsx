/**
 * ArchiveTab
 * 
 * PURPOSE: Manage archive entries with CRUD operations
 * 
 * FEATURES:
 * - Create new archive entries with markdown support
 * - View all saved archive entries
 * - Edit existing entries
 * - Delete entries with confirmation
 * - Media upload via Cloudinary
 * - Real-time word count
 * - Statistics display
 * 
 * API ENDPOINTS:
 * - GET /api/archive - Fetch all archive entries
 * - POST /api/archive - Create new entry
 * - DELETE /api/archive/:id - Delete entry
 */

import React, { useState, useEffect } from 'react';
import { createArchiveEntry, fetchArchiveEntries, deleteArchiveEntry } from '../lib/api';
import { createLogger } from '../lib/logger';
import HelpTip from './HelpTip';
import { SkeletonList } from './SkeletonLoader';
import './ArchiveTab.css';

const logger = createLogger('ArchiveTab');

export default function ArchiveTab() {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Personal',
    description: '',
    content: '',
    wordCount: '0',
    mediaUrls: ''
  });
  
  const [savedEntries, setSavedEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEntriesFromServer();
  }, []);

  const loadEntriesFromServer = async () => {
    setEntriesLoading(true);
    try {
      const response = await fetchArchiveEntries({ limit: 100 });
      if (response.ok && Array.isArray(response.items)) {
        setSavedEntries(response.items);
      } else {
        setSavedEntries([]);
      }
    } catch (err) {
      logger.error('Failed to load entries from server', err);
      setSavedEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-calculate word count for content
      ...(name === 'content' ? { wordCount: value.trim().split(/\s+/).length.toString() } : {})
    }));
  };

  const parseMediaUrls = (value) =>
    value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const getCloudinaryConfig = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    return { cloudName, uploadPreset };
  };

  const uploadMediaFiles = async (files) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    if (!cloudName || !uploadPreset) {
      setMediaError('Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    if (!files?.length) return;

    setMediaError('');
    setUploadingMedia(true);

    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const form = new FormData();
          form.append('file', file);
          form.append('upload_preset', uploadPreset);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: form,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error?.message || 'Upload failed');
          }
          return data.secure_url;
        })
      );

      setFormData((prev) => {
        const existing = prev.mediaUrls ? `${prev.mediaUrls}\n` : '';
        return { ...prev, mediaUrls: `${existing}${uploads.join('\n')}`.trim() };
      });
    } catch (err) {
      setMediaError(err.message || 'Upload failed');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsSubmitting(true);
    
    try {
      if (editingEntry) {
        // For now, editing is not supported via API - show message
        setApiError('Editing existing entries is not yet supported. Please create a new entry.');
        setIsSubmitting(false);
        return;
      } else {
        // Create new entry via API
        const entryData = {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          content: formData.content,
          wordCount: formData.wordCount,
          media: parseMediaUrls(formData.mediaUrls),
        };

        const result = await createArchiveEntry(entryData);
        
        if (!result.ok) {
          setApiError(`Failed to create entry: ${result.error}`);
          setIsSubmitting(false);
          return;
        }

        // Success - refresh entries
        await loadEntriesFromServer();
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reset form
      setFormData({
        title: '',
        category: 'Personal',
        description: '',
        content: '',
        wordCount: '0',
        mediaUrls: ''
      });
      setApiError('');
    } catch (err) {
      setApiError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      category: entry.category,
      description: entry.description,
      content: entry.content,
      wordCount: entry.wordCount,
      mediaUrls: Array.isArray(entry.media) ? entry.media.join('\n') : ''
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setFormData({
      title: '',
      category: 'Personal',
      description: '',
      content: '',
      wordCount: '0',
      mediaUrls: ''
    });
  };

  const handleDelete = async (id, title) => {
    // Show custom confirmation modal
    setDeleteConfirm({ id, title });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm) return;
    
    const { id } = deleteConfirm;
    
    try {
      setIsSubmitting(true);
      const result = await deleteArchiveEntry(id);
      
      if (result.ok) {
        setSavedEntries(prev => prev.filter(entry => entry._id !== id && entry.id !== id));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setDeleteConfirm(null);
      } else {
        setApiError(result.error || 'Failed to delete entry');
        setTimeout(() => setApiError(''), 5000);
        setDeleteConfirm(null);
      }
    } catch (err) {
      setApiError(err.message || 'Error deleting entry');
      setTimeout(() => setApiError(''), 5000);
      setDeleteConfirm(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <>
      <div className="admin-sidebar">
        <div className="sidebar-section">
          <h2>📊 Statistics</h2>
          <div className="stat-item">
            <span>Original Entries:</span>
            <strong>17</strong>
          </div>
          <div className="stat-item">
            <span>Custom Entries:</span>
            <strong>{savedEntries.length}</strong>
          </div>
          <div className="stat-item">
            <span>Total Entries:</span>
            <strong>{17 + savedEntries.length}</strong>
          </div>
        </div>
        <div className="sidebar-section">
          <h2>📝 Your Entries</h2>
          {entriesLoading ? (
            <SkeletonList count={5} />
          ) : savedEntries.length === 0 ? (
            <p className="empty-message">No custom entries yet</p>
          ) : (
            <div className="entries-list">
              {savedEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className={`entry-preview ${editingEntry?.id === entry.id ? 'active' : ''}`}
                  onClick={() => handleEdit(entry)}
                >
                  <div className="entry-preview-header">
                    <strong>{entry.title}</strong>
                    <div className="entry-actions">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry._id || entry.id, entry.title);
                        }}
                        className="delete-btn"
                        title="Delete entry"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <span className="entry-category">{entry.category}</span>
                  <span className="entry-words">{entry.wordCount} words</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="admin-main">
        <div className="form-card">
          <h2>{editingEntry ? '✏️ Edit Archive Entry' : '✍️ Create New Archive Entry'}</h2>
          {editingEntry && (
            <div className="info-message">
              📝 Editing: <strong>{editingEntry.title}</strong>
              <button onClick={handleCancelEdit} className="cancel-edit-btn">✕ Cancel</button>
            </div>
          )}
          {showSuccess && (
            <div className="success-message">
              ✅ Entry {editingEntry ? 'updated' : 'saved'} successfully! It will appear in the archive library.
            </div>
          )}
          {apiError && (
            <div className="error-message api-error-message">
              ❌ {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">
                Title *{' '}
                <HelpTip
                  title="Title"
                  body="A clear name for this archive entry. It will be shown in the library list."
                  example="Archive Entry 018: My New Story"
                />
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Archive Entry 018: My New Story"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="category">
                Category *{' '}
                <HelpTip
                  title="Category"
                  body="Used to organize entries and filter the library."
                  example="Technology"
                />
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="Fiction">Fiction</option>
                <option value="Spiritual">Spiritual</option>
                <option value="Technology">Technology</option>
                <option value="Business">Business</option>
                <option value="Personal">Personal</option>
                <option value="Philosophy">Philosophy</option>
                <option value="Wisdom">Wisdom</option>
                <option value="Architecture">Architecture</option>
                <option value="Strategic">Strategic</option>
                <option value="Index">Index</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="description">
                Description *{' '}
                <HelpTip
                  title="Description"
                  body="A short summary shown in the list preview."
                  example="A brief description of this archive entry..."
                />
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="A brief description of this archive entry..."
                rows="2"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="mediaUrls">
                Media URLs (optional){' '}
                <HelpTip
                  title="Media URLs"
                  body="Optional links to images/video/audio that will be shown under the entry. You can also drag & drop files to upload."
                  example="https://example.com/photo.jpg"
                />
              </label>
              <textarea
                id="mediaUrls"
                name="mediaUrls"
                value={formData.mediaUrls}
                onChange={handleInputChange}
                placeholder="https://example.com/photo.jpg&#10;https://example.com/video.mp4"
                rows="3"
              />
              <small className="media-url-help">
                Add one URL per line or separate with commas.
              </small>
              <div
                className="media-uploader"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  uploadMediaFiles(e.dataTransfer.files);
                }}
              >
                <div className="media-uploader__text">
                  Drag & drop files here, or select files to upload
                </div>
                <label className="media-uploader__button">
                  {uploadingMedia ? 'Uploading…' : 'Choose files'}
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    multiple
                    disabled={uploadingMedia}
                    onChange={(e) => uploadMediaFiles(e.target.files)}
                  />
                </label>
                {mediaError && <div className="media-uploader__error">{mediaError}</div>}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="content">
                Content * (Markdown supported){' '}
                <HelpTip
                  title="Content"
                  body="Write the full entry content. Markdown formatting is supported."
                  example="# Title\n\nYour content here..."
                />
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="# Your Title Here&#10;&#10;Write your content here...&#10;&#10;## Section&#10;Your text...&#10;&#10;- Bullet points&#10;- Are supported&#10;&#10;**Bold** and *italic* text work too."
                rows="15"
                required
              />
              <div className="word-count">
                Word count: {formData.wordCount}
              </div>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Publishing...' : (editingEntry ? '✅ Update Entry' : '💾 Publish to Live Site')}
            </button>
          </form>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Confirm Delete</h2>
            <p>Are you sure you want to delete this entry?</p>
            <p><strong>{deleteConfirm.title}</strong></p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={cancelDelete} className="cancel-btn">
                Cancel
              </button>
              <button onClick={confirmDeleteAction} className="delete-btn-confirm" disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
