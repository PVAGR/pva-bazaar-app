/**
 * UsersTab
 * 
 * PURPOSE: Manage user accounts
 * 
 * FEATURES:
 * - View all registered users
 * - View user details
 * - Search and filter users
 * - View user activity and orders
 * 
 * API ENDPOINTS USED:
 * - GET /api/admin/users - Fetch all users (when backend supports it)
 * - GET /api/users/profile - Get user profile
 * 
 * NOTE: Full user management CRUD requires backend admin endpoints.
 * This tab provides read-only view for now.
 */

import React, { useState } from 'react';
import { createLogger } from '../lib/logger';
import './UsersTab.css';

const logger = createLogger('UsersTab');

export default function UsersTab() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration - replace with real API calls when backend is ready
  const mockUsers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      createdAt: '2026-01-15',
      status: 'active',
      orders: 3,
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      createdAt: '2026-02-20',
      status: 'active',
      orders: 1,
    },
    {
      id: '3',
      name: 'Admin User',
      email: 'admin@pvabazaar.org',
      role: 'admin',
      createdAt: '2025-12-01',
      status: 'active',
      orders: 0,
    },
  ];

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="users-tab" role="tabpanel" id="users-panel">
      <div className="tab-header">
        <h2>👥 User Management</h2>
        <p className="tab-description">
          View and manage user accounts. View user details, activity, and order history.
        </p>
      </div>

      <div className="users-toolbar">
        <div className="search-box">
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="users-stats">
          <div className="stat-badge">
            <span className="stat-value">{mockUsers.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-badge">
            <span className="stat-value">{mockUsers.filter(u => u.status === 'active').length}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-row">
                  {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="user-name">
                    <strong>{user.name}</strong>
                  </td>
                  <td className="user-email">{user.email}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="user-date">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="user-orders">{user.orders}</td>
                  <td>
                    <button className="view-btn" title="View details">
                      👁️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="info-box">
        <h3>📝 Implementation Note</h3>
        <p>
          Full user management requires backend admin endpoints (GET/PUT/DELETE /api/admin/users).
          Currently showing mock data for demonstration.
        </p>
        <p className="info-box-subtext">
          To enable full functionality:
        </p>
        <ul className="info-list">
          <li>Add admin middleware to backend</li>
          <li>Implement /api/admin/users endpoints</li>
          <li>Add role-based access control</li>
          <li>Connect this tab to real API</li>
        </ul>
      </div>
    </div>
  );
}
