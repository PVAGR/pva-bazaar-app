import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { fetchMarketplaceItem, createCheckoutSession } from "../lib/api";
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
          </div>
          <div className="item-tags">
            {Array.isArray(item.tags) && item.tags.map(tag => (
              <span className="item-tag" key={tag}>{tag}</span>
            ))}
          </div>
          <p className="item-desc">{item.description}</p>
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
