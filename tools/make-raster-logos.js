// Builds the current team logos as picture layers from logos/lahdekuvat/ (cut from the league sheets),
// so they keep the look of the original painted images; Austin Ramparts and Melbourne Diggers are
// built from LSP's own shapes. Writes logos/uudet-logot/*.lsp and, with a folder, 1024 px PNG files.
// Usage: node tools/make-raster-logos.js [pngDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'logos', 'lahdekuvat');
const OUT = path.join(ROOT, 'logos', 'uudet-logot');
const PNG = process.argv[2] || null;

const NAMES = {
  'albuquerque-balloons': 'Albuquerque Balloons', 'baltimore-bigfeet-1': 'Baltimore Bigfeet 1', 'baltimore-bigfeet-2': 'Baltimore Bigfeet 2',
  'birmingham-ironmen': 'Birmingham Ironmen', 'buffalo-windmills': 'Buffalo Windmills', 'cincinnati-cleaners': 'Cincinnati Cleaners',
  'columbus-inventors': 'Columbus Inventors', 'el-paso-scorpions': 'El Paso Scorpions', 'hartford-connectors-1': 'Hartford Connectors 1',
  'hartford-connectors-2': 'Hartford Connectors 2', 'honolulu-nene': 'Honolulu Nene', 'jacksonville-manatees': 'Jacksonville Manatees',
  'kansas-city-stockmen': 'Kansas City Stockmen', 'kansas-city-tumblers': 'Kansas City Tumblers', 'louisville-claws-1': 'Louisville Claws 1',
  'louisville-claws-2': 'Louisville Claws 2', 'louisville-claws-3': 'Louisville Claws 3', 'melbourne-moose': 'Melbourne Moose',
  'mexico-city-cardones-1': 'Mexico City Cardones 1', 'mexico-city-cardones-2': 'Mexico City Cardones 2', 'mexico-city-cardones-3': 'Mexico City Cardones 3',
  'mexico-city-cardones-4': 'Mexico City Cardones 4', 'montreal-beavers': 'Montreal Beavers', 'nashville-pickers': 'Nashville Pickers',
  'omaha-express': 'Omaha Express', 'pittsburgh-passers': 'Pittsburgh Passers', 'providence-jewelers': 'Providence Jewelers',
  'raleigh-red-wolves': 'Raleigh Red Wolves', 'richmond-foxes': 'Richmond Foxes', 'san-diego-sea-lions': 'San Diego Sea Lions',
  'st-louis-arches': 'St. Louis Arches', 'tulsa-oilmen': 'Tulsa Oilmen', 'vancouver-greens': 'Vancouver Greens',
};
const INK = '#0a1020', SH = { shOn: true, shX: 4, shY: 7, shB: 6, shO: 0.45 };
const BUILT = {
  'austin-ramparts': ['Austin Ramparts', [
    { type: 'shape', id: 'bg', x: 500, y: 500, sx: 3.4, sy: 3.4, p: { k: 'rampart' },
      s: { fill: 'linear', c1: '#2a5080', c2: '#132841', o1c: '#cfd3da', o1w: 6, o2c: '#14111f', o2w: 4, bevel: 1.5, ...SH } },
    { type: 'clip', id: 'fl', x: 500, y: 480, sx: 2.45, sy: 2.45, p: { k: 'flags' },
      s: { fill: 'linear', c1: '#c08a4a', c2: '#7a4f24', angle: 0, detC: '#f3f3f1', det2C: '#c8102e', o1c: '#14111f', o1w: 3, ...SH, shX: 3, shY: 5, shB: 3 } }]],
  'melbourne-diggers': ['Melbourne Diggers', [
    { type: 'shape', id: 'bg', x: 500, y: 500, sx: 3.3, sy: 3.4, p: { k: 'rampart2' },
      s: { fill: 'linear', c1: '#1b2742', c2: INK, o1c: '#c9a25a', o1w: 5, o2c: INK, o2w: 3, ...SH } },
    { type: 'clip', id: 'ball', x: 520, y: 405, sx: 1.55, sy: 1.55, p: { k: 'ball' }, clip: { t: 'bg', m: 'in', gap: 0 },
      s: { fill: 'radial', c1: '#ffcf5a', c2: '#d68a00', detC: '#2a1a05', detW: 5, o1c: INK, o1w: 3 } },
    { type: 'clip', id: 'pick', x: 505, y: 560, sx: 2.05, sy: 2.05, rot: -40, p: { k: 'pick' },
      s: { fill: 'chrome', c1: '#eef0f3', c2: '#4b5563', angle: 90, o1c: INK, o1w: 4, ...SH } }]],
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'lsp.html'));
  await page.waitForFunction(() => window.LSP);
  const jobs = [
    ...Object.entries(NAMES).map(([k, name]) => ({ k, name, href: 'data:image/webp;base64,' + fs.readFileSync(path.join(SRC, k + '.webp')).toString('base64') })),
    ...Object.entries(BUILT).map(([k, [name, layers]]) => ({ k, name, layers })),
  ];
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.lsp')) fs.unlinkSync(path.join(OUT, f));
  const list = [];
  for (const j of jobs) {
    const res = await page.evaluate(async ([j, png]) => {
      let layers = j.layers;
      if (!layers) {
        const img = new Image(); await new Promise(r => { img.onload = r; img.src = j.href; });
        const k = 640 / Math.max(img.width, img.height);
        layers = [{ type: 'image', id: 'pic', name: j.name, x: 500, y: 500, p: { href: j.href, w: img.width * k / 2, h: img.height * k / 2, nw: img.width, nh: img.height }, sx: 2, sy: 2, s: {} }];
      }
      LSP.load({ format: 'LSP', version: 1, name: j.name, canvas: { bg: 'none', crop: true }, layers });
      await document.fonts.ready;
      const lsp = LSP.toLSP(); delete lsp.saved;
      return { lsp, png: png ? (await LSP.exportPNG(1024)).url : null };
    }, [j, !!PNG]);
    fs.writeFileSync(path.join(OUT, j.k + '.lsp'), JSON.stringify(res.lsp) + '\n');
    if (PNG) fs.writeFileSync(path.join(PNG, j.k + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
    list.push({ file: j.k + '.png', name: j.name });
  }
  if (PNG) fs.writeFileSync(path.join(PNG, '..', 'list.json'), JSON.stringify(list));
  console.log(list.length, 'logos written', errors.length ? 'errors: ' + errors.join(' | ') : '');
  await browser.close();
})();
