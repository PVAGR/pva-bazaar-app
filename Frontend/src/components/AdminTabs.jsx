import React from 'react';
import './AdminTabs.css';

/**
 * AdminTabs
 * 
 * Internal tabs for the AdminPage to organize different admin functions:
 * - Archive: Create/edit/delete archive entries
 * - Marketplace: Manage marketplace items
 * - Users: User management
 * - Health: System monitoring & OpenClaw
 * - Settings: Configuration
 */
export default function AdminTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'archive', label: '📚 Archive', title: 'Manage archive entries' },
    { id: 'marketplace', label: '🛒 Marketplace', title: 'Manage marketplace items' },
    { id: 'users', label: '👥 Users', title: 'User management' },
    { id: 'cloud', label: '☁️ Cloud Storage', title: 'Cloud storage management' },
    { id: 'api', label: '🔗 API Docs', title: 'API documentation & endpoints' },
    { id: 'health', label: '💚 Health', title: 'System health & monitoring' },
    { id: 'settings', label: '⚙️ Settings', title: 'Configuration' },
  ];

  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-tab`}
          className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.title}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
