"use client";

// Captures a ?ref=CODE arriving on any page, stores it in the browser so the
// checkout flow can attach the referral to an order, and shows a lightweight,
// dismissible notice. The code is only used to stamp the order server-side —
// attribution (the actual kickback math) always happens in the backend.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const [inbound, setInbound] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) {
      // Show a reminder if a code is already stored from a previous visit.
      const stored = readStoredCode();
      if (stored) setInbound(stored);
      return;
    }
    const normalized = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalized.length < 6) return;
    try {
      localStorage.setItem("pva:referral-code", normalized);
      localStorage.setItem("pva:inbound-ref", normalized);
      // Report the click to the backend so the referrer's dashboard shows real
      // link traffic online (not just in a browser).
      const apiBase =
        process.env.NEXT_PUBLIC_VERIFICATION_API_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "";
      if (apiBase) {
        fetch(`${apiBase.replace(/\/+$/, "")}/api/referrals/${encodeURIComponent(normalized)}/click`, {
          method: "POST",
        }).catch(() => {});
      }
    } catch {
      /* ignore quota */
    }
    setInbound(normalized);
  }, [searchParams]);

  if (!inbound || dismissed) return null;

  return (
    <div className="border-b border-amber-300/30 bg-amber-300/10 px-4 py-2">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-xs text-amber-100">
        <p>
          You arrived via referral code <strong className="tracking-widest">{inbound}</strong> —
          any purchase you make supports the person who sent you. It is recorded automatically.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded border border-amber-300/30 px-2 py-1 text-amber-200 transition-colors hover:bg-amber-300/20"
          aria-label="Dismiss referral notice"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function readStoredCode(): string | null {
  try {
    return (
      window.localStorage.getItem("pva:referral-code") ||
      window.localStorage.getItem("pva:inbound-ref")
    );
  } catch {
    return null;
  }
}

/** Shared helper so cart/checkout flows can attach the stored referral code. */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return readStoredCode();
}