// Builds a logo for every team with the LSP logo wizard (the same code the ✦ Logo wizard runs)
// and saves them to logos/uudet-logot/, where LSP lists them under Templates → New logos.
// Usage: node tools/make-team-logos.js [previewDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'logos', 'uudet-logot');
const PREVIEW = process.argv[2] || null;

// wizard style numbers (0-based): 0 white matte, 1 black matte, 2 brushed aluminum, 3 gold, 4 mirror chrome, 5 copper,
// 9 glossy white, 10 silver, 11 faceted, 14 neon blue, 15 neon orange, 17 carbon, 18 black + gold rim,
// 19 navy + red/white rim, 20 black + bronze rim, 21 blue metallic, 22 holographic, 29 black/gold split
const vbl = (city, nick, bg, style, tint, accent, extra = {}) => ({
  name: `${city} ${nick}`, bg, style, tint,
  symbols: [{ lib: 'vbl:' + `${city} ${nick}`.toLowerCase().replace(/\./g, '').replace(/ /g, '-'), mode: 'separate' }],
  texts: [{ text: city.toUpperCase(), pos: 'arctop', look: 'clean', blend: true, mode: 'print', color: accent },
          { text: nick.toUpperCase(), pos: 'below', look: 'varsity', color: accent }],
  ...extra,
});

const TEAMS = [
  vbl('Baltimore', 'Shipwrights', 'notch', 18, '#1f3a5f', '#f2b134'),
  vbl('Providence', 'Jewelers', 'oct', 18, '#4b2a7b', '#e6c88f'),
  vbl('Hartford', 'Underwriters', 'classic', 2, null, '#2f6b45'),
  vbl('Buffalo', 'Windmills', 'circle', 21, '#244f8f', '#f2b134'),
  vbl('Montreal', 'Beavers', 'notch', 18, '#5a0f12', '#ffffff'),
  vbl('Richmond', 'Foxes', 'circle', 15, null, '#f38a2a'),
  vbl('Raleigh', 'Red Wolves', 'heater', 17, null, '#e0473b'),
  vbl('Pittsburgh', 'Passers', 'wide', 18, null, '#ffd166'),
  vbl('Cincinnati', 'Cleaners', 'circle', 2, '#4f6f92', '#f08c00'),
  vbl('Columbus', 'Inventors', 'kite', 9, '#7a1f2a', '#e9e6f2'),
  vbl('Louisville', 'Claws', 'spiky', 1, null, '#e0473b'),
  vbl('Nashville', 'Pickers', 'circle', 19, null, '#ff7a63'),
  vbl('Birmingham', 'Ironmen', 'tablet', 5, '#7a3d1f', '#f3c8a8'),
  vbl('Jacksonville', 'Manatees', 'circle', 21, '#1f8a87', '#f2b134'),
  vbl('St. Louis', 'Arches', 'rampart2', 2, null, '#3a7bd5'),
  vbl('Kansas City', 'Stockmen', 'badge', 18, '#4a2a14', '#e9d4ad'),
  vbl('Omaha', 'Express', 'wide', 4, null, '#c8102e'),
  vbl('Tulsa', 'Oilmen', 'peak', 18, null, '#e8b04a'),
  vbl('Austin', 'Ramparts', 'rampart', 19, null, '#ff8a3d'),
  vbl('El Paso', 'Scorpions', 'heater', 1, null, '#e3a94a'),
  vbl('Mexico City', 'Cardones', 'scallop3', 0, '#2d6a3e', '#f3e6c8'),
  vbl('Seattle', 'Ferries', 'circle', 21, '#1d3557', '#ffffff'),
  vbl('Vancouver', 'Cedars', 'peak', 0, '#1e5631', '#e8d5a0'),
  vbl('Melbourne', 'Moose', 'heater', 5, '#6b3a1e', '#f2b134'),
  vbl('Honolulu', 'Nene', 'circle', 11, '#2f7d5a', '#f2c14e'),
  vbl('San Diego', 'Sea Lions', 'circle', 21, null, '#f2b134'),
  vbl('Albuquerque', 'Balloons', 'burst', 22, null, '#e8434f'),
  // teams from the concept sheet that are not in the league image
  { name: 'Baltimore Bigfeet', bg: 'glyph', glyph: { ch: 'B', font: 'Bowlby One SC', fill: true }, style: 18, tint: '#4b2a7b',
    symbols: [{ k: 'foot', mode: 'print', color: '#e6dcff', scale: 1.25 }],
    texts: [{ text: 'BIGFEET', pos: 'below', look: 'varsity', color: '#9b7ad1' }] },
  { name: 'Hartford Connectors', bg: 'notch', style: 19, tint: null,
    symbols: [{ k: 'bridge', mode: 'print', color: '#ffffff' }],
    texts: [{ text: 'HARTFORD', pos: 'arctop', look: 'clean', blend: true, mode: 'print', color: '#ffffff' },
            { text: 'CONNECTORS', pos: 'below', look: 'varsity', color: '#c8102e' }] },
  { name: 'Kansas City Tumblers', bg: 'circle', style: 21, tint: '#1d3f7a',
    symbols: [{ k: 'cup', mode: 'separate', color: '#f2b134' }],
    texts: [{ text: 'KANSAS CITY', pos: 'arctop', look: 'clean', blend: true, mode: 'print', color: '#ffffff' },
            { text: 'TUMBLERS', pos: 'below', look: '3d', color: '#f2b134' }] },
  { name: 'Seattle Greens', bg: 'peak', style: 0, tint: '#1e5631',
    symbols: [{ k: 'needle', mode: 'print', color: '#e8f0e0' }],
    texts: [{ text: 'SEATTLE', pos: 'arctop', look: 'clean', blend: true, mode: 'print', color: '#f2b134' },
            { text: 'GREENS', pos: 'below', look: 'varsity', color: '#7cb342' }] },
  { name: 'Melbourne Diggers', bg: 'circle', style: 18, tint: '#14213d',
    symbols: [{ k: 'picks', mode: 'print', color: '#d6d9df' }],
    texts: [{ text: 'MELBOURNE', pos: 'arctop', look: 'clean', blend: true, mode: 'print', color: '#fca311' },
            { text: 'DIGGERS', pos: 'below', look: '3d', color: '#fca311' }] },
];

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'lsp.html'));
  await page.waitForFunction(() => window.LSP);
  fs.mkdirSync(OUT, { recursive: true });
  for (const team of TEAMS) {
    const res = await page.evaluate(async ([team, preview]) => {
      const layers = await LSP.wizardLayers(team);
      LSP.load({ format: 'LSP', version: 1, name: team.name, canvas: { bg: 'none', crop: true }, layers });
      await document.fonts.ready;
      const lsp = LSP.toLSP(); delete lsp.saved;
      return { lsp, png: preview ? (await LSP.exportPNG(360)).url : null };
    }, [team, !!PREVIEW]);
    fs.writeFileSync(path.join(OUT, slug(team.name) + '.lsp'), JSON.stringify(res.lsp) + '\n');
    if (PREVIEW) fs.writeFileSync(path.join(PREVIEW, slug(team.name) + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
  }
  console.log(TEAMS.length, 'team logos written', errors.length ? 'errors: ' + errors.join(' | ') : '');
  await browser.close();
})();
