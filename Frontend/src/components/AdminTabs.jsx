import React from 'react';
import './AdminTabs.css';

/**
 * AdminTabs
 * 
 * Internal tabs for the AdminPage to organize different admin functions:
 * - Dashboard: Overview & metrics
 * - Orders: Order management and refunds
 * - Transactions: Recent business transaction activity
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
const AdminTabs = React.memo(function AdminTabs({ activeTab, onTabChange, inquiryCounts }) {
  const newInquiryCount = Number(inquiryCounts?.new || 0);
  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', title: 'Admin overview & metrics (Alt+1)', shortcut: '1' },
    { id: 'orders', label: '📦 Orders', title: 'Order overview, fulfillment, and refunds (Alt+2)', shortcut: '2' },
    { id: 'transactions', label: '💱 Transactions', title: 'Recent business and payment activity (Alt+3)', shortcut: '3' },
    { id: 'archive', label: '📚 Archive', title: 'Manage archive entries (Alt+4)', shortcut: '4' },
    { id: 'marketplace', label: '🛒 Marketplace', title: 'Manage marketplace items (Alt+5)', shortcut: '5' },
    { id: 'inquiries', label: `📥 Inquiries${newInquiryCount > 0 ? ` (${newInquiryCount})` : ''}`, title: 'Manage B2B item inquiries', shortcut: null },
    { id: 'users', label: '👥 Users', title: 'User management (Alt+6)', shortcut: '6' },
    { id: 'attribution', label: '💰 Attribution', title: 'Creator attribution & commissions (Alt+7)', shortcut: '7' },
    { id: 'referrals', label: '🔗 Referrals', title: 'Referral codes, kickbacks & commission rates', shortcut: null },
    { id: 'payouts', label: '📈 Payouts', title: 'Commission payouts & settlements (Alt+8)', shortcut: '8' },
    { id: 'settlements', label: '📣 Settlements', title: 'Blockchain transfer contracts & receipts', shortcut: null },
    { id: 'cloud', label: '☁️ Cloud Storage', title: 'Cloud storage management (Alt+9)', shortcut: '9' },
    { id: 'library', label: '🧠 Knowledge Library', title: 'Manual and training archive', shortcut: null },
    { id: 'api', label: '🔗 API Docs', title: 'API documentation & endpoints', shortcut: null },
    { id: 'health', label: '💚 Health', title: 'System health & monitoring', shortcut: null },
    { id: 'settings', label: '⚙️ Settings', title: 'Configuration (Alt+0)', shortcut: '0' },
    { id: 'openclaw', label: '🦞 OpenClaw', title: 'OpenClaw gateway & agent interface', shortcut: null },
    { id: 'bounty-hunter', label: '🤖 Bounty Hunter', title: 'AI crypto bounty scanner & HITL review', shortcut: null },
    { id: 'royalty-analytics', label: '🎹 Royalty Analytics', title: 'Cross-creator royalty & sales event log', shortcut: null },
    { id: 'overview', label: '🎯 Overview', title: '3PL Dashboard - System status & feature overview', shortcut: null },
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
          {tab.shortcut && (
            <span className="tab-shortcut" aria-label={`Keyboard shortcut: Alt+${tab.shortcut}`}>
              Alt+{tab.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

export default AdminTabs;
