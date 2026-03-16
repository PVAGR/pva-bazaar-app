import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchNotificationBadge,
  fetchNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../lib/api';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 30_000;

const TYPE_ICON = {
  SALE: '🎉',
  ROYALTY: '💰',
  SYSTEM: '⚙️',
  INFO: 'ℹ️',
};

function formatAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell({ recipientAddress }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // Poll badge count
  const pollBadge = useCallback(async () => {
    if (!recipientAddress) return;
    const result = await fetchNotificationBadge(recipientAddress);
    if (result.ok) setUnreadCount(result.unreadCount ?? 0);
  }, [recipientAddress]);

  useEffect(() => {
    pollBadge();
    const timer = setInterval(pollBadge, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pollBadge]);

  // Load full list when panel opens
  const loadNotifications = useCallback(async () => {
    if (!recipientAddress) return;
    setLoading(true);
    const result = await fetchNotifications(recipientAddress, { limit: 50, offset: 0 });
    setLoading(false);
    if (result.ok) {
      setNotifications(result.notifications || []);
      setUnreadCount(result.unreadCount ?? 0);
    }
  }, [recipientAddress]);

  function togglePanel() {
    if (!open) {
      setOpen(true);
      loadNotifications();
    } else {
      setOpen(false);
    }
  }

  // Mark visible unread as read when panel opens
  useEffect(() => {
    if (!open || notifications.length === 0 || !recipientAddress) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    markNotificationsRead(recipientAddress, unreadIds).then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
      setUnreadCount(0);
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleMarkAllRead() {
    if (!recipientAddress) return;
    await markAllNotificationsRead(recipientAddress);
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    setUnreadCount(0);
  }

  async function handleDelete(id) {
    if (!recipientAddress) return;
    await deleteNotification(recipientAddress, id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  if (!recipientAddress) return null;

  return (
    <div className="notif-bell">
      <button
        ref={bellRef}
        className={`notif-bell__btn${open ? ' notif-bell__btn--open' : ''}`}
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="notif-bell__panel-header">
            <span>Notifications</span>
            <div className="notif-bell__panel-actions">
              <button onClick={loadNotifications} title="Refresh" disabled={loading}>↺</button>
              <button onClick={handleMarkAllRead} title="Mark all read">✓ All</button>
              <button onClick={() => setOpen(false)} title="Close" className="notif-bell__close">✕</button>
            </div>
          </div>

          <div className="notif-bell__list">
            {loading && <div className="notif-bell__state">Loading…</div>}
            {!loading && notifications.length === 0 && (
              <div className="notif-bell__state">No notifications yet.</div>
            )}
            {!loading && notifications.map(n => (
              <div
                key={n.id}
                className={`notif-bell__item${!n.read ? ' notif-bell__item--unread' : ''}`}
              >
                <span className="notif-bell__icon" aria-hidden="true">
                  {TYPE_ICON[n.type] || 'ℹ️'}
                </span>
                <div className="notif-bell__content">
                  <div className="notif-bell__title">{n.title}</div>
                  <div className="notif-bell__message">{n.message}</div>
                  <div className="notif-bell__meta">{formatAgo(n.created_at)}</div>
                </div>
                <button
                  className="notif-bell__dismiss"
                  onClick={() => handleDelete(n.id)}
                  title="Dismiss"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
