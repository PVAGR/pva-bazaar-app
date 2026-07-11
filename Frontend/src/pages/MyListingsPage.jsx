import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SellerQuickStats from '../components/SellerQuickStats.jsx';
import {
  fetchMyMarketplaceItems,
  fetchOmnichannelSaleHistory,
  fetchOmnichannelStatus,
  markListingSoldManually,
  retryMarketplaceSyndication,
  saveOmnichannelListings,
} from '../lib/api';
import './MyListingsPage.css';

const NEEDS_ATTENTION_STATUSES = new Set(['failed', 'manual_required']);
const OMNICHANNEL_CHANNELS = ['ebay', 'etsy', 'amazon', 'facebook', 'shopify'];
const RECEIPT_FILTERS = ['all', 'minted', 'failed', 'pending', 'skipped'];

function normalizeChannelDraft(channel, source = {}) {
  return {
    channel,
    externalListingId: source.externalListingId || '',
    externalUrl: source.externalUrl || '',
    syncMode: source.syncMode || 'manual',
    status: source.status || 'listed',
    lastSyncMessage: source.lastSyncMessage || '',
  };
}

function buildDraftFromStatus(statusPayload) {
  const existing = Array.isArray(statusPayload?.channels) ? statusPayload.channels : [];
  return OMNICHANNEL_CHANNELS.map((channel) => {
    const match = existing.find((entry) => entry.channel === channel);
    return normalizeChannelDraft(channel, match);
  });
}

function formatMoney(priceCents, currency = 'USD') {
  const amount = Number(priceCents || 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_) {
    return `$${amount.toFixed(2)}`;
  }
}

function normalizeNetworkName(network = '') {
  const raw = String(network || '').trim();
  if (!raw) return 'unknown';
  return raw.replace(/[_-]+/g, ' ');
}

