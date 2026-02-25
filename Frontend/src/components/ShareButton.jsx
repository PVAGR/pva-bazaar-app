import React, { useState } from 'react';

/**
 * Share button using Web Share API when available, else copies URL to clipboard.
 */
export default function ShareButton({ url, title, text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || (typeof document !== 'undefined' ? document.title : 'PVA Bazaar') || 'PVA Bazaar';
  const shareText = text || '';

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {
        if (e.name !== 'AbortError') fallbackCopy();
      }
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      className={`btn ghost ${className}`}
      onClick={handleShare}
      aria-label={copied ? 'Copied!' : 'Share this page'}
    >
      {copied ? '✓ Copied' : 'Share'}
    </button>
  );
}
