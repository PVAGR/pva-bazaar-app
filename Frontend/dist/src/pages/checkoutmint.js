import { api } from '../api/client';
import { getUserAuthContext } from '../auth/authPrompt';

function q(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function formatPrice(p) {
  if (p == null) return '-';
  const n = Number(p);
  if (Number.isNaN(n)) return String(p);
  return '$' + n.toFixed(2);
}

async function loadCheckout() {
  try {
    const id = q('id');
    if (!id) return;
    const { ok, artifact } = await api.get(`/artifacts/${id}`);
    if (!ok || !artifact) return;

    const img = document.querySelector('.item-image img');
    if (img && artifact.imageUrl) img.src = artifact.imageUrl;
    const nameEl = document.querySelector('.item-name');
    if (nameEl) nameEl.textContent = artifact.title || artifact.name;
    const skuEl = document.querySelector('.item-sku');
    if (skuEl) skuEl.textContent = artifact.physicalSerial || '';
    const priceEl = document.querySelector('.item-price');
    if (priceEl) priceEl.textContent = formatPrice(artifact.price);

    // default shares/quantity
    const qtyInput = document.querySelector('.quantity-input');
    if (qtyInput) qtyInput.value = '1';

    // Attach purchase handler
    const purchaseBtn = document.querySelector('#purchaseBtn');
    if (purchaseBtn) {
      purchaseBtn.addEventListener('click', async () => {
        const shares = Number((document.querySelector('.quantity-input') || {}).value || 1);
        if (!shares || shares <= 0) return alert('Enter a valid quantity');

        // ensure auth via prompt (simple fallback)
        try {
          const auth = await getUserAuthContext();
          const wallet = auth.walletAddress;
          // Derive USD amount: prefer fractional sharePrice * shares, else pro-rata artifact.price
          let amountUSD = 0;
          try {
            if (artifact?.fractionalization?.sharePrice) {
              amountUSD = Number(artifact.fractionalization.sharePrice) * shares;
            } else if (artifact?.price && artifact?.fractionalization?.totalShares) {
              const perShare = Number(artifact.price) / Number(artifact.fractionalization.totalShares || 1);
              amountUSD = perShare * shares;
            }
            amountUSD = Math.round((amountUSD + Number.EPSILON) * 100) / 100;
          } catch(_) {}
          const body = { artifactId: id, wallet, amountUSD, shares };
          const res = await api.post('/transactions/shares/buy', body);
          if (res?.ok) {
            alert('Purchase successful');
            // update sold status if present
            const soldEl = document.querySelector('.progress-text');
            if (soldEl && res?.data?.newSoldShares != null && artifact.fractionalization?.totalShares) {
              const pct = Math.round((res.data.newSoldShares / artifact.fractionalization.totalShares) * 100);
              soldEl.textContent = `${pct}% Sold`;
            }
          } else {
            alert(res?.message || 'Purchase failed');
          }
        } catch (err) {
          alert('Purchase error: ' + (err?.message || err));
        }
      });
    }
  } catch (e) {
    console.warn('Checkout load error:', e?.message || e);
  }
}

window.addEventListener('DOMContentLoaded', loadCheckout);
