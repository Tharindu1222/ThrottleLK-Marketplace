const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = '';
        res.on('data', (c) => {
          d += c;
        });
        res.on('end', () => resolve(d));
      })
      .on('error', reject);
  });
}

(async () => {
  const html = await get('http://localhost:3000/en/account/profile?bust=12');
  console.log('html len', html.length);
  console.log(html.slice(0, 500));
  const scripts = [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s\\]+/g)].map(
    (m) => m[0],
  );
  console.log('scripts', [...new Set(scripts)]);
  for (const s of scripts) {
    const url = s.startsWith('http') ? s : 'http://localhost:3000' + s;
    const js = await get(url);
    if (!js.includes('AccountSidebar')) continue;
    console.log('\nFILE', s, 'len', js.length);
    let from = 0;
    let n = 0;
    while (n < 8) {
      const i = js.indexOf('items', from);
      if (i < 0) break;
      const prev = js[i - 1] || '';
      const next = js[i + 5] || '';
      const bare = !/[.\w$]/.test(prev) && !/[\w-]/.test(next);
      if (bare) {
        console.log('bare', i, JSON.stringify(js.slice(i - 60, i + 40)));
        n++;
      }
      from = i + 5;
    }
  }
})();
