// Builds the example logos as .lsp files by loading each spec into lsp.html
// (headless Chromium) and saving what LSP itself produces.
// Usage: node tools/make-logos.js [previewDir]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'logos', 'rebuilt');
const PREVIEW = process.argv[2] || null;

let n = 0;
const L = (type, p, s = {}, t = {}) => ({ id: 'l' + (++n), type, p, s, ...t });
const shape = (k, s, t) => L('shape', { k }, s, t);
const art = (k, s, t) => L('clip', { k }, s, t);
const text = (txt, font, size, s, t = {}, extra = {}) => L('text', { text: txt, font, size, ls: 2, arc: 0, italic: false, ...extra }, s, t);
const ring = (top, bot, font, s, t = {}, extra = {}) => L('ring', { r: 300, w: 92, top, bot, font, fs: 60, tc: '#ffffff', ls: 6, mark: '★', tsw: 0, tsc: '#14111f', ...extra }, s, t);
const lines = (p, s, t) => L('lines', { mode: 'para', n: 5, len: 320, th: 16, gap: 14, taper: 0.85, stag: 0.35, curve: 0, ...p }, s, t);
const at = (x, y, k = 1, more = {}) => ({ x, y, sx: k, sy: k, ...more });
const ball = (x, y, k, s = {}) => art('ball', { fill: 'radial', c1: '#ffa04d', c2: '#c4520f', detC: '#2a1205', detW: 6, o1c: '#14111f', o1w: 4, ...s }, at(x, y, k));

