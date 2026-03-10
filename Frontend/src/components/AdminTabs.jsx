import React from 'react';
import './AdminTabs.css';

/**
 * AdminTabs
 * 
 * Internal tabs for the AdminPage to organize different admin functions:
 * - Dashboard: Overview & metrics
 * - Archive: Create/edit/delete archive entries
 * - Marketplace: Manage marketplace items
 * - Users: User management
 * - Cloud Storage: Cloud file management
 * - API Docs: API documentation
 * - Health: System monitoring & OpenClaw
 * - Settings: Configuration
 * 
 * Optimized with React.memo to prevent re-renders when parent state changes
 */
const AdminTabs = React.memo(function AdminTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', title: 'Admin overview & metrics (Alt+1)', shortcut: '1' },
    { id: 'archive', label: '📚 Archive', title: 'Manage archive entries (Alt+2)', shortcut: '2' },
    { id: 'marketplace', label: '🛒 Marketplace', title: 'Manage marketplace items (Alt+3)', shortcut: '3' },
    { id: 'users', label: '👥 Users', title: 'User management (Alt+4)', shortcut: '4' },
    { id: 'cloud', label: '☁️ Cloud Storage', title: 'Cloud storage management (Alt+5)', shortcut: '5' },
    { id: 'api', label: '🔗 API Docs', title: 'API documentation & endpoints (Alt+6)', shortcut: '6' },
    { id: 'health', label: '💚 Health', title: 'System health & monitoring (Alt+7)', shortcut: '7' },
    { id: 'settings', label: '⚙️ Settings', title: 'Configuration (Alt+8)', shortcut: '8' },
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
          <span className="tab-shortcut" aria-label={`Keyboard shortcut: Alt+${tab.shortcut}`}>
            Alt+{tab.shortcut}
          </span>
        </button>
      ))}
    </div>
  );
});

export default AdminTabs;
