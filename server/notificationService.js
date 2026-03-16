const db = require('./db');

const MAX_NOTIFICATIONS_PER_USER = 200;

/**
 * Create a notification for a recipient.
 * @param {object} opts
 * @param {string} opts.recipientAddress
 * @param {'SALE'|'ROYALTY'|'SYSTEM'|'INFO'} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {number|null} [opts.referenceId]
 * @param {string|null} [opts.referenceType]
 * @returns {object} The inserted notification row
 */
function createNotification({ recipientAddress, type = 'INFO', title, message, referenceId = null, referenceType = null }) {
  if (!recipientAddress || !title || !message) {
    throw new Error('recipientAddress, title, and message are required');
  }

  const stmt = db.prepare(`
    INSERT INTO notifications (recipient_address, type, title, message, reference_id, reference_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    String(recipientAddress).trim(),
    String(type).toUpperCase(),
    String(title),
    String(message),
    referenceId !== null && referenceId !== undefined ? Number(referenceId) : null,
    referenceType ? String(referenceType) : null,
  );

  // Prune old notifications beyond max, keeping newest ones
  db.prepare(`
    DELETE FROM notifications
    WHERE recipient_address = ?
      AND id NOT IN (
        SELECT id FROM notifications
        WHERE recipient_address = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
  `).run(String(recipientAddress).trim(), String(recipientAddress).trim(), MAX_NOTIFICATIONS_PER_USER);

  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Fetch notifications for a recipient.
 * @param {string} recipientAddress
 * @param {{limit?:number, offset?:number, unreadOnly?:boolean}} opts
 * @returns {{notifications: object[], total: number, unreadCount: number}}
 */
function getNotifications(recipientAddress, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  const addr = String(recipientAddress || '').trim();
  if (!addr) return { notifications: [], total: 0, unreadCount: 0 };

  const where = unreadOnly ? 'WHERE recipient_address = ? AND read = 0' : 'WHERE recipient_address = ?';

  const notifications = db.prepare(`
    SELECT * FROM notifications
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(addr, limit, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM notifications ${where}`).get(addr).c;
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE recipient_address = ? AND read = 0',
  ).get(addr).c;

  return { notifications, total, unreadCount };
}

/**
 * Mark specific notification IDs as read for a recipient.
 * @param {string} recipientAddress
 * @param {number[]} ids
 */
function markRead(recipientAddress, ids) {
  const addr = String(recipientAddress || '').trim();
  if (!addr || !Array.isArray(ids) || ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(', ');
  db.prepare(
    `UPDATE notifications SET read = 1 WHERE recipient_address = ? AND id IN (${placeholders})`,
  ).run(addr, ...ids.map(Number));
}

/**
 * Mark all notifications as read for a recipient.
 * @param {string} recipientAddress
 */
function markAllRead(recipientAddress) {
  const addr = String(recipientAddress || '').trim();
  if (!addr) return;
  db.prepare('UPDATE notifications SET read = 1 WHERE recipient_address = ?').run(addr);
}

/**
 * Delete a notification by ID, scoped to recipient.
 * @param {string} recipientAddress
 * @param {number} id
 */
function deleteNotification(recipientAddress, id) {
  const addr = String(recipientAddress || '').trim();
  if (!addr || !id) return;
  db.prepare('DELETE FROM notifications WHERE id = ? AND recipient_address = ?').run(Number(id), addr);
}

/**
 * Get unread count only — used for fast badge polling.
 * @param {string} recipientAddress
 * @returns {number}
 */
function getUnreadCount(recipientAddress) {
  const addr = String(recipientAddress || '').trim();
  if (!addr) return 0;
  const row = db.prepare(
    'SELECT COUNT(*) as c FROM notifications WHERE recipient_address = ? AND read = 0',
  ).get(addr);
  return row?.c ?? 0;
}

module.exports = {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
};
