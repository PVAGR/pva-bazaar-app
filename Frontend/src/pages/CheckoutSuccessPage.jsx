import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchCheckoutSession } from "../lib/api";
import "./CheckoutSuccessPage.css";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session_id");
      setStatus("error");
      return;
    }
    fetchCheckoutSession(sessionId).then(res => {
      if (res.ok) {
        setSession(res.session);
        setStatus(res.session.payment_status);
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
          <div className="back-link">
            <Link to="/marketplace">Back to Marketplace</Link>
          </div>
        </div>
      )}
    </div>
  );
}