/* ---------- Vintage Basket League (pixel style) ---------- */
const INK = '#0d0b14';
const px = (s = {}) => ({ o1c: INK, o1w: 5, bevel: 2, ...s });
// Austin Ramparts: rampart shield with the crossed white and red flags
function ramparts(dy = 0, k = 1) {
  return [shape('rampart', px({ fill: 'linear', c1: '#264a72', c2: '#132841', o1c: '#cfd3da', o1w: 6, o2c: INK, o2w: 4, bevel: 1.5 }), at(500, 500 + dy, 3.4 * k)),
    art('flags', { fill: 'linear', c1: '#c08a4a', c2: '#7a4f24', angle: 0, detC: '#f3f3f1', det2C: '#c8102e', o1c: INK, o1w: 3,
      shOn: true, shX: 3, shY: 5, shB: 3, shO: 0.45 }, at(500, 478 + dy * k, 2.45 * k))];
}
const VBL = [
  ['Baltimore Shipwrights', [art('hull', px({ fill: 'linear', c1: '#f2c14e', c2: '#b9831f' }), at(500, 620, 3.3)),
    art('hammers', px({ fill: 'linear', c1: '#4a74a8', c2: '#22406a', detC: '#8a5a2b' }), at(500, 430, 2.6))]],
  ['Providence Jewelers', [shape('oct', px({ fill: 'linear', c1: '#a46ae0', c2: '#4d1f86', o2c: '#d9b88c', o2w: 0, o1c: '#d9b88c' }), at(500, 500, 3.3)),
    art('gem', px({ fill: 'none', o1w: 0, bevel: 0, detC: '#e2c7ff', detW: 5 }), at(500, 510, 2.7))]],
  ['Hartford Underwriters', [art('bulldog', px({ fill: 'linear', c1: '#8fa898', c2: '#5d7a66', detC: '#c7d4c9', det2C: '#1d2a22', lineC: '#1d2a22' }), at(500, 560, 3.1)),
    art('bowler', px({ fill: 'gloss', c1: '#3f7d55', c2: '#1d4a2c', detC: '#12301c' }), at(500, 270, 1.7))]],
  ['Buffalo Windmills', [art('windmill', px({ fill: 'linear', c1: '#6f8fc2', c2: '#33507f', detC: '#8a5a2b' }), at(500, 470, 3.6)), ball(500, 790, 0.62)]],
  ['Montreal Beavers', [art('beaver', px({ fill: 'linear', c1: '#c8352e', c2: '#7d1416', det2C: '#f4efe6', detC: INK, lineC: '#5a0c0c' }), at(470, 480, 3.2)), ball(640, 770, 0.95)]],
  ['Richmond Foxes', [art('foxrun', px({ fill: 'linear', c1: '#f38a2a', c2: '#c8501a', det2C: '#fff6ea', detC: INK }), at(500, 500, 3.7))]],
  ['Raleigh Red Wolves', [art('wolf', px({ fill: 'linear', c1: '#6b2222', c2: '#2c0d0d', detC: '#ff3b2f', lineC: '#ff7a5c' }), at(500, 500, 3.6))]],
  ['Pittsburgh Passers', [lines({ n: 7, len: 420, th: 14, gap: 10 }, px({ fill: 'linear', c1: '#ffd166', c2: '#f08c00', angle: 0, bevel: 0 }), at(360, 560, 1, { rot: -28 })),
    ball(640, 400, 1.9)]],
  ['Cincinnati Cleaners', [shape('gear', px({ fill: 'chrome', c1: '#a9c6e4', c2: '#4f6f92' }), at(500, 500, 3.4)), ball(500, 500, 2.1)]],
  ['Columbus Inventors', [art('bulb', px({ fill: 'gloss', c1: '#f4eef6', c2: '#c9b9cf', lineC: '#8b2a3a', detW: 4 }), at(500, 520, 3.4)), ball(500, 390, 1.35, { fill: 'radial', c1: '#d0473a', c2: '#7a1f1a' })]],
  ['Louisville Claws', [art('talon', px({ fill: 'linear', c1: '#c33a33', c2: '#741515', det2C: '#f4efe6', lineC: '#4a0c0c' }), at(500, 500, 3.5))]],
  ['Nashville Pickers', (() => { const pick = shape('gpick', px({ fill: 'linear', c1: '#2a3350', c2: '#121829', o1c: '#ff6b57' }), at(500, 500, 3.4));
    const band = shape('rsq', { fill: 'solid', c1: '#ff7a63' }, at(500, 800, 4)); band.clip = { t: pick.id, m: 'in', gap: 0 };
    return [pick, band, lines({ n: 6, len: 420, th: 6, gap: 18, taper: 0, stag: 0 }, { fill: 'solid', c1: '#d9dce6' }, at(500, 430, 1, { rot: 90 })),
      shape('rsq', { fill: 'none', o1c: '#ff6b57', o1w: 6 }, at(500, 300, 1, { sx: 1.9, sy: 0.32 }))]; })()],
  ['Birmingham Ironmen', [art('bust', px({ fill: 'linear', c1: '#c9874f', c2: '#4a2a14', lineC: '#3a1e0c' }), at(500, 500, 3.4))]],
  ['Jacksonville Manatees', [art('manatee', px({ fill: 'linear', c1: '#4fb3b0', c2: '#22706f', det2C: INK, lineC: '#174e4d' }), at(540, 560, 3.3)),
    art('basketHoop', px({ fill: 'solid', c1: '#e8e8ee', lineC: '#e8e8ee', detW: 4, bevel: 0 }), at(310, 330, 1.5)), ball(300, 250, 0.6)]],
  ['St. Louis Arches', [art('gateway', px({ fill: 'chrome', c1: '#d6d9df', c2: '#6b7280' }), at(500, 480, 3.5)), ball(500, 780, 0.65)]],
  ['Kansas City Stockmen', [art('longhorn', px({ fill: 'linear', c1: '#e9d4ad', c2: '#a8763e', detC: '#3a1e0c', lineC: '#6b3a1e' }), at(500, 500, 3.7))]],
  ['Omaha Express', [lines({ n: 6, len: 360, th: 10, gap: 12 }, { fill: 'solid', c1: '#9aa3b5' }, at(250, 520)),
    art('train', px({ fill: 'gloss', c1: '#f4f6fa', c2: '#b8c0cc', det2C: '#1f2a44', detC: '#c8102e' }), at(560, 500, 3.2))]],
  ['Tulsa Oilmen', [art('derrick', px({ fill: 'solid', c1: '#2a1d10', o1c: '#e8b04a', detC: '#e8b04a', bevel: 0 }), at(500, 520, 3.5))]],
  ['Austin Ramparts', ramparts()],
  ['Austin Ramparts wordmark', [...ramparts(-90, 0.8),
    text('AUSTIN', 'Graduate', 70, { fill: 'solid', c1: '#ffffff', o1c: INK, o1w: 6 }, { x: 500, y: 735 }, { ls: 10 }),
    text('RAMPARTS', 'Graduate', 130, { fill: 'linear', c1: '#ffb067', c2: '#e8641e', o1c: INK, o1w: 7, o2c: '#ffffff', o2w: 4, exD: 6, exC: '#3a1a08' }, { x: 500, y: 840 })]],
  ['El Paso Scorpions', [art('scorpion', px({ fill: 'linear', c1: '#e3a94a', c2: '#6b4210', lineC: '#4a2a08' }), at(500, 520, 3.4))]],
  ['Mexico City Cardones', [art('cactus', px({ fill: 'linear', c1: '#4caf50', c2: '#1f6b2b', lineC: '#145220' }), at(500, 500, 3.8))]],
  ['Seattle Ferries', [art('ship', px({ fill: 'linear', c1: '#a3adb9', c2: '#56606c', detC: '#c8102e', det2C: '#1d2733', lineC: '#3a7bd5' }), at(500, 500, 3.6))]],
  ['Vancouver Cedars', [art('tree', px({ fill: 'linear', c1: '#4f9d4a', c2: '#1d5a26' }), at(500, 500, 3.8))]],
  ['Melbourne Moose', [art('moose', px({ fill: 'linear', c1: '#8a4b26', c2: '#4d2510', det2C: INK, detC: INK }), at(500, 500, 3.6))]],
  ['Honolulu Nene', [art('goose', px({ fill: 'linear', c1: '#2f7d5a', c2: '#174a33', detC: '#f2c14e', det2C: INK, lineC: '#0f3324' }), at(500, 500, 3.8, { rot: -12, sy: 4.6 }))]],
  ['San Diego Sea Lions', [art('seal', px({ fill: 'linear', c1: '#3b7fd0', c2: '#1d4a8a', det2C: INK, lineC: INK }), at(470, 560, 3.2)), ball(735, 280, 0.6)]],
  ['Albuquerque Balloons', [art('balloon', px({ fill: 'linear', c1: '#e8434f', c2: '#a51d2a', detC: '#ffd23f', det2C: '#3a5ba0' }), at(500, 500, 3.8))]],
];

