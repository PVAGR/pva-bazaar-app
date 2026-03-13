import React from 'react';
import { Link } from 'react-router-dom';

export default function CartPage() {
  return (
    <section className="section-card">
      <h2>Cart</h2>
      <p>Your cart is empty. Browse the <Link to="/marketplace" className="link">Marketplace</Link> to add items.</p>
    </section>
  );
}
