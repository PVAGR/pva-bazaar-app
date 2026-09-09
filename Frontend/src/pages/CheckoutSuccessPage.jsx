import { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { useSearchParams, Link } from "react-router-dom";
import { fetchCheckoutSession, finalizeCheckoutSession } from "../lib/api";
import { getCheckoutSessionStash, clearCheckoutSessionStash } from "./CartPage.jsx";
import "./CheckoutSuccessPage.css";

const CART_KEY = 'pva:cart';

function removeIdsFromCart(ids) {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;
    const doomed = new Set((ids || []).map(String));
    localStorage.setItem(CART_KEY, JSON.stringify(parsed.filter((id) => !doomed.has(String(id)))));
  } catch { /* storage unavailable — ignore */ }
}

/**
 * Post-payment confirmation (canonical commerce path):
 * - Nothing here is trusted from the redirect alone. The page re-reads the
 *   Stripe session, then calls the idempotent server finalize, which marks
 *   the order paid and settles referral commission server-side.
 * - The cart is cleared ONLY for the stashed session item ids AFTER the
 *   server confirms finalization. Any other outcome keeps the cart intact.
 */
export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);
  const [finalized, setFinalized] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setError("Missing session_id");
      setStatus("error");
      return;
    }
    fetchCheckoutSession(sessionId).then(res => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error || "Session not found");
        setStatus("error");
        return;
      }
      setSession(res.session);
      const paymentStatus = res.session.payment_status;
      setStatus(paymentStatus);
      if (paymentStatus === 'paid') {
        finalizeCheckoutSession(sessionId).then(fin => {
          if (cancelled) return;
          if (fin?.ok && (fin.finalized || fin.pending === false)) {
            setFinalized(fin);
            // Server confirmed: drop exactly the paid session items from the
            // temporary cart. Anything else in the cart stays for later.
            const stash = getCheckoutSessionStash();
            if (stash?.ids?.length) {
              removeIdsFromCart(stash.ids);
              clearCheckoutSessionStash();
            }
          } else if (fin?.ok && fin.pending) {
            setFinalized(fin);
          } else {
            setError(fin?.error || 'Payment may still be processing â€” your cart was kept. Check your order history before retrying.');
          }
        }).catch((e) => {
          if (!cancelled) setError(`${e?.message || 'Finalize failed'} â€” your cart was kept. Check your order history before retrying.`);
        });
      }
    }).catch((e) => {
      if (!cancelled) {
        setError(e?.message || 'Failed to load session');
        setStatus("error");
      }
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  const heading = status === 'paid' ? 'Payment confirmed' : status === 'loading' ? 'Checkout' : status === 'error' ? 'Checkout issue' : 'Payment pending';

  return (
    <div className="checkout-success-page">
      <h1>{heading}</h1>
      {status === "loading" && <div>Loading...</div>}
      {status === "error" && <div className="error">{error}</div>}
      {status !== "loading" && status !== "error" && session && (
        <div className="result">
          <div className="status">Payment Status: <b>{session.payment_status}</b></div>
          <div className="amount">
            Amount: {session.amount_total / 100} {session.currency?.toUpperCase()}
          </div>
          {session.customer_details?.email && (
            <div>Email: {session.customer_details.email}</div>
          )}
          {status === 'paid' && finalized?.orderId ? (
            <div>Order reference: <b>{finalized.orderId}</b></div>
          ) : null}
          {status === 'paid' && !finalized?.orderId && !error ? (
            <div>Confirming your order with the serverâ€¦</div>
          ) : null}
          {status !== 'paid' ? (
            <div className="error">This order is not paid. Your cart was kept â€” nothing was charged for an unconfirmed order.</div>
          ) : null}
          {error ? <div className="error">{error}</div> : null}
          <div className="back-link">
            <Link to="/marketplace">Back to Marketplace</Link>
          </div>
        </div>
      )}
    </div>
  );
}