/* ---------- Concept sheet (flat sports style) ---------- */
const W = '#ffffff';
const word = (txt, y, size, c, edge, dark, font = 'Graduate', extra = {}, t = {}) =>
  text(txt, font, size, { fill: 'solid', c1: c, o1c: edge, o1w: 5, o2c: dark, o2w: 5 }, { x: 500, y, ...t }, extra);
const roundel = (top, bot, band, ink, inner, font = 'Graduate') => [
  shape('circle', { fill: 'solid', c1: inner }, at(500, 500, 2.3)),
  ring(top, bot, font, { fill: 'solid', c1: band, o1c: ink, o1w: 6 }, {}, { tc: ink, fs: 54, ls: 4 })];

const teams = [];
const team = (name, logos) => teams.push([name, logos]);

{ const P = '#4b2a7b', LP = '#9b7ad1', K = '#160f22';
  const ape = (s = {}) => art('ape', { fill: 'linear', c1: '#5d3a94', c2: '#2e1650', detC: '#b79ae0', det2C: K, lineC: K, o1c: K, o1w: 4, ...s }, {});
  team('Baltimore Bigfeet', [
    [art('foot', { fill: 'linear', c1: P, c2: '#2e1650', o1c: K, o1w: 6 }, at(500, 500, 4.2)), art('mountain', { fill: 'solid', c1: W, detC: LP }, at(480, 640, 1.4))],
    [{ ...ape(), ...at(500, 400, 2.6) }, word('BIGFEET', 760, 130, W, K, P, 'Bowlby One SC', {}, { rot: -6 })],
    [...roundel('BALTIMORE', 'BIGFEET', K, W, P), art('foot', { fill: 'solid', c1: LP, o1w: 0 }, at(500, 500, 1.7))],
    [shape('circle', { fill: 'linear', c1: LP, c2: P, o1c: K, o1w: 6 }, at(500, 420, 2.3)), art('bigfoot', { fill: 'solid', c1: K, det2C: LP }, at(500, 420, 1.9)), word('BIGFEET', 760, 130, W, K, P, 'Bowlby One SC')],
    (() => { const b = text('B', 'Bowlby One SC', 680, { fill: 'solid', c1: '#13294b', o1w: 0 }, at(500, 500)); const f = art('foot', { fill: 'solid', c1: W }, at(470, 520, 2.3, { visible: false })); b.clip = { t: f.id, m: 'out', gap: 0 }; return [b, f]; })(),
    [{ ...ape(), ...at(470, 400, 2.4) }, ball(660, 520, 1.1), word('BIGFEET', 780, 120, W, K, P, 'Bowlby One SC', {}, { rot: -6 }), word('BALTIMORE', 680, 46, W, K, P, 'Graduate', {}, { rot: -6 })],
    [text('B', 'Pirata One', 520, { fill: 'solid', c1: P, o1c: W, o1w: 8, o2c: K, o2w: 6 }, at(380, 500)), text('B', 'Pirata One', 520, { fill: 'solid', c1: LP, o1c: W, o1w: 8, o2c: K, o2w: 6 }, at(620, 520))],
    [shape('notch', { fill: 'linear', c1: P, c2: '#2e1650', o1c: W, o1w: 6, o2c: K, o2w: 6 }, at(500, 450, 3)), { ...ape(), ...at(500, 400, 2.2) }, word('BIGFEET', 760, 120, W, K, P, 'Bowlby One SC')],
    [art('foot', { fill: 'linear', c1: LP, c2: P, o1c: K, o1w: 6 }, at(500, 500, 4.2)), art('tree', { fill: 'solid', c1: W }, at(495, 620, 1.1)), art('tree', { fill: 'solid', c1: W }, at(420, 650, 0.8)), art('tree', { fill: 'solid', c1: W }, at(570, 650, 0.8))],
    [shape('classic', { fill: 'solid', c1: K, o1c: W, o1w: 6, o2c: P, o2w: 6 }, at(500, 500, 3.3)), word('BIGFEET', 330, 100, W, P, K, 'Bowlby One SC'), art('foot', { fill: 'solid', c1: P, o1c: W, o1w: 4 }, at(500, 580, 1.9))],
  ]); }

