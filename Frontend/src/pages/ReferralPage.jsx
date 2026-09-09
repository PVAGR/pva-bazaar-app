import { useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Helmet } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Link } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { apiUrl } from '../lib/apiBase';
import './ReferralPage.css';

const STORAGE_KEY = 'pva:referral-data';
const REFERRAL_BASE = 'https://pvabazaar.org';

/**
 * Referral data contract:
 * - The referral CODE record is server-authoritative. It is stored locally
 *   only as a convenience pointer (code + email) after the backend confirms
 *   registration. No local-only registration ever exists.
 * - Earnings/stats freshness is explicit:
 *     live        — just read from the production API (MongoDB).
 *     stale       — API unreachable; showing last saved values, labeled.
 *     unavailable — API unreachable and nothing saved; shown as unavailable,
 *                   NEVER as $0 / 0 (absence of data is not a zero balance).
 *     loading     — first fetch in flight.
 */
function formatRefreshTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch (_e) {
    return String(value);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_e) { /* ignore quota */ }
}

function getReferralFromUrl() {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const search = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
  const params = new URLSearchParams(search);
  return params.get('ref') || '';
}

function recordInboundReferral(code) {
  if (!code) return;
  try {
    const key = 'pva:inbound-ref';
    localStorage.setItem(key, code);
  } catch (_e) { /* ignore */ }
}

function getInboundReferral() {
  try {
    return localStorage.getItem('pva:inbound-ref') || '';
  } catch (_e) { return ''; }
}

function formatConversion(clicks, sales) {
  const safeClicks = Number(clicks) || 0;
  const safeSales = Number(sales) || 0;
  if (safeClicks <= 0) return '—';
  const rate = (safeSales / safeClicks) * 100;
  return rate < 0.05 && safeSales === 0 ? '0%' : `${rate.toFixed(1)}%`;
}

// ── commission tiers ─────────────────────────────────────────────────────────

const TIERS = [
  { label: 'Books',       pct: 15, note: 'Per published book sale or purchase via your referral link.' },
  { label: 'Marketplace', pct: 10, note: 'Per successful marketplace item transaction.' },
  { label: 'Membership',  pct: 20, note: 'Per paid plan upgrade (when available).' },
  { label: 'Services',    pct: 8,  note: 'Per completed service or consultation booking.' },
];

