const db = require('./db');

class RoyaltyTracker {
  initializeRoyaltyTables() {
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
    `);
  }

  recordRoyaltyEvent({
    artifactId,
    saleType = 'SECONDARY',
    platform = 'UNKNOWN',
    salePrice = 0,
    royaltyRate,
    creatorAddress,
    buyerAddress = '',
    txHash = '',
    metadata = {},
  }) {
    const normalizedSaleType = String(saleType || 'SECONDARY').toUpperCase();
    const normalizedPlatform = String(platform || 'UNKNOWN').toUpperCase();
    const normalizedCreator = String(creatorAddress || '').trim();
    if (!normalizedCreator) {
      throw new Error('creatorAddress is required');
    }

    const numericSalePrice = Number(salePrice || 0);
    const effectiveRate = Number.isFinite(Number(royaltyRate))
      ? Number(royaltyRate)
      : Number(process.env.DEFAULT_ROYALTY_RATE || 10);

    const royaltyAmount =
      normalizedSaleType === 'SECONDARY' ? (numericSalePrice * effectiveRate) / 100 : 0;

    const creatorEarningAmount =
      normalizedSaleType === 'PRIMARY' ? numericSalePrice : royaltyAmount;

    const stmt = db.prepare(`
      INSERT INTO royalty_events (
        artifact_id,
        sale_type,
        platform,
        sale_price,
        royalty_rate,
        royalty_amount,
        creator_earning_amount,
        creator_address,
        buyer_address,
        tx_hash,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      artifactId ? Number(artifactId) : null,
      normalizedSaleType,
      normalizedPlatform,
      numericSalePrice,
      effectiveRate,
      royaltyAmount,
      creatorEarningAmount,
      normalizedCreator,
      String(buyerAddress || ''),
      String(txHash || ''),
      JSON.stringify(metadata || {}),
    );

    db.prepare(
      `
      INSERT INTO creator_earnings (
        creator_address,
        total_earnings,
        total_royalties,
        total_primary_sales,
        total_secondary_sales,
        total_sales_count,
        last_sale_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(creator_address) DO UPDATE SET
        total_earnings = total_earnings + excluded.total_earnings,
        total_royalties = total_royalties + excluded.total_royalties,
        total_primary_sales = total_primary_sales + excluded.total_primary_sales,
        total_secondary_sales = total_secondary_sales + excluded.total_secondary_sales,
        total_sales_count = total_sales_count + 1,
        last_sale_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `,
    ).run(
      normalizedCreator,
      creatorEarningAmount,
      royaltyAmount,
      normalizedSaleType === 'PRIMARY' ? numericSalePrice : 0,
      normalizedSaleType === 'SECONDARY' ? numericSalePrice : 0,
    );

    db.prepare(
      `
      INSERT INTO platform_analytics (
        platform,
        total_volume,
        total_royalties,
        total_creator_earnings,
        total_sales_count,
        last_sale_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(platform) DO UPDATE SET
        total_volume = total_volume + excluded.total_volume,
        total_royalties = total_royalties + excluded.total_royalties,
        total_creator_earnings = total_creator_earnings + excluded.total_creator_earnings,
        total_sales_count = total_sales_count + 1,
        last_sale_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `,
    ).run(normalizedPlatform, numericSalePrice, royaltyAmount, creatorEarningAmount);

    return {
      eventId: info.lastInsertRowid,
      saleType: normalizedSaleType,
      platform: normalizedPlatform,
      salePrice: numericSalePrice,
      royaltyRate: effectiveRate,
      royaltyAmount,
      creatorEarningAmount,
      creatorAddress: normalizedCreator,
    };
  }

