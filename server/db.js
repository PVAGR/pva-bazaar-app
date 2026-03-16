const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'artifact_registry.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_hash TEXT UNIQUE NOT NULL,
    perceptual_hash TEXT NOT NULL,
    name TEXT,
    description TEXT,
    image_path TEXT,
    status TEXT DEFAULT 'PENDING',
    blockchain_token_id INTEGER,
    blockchain_tx_hash TEXT,
    creator_address TEXT,
    owner_address TEXT,
    ipfs_image_hash TEXT,
    ipfs_doc_hash TEXT,
    external_platforms TEXT,
    external_listing_ids TEXT,
    external_sync_status TEXT,
    external_sync_updated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// SQLite doesn't support IF NOT EXISTS on ADD COLUMN, so duplicate-column
// errors are expected and safe to ignore in migration backfills.
const migrations = [
  `ALTER TABLE artifacts ADD COLUMN blockchain_tx_hash TEXT`,
  `ALTER TABLE artifacts ADD COLUMN creator_address TEXT`,
  `ALTER TABLE artifacts ADD COLUMN owner_address TEXT`,
  `ALTER TABLE artifacts ADD COLUMN ipfs_image_hash TEXT`,
  `ALTER TABLE artifacts ADD COLUMN ipfs_doc_hash TEXT`,
  `ALTER TABLE artifacts ADD COLUMN ipfs_image_cid TEXT`,
  `ALTER TABLE artifacts ADD COLUMN ipfs_metadata_uri TEXT`,
  `ALTER TABLE artifacts ADD COLUMN ipfs_uploaded_at DATETIME`,
  `ALTER TABLE artifacts ADD COLUMN external_platforms TEXT`,
  `ALTER TABLE artifacts ADD COLUMN external_listing_ids TEXT`,
  `ALTER TABLE artifacts ADD COLUMN external_sync_status TEXT`,
  `ALTER TABLE artifacts ADD COLUMN external_sync_updated_at DATETIME`,
];

for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (_) {
    // column already exists
  }
}

module.exports = db;
