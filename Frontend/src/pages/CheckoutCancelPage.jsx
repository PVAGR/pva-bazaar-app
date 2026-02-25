import React from "react";
import { Helmet } from "react-helmet-async";
import SiteFooter from "../components/SiteFooter.jsx";
import "./CheckoutCancelPage.css";

export default function CheckoutCancelPage() {
  return (
    <div className="checkout-cancel-page">
      <Helmet><title>Checkout Canceled | PVA Bazaar</title></Helmet>
      <h1>Checkout Canceled</h1>
      <p>Your payment was canceled or not completed.</p>
      <div style={{ marginTop: 16 }}>
        <SiteFooter style={{ borderTop: 'none', padding: 0 }} />
      </div>
    </div>
  );
}
