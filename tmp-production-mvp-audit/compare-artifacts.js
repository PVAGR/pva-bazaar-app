const fs = require('fs');
const https = require('https');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

(async () => {
  const localHtml = fs.readFileSync('Frontend/dist/index.html', 'utf8');
  const localJs = [...localHtml.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]);
  const localCss = [...localHtml.matchAll(/\/assets\/[^"']+\.css/g)].map((m) => m[0]);

  const t = Date.now();
  const prodHtml = await get(`https://pvabazaar.org/?v=${t}`);
  const prodJs = [...prodHtml.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0]);
  const prodCss = [...prodHtml.matchAll(/\/assets\/[^"']+\.css/g)].map((m) => m[0]);

  const localMainPath = path.join('Frontend', 'dist', localJs[0].replace(/^\//, ''));
  const localMain = fs.readFileSync(localMainPath, 'utf8');
  const prodMain = await get(`https://pvabazaar.org${prodJs[0]}?v=${t}`);

  console.log('LOCAL_JS', JSON.stringify(localJs));
  console.log('LOCAL_CSS', JSON.stringify(localCss));
  console.log('PROD_JS', JSON.stringify(prodJs));
  console.log('PROD_CSS', JSON.stringify(prodCss));
  console.log('LOCAL_MARKER_PRESENT', localMain.includes('/admin?next='));
  console.log('PROD_MARKER_PRESENT', prodMain.includes('/admin?next='));
})();
