import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchCheckoutSession, finalizeCheckoutSession } from "../lib/api";
import "./CheckoutSuccessPage.css";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);
  const [finalize, setFinalize] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session_id");
      setStatus("error");
      return;
    }
    fetchCheckoutSession(sessionId).then(async (res) => {
      if (res.ok) {
        setSession(res.session);
        setStatus(res.session.payment_status);

        if (res.session.payment_status === "paid") {
          const finalized = await finalizeCheckoutSession(sessionId);
          if (finalized.ok) {
            setFinalize(finalized);
          }
        }
      } else {
        setError(res.error || "Session not found");
        setStatus("error");
      }
    });
  }, [sessionId]);

  return (
    <div className="checkout-success-page">
      <h1>Checkout Success</h1>
      {status === "loading" && <div>Loading...</div>}
      {status === "error" && <div className="error">{error}</div>}
      {status !== "loading" && status !== "error" && (
        <div className="result">
          <div className="status">Payment Status: <b>{session.payment_status}</b></div>
          <div className="amount">
            Amount: {session.amount_total / 100} {session.currency?.toUpperCase()}
          </div>
          {session.customer_details?.email && (
            <div>Email: {session.customer_details.email}</div>
          )}
          {finalize?.finalized && (
            <>
              <div>Order ID: {finalize.orderId}</div>
              {finalize.blockchainReceipt?.status && (
                <div>
                  Receipt Mint: <b>{finalize.blockchainReceipt.status}</b>
                  {finalize.blockchainReceipt.tokenId ? ` (Token #${finalize.blockchainReceipt.tokenId})` : ""}
                </div>
              )}
              {finalize.certificateId && <div>Certificate: {finalize.certificateId}</div>}
              {finalize.downloadUrl && (
                <div className="back-link">
                  <a href={finalize.downloadUrl}>Download Purchase Asset</a>
                </div>
              )}
            </>
          )}
          <div className="back-link">
            <Link to="/marketplace">Back to Marketplace</Link>
          </div>
        </div>
      )}
    </div>
  );
}
