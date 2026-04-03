import React, { useState } from 'react';
import { apiPost } from '../lib/api';
import { getErrorMessage } from '../lib/errorUtils';
import './MakeOrderModal.css';

export default function MakeOrderModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('form'); // form, loading, success, error
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dealId, setDealId] = useState('');

  // Form fields
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setCounterpartyEmail('');
    setCounterpartyName('');
    setAmount('');
    setCurrency('USD');
    setDescription('');
    setError('');
    setStep('form');
    setDealId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('loading');

    try {
      if (!counterpartyEmail.trim()) throw new Error('Counterparty email is required');
      if (!counterpartyName.trim()) throw new Error('Counterparty name is required');
      if (!amount || Number(amount) <= 0) throw new Error('Amount must be greater than 0');
      if (!description.trim()) throw new Error('Description is required');

      const response = await apiPost('/deals/quick/initiate', {
        counterpartyEmail: counterpartyEmail.trim(),
        counterpartyName: counterpartyName.trim(),
        amount: Number(amount),
        currency,
        description: description.trim(),
        contactMethod: 'email',
      });

      if (response.ok && response.dealId) {
        setDealId(response.dealId);
        setStep('success');
        if (onSuccess) onSuccess(response.dealId, response.item);
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Make order error:', err);
      setError(getErrorMessage(err));
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box make-order-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">💼 Make Order</h2>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="make-order-form">
              <p className="form-help">Initiate a deal with a counterparty. Send them an email invite to accept and provide payment details.</p>

              <div className="form-group">
                <label htmlFor="counterpartyEmail">Counterparty Email *</label>
                <input
                  id="counterpartyEmail"
                  type="email"
                  value={counterpartyEmail}
                  onChange={(e) => setCounterpartyEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="counterpartyName">Counterparty Name *</label>
                <input
                  id="counterpartyName"
                  type="text"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="amount">Amount *</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="ETH">ETH</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description / Item Details *</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Custom Afghan rug, 5x8ft, traditional weave"
                  rows={3}
                  required
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="form-actions">
                <button type="button" className="button ghost" onClick={handleClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Order Invite'}
                </button>
              </div>
            </form>
          )}

          {step === 'loading' && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Creating order and sending email...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>Order Created Successfully!</h3>
              <p className="success-message">
                An email invitation has been sent to <strong>{counterpartyEmail}</strong>.
              </p>
              <div className="success-details">
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Counterparty will receive the invite email</li>
                  <li>They accept and provide payment/crypto information</li>
                  <li>Both parties mock confirm the order</li>
                  <li>Real transaction happens on blockchain</li>
                  <li>Funds held in escrow with full tracking</li>
                </ul>
              </div>
              <button className="button primary" onClick={handleClose}>
                Done
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Order Creation Failed</h3>
              <p className="error-message">{error}</p>
              <div className="form-actions">
                <button className="button ghost" onClick={() => setStep('form')}>
                  Try Again
                </button>
                <button className="button secondary" onClick={handleClose}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
