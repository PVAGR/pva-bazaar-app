import React, { useEffect, useState, useRef } from "react";
import { fetchOrders, fetchOrder, refundOrder, updateOrder } from "../lib/api";
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
  const abortRef = useRef();

  useEffect(() => {
    loadOrders(true);
    // eslint-disable-next-line
  }, []);

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
        setStatusMsg(`Refund initiated. Status: ${  res.status}`);
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
