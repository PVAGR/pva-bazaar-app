#!/usr/bin/env node

const base = normalizeBase(process.argv[2] || process.env.SEO_BASE_URL || "https://pvabazaar.org");

async function main() {
  console.log(`🔎 SEO surface verification for ${base}`);

  const checks = [
    { name: "Homepage redirect target", url: `${base}/get-started`, expects: [200] },
    { name: "Recovery page", url: `${base}/recovery`, expects: [200] },
    { name: "robots.txt", url: `${base}/robots.txt`, expects: [200] },
    { name: "sitemap.xml", url: `${base}/sitemap.xml`, expects: [200] },
    { name: "OpenGraph image", url: `${base}/og-default.svg`, expects: [200] },
    { name: "Twitter image", url: `${base}/og-default.svg`, expects: [200] },
  ];

  let failed = 0;
  const robotsText = await checkText(checks[2]);
  const sitemapText = await checkText(checks[3]);
  await checkBinary(checks[4], "image/");
  await checkBinary(checks[5], "image/");

  for (const item of [checks[0], checks[1]]) {
    const ok = await checkStatus(item);
    if (!ok) failed += 1;
  }

  if (!robotsText.ok) failed += 1;
  if (!sitemapText.ok) failed += 1;

  if (robotsText.body && !robotsText.body.toLowerCase().includes("sitemap:")) {
    failed += 1;
    console.error("❌ robots.txt missing sitemap reference");
  }

  if (sitemapText.body) {
    const urls = [...sitemapText.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).filter(Boolean);
    if (urls.length < 5) {
      failed += 1;
      console.error(`❌ sitemap.xml has too few URLs (${urls.length})`);
    } else {
      console.log(`✅ sitemap.xml URL count: ${urls.length}`);
    }
    const requiredPaths = ["/get-started", "/recovery", "/heelkawn"];
    for (const path of requiredPaths) {
      if (!urls.some((u) => u.endsWith(path) || u.includes(`${path}</loc>`))) {
        failed += 1;
        console.error(`❌ sitemap.xml missing ${path}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\n❌ SEO verification failed with ${failed} issue(s).`);
    process.exit(1);
  }

  console.log("\n✅ SEO surface verification passed.");
}

function normalizeBase(value) {
  try {
    const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://pvabazaar.org";
  }
}

async function checkStatus(item) {
  try {
    const response = await fetch(item.url, { redirect: "follow" });
    const ok = item.expects.includes(response.status);
    if (ok) {
      console.log(`✅ ${item.name}: ${response.status}`);
      return true;
    }
    console.error(`❌ ${item.name}: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`❌ ${item.name}: ${(error && error.message) || "request failed"}`);
    return false;
  }
}

async function checkText(item) {
  try {
    const response = await fetch(item.url, { redirect: "follow" });
    const body = await response.text();
    const ok = item.expects.includes(response.status);
    if (ok) {
      console.log(`✅ ${item.name}: ${response.status}`);
    } else {
      console.error(`❌ ${item.name}: ${response.status}`);
    }
    return { ok, body };
  } catch (error) {
    console.error(`❌ ${item.name}: ${(error && error.message) || "request failed"}`);
    return { ok: false, body: "" };
  }
}

async function checkBinary(item, expectedContentTypePrefix) {
  try {
    const response = await fetch(item.url, { redirect: "follow" });
    const contentType = response.headers.get("content-type") || "";
    const ok = item.expects.includes(response.status) && contentType.toLowerCase().startsWith(expectedContentTypePrefix);
    if (ok) {
      console.log(`✅ ${item.name}: ${response.status} (${contentType})`);
      return true;
    }
    console.error(`❌ ${item.name}: ${response.status} (${contentType || "unknown content-type"})`);
    return false;
  } catch (error) {
    console.error(`❌ ${item.name}: ${(error && error.message) || "request failed"}`);
    return false;
  }
}

main().catch((error) => {
  console.error(`❌ Fatal error: ${(error && error.message) || error}`);
  process.exit(1);
});
