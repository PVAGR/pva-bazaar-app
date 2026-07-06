import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { ENV } from '../config/env';
import SellerFAQ from '../components/SellerFAQ.jsx';
import './CreatorPortalPage.css';

const TAB_KEYS = ['dashboard', 'submit', 'submissions'];
const SUBMISSION_STORAGE_KEY = 'pva-creator-submissions';

function getSafeTab(tab) {
  return TAB_KEYS.includes(tab) ? tab : 'dashboard';
}

export default function CreatorPortalPage() {
  const authenticated = Boolean(getToken());
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fileNames, setFileNames] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [savedSubmissions, setSavedSubmissions] = useState([]);

  const deepLink = useMemo(
    () => `${window.location.origin}${window.location.pathname}#/creator?tab=submit`,
    [],
  );

  const formAction = (ENV.CREATOR_FORM_ACTION || '').trim();
  const formNext = useMemo(
    () =>
      `${window.location.origin}${window.location.pathname}#/creator?tab=submissions&submitted=1`,
    [],
  );

  useEffect(() => {
    try {
      const tabFromUrl = searchParams.get('tab');
      const legacyTabMatch = window.location.href.match(/tab-(\d+)/i);

      if (tabFromUrl) {
        setActiveTab(getSafeTab(tabFromUrl));
      } else if (legacyTabMatch) {
        const index = Number(legacyTabMatch[1]);
        setActiveTab(getSafeTab(TAB_KEYS[index]));
      }

      const stored = JSON.parse(localStorage.getItem(SUBMISSION_STORAGE_KEY) || '[]');
      if (Array.isArray(stored)) {
        setSavedSubmissions(stored);
      }

      if (searchParams.get('submitted') === '1') {
        setSubmitMessage(
          'Submission sent. Check your submission history and follow-up channel for next steps.',
        );
      }
    } catch (_err) {
      // Ignore URL or storage parse issues and keep defaults.
    }
  }, [searchParams]);

  const updateTab = (tab) => {
    const nextTab = getSafeTab(tab);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', nextTab);
    params.delete('submitted');
    setSearchParams(params, { replace: true });
  };

  const handleFilesChanged = (event) => {
    const files = Array.from(event.target.files || []);
    setFileNames(files.map((file) => file.name).join(', '));
  };

  const handleSubmit = (event) => {
    if (!formAction) {
      event.preventDefault();
      setSubmitMessage('Configure VITE_CREATOR_FORM_ACTION to enable intake delivery.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const photos = Array.from(event.currentTarget.photos?.files || []);
    const totalSize = photos.reduce((sum, file) => sum + file.size, 0);

    if (photos.length > 10) {
      event.preventDefault();
      setSubmitMessage('Upload up to 10 photos only.');
      return;
    }

    if (totalSize > 20 * 1024 * 1024) {
      event.preventDefault();
      setSubmitMessage('Total upload size must be 20 MB or less.');
      return;
    }

    const localRecord = {
      id: `sub-${Date.now()}`,
      itemName: String(formData.get('item_name') || '').trim(),
      price: String(formData.get('price') || '').trim(),
      category: String(formData.get('category') || '').trim() || 'Uncategorized',
      submitterName: String(formData.get('submitter_name') || '').trim() || 'Unknown',
      createdAt: new Date().toISOString(),
      status: 'Sent',
    };

    const nextSaved = [localRecord, ...savedSubmissions].slice(0, 30);
    setSavedSubmissions(nextSaved);
    localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(nextSaved));
  };

  return (
    <section className="creator-portal" aria-labelledby="creator-portal-title">
      <header className="creator-portal__hero">
        <h1 id="creator-portal-title">Creator Seller Portal</h1>
        <p>
          This is the supplier intake and seller workspace for PVA Bazaar. Use it when you have real
          goods, real pricing, and enough detail for a serious review.
        </p>
        <p>
          The portal is designed for sellers in Kenya, the United States, and elsewhere who want a
          professional path into the network. It is not a promise of instant publishing, automatic
          syndication, or automatic payout.
        </p>
        <p className="creator-portal__note">
          This is separate from the owner admin system. Creator accounts cannot access or modify
          main admin controls.
        </p>
        <div className="creator-portal__share">
          <p>Direct submit link for partners:</p>
          <a href={deepLink}>{deepLink}</a>
        </div>
      </header>

      <section className="creator-card creator-portal__atlas" aria-label="Private atlas">
        <h2>Private atlas</h2>
        <p className="creator-portal__atlasCopy">
          Move through the same knowledge bazaar from one private tool to the next without losing
          the thread.
        </p>
        <div className="creator-portal__atlasLinks">
          <Link to="/" className="creator-btn">
            Home
          </Link>
          <Link to="/archive" className="creator-btn">
            Archive
          </Link>
          <Link to="/recovery" className="creator-btn">
            Recovery
          </Link>
          <Link to="/marketplace" className="creator-btn">
            Marketplace
          </Link>
          <Link to="/dashboard" className="creator-btn">
            Command Center
          </Link>
          <Link to="/broker-hub" className="creator-btn">
            Broker Hub
          </Link>
        </div>
      </section>

      <section className="creator-portal__infoGrid" aria-label="Supplier standards">
        <article className="creator-card">
          <h2>What to prepare</h2>
          <ul className="creator-list">
            <li>Clear product name, category, and honest condition details.</li>
            <li>Photos that show the item well enough for review.</li>
            <li>Real asking price and basic origin or maker context.</li>
            <li>Reliable contact information for follow-up.</li>
          </ul>
        </article>

        <article className="creator-card">
          <h2>What to expect</h2>
          <ul className="creator-list">
            <li>
              Your submission is sent through the configured intake endpoint and saved in this
              browser history.
            </li>
            <li>
              PVA can review the submission before it becomes part of a wider selling workflow.
            </li>
            <li>
              Deeper listing, deal, or payout steps depend on the actual relationship and product
              fit.
            </li>
            <li>
              Use the portal to begin a serious record, not to flood the system with weak entries.
            </li>
          </ul>
        </article>

        <article className="creator-card">
          <h2>What this portal is not</h2>
          <ul className="creator-list">
            <li>Not the main admin system.</li>
            <li>Not an instant approval queue for every product.</li>
            <li>Not a guarantee of automated external marketplace posting.</li>
            <li>Not a substitute for honest sourcing, fulfillment, and communication.</li>
          </ul>
        </article>
      </section>

      <div className="creator-portal__tabs" role="tablist" aria-label="Creator portal tabs">
        <button
          type="button"
          className={`creator-tab ${activeTab === 'dashboard' ? 'is-active' : ''}`}
          onClick={() => updateTab('dashboard')}
          role="tab"
          aria-selected={activeTab === 'dashboard'}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`creator-tab ${activeTab === 'submit' ? 'is-active' : ''}`}
          onClick={() => updateTab('submit')}
          role="tab"
          aria-selected={activeTab === 'submit'}
        >
          Submit New Items
        </button>
        <button
          type="button"
          className={`creator-tab ${activeTab === 'submissions' ? 'is-active' : ''}`}
          onClick={() => updateTab('submissions')}
          role="tab"
          aria-selected={activeTab === 'submissions'}
        >
          My Submissions
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="creator-portal__cards">
          <article className="creator-card">
            <h2>1. Create your account</h2>
            <p>
              Sign up as a creator or seller so your submissions and listing work stay tied to your
              own account.
            </p>
            <Link to="/register?next=%2Fonboarding" className="creator-btn creator-btn--primary">
              Sign up now
            </Link>
          </article>

          <article className="creator-card">
            <h2>2. Sign in and set up</h2>
            <p>
              Use standard user login, complete onboarding, and make your contact and business
              details clear.
            </p>
            <Link to="/login?next=%2Fonboarding" className="creator-btn">
              Sign in (User)
            </Link>
          </article>

          <article className="creator-card">
            <h2>3. Submit goods for review</h2>
            <p>
              Use the intake flow when you have clear photos, pricing, and enough detail for a real
              evaluation.
            </p>
            <button type="button" onClick={() => updateTab('submit')} className="creator-btn">
              Open submit tab
            </button>
          </article>

          <article className="creator-card">
            <h2>4. Manage your listings</h2>
            <p>
              Track your own listings and submission history without touching platform admin tools.
            </p>
            <Link
              to={authenticated ? '/items/mine' : '/login?next=%2Fitems%2Fmine'}
              className="creator-btn"
            >
              Open my listings
            </Link>
          </article>

          <article className="creator-card">
            <h2>5. Review seller analytics</h2>
            <p>
              Open the creator dashboard for royalty and sales analytics when that data is relevant
              to your account.
            </p>
            <Link
              to={authenticated ? '/creator/dashboard' : '/login?next=%2Fcreator%2Fdashboard'}
              className="creator-btn"
            >
              Open royalty dashboard
            </Link>
          </article>
        </div>
      ) : null}

      {activeTab === 'submit' ? (
        <article className="creator-card creator-card--form" aria-label="Submit new items form">
          <h2>Submit New Items</h2>
          <p>
            Send photos, item details, and price. Submissions are delivered to your configured
            intake endpoint and are also saved locally in this browser history.
          </p>
          <div className="creator-inlineGrid">
            <div className="creator-inlineNote">
              <strong>Before you submit</strong>
              <p>Only submit goods you can accurately describe, price, and fulfill.</p>
            </div>
            <div className="creator-inlineNote">
              <strong>After you submit</strong>
              <p>
                Use the history tab to keep your own record while follow-up and next steps are
                handled from the intake flow.
              </p>
            </div>
          </div>

          {!formAction ? (
            <p className="creator-alert">
              Set VITE_CREATOR_FORM_ACTION in your frontend environment to activate intake delivery.
            </p>
          ) : null}

          {submitMessage ? <p className="creator-alert">{submitMessage}</p> : null}

          <form
            id="creator-submission-form"
            action={formAction || undefined}
            method="POST"
            encType="multipart/form-data"
            className="creator-form"
            onSubmit={handleSubmit}
          >
            <input type="hidden" name="_subject" value="New PVA Item Submission" />
            <input type="hidden" name="_next" value={formNext} />
            <input type="hidden" name="_captcha" value="false" />

            <label className="creator-field">
              <span>Item Description / Name</span>
              <input
                type="text"
                name="item_name"
                required
                placeholder="2023 MacBook Pro 16-inch M3 Max"
              />
            </label>

            <label className="creator-field">
              <span>Detailed Description</span>
              <textarea
                name="description"
                rows="4"
                placeholder="Condition, specs, maker or origin details, quantity, and important notes"
              />
            </label>

            <div className="creator-form__row">
              <label className="creator-field">
                <span>Asking Price (USD)</span>
                <input type="number" name="price" step="0.01" required placeholder="1250.00" />
              </label>

              <label className="creator-field">
                <span>Category</span>
                <select name="category" defaultValue="">
                  <option value="">Select category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Collectibles">Collectibles</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <label className="creator-field">
              <span>Upload Photos (up to 10, max 20 MB total)</span>
              <input
                type="file"
                name="photos"
                accept="image/*"
                multiple
                required
                onChange={handleFilesChanged}
              />
              {fileNames ? <small>{fileNames}</small> : null}
            </label>

            <div className="creator-form__row">
              <label className="creator-field">
                <span>Your Name (optional)</span>
                <input type="text" name="submitter_name" />
              </label>

              <label className="creator-field">
                <span>Email for follow-up (optional)</span>
                <input type="email" name="submitter_email" />
              </label>
            </div>

            <button type="submit" className="creator-btn creator-btn--primary creator-btn--full">
              Send Submission
            </button>
          </form>
        </article>
      ) : null}

      {activeTab === 'submissions' ? (
        <article className="creator-card creator-card--table" aria-label="My submissions list">
          <h2>My Submissions</h2>
          <p>
            Recent submissions saved in this browser. Email endpoint logs are managed by your form
            provider.
          </p>

          {savedSubmissions.length === 0 ? (
            <p className="creator-empty">
              No saved submissions yet. Open Submit New Items to start.
            </p>
          ) : (
            <div className="creator-table-wrap">
              <table className="creator-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Sender</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {savedSubmissions.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.itemName}</td>
                      <td>{entry.price || '-'}</td>
                      <td>{entry.category}</td>
                      <td>{entry.submitterName}</td>
                      <td>{entry.status}</td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      ) : null}

      <SellerFAQ />
    </section>
  );
}