{ const N = '#13294b', R = '#c8102e';
  const br = (x, y, k, c = N) => art('bridge', { fill: 'solid', c1: c, o1c: W, o1w: 3 }, at(x, y, k));
  team('Hartford Connectors', [
    [shape('notch', { fill: 'solid', c1: W, o1c: N, o1w: 8 }, at(500, 480, 3)), br(500, 380, 2.2), word('CONNECTORS', 590, 78, W, N, R, 'Graduate', { arc: 18 }), ball(500, 760, 0.9, { c1: '#e0473b', c2: '#8a1520' })],
    [text('H', 'Alfa Slab One', 560, { fill: 'solid', c1: N, o1w: 0 }, at(500, 450)), shape('swoosh', { fill: 'solid', c1: R }, at(500, 760, 2.4, { sy: 1.2 }))],
    [...roundel('HARTFORD', 'CONNECTORS', N, W, W), br(500, 490, 1.8, R)],
    [br(500, 380, 2.6, R), word('HARTFORD', 600, 76, N, W, W, 'Bebas Neue'), word('CONNECTORS', 700, 110, N, W, W, 'Bebas Neue')],
    [text('C', 'Bowlby One SC', 640, { fill: 'solid', c1: N, o1w: 0 }, at(450, 500)), text('H', 'Bowlby One SC', 240, { fill: 'solid', c1: R, o1c: W, o1w: 7 }, at(610, 505))],
    [art('ball', { fill: 'solid', c1: N, detC: R, detW: 7, o1c: W, o1w: 6 }, at(500, 500, 3.6))],
    [text('H', 'Alfa Slab One', 480, { fill: 'solid', c1: N, o1c: W, o1w: 8 }, at(370, 500)), text('C', 'Alfa Slab One', 480, { fill: 'solid', c1: R, o1c: W, o1w: 8 }, at(640, 520))],
    [shape('notch', { fill: 'solid', c1: N, o1c: W, o1w: 6, o2c: R, o2w: 6 }, at(500, 500, 3.2)), br(500, 420, 2.2, W), ball(500, 700, 0.95, { c1: '#e0473b', c2: '#8a1520' })],
    [br(500, 420, 2.8), word('CONNECTORS', 650, 120, R, W, N, 'Bebas Neue', { arc: 10 })],
    [shape('circle', { fill: 'solid', c1: W, o1c: N, o1w: 10, o2c: R, o2w: 8 }, at(500, 500, 3.6)), text('H', 'Alfa Slab One', 300, { fill: 'solid', c1: N }, at(400, 500)), text('C', 'Alfa Slab One', 300, { fill: 'solid', c1: R, o1c: W, o1w: 6 }, at(600, 500))],
  ]); }

