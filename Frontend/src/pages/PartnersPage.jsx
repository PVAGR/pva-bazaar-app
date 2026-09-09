import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Helmet } from 'react-helmet-async';
// eslint-disable-next-line no-unused-vars -- used in JSX below (repo eslint config has no React plugin)
import { Link } from 'react-router-dom';
import { apiUrl } from '../lib/apiBase';
import './PartnersPage.css';

/**
 * Partner storage contract (canonical architecture):
 * - The approved directory is SERVER-AUTHORITATIVE. Cards come from
 *   GET /partners/public (MongoDB PartnerProfile, status:'approved') only.
 * - `pva:partner-application-draft` holds a crash-recovery copy of the
 *   application FORM on this device only. It is never rendered as a
 *   directory entry and never implies submission or approval.
 * - `pva:partner-application-receipt` holds the server's confirmation
 *   (submission id + status) after a successful POST. It is a receipt,
 *   not a directory record.
 * - The flagship PVA Bazaar profile is seeded SERVER-SIDE
 *   (ensureSeedProfile in backend/routes/partners.js), so no frontend seed
 *   is merged into the directory.
 */
const DRAFT_KEY = 'pva:partner-application-draft';
const RECEIPT_KEY = 'pva:partner-application-receipt';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

function saveDraft(form) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, savedAt: new Date().toISOString() }));
  } catch (_e) { /* ignore quota */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (_e) { /* ignore */ }
}

function loadReceipt() {
  try {
    const raw = localStorage.getItem(RECEIPT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

function saveReceipt(receipt) {
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify(receipt));
  } catch (_e) { /* ignore quota */ }
}

// Map the backend public partner shape onto the card fields used for display.
function mapApiPartner(p) {
  return {
    id: p.slug || `${p.businessName}-${p.updatedAt || ''}`,
    name: p.businessName,
    tagline: p.headline || '',
    description: p.summary || '',
    categories: p.businessType ? [p.businessType] : [],
    website: p.website || '',
    location: '',
    featured: false,
    approved: true,
  };
}

async function fetchApprovedPartners() {
  const res = await fetch(apiUrl('/partners/public'));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `Partner directory request failed (${res.status})`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) {
    throw new Error(data?.error || data?.message || 'Partner directory request failed');
  }
  const list = Array.isArray(data?.partners) ? data.partners.map(mapApiPartner) : [];
  return list;
}

const ALL_CATEGORIES = [
  'Agriculture', 'Manufacturing', 'Trade', 'Logistics', 'Education',
  'Research', 'Mining', 'Publishing', 'Technology', 'Services',
  'Healthcare', 'Finance', 'Media', 'Government', 'NGO', 'Other',
];

const EMPTY_FORM = {
  name: '',
  tagline: '',
  description: '',
  categories: [],
  website: '',
  contact: '',
  location: '',
};

