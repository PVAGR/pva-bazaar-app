import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { cancelCheckoutSession } from '../lib/api';
import './CheckoutCancelPage.css';

export default function CheckoutCancelPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState(sessionId ? 'releasing' : 'idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    cancelCheckoutSession(sessionId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus('error');
        setMessage(result.error || 'Unable to finalize cancellation cleanup.');
        return;
      }
      if (result.alreadyFinalized) {
        setStatus('finalized');
        setMessage('This checkout was already finalized, so no cancellation changes were applied.');
        return;
      }
      setStatus('cancelled');
      setMessage(
        result.released
          ? 'Checkout canceled and item reservation released.'
          : 'Checkout canceled successfully.',
      );
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="checkout-cancel-page">
      <h1>Checkout Canceled</h1>
      <p>Your payment was canceled or not completed.</p>
      {status === 'releasing' && <p>Finalizing cancellation cleanup...</p>}
      {status === 'cancelled' && <p>{message}</p>}
      {status === 'finalized' && <p>{message}</p>}
      {status === 'error' && <p className="error">{message}</p>}
      <div className="back-link">
        <Link to="/marketplace">Back to Marketplace</Link>
      </div>
    </div>
  );
}