{ const R = '#c8102e', K = '#111111';
  const slash = (x, y, k, rot = 20, c = K) => art('claw', { fill: 'solid', c1: c }, at(x, y, k, { rot }));
  const redBall = (x, y, k) => ball(x, y, k, { c1: '#e0473b', c2: '#8a1520', detC: K });
  const cut = (base, k = 1.7) => { const c = art('claw', { fill: 'solid', c1: W }, at(520, 500, k, { rot: 20, visible: false })); base.clip = { t: c.id, m: 'out', gap: 6 }; return [base, c]; };
  team('Louisville Claws', [
    [...cut(redBall(500, 500, 3.4)), lines({ n: 3, len: 200, th: 14, gap: 16 }, { fill: 'solid', c1: R }, at(170, 560, 1, { rot: -30 }))],
    [art('talon', { fill: 'linear', c1: '#e0473b', c2: '#7d1416', det2C: W, o1c: K, o1w: 5 }, at(500, 360, 2.2)), word('CLAWS', 740, 150, W, K, R, 'Bowlby One SC', {}, { rot: -5 })],
    [...roundel('LOUISVILLE', 'CLAWS', K, W, '#7d1416'), slash(500, 500, 1.6, 20, W)],
    [slash(470, 500, 3.6, 20, R), slash(560, 520, 2.6, 26, K)],
    [text('L', 'Alfa Slab One', 520, { fill: 'solid', c1: R, o1c: K, o1w: 8 }, at(380, 480, 1, { skew: -10 })), text('C', 'Alfa Slab One', 520, { fill: 'solid', c1: K, o1c: W, o1w: 8 }, at(630, 520, 1, { skew: -10 }))],
    [redBall(500, 560, 2.3), art('talon', { fill: 'linear', c1: '#c33a33', c2: '#741515', det2C: W, o1c: K, o1w: 5 }, at(500, 330, 2.4))],
    [redBall(500, 470, 2.2), word('CLAWS', 640, 170, W, K, R, 'Bowlby One SC'), slash(500, 380, 1.2, 20, R)],
    [art('eagle', { fill: 'linear', c1: '#e0473b', c2: '#7d1416', detC: K, det2C: '#f2b134', lineC: K, o1c: K, o1w: 5 }, at(500, 500, 3.6))],
    [shape('notch', { fill: 'solid', c1: K, o1c: R, o1w: 8, o2c: K, o2w: 4 }, at(500, 500, 3.2)), text('L', 'Alfa Slab One', 300, { fill: 'solid', c1: R, o1c: W, o1w: 5 }, at(410, 480)), text('C', 'Alfa Slab One', 300, { fill: 'solid', c1: W, o1c: R, o1w: 5 }, at(590, 520))],
    [...cut(redBall(500, 500, 3.6), 2.1)],
  ]); }

