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
  ['Melbourne Diggers 1', 'melbourne-diggers:05'], ['Melbourne Diggers 2', 'melbourne-diggers:08'],
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
  ['Seattle Greens 1', 'seattle-greens:02'], ['Seattle Greens 2', 'seattle-greens:09'],
  ['St. Louis Arches', v('st-louis-arches')],
  ['Tulsa Oilmen', v('tulsa-oilmen')],
];
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
    const res = await page.evaluate(async ([name, key, png]) => {
      const a = LSP.lib[key];
      if (!a) return { missing: true };
      LSP.load({ format: 'LSP', version: 1, name, canvas: { bg: 'none', crop: true }, layers: [] });
      LSP.addArt(a, name);
      const lsp = LSP.toLSP(); delete lsp.saved;
      return { lsp, png: png ? (await LSP.exportPNG(1024)).url : null };
    }, [name, key, !!PNG]);
    if (res.missing) { console.log('missing library art', key); continue; }
    fs.writeFileSync(path.join(OUT, slug(name) + '.lsp'), JSON.stringify(res.lsp) + '\n');
    if (PNG) fs.writeFileSync(path.join(PNG, slug(name) + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
    list.push({ file: slug(name) + '.png', name });
  }
  if (PNG) fs.writeFileSync(path.join(PNG, '..', 'list.json'), JSON.stringify(list));
  console.log(list.length, 'logos written', errors.length ? 'errors: ' + errors.join(' | ') : '');
  await browser.close();
})();
