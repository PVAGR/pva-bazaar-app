import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createArchiveEntry, fetchArchiveEntries } from '../lib/api';
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
    wordCount: '0'
  });
  
  const [savedEntries, setSavedEntries] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

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
    // Admin credentials - only richyrichaii can access
    if (username === 'richyrichaii' && password === 'pva123zxc!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'authenticated');
      sessionStorage.setItem('admin-auth-version', 'v2'); // Mark as new version with username
      setError('');
    } else {
      setError('Invalid username or password. Access denied.');
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
        wordCount: '0'
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
      wordCount: entry.wordCount
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
      wordCount: '0'
    });
  };

  const handleDelete = (id) => {
    // Deletion not supported via API yet - show message
    alert('Deletion is not yet supported. Please contact the administrator to remove entries.');
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
            >
              {darkMode ? '☀️' : '🌙'}
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
                            handleDelete(entry.id);
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
    </div>
  );
}
