// backend/lib/cursor.js
// Cursor encode/decode helpers for Archive pagination

function encodeCursor(cursorObj) {
  return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
}

function decodeCursor(cursorStr) {
  try {
    return JSON.parse(Buffer.from(cursorStr, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = { encodeCursor, decodeCursor };
