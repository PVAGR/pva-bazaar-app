import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchMarketplaceItem, createCheckoutSession, createMarketplaceInquiry } from "../lib/api";
import "./MarketplaceItemPage.css";

const PLACEHOLDER = "/placeholder.png";

function formatPrice(priceCents, currency = "USD") {
  if (typeof priceCents !== "number") return "";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export default function MarketplaceItemPage() {
  const { slugOrId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainIdx, setMainIdx] = useState(0);
  const [buying, setBuying] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquiryResult, setInquiryResult] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const [inquiryForm, setInquiryForm] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterCompany: "",
    quantityRequested: 1,
    requestType: "sample",
    reservationRequested: false,
    message: "",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchMarketplaceItem(slugOrId).then(res => {
      if (!mounted) return;
      if (res.ok) {
        setItem(res.item);
        setMainIdx(0);
      } else {
        setError(res.error || "Item not found");
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [slugOrId]);

  if (loading) return <div className="marketplace-item-page"><div className="loading">Loading...</div></div>;
  if (error || !item) return <div className="marketplace-item-page"><div className="error">{error || "Item not found"}</div></div>;

  const media = Array.isArray(item.media) && item.media.length > 0 ? item.media : [PLACEHOLDER];
  const mainImage = media[mainIdx] || PLACEHOLDER;
  const title = item.name ? `${item.name} | PVABazaar` : "Marketplace Item | PVABazaar";
  const ogImage = media[0] || PLACEHOLDER;
  const price = formatPrice(item.priceCents, item.currency);
  const catalog = item.catalog || {};
  const inquirySubject = encodeURIComponent(`Sample Request: ${catalog.sku || item.id}`);
  const inquiryBody = encodeURIComponent(
    `Hello PVA Bazaar,%0D%0A%0D%0AI would like to inquire about this item:%0D%0A` +
    `- SKU/ID: ${catalog.sku || item.id}%0D%0A` +
    `- Name: ${item.name || ''}%0D%0A` +
    `- Page: https://pvabazaar.org/#/marketplace/${item.slug || item.id}%0D%0A%0D%0A` +
    `Please share availability details and sample/consignment options.%0D%0A`
  );

  const submitInquiry = async (event) => {
    event.preventDefault();
    setInquiryResult("");
    setInquiryError("");
    if (!inquiryForm.requesterName || !inquiryForm.requesterEmail || !inquiryForm.message) {
      setInquiryError("Name, email, and message are required.");
      return;
    }

    setSendingInquiry(true);
    const response = await createMarketplaceInquiry({
      slugOrId: item.slug || item.id,
      ...inquiryForm,
      quantityRequested: Number(inquiryForm.quantityRequested) || 1,
    });
    setSendingInquiry(false);

    if (!response.ok) {
      setInquiryError(response.error || "Failed to send inquiry.");
      return;
    }

    setInquiryResult(
      response?.inquiry?.reservationApplied
        ? "Inquiry sent and reservation applied. We will contact you shortly."
        : "Inquiry sent successfully. We will contact you shortly."
    );
    setInquiryForm((prev) => ({
      ...prev,
      message: "",
    }));
  };

  return (
    <div className="marketplace-item-page">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={item.description || "Marketplace item on PVABazaar"} />
        <meta property="og:title" content={item.name || "Marketplace Item"} />
        <meta property="og:description" content={item.description || "Marketplace item on PVABazaar"} />
        <meta property="og:image" content={ogImage} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={item.name || "Marketplace Item"} />
        <meta property="twitter:description" content={item.description || "Marketplace item on PVABazaar"} />
        <meta property="twitter:image" content={ogImage} />
      </Helmet>
      <Link to="/marketplace" className="back-link">← Back to Marketplace</Link>
      <div className="item-detail-layout">
        <section className="media-gallery" aria-label="Item media gallery">
          <div className="main-media">
            <img src={mainImage} alt={item.name} className="main-image" />
          </div>
          <div className="thumbnails" role="list">
            {media.map((img, idx) => (
              <button
                key={img + idx}
                className={"thumb-btn" + (idx === mainIdx ? " selected" : "")}
                aria-label={`View image ${idx + 1}`}
                aria-pressed={idx === mainIdx}
                tabIndex={0}
                onClick={() => setMainIdx(idx)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    setMainIdx(idx);
                  }
                }}
              >
                <img src={img} alt={item.name + " thumbnail " + (idx + 1)} className="thumb-img" />
              </button>
            ))}
          </div>
        </section>
        <section className="item-info">
          <h1 className="item-title">{item.name}</h1>
          <div className="item-meta">
            <span className="item-category">{item.category}</span>
            {price && <span className="item-price">{price}</span>}
            <span className={`item-status-pill status-${catalog.availabilityStatus || "available"}`}>
              {catalog.availabilityStatus || "available"}
            </span>
            <span className="item-uniqueness-pill">
              {catalog.isUnique ? "One-of-One" : `Bulk: ${catalog.bulkQuantity || 0}`}
            </span>
          </div>
          <div className="item-tags">
            {Array.isArray(item.tags) && item.tags.map(tag => (
              <span className="item-tag" key={tag}>{tag}</span>
            ))}
          </div>
          <p className="item-desc">{item.description}</p>
          <div className="item-specs-panel">
            <h2>Specifications</h2>
            <div className="item-specs-grid">
              <div><span>SKU</span><strong>{catalog.sku || item.id}</strong></div>
              <div><span>Origin</span><strong>{catalog?.origin?.country || 'N/A'}</strong></div>
              <div><span>Region</span><strong>{catalog?.origin?.region || 'N/A'}</strong></div>
              <div><span>Hardness (Mohs)</span><strong>{catalog?.gemProperties?.hardnessMohs || 'N/A'}</strong></div>
              <div><span>Color</span><strong>{catalog?.gemProperties?.color || 'N/A'}</strong></div>
              <div><span>Treatment</span><strong>{catalog?.gemProperties?.treatmentStatus || 'N/A'}</strong></div>
              <div><span>Dimensions</span><strong>{`${catalog?.dimensions?.length || 0} x ${catalog?.dimensions?.width || 0} x ${catalog?.dimensions?.height || 0} ${catalog?.dimensions?.unit || 'mm'}`}</strong></div>
              <div><span>Weight</span><strong>{`${catalog?.weight?.value || 0} ${catalog?.weight?.unit || 'ct'}`}</strong></div>
            </div>
          </div>
          {catalog?.mediaAssets?.videoUrl ? (
            <div className="item-video-block">
              <h2>Video Preview</h2>
              <video controls preload="metadata" src={catalog.mediaAssets.videoUrl} />
            </div>
          ) : null}
          <div className="item-inquiry-sticky">
            <a
              className="inquiry-btn"
              href={`mailto:contact@pvabazaar.org?subject=${inquirySubject}&body=${inquiryBody}`}
            >
              Request Sample / Inquire
            </a>
          </div>
          <form className="item-inquiry-form" onSubmit={submitInquiry}>
            <h2>Send Inquiry</h2>
            <div className="item-inquiry-grid">
              <input
                type="text"
                placeholder="Your name"
                value={inquiryForm.requesterName}
                onChange={(e) => setInquiryForm((prev) => ({ ...prev, requesterName: e.target.value }))}
                required
              />
              <input
                type="email"
                placeholder="Your email"
                value={inquiryForm.requesterEmail}
                onChange={(e) => setInquiryForm((prev) => ({ ...prev, requesterEmail: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Company (optional)"
                value={inquiryForm.requesterCompany}
                onChange={(e) => setInquiryForm((prev) => ({ ...prev, requesterCompany: e.target.value }))}
              />
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                value={inquiryForm.quantityRequested}
                onChange={(e) => setInquiryForm((prev) => ({ ...prev, quantityRequested: e.target.value }))}
              />
              <select
                value={inquiryForm.requestType}
                onChange={(e) => setInquiryForm((prev) => ({ ...prev, requestType: e.target.value }))}
              >
                <option value="sample">Sample Request</option>
                <option value="availability">Availability Check</option>
                <option value="bulk">Bulk Request</option>
                <option value="custom">Custom Requirement</option>
              </select>
              <label className="item-inquiry-checkbox">
                <input
                  type="checkbox"
                  checked={inquiryForm.reservationRequested}
                  onChange={(e) => setInquiryForm((prev) => ({ ...prev, reservationRequested: e.target.checked }))}
                />
                Reserve this item while we discuss
              </label>
            </div>
            <textarea
              placeholder="Tell us what you need"
              value={inquiryForm.message}
              onChange={(e) => setInquiryForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={4}
              required
            />
            {inquiryError ? <div className="item-inquiry-error">{inquiryError}</div> : null}
            {inquiryResult ? <div className="item-inquiry-success">{inquiryResult}</div> : null}
            <button className="inquiry-submit-btn" type="submit" disabled={sendingInquiry}>
              {sendingInquiry ? "Sending..." : "Submit Inquiry"}
            </button>
          </form>
          <button
            className="buy-btn"
            disabled={buying || !item.priceCents || !item.id}
            onClick={async () => {
              if (buying) return;
              setBuying(true);
              try {
                const res = await createCheckoutSession(item.id);
                if (res.ok && res.url) {
                  window.location.href = res.url;
                } else {
                  alert(res.error || "Failed to start checkout");
                }
              } catch (e) {
                alert(e.message || "Checkout error");
              } finally {
                setBuying(false);
              }
            }}
          >
            {buying ? "Redirecting..." : "Buy"}
          </button>
        </section>
      </div>
    </div>
  );
}