function txExplorerUrlForSale(sale) {
  const txHash = String(sale?.blockchainReceipt?.txHash || '').trim();
  if (!txHash) return '';

  const network = String(sale?.blockchainReceipt?.network || '').toLowerCase();
  if (network.includes('base-sepolia') || network.includes('basesepolia')) {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
  if (network.includes('base')) {
    return `https://basescan.org/tx/${txHash}`;
  }
  if (network.includes('sepolia')) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (network.includes('polygon')) {
    return `https://polygonscan.com/tx/${txHash}`;
  }
  if (network.includes('ethereum') || network.includes('mainnet')) {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return '';
}

function tokenExplorerUrlForSale(sale) {
  const tokenId = String(sale?.blockchainReceipt?.tokenId || '').trim();
  const contractAddress = String(sale?.blockchainReceipt?.contractAddress || '').trim();
  if (!tokenId || !contractAddress) return '';

  const network = String(sale?.blockchainReceipt?.network || '').toLowerCase();
  if (network.includes('base-sepolia') || network.includes('basesepolia')) {
    return `https://sepolia.basescan.org/token/${contractAddress}?a=${encodeURIComponent(tokenId)}`;
  }
  if (network.includes('base')) {
    return `https://basescan.org/token/${contractAddress}?a=${encodeURIComponent(tokenId)}`;
  }
  if (network.includes('sepolia')) {
    return `https://sepolia.etherscan.io/token/${contractAddress}?a=${encodeURIComponent(tokenId)}`;
  }
  if (network.includes('polygon')) {
    return `https://polygonscan.com/token/${contractAddress}?a=${encodeURIComponent(tokenId)}`;
  }
  if (network.includes('ethereum') || network.includes('mainnet')) {
    return `https://etherscan.io/token/${contractAddress}?a=${encodeURIComponent(tokenId)}`;
  }
  return '';
}

function formatRelativeTime(inputDate) {
  if (!inputDate) return 'unknown time';
  const at = new Date(inputDate);
  if (Number.isNaN(at.getTime())) return 'unknown time';

  const diffMs = at.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute');
  }
  if (abs < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour');
  }
  return rtf.format(Math.round(diffMs / day), 'day');
}

function matchesReceiptFilter(sale, filter) {
  if (filter === 'all') return true;
  const status = String(sale?.blockchainReceipt?.status || 'skipped').toLowerCase();
  return status === filter;
}

export default function MyListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [retryingKey, setRetryingKey] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [omniDrafts, setOmniDrafts] = useState({});
  const [omniStatus, setOmniStatus] = useState({});
  const [omniLoading, setOmniLoading] = useState({});
  const [salesLoading, setSalesLoading] = useState({});
  const [omniSaving, setOmniSaving] = useState({});
  const [manualSoldSaving, setManualSoldSaving] = useState({});
  const [omniError, setOmniError] = useState({});
  const [omniSaved, setOmniSaved] = useState({});
  const [manualSoldDrafts, setManualSoldDrafts] = useState({});
  const [itemSales, setItemSales] = useState({});
  const [receiptFilters, setReceiptFilters] = useState({});
  const [copiedValueByItem, setCopiedValueByItem] = useState({});
  const filter = searchParams.get('filter') === 'attention' ? 'attention' : 'all';

  async function loadItems() {
    setLoading(true);
    setError('');
    const result = await fetchMyMarketplaceItems();
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Failed to load your listings');
      return;
    }
    setItems(result.items || []);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const summary = useMemo(() => {
    let attention = 0;
    for (const item of items) {
      const jobs = item?.syndication?.jobs || [];
      if (jobs.some((job) => NEEDS_ATTENTION_STATUSES.has(job.status))) {
        attention += 1;
      }
    }
    return {
      total: items.length,
      needsAttention: attention,
    };
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter !== 'attention') return items;
    return items.filter((item) => {
      const jobs = item?.syndication?.jobs || [];
      return jobs.some((job) => NEEDS_ATTENTION_STATUSES.has(job.status));
    });
  }, [items, filter]);

  function setFilter(nextFilter) {
    if (nextFilter === 'attention') {
      setSearchParams({ filter: 'attention' });
      return;
    }
    setSearchParams({});
  }

  async function retryChannelsForItem(itemId, channels, key) {
    if (!itemId || !channels?.length) return;
    setRetryingKey(key);
    setError('');
    const retry = await retryMarketplaceSyndication(itemId, channels);
    setRetryingKey('');
    if (!retry.ok) {
      setError(retry.error || 'Retry failed');
      return;
    }
    await loadItems();
  }

  async function loadOmnichannelForItem(itemId) {
    if (!itemId) return;
    setOmniLoading((prev) => ({ ...prev, [itemId]: true }));
    setOmniError((prev) => ({ ...prev, [itemId]: '' }));
    setOmniSaved((prev) => ({ ...prev, [itemId]: '' }));

    const result = await fetchOmnichannelStatus(itemId);
    setOmniLoading((prev) => ({ ...prev, [itemId]: false }));
    if (!result.ok) {
      setOmniError((prev) => ({ ...prev, [itemId]: result.error || 'Failed to load omnichannel status' }));
      return;
    }

    setOmniStatus((prev) => ({
      ...prev,
      [itemId]: {
        soldState: result.soldState || { isSold: false },
        lastSyncAt: result.lastSyncAt || null,
      },
    }));
    setOmniDrafts((prev) => ({
      ...prev,
      [itemId]: buildDraftFromStatus(result),
    }));

    setSalesLoading((prev) => ({ ...prev, [itemId]: true }));
    const salesResult = await fetchOmnichannelSaleHistory(itemId, { limit: 5 });
    setSalesLoading((prev) => ({ ...prev, [itemId]: false }));
    if (salesResult.ok) {
      setItemSales((prev) => ({ ...prev, [itemId]: salesResult.sales || [] }));
    }
  }

  function updateOmniDraft(itemId, channel, field, value) {
    setOmniDrafts((prev) => {
      const current = Array.isArray(prev[itemId]) ? prev[itemId] : OMNICHANNEL_CHANNELS.map((name) => normalizeChannelDraft(name));
      const next = current.map((entry) => {
        if (entry.channel !== channel) return entry;
        return {
          ...entry,
          [field]: value,
        };
      });
      return {
        ...prev,
        [itemId]: next,
      };
    });
  }

  async function saveOmnichannelForItem(itemId) {
    const draft = Array.isArray(omniDrafts[itemId]) ? omniDrafts[itemId] : [];
    const payloadChannels = draft.filter((entry) => String(entry.externalListingId || '').trim().length > 0);
    setOmniSaving((prev) => ({ ...prev, [itemId]: true }));
    setOmniError((prev) => ({ ...prev, [itemId]: '' }));
    setOmniSaved((prev) => ({ ...prev, [itemId]: '' }));

    const result = await saveOmnichannelListings(itemId, payloadChannels);
    setOmniSaving((prev) => ({ ...prev, [itemId]: false }));

    if (!result.ok) {
      setOmniError((prev) => ({ ...prev, [itemId]: result.error || 'Failed to save omnichannel mappings' }));
      return;
    }

    setOmniSaved((prev) => ({ ...prev, [itemId]: result.message || 'Saved' }));
    await loadOmnichannelForItem(itemId);
    await loadItems();
  }

  function updateManualSoldDraft(itemId, patch) {
    setManualSoldDrafts((prev) => ({
      ...prev,
      [itemId]: {
        saleSource: 'manual',
        paymentMethod: 'manual',
        externalSaleId: '',
        buyerWallet: '',
        ...prev[itemId],
        ...patch,
      },
    }));
  }

  async function markSoldForItem(item) {
    if (!item?.id) return;
    const itemId = item.id;
    const draft = manualSoldDrafts[itemId] || {};
    setManualSoldSaving((prev) => ({ ...prev, [itemId]: true }));
    setOmniError((prev) => ({ ...prev, [itemId]: '' }));
    setOmniSaved((prev) => ({ ...prev, [itemId]: '' }));

    const result = await markListingSoldManually(itemId, {
      saleSource: draft.saleSource || 'manual',
      paymentMethod: draft.paymentMethod || 'manual',
      externalSaleId: draft.externalSaleId || '',
      buyerWallet: draft.buyerWallet || '',
      amountCents: Number(item.priceCents || 0),
      currency: String(item.currency || 'usd').toLowerCase(),
    });

    setManualSoldSaving((prev) => ({ ...prev, [itemId]: false }));
    if (!result.ok) {
      setOmniError((prev) => ({ ...prev, [itemId]: result.error || 'Failed to mark listing sold' }));
      return;
    }

    setOmniSaved((prev) => ({
      ...prev,
      [itemId]: result.alreadySold
        ? 'Listing was already sold. Sync state refreshed.'
        : 'Listing marked sold and sync triggered.',
    }));

    await loadOmnichannelForItem(itemId);
    await loadItems();
  }

  function setReceiptFilter(itemId, nextFilter) {
    setReceiptFilters((prev) => ({ ...prev, [itemId]: nextFilter }));
  }

  async function copyReceiptValue(itemId, value) {
    const next = String(value || '');
    if (!next) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(next);
      }
      setCopiedValueByItem((prev) => ({ ...prev, [itemId]: next }));
      setTimeout(() => {
        setCopiedValueByItem((prev) => {
          if (prev[itemId] !== next) return prev;
          return { ...prev, [itemId]: '' };
        });
      }, 1600);
    } catch (_) {
    }
  }

  return (
    <main className="my-listings-page">
      <header className="my-listings-header">
        <h1>My Listings</h1>
        <p>Manage your submitted listings and re-run marketplace syndication where needed.</p>
      </header>

      <SellerQuickStats
        stats={{
          total: items.length,
          published: items.filter(item => item.status === 'published' || item.status === 'active').length,
          needsAttention: items.filter(item => {
            const jobs = item?.syndication?.jobs || [];
            return jobs.some(job => NEEDS_ATTENTION_STATUSES.has(job.status));
          }).length,
          withSyndication: items.filter(item => {
            const jobs = item?.syndication?.jobs || [];
            return jobs.length > 0;
          }).length,
          loading,
        }}
      />

      <section className="my-listings-actions">
        <Link className="btn primary" to="/items/new">
          + Create New Listing
        </Link>
        <Link className="btn ghost" to="/marketplace">
          Browse Marketplace
        </Link>
      </section>

      <section className="my-listings-filters" aria-label="Listing filters">
        <button
          type="button"
          className={`btn ghost ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Listings
        </button>
        <button
          type="button"
          className={`btn ghost ${filter === 'attention' ? 'is-active' : ''}`}
          onClick={() => setFilter('attention')}
        >
          Needs Attention
        </button>
      </section>

      <section className="my-listings-summary">
        <div className="summary-card">
          <span>Total listings</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="summary-card warning">
          <span>Need syndication attention</span>
          <strong>{summary.needsAttention}</strong>
        </div>
      </section>

      {loading ? <div className="listings-note">Loading your listings...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="listings-note">
          You have not created any listings yet. <Link to="/items/new">Create your first listing</Link>.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 && visibleItems.length === 0 ? (
        <div className="listings-note">No listings currently match this filter.</div>
      ) : null}

      <section className="my-listings-grid">
        {visibleItems.map((item) => {
          const jobs = item?.syndication?.jobs || [];
          const retryableChannels = jobs
            .filter((job) => NEEDS_ATTENTION_STATUSES.has(job.status))
            .map((job) => job.channel);
          const receiptFilter = receiptFilters[item.id] || 'all';
          const salesForItem = Array.isArray(itemSales[item.id]) ? itemSales[item.id] : null;
          const visibleSalesForItem = Array.isArray(salesForItem)
            ? salesForItem.filter((sale) => matchesReceiptFilter(sale, receiptFilter))
            : null;

          return (
            <article key={item.id} className="listing-card">
              <div className="listing-card-top">
                <div>
                  <h2>{item.name || 'Untitled item'}</h2>
                  <p>{item.category || 'Uncategorized'} • {formatMoney(item.priceCents, item.currency)}</p>
                </div>
                <span className={`listing-status is-${item.status || 'draft'}`}>{item.status || 'draft'}</span>
              </div>

              <div className="listing-links">
                <Link to={`/marketplace/${encodeURIComponent(item.slug || item.id)}`}>Open listing</Link>
                <Link to={`/items/manage/${encodeURIComponent(item.id)}`}>Manage listing</Link>
              </div>

              <div className="omni-block">
                <div className="omni-block-header">
                  <h3>Omnichannel Sync</h3>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => loadOmnichannelForItem(item.id)}
                    disabled={!!omniLoading[item.id]}
                  >
                    {omniLoading[item.id] ? 'Loading...' : 'Load / Refresh'}
                  </button>
                </div>

                <p className="muted">
                  Sold state: {omniStatus[item.id]?.soldState?.isSold ? 'Sold' : 'Available'}
                  {omniStatus[item.id]?.soldState?.soldSource ? ` via ${omniStatus[item.id].soldState.soldSource}` : ''}
                </p>
                <p className="muted">
                  Steward: {item?.stewardship?.currentHolderName || 'unassigned'}
                  {item?.stewardship?.currentHolderRole ? ` (${item.stewardship.currentHolderRole})` : ''}
                </p>
                {(item?.stewardship?.accessCode || item?.stewardship?.accessCodeHint) ? (
                  <p className="muted">
                    Access code: <strong>{item?.stewardship?.accessCodeHint || 'saved'}</strong>{' '}
                    {item?.stewardship?.accessCode ? (
                      <button
                        type="button"
                        className="receipt-copy-btn"
                        onClick={() => copyReceiptValue(item.id, item.stewardship.accessCode)}
                      >
                        {copiedValueByItem[item.id] === item.stewardship.accessCode ? 'Copied' : 'Copy code'}
                      </button>
                    ) : null}
                  </p>
                ) : null}

                {Array.isArray(omniDrafts[item.id]) ? (
                  <div className="omni-channels-grid">
                    {omniDrafts[item.id].map((entry) => (
                      <div key={`${item.id}-omni-${entry.channel}`} className="omni-channel-row">
                        <div className="omni-channel-title">{entry.channel}</div>
                        <input
                          type="text"
                          value={entry.externalListingId}
                          onChange={(e) => updateOmniDraft(item.id, entry.channel, 'externalListingId', e.target.value)}
                          placeholder="External Listing ID"
                        />
                        <input
                          type="url"
                          value={entry.externalUrl}
                          onChange={(e) => updateOmniDraft(item.id, entry.channel, 'externalUrl', e.target.value)}
                          placeholder="External Listing URL"
                        />
                        <select
                          value={entry.syncMode}
                          onChange={(e) => updateOmniDraft(item.id, entry.channel, 'syncMode', e.target.value)}
                        >
                          <option value="manual">Manual</option>
                          <option value="webhook">Webhook</option>
                          <option value="polling">Polling</option>
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Load this item's omnichannel profile to configure external listing mappings.</p>
                )}

                {omniError[item.id] ? <p className="form-error">{omniError[item.id]}</p> : null}
                {omniSaved[item.id] ? <p className="form-success">{omniSaved[item.id]}</p> : null}

                {Array.isArray(omniDrafts[item.id]) ? (
                  <div className="omni-actions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => saveOmnichannelForItem(item.id)}
                      disabled={!!omniSaving[item.id]}
                    >
                      {omniSaving[item.id] ? 'Saving...' : 'Save Omnichannel Mappings'}
                    </button>
                  </div>
                ) : null}

                <div className="manual-sold-block">
                  <h4>Manual Sold Action</h4>
                  <p className="muted">Use this when sale happened off-platform and you need immediate delist + receipt sync.</p>
                  <div className="manual-sold-grid">
                    <select
                      value={manualSoldDrafts[item.id]?.saleSource || 'manual'}
                      onChange={(e) => updateManualSoldDraft(item.id, { saleSource: e.target.value })}
                    >
                      <option value="manual">manual</option>
                      <option value="ebay">ebay</option>
                      <option value="etsy">etsy</option>
                      <option value="amazon">amazon</option>
                      <option value="facebook">facebook</option>
                      <option value="shopify">shopify</option>
                    </select>
                    <select
                      value={manualSoldDrafts[item.id]?.paymentMethod || 'manual'}
                      onChange={(e) => updateManualSoldDraft(item.id, { paymentMethod: e.target.value })}
                    >
                      <option value="manual">manual</option>
                      <option value="card">card</option>
                      <option value="crypto">crypto</option>
                    </select>
                    <input
                      type="text"
                      placeholder="External Sale ID"
                      value={manualSoldDrafts[item.id]?.externalSaleId || ''}
                      onChange={(e) => updateManualSoldDraft(item.id, { externalSaleId: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Buyer Wallet (optional)"
                      value={manualSoldDrafts[item.id]?.buyerWallet || ''}
                      onChange={(e) => updateManualSoldDraft(item.id, { buyerWallet: e.target.value })}
                    />
                  </div>
                  <div className="omni-actions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => markSoldForItem(item)}
                      disabled={!!manualSoldSaving[item.id]}
                    >
                      {manualSoldSaving[item.id] ? 'Marking Sold...' : 'Mark Sold + Sync'}
                    </button>
                  </div>
                </div>

                <div className="receipt-history-block">
                  <div className="receipt-history-header">
                    <h4>Recent Sale Receipts</h4>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => loadOmnichannelForItem(item.id)}
                      disabled={!!salesLoading[item.id] || !!omniLoading[item.id]}
                    >
                      {(salesLoading[item.id] || omniLoading[item.id]) ? 'Refreshing...' : 'Refresh Receipts'}
                    </button>
                  </div>

                  <div className="receipt-filter-row" role="group" aria-label="Receipt status filter">
                    {RECEIPT_FILTERS.map((receiptStatus) => (
                      <button
                        key={`${item.id}-receipt-filter-${receiptStatus}`}
                        type="button"
                        className={`receipt-filter-btn ${receiptFilter === receiptStatus ? 'is-active' : ''}`}
                        onClick={() => setReceiptFilter(item.id, receiptStatus)}
                        disabled={!Array.isArray(itemSales[item.id])}
                      >
                        {receiptStatus}
                      </button>
                    ))}
                  </div>

                  {!Array.isArray(itemSales[item.id]) ? (
                    <p className="muted">Load omnichannel data to view receipt history.</p>
                  ) : itemSales[item.id].length === 0 ? (
                    <p className="muted">No sale receipts recorded for this listing yet.</p>
                  ) : !visibleSalesForItem?.length ? (
                    <p className="muted">No receipts match the selected filter.</p>
                  ) : (
                    <div className="receipt-history-list">
                      {visibleSalesForItem.map((sale) => (
                        <div key={`${item.id}-sale-${sale._id}`} className="receipt-history-row">
                          <span className="receipt-source">{sale.saleSource || 'unknown'}</span>
                          <span className={`receipt-status is-${sale.blockchainReceipt?.status || 'skipped'}`}>
                            {sale.blockchainReceipt?.status || 'skipped'}
                          </span>
                          <span className="receipt-meta">
                            <span className="receipt-badge">{normalizeNetworkName(sale.blockchainReceipt?.network)}</span>
                            {sale.blockchainReceipt?.txHash ? (
                              txExplorerUrlForSale(sale) ? (
                                <a
                                  className="receipt-link"
                                  href={txExplorerUrlForSale(sale)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  tx {sale.blockchainReceipt.txHash.slice(0, 10)}...
                                </a>
                              ) : (
                                <span>tx {sale.blockchainReceipt.txHash.slice(0, 10)}...</span>
                              )
                            ) : (
                              <span>no tx</span>
                            )}
                            {sale.blockchainReceipt?.txHash ? (
                              <button
                                type="button"
                                className="receipt-copy-btn"
                                onClick={() => copyReceiptValue(item.id, sale.blockchainReceipt.txHash)}
                              >
                                {copiedValueByItem[item.id] === sale.blockchainReceipt.txHash ? 'Copied' : 'Copy'}
                              </button>
                            ) : null}
                          </span>
                          <span className="receipt-meta">
                            {sale.blockchainReceipt?.tokenId ? (
                              tokenExplorerUrlForSale(sale) ? (
                                <a
                                  className="receipt-link"
                                  href={tokenExplorerUrlForSale(sale)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  token #{sale.blockchainReceipt.tokenId}
                                </a>
                              ) : (
                                <span>token #{sale.blockchainReceipt.tokenId}</span>
                              )
                            ) : (
                              <span>no token</span>
                            )}
                            {sale.blockchainReceipt?.tokenId ? (
                              <button
                                type="button"
                                className="receipt-copy-btn"
                                onClick={() => copyReceiptValue(item.id, String(sale.blockchainReceipt.tokenId))}
                              >
                                {copiedValueByItem[item.id] === String(sale.blockchainReceipt.tokenId) ? 'Copied' : 'Copy'}
                              </button>
                            ) : null}
                          </span>
                          <span className="receipt-time" title={sale.createdAt || ''}>
                            {formatRelativeTime(sale.createdAt)}
                          </span>
                          {sale.royaltySettlement?.amountCents > 0 ? (
                            <span className="receipt-royalty" title="Perpetual split recorded for this sale">
                              creator {formatMoney(sale.royaltySettlement.creatorRoyaltyCents, sale.royaltySettlement.currency)}
                              {' '}| pva {formatMoney(sale.royaltySettlement.platformFeeCents, sale.royaltySettlement.currency)}
                            </span>
                          ) : null}
                          {(sale.blockchainReceipt?.status === 'failed' && sale.blockchainReceipt?.failureReason) ? (
                            <span className="receipt-failure" title={sale.blockchainReceipt.failureReason}>
                              {sale.blockchainReceipt.failureReason}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="syndication-block">
                <h3>Syndication</h3>
                {!jobs.length ? <p className="muted">No syndication requested for this listing.</p> : null}
                {jobs.map((job) => (
                  <div key={`${item.id}-${job.channel}`} className="job-row">
                    <span className="job-channel">{job.channel}</span>
                    <span className={`job-status is-${job.status}`}>{job.status}</span>
                    <span className="job-message">{job.message || 'No details'}</span>
                    <div className="job-actions">
                      {job.externalUrl ? (
                        <a className="btn ghost" href={job.externalUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : null}
                      {NEEDS_ATTENTION_STATUSES.has(job.status) ? (
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => retryChannelsForItem(item.id, [job.channel], `${item.id}-${job.channel}`)}
                          disabled={retryingKey === `${item.id}-${job.channel}`}
                        >
                          {retryingKey === `${item.id}-${job.channel}` ? 'Retrying...' : 'Retry'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {retryableChannels.length ? (
                <div className="listing-footer-actions">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => retryChannelsForItem(item.id, retryableChannels, `${item.id}-all`)}
                    disabled={retryingKey === `${item.id}-all`}
                  >
                    {retryingKey === `${item.id}-all` ? 'Retrying...' : 'Retry All Failed Channels'}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
