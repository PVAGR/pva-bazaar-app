  {/* ===== Ultra-compact API Connection Panel Modal ===== */}
  {showConnectionPanel && (
    <div className="apiConnOverlay" role="dialog" aria-modal="true">
      <div className="apiConnModal">
        <div className="apiConnHeader">
          <div className="apiConnTitle">API</div>

          <div className="apiConnHeaderActions">
            <button
              className="btnCompact"
              onClick={() => setShowConnectionPanel(false)}
              aria-label="Close API connection panel"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="apiConnList">
          {(connectionChecks || []).map((c) => {
            const status = c?.ok === true ? "ok" : c?.ok === false ? "err" : "unknown";
            const statusLabel =
              status === "ok" ? "OK" : status === "err" ? "Fail" : "—";

            // one-line summary (compact)
            const oneLine =
              status === "ok"
                ? "OK"
                : (c?.errorShort || c?.error || c?.message || "Failed");

            return (
              <div key={c.path} className="apiConnRow">
                <div className="apiConnRowTop">
                  <span className={`statusDot ${status}`} aria-hidden="true" />
                  <span className="apiConnPath" title={c.path}>
                    {c.path}
                  </span>
                  <span className={`apiConnStatus ${status}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* secondary line: hidden on small screens by CSS */}
                <div className="apiConnSub" title={c?.error || c?.message || ""}>
                  {oneLine}
                </div>
              </div>
            );
          })}
        </div>

        <div className="apiConnActions">
          <button className="btnCompact" onClick={() => navigate("/")}>Home</button>
          <button className="btnCompact" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  )}
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createArchiveEntry, fetchArchiveEntries, deleteArchiveEntry, apiFetch, getApiBase } from '../lib/api';
import './AdminPage.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('dev_admin_code'); // Admin secret code for API
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive-theme');
    return saved ? saved === 'dark' : true;
  });
  
  // Form state for new archive entry
  const [formData, setFormData] = useState({
    title: '',
    category: 'Personal',
    description: '',
    content: '',
    wordCount: '0',
    mediaUrls: ''
  });
  
  const [savedEntries, setSavedEntries] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // {id, title} for confirmation modal
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [adminTokenInput, setAdminTokenInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({
    loading: true,
    checkedAt: null,
    apiBase: getApiBase(),
    results: {},
  });

  // Check if already authenticated with NEW credentials system
  useEffect(() => {
    const auth = sessionStorage.getItem('admin-auth');
    const authVersion = sessionStorage.getItem('admin-auth-version');
    
    // Only accept sessions with v2 (username+password) - invalidate old password-only sessions
    if (auth === 'authenticated' && authVersion === 'v2') {
      setIsAuthenticated(true);
    } else {
      // Clear old sessions
      sessionStorage.removeItem('admin-auth');
      sessionStorage.removeItem('admin-auth-version');
      setIsAuthenticated(false);
    }
    
    // Load saved entries from server
    loadEntriesFromServer();
  }, []);

  const runConnectionCheck = async () => {
    const endpoints = [
      { key: 'health', path: '/api/health' },
      { key: 'ping', path: '/api/ping' },
      { key: 'version', path: '/api/version' },
      { key: 'archive', path: '/api/archive' },
    ];

    setConnectionStatus((prev) => ({
      ...prev,
      loading: true,
      apiBase: getApiBase(),
    }));

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const res = await apiFetch(endpoint.path, { method: 'GET' });
        const json = await res.json().catch(() => ({}));
        results[endpoint.key] = {
          ok: res.ok,
          status: res.status,
          message: json.message || json.status || json.error || '',
        };
      } catch (err) {
        results[endpoint.key] = {
          ok: false,
          status: 'error',
          message: err.message || 'Request failed',
        };
      }
    }

    if (adminTokenInput.trim()) {
      try {
        const res = await apiFetch('/api/admin/status', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminTokenInput.trim()}` },
        });
        const json = await res.json().catch(() => ({}));
        results.admin = {
          ok: res.ok,
          status: res.status,
          message: json.message || json.status || json.error || '',
        };
      } catch (err) {
        results.admin = {
          ok: false,
          status: 'error',
          message: err.message || 'Request failed',
        };
      }
    }

    setConnectionStatus({
      loading: false,
      checkedAt: new Date().toLocaleString(),
      apiBase: getApiBase(),
      results,
    });
  };

  useEffect(() => {
    runConnectionCheck();
  }, []);
  const loadEntriesFromServer = async () => {
    try {
      const entries = await fetchArchiveEntries();
      setSavedEntries(entries);
    } catch (err) {
      console.error('Failed to load entries from server:', err);
    }
  };
  const handleLogin = (e) => {
    e.preventDefault();
    // Trim whitespace from inputs
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // Admin credentials - only richyrichaii can access
    if (trimmedUsername === 'richyrichaii' && trimmedPassword === 'pva123zxc!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'authenticated');
      sessionStorage.setItem('admin-auth-version', 'v2'); // Mark as new version with username
      setError('');
      setUsername('');
      setPassword('');
    } else {
      setError('Invalid username or password. Access denied.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin-auth');
    sessionStorage.removeItem('admin-auth-version');
    setUsername('');
    setPassword('');
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

        const result = await createArchiveEntry(entryData, adminCode);
        
        if (!result.ok) {
          if (result.error.includes('401') || result.error.toLowerCase().includes('unauthorized')) {
            setApiError('Admin code incorrect. Please check your secret code.');
          } else {
            setApiError(`Failed to create entry: ${result.error}`);
          }
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
      const result = await deleteArchiveEntry(id, adminCode);
      
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

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className={`admin-page ${darkMode ? 'dark-theme' : 'light-theme'}`}>
        <button 
          className="theme-toggle login-theme-toggle" 
          onClick={() => {
            setDarkMode(!darkMode);
            localStorage.setItem('archive-theme', !darkMode ? 'dark' : 'light');
          }}
          aria-label="Toggle theme"
          title="Toggle light/dark theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <div className="admin-login">
          <div className="login-card">
            <h1>🔒 Admin Access</h1>
            <p>Enter your credentials to access the admin panel</p>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="login-input"
                autoFocus
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="login-input"
                required
              />
              {error && <div className="error-message">{error}</div>}
              <button type="submit" className="login-btn">
                Access Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className={`admin-page authenticated ${darkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="admin-header">
        <div className="header-content">
          <h1>⚙️ Archive Admin Panel</h1>
          <div className="header-actions">
            <Link to="/" className="home-btn">
              🏠 Home
            </Link>
            <button 
              className="theme-toggle" 
              onClick={() => {
                setDarkMode(!darkMode);
                localStorage.setItem('archive-theme', !darkMode ? 'dark' : 'light');
              }}
              aria-label="Toggle theme"
              title="Toggle light/dark theme"
            >
              {darkMode ? '☀️' : '🌙'}
            <div className="sidebar-section connection-panel">
              <div className="connection-header">
                <h2>Connection Status</h2>
                <button
                  type="button"
                  className="connection-refresh"
                  onClick={runConnectionCheck}
                  disabled={connectionStatus.loading}
                  aria-label="Refresh connection status"
                  title="Refresh connection status"
                >
                  {connectionStatus.loading ? 'Checking…' : 'Refresh'}
                </button>
              </div>
              <div className="connection-base">
                API: <span>{connectionStatus.apiBase}</span>
              </div>
              {connectionStatus.checkedAt && (
                <div className="connection-updated">
                  Last check: {connectionStatus.checkedAt}
                </div>
              )}
              <div className="connection-token">
                <label htmlFor="adminToken">Admin token (optional)</label>
                <input
                  id="adminToken"
                  type="password"
                  value={adminTokenInput}
                  onChange={(e) => setAdminTokenInput(e.target.value)}
                  placeholder="Paste admin JWT token"
                />
                <small>Used only for /api/admin/status check.</small>
              </div>
              <ul className="connection-list">
                {['health', 'ping', 'version', 'archive', 'admin'].map((key) => {
                  const item = connectionStatus.results[key];
                  return (
                    <li key={key} className={`connection-item ${item?.ok ? 'ok' : 'bad'}`}>
                      <div className="connection-item__row">
                        <span className="connection-item__status-dot" aria-hidden="true"></span>
                        <span className="connection-item__name">/api/{key}</span>
                        <span className="connection-item__status">
                          {item ? (item.ok ? 'OK' : `Fail (${item.status})`) : '—'}
                        </span>
                      </div>
                      {item?.message && (
                        <div className="connection-item__message">{item.message}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-container">
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
            {savedEntries.length === 0 ? (
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
              <div className="error-message" style={{
                background: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #fcc'
              }}>
                ❌ {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="adminCode">Admin Secret Code *</label>
                <input
                  type="password"
                  id="adminCode"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter admin secret code"
                  required
                  style={{
                    background: '#fffacd',
                    border: '2px solid #f0e68c'
                  }}
                />
                <small style={{color: '#666', fontSize: '0.85em'}}>
                  Required to publish entries to the live site
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="title">Title *</label>
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
                <label htmlFor="category">Category *</label>
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
                <label htmlFor="description">Description *</label>
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
                <label htmlFor="mediaUrls">Media URLs (optional)</label>
                <textarea
                  id="mediaUrls"
                  name="mediaUrls"
                  value={formData.mediaUrls}
                  onChange={handleInputChange}
                  placeholder="https://example.com/photo.jpg
https://example.com/video.mp4"
                  rows="3"
                />
                <small style={{ color: '#666', fontSize: '0.85em' }}>
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
                <label htmlFor="content">Content * (Markdown supported)</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="# Your Title Here

Write your content here...

## Section
Your text...

- Bullet points
- Are supported

**Bold** and *italic* text work too."
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation-bubble">
            <div className="bubble-icon">⚠️</div>
            <h3>Delete Entry?</h3>
            <p className="entry-title-confirm">{deleteConfirm.title}</p>
            <p className="warning-text">This action cannot be undone.</p>
            
            <div className="button-group">
              <button 
                onClick={cancelDelete}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="confirm-delete-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Deleting...' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
