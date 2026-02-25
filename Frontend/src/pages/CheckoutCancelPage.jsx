import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "./CheckoutCancelPage.css";

export default function CheckoutCancelPage() {
  return (
    <div className="checkout-cancel-page">
      <Helmet><title>Checkout Canceled | PVA Bazaar</title></Helmet>
      <h1>Checkout Canceled</h1>
      <p>Your payment was canceled or not completed.</p>
      <div className="back-links" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        <Link to="/marketplace">Marketplace</Link>
        <Link to="/">Archive</Link>
        <Link to="/chat">Chat</Link>
        <Link to="/about">About</Link>
      </div>
    </div>
  );
}
