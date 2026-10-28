// Saves every traced library logo (lsp-library.js) as its own editable .lsp file under logos/originals/.
// Usage: node tools/make-original-lsp.js [previewDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const PREVIEW = process.argv[2] || null;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('file://' + path.join(ROOT, 'lsp.html'));
  await page.waitForFunction(() => window.LSP);
  const keys = await page.evaluate(() => Object.keys(LSP.lib));
  for (const key of keys) {
    const res = await page.evaluate(async ([key, preview]) => {
      const a = LSP.lib[key];
      LSP.load({ format: 'LSP', version: 1, name: a.n, canvas: { bg: 'none', crop: true }, layers: [] });
      LSP.addArt(a);
      const lsp = LSP.toLSP(); delete lsp.saved;
      const png = preview ? (await LSP.exportPNG(256)).url : null;
      return { lsp, png };
    }, [key, !!PREVIEW]);
    const [grp, item] = key.split(':');
    const out = path.join(ROOT, 'logos', 'originals', grp, `${item}.lsp`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(res.lsp) + '\n');
    if (PREVIEW) fs.writeFileSync(path.join(PREVIEW, `${grp}__${item}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
  }
  console.log(keys.length, 'files written');
  await browser.close();
})();
