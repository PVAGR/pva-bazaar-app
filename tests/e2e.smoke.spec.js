const { test, expect } = require("@playwright/test");

test("PVABAZAAR core routes + nav links", async ({ page }) => {
  await page.goto("/#/");

  // Homepage loads with archive content
  await expect(page.getByRole("heading", { name: /Complete Archive|The Complete Archive/i })).toBeVisible();

  // Navigate to Admin (link in archive header)
  await page.getByRole("link", { name: /Admin/i }).click();
  await expect(page).toHaveURL(/#\/admin/);

  // Navigate to Chat with Richard (public route)
  await page.goto("/#/chat");
  await expect(page.getByRole("heading", { name: /Chat with Richard/i })).toBeVisible();

  // Navigate to About
  await page.goto("/#/about");
  await expect(page).toHaveURL(/#\/about/);

  // Navigate to Marketplace
  await page.goto("/#/marketplace");
  await expect(page).toHaveURL(/#\/marketplace/);
});

test("Frontend calls backend /api/archive when loading archive", async ({ page }) => {
  let sawArchive = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/archive")) sawArchive = true;
  });

  await page.goto("/#/");
  await page.waitForLoadState("networkidle");

  expect(sawArchive).toBeTruthy();
});
