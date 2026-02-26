import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SiteFooter from "../components/SiteFooter.jsx";
import "./CheckoutCancelPage.css";

export default function CheckoutCancelPage() {
  return (
    <div className="checkout-cancel-page">
      <Helmet><title>Checkout Canceled | PVA Bazaar</title><meta name="description" content="Your payment was canceled or not completed." /><meta name="robots" content="noindex, nofollow" /></Helmet>
      <h1>Checkout Canceled</h1>
      <p>Your payment was canceled or not completed.</p>
      <p style={{ marginTop: 12 }}>
        <Link to="/marketplace" className="btn ghost">Continue shopping</Link>
        <span style={{ margin: '0 8px' }}·</span>
        <Link to="/" className="btn ghost">Back to Archive</Link>
      </p>
      <div style={{ marginTop: 16 }}>
        <SiteFooter style={{ borderTop: 'none', padding: 0 }} />
      </div>
    </div>
  );
}
