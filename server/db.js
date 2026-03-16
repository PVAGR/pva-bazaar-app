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

db.exec(`
  CREATE TABLE IF NOT EXISTS royalty_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artifact_id INTEGER,
    sale_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    sale_price REAL NOT NULL DEFAULT 0,
    royalty_rate REAL NOT NULL DEFAULT 0,
    royalty_amount REAL NOT NULL DEFAULT 0,
    creator_earning_amount REAL NOT NULL DEFAULT 0,
    creator_address TEXT NOT NULL,
    buyer_address TEXT,
    tx_hash TEXT,
    sale_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (artifact_id) REFERENCES artifacts (id)
  );

  CREATE TABLE IF NOT EXISTS creator_earnings (
    creator_address TEXT PRIMARY KEY,
    total_earnings REAL NOT NULL DEFAULT 0,
    total_royalties REAL NOT NULL DEFAULT 0,
    total_primary_sales REAL NOT NULL DEFAULT 0,
    total_secondary_sales REAL NOT NULL DEFAULT 0,
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    last_sale_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS platform_analytics (
    platform TEXT PRIMARY KEY,
    total_volume REAL NOT NULL DEFAULT 0,
    total_royalties REAL NOT NULL DEFAULT 0,
    total_creator_earnings REAL NOT NULL DEFAULT 0,
    total_sales_count INTEGER NOT NULL DEFAULT 0,
    last_sale_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_royalty_events_creator_address
    ON royalty_events (creator_address);
  CREATE INDEX IF NOT EXISTS idx_royalty_events_sale_timestamp
    ON royalty_events (sale_timestamp);
  CREATE INDEX IF NOT EXISTS idx_royalty_events_platform
    ON royalty_events (platform);
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