{ const N = '#1d3f7a', G = '#f2b134', LB = '#9fc3e8';
  const cup = (x, y, k, s = {}) => art('cup', { fill: 'gloss', c1: '#3c6bb5', c2: N, lineC: LB, detW: 6, o1c: '#0d1a33', o1w: 5, ...s }, at(x, y, k));
  const gb = (x, y, k) => ball(x, y, k, { c1: '#ffc94d', c2: '#d68a00', detC: '#3a2400' });
  team('Kansas City Tumblers', [
    [lines({ n: 4, len: 220, th: 12, gap: 12 }, { fill: 'solid', c1: LB }, at(250, 560)), cup(500, 470, 2.6), gb(560, 700, 0.9)],
    [...roundel('KANSAS CITY', 'TUMBLERS', N, W, '#0d1a33'), cup(480, 480, 1.5), gb(560, 560, 0.6)],
    [text('K', 'Alfa Slab One', 600, { fill: 'solid', c1: N, o1c: W, o1w: 6 }, at(460, 480)), gb(630, 640, 1.2)],
    [cup(500, 420, 2.4), word('TUMBLERS', 660, 120, W, N, G, 'Bowlby One SC', {}, { rot: -6 })],
    [shape('notch', { fill: 'solid', c1: N, o1c: G, o1w: 8 }, at(500, 500, 3.2)), text('K', 'Alfa Slab One', 280, { fill: 'solid', c1: W }, at(400, 480)), text('C', 'Alfa Slab One', 280, { fill: 'solid', c1: G }, at(600, 520))],
    [cup(470, 460, 2.6), gb(600, 340, 1.0), lines({ n: 3, len: 160, th: 10, gap: 12 }, { fill: 'solid', c1: G }, at(700, 260, 1, { rot: 30, sx: -1 })), word('TUMBLERS', 760, 110, W, N, G, 'Bowlby One SC', {}, { rot: -8 })],
    [shape('circle', { fill: 'solid', c1: W, o1c: G, o1w: 10, o2c: N, o2w: 10 }, at(500, 500, 3.6)), text('K', 'Alfa Slab One', 290, { fill: 'solid', c1: N }, at(400, 490)), text('C', 'Alfa Slab One', 290, { fill: 'solid', c1: G, o1c: N, o1w: 5 }, at(605, 510))],
    [shape('badge', { fill: 'solid', c1: N, o1c: G, o1w: 8 }, at(500, 500, 3.2)), word('KANSAS CITY', 330, 56, W, N, N, 'Graduate', { arc: 30 }), word('TUMBLERS', 500, 110, G, N, W, 'Bowlby One SC'), gb(500, 690, 1.0)],
    [text('T', 'Alfa Slab One', 620, { fill: 'solid', c1: N, o1c: W, o1w: 6 }, at(520, 480, 1, { skew: -14 })), shape('swoosh', { fill: 'solid', c1: LB }, at(430, 680, 2.2, { rot: -10 }))],
    [shape('circle', { fill: 'solid', c1: W, o1c: N, o1w: 10, o2c: G, o2w: 8 }, at(500, 500, 3.6)), cup(500, 500, 2.3, { fill: 'gloss', c1: G, c2: '#c08410', lineC: N })],
  ]); }

{ const G = '#2d6a3e', R = '#c0392b', C = '#f3e6c8', K = '#14281a';
  const cac = (x, y, k, s = {}) => art('cactus', { fill: 'gloss', c1: '#3f9a52', c2: '#1f5c2e', lineC: '#14421f', o1c: K, o1w: 5, ...s }, at(x, y, k));
  const rb = (x, y, k) => ball(x, y, k, { c1: '#e0583b', c2: '#9a2b1a' });
  team('Mexico City Cardones', [
    [cac(480, 470, 3.6), rb(600, 790, 0.8)],
    [...roundel('MEXICO CITY', 'CARDONES', G, C, C), cac(500, 480, 1.7), rb(550, 600, 0.55)],
    [cac(500, 500, 3.8, { o1c: C, o2c: K, o2w: 5 })],
    [shape('classic', { fill: 'solid', c1: C, o1c: G, o1w: 10, o2c: K, o2w: 5 }, at(500, 500, 3.3)), word('CARDONES', 300, 92, G, C, K, 'Graduate', { arc: 22 }), cac(500, 560, 1.8), rb(560, 700, 0.6)],
    [text('M', 'Pirata One', 480, { fill: 'solid', c1: G, o1c: C, o1w: 6, o2c: K, o2w: 5 }, at(430, 500, 1, { skew: -10 })), text('C', 'Pirata One', 480, { fill: 'solid', c1: '#b9a13a', o1c: C, o1w: 6, o2c: K, o2w: 5 }, at(600, 520, 1, { skew: -10 }))],
    [art('snowpeaks', { fill: 'solid', c1: '#d9c49a', detC: C }, at(500, 400, 2.6)), cac(500, 420, 2.2), word('CARDONES', 690, 140, C, K, G, 'Bowlby One SC'), rb(500, 820, 0.6)],
    [art('sugarskull', { fill: 'solid', c1: '#f6efe2', detC: K, det2C: R, lineC: K, o1c: K, o1w: 5 }, at(500, 500, 3.6))],
    [shape('heater', { fill: 'linear', c1: G, c2: K, o1c: C, o1w: 8 }, at(500, 500, 3.2)), cac(500, 470, 2.2, { fill: 'solid', c1: C, lineC: G }), rb(500, 700, 0.8)],
    [...roundel('MEXICO CITY', 'CARDONES', C, G, G), cac(500, 470, 1.6, { o1c: C }), rb(500, 600, 0.65)],
    [shape('burst', { fill: 'linear', c1: '#3f9a52', c2: G, o1c: K, o1w: 5 }, at(500, 500, 3.6)), rb(500, 500, 2.2)],
  ]); }

