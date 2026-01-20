import React from "react";
import { Link } from "react-router-dom";
import "./CheckoutCancelPage.css";

export default function CheckoutCancelPage() {
  return (
    <div className="checkout-cancel-page">
      <h1>Checkout Canceled</h1>
      <p>Your payment was canceled or not completed.</p>
      <div className="back-link">
        <Link to="/marketplace">Back to Marketplace</Link>
      </div>
    </div>
  );
}
