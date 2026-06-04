/**
 * Philosophy & mission constants for PVA Bazaar.
 * Why: Single source of truth for the site's intent—so UI and copy stay aligned
 * with sovereignty, transparency, and anti-deceit (Anti-Druj). Every function
 * we build should be verifiable; these constants make that standard explicit.
 */

/** Mission statement shown in manifesto, footer, or about. */
export const MISSION_STATEMENT =
  'PVA Bazaar exists to practice truthful trade, preserve living memory, and build systems of work that remain useful, legible, and trustworthy beyond a single lifetime.';

/** Standard we commit to for artifact verification (hash + chain). */
export const VERIFICATION_STANDARD =
  'Artifacts are verified by content hash and optional on-chain proof. Verification runs in CI (e.g. GitHub Actions) and is reproducible.';

/** Short tagline for nav and headers. */
export const SITE_TAGLINE = 'Truthful trade · living memory · long continuity';

/** Philosophy pillar: against deceit (Druj). */
export const ANTI_DRUJ =
  'We build against deception: no hidden claims, no severed story, no unverifiable provenance, and no trade surface that forgets the human labor behind the object.';

/** Shared manifesto copy for public mission surfaces. */
export const FEDERATION_MANIFESTO =
  'PVA Bazaar begins from a simple conviction: useful commerce should not be separated from truth, memory, and reverence for the people doing the work. The platform connects makers and buyers while keeping origin, testimony, and accountability attached to every relationship.';

export default {
  MISSION_STATEMENT,
  VERIFICATION_STANDARD,
  SITE_TAGLINE,
  ANTI_DRUJ,
  FEDERATION_MANIFESTO,
};