{ const G = '#1e5631', LG = '#7cb342', Y = '#f2b134', K = '#0f2a18';
  const gb = (x, y, k) => ball(x, y, k, { c1: '#ffc94d', c2: '#d68a00', detC: K });
  const greenBall = (x, y, k, s = {}) => art('ball', { fill: 'radial', c1: LG, c2: G, detC: K, detW: 6, o1c: K, o1w: 5, ...s }, at(x, y, k));
  team('Seattle Greens', [
    [greenBall(500, 640, 1.9), art('needle', { fill: 'solid', c1: '#e8f0e0', o1c: K, o1w: 5 }, at(500, 400, 3))],
    [...roundel('SEATTLE', 'GREENS', G, W, LG), gb(500, 500, 1.6)],
    [text('S', 'Alfa Slab One', 520, { fill: 'solid', c1: G, o1c: W, o1w: 7 }, at(420, 480, 1, { skew: -10 })), text('G', 'Alfa Slab One', 520, { fill: 'solid', c1: Y, o1c: W, o1w: 7 }, at(590, 520, 1, { skew: -10 }))],
    [art('spruce', { fill: 'linear', c1: LG, c2: G, o1c: K, o1w: 5, detC: W }, at(500, 440, 3.6)), gb(500, 790, 0.8)],
    [shape('classic', { fill: 'solid', c1: G, o1c: W, o1w: 8, o2c: K, o2w: 4 }, at(500, 500, 3.3)), word('GREENS', 330, 100, W, K, K, 'Graduate', { arc: 18 }), greenBall(500, 560, 1.5, { fill: 'none', o1w: 0, detC: W, detW: 8 })],
    [art('snowpeaks', { fill: 'linear', c1: '#4d8b5a', c2: G, detC: W, o1c: K, o1w: 4 }, at(500, 400, 2.8)), word('GREENS', 650, 150, W, K, LG, 'Bowlby One SC'), gb(500, 790, 0.6)],
    [greenBall(500, 500, 3.6)],
    [shape('notch', { fill: 'solid', c1: G, o1c: Y, o1w: 8 }, at(500, 500, 3.2)), word('SEATTLE', 290, 60, W, G, G, 'Graduate'), art('snowpeaks', { fill: 'solid', c1: W, detC: LG }, at(500, 450, 1.8)), word('GREENS', 610, 120, Y, K, K, 'Bowlby One SC')],
    [art('spruce', { fill: 'linear', c1: LG, c2: G, o1c: K, o1w: 5, detC: W }, at(500, 500, 4))],
    [shape('circle', { fill: 'solid', c1: G, o1c: W, o1w: 8, o2c: K, o2w: 6 }, at(500, 500, 3.6)), text('S', 'Alfa Slab One', 360, { fill: 'solid', c1: W }, at(420, 500, 1, { skew: -10 })), text('G', 'Alfa Slab One', 360, { fill: 'solid', c1: Y }, at(580, 500, 1, { skew: -10 }))],
  ]); }

