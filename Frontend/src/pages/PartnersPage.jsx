import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getPreferredApiBase } from '../lib/apiBase';
import './PartnersPage.css';

const PARTNERS_KEY = 'pva:partners-directory';

// ── seed partners shown until backend list is populated ──────────────────────
const SEED_PARTNERS = [
  {
    id: 'pvabazaar',
    name: 'PVA Bazaar',
    tagline: 'Global marketplace for knowledge, resources, and real trade.',
    description:
      'PVA Bazaar connects farmers, miners, manufacturers, educators, researchers, and traders around the world. We handle publishing, sourcing, logistics, and international trade from one platform.',
    categories: ['Marketplace', 'Trade', 'Publishing', 'Education'],
    website: 'https://pvabazaar.org',
    contact: 'contact@pvabazaar.org',
    location: 'Global',
    featured: true,
    approved: true,
  },
];

function loadPartners() {
  try {
    const raw = localStorage.getItem(PARTNERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function savePartners(list) {
  try {
    localStorage.setItem(PARTNERS_KEY, JSON.stringify(list));
  } catch (_e) { /* ignore */ }
}

function allPartners() {
  const local = loadPartners();
  const merged = [...SEED_PARTNERS];
  for (const p of local) {
    if (!merged.some((m) => m.id === p.id)) merged.push(p);
  }
  return merged;
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
  const base = getPreferredApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/partners/public`);
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data?.partners) ? data.partners.map(mapApiPartner) : [];
    savePartners(list);
    return list;
  } catch (_err) {
    return null;
  }
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
  const [partners, setPartners] = useState([]);
  const [filter, setFilter]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => {
    // Prefer the backend approved directory; fall back to the local cache + seed.
    let cancelled = false;
    fetchApprovedPartners().then((remote) => {
      if (cancelled) return;
      if (remote) {
        setPartners(remote);
      } else {
        setPartners(allPartners().filter((p) => p.approved));
      }
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
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCategory(cat) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function handleApply(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Business name is required.'); return; }
    if (!form.description.trim()) { setErr('Description is required.'); return; }
    if (!form.contact.trim()) { setErr('Contact email is required.'); return; }

    const record = {
      id: `partner-${Date.now()}`,
      ...form,
      approved: false, // awaiting admin review
      appliedAt: new Date().toISOString(),
    };

    // Submit to the backend so the team actually sees it (and can email the
    // business a live partner page link). If the API is unreachable we keep a
    // local copy so the application is never silently lost.
    const submitBackend = async () => {
      const base = getPreferredApiBase();
      if (base) {
        try {
          const res = await fetch(`${base}/api/partners/apply`, {
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
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const existing = loadPartners();
            savePartners([...existing, record]);
            setSubmitted(true);
            setShowForm(false);
            setForm(EMPTY_FORM);
            setErr('');
            return;
          }
        } catch (_apiErr) { /* fall back to local save below */ }
      }
      const existing = loadPartners();
      savePartners([...existing, record]);
      setSubmitted(true);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErr('');
    };
    submitBackend();
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

        {submitted ? (
          <div className="partners-page__success" role="status">
            Application received. The team will review it and contact you at the email you provided. Once approved,
            your business page goes live here automatically.
          </div>
        ) : null}

        {showForm ? (
          <section className="partners-page__form-section section-card">
            <p className="pill">Apply</p>
            <h2>Business listing application</h2>
            <p>Fill in your details. All fields marked required must be completed. We read every application.</p>
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
              <button type="submit" className="partners-page__btn partners-page__btn--primary">
                Submit application
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
          <span className="pill">{visible.length} partner{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {visible.length === 0 ? (
          <p className="partners-page__empty">No partners match your search. <button type="button" className="partners-page__link" onClick={() => { setFilter(''); setCatFilter(''); }}>Clear filters</button></p>
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
