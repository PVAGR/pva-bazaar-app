const db = require('./db');

const columns = [
  'ipfs_image_hash TEXT',
  'ipfs_doc_hash TEXT',
  'blockchain_tx_hash TEXT',
  'owner_address TEXT',
  'creator_address TEXT',
  'ebay_sku TEXT',
  'etsy_listing_id TEXT',
  'amazon_sku TEXT',
  'sold_at DATETIME',
  'sale_platform TEXT',
  'sale_price REAL',
];

for (const column of columns) {
  const sql = `ALTER TABLE artifacts ADD COLUMN ${column}`;
  try {
    db.exec(sql);
    console.log(`Added column: ${column}`);
  } catch (error) {
    if (
      String(error.message || '')
        .toLowerCase()
        .includes('duplicate column name')
    ) {
      console.log(`Column already exists: ${column}`);
      continue;
    }
    throw error;
  }
}

console.log('Database migrated successfully');
