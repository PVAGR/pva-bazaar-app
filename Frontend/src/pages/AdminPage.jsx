import React, { useState, useEffect } from 'react';
import './AdminPage.css';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
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

  // Check if already authenticated
  useEffect(() => {
    const auth = sessionStorage.getItem('admin-auth');
    if (auth === 'authenticated') {
      setIsAuthenticated(true);
    }
    
    // Load saved custom entries
    const customEntries = localStorage.getItem('custom-archive-entries');
    if (customEntries) {
      setSavedEntries(JSON.parse(customEntries));
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple password protection - you should change this password!
    if (password === 'pvabazaar2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin-auth', 'authenticated');
      setError('');
    } else {
      setError('Invalid password. Access denied.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin-auth');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create new entry with unique ID
    const newEntry = {
      id: `custom-${Date.now()}`,
      title: formData.title,
      file: `${formData.title.toLowerCase().replace(/\s+/g, '-')}.md`,
      category: formData.category,
      description: formData.description,
      wordCount: formData.wordCount,
      content: formData.content,
      createdAt: new Date().toISOString(),
      priority: 1
    };

    // Save to localStorage
    const updatedEntries = [...savedEntries, newEntry];
    setSavedEntries(updatedEntries);
    localStorage.setItem('custom-archive-entries', JSON.stringify(updatedEntries));

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
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const updatedEntries = savedEntries.filter(entry => entry.id !== id);
      setSavedEntries(updatedEntries);
      localStorage.setItem('custom-archive-entries', JSON.stringify(updatedEntries));
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="admin-page">
        <div className="admin-login">
          <div className="login-card">
            <h1>🔒 Admin Access</h1>
            <p>Enter password to access the admin panel</p>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="login-input"
                autoFocus
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
    <div className="admin-page authenticated">
      <div className="admin-header">
        <div className="header-content">
          <h1>⚙️ Archive Admin Panel</h1>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
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
                  <div key={entry.id} className="entry-preview">
                    <div className="entry-preview-header">
                      <strong>{entry.title}</strong>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        className="delete-btn"
                        title="Delete entry"
                      >
                        🗑️
                      </button>
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
            <h2>✍️ Create New Archive Entry</h2>
            
            {showSuccess && (
              <div className="success-message">
                ✅ Entry saved successfully! It will appear in the archive library.
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

              <button type="submit" className="submit-btn">
                💾 Save Entry to Archive
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