{ const N = '#14213d', Y = '#fca311', S = '#c9ccd3', K = '#0a1020';
  const gb = (x, y, k) => ball(x, y, k, { c1: '#ffc94d', c2: '#d68a00', detC: '#3a2400' });
  const pk = (x, y, k, rot = 0) => art('pick', { fill: 'chrome', c1: '#e5e7eb', c2: '#4b5563', o1c: K, o1w: 4 }, at(x, y, k, { rot }));
  team('Melbourne Diggers', [
    [art('miner', { fill: 'linear', c1: '#2f5aa8', c2: N, detC: '#f1c27d', det2C: '#fff2b3', lineC: K, o1c: K, o1w: 5 }, at(480, 470, 3.2)), art('helmet', { fill: 'gloss', c1: Y, c2: '#c77d00', detC: '#fff2b3', o1c: K, o1w: 4 }, at(480, 300, 1.25)), pk(720, 520, 1.6, 30), gb(330, 760, 0.8)],
    [shape('notch', { fill: 'solid', c1: N, o1c: Y, o1w: 8 }, at(500, 500, 3.2)), word('MELBOURNE', 300, 60, W, N, N, 'Graduate'), word('DIGGERS', 460, 120, Y, K, K, 'Bowlby One SC'), gb(500, 660, 1)],
    [shape('circle', { fill: 'solid', c1: N, o1c: Y, o1w: 10 }, at(500, 500, 3.6)), pk(500, 500, 2.8, 0), gb(500, 640, 0.8)],
    [text('M', 'Alfa Slab One', 600, { fill: 'solid', c1: N, o1w: 0 }, at(480, 470)), art('shovel', { fill: 'chrome', c1: '#e5e7eb', c2: '#4b5563', o1c: K, o1w: 4 }, at(600, 620, 1.6, { rot: -25 })), gb(410, 600, 0.75)],
    [shape('heater', { fill: 'solid', c1: N, o1c: Y, o1w: 8 }, at(500, 500, 3.2)), gb(460, 460, 1.7), art('shovel', { fill: 'chrome', c1: '#e5e7eb', c2: '#4b5563', o1c: K, o1w: 4 }, at(600, 560, 1.7, { rot: -35 }))],
    [art('snowpeaks', { fill: 'linear', c1: '#4a5a7a', c2: N, detC: W, o1c: K, o1w: 4 }, at(500, 400, 2.8)), word('DIGGERS', 650, 150, Y, K, N, 'Bowlby One SC'), gb(500, 790, 0.6)],
    [...roundel('MELBOURNE', 'DIGGERS', N, W, Y), pk(500, 500, 1.7)],
    [text('D', 'Alfa Slab One', 620, { fill: 'solid', c1: N, o1w: 0 }, at(540, 500)), pk(400, 470, 2.6, -35)],
    [art('helmet', { fill: 'gloss', c1: Y, c2: '#c77d00', detC: '#fff2b3', o1c: K, o1w: 5 }, at(500, 360, 2.3)), gb(500, 600, 2)],
    [shape('circle', { fill: 'solid', c1: N, o1c: Y, o1w: 10 }, at(500, 500, 3.6)), art('picks', { fill: 'chrome', c1: '#e5e7eb', c2: '#4b5563', o1c: K, o1w: 4 }, at(500, 480, 2.6)), gb(500, 560, 1)],
  ]); }

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const jobs = [];
for (const [name, layers] of VBL) jobs.push({ file: `vbl/${slug(name)}.lsp`, name: `${name} (VBL)`, canvas: { bg: 'none', pixel: 9, crop: true }, layers });
for (const [tname, logos] of teams) logos.forEach((layers, i) =>
  jobs.push({ file: `concepts/${slug(tname)}/${String(i + 1).padStart(2, '0')}.lsp`, name: `${tname} ${i + 1}`, canvas: { bg: 'none', pixel: 0, crop: true }, layers }));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'lsp.html'));
  await page.waitForFunction(() => window.LSP);
  for (const j of jobs) {
    const res = await page.evaluate(async j => {
      LSP.load({ format: 'LSP', version: 1, name: j.name, canvas: j.canvas, layers: j.layers });
      await document.fonts.ready;
      const lsp = LSP.toLSP(); delete lsp.saved;
      const png = await LSP.exportPNG(320);
      return { lsp, png: png.url };
    }, j);
    const out = path.join(OUT, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(res.lsp, null, 1) + '\n');
    if (PREVIEW) {
      const pf = path.join(PREVIEW, j.file.replace(/\//g, '__').replace('.lsp', '.png'));
      fs.writeFileSync(pf, Buffer.from(res.png.split(',')[1], 'base64'));
    }
  }
  console.log(`${jobs.length} logos written`, errors.length ? 'errors: ' + errors.join(' | ') : '');
  await browser.close();
})();
