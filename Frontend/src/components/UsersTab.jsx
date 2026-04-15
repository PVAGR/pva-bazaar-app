/**
 * UsersTab
 * 
 * PURPOSE: Manage user accounts with real backend integration
 * 
 * FEATURES:
 * - View all registered users with pagination
 * - Search and filter users in real-time
 * - View detailed user information
 * - Edit user details (name, email, profile)
 * - Delete user accounts (with confirmation)
 * - View user statistics and activity
 * 
 * API ENDPOINTS:
 * - GET /api/admin/users - Fetch all users with filtering
 * - GET /api/admin/users/:id - Get specific user details
 * - PUT /api/admin/users/:id - Update user information
 * - DELETE /api/admin/users/:id - Delete user account
 * - GET /api/admin/stats - Get user statistics
 */

import React, { useState, useEffect } from 'react';
import { apiGet, apiPut, apiDelete } from '../lib/api';
import api from '../lib/axios';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner.jsx';
import './UsersTab.css';

const logger = createLogger('UsersTab');

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [trustForm, setTrustForm] = useState({
    tradingRestricted: false,
    publicSafetyNotice: '',
    internalCaseNotes: '',
  });
  const [promotingUserId, setPromotingUserId] = useState('');

  useEffect(() => {
    loadUsers();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/admin/users?page=${page}&limit=20&search=${searchQuery}`);
      
      if (data.ok) {
        setUsers(data.users);
        setPagination(data.pagination);
        setError(null);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      logger.error('Load users error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiGet('/admin/stats');
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (err) {
      logger.error('Load stats error:', err);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const data = await apiGet(`/admin/users/${userId}`);
      if (data.ok) {
        setSelectedUser(data.user);
        const trust = data.user?.onboardingProfile?.trustAndSafety || {};
        setTrustForm({
          tradingRestricted: Boolean(trust.tradingRestricted),
          publicSafetyNotice: trust.publicSafetyNotice || '',
          internalCaseNotes: trust.internalCaseNotes || '',
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const saveTrustSettings = async () => {
    if (!selectedUser?._id) return;
    try {
      const data = await apiPut(`/admin/users/${selectedUser._id}/trust`, trustForm);
      if (data.ok) {
        setSuccess('Trust and safety settings updated');
        setSelectedUser(data.user);
        loadUsers();
      } else {
        setError(data.error || 'Failed to update trust settings');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerBlobDownload = async (urlPath, fallbackName) => {
    const response = await api.get(urlPath, { responseType: 'blob' });
    const blob = new globalThis.Blob([response.data]);
    const disposition = response.headers?.['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const fileName = match?.[1] || fallbackName;

    const objectUrl = globalThis.URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
    globalThis.URL.revokeObjectURL(objectUrl);
  };

  const downloadAllUsers = async () => {
    try {
      await triggerBlobDownload('/admin/users/export.csv', 'admin-users-export.csv');
      setSuccess('User export downloaded');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to download user export');
    }
  };

  const downloadSingleUser = async (userId) => {
    try {
      await triggerBlobDownload(`/admin/users/${userId}/export`, `user-${userId}.json`);
      setSuccess('User profile export downloaded');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to download profile export');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const data = await apiPut(`/admin/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
        username: editingUser.username,
        profilePicture: editingUser.profilePicture
      });

      if (data.ok) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        loadUsers();
      } else {
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!globalThis.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const data = await apiDelete(`/admin/users/${userId}`);
      
      if (data.ok) {
        setSuccess(`User "${userName}" deleted successfully`);
        loadUsers();
        loadStats();
      } else {
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePromoteToAdmin = async (user) => {
    if (!user?._id) return;
    const label = user.name || user.email || user.username || 'this user';
    if (!globalThis.confirm(`Promote "${label}" to admin? They will get full admin access.`)) {
      return;
    }

    try {
      setPromotingUserId(user._id);
      const data = await apiPut(`/admin/users/${user._id}`, { role: 'admin' });
      if (data.ok) {
        setSuccess(`"${label}" is now an admin.`);
        if (selectedUser?._id === user._id) {
          setSelectedUser((prev) => (prev ? { ...prev, role: 'admin' } : prev));
        }
        loadUsers();
        loadStats();
      } else {
        setError(data.error || 'Failed to promote user');
      }
    } catch (err) {
      setError(err.message || 'Failed to promote user');
    } finally {
      setPromotingUserId('');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div className="users-tab">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="users-tab" role="tabpanel" id="users-panel">
      <div className="tab-header">
        <h2>👥 User Management</h2>
        <p className="tab-description">
          Manage user accounts, view activity, and monitor user statistics
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          ✅ {success}
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeUsers}</div>
              <div className="stat-label">Active Users</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-content">
              <div className="stat-value">{stats.adminUsers}</div>
              <div className="stat-label">Admins</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">+{stats.newUsersThisMonth}</div>
              <div className="stat-label">New This Month</div>
            </div>
          </div>
        </div>
      )}

      <div className="users-toolbar">
        <div className="search-box">
          <input
            type="search"
            placeholder="🔍 Search users by name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button onClick={loadUsers} className="btn btn-refresh" disabled={loading}>
          {loading ? <LoadingDots /> : '🔄 Refresh'}
        </button>
        <button onClick={downloadAllUsers} className="btn btn-secondary" disabled={loading}>
          ⬇️ Export CSV
        </button>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <p>No users found{searchQuery && ` matching "${searchQuery}"`}</p>
        </div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-cell">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.name} className="user-avatar" />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="user-name">{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.username || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status === 'active' ? '✅ Active' : '⚪ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleViewUser(user._id)}
                          className="btn-icon"
                          title="View details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => downloadSingleUser(user._id)}
                          className="btn-icon"
                          title="Download profile export"
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="btn-icon"
                          title="Edit user"
                        >
                          ✏️
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handlePromoteToAdmin(user)}
                            className="btn-icon btn-promote"
                            title="Promote to admin"
                            disabled={promotingUserId === user._id}
                          >
                            {promotingUserId === user._id ? '⏳' : '👑'}
                          </button>
                        )}
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="btn-icon btn-delete"
                            title="Delete user"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {page} of {pagination.pages} ({pagination.total} users)
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="btn btn-secondary"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Profile Picture URL</label>
                <input
                  type="url"
                  value={editingUser.profilePicture || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, profilePicture: e.target.value })}
                  className="form-input"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingUser(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveUser} className="btn btn-primary">
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="btn-close">×</button>
            </div>
            <div className="modal-body">
              <div className="user-details">
                {selectedUser.profilePicture && (
                  <img src={selectedUser.profilePicture} alt={selectedUser.name} className="user-avatar-large" />
                )}
                <div className="detail-row">
                  <strong>Name:</strong> {selectedUser.name}
                </div>
                <div className="detail-row">
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                {selectedUser.username && (
                  <div className="detail-row">
                    <strong>Username:</strong> {selectedUser.username}
                  </div>
                )}
                <div className="detail-row">
                  <strong>Role:</strong> 
                  <span className={`role-badge ${selectedUser.role}`}>
                    {selectedUser.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span className={`status-badge ${selectedUser.status}`}>
                    {selectedUser.status === 'active' ? '✅ Active' : '⚪ Inactive'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Joined:</strong> {formatDate(selectedUser.createdAt)}
                </div>
                <div className="detail-row">
                  <strong>Last Updated:</strong> {formatDate(selectedUser.updatedAt)}
                </div>
                <div className="detail-row">
                  <strong>User ID:</strong> <code>{selectedUser._id}</code>
                </div>

                <hr />
                <h4>Trading identity profile</h4>
                <div className="detail-row">
                  <strong>Legal name:</strong> {selectedUser?.onboardingProfile?.compliance?.legalFullName || '—'}
                </div>
                <div className="detail-row">
                  <strong>ID type:</strong> {selectedUser?.onboardingProfile?.compliance?.legalIdType || '—'}
                </div>
                <div className="detail-row">
                  <strong>ID number:</strong> {selectedUser?.onboardingProfile?.compliance?.legalIdNumber || '—'}
                </div>
                <div className="detail-row">
                  <strong>Address:</strong> {[selectedUser?.onboardingProfile?.compliance?.addressLine1, selectedUser?.onboardingProfile?.compliance?.city, selectedUser?.onboardingProfile?.compliance?.stateProvince, selectedUser?.onboardingProfile?.compliance?.postalCode, selectedUser?.onboardingProfile?.compliance?.country].filter(Boolean).join(', ') || '—'}
                </div>
                <div className="detail-row">
                  <strong>Phone:</strong> {selectedUser?.onboardingProfile?.compliance?.phone || '—'}
                </div>
                <div className="detail-row">
                  <strong>Identity attested:</strong> {selectedUser?.onboardingProfile?.compliance?.identityAttested ? 'Yes' : 'No'}
                </div>

                <h4>Contact links</h4>
                <div className="detail-row">
                  <strong>Instagram:</strong> {selectedUser?.onboardingProfile?.contactLinks?.instagram || '—'}
                </div>
                <div className="detail-row">
                  <strong>Telegram:</strong> {selectedUser?.onboardingProfile?.contactLinks?.telegram || '—'}
                </div>
                <div className="detail-row">
                  <strong>Website:</strong> {selectedUser?.onboardingProfile?.contactLinks?.website || '—'}
                </div>

                <hr />
                <h4>Trust and safety controls</h4>
                <label className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={trustForm.tradingRestricted}
                    onChange={(e) => setTrustForm((prev) => ({ ...prev, tradingRestricted: e.target.checked }))}
                  />
                  Restrict this user from trading
                </label>
                <div className="form-group">
                  <label>Public safety notice (non-PII)</label>
                  <textarea
                    value={trustForm.publicSafetyNotice}
                    onChange={(e) => setTrustForm((prev) => ({ ...prev, publicSafetyNotice: e.target.value }))}
                    className="form-input"
                    rows={3}
                    placeholder="Public warning summary without private identifiers"
                  />
                </div>
                <div className="form-group">
                  <label>Internal case notes (admin only)</label>
                  <textarea
                    value={trustForm.internalCaseNotes}
                    onChange={(e) => setTrustForm((prev) => ({ ...prev, internalCaseNotes: e.target.value }))}
                    className="form-input"
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Close
              </button>
              <button onClick={() => downloadSingleUser(selectedUser._id)} className="btn btn-secondary">
                ⬇️ Download profile
              </button>
              <button onClick={saveTrustSettings} className="btn btn-secondary">
                Save trust settings
              </button>
              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() => handlePromoteToAdmin(selectedUser)}
                  className="btn btn-secondary"
                  disabled={promotingUserId === selectedUser._id}
                >
                  {promotingUserId === selectedUser._id ? 'Promoting...' : '👑 Make admin'}
                </button>
              )}
              <button 
                onClick={() => {
                  handleEditUser(selectedUser);
                  setSelectedUser(null);
                }} 
                className="btn btn-primary"
              >
                ✏️ Edit User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