// ── email send via EmailJS free tier ─────────────────────────────────────────
// Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
// in your Vercel frontend environment. Uses the free EmailJS SDK (no subscription).
async function sendReferralEmail({ toEmail, toName, code, referralUrl }) {
  const serviceId  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || '';
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || '';

  if (!serviceId || !templateId || !publicKey) {
    // Email not configured — give them a mailto fallback
    const subject = encodeURIComponent('Your PVA Bazaar referral code');
    const body = encodeURIComponent(
      `Hi ${toName || 'there'},\n\nYour personal PVA Bazaar referral code is: ${code}\n\nShare this link: ${referralUrl}\n\nEvery purchase made through your link earns you a commission automatically.\n\nPVA Bazaar\nhttps://pvabazaar.org`,
    );
    window.open(`mailto:${toEmail}?subject=${subject}&body=${body}`, '_blank');
    return { ok: true, method: 'mailto' };
  }

  // Lazy-load EmailJS SDK only when needed (free CDN, no install cost)
  if (!window.emailjs) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.emailjs.init({ publicKey });
  }

  await window.emailjs.send(serviceId, templateId, {
    to_name:      toName || toEmail,
    to_email:     toEmail,
    referral_code: code,
    referral_url:  referralUrl,
    site_name:    'PVA Bazaar',
    site_url:     REFERRAL_BASE,
  });
  return { ok: true, method: 'emailjs' };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const isLoggedIn = Boolean(getToken());
  const [data, setData]         = useState(null);   // referral record (server-issued, cached pointer)
  const [live, setLive]         = useState(null);   // live earnings from the backend
  const [statsState, setStatsState] = useState('loading'); // loading | live | stale | unavailable
  const [lastRefreshAt, setLastRefreshAt] = useState('');
  const [statsError, setStatsError] = useState('');
  const [name,  setName]        = useState('');
  const [email, setEmail]       = useState('');
  const [sendTo, setSendTo]     = useState('');
  const [sendName, setSendName] = useState('');
  const [busy,  setBusy]        = useState(false);
  const [registering, setRegistering] = useState(false);
  const [msg,   setMsg]         = useState('');
  const [err,   setErr]         = useState('');
  const [copied, setCopied]     = useState(false);

  // Track inbound referral on first load
  useEffect(() => {
    const inbound = getReferralFromUrl();
    if (inbound) recordInboundReferral(inbound);
  }, []);

  // Load saved data
  useEffect(() => {
    const saved = loadData();
    if (saved) setData(saved);
  }, []);

  // Pull live stats straight from the backend (online, not browser-local).
  // Freshness is explicit: live on success; stale when the API fails but a
  // saved record exists; unavailable when there is nothing trustworthy to
  // show. Cached values are NEVER presented as live.
  const fetchLiveStats = useCallback(async (record) => {
    const emailKey = record?.email || data?.email || '';
    if (!emailKey) {
      setStatsState('unavailable');
      return;
    }
    setStatsState((prev) => (prev === 'live' ? prev : 'loading'));
    setStatsError('');
    try {
      const res = await fetch(apiUrl('/referrals/earnings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok || !body?.data) {
        throw new Error(body?.error || `Earnings request failed (${res.status})`);
      }
      setLive(body.data);
      setLastRefreshAt(new Date().toISOString());
      setStatsState('live');
      setStatsError('');
    } catch (fetchErr) {
      // No silent fallback: label exactly what the user is seeing.
      if (record || data) {
        setStatsState('stale');
      } else {
        setStatsState('unavailable');
      }
      setStatsError(fetchErr?.message || 'Live stats unavailable');
    }
  }, [data]);

  useEffect(() => {
    // Always resolve freshness explicitly, even when the saved record has no
    // email (→ 'unavailable', never a silent loading state or fake zero).
    if (data) fetchLiveStats(data);
  }, [data, fetchLiveStats]);

  const referralUrl = data
    ? `${REFERRAL_BASE}/?ref=${encodeURIComponent(data.code)}`
    : '';

  function handleCreate(e) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!name.trim()) { setErr('Enter your name to create a referral code.'); return; }
    if (!trimmedEmail) {
      setErr('An email address is required — your code and every sale it drives are stored under it (never only in your browser).');
      return;
    }

    // Backend-authoritative: the code is issued by the server and only then
    // stored. A failed request never creates a local registration.
    setRegistering(true);
    setErr('');
    setMsg('');
    const issueBackend = async () => {
      try {
        const res = await fetch(apiUrl('/referrals/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail, name: name.trim() }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload?.data?.code) {
          const record = {
            code: payload.data.code,
            name: payload.data.name || name.trim(),
            email: payload.data.email || trimmedEmail,
            createdAt: new Date(payload.data.joinedAt || Date.now()).toISOString(),
            sales: payload.data.sales || 0,
            clicks: payload.data.clicks || 0,
            totalCommissionsCents: payload.data.totalCommissionsCents || 0,
            pendingCents: payload.data.pendingCents || 0,
          };
          saveData(record);
          setData(record);
          setErr('');
          setMsg(
            payload.emailDelivered
              ? `Your referral code is ${record.code} and it was emailed to you. Share your link below to start earning.`
              : `Your referral code is ${record.code}. We could not email it this time — save it now and share your link below to start earning.`,
          );
          fetchLiveStats(record);
          return;
        }
        // Server rejected the registration: no code, no local record, no success.
        setErr(payload?.error || 'Referral registration failed. Please try again.');
      } catch (_apiErr) {
        // Offline: nothing was registered. Input is preserved for retry.
        setErr('Referral service is offline — no code was registered. Please try again shortly.');
      } finally {
        setRegistering(false);
      }
    };
    issueBackend();
  }

  async function handleSendEmail(e) {
    e.preventDefault();
    if (!sendTo.trim()) { setErr('Enter an email address to send to.'); return; }
    if (!data) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const result = await sendReferralEmail({
        toEmail: sendTo.trim(),
        toName: sendName.trim() || sendTo.trim(),
        code: data.code,
        referralUrl,
      });
      setSendTo('');
      setSendName('');
      setMsg(result.method === 'mailto'
        ? 'Your email client opened. Complete the send there.'
        : `Referral email sent to ${sendTo.trim()}.`);
    } catch (sendErr) {
      setErr(sendErr?.message || 'Failed to send email. Try the copy-link option.');
    } finally {
      setBusy(false);
    }
  }

  const handleCopy = useCallback(() => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = referralUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [referralUrl]);

  const inbound = getInboundReferral();

  return (
    <>
      <Helmet>
        <title>Referral Program · PVA Bazaar</title>
        <meta name="description" content="Join the PVA Bazaar referral program. Share your code, earn commissions automatically on every sale you drive." />
      </Helmet>

      <section className="referral-page section-card">
        <header className="referral-page__hero">
          <div>
            <p className="pill">Referral program</p>
            <h1>Earn a commission on every sale you drive.</h1>
            <p className="referral-page__lead">
              Get a free personal referral code. Share your link with anyone — buyers, businesses, readers.
              Every purchase they make through your link earns you a percentage of the sale, automatically tracked
              and recorded. No subscription. No cost. Runs perennially.
            </p>
          </div>
          <aside className="referral-page__panel">
            <h2>How it works</h2>
            <ol className="referral-page__steps">
              <li>Create your free referral code below.</li>
              <li>Share your personal link anywhere — email, social, WhatsApp, in person.</li>
              <li>Someone clicks your link and makes a purchase.</li>
              <li>Your commission is recorded and paid out when it reaches threshold.</li>
            </ol>
            {inbound ? (
              <p className="referral-page__inbound">
                You arrived via referral code <strong>{inbound}</strong>. If you make a purchase, the person who sent you this link earns a commission.
              </p>
            ) : null}
          </aside>
        </header>

        <section className="referral-page__tiers section-card">
          <p className="pill">Commission rates</p>
          <h2>What you earn per category</h2>
          <div className="referral-page__tiersGrid">
            {TIERS.map((t) => (
              <article key={t.label} className="referral-page__tier">
                <span className="referral-page__tierPct">{t.pct}%</span>
                <strong>{t.label}</strong>
                <p>{t.note}</p>
              </article>
            ))}
          </div>
        </section>

        {msg ? <div className="referral-page__success" role="status">{msg}</div> : null}
        {err ? <div className="referral-page__error" role="alert">{err}</div> : null}

        {!data ? (
          <section className="referral-page__create section-card">
            <p className="pill">Step 1</p>
            <h2>Create your referral code</h2>
            <p>Free. Instant. No account required — though logging in ties earnings to your profile.</p>
            <form className="referral-page__form" onSubmit={handleCreate}>
              <label>
                Your name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Richard Torres"
                  required
                />
              </label>
              <label>
                Your email <span className="referral-page__req">*</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button
                type="submit"
                className="referral-page__btn referral-page__btn--primary"
                disabled={registering}
              >
                {registering ? 'Registering…' : 'Generate my referral code'}
              </button>
              {!isLoggedIn ? (
                <p className="referral-page__hint">
                  <Link to="/login?next=%2Freferral">Sign in</Link> to tie your code to your account and access the full payout dashboard.
                </p>
              ) : null}
            </form>
          </section>
        ) : (
          <>
            <section className="referral-page__dashboard section-card">
              <p className="pill">Your referral code</p>
              <h2>{data.code}</h2>
              <div className="referral-page__freshness" role="status">
                {statsState === 'live' ? (
                  <>
                    <span className="referral-page__freshnessBadge referral-page__freshnessBadge--live">Live</span>
                    <span className="referral-page__muted">Stats refreshed {formatRefreshTime(lastRefreshAt)} from the online ledger.</span>
                  </>
                ) : null}
                {statsState === 'loading' ? (
                  <>
                    <span className="referral-page__freshnessBadge">Loading…</span>
                    <span className="referral-page__muted">Reading your stats from the online ledger.</span>
                  </>
                ) : null}
                {statsState === 'stale' ? (
                  <>
                    <span className="referral-page__freshnessBadge referral-page__freshnessBadge--stale">Saved data — not live</span>
                    <span className="referral-page__muted">
                      Live stats unavailable ({statsError || 'network error'}). Showing last saved values
                      {lastRefreshAt ? ` from ${formatRefreshTime(lastRefreshAt)}` : ''} — they may be out of date.
                    </span>
                    <button type="button" className="referral-page__btn" onClick={() => fetchLiveStats(data)}>
                      Retry live stats
                    </button>
                  </>
                ) : null}
                {statsState === 'unavailable' ? (
                  <>
                    <span className="referral-page__freshnessBadge referral-page__freshnessBadge--unavailable">Stats unavailable</span>
                    <span className="referral-page__muted">
                      Could not reach the online ledger ({statsError || 'network error'}) and nothing is saved on this
                      device. Balances below are unknown — not $0.
                    </span>
                    <button type="button" className="referral-page__btn" onClick={() => fetchLiveStats(data)}>
                      Retry live stats
                    </button>
                  </>
                ) : null}
              </div>
              <div className="referral-page__linkRow">
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  className="referral-page__linkInput"
                  aria-label="Your referral link"
                />
                <button
                  type="button"
                  className="referral-page__btn referral-page__btn--primary"
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied!' : 'Copy link'}
                </button>
              </div>
              <div className="referral-page__stats">
                <div className="referral-page__stat">
                  <span>Code</span>
                  <strong>{data.code}</strong>
                </div>
                <div className="referral-page__stat">
                  <span>Created</span>
                  <strong>{new Date(data.createdAt).toLocaleDateString()}</strong>
                </div>
                <div className="referral-page__stat">
                  <span>Link clicks</span>
                  <strong>{statsState === 'unavailable' ? '—' : (live?.clicks ?? data.clicks ?? 0)}</strong>
                </div>
                <div className="referral-page__stat">
                  <span>Referrals</span>
                  <strong>{statsState === 'unavailable' ? '—' : (live?.sales ?? data.sales ?? 0)}</strong>
                </div>
                <div className="referral-page__stat">
                  <span>Conversion</span>
                  <strong>
                    {statsState === 'unavailable'
                      ? '—'
                      : formatConversion(live?.clicks ?? data.clicks ?? 0, live?.sales ?? data.sales ?? 0)}
                  </strong>
                </div>
                <div className="referral-page__stat">
                  <span>Earnings</span>
                  <strong>
                    {statsState === 'unavailable'
                      ? 'Unknown'
                      : `$${((live?.totalCommissionsCents ?? data.totalCommissionsCents ?? 0) / 100).toFixed(2)}`}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                className="referral-page__btn referral-page__btn--ghost"
                onClick={() => { saveData(null); localStorage.removeItem(STORAGE_KEY); setData(null); setLive(null); setStatsState('unavailable'); setMsg(''); }}
              >
                Reset and create new code
              </button>
            </section>

            <ActivityList
              payouts={statsState === 'unavailable' ? null : (live?.payouts ?? [])}
              recent={statsState === 'unavailable' ? null : (live?.recent ?? [])}
            />

            <section className="referral-page__send section-card">
              <p className="pill">Send your code by email</p>
              <h2>Invite someone directly</h2>
              <p>
                Enter their email and we will open your email client or send via our free email service.
                No spam. Single send. Your code is embedded in the message automatically.
              </p>
              <form className="referral-page__form" onSubmit={handleSendEmail}>
                <label>
                  Recipient name <span className="referral-page__optional">(optional)</span>
                  <input
                    type="text"
                    value={sendName}
                    onChange={(e) => setSendName(e.target.value)}
                    placeholder="Their name"
                  />
                </label>
                <label>
                  Recipient email
                  <input
                    type="email"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    placeholder="friend@example.com"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="referral-page__btn referral-page__btn--primary"
                  disabled={busy}
                >
                  {busy ? 'Sending…' : 'Send referral invite'}
                </button>
              </form>
            </section>
          </>
        )}

        <section className="referral-page__faq section-card">
          <p className="pill">FAQ</p>
          <h2>Common questions</h2>
          <dl className="referral-page__faqList">
            <dt>Does this cost anything?</dt>
            <dd>Nothing. The referral program is completely free to join and use forever.</dd>
            <dt>When do I get paid?</dt>
            <dd>Earnings accumulate as purchases are made through your link. Payouts are processed when your balance reaches the threshold and a payment method is connected. We will notify you by email if you provided one.</dd>
            <dt>How is my commission tracked?</dt>
            <dd>Your referral code is attached to every link click via URL parameter. When someone arrives at PVA Bazaar through your link and completes a purchase, the system records the connection.</dd>
            <dt>Can I have multiple codes?</dt>
            <dd>One code per device/browser for now. Logging into your account consolidates everything.</dd>
            <dt>What if someone uses my code but doesn't buy right away?</dt>
            <dd>Your code is saved in their browser for 30 days. Any purchase they make within that window counts toward your commission.</dd>
          </dl>
        </section>

        <div className="referral-page__actions">
          <Link className="referral-page__btn" to="/marketplace">Browse marketplace</Link>
          <Link className="referral-page__btn" to="/books">Browse books</Link>
          <Link className="referral-page__btn" to="/partners">Business partners</Link>
          {isLoggedIn ? (
            <Link className="referral-page__btn" to="/dashboard">My dashboard</Link>
          ) : (
            <Link className="referral-page__btn referral-page__btn--primary" to="/register">Create account</Link>
          )}
        </div>
      </section>
    </>
  );
}

