import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import SectionIntro from '../components/SectionIntro.jsx';
import { fetchVerificationByArtifact, fetchVerificationByCertificate } from '../lib/api';
import './VerificationPage.css';

const EMPTY = { state: 'idle', verification: null };

export default function VerificationPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initial = (searchParams.get('q') || '').trim();
    if (!initial) return;
    setQuery(initial);
    let mounted = true;
    setBusy(true);
    setResult({ state: 'loading', verification: null });
    (async () => {
      let response = await fetchVerificationByArtifact(initial);
      if (!response.ok) {
        response = await fetchVerificationByCertificate(initial);
      }
      if (!mounted) return;
      if (response.ok && response.verification) {
        setResult({ state: 'found', verification: response.verification });
      } else if (response.error === 'not-found') {
        setResult({ state: 'missing', verification: null });
      } else {
        setResult({ state: 'unavailable', verification: null });
      }
      setBusy(false);
    })();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const lookup = async (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value || busy) return;
    setBusy(true);
    setResult({ state: 'loading', verification: null });

    let response = await fetchVerificationByArtifact(value);
    if (!response.ok) {
      response = await fetchVerificationByCertificate(value);
    }

    if (response.ok && response.verification) {
      setResult({ state: 'found', verification: response.verification });
    } else if (response.error === 'not-found') {
      setResult({ state: 'missing', verification: null });
    } else {
      setResult({ state: 'unavailable', verification: null });
    }
    setBusy(false);
  };

  const v = result.verification;
  const verified = Boolean(v?.is_authentic) && Number(v?.confidence_score ?? 0) >= 1;
  const compromised = v && (v.status === 'integrity_compromised' || v.status === 'error');
  const sealClass = verified
    ? 'verification-result__seal--verified'
    : compromised
      ? 'verification-result__seal--compromised'
      : 'verification-result__seal--pending';
  const sealLabel = verified ? 'VERIFIED' : compromised ? 'INTEGRITY COMPROMISED' : 'UNVERIFIED';

  return (
    <section className="verification-page">
      <Helmet>
        <title>Verification · PVA Bazaar</title>
        <meta
          name="description"
          content="Check the provenance of any PVA Bazaar artifact: search by artifact ID, slug, or certificate number and read its verification record."
        />
        <link rel="canonical" href="https://pvabazaar.org/verification" />
      </Helmet>

      <SectionIntro
        badge="Trust"
        title="Check any artifact's chain."
        promise="Enter an artifact ID, listing slug, or certificate number. The record shows who verified it, when, and the hash that proves the file has not changed since."
      />

      <form className="verification-lookup" onSubmit={lookup} aria-label="Verification lookup">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artifact ID, slug, or certificate number"
          aria-label="Artifact ID, slug, or certificate number"
        />
        <button type="submit" className="pva-btn pva-btn--primary" disabled={busy || !query.trim()}>
          {busy ? 'Checking…' : 'Verify'}
        </button>
      </form>

      {result.state === 'loading' ? (
        <p className="verification-note">Reading the ledger…</p>
      ) : null}

      {result.state === 'missing' ? (
        <div className="verification-empty">
          <h2>No record found</h2>
          <p>
            Nothing in the verification ledger matches that ID yet. If you received a certificate,
            double-check the number; otherwise contact the seller for the correct identifier.
          </p>
        </div>
      ) : null}

      {result.state === 'unavailable' ? (
        <div className="verification-empty">
          <h2>Lookup unavailable</h2>
          <p>The verification service could not be reached. Try again in a moment.</p>
        </div>
      ) : null}

      {v ? (
        <article className="verification-result">
          <div className={`verification-result__seal ${sealClass}`}>
            <span>{sealLabel}</span>
            {typeof v.confidence_score !== 'undefined' ? (
              <small>confidence {Math.round(Number(v.confidence_score || 0) * 100)}%</small>
            ) : null}
          </div>

          <dl className="verification-result__facts">
            {v.certificateId ? (
              <div><dt>Certificate</dt><dd className="mono">{v.certificateId}</dd></div>
            ) : null}
            <div><dt>Status</dt><dd>{v.status || 'recorded'}</dd></div>
            <div>
              <dt>Verified at</dt>
              <dd>{v.verified_at ? new Date(v.verified_at).toLocaleString() : 'unknown date'}</dd>
            </div>
          </dl>

          {v.message ? <p className="verification-result__message">{v.message}</p> : null}

          {v.computed_hash ? (
            <div className="verification-result__hash">
              <span>Computed hash</span>
              <code className="mono">{v.computed_hash}</code>
            </div>
          ) : null}
        </article>
      ) : null}

      {!v && result.state === 'idle' ? (
        <p className="verification-hint">
          Tip: every verified listing on the Marketplace carries an ID you can paste here.
        </p>
      ) : null}
    </section>
  );
}
