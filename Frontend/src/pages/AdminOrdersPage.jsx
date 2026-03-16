import React, { useEffect, useState, useRef } from "react";
import {
  fetchOrders,
  fetchOrder,
  refundOrder,
  updateOrder,
  fetchOmnichannelOpsSnapshot,
  fetchProvenanceOpsSnapshot,
  fetchItemProvenanceVerification,
  updateItemProvenanceReview,
  triggerOmnichannelPollingRun,
} from "../lib/api";
import "./AdminOrdersPage.css";

function formatDate(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleString();
}
function formatCents(c, cur) {
  if (typeof c !== "number") return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "USD" }).format(c / 100);
}

const REASONS = [
  { value: "", label: "No reason" },
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "duplicate", label: "Duplicate" },
  { value: "fraudulent", label: "Fraudulent" },
  { value: "other", label: "Other" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [edit, setEdit] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [pollRunLoading, setPollRunLoading] = useState(false);
  const [reviewingByItem, setReviewingByItem] = useState({});
  const [verifyingByItem, setVerifyingByItem] = useState({});
  const [verifyResultsByItem, setVerifyResultsByItem] = useState({});
  const [opsSnapshot, setOpsSnapshot] = useState({
    summary: {},
    sales: [],
    pendingCryptoOrders: [],
  });
  const [provenanceOpsSnapshot, setProvenanceOpsSnapshot] = useState({
    summary: {},
    duplicateFingerprintRows: [],
    recentReverseImageRisks: [],
    recentRoyaltySales: [],
    recentReviewLogs: [],
  });
  const abortRef = useRef();

  useEffect(() => {
    loadOrders(true);
    loadOpsSnapshot();
    // eslint-disable-next-line
  }, []);

  async function loadOpsSnapshot() {
    setOpsLoading(true);
    try {
      const [omniRes, provenanceRes] = await Promise.all([
        fetchOmnichannelOpsSnapshot({ limit: 15 }),
        fetchProvenanceOpsSnapshot({ limit: 15 }),
      ]);

      if (omniRes.ok) {
        setOpsSnapshot({
          summary: omniRes.summary || {},
          sales: Array.isArray(omniRes.sales) ? omniRes.sales : [],
          pendingCryptoOrders: Array.isArray(omniRes.pendingCryptoOrders) ? omniRes.pendingCryptoOrders : [],
        });
      }

      if (provenanceRes.ok) {
        setProvenanceOpsSnapshot({
          summary: provenanceRes.summary || {},
          duplicateFingerprintRows: Array.isArray(provenanceRes.duplicateFingerprintRows)
            ? provenanceRes.duplicateFingerprintRows
            : [],
          recentReverseImageRisks: Array.isArray(provenanceRes.recentReverseImageRisks)
            ? provenanceRes.recentReverseImageRisks
            : [],
          recentRoyaltySales: Array.isArray(provenanceRes.recentRoyaltySales)
            ? provenanceRes.recentRoyaltySales
            : [],
          recentReviewLogs: Array.isArray(provenanceRes.recentReviewLogs)
            ? provenanceRes.recentReviewLogs
            : [],
        });
      }
    } finally {
      setOpsLoading(false);
    }
  }

  async function runPollingNow() {
    setPollRunLoading(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const res = await triggerOmnichannelPollingRun({ limit: 50 });
      if (!res.ok) {
        setErrorMsg(res.error || "Polling run failed");
        return;
      }
      setStatusMsg(
        `Polling sync completed. Checked ${res.summary?.checkedListings || 0} listing(s), detected ${res.summary?.soldDetected || 0} sold listing(s).`
      );
      await loadOpsSnapshot();
      await loadOrders(true);
    } finally {
      setPollRunLoading(false);
    }
  }

  async function handleProvenanceReview(itemId, verificationStatus) {
    if (!itemId || !verificationStatus) return;
    const note = window.prompt(
      verificationStatus === 'flagged'
        ? 'Optional reviewer note for flagged provenance:'
        : 'Optional reviewer note for clearing provenance risk:',
      ''
    );

    setReviewingByItem((prev) => ({ ...prev, [itemId]: true }));
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await updateItemProvenanceReview(itemId, {
        verificationStatus,
        reviewNotes: note || '',
      });
      if (!res.ok) {
        setErrorMsg(res.error || 'Failed to update provenance review');
        return;
      }
      setStatusMsg(`Provenance status updated to ${verificationStatus}.`);
      await loadOpsSnapshot();
    } finally {
      setReviewingByItem((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleQuickVerify(itemId) {
    if (!itemId) return;
    setVerifyingByItem((prev) => ({ ...prev, [itemId]: true }));
    try {
      const res = await fetchItemProvenanceVerification(itemId, { live: false });
      if (!res.ok) {
        setVerifyResultsByItem((prev) => ({
          ...prev,
          [itemId]: { ok: false, error: res.error || 'Verification failed' },
        }));
        return;
      }
      const verify = res.verification || {};
      setVerifyResultsByItem((prev) => ({
        ...prev,
        [itemId]: {
          ok: true,
          verdict: verify.verdict || 'partial',
          signatureValid: Boolean(verify.signatureValid),
          blockchainConsistent: Boolean(verify?.chain?.blockchainConsistent),
          checkedAt: verify.verifiedAt || new Date().toISOString(),
        },
      }));
    } finally {
      setVerifyingByItem((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function loadOrders(reset = false) {
    setLoading(true);
    setErrorMsg("");
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetchOrders({ limit: 25, cursor: reset ? null : nextCursor, signal: controller.signal });
      if (res.ok) {
        setOrders(reset ? res.items : prev => [...prev, ...res.items]);
        setNextCursor(res.nextCursor);
      } else {
        setErrorMsg(res.error || "Failed to load orders");
      }
    } catch (e) {
      if (e.name !== "AbortError") setErrorMsg(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function openOrderDetail(id) {
    setSelectedOrderId(id);
    setOrderDetail(null);
    setDetailLoading(true);
    setStatusMsg("");
    setErrorMsg("");
    setEdit({});
    try {
      const res = await fetchOrder(id);
      if (res.ok) setOrderDetail(res.item);
      else setErrorMsg(res.error || "Failed to load order");
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setDetailLoading(false);
    }
  }
  function isDirty() {
    if (!orderDetail) return false;
    return (
      edit.fulfillmentStatus && edit.fulfillmentStatus !== orderDetail.fulfillmentStatus ||
      (typeof edit.adminNotes === "string" && edit.adminNotes !== orderDetail.adminNotes) ||
      (typeof edit.trackingNumber === "string" && edit.trackingNumber !== orderDetail.trackingNumber) ||
      (typeof edit.carrier === "string" && edit.carrier !== orderDetail.carrier)
    );
  }

  async function handleSave() {
    setSaveLoading(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      const patch = {};
      if (edit.fulfillmentStatus && edit.fulfillmentStatus !== orderDetail.fulfillmentStatus) patch.fulfillmentStatus = edit.fulfillmentStatus;
      if (typeof edit.adminNotes === "string" && edit.adminNotes !== orderDetail.adminNotes) patch.adminNotes = edit.adminNotes;
      if (typeof edit.trackingNumber === "string" && edit.trackingNumber !== orderDetail.trackingNumber) patch.trackingNumber = edit.trackingNumber;
      if (typeof edit.carrier === "string" && edit.carrier !== orderDetail.carrier) patch.carrier = edit.carrier;
      const res = await updateOrder(orderDetail._id, patch);
      if (res.ok) {
        setStatusMsg("Order updated.");
        setEdit({});
        await openOrderDetail(orderDetail._id);
        setOrders(prev => prev.map(o => o._id === orderDetail._id ? { ...o, ...patch } : o));
      } else {
        setErrorMsg(res.error || "Update failed");
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleRefund(full = false) {
    setRefundLoading(true);
    setStatusMsg("");
    setErrorMsg("");
    try {
      let amountCents = undefined;
      if (!full && refundAmount) {
        const val = Math.round(parseFloat(refundAmount) * 100);
        if (!isFinite(val) || val <= 0) throw new Error("Invalid amount");
        amountCents = val;
      }
      const res = await refundOrder(orderDetail._id, { amountCents, reason: refundReason });
      if (res.ok) {
        setStatusMsg("Refund initiated. Status: " + res.status);
        setShowRefund(false);
        await openOrderDetail(orderDetail._id);
        // update list row
        setOrders(prev => prev.map(o => o._id === orderDetail._id ? { ...o, refundStatus: res.status } : o));
      } else {
        setErrorMsg(res.error || "Refund failed");
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setRefundLoading(false);
    }
  }

  return (
    <div className="admin-orders-page">
      <h1>Orders</h1>
      <section className="ops-panel" aria-label="Omnichannel and crypto operations monitor">
        <div className="ops-panel__header">
          <h2>Omnichannel + Crypto Operations</h2>
          <div className="ops-panel__actions">
            <button className="load-more" type="button" onClick={runPollingNow} disabled={pollRunLoading || opsLoading}>
              {pollRunLoading ? "Running Poll Sync..." : "Run Polling Sync"}
            </button>
            <button className="load-more" type="button" onClick={loadOpsSnapshot} disabled={opsLoading || pollRunLoading}>
              {opsLoading ? "Refreshing..." : "Refresh Ops"}
            </button>
          </div>
        </div>

        <div className="ops-summary-grid">
          <article className="ops-card">
            <span>Recent synced sales</span>
            <strong>{opsSnapshot.summary.totalSales || 0}</strong>
          </article>
          <article className="ops-card">
            <span>Receipt NFTs minted</span>
            <strong>{opsSnapshot.summary.receiptMinted || 0}</strong>
          </article>
          <article className="ops-card ops-card--danger">
            <span>Receipt mint failures</span>
            <strong>{opsSnapshot.summary.receiptFailed || 0}</strong>
          </article>
          <article className="ops-card ops-card--warning">
            <span>External sync failures</span>
            <strong>{opsSnapshot.summary.syncFailures || 0}</strong>
          </article>
          <article className="ops-card ops-card--warning">
            <span>Pending crypto intents</span>
            <strong>{opsSnapshot.summary.pendingCryptoIntents || 0}</strong>
          </article>
          <article className="ops-card">
            <span>Artifacts with provenance</span>
            <strong>{provenanceOpsSnapshot.summary.withProvenance || 0}</strong>
          </article>
          <article className="ops-card ops-card--warning">
            <span>Duplicate fingerprint groups</span>
            <strong>{provenanceOpsSnapshot.summary.duplicateFingerprintGroups || 0}</strong>
          </article>
          <article className="ops-card ops-card--danger">
            <span>Reverse-image risk artifacts</span>
            <strong>{provenanceOpsSnapshot.summary.reverseImageLikelyDuplicateCount || 0}</strong>
          </article>
          <article className="ops-card">
            <span>Creator royalties tracked</span>
            <strong>{formatCents(provenanceOpsSnapshot.summary.creatorRoyaltyCents || 0, 'USD')}</strong>
          </article>
          <article className="ops-card">
            <span>PVA resale fee tracked</span>
            <strong>{formatCents(provenanceOpsSnapshot.summary.platformFeeCents || 0, 'USD')}</strong>
          </article>
        </div>

        <div className="ops-grid">
          <div className="ops-list">
            <h3>Pending Crypto Intents</h3>
            {opsSnapshot.pendingCryptoOrders.length === 0 ? (
              <p className="ops-empty">No pending crypto intents.</p>
            ) : (
              <ul>
                {opsSnapshot.pendingCryptoOrders.map((row) => (
                  <li key={`pending-${row._id}`}>
                    <button type="button" onClick={() => openOrderDetail(row._id)}>
                      {row.itemSnapshot?.name || 'Untitled'} • {row.customerEmail || 'No email'}
                    </button>
                    <span>{formatDate(row.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-list">
            <h3>Recent Omnichannel Sales</h3>
            {opsSnapshot.sales.length === 0 ? (
              <p className="ops-empty">No synced sales yet.</p>
            ) : (
              <ul>
                {opsSnapshot.sales.map((sale) => (
                  <li key={`sale-${sale._id}`}>
                    <button type="button" onClick={() => sale.orderId && openOrderDetail(sale.orderId)}>
                      {sale.saleSource || 'unknown'} • {sale.paymentMethod || 'manual'}
                    </button>
                    <span>{sale.blockchainReceipt?.status || 'no_receipt'} • {formatDate(sale.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-list">
            <h3>Recent Royalty Settlements</h3>
            {provenanceOpsSnapshot.recentRoyaltySales.length === 0 ? (
              <p className="ops-empty">No royalty settlements recorded yet.</p>
            ) : (
              <ul>
                {provenanceOpsSnapshot.recentRoyaltySales.map((sale) => (
                  <li key={`royalty-${sale._id}`}>
                    <button type="button" onClick={() => sale.orderId && openOrderDetail(sale.orderId)}>
                      {sale.saleSource || 'unknown'} • {sale.paymentMethod || 'manual'}
                    </button>
                    <span>
                      creator {formatCents(sale.royaltySettlement?.creatorRoyaltyCents || 0, 'USD')} •
                      {' '}pva {formatCents(sale.royaltySettlement?.platformFeeCents || 0, 'USD')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-list">
            <h3>Duplicate Fingerprint Groups</h3>
            {provenanceOpsSnapshot.duplicateFingerprintRows.length === 0 ? (
              <p className="ops-empty">No duplicate fingerprint groups detected.</p>
            ) : (
              <ul>
                {provenanceOpsSnapshot.duplicateFingerprintRows.map((row) => (
                  <li key={`dup-${row._id}`}>
                    <button type="button">
                      {String(row._id || '').slice(0, 12)}...
                    </button>
                    <span>{row.count} item(s)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-list">
            <h3>Recent Reverse-Image Risks</h3>
            {provenanceOpsSnapshot.recentReverseImageRisks.length === 0 ? (
              <p className="ops-empty">No reverse-image risks in recent artifacts.</p>
            ) : (
              <ul>
                {provenanceOpsSnapshot.recentReverseImageRisks.map((row) => (
                  <li key={`revimg-${row._id}`}>
                    <button type="button">
                      {(row.title || row.name || 'Untitled').slice(0, 36)}
                    </button>
                    <span>
                      score {Number(row?.provenance?.reverseImage?.score || 0).toFixed(2)} •
                      {' '}matches {Array.isArray(row?.provenance?.reverseImage?.matches) ? row.provenance.reverseImage.matches.length : 0}
                    </span>
                    <div className="ops-row-actions">
                      <button
                        type="button"
                        className="load-more"
                        onClick={() => handleQuickVerify(row._id)}
                        disabled={!!verifyingByItem[row._id]}
                      >
                        {verifyingByItem[row._id] ? 'Verifying...' : 'Quick Verify'}
                      </button>
                      <button
                        type="button"
                        className="load-more"
                        onClick={() => handleProvenanceReview(row._id, 'flagged')}
                        disabled={!!reviewingByItem[row._id]}
                      >
                        {reviewingByItem[row._id] ? 'Saving...' : 'Flag'}
                      </button>
                      <button
                        type="button"
                        className="load-more"
                        onClick={() => handleProvenanceReview(row._id, 'hash_verified')}
                        disabled={!!reviewingByItem[row._id]}
                      >
                        {reviewingByItem[row._id] ? 'Saving...' : 'Clear'}
                      </button>
                    </div>
                    {verifyResultsByItem[row._id] ? (
                      <span className="ops-verify-status">
                        {verifyResultsByItem[row._id].ok
                          ? `verdict ${verifyResultsByItem[row._id].verdict} • signature ${verifyResultsByItem[row._id].signatureValid ? 'ok' : 'fail'} • chain ${verifyResultsByItem[row._id].blockchainConsistent ? 'consistent' : 'mismatch'}`
                          : (verifyResultsByItem[row._id].error || 'Verification failed')}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ops-list">
            <h3>Recent Provenance Reviews</h3>
            {provenanceOpsSnapshot.recentReviewLogs.length === 0 ? (
              <p className="ops-empty">No provenance review actions recorded yet.</p>
            ) : (
              <ul>
                {provenanceOpsSnapshot.recentReviewLogs.map((row) => (
                  <li key={`review-${row._id}`}>
                    <button type="button">
                      {row.previousStatus || 'pending'} → {row.nextStatus || 'pending'}
                    </button>
                    <span>
                      {row?.actor?.label || 'admin'} • {formatDate(row.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div role="status" className="status-msg">{statusMsg}</div>
      {errorMsg && <div className="error-msg" role="alert">{errorMsg}</div>}
      <div className="orders-list">
        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Item</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Refund</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id} onClick={() => openOrderDetail(order._id)} className={order._id === selectedOrderId ? "selected" : ""}>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.itemSnapshot?.name}</td>
                <td>{formatCents(order.amountTotal, order.currency)}</td>
                <td>{order.paymentStatus}</td>
                <td>{order.refundStatus}</td>
                <td>{order.customerEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {nextCursor && (
          <button className="load-more" onClick={() => { setLoadingMore(true); loadOrders(); }} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
        {loading && <div className="loading">Loading...</div>}
      </div>
      {selectedOrderId && (
        <div className="order-detail-overlay" onClick={e => { if (e.target.classList.contains("order-detail-overlay")) setSelectedOrderId(null); }}>
          <div className="order-detail-panel">
            {detailLoading ? <div className="loading">Loading...</div> : orderDetail && (
              <>
                <h2>Order Detail</h2>
                <div><b>Order ID:</b> {orderDetail._id}</div>
                <div><b>Created:</b> {formatDate(orderDetail.createdAt)}</div>
                <div><b>Item:</b> {orderDetail.itemSnapshot?.name} ({orderDetail.itemSnapshot?.slug})</div>
                <div><b>Amount:</b> {formatCents(orderDetail.amountTotal, orderDetail.currency)}</div>
                <div><b>Payment Status:</b> {orderDetail.paymentStatus}</div>
                <div><b>Refund Status:</b> {orderDetail.refundStatus}</div>
                <div><b>Customer:</b> {orderDetail.customerEmail} {orderDetail.customerName && `(${orderDetail.customerName})`}</div>
                <div><b>Stripe Session:</b> {orderDetail.stripeSessionId}</div>
                <div><b>Payment Intent:</b> {orderDetail.stripePaymentIntentId}</div>
                {orderDetail.crypto?.txHash && <div><b>Crypto Tx:</b> {orderDetail.crypto.txHash}</div>}
                {orderDetail.crypto?.network && <div><b>Crypto Network:</b> {orderDetail.crypto.network} {orderDetail.crypto.chainId ? `(${orderDetail.crypto.chainId})` : ''}</div>}
                {orderDetail.crypto?.expectedAmountWei && <div><b>Expected Amount (wei):</b> {orderDetail.crypto.expectedAmountWei}</div>}
                {orderDetail.crypto?.paidAmountWei && <div><b>Paid Amount (wei):</b> {orderDetail.crypto.paidAmountWei}</div>}
                {orderDetail.crypto?.recipientAddress && <div><b>Treasury Wallet:</b> {orderDetail.crypto.recipientAddress}</div>}
                {orderDetail.crypto?.buyerWallet && <div><b>Buyer Wallet:</b> {orderDetail.crypto.buyerWallet}</div>}
                {orderDetail.crypto?.explorerUrl && (
                  <div>
                    <b>Explorer:</b>{' '}
                    <a href={orderDetail.crypto.explorerUrl} target="_blank" rel="noreferrer">
                      {orderDetail.crypto.explorerUrl}
                    </a>
                  </div>
                )}
                {orderDetail.stripeRefundId && <div><b>Refund ID:</b> {orderDetail.stripeRefundId}</div>}
                {orderDetail.refundAmountCents && <div><b>Refunded:</b> {formatCents(orderDetail.refundAmountCents, orderDetail.currency)}</div>}
                {orderDetail.refundedAt && <div><b>Refunded At:</b> {formatDate(orderDetail.refundedAt)}</div>}
                <div><b>Shipping:</b> {orderDetail.shipping ? JSON.stringify(orderDetail.shipping) : "-"}</div>
                <div className="detail-actions">
                  {/* Fulfillment/Notes Editor */}
                  <div className="fulfillment-editor">
                    <label>
                      Fulfillment Status:
                      <select
                        value={edit.fulfillmentStatus ?? orderDetail.fulfillmentStatus}
                        onChange={e => setEdit(edit => ({ ...edit, fulfillmentStatus: e.target.value }))}
                        disabled={saveLoading}
                      >
                        <option value="unfulfilled">Unfulfilled</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </label>
                    <label>
                      Admin Notes:
                      <textarea
                        value={(edit.adminNotes ?? orderDetail.adminNotes) || ""}
                        onChange={e => setEdit(edit => ({ ...edit, adminNotes: e.target.value }))}
                        rows={2}
                        disabled={saveLoading}
                        style={{ width: "100%", minWidth: 0 }}
                      />
                    </label>
                    <label>
                      Tracking Number:
                      <input
                        type="text"
                        value={(edit.trackingNumber ?? orderDetail.trackingNumber) || ""}
                        onChange={e => setEdit(edit => ({ ...edit, trackingNumber: e.target.value }))}
                        disabled={saveLoading}
                      />
                    </label>
                    <label>
                      Carrier:
                      <input
                        type="text"
                        value={(edit.carrier ?? orderDetail.carrier) || ""}
                        onChange={e => setEdit(edit => ({ ...edit, carrier: e.target.value }))}
                        disabled={saveLoading}
                      />
                    </label>
                    <button
                      className="save-btn"
                      onClick={handleSave}
                      disabled={saveLoading || !isDirty()}
                    >
                      {saveLoading ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {/* Refund Actions */}
                  {orderDetail.paymentStatus === "paid" && orderDetail.refundStatus !== "refunded" && (
                    <>
                      <button className="refund-btn" onClick={() => setShowRefund(true)} disabled={refundLoading}>Refund</button>
                      {showRefund && (
                        <div className="refund-modal">
                          <div className="refund-modal-content">
                            <h3>Refund Order</h3>
                            <label>
                              Amount (leave blank for full):
                              <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder={formatCents(orderDetail.amountTotal, orderDetail.currency)} />
                            </label>
                            <label>
                              Reason:
                              <select value={refundReason} onChange={e => setRefundReason(e.target.value)}>
                                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            </label>
                            <div className="refund-modal-actions">
                              <button onClick={() => handleRefund(!refundAmount)} disabled={refundLoading}>Confirm Refund</button>
                              <button onClick={() => setShowRefund(false)} disabled={refundLoading}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <button className="close-btn" onClick={() => setSelectedOrderId(null)}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