// Note: ActivityList is used in JSX above; the repo eslint config has no React
// plugin, so JSX usage alone does not satisfy no-unused-vars.
// eslint-disable-next-line no-unused-vars
function ActivityList({ payouts = [], recent = [] }) {
  // `null` means the activity feed could not be loaded (API unreachable) —
  // that is "unknown", never "no activity".
  if (payouts === null || recent === null) {
    return (
      <section className="referral-page__send section-card">
        <p className="pill">Activity</p>
        <h2>Your recent activity</h2>
        <p>
          Activity is currently unavailable — the online ledger could not be reached.
          This does not mean you have no activity. Retry live stats above.
        </p>
      </section>
    );
  }
  if (payouts.length === 0 && recent.length === 0) {
    return (
      <section className="referral-page__send section-card">
        <p className="pill">Activity</p>
        <h2>Your recent activity</h2>
        <p>
          No activity yet. Share your link — every click and purchase through it will show up here,
          along with any payouts.
        </p>
      </section>
    );
  }

  const rows = [
    ...payouts.map((p) => ({
      key: `payout-${p.batchId || p.createdAt}`,
      kind: 'Payout',
      detail: p.status === 'completed' ? 'Paid out' : `Status: ${p.status}`,
      amountCents: p.netPayoutCents ?? 0,
      sub: `${p.orderCount ?? 0} order(s) · batch ${String(p.batchId || '').slice(0, 8)}`,
      date: p.createdAt,
    })),
    ...recent.map((entry) => ({
      key: `sale-${entry.orderId || entry._id || entry.createdAt}`,
      kind: 'Sale',
      detail: entry.itemName ? String(entry.itemName).slice(0, 60) : 'Purchase via your link',
      amountCents: entry.commissionCents ?? 0,
      sub: entry.orderId ? `Order ${String(entry.orderId).slice(0, 12)}` : 'Commission recorded',
      date: entry.createdAt || entry.settledAt,
    })),
  ];

  return (
    <section className="referral-page__send section-card">
      <p className="pill">Activity</p>
      <h2>Your recent activity</h2>
      <ul className="referral-page__activity">
        {rows.slice(0, 12).map((row) => (
          <li key={row.key} className="referral-page__activityRow">
            <span className="referral-page__activityKind">{row.kind}</span>
            <span className="referral-page__activityDetail">
              <strong>{row.detail}</strong>
              <small>{row.sub} · {new Date(row.date).toLocaleDateString()}</small>
            </span>
            <span className="referral-page__activityAmount">
              {row.amountCents >= 0 ? '+' : ''}${(Math.abs(row.amountCents) / 100).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
