import React, { useState } from 'react';
import './SellerFAQ.css';

const FAQ_ITEMS = [
  {
    id: 'get-started',
    question: 'How do I get started as a seller?',
    answer:
      'Create a standard account, complete onboarding, then use the supplier portal when you have real goods, honest pricing, and enough detail for a serious submission.',
  },
  {
    id: 'upload-items',
    question: 'What do I need before I submit items?',
    answer:
      'Use the submit tab and provide clear photos, a real asking price, category, and a description with condition, maker or origin details, and anything important for review. You can upload up to 10 photos with a 20 MB total limit.',
  },
  {
    id: 'syndication',
    question: 'Will my item instantly appear on other marketplaces?',
    answer:
      'Do not assume automatic external marketplace posting from this portal. The current supplier flow is for intake, review, listings, and relationship building inside PVA Bazaar first.',
  },
  {
    id: 'edit-listings',
    question: 'Can I manage what I submit?',
    answer:
      'Yes. Use your account and listing surfaces to manage active items, and use the submissions history in this browser as your local intake record.',
  },
  {
    id: 'payment',
    question: 'How are payments handled?',
    answer:
      'Do not assume automated payout from the first submission alone. Payment and settlement terms depend on the actual sale path, relationship, and product once PVA confirms the next step with you.',
  },
  {
    id: 'provenance',
    question: 'How should I share origin and provenance?',
    answer:
      'Use your description and photos to explain who made the item, where it came from, and any history that matters. PVA can structure stronger provenance later when the product and relationship move forward.',
  },
  {
    id: 'support',
    question: 'How do I get help?',
    answer:
      'Use the portal links, your account flow, and the supplier submission path to keep your inquiry tied to a real record. If you are already in contact with PVA, continue in that same channel for follow-up.',
  },
  {
    id: 'fees',
    question: 'Are fees or commissions automatic?',
    answer:
      'Do not assume automatic listing fees, commissions, or seller tiers from this portal alone. Commercial terms should be communicated clearly for the specific relationship, product, or deal.',
  },
];

export default function SellerFAQ() {
  const [expanded, setExpanded] = useState({});

  function toggleItem(id) {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="seller-faq">
      <div className="faq-header">
        <h2>Supplier Portal Questions</h2>
        <p>Accurate guidance for the current PVA Bazaar seller intake flow</p>
      </div>

      <div className="faq-items">
        {FAQ_ITEMS.map(item => (
          <div key={item.id} className="faq-item">
            <button
              className="faq-question"
              onClick={() => toggleItem(item.id)}
              aria-expanded={expanded[item.id]}
            >
              <span className="faq-icon">{expanded[item.id] ? '−' : '+'}</span>
              <span className="faq-text">{item.question}</span>
            </button>

            {expanded[item.id] && <div className="faq-answer">{item.answer}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