export default function PartnersPage() {
  // `partners` = ONLINE approved directory only (production API → MongoDB).
  // It is never merged with browser records. `directoryError` is set when the
  // API is unreachable, and the directory stays visibly empty + explained.
  const [partners, setPartners] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [filter, setFilter]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  // Submission lifecycle: idle → submitting → submitted-online | failed.
  // Only the backend response may establish "submitted-online".
  const [submissionState, setSubmissionState] = useState('idle');
  const [submissionReceipt, setSubmissionReceipt] = useState(() => loadReceipt());
  const [draftRestored, setDraftRestored] = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => {
    let cancelled = false;
    // Restore an unsubmitted device-only draft into the form (crash recovery).
    const draft = loadDraft();
    if (draft && (draft.name || draft.description || draft.contact)) {
      setForm({ ...EMPTY_FORM, ...draft });
      setDraftRestored(true);
    }
    setDirectoryLoading(true);
    setDirectoryError('');
    fetchApprovedPartners().then((remote) => {
      if (cancelled) return;
      // Server is authoritative: show exactly what it returned. An
      // application that is still pending review never appears here.
      setPartners(remote);
      setDirectoryLoading(false);
    }).catch((error) => {
      if (cancelled) return;
      // Online directory failed: keep the list EMPTY and say so explicitly.
      // Browser records must never masquerade as approved partners.
      setPartners([]);
      setDirectoryError(error?.message || 'Online partner directory is temporarily unavailable.');
      setDirectoryLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const visible = partners.filter((p) => {
    const query = filter.toLowerCase();
    if (catFilter && !p.categories?.includes(catFilter)) return false;
    if (!query) return true;
    return (
      `${p.name} ${p.tagline} ${p.description} ${p.location}`.toLowerCase().includes(query)
    );
  });

  function handleField(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Autosave the form on this device only (crash recovery). This draft
      // is NOT a submission and never enters the directory.
      saveDraft(next);
      return next;
    });
  }

  function toggleCategory(cat) {
    setForm((prev) => {
      const next = {
        ...prev,
        categories: prev.categories.includes(cat)
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
      saveDraft(next);
      return next;
    });
  }

  async function handleApply(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Business name is required.'); return; }
    if (!form.description.trim()) { setErr('Description is required.'); return; }
    if (!form.contact.trim()) { setErr('Contact email is required.'); return; }

    // Submit to the backend so the team actually sees it. The application
    // counts as submitted ONLY when the server confirms it (201, or 200 for
    // a duplicate already on file). Anything else keeps the form as a
    // device-only draft with a clear error and retry path.
    setSubmissionState('submitting');
    setErr('');
    try {
      const res = await fetch(apiUrl('/partners/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.contact.trim(),
          company: form.name.trim(),
          website: form.website.trim(),
          message: form.description.trim(),
          businessType: form.categories[0] || '',
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result?.ok === false) {
        throw new Error(result?.message || result?.error || `Application request failed (${res.status})`);
      }
      const receipt = {
        id: result?.data?.id || '',
        name: result?.data?.name || form.name.trim(),
        email: result?.data?.email || form.contact.trim(),
        status: result?.data?.status || 'new',
        duplicate: Boolean(result?.duplicate),
        submittedAt: new Date().toISOString(),
      };
      saveReceipt(receipt);
      setSubmissionReceipt(receipt);
      clearDraft();
      setDraftRestored(false);
      setSubmissionState('submitted-online');
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErr('');
    } catch (submitErr) {
      // Online submission failed: the application was NOT received. Keep the
      // user's work as a labeled device-only draft so nothing is lost, and
      // explain exactly how to retry. Never claim submission or approval.
      saveDraft(form);
      setSubmissionState('failed');
      setErr(
        `Application NOT submitted — the server could not be reached (${submitErr?.message || 'network error'}). ` +
        'Your answers are saved on this device only. Please retry once you are back online; nothing has been sent or approved.',
      );
    }
  }

  return (
    <>
      <Helmet>
        <title>Business Partners · PVA Bazaar</title>
        <meta
          name="description"
          content="Businesses, suppliers, and institutions working with PVA Bazaar. Apply to add your own partner page to the directory."
        />
      </Helmet>

      <section className="partners-page section-card">
        <header className="partners-page__hero">
          <div>
            <p className="pill">Partner directory</p>
            <h1>Businesses that work with PVA Bazaar</h1>
            <p className="partners-page__lead">
              Every business listed here has been accepted into the PVA Bazaar network. Each one has its own page
              describing what they do, what they trade, and how to connect with them. Apply below to add your own.
            </p>
          </div>
          <aside className="partners-page__panel">
            <h2>Add your business</h2>
            <p>
              Submit an application. Once approved by the team, your business gets its own page in this directory
              that you can customize — your story, your categories, your contact.
            </p>
            <button
              type="button"
              className="partners-page__btn partners-page__btn--primary"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Close application' : 'Apply for listing'}
            </button>
          </aside>
        </header>

        {submissionState === 'submitted-online' && submissionReceipt ? (
          <div className="partners-page__success" role="status">
            {submissionReceipt.duplicate
              ? `Application already on file for ${submissionReceipt.email} — our team will follow up soon. Reference: ${submissionReceipt.id || 'pending'}.`
              : `Application received online for ${submissionReceipt.name}. The team will review it and contact you at ${submissionReceipt.email}. Reference: ${submissionReceipt.id || 'pending'}. ` +
                'This is a submission receipt, not an approval — your business page goes live here only after approval.'}
          </div>
        ) : null}
        {submissionState === 'failed' ? (
          <div className="partners-page__error" role="alert">
            <strong>Submission failed — saved on this device only, not submitted.</strong>{' '}
            Reopen the application below to retry. Your answers were kept.
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="partners-page__btn partners-page__btn--primary"
                onClick={() => { setShowForm(true); setErr(''); }}
              >
                Reopen application to retry
              </button>
            </div>
          </div>
        ) : null}

        {showForm ? (
          <section className="partners-page__form-section section-card">
            <p className="pill">Apply</p>
            <h2>Business listing application</h2>
            <p>Fill in your details. All fields marked required must be completed. We read every application.</p>
            {draftRestored ? (
              <p className="partners-page__muted" role="status">
                Restored your unsubmitted draft from this device. It has NOT been sent — submit below to send it online.
              </p>
            ) : null}
            {err ? <div className="partners-page__error" role="alert">{err}</div> : null}
            <form className="partners-page__form" onSubmit={handleApply}>
              <label>
                Business name <span className="partners-page__req">*</span>
                <input name="name" value={form.name} onChange={handleField} placeholder="Your company or trading name" required />
              </label>
              <label>
                Tagline
                <input name="tagline" value={form.tagline} onChange={handleField} placeholder="One sentence about what you do" />
              </label>
              <label>
                Description <span className="partners-page__req">*</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleField}
                  rows={5}
                  placeholder="Describe your business — what you trade, manufacture, supply, or offer. Be specific and honest."
                  required
                />
              </label>
              <div className="partners-page__fieldGroup">
                <span>Categories <span className="partners-page__req">*</span></span>
                <div className="partners-page__catGrid">
                  {ALL_CATEGORIES.map((cat) => (
                    <label key={cat} className="partners-page__catLabel">
                      <input
                        type="checkbox"
                        checked={form.categories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Website
                <input name="website" type="url" value={form.website} onChange={handleField} placeholder="https://yourbusiness.com" />
              </label>
              <label>
                Contact email <span className="partners-page__req">*</span>
                <input name="contact" type="email" value={form.contact} onChange={handleField} placeholder="contact@yourbusiness.com" required />
              </label>
              <label>
                Location / Country
                <input name="location" value={form.location} onChange={handleField} placeholder="e.g. Nairobi, Kenya" />
              </label>
              <button
                type="submit"
                className="partners-page__btn partners-page__btn--primary"
                disabled={submissionState === 'submitting'}
              >
                {submissionState === 'submitting' ? 'Submitting…' : 'Submit application'}
              </button>
            </form>
          </section>
        ) : null}

        <div className="partners-page__controls">
          <input
            type="search"
            className="partners-page__search"
            placeholder="Search partners by name, category, or location…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search partners"
          />
          <select
            className="partners-page__catSelect"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="partners-page__count">
          <span className="pill">{visible.length} approved partner{visible.length !== 1 ? 's' : ''} · online directory</span>
        </div>

        {directoryLoading ? (
          <p className="partners-page__muted" role="status">Loading the online partner directory…</p>
        ) : null}
        {!directoryLoading && directoryError ? (
          <div className="partners-page__error" role="alert">
            <strong>Online partner directory is temporarily unavailable:</strong> {directoryError} No
            browser-local records are shown as approved partners.
          </div>
        ) : null}

        {visible.length === 0 ? (
          <p className="partners-page__empty">
            {directoryError
              ? 'The approved directory could not be loaded.'
              : 'No approved partners match your search.'}{' '}
            <button type="button" className="partners-page__link" onClick={() => { setFilter(''); setCatFilter(''); }}>Clear filters</button>
          </p>
        ) : (
          <ul className="partners-page__grid">
            {visible.map((partner) => (
              <li key={partner.id} className={`partners-page__card${partner.featured ? ' is-featured' : ''}`}>
                <div className="partners-page__cardHead">
                  {partner.featured ? <span className="pill">Featured</span> : null}
                  <h2>{partner.name}</h2>
                  {partner.tagline ? <p className="partners-page__tagline">{partner.tagline}</p> : null}
                </div>
                <p className="partners-page__desc">{partner.description}</p>
                <div className="partners-page__cats">
                  {(partner.categories || []).map((cat) => (
                    <span key={cat} className="partners-page__cat">{cat}</span>
                  ))}
                </div>
                <div className="partners-page__meta">
                  {partner.location ? <span>📍 {partner.location}</span> : null}
                </div>
                <div className="partners-page__cardActions">
                  {partner.website ? (
                    <a
                      href={partner.website}
                      className="partners-page__btn"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Visit website
                    </a>
                  ) : null}
                  {partner.contact ? (
                    <a href={`mailto:${partner.contact}`} className="partners-page__btn">
                      Contact
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="partners-page__cta section-card">
          <div>
            <p className="pill">Join the network</p>
            <h2>Your business can be listed here.</h2>
            <p>
              PVA Bazaar is free to join as a listed partner. Once approved, you have your own directory card that
              links to your website and contact. As the platform grows, so does your visibility in the global network.
            </p>
          </div>
          <div className="partners-page__ctaActions">
            <button
              type="button"
              className="partners-page__btn partners-page__btn--primary"
              onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Apply now — it's free
            </button>
            <Link className="partners-page__btn" to="/marketplace">Browse marketplace</Link>
            <Link className="partners-page__btn" to="/referral">Referral program</Link>
          </div>
        </section>
      </section>
    </>
  );
}