  getCreatorDashboard(creatorAddress, { days = 365 } = {}) {
    const normalizedCreator = String(creatorAddress || '').trim();
    if (!normalizedCreator) {
      throw new Error('creatorAddress is required');
    }

    const timeFilter = Number(days || 365);

    const summary = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(creator_earning_amount), 0) AS total_earnings,
        COALESCE(SUM(royalty_amount), 0) AS total_royalties,
        COALESCE(SUM(CASE WHEN sale_type = 'PRIMARY' THEN sale_price ELSE 0 END), 0) AS primary_sales_volume,
        COALESCE(SUM(CASE WHEN sale_type = 'SECONDARY' THEN sale_price ELSE 0 END), 0) AS secondary_sales_volume,
        COALESCE(COUNT(*), 0) AS total_sales_count,
        COALESCE(SUM(sale_price), 0) AS total_sales_volume
      FROM royalty_events
      WHERE creator_address = ?
        AND sale_timestamp >= datetime('now', ?)
    `,
      )
      .get(normalizedCreator, `-${timeFilter} days`);

    const platformBreakdown = db
      .prepare(
        `
      SELECT
        platform,
        COUNT(*) AS sales_count,
        COALESCE(SUM(sale_price), 0) AS sales_volume,
        COALESCE(SUM(royalty_amount), 0) AS royalties,
        COALESCE(SUM(creator_earning_amount), 0) AS creator_earnings
      FROM royalty_events
      WHERE creator_address = ?
        AND sale_timestamp >= datetime('now', ?)
      GROUP BY platform
      ORDER BY sales_volume DESC
    `,
      )
      .all(normalizedCreator, `-${timeFilter} days`);

    const monthlyTrend = db
      .prepare(
        `
      SELECT
        strftime('%Y-%m', sale_timestamp) AS month,
        COUNT(*) AS sales_count,
        COALESCE(SUM(sale_price), 0) AS sales_volume,
        COALESCE(SUM(royalty_amount), 0) AS royalties,
        COALESCE(SUM(creator_earning_amount), 0) AS creator_earnings
      FROM royalty_events
      WHERE creator_address = ?
        AND sale_timestamp >= datetime('now', ?)
      GROUP BY strftime('%Y-%m', sale_timestamp)
      ORDER BY month ASC
    `,
      )
      .all(normalizedCreator, `-${timeFilter} days`);

    const recentEvents = db
      .prepare(
        `
      SELECT
        id,
        artifact_id,
        sale_type,
        platform,
        sale_price,
        royalty_rate,
        royalty_amount,
        creator_earning_amount,
        buyer_address,
        tx_hash,
        sale_timestamp
      FROM royalty_events
      WHERE creator_address = ?
      ORDER BY sale_timestamp DESC
      LIMIT 15
    `,
      )
      .all(normalizedCreator);

    return {
      creatorAddress: normalizedCreator,
      periodDays: timeFilter,
      summary,
      platformBreakdown,
      monthlyTrend,
      recentEvents,
    };
  }

  getRoyaltyHistory(creatorAddress, { limit = 100, offset = 0 } = {}) {
    const normalizedCreator = String(creatorAddress || '').trim();
    if (!normalizedCreator) {
      throw new Error('creatorAddress is required');
    }

    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);
    const safeOffset = Math.max(Number(offset || 0), 0);

    const events = db
      .prepare(
        `
      SELECT
        id,
        artifact_id,
        sale_type,
        platform,
        sale_price,
        royalty_rate,
        royalty_amount,
        creator_earning_amount,
        creator_address,
        buyer_address,
        tx_hash,
        sale_timestamp,
        metadata
      FROM royalty_events
      WHERE creator_address = ?
      ORDER BY sale_timestamp DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(normalizedCreator, safeLimit, safeOffset);

    const total = db
      .prepare('SELECT COUNT(*) AS count FROM royalty_events WHERE creator_address = ?')
      .get(normalizedCreator);

    return {
      creatorAddress: normalizedCreator,
      total: Number(total?.count || 0),
      limit: safeLimit,
      offset: safeOffset,
      events,
    };
  }

  getAllEvents({ limit = 200, offset = 0, platform = '' } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit || 200), 1), 1000);
    const safeOffset = Math.max(Number(offset || 0), 0);
    const normalizedPlatform = String(platform || '')
      .trim()
      .toUpperCase();

    const whereClause = normalizedPlatform ? 'WHERE platform = ?' : '';
    const events = normalizedPlatform
      ? db
          .prepare(
            `
          SELECT *
          FROM royalty_events
          ${whereClause}
          ORDER BY sale_timestamp DESC
          LIMIT ? OFFSET ?
        `,
          )
          .all(normalizedPlatform, safeLimit, safeOffset)
      : db
          .prepare(
            `
          SELECT *
          FROM royalty_events
          ORDER BY sale_timestamp DESC
          LIMIT ? OFFSET ?
        `,
          )
          .all(safeLimit, safeOffset);

    const total = normalizedPlatform
      ? db
          .prepare('SELECT COUNT(*) AS count FROM royalty_events WHERE platform = ?')
          .get(normalizedPlatform)
      : db.prepare('SELECT COUNT(*) AS count FROM royalty_events').get();

    return {
      total: Number(total?.count || 0),
      limit: safeLimit,
      offset: safeOffset,
      platform: normalizedPlatform || null,
      events,
    };
  }

  exportCreatorCsv(creatorAddress) {
    const history = this.getRoyaltyHistory(creatorAddress, { limit: 1000, offset: 0 });
    const headers = [
      'event_id',
      'artifact_id',
      'sale_type',
      'platform',
      'sale_price',
      'royalty_rate',
      'royalty_amount',
      'creator_earning_amount',
      'creator_address',
      'buyer_address',
      'tx_hash',
      'sale_timestamp',
    ];

    const csvRows = [headers.join(',')];
    for (const row of history.events) {
      const values = [
        row.id,
        row.artifact_id,
        row.sale_type,
        row.platform,
        row.sale_price,
        row.royalty_rate,
        row.royalty_amount,
        row.creator_earning_amount,
        row.creator_address,
        row.buyer_address,
        row.tx_hash,
        row.sale_timestamp,
      ].map((value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });

      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

module.exports = new RoyaltyTracker();
