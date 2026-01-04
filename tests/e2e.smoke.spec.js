const { test, expect } = require("@playwright/test");

test("PVABAZAAR core routes + nav links", async ({ page }) => {
  await page.goto("https://pvabazaar.org/#/");

  // Basic navigation
  await page.getByRole("link", { name: "Journal" }).click();
  await expect(page).toHaveURL(/#\/journal/);

  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page).toHaveURL(/#\/archive/);

  await page.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/#\/search/);

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/#\/admin/);
});

test("Frontend actually calls backend /api/archive", async ({ page }) => {
  let sawArchive = false;

  page.on("request", (req) => {
    if (req.url().includes("/api/archive")) sawArchive = true;
  });

  await page.goto("https://pvabazaar.org/#/");
  await page.waitForTimeout(1500);

  expect(sawArchive).toBeTruthy();
});
