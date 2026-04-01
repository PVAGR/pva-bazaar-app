import React, { useState } from 'react';
import './SellerFAQ.css';

const FAQ_ITEMS = [
  {
    id: 'get-started',
    question: 'How do I get started as a seller?',
    answer:
      'Sign up for a creator account on this portal. Complete your profile (name, country, currency, payout account), then click "Post an item" to create your first listing.',
  },
  {
    id: 'upload-items',
    question: 'How do I upload items?',
    answer:
      'Go to "Post an item" and fill in the listing form. Add up to 6 photos (max 250KB each), set a price, select a category, and add a clear description. Review the checklist before publishing.',
  },
  {
    id: 'syndication',
    question: 'What is syndication?',
    answer:
      'Syndication lets you automatically list your items on other marketplaces (Etsy, eBay, Facebook, etc.). Enable syndication channels during posting—your listings will sync across platforms.',
  },
  {
    id: 'edit-listings',
    question: 'Can I edit my listings?',
    answer:
      'Yes, go to "Manage listings" to view, edit, or remove items. You can also adjust syndication settings, retry failed syncs, or manually mark items as sold.',
  },
  {
    id: 'payment',
    question: 'How do I get paid?',
    answer:
      'Set up a payout account in your account settings. When an item sells, payment is processed to that account. Check your account page for status and history.',
  },
  {
    id: 'provenance',
    question: 'What is provenance?',
    answer:
      'Provenance is a digital record of your item\'s origin and history. You can add a provenance signature when posting—this helps verify authenticity and adds value.',
  },
  {
    id: 'support',
    question: 'How do I get help?',
    answer:
      'Check the help tips throughout the portal (marked with ?). For detailed support, email support@pvabazaar.org or visit our FAQ page.',
  },
  {
    id: 'fees',
    question: 'Are there any fees?',
    answer:
      'PVA Bazaar charges a small listing fee and takes a commission on sales. Exact rates depend on your seller tier and syndication channels used.',
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
        <h2>Frequently Asked Questions</h2>
        <p>Common questions about selling on PVA Bazaar</p>
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
