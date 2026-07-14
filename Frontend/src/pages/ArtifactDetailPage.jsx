import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { fetchMarketplaceItem, fetchVerificationByArtifact, createCheckoutSession } from '../lib/api';
import VerificationBadge from '../components/VerificationBadge.jsx';
import VerificationHashBlock from '../components/VerificationHashBlock.jsx';
import { AlertModal } from '../components/ui/DialogModals.jsx';
import './ArtifactDetailPage.css';

const PLACEHOLDER = '/placeholder.png';

function formatPrice(priceCents, currency = 'USD') {
  if (typeof priceCents !== 'number') return '';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export default function ArtifactDetailPage() {
  const { slugOrId: slug } = useParams();
  const [item, setItem] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainIdx, setMainIdx] = useState(0);
  const [acquiring, setAcquiring] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    if (!slug) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetchMarketplaceItem(slug),
      fetchVerificationByArtifact(slug),
    ]).then(([itemRes, verRes]) => {
      if (!mounted) return;
      if (itemRes.ok && itemRes.item) {
        setItem(itemRes.item);
        setMainIdx(0);
      } else {
        setError(itemRes.error || 'Artifact not found');
      }
      if (verRes.ok && verRes.verification) {
        setVerification(verRes.verification);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [slug]);

  if (loading) {
    return (
      <div className="artifact-detail artifact-detail--loading">
        <div className="artifact-detail__loader" aria-live="polite">Loading artifact…</div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="artifact-detail">
        <div className="artifact-detail__error">
          <p>{error || 'Artifact not found.'}</p>
          <Link to="/marketplace" className="artifact-detail__link">← Back to Archive</Link>
        </div>
      </div>
    );
  }

  const media = Array.isArray(item.media) && item.media.length > 0 ? item.media : [PLACEHOLDER];
  const mainImage = media[mainIdx] || PLACEHOLDER;
  const price = formatPrice(item.priceCents, item.currency);
  const scarcityCount = item.stockQty != null && item.stockQty !== '' ? Number(item.stockQty) : null;
  const scarcityText = scarcityCount != null && scarcityCount >= 0
    ? `Only ${scarcityCount} preserved copies available`
    : 'Limited preservation run';
  const lore = item.lore || item.description || 'No lore recorded for this artifact.';

  return (
    <motion.div
      className="artifact-detail"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      <Helmet>
        <title>{item.name ? `${item.name} | PVA Bazaar` : 'Artifact | PVA Bazaar'}</title>
        <meta name="description" content={item.description || `Artifact: ${item.name}`} />
      </Helmet>

      <nav className="artifact-detail__nav" aria-label="Breadcrumb">
        <Link to="/marketplace" className="artifact-detail__back">← Archive</Link>
      </nav>

      <div className="artifact-detail__grid">
        {/* High-res image */}
        <motion.section
          className="artifact-detail__media"
          variants={fadeIn}
          aria-label="Artifact media"
        >
          <motion.div
            className="artifact-detail__image-wrap"
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <img
              src={mainImage}
              alt={item.name}
              className="artifact-detail__image"
            />
          </motion.div>
          {media.length > 1 && (
            <div className="artifact-detail__thumbs" role="list">
              {media.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  className={`artifact-detail__thumb ${idx === mainIdx ? 'artifact-detail__thumb--active' : ''}`}
                  aria-label={`View image ${idx + 1}`}
                  aria-pressed={idx === mainIdx}
                  onClick={() => setMainIdx(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </motion.section>

        <div className="artifact-detail__main">
          <motion.header className="artifact-detail__header" variants={fadeIn}>
            <h1 className="artifact-detail__title">{item.name}</h1>
            <div className="artifact-detail__meta">
              <span className="artifact-detail__category">{item.category}</span>
              <VerificationBadge artifactIdOrSlug={item.id || slug} theme="alchemical" />
            </div>
          </motion.header>

          {/* Scarcity Index */}
          <motion.div className="artifact-detail__scarcity" variants={fadeIn}>
            <span className="artifact-detail__scarcity-label">Scarcity index</span>
            <p className="artifact-detail__scarcity-value">{scarcityText}</p>
          </motion.div>

          {/* Verification hash (expandable) */}
          {verification && (
            <motion.div className="artifact-detail__verification" variants={fadeIn}>
              <VerificationHashBlock verification={verification} theme="alchemical" />
            </motion.div>
          )}

          {/* Lore */}
          <motion.section
            className="artifact-detail__lore"
            variants={fadeIn}
            aria-labelledby="lore-heading"
          >
            <h2 id="lore-heading" className="artifact-detail__lore-title">Lore</h2>
            <div className="artifact-detail__lore-body">
              {lore.split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </motion.section>

          {/* Initiate Acquisition */}
          <motion.div
            className="artifact-detail__actions"
            variants={fadeIn}
          >
            {price && (
              <p className="artifact-detail__price">{price}</p>
            )}
            <motion.button
              type="button"
              className="artifact-detail__cta"
              disabled={acquiring || !item.priceCents || !item.id}
              onClick={async () => {
                if (acquiring) return;
                setAcquiring(true);
                try {
                  const res = await createCheckoutSession(item.id);
                  if (res.ok && res.url) window.location.href = res.url;
                  else setAlertMsg(res.error || 'Unable to initiate acquisition.');
                } catch (e) {
                  setAlertMsg(e.message || 'Error');
                } finally {
                  setAcquiring(false);
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {acquiring ? 'Initiating…' : 'Initiate Acquisition'}
            </motion.button>
            <p className="artifact-detail__cta-hint">Preserve history. Claim artifact.</p>
          </motion.div>
        </div>
      </div>
      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title="Error"
        message={alertMsg}
      />
    </motion.div>
  );
}
