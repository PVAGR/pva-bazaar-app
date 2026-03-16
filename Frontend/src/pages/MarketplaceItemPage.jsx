import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  fetchMarketplaceItem,
  fetchItemProvenanceFeed,
  fetchItemProvenanceVerification,
  createCheckoutSession,
  prepareCryptoCheckout,
  confirmCryptoCheckoutPayment,
} from "../lib/api";
import VerificationBadge from "../components/VerificationBadge.jsx";
import { AlertModal } from "../components/ui/DialogModals.jsx";
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

function shortHash(value, left = 10, right = 8) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= left + right + 3) return text;
  return `${text.slice(0, left)}...${text.slice(-right)}`;
}

export default function MarketplaceItemPage() {
  const { slugOrId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainIdx, setMainIdx] = useState(0);
  const [cardBuying, setCardBuying] = useState(false);
  const [cryptoBuying, setCryptoBuying] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [provenanceFeed, setProvenanceFeed] = useState(null);
  const [provenanceVerification, setProvenanceVerification] = useState(null);
  const [provenanceLoading, setProvenanceLoading] = useState(false);
  const [provenanceError, setProvenanceError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchMarketplaceItem(slugOrId).then(res => {
      if (!mounted) return;
      if (res.ok) {
        setItem(res.item);
        setMainIdx(0);
        setProvenanceLoading(true);
        setProvenanceError("");
        const targetId = res.item?.slug || res.item?.id || slugOrId;
        Promise.all([
          fetchItemProvenanceFeed(targetId),
          fetchItemProvenanceVerification(targetId, { live: true }),
        ]).then(([feedRes, verifyRes]) => {
          if (!mounted) return;
          if (feedRes.ok) {
            setProvenanceFeed(feedRes);
          } else {
            setProvenanceFeed(null);
            setProvenanceError(feedRes.error || "Provenance feed unavailable");
          }

          if (verifyRes.ok) {
            setProvenanceVerification(verifyRes.verification || null);
          } else {
            setProvenanceVerification(null);
            if (!feedRes.ok) {
              setProvenanceError(verifyRes.error || "Provenance verification unavailable");
            }
          }
          setProvenanceLoading(false);
        });
      } else {
        setError(res.error || "Item not found");
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [slugOrId]);

  if (loading) return <div className="marketplace-item-page"><div className="loading">Loading...</div></div>;
  if (error || !item) return <div className="marketplace-item-page"><div className="error">{error || "Item not found"}</div></div>;

  const media = Array.isArray(item.media) && item.media.length > 0 ? item.media : [PLACEHOLDER];
  const mainImage = media[mainIdx] || PLACEHOLDER;
  const title = item.name ? `${item.name} | PVABazaar` : "Marketplace Item | PVABazaar";
  const ogImage = media[0] || PLACEHOLDER;
  const price = formatPrice(item.priceCents, item.currency);
  const isSold = Boolean(item?.omnichannel?.soldState?.isSold);

  const payload = provenanceFeed?.payload || null;
  const signature = provenanceFeed?.signature || "";
  const verify = provenanceVerification || null;

  async function copyValue(label, value) {
    const text = String(value || "").trim();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(prev => (prev === label ? "" : prev)), 1200);
      }
    } catch (_) {
    }
  }

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
      <div className="item-top-links">
        <Link to="/marketplace" className="back-link">← Back to Marketplace</Link>
        <Link to={`/artifacts/${item.slug || slugOrId}`} className="back-link artifact-link">
          Preserve history →
        </Link>
      </div>
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
            <VerificationBadge artifactIdOrSlug={item.id || slugOrId} className="item-verification-badge" />
          </div>
          <div className="item-tags">
            {Array.isArray(item.tags) && item.tags.map(tag => (
              <span className="item-tag" key={tag}>{tag}</span>
            ))}
          </div>
          {isSold ? (
            <p className="item-sold-note">
              This artifact is already sold{item?.omnichannel?.soldState?.soldSource ? ` via ${item.omnichannel.soldState.soldSource}` : ''}.
            </p>
          ) : null}
          <p className="item-desc">{item.description}</p>

          <section className="item-provenance-panel" aria-label="Artifact provenance verification">
            <div className="item-provenance-header">
              <h2>Provenance Verification</h2>
              {payload?.provenance?.verificationStatus ? (
                <span className="item-provenance-status">{payload.provenance.verificationStatus}</span>
              ) : null}
            </div>

            {provenanceLoading ? <p className="item-provenance-note">Loading signed provenance feed...</p> : null}
            {provenanceError ? <p className="item-provenance-note error">{provenanceError}</p> : null}

            {!provenanceLoading && payload ? (
              <div className="item-provenance-grid">
                <div className="item-provenance-row">
                  <span>Unique code</span>
                  <strong>{payload.provenance?.uniqueCode || "n/a"}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Combined hash</span>
                  <strong>{shortHash(payload.provenance?.combinedHash) || "n/a"}</strong>
                  {payload.provenance?.combinedHash ? (
                    <button
                      type="button"
                      className="item-copy-btn"
                      onClick={() => copyValue("combinedHash", payload.provenance.combinedHash)}
                    >
                      {copied === "combinedHash" ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="item-provenance-row">
                  <span>Royalty</span>
                  <strong>{Number(payload.provenance?.royalty?.percent || 0)}%</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Verification verdict</span>
                  <strong>{verify?.verdict || "n/a"}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Signature valid</span>
                  <strong>{verify?.signatureValid ? "yes" : "no"}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Feed signature</span>
                  <strong>{shortHash(signature) || "n/a"}</strong>
                  {signature ? (
                    <button
                      type="button"
                      className="item-copy-btn"
                      onClick={() => copyValue("signature", signature)}
                    >
                      {copied === "signature" ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="item-provenance-row">
                  <span>Chain network</span>
                  <strong>{payload.provenance?.chain?.network || "n/a"}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Contract</span>
                  <strong>{shortHash(payload.provenance?.chain?.contractAddress) || "n/a"}</strong>
                  {payload.provenance?.chain?.contractAddress ? (
                    <button
                      type="button"
                      className="item-copy-btn"
                      onClick={() => copyValue("contractAddress", payload.provenance.chain.contractAddress)}
                    >
                      {copied === "contractAddress" ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="item-provenance-row">
                  <span>Token ID</span>
                  <strong>{payload.provenance?.chain?.tokenId || "n/a"}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Ownership events</span>
                  <strong>{Number(verify?.ownershipEvents || 0)}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>On-chain check</span>
                  <strong>{verify?.onChain?.verified ? "confirmed" : (verify?.onChain?.available ? "failed" : "unavailable")}</strong>
                </div>
                <div className="item-provenance-row">
                  <span>Current owner</span>
                  <strong>{shortHash(verify?.onChain?.currentOwner) || "n/a"}</strong>
                  {verify?.onChain?.currentOwner ? (
                    <button
                      type="button"
                      className="item-copy-btn"
                      onClick={() => copyValue("currentOwner", verify.onChain.currentOwner)}
                    >
                      {copied === "currentOwner" ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
                <div className="item-provenance-row">
                  <span>Owner matches timeline</span>
                  <strong>
                    {verify?.ownerMatchesTimeline === null
                      ? "n/a"
                      : (verify?.ownerMatchesTimeline ? "yes" : "no")}
                  </strong>
                </div>
                {!verify?.onChain?.available && verify?.onChain?.reason ? (
                  <div className="item-provenance-row">
                    <span>On-chain note</span>
                    <strong>{verify.onChain.reason}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <div className="buy-actions">
            <button
              className="buy-btn"
              disabled={isSold || cardBuying || cryptoBuying || !item.priceCents || !item.id}
              onClick={async () => {
                if (cardBuying || cryptoBuying) return;
                setCardBuying(true);
                try {
                  const res = await createCheckoutSession(item.id);
                  if (res.ok && res.url) {
                    window.location.href = res.url;
                  } else {
                    setAlertMsg(res.error || "Failed to start checkout");
                  }
                } catch (e) {
                  setAlertMsg(e.message || "Checkout error");
                } finally {
                  setCardBuying(false);
                }
              }}
            >
              {cardBuying ? "Redirecting..." : "Buy with Card"}
            </button>

            <button
              className="buy-btn buy-btn-crypto"
              disabled={isSold || cardBuying || cryptoBuying || !item.priceCents || !item.id}
              onClick={async () => {
                if (cardBuying || cryptoBuying) return;
                if (!window?.ethereum) {
                  setAlertMsg("No crypto wallet detected. Please install MetaMask.");
                  return;
                }

                setCryptoBuying(true);
                try {
                  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                  const buyerWallet = Array.isArray(accounts) && accounts.length ? accounts[0] : "";
                  if (!buyerWallet) {
                    throw new Error("Wallet connection failed");
                  }

                  const intent = await prepareCryptoCheckout({
                    itemId: item.id,
                    buyerWallet,
                  });
                  if (!intent.ok) {
                    throw new Error(intent.error || "Failed to prepare crypto checkout");
                  }

                  const targetChainHex = `0x${Number(intent.chainId || 8453).toString(16)}`;
                  try {
                    await window.ethereum.request({
                      method: "wallet_switchEthereumChain",
                      params: [{ chainId: targetChainHex }],
                    });
                  } catch (_) {
                    // If chain switching fails, wallet may still submit on current chain.
                  }

                  const txHash = await window.ethereum.request({
                    method: "eth_sendTransaction",
                    params: [
                      {
                        from: buyerWallet,
                        to: intent.recipientAddress,
                        value: `0x${BigInt(intent.amountWei).toString(16)}`,
                      },
                    ],
                  });

                  const confirm = await confirmCryptoCheckoutPayment({
                    orderId: intent.orderId,
                    txHash,
                    buyerWallet,
                  });

                  if (!confirm.ok) {
                    throw new Error(confirm.error || "Crypto payment confirmation failed");
                  }

                  const linkText = confirm.explorerUrl
                    ? `\nExplorer: ${confirm.explorerUrl}`
                    : "";
                  setAlertMsg(`Crypto payment confirmed and synced.${linkText}`);
                } catch (e) {
                  setAlertMsg(e.message || "Crypto checkout failed");
                } finally {
                  setCryptoBuying(false);
                }
              }}
            >
              {cryptoBuying ? "Confirming..." : "Buy with Crypto"}
            </button>
          </div>
        </section>
      </div>
      <AlertModal
        isOpen={!!alertMsg}
        onClose={() => setAlertMsg(null)}
        title="Error"
        message={alertMsg}
      />
    </div>
  );
}
