/**
 * Final UX patch — mobile navigation + blog feed render verification.
 *
 * Runs against a local vite preview of the freshly built bundle (dist/), so
 * it exercises the real production build, not dev mode. Checks:
 *  - header does not overflow at 390x844 and 430x932 (no horizontal scroll)
 *  - hamburger opens the mobile nav; Escape closes it
 *  - /blog renders the combined feed (archive + blog posts) from the live API
 *  - sort buttons work
 *  - archive page cross-links to /blog
 */
const { test, expect } = require('@playwright/test');

const MOBILE_VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
];

// Wait until the feed settles: items render, or an explicit terminal state
// (empty / error) replaces the loading state.
async function waitForFeedSettled(page) {
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('.blog-index__status--loading');
      if (loading) return false;
      return (
        document.querySelector('.blog-index__item') !== null ||
        document.querySelector('.blog-index__status--empty') !== null ||
        document.querySelector('.blog-index__status--error') !== null
      );
    },
    { timeout: 30000 },
  );
}

// When LOCAL_FEED_API is set, the browser is pointed at a local backend
// (local-e2e-boot.cjs) that serves the new /api/blog-feed endpoint with
// seeded posts. Without it, tests run against whatever API the bundle's
// api-base.json resolves to (production), and feed assertions fall back to
// accepting the explicit empty state.
const LOCAL_FEED_API = process.env.LOCAL_FEED_API || '';

async function pointBrowserAtLocalApi(page) {
  if (!LOCAL_FEED_API) return;
  // The SPA resolves its API base once at init, so the override must be in
  // place before the app script ever runs — addInitScript does that on every
  // navigation.
  await page.addInitScript((api) => {
    window.localStorage.setItem('api-base-url', api);
  }, LOCAL_FEED_API);
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`mobile header at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('header does not overflow horizontally', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const overflow = await page.evaluate(() => {
        const header = document.querySelector('.layout__header');
        if (!header) return { missing: true };
        return {
          missing: false,
          docScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          headerScrollX: header.scrollWidth > header.clientWidth,
        };
      });
      expect(overflow.missing).toBe(false);
      expect(overflow.docScrollX, 'document must not scroll horizontally').toBe(false);
      expect(overflow.headerScrollX, 'header must not overflow internally').toBe(false);
    });

    test('hamburger opens nav and Escape closes it', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hamburger = page.locator('.layout__hamburger');
      if (await hamburger.isHidden()) {
        // Viewport above the 800px breakpoint — nav is inline, nothing to test.
        test.skip(true, 'hamburger not visible at this width');
      }

      await hamburger.click();
      const mobileNav = page.locator('#mobile-nav');
      await expect(mobileNav).toBeVisible();
      await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

      await page.keyboard.press('Escape');
      await expect(mobileNav).toBeHidden();
      await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    test('mobile nav Search opens the universal search', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hamburger = page.locator('.layout__hamburger');
      await hamburger.click();
      const searchBtn = page.locator('#mobile-nav button', { hasText: 'Search' });
      await searchBtn.click();

      const overlay = page.locator('.universal-search-overlay');
      await expect(overlay.first()).toBeVisible();
    });
  });
}

test.describe('blog feed (built bundle + live API)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('/blog shows published posts from the combined feed', async ({ page }) => {
    await pointBrowserAtLocalApi(page);
    await page.goto('/#/blog');
    await waitForFeedSettled(page);

    const itemCount = await page.locator('.blog-index__item').count();
    if (itemCount === 0) {
      // Acceptable only if the explicit empty state is shown (no posts yet)
      const empty = await page.locator('.blog-index__status--empty').count();
      expect(empty).toBeGreaterThan(0);
    } else {
      expect(itemCount).toBeGreaterThan(0);
      const firstTitle = await page.locator('.blog-index__itemTitle').first().textContent();
      expect(firstTitle.trim().length).toBeGreaterThan(0);
    }
  });

  test('sort buttons reorder the feed', async ({ page }) => {
    await pointBrowserAtLocalApi(page);
    await page.goto('/#/blog');
    await waitForFeedSettled(page);

    const itemCount = await page.locator('.blog-index__item').count();
    if (itemCount < 2) {
      test.skip(true, 'need 2+ posts to verify sorting');
    }

    const titlesBefore = await page.locator('.blog-index__itemTitle').allTextContents();
    await page.click('[title="Sort by oldest first"]');
    const titlesAfter = await page.locator('.blog-index__itemTitle').allTextContents();
    expect(titlesAfter).toEqual([...titlesBefore].reverse());
  });

  test('archive page cross-links to /blog', async ({ page }) => {
    await pointBrowserAtLocalApi(page);
    await page.goto('/#/archive');
    await page.waitForLoadState('networkidle');

    const blogLink = page.locator('a.archive-welcome__blogLink');
    // The link appears in the Recent Posts view; open it if needed
    if (await blogLink.isHidden()) {
      await page.click('button:has-text("Recent Posts")');
    }
    await expect(blogLink.first()).toBeVisible();
    await expect(blogLink.first()).toHaveAttribute('href', /#?\/blog/);
  });
});
