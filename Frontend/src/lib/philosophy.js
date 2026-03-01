/**
 * Philosophy & mission constants for PVA Bazaar.
 * Why: Single source of truth for the site's intent—so UI and copy stay aligned
 * with sovereignty, transparency, and anti-deceit (Anti-Druj). Every function
 * we build should be verifiable; these constants make that standard explicit.
 */

/** Mission statement shown in manifesto, footer, or about. */
export const MISSION_STATEMENT =
  'PVA Bazaar preserves scarce knowledge and public-domain artifacts through AI-verified provenance—so authenticity is transparent and sovereign.';

/** Standard we commit to for artifact verification (hash + chain). */
export const VERIFICATION_STANDARD =
  'Artifacts are verified by content hash and optional on-chain proof. Verification runs in CI (e.g. GitHub Actions) and is reproducible.';

/** Short tagline for nav and headers. */
export const SITE_TAGLINE = 'AI-Verified Preservation';

/** Philosophy pillar: against deceit (Druj). */
export const ANTI_DRUJ =
  'We build for transparency and verifiability—no hidden claims, no unverifiable provenance.';

export default {
  MISSION_STATEMENT,
  VERIFICATION_STANDARD,
  SITE_TAGLINE,
  ANTI_DRUJ,
};
