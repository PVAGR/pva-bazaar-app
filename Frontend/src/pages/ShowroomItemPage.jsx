import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { fetchMarketplaceItem, createMarketplaceInquiry } from '../lib/api';
import ShowroomImageGallery from '../components/ShowroomImageGallery.jsx';
import ShowroomSpecsPanel from '../components/ShowroomSpecsPanel.jsx';
import ShowroomInquiryForm from '../components/ShowroomInquiryForm.jsx';
import './ShowroomItemPage.css';

const PLACEHOLDER = '/placeholder.png';

export default function ShowroomItemPage() {
  const { slugOrId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchMarketplaceItem(slugOrId).then((res) => {
      if (!mounted) return;
      if (res.ok) {
        setItem(res.item);
      } else {
        setError(res.error || 'Item not found');
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [slugOrId]);

  const handleInquirySubmit = async (formData) => {
    try {
      const response = await createMarketplaceInquiry({
        slugOrId: item.slug || item.id,
        ...formData,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send inquiry');
      }

      setInquirySuccess(true);
      setInquiryMessage(
        response?.inquiry?.reservationApplied
          ? "✓ Inquiry sent successfully! We've placed a reservation and will contact you within 24 hours."
          : "✓ Inquiry sent successfully! We'll contact you shortly.",
      );
      setTimeout(() => setInquirySuccess(false), 5000);
    } catch (err) {
      setInquiryMessage(`✗ ${err.message || 'Failed to send inquiry'}`);
      setInquirySuccess(false);
    }
  };

  if (loading)
    return (
      <div className="showroom-item-page">
        <div className="loading">Loading...</div>
      </div>
    );
  if (error || !item)
    return (
      <div className="showroom-item-page">
        <div className="error">{error || 'Item not found'}</div>
      </div>
    );

  const media = Array.isArray(item.media) && item.media.length > 0 ? item.media : [PLACEHOLDER];
  const title = item.name ? `${item.name} | PVA Bazaar Showroom` : 'Showroom Item | PVA Bazaar';
  const ogImage = media[0] || PLACEHOLDER;
  const catalog = item.catalog || {};

  return (
    <div className="showroom-item-page">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={item.description || 'Showroom item on PVA Bazaar'} />
        <meta property="og:title" content={item.name || 'Showroom Item'} />
        <meta
          property="og:description"
          content={item.description || 'Showroom item on PVA Bazaar'}
        />
        <meta property="og:image" content={ogImage} />
      </Helmet>

      <Link to="/showroom" className="back-link">
        ← Back to Showroom
      </Link>

      <div className="item-detail-layout">
        <section className="media-section">
          <ShowroomImageGallery images={media} title={item.name} />

          {catalog?.mediaAssets?.videoUrl && (
            <div className="video-block">
              <h3>Video Preview</h3>
              <video controls preload="metadata" src={catalog.mediaAssets.videoUrl} />
            </div>
          )}
        </section>

        <section className="info-section">
          <div className="item-header">
            <h1 className="item-title">{item.name}</h1>
            <div className="item-tags">
              {Array.isArray(item.tags) &&
                item.tags.map((tag) => (
                  <span className="item-tag" key={tag}>
                    {tag}
                  </span>
                ))}
            </div>
          </div>

          <div className="item-status-bar">
            <span
              className={`item-status-pill status-${catalog.availabilityStatus || 'available'}`}
            >
              {catalog.availabilityStatus === 'available' && '✓ Available for Immediate Access'}
              {catalog.availabilityStatus === 'reserved' && '🔒 Currently Reserved'}
              {catalog.availabilityStatus === 'sold' && '✗ Sold'}
              {catalog.availabilityStatus === 'backorder' && '⏳ Backorder'}
              {!catalog.availabilityStatus && '✓ Available'}
            </span>
            <span className="item-uniqueness-indicator">
              {catalog.isUnique
                ? '🔷 One-of-One Piece'
                : `📦 Bulk Inventory — ${catalog.bulkQuantity || 0} Available`}
            </span>
          </div>

          <p className="item-description">{item.description}</p>

          <ShowroomSpecsPanel item={item} />

          <div className="sticky-cta-wrapper">
            <button
              className="sticky-cta"
              onClick={() =>
                document
                  .querySelector('.showroom-inquiry-form')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Request Sample or Inquire
            </button>
          </div>

          {inquirySuccess !== null && (
            <div className={`inquiry-message ${inquirySuccess ? 'success' : 'error'}`}>
              {inquiryMessage}
            </div>
          )}

          <ShowroomInquiryForm item={item} onSubmit={handleInquirySubmit} />
        </section>
      </div>
    </div>
  );
}
