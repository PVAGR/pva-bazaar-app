import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  fetchMarketplaceItem,
  createCheckoutSession,
  createMarketplaceInquiry,
  fetchCryptoCheckoutConfig,
  prepareCryptoCheckout,
  confirmCryptoCheckoutPayment,
} from "../lib/api";
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

function normalizeList(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
}

function renderInlineList(items, emptyLabel = 'Not supplied yet') {
  const list = normalizeList(items);
  if (!list.length) return <span className="item-inline-empty">{emptyLabel}</span>;
  return (
    <div className="item-inline-list">
      {list.map((entry) => (
        /^https?:\/\//i.test(entry) ? (
          <a key={entry} className="item-inline-chip item-inline-chip--link" href={entry} target="_blank" rel="noreferrer">
            {entry}
          </a>
        ) : (
          <span key={entry} className="item-inline-chip">{entry}</span>
        )
      ))}
    </div>
  );
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
  const [cryptoConfig, setCryptoConfig] = useState(null);
  const [cryptoConfigError, setCryptoConfigError] = useState("");
  const [preparingCrypto, setPreparingCrypto] = useState(false);
  const [cryptoCheckout, setCryptoCheckout] = useState(null);
  const [confirmingCrypto, setConfirmingCrypto] = useState(false);
  const [cryptoBuyerWallet, setCryptoBuyerWallet] = useState("");
  const [cryptoBuyerEmail, setCryptoBuyerEmail] = useState("");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoError, setCryptoError] = useState("");
  const [cryptoSuccess, setCryptoSuccess] = useState("");

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

  useEffect(() => {
    let mounted = true;
    fetchCryptoCheckoutConfig().then((res) => {
      if (!mounted) return;
      if (res.ok) {
        setCryptoConfig(res);
        setCryptoConfigError("");
      } else {
        setCryptoConfig(null);
        setCryptoConfigError(res.error || "Crypto checkout config unavailable.");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="marketplace-item-page"><div className="loading">Loading...</div></div>;
  if (error || !item) return <div className="marketplace-item-page"><div className="error">{error || "Item not found"}</div></div>;

  const media = Array.isArray(item.media) && item.media.length > 0 ? item.media : [PLACEHOLDER];
  const mainImage = media[mainIdx] || PLACEHOLDER;
  const title = item.name ? `${item.name} | PVABazaar` : "Marketplace Item | PVABazaar";
  const ogImage = media[0] || PLACEHOLDER;
  const price = formatPrice(item.priceCents, item.currency);
  const catalog = item.catalog || {};
  const provenance = item.provenance || {};
  const knowledgeProfile = item.knowledgeProfile || {};
  const stewardship = item.stewardship || {};
  const documentation = provenance.documentation || {};
  const ownershipTimelineCount = Array.isArray(item.ownershipHistory) ? item.ownershipHistory.length : 0;
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

  const formatEthFromWei = (weiValue) => {
    const raw = String(weiValue || "0").trim();
    if (!/^\d+$/.test(raw)) return "0";
    const padded = raw.padStart(19, "0");
    const whole = padded.slice(0, -18).replace(/^0+/, "") || "0";
    const fractional = padded.slice(-18).replace(/0+$/, "");
    return fractional ? `${whole}.${fractional}` : whole;
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      if (globalThis?.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(value);
      }
    } catch (_) {
      // Clipboard access can be denied in some browsers; ignore silently.
    }
  };

  const handlePrepareCrypto = async () => {
    setCryptoError("");
    setCryptoSuccess("");
    setCryptoCheckout(null);
    setCryptoTxHash("");
    setPreparingCrypto(true);
    const response = await prepareCryptoCheckout({
      itemId: item.id,
      buyerWallet: cryptoBuyerWallet,
      buyerEmail: cryptoBuyerEmail,
    });
    setPreparingCrypto(false);
    if (!response.ok) {
      setCryptoError(response.error || "Failed to prepare crypto checkout.");
      return;
    }
    setCryptoCheckout(response);
  };

  const handleConfirmCrypto = async () => {
    if (!cryptoCheckout?.orderId) {
      setCryptoError("Prepare crypto checkout first.");
      return;
    }
    if (!cryptoTxHash.trim()) {
      setCryptoError("Enter your transaction hash to confirm payment.");
      return;
    }
    setCryptoError("");
    setCryptoSuccess("");
    setConfirmingCrypto(true);
    const response = await confirmCryptoCheckoutPayment({
      orderId: cryptoCheckout.orderId,
      txHash: cryptoTxHash.trim(),
      buyerWallet: cryptoBuyerWallet,
    });
    setConfirmingCrypto(false);
    if (!response.ok) {
      setCryptoError(response.error || "Failed to confirm crypto payment.");
      return;
    }
    setCryptoSuccess("Crypto payment confirmed. Your order is now finalized.");
    setCryptoCheckout((prev) => ({
      ...(prev || {}),
      explorerUrl: response.explorerUrl || "",
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
                className={`thumb-btn${  idx === mainIdx ? " selected" : ""}`}
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
                <img src={img} alt={`${item.name  } thumbnail ${  idx + 1}`} className="thumb-img" />
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
          <div className="item-specs-panel">
            <h2>Listing stewardship</h2>
            <div className="item-specs-grid">
              <div><span>Current steward</span><strong>{stewardship.currentHolderName || 'Unassigned'}</strong></div>
              <div><span>Role</span><strong>{stewardship.currentHolderRole || 'owner'}</strong></div>
              <div><span>Claimed at</span><strong>{stewardship.claimedAt ? new Date(stewardship.claimedAt).toLocaleString() : 'Not claimed yet'}</strong></div>
              <div><span>Claim code hint</span><strong>{stewardship.claimCodeHint || 'Not provided'}</strong></div>
            </div>
            <div className="item-actions-row">
              <Link className="btn ghost" to={`/items/manage/${encodeURIComponent(item.id)}`}>
                Claim / manage listing
              </Link>
            </div>
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
          <div className="item-dossier-grid">
            <article className="item-dossier-panel">
              <h2>Story and origin</h2>
              <p>{knowledgeProfile.history || documentation.historicalSignificance || item.lore || item.description}</p>
              <div className="item-dossier-meta">
                <div><span>Scientific class</span><strong>{knowledgeProfile.scientificClassification || provenance.classification || 'N/A'}</strong></div>
                <div><span>Era</span><strong>{provenance.era || 'N/A'}</strong></div>
                <div><span>Source type</span><strong>{catalog?.origin?.sourceType || 'N/A'}</strong></div>
                <div><span>Authenticity score</span><strong>{provenance.authenticityScore || 'N/A'}</strong></div>
              </div>
            </article>

            <article className="item-dossier-panel">
              <h2>Uses and disciplines</h2>
              <div className="item-dossier-block">
                <h3>Traditional uses</h3>
                {renderInlineList(knowledgeProfile.traditionalUses, 'No traditional uses added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Modern uses</h3>
                {renderInlineList(knowledgeProfile.modernUses, 'No modern uses added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Related disciplines</h3>
                {renderInlineList(knowledgeProfile.relatedDisciplines, 'No related disciplines added yet')}
              </div>
            </article>

            <article className="item-dossier-panel">
              <h2>Education and applications</h2>
              <div className="item-dossier-block">
                <h3>Educational value</h3>
                <p>{knowledgeProfile.educationalValue || 'Not supplied yet'}</p>
              </div>
              <div className="item-dossier-block">
                <h3>Classroom activities</h3>
                {renderInlineList(knowledgeProfile.classroomActivities, 'No classroom activities added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>University applications</h3>
                {renderInlineList(knowledgeProfile.universityApplications, 'No university applications added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Museum applications</h3>
                {renderInlineList(knowledgeProfile.museumApplications, 'No museum applications added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Laboratory applications</h3>
                {renderInlineList(knowledgeProfile.laboratoryApplications, 'No laboratory applications added yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Industrial applications</h3>
                {renderInlineList(knowledgeProfile.industrialApplications, 'No industrial applications added yet')}
              </div>
            </article>

            <article className="item-dossier-panel">
              <h2>Safety and trade</h2>
              <div className="item-dossier-block">
                <h3>Safety information</h3>
                <p>{knowledgeProfile.safetyInformation || 'No safety notes supplied yet'}</p>
              </div>
              <div className="item-dossier-block">
                <h3>Import / export notes</h3>
                <p>{knowledgeProfile.importExportNotes || 'No import/export notes supplied yet'}</p>
              </div>
              <div className="item-dossier-block">
                <h3>Certifications</h3>
                {renderInlineList(knowledgeProfile.certifications, 'No certifications supplied yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Economic importance</h3>
                <p>{knowledgeProfile.economicImportance || 'No economic notes supplied yet'}</p>
              </div>
            </article>

            <article className="item-dossier-panel">
              <h2>Documentation and media</h2>
              <div className="item-dossier-block">
                <h3>Videos</h3>
                {renderInlineList(knowledgeProfile.videos, 'No videos supplied yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Articles</h3>
                {renderInlineList(knowledgeProfile.articles, 'No articles supplied yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Research papers</h3>
                {renderInlineList(knowledgeProfile.researchPapers, 'No research papers supplied yet')}
              </div>
              <div className="item-dossier-block">
                <h3>Ownership trail</h3>
                <p>{provenance.ownershipTimelineCount || ownershipTimelineCount || 0} recorded step(s) in the trail.</p>
              </div>
              <div className="item-dossier-block">
                <h3>Documentation headline</h3>
                <p>{documentation.headline || 'No headline supplied yet'}</p>
              </div>
            </article>
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

          <section className="item-crypto-panel" aria-label="Crypto checkout">
            <h2>Buy With Crypto</h2>
            {cryptoConfig?.available ? (
              <>
                <p className="item-crypto-note">
                  Send crypto to the wallet below, then submit your transaction hash to finalize this purchase.
                </p>
                <div className="item-crypto-destination">
                  <span>Treasury wallet</span>
                  <strong>{cryptoConfig.recipientAddress}</strong>
                  <button type="button" className="item-copy-btn" onClick={() => copyText(cryptoConfig.recipientAddress)}>Copy</button>
                </div>
                <div className="item-crypto-meta">
                  <span>Network: {cryptoConfig.network}</span>
                  <span>Chain ID: {cryptoConfig.chainId}</span>
                  <span>Quote: 1 ETH ≈ ${cryptoConfig.quoteUsdPerEth.toLocaleString()}</span>
                </div>

                <div className="item-crypto-form-grid">
                  <input
                    type="text"
                    placeholder="Your wallet address (optional)"
                    value={cryptoBuyerWallet}
                    onChange={(e) => setCryptoBuyerWallet(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Your email (optional)"
                    value={cryptoBuyerEmail}
                    onChange={(e) => setCryptoBuyerEmail(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="buy-btn buy-btn-crypto"
                  disabled={preparingCrypto || !item.id}
                  onClick={handlePrepareCrypto}
                >
                  {preparingCrypto ? "Preparing crypto checkout..." : "Prepare Crypto Checkout"}
                </button>

                {cryptoCheckout?.orderId ? (
                  <div className="item-crypto-prepared">
                    <div className="item-crypto-destination">
                      <span>Pay this exact amount</span>
                      <strong>{formatEthFromWei(cryptoCheckout.amountWei)} ETH</strong>
                      <button type="button" className="item-copy-btn" onClick={() => copyText(formatEthFromWei(cryptoCheckout.amountWei))}>Copy</button>
                    </div>
                    <div className="item-crypto-destination">
                      <span>Amount in wei</span>
                      <strong>{cryptoCheckout.amountWei}</strong>
                      <button type="button" className="item-copy-btn" onClick={() => copyText(cryptoCheckout.amountWei)}>Copy</button>
                    </div>
                    <div className="item-crypto-destination">
                      <span>Memo</span>
                      <strong>{cryptoCheckout.memo}</strong>
                      <button type="button" className="item-copy-btn" onClick={() => copyText(cryptoCheckout.memo)}>Copy</button>
                    </div>
                    <p className="item-crypto-note">Order reference: {cryptoCheckout.orderId}</p>

                    <div className="item-crypto-form-grid">
                      <input
                        type="text"
                        placeholder="Transaction hash"
                        value={cryptoTxHash}
                        onChange={(e) => setCryptoTxHash(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="buy-btn buy-btn-crypto"
                      disabled={confirmingCrypto}
                      onClick={handleConfirmCrypto}
                    >
                      {confirmingCrypto ? "Confirming payment..." : "Confirm Crypto Payment"}
                    </button>

                    {cryptoCheckout.explorerUrl ? (
                      <a href={cryptoCheckout.explorerUrl} target="_blank" rel="noreferrer" className="item-crypto-link">
                        View transaction on explorer
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="item-crypto-note error">
                {cryptoConfigError || "Crypto checkout is not available right now."}
              </p>
            )}

            {cryptoError ? <div className="item-inquiry-error">{cryptoError}</div> : null}
            {cryptoSuccess ? <div className="item-inquiry-success">{cryptoSuccess}</div> : null}
          </section>
        </section>
      </div>
    </div>
  );
}
