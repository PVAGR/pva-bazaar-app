(async () => {
  const htmlRes = await fetch(`https://pvabazaar.org/?v=${Date.now()}`);
  const html = await htmlRes.text();
  const match = html.match(/\/assets\/[^"']+\.js/);
  if (!match) {
    console.log('asset parse failed');
    return;
  }

  const asset = match[0];
  const jsRes = await fetch(`https://pvabazaar.org${asset}?v=${Date.now()}`);
  const js = await jsRes.text();

  console.log(`asset=${asset}`);
  console.log(`containsMessage=${js.includes('Admin self-signup is temporarily unavailable due to backend storage capacity')}`);
})();
