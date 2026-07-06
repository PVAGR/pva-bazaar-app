import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Cart placeholder: future Stripe-backed cart for physical + digital products.
 * Why: E-commerce engine is part of the roadmap; this keeps the nav meaningful.
 */
export default function CartPage() {
  return (
    <section className="section-card">
      <h2>Cart</h2>
      <p>
        Your cart is empty. Browse the{' '}
        <Link to="/marketplace" className="link">
          Marketplace
        </Link>{' '}
        to add items.
      </p>
      <p className="subtle-note">
        We will support both physical and digital products with Stripe checkout.
      </p>
    </section>
  );
}
