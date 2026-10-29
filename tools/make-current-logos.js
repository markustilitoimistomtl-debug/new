// Saves the current team logos (the league sheet icons and the chosen concepts, traced into lsp-library.js)
// as .lsp files in logos/uudet-logot/ and, with a preview folder, as 1024 px PNG files.
// Usage: node tools/make-current-logos.js [pngDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'logos', 'uudet-logot');
const PNG = process.argv[2] || null;

const v = k => 'vbl-current:' + k;
// [display name, library key]; teams with several logos are numbered
const LOGOS = [
  ['Albuquerque Balloons', v('albuquerque-balloons')],
  ['Baltimore Bigfeet 1', 'baltimore-bigfeet:04'], ['Baltimore Bigfeet 2', 'baltimore-bigfeet:06'],
  ['Birmingham Ironmen', v('birmingham-ironmen')],
  ['Buffalo Windmills', v('buffalo-windmills')],
  ['Cincinnati Cleaners', v('cincinnati-cleaners')],
  ['Columbus Inventors', v('columbus-inventors')],
  ['El Paso Scorpions', v('el-paso-scorpions')],
  ['Hartford Connectors 1', 'hartford-connectors:06'], ['Hartford Connectors 2', 'hartford-connectors:09'],
  ['Honolulu Nene', v('honolulu-nene')],
  ['Jacksonville Manatees', v('jacksonville-manatees')],
  ['Kansas City Stockmen', v('kansas-city-stockmen')],
  ['Kansas City Tumblers', 'kansas-city-tumblers:07'],
  ['Louisville Claws 1', v('louisville-claws')], ['Louisville Claws 2', 'louisville-claws:06'], ['Louisville Claws 3', 'louisville-claws:07'],
  ['Melbourne Diggers', 'built:diggers'],
  ['Melbourne Moose', v('melbourne-moose')],
  ['Mexico City Cardones 1', 'mexico-city-cardones:01'], ['Mexico City Cardones 2', 'mexico-city-cardones:05'],
  ['Mexico City Cardones 3', 'mexico-city-cardones:06'], ['Mexico City Cardones 4', 'mexico-city-cardones:10'],
  ['Montreal Beavers', v('montreal-beavers')],
  ['Nashville Pickers', v('nashville-pickers')],
  ['Omaha Express', v('omaha-express')],
  ['Pittsburgh Passers', v('pittsburgh-passers')],
  ['Providence Jewelers', v('providence-jewelers')],
  ['Raleigh Red Wolves', v('raleigh-red-wolves')],
  ['Richmond Foxes', v('richmond-foxes')],
  ['San Diego Sea Lions', v('san-diego-sea-lions')],
  ['St. Louis Arches', v('st-louis-arches')],
  ['Tulsa Oilmen', v('tulsa-oilmen')],
  ['Vancouver Greens', 'seattle-greens:09'],  // the former Seattle Greens tree logo, now Vancouver's
  ['Austin Ramparts', 'built:ramparts'],
];
// logos built from LSP's own shapes and art
const INK = '#0a1020', SH = { shOn: true, shX: 4, shY: 7, shB: 6, shO: 0.45 };
const BUILT = {
  // rampart shield with crossed one-color flags, white and red
  ramparts: [
    { type: 'shape', id: 'bg', x: 500, y: 500, sx: 3.4, sy: 3.4, p: { k: 'rampart' },
      s: { fill: 'linear', c1: '#2a5080', c2: '#132841', o1c: '#cfd3da', o1w: 6, o2c: '#14111f', o2w: 4, bevel: 1.5, ...SH } },
    { type: 'clip', id: 'fl', x: 500, y: 480, sx: 2.45, sy: 2.45, p: { k: 'flags' },
      s: { fill: 'linear', c1: '#c08a4a', c2: '#7a4f24', angle: 0, detC: '#f3f3f1', det2C: '#c8102e', o1c: '#14111f', o1w: 3, ...SH, shX: 3, shY: 5, shB: 3 } }],
  // the shield with the ball (concept 5), with the leaning pickaxe of concept 8 in place of the shovel
  diggers: [
    { type: 'shape', id: 'bg', x: 500, y: 500, sx: 3.3, sy: 3.4, p: { k: 'rampart2' },
      s: { fill: 'linear', c1: '#1b2742', c2: INK, o1c: '#c9a25a', o1w: 5, o2c: INK, o2w: 3, ...SH } },
    { type: 'clip', id: 'ball', x: 520, y: 405, sx: 1.55, sy: 1.55, p: { k: 'ball' }, clip: { t: 'bg', m: 'in', gap: 0 },
      s: { fill: 'radial', c1: '#ffcf5a', c2: '#d68a00', detC: '#2a1a05', detW: 5, o1c: INK, o1w: 3 } },
    { type: 'clip', id: 'pick', x: 505, y: 560, sx: 2.05, sy: 2.05, rot: -40, p: { k: 'pick' },
      s: { fill: 'chrome', c1: '#eef0f3', c2: '#4b5563', angle: 90, o1c: INK, o1w: 4, ...SH } }],
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'lsp.html'));
  await page.waitForFunction(() => window.LSP);
  const list = [];
  for (const [name, key] of LOGOS) {
    const built = key.startsWith('built:') ? BUILT[key.slice(6)] : null;
    const res = await page.evaluate(async ([name, key, png, built]) => {
      if (built) LSP.load({ format: 'LSP', version: 1, name, canvas: { bg: 'none', crop: true }, layers: built });
      else {
        const a = LSP.lib[key];
        if (!a) return { missing: true };
        LSP.load({ format: 'LSP', version: 1, name, canvas: { bg: 'none', crop: true }, layers: [] });
        LSP.addArt(a, name);
      }
      await document.fonts.ready;
      const lsp = LSP.toLSP(); delete lsp.saved;
      return { lsp, png: png ? (await LSP.exportPNG(1024)).url : null };
    }, [name, key, !!PNG, built]);
    if (res.missing) { console.log('missing library art', key); continue; }
    fs.writeFileSync(path.join(OUT, slug(name) + '.lsp'), JSON.stringify(res.lsp) + '\n');
    if (PNG) fs.writeFileSync(path.join(PNG, slug(name) + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
    list.push({ file: slug(name) + '.png', name });
  }
  if (PNG) fs.writeFileSync(path.join(PNG, '..', 'list.json'), JSON.stringify(list));
  console.log(list.length, 'logos written', errors.length ? 'errors: ' + errors.join(' | ') : '');
  await browser.close();
})();
