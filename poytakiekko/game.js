'use strict';
/* Pöytäkiekko – pöytäjääkiekkopeli.
   Maailman koordinaatit senttimetreinä:
   x = kentän leveys (-26..26, oikealle +), y = pituus (0 = kameran puoleinen pääty, 100 = kaukainen pääty), z = korkeus.
   Koti (sininen) puolustaa y=11 maalia ja hyökkää ylöspäin, vieras (punainen) päinvastoin. */

// ---------------------------------------------------------------- vakiot
const L = 100, HW = 26, CR = 12;            // kentän pituus, puolileveys, kulmien säde
const BOARD_H = 4.5, DOME_Z = 30;
const GOAL_Y = [8, 92];                      // [koti, vieras] maaliviiva
const GW = 10, GH = 3.8, GD = 6;            // maalin leveys, korkeus, syvyys
const POST_R = 0.45;
const PUCK_R = 1.25, PUCK_H = 0.9;
const GRAV = 981;
const FIG_PX_PER_CM = 17;                   // sprite-kuvan pikselit / cm
const DT = 1 / 600;                           // fysiikan aika-askel
const TEAM_COL = ['#2f7cf0', '#e2322a'];
const ATTACK_DIR = [Math.PI / 2, -Math.PI / 2];

// Sprite-ruudut ja niiden katselukulma (0 = kasvot kameraan, 90 = katsoo kuvassa oikealle, 180 = selkä)
const PLAYER_VIEWS = [[0, 0], [29, 8], [3, 35], [4, 65], [5, 90], [6, 122], [7, 145], [9, 163], [12, 180], [14, 190], [16, 200], [17, 212], [18, 262], [19, 290], [20, 315], [21, 335], [26, 348]];
const GOALIE_VIEWS = [[0, 0], [4, 22], [5, 40], [6, 56], [7, 74], [19, 165], [12, 180], [11, 195], [10, 245], [9, 260], [24, 274], [25, 290], [26, 305], [27, 318], [28, 332], [29, 345], [30, 353]];
const PUCK_FLAT = [19, 20, 21, 22, 23, 24, 25, 26];
const PUCK_TUMBLE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 28, 29, 30, 31, 32, 33, 34, 35, 54, 55, 56, 57, 58, 59, 60, 61, 62];

// Ukon osuma-alueet paikallisissa koordinaateissa: [eteen, vasemmalle]
const SHAPES = {
  player: { blade: [[1.0, 1.7], [1.5, 4.1]], bladeR: 0.35, body: [[0.0, 0.0], [0.0, 0.0]], bodyR: 1.35, bodyH: 7.5 },
  goalie: { blade: [[1.15, 0.3], [1.35, 2.7]], bladeR: 0.35, body: [[0.2, -1.3], [0.2, 1.3]], bodyR: 0.9, bodyH: 5.5,
            glove: [0.5, -2.4, 3.6, 1.0] }
};

// Urat: [rooli, ax, ay, bx, by] kotijoukkueelle. Vieras = peilikuva (x,y) -> (-x, 100-y)
const HOME_SLOTS = [
  ['goalie', -6.2, 10.7, 6.2, 10.7],
  ['player', -11, 20, -7.5, 47],     // vasen puolustaja
  ['player', 11, 20, 7.5, 47],       // oikea puolustaja
  ['player', -21, 30, -21, 90],      // vasen laitahyökkääjä
  ['player', 16, 30, 16, 89],        // oikea laitahyökkääjä
  ['player', -3, 36, -3, 84]         // keskushyökkääjä
];

// ---------------------------------------------------------------- apufunktiot
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const hyp = Math.hypot;

// ---------------------------------------------------------------- canvas & kuvat
const cv = document.getElementById('c');
const mainCtx = cv.getContext('2d');
let ctx = mainCtx;
let VW = 0, VH = 0, DPR = 1;
const IMGS = {};
['player_blue', 'player_red', 'goalie_blue', 'goalie_red', 'puck'].forEach(n => {
  const im = new Image(); im.src = 'assets/' + n + '.png'; IMGS[n] = im;
});
const SP = window.SPRITES;

// ---------------------------------------------------------------- kamera
const cam = { C: [0, -26, 64], T: [0, 53, 0], f: null, r: null, u: null, F: 1, cx: 0, cy: 0 };
function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function setupCamera() {
  cam.f = norm3([cam.T[0] - cam.C[0], cam.T[1] - cam.C[1], cam.T[2] - cam.C[2]]);
  cam.r = norm3(cross(cam.f, [0, 0, 1]));
  cam.u = cross(cam.r, cam.f);
  // sovita näkymään: pöydän reunat + tulostaulu
  const pts = [];
  for (const sx of [-1, 1]) for (const y of [-3, 103]) for (const z of [0, BOARD_H]) pts.push([sx * (HW + 3), y, z]);
  pts.push([0, 102, 16]);
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const p of pts) {
    const q = projN(p[0], p[1], p[2]);
    mnx = Math.min(mnx, q[0]); mxx = Math.max(mxx, q[0]); mny = Math.min(mny, q[1]); mxy = Math.max(mxy, q[1]);
  }
  const top = sbSize().h + 18, bot = 6;
  const availH = VH - top - bot, availW = VW - 20;
  cam.F = Math.min(availH / (mxy - mny), availW / (mxx - mnx));
  cam.cx = VW / 2 - (mnx + mxx) / 2 * cam.F;
  cam.cy = top + mxy * cam.F + (availH - (mxy - mny) * cam.F) / 2;
}
function projN(x, y, z) {
  const dx = x - cam.C[0], dy = y - cam.C[1], dz = z - cam.C[2];
  const zc = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
  return [(dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2]) / zc, (dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2]) / zc, zc];
}
function P(x, y, z = 0) {
  const n = projN(x, y, z);
  return { x: cam.cx + n[0] * cam.F, y: cam.cy - n[1] * cam.F, s: cam.F / n[2], d: n[2] };
}
function unproject(sx, sy) {
  const a = (sx - cam.cx) / cam.F, b = -(sy - cam.cy) / cam.F;
  const d = [cam.f[0] + cam.r[0] * a + cam.u[0] * b, cam.f[1] + cam.r[1] * a + cam.u[1] * b, cam.f[2] + cam.r[2] * a + cam.u[2] * b];
  const t = -cam.C[2] / d[2];
  return [cam.C[0] + d[0] * t, cam.C[1] + d[1] * t];
}
function azimuth(x, y) { return Math.atan2(y - cam.C[1], x - cam.C[0]); }

// ---------------------------------------------------------------- piirtoapurit
function pathPoly(pts, z = 0) {
  ctx.beginPath();
  pts.forEach((p, i) => { const q = P(p[0], p[1], p.length > 2 ? p[2] : z); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
  ctx.closePath();
}
function fillPoly(pts, col, z = 0) { pathPoly(pts, z); ctx.fillStyle = col; ctx.fill(); }
function circlePts(cx, cy, r, n = 48, a0 = 0, a1 = Math.PI * 2) {
  const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o;
}
function ring(cx, cy, r, w, col) {
  const o = circlePts(cx, cy, r + w / 2), inn = circlePts(cx, cy, r - w / 2).reverse();
  ctx.beginPath();
  o.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
  ctx.closePath();
  inn.forEach((p, i) => { const q = P(p[0], p[1]); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
  ctx.closePath();
  ctx.fillStyle = col; ctx.fill('evenodd');
}
function rect(x0, y0, x1, y1, col) { fillPoly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col); }
function line3(a, b, col, wcm) {
  const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, wcm * (p.s + q.s) / 2); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
}
function capsulePts(ax, ay, bx, by, r) {
  const a = Math.atan2(by - ay, bx - ax);
  return circlePts(bx, by, r, 10, a - Math.PI / 2, a + Math.PI / 2).concat(circlePts(ax, ay, r, 10, a + Math.PI / 2, a + Math.PI * 1.5));
}

// kentän ääriviiva (vastapäivään)
function rinkOutline(inset = 0, n = 14) {
  const r = CR - inset, w = HW - CR, o = [];
  const corners = [[w, L - CR, 0], [-w, L - CR, Math.PI / 2], [-w, CR, Math.PI], [w, CR, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= n; i++) {
    const a = a0 + Math.PI / 2 * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return o;
}
function rinkHalfWidthAt(y) {
  if (y >= CR && y <= L - CR) return HW;
  const dy = y < CR ? CR - y : y - (L - CR);
  return HW - CR + Math.sqrt(Math.max(0, CR * CR - dy * dy));
}

// ---------------------------------------------------------------- äänet
let AC = null, muted = false, hornAudio = null;
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
    try { hornAudio = new Audio('assets/maalitorvi.mp3'); hornAudio.volume = 0.55; } catch (e) { hornAudio = null; }
    if (AC) initLoops();
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
// jatkuvat äänet: tankojen liuku urissa ja kiekon liuku jäällä
const loops = {};
function initLoops() {
  const mk = (freq, q, type = 'bandpass') => {
    const src = AC.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
    const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = AC.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(AC.destination); src.start();
    return { g, f };
  };
  loops.rod = mk(1250, 1.4);      // metallitanko kolisee urassa
  loops.rod2 = mk(320, 2.0);      // matalampi runko-ääni
  loops.slide = mk(5200, 0.7);    // kiekon suhina
}
function updateLoops(dt) {
  if (!AC || !loops.rod) return;
  const t = AC.currentTime;
  let rod = 0;
  for (const f of figs) rod += Math.abs(f.vel) / 80;
  rod = Math.min(1.4, rod);
  const rattle = 0.6 + Math.random() * 0.8;
  const on = !muted && !G.paused;
  loops.rod.g.gain.setTargetAtTime(on ? rod * 0.16 * rattle : 0, t, 0.02);
  loops.rod2.g.gain.setTargetAtTime(on ? rod * 0.12 : 0, t, 0.03);
  loops.rod.f.frequency.setTargetAtTime(900 + rod * 500, t, 0.05);
  const sp = puck.hidden || puck.falling || puck.z > 0.05 ? 0 : Math.min(1, hyp(puck.vx, puck.vy) / 220);
  loops.slide.g.gain.setTargetAtTime(on ? sp * 0.07 : 0, t, 0.03);
}
function noiseBuf() {
  if (noiseBuf.b) return noiseBuf.b;
  const b = AC.createBuffer(1, AC.sampleRate * 0.4, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf.b = b);
}
const lastSnd = {};
function snd(type, vol = 1) {
  if (muted || !AC || vol < 0.03) return;
  const now = AC.currentTime;
  if (lastSnd[type] && now - lastSnd[type] < (type === 'tick' ? 0.018 : 0.035)) return;
  lastSnd[type] = now;
  vol = Math.min(1, vol);
  const g = AC.createGain(); g.connect(AC.destination);
  if (type === 'hit' || type === 'board' || type === 'ice' || type === 'net' || type === 'tick' || type === 'groove') {
    const s = AC.createBufferSource(); s.buffer = noiseBuf();
    const f = AC.createBiquadFilter(); f.type = 'bandpass';
    const conf = { hit: [2600, 6, 0.05], board: [520, 2, 0.09], ice: [1500, 3, 0.04], net: [900, 1, 0.12], tick: [4200, 9, 0.018], groove: [1900, 5, 0.028] }[type];
    f.frequency.value = conf[0] * rnd(0.85, 1.15); f.Q.value = conf[1];
    s.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.55 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + conf[2]);
    s.start(now, Math.random() * 0.2, conf[2] + 0.02);
    if (type === 'board') {
      const o = AC.createOscillator(); o.frequency.value = 140; const g2 = AC.createGain();
      o.connect(g2); g2.connect(AC.destination); g2.gain.setValueAtTime(0.35 * vol, now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      o.start(now); o.stop(now + 0.13);
    }
  } else if (type === 'post') {
    [1850, 2770, 4100].forEach((fr, i) => {
      const o = AC.createOscillator(); o.frequency.value = fr; const g2 = AC.createGain();
      o.connect(g2); g2.connect(AC.destination);
      g2.gain.setValueAtTime(0.18 * vol / (i + 1), now); g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      o.start(now); o.stop(now + 0.5);
    });
  } else if (type === 'horn') {
    if (hornAudio) { try { hornAudio.currentTime = 0; const p = hornAudio.play(); if (p) p.catch(() => synthHorn()); return; } catch (e) { } }
    synthHorn();
  } else if (type === 'whistle') {
    const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = 2900;
    const lfo = AC.createOscillator(); lfo.frequency.value = 28; const lg = AC.createGain(); lg.gain.value = 120;
    lfo.connect(lg); lg.connect(o.frequency); o.connect(g);
    g.gain.setValueAtTime(0.0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.03); g.gain.setValueAtTime(0.18, now + 0.6); g.gain.linearRampToValueAtTime(0, now + 0.75);
    o.start(now); lfo.start(now); o.stop(now + 0.8); lfo.stop(now + 0.8);
  } else if (type === 'drop') {
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(700, now); o.frequency.exponentialRampToValueAtTime(220, now + 0.25);
    o.connect(g); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); o.start(now); o.stop(now + 0.3);
  } else if (type === 'fall') {
    const o = AC.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(320, now); o.frequency.exponentialRampToValueAtTime(70, now + 0.35);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); f.connect(g);
    g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4); o.start(now); o.stop(now + 0.4);
  }
}
function synthHorn() {
  if (!AC) return;
  const now = AC.currentTime;
  [174.6, 220, 261.6].forEach(fr => {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const g = AC.createGain(); o.connect(f); f.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.09, now + 0.06); g.gain.setValueAtTime(0.09, now + 1.4); g.gain.linearRampToValueAtTime(0, now + 1.7);
    o.start(now); o.stop(now + 1.8);
  });
}

// ---------------------------------------------------------------- pelin tila
const G = {
  state: 'menu', // menu | drop | play | goal | periodEnd | over
  mode: 1, diff: 1, periodLen: 180, autoGoalie: true,
  score: [0, 0], shots: [0, 0], period: 1, clock: 180, overtime: false,
  msg: '', msgT: 0, msgBig: false, timer: 0, paused: false, showHit: false,
  lastShot: [-9, -9], stuckT: 0, time: 0, lastToucher: -1
};
const puck = { x: 0, y: 50, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, yaw: 0, tumble: 0, tumbleRate: 0, falling: false, fallGoal: -1, hidden: true, onNet: false };
let figs = [];

function makeFigures() {
  figs = [];
  for (let team = 0; team < 2; team++) {
    HOME_SLOTS.forEach((s, i) => {
      let [kind, ax, ay, bx, by] = s;
      if (team === 1) { ax = -ax; ay = L - ay; bx = -bx; by = L - by; }
      const len = hyp(bx - ax, by - ay);
      const f = {
        team, kind, idx: i, ax, ay, bx, by, len, dx: (bx - ax) / len, dy: (by - ay) / len,
        t: kind === 'goalie' ? 0.5 : (i <= 2 ? 0.45 : 0.35), vel: 0,
        ang: ATTACK_DIR[team], angVel: 0, spinLeft: 0, spinDir: 1,
        cmdMove: 0, cmdRot: null, cmdHeading: null, targetT: null,
        x: 0, y: 0, ai: { next: 0, cool: 0 }
      };
      updatePos(f);
      figs.push(f);
    });
  }
}
function updatePos(f) { f.x = f.ax + (f.bx - f.ax) * f.t; f.y = f.ay + (f.by - f.ay) * f.t; }
function local2world(f, fw, lf) {
  const c = Math.cos(f.ang), s = Math.sin(f.ang);
  return [f.x + c * fw - s * lf, f.y + s * fw + c * lf];
}
function slotClosestT(f, x, y) { return clamp(((x - f.ax) * f.dx + (y - f.ay) * f.dy) / f.len, 0, 1); }

// ---------------------------------------------------------------- ohjaus
const keys = {};
const mouse = { x: 0, y: 0, active: false, lastMove: 0, l: false, r: false, wheel: 0 };
const ctl = [{ active: null, lockT: 0, spinReq: 0 }, { active: null, lockT: 0, spinReq: 0 }];

addEventListener('keydown', e => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Enter'].includes(e.code) && G.state !== 'menu') e.preventDefault();
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (menuOpen()) return;
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyH') G.showHit = !G.showHit;
  if (e.code === 'KeyM') muted = !muted;
  if (e.code === 'Tab') cycleActive(0);
  if (e.code === 'Enter' && G.mode === 2) cycleActive(1);
  if (e.code === 'Space') ctl[0].spinReq = 1;
  if (e.code === 'Slash' && G.mode === 2) ctl[1].spinReq = 1;
  if ((G.state === 'over') && (e.code === 'Space' || e.code === 'Enter')) openMenu();
});
addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; mouse.lastMove = performance.now(); });
cv.addEventListener('mousedown', e => { audio(); if (e.button === 0) mouse.l = true; if (e.button === 2) mouse.r = true; mouse.active = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); mouse.wheel += Math.sign(e.deltaY); mouse.active = true; }, { passive: false });

function isAI(team) { return G.mode === 0 || (G.mode === 1 && team === 1); }
function menuOpen() { return !document.getElementById('menu').classList.contains('hidden'); }
function teamFigs(team, withGoalie = true) { return figs.filter(f => f.team === team && (withGoalie || f.kind !== 'goalie')); }
function puckDistToFig(f) {
  const t = slotClosestT(f, puck.x, puck.y);
  return hyp(f.ax + (f.bx - f.ax) * t - puck.x, f.ay + (f.by - f.ay) * t - puck.y);
}
function cycleActive(team) {
  const list = teamFigs(team, !G.autoGoalie);
  const c = ctl[team];
  const i = list.indexOf(c.active);
  // järjestä etäisyyden mukaan ja ota seuraava
  const sorted = list.slice().sort((a, b) => puckDistToFig(a) - puckDistToFig(b));
  const j = sorted.indexOf(c.active);
  c.active = sorted[(j + 1) % sorted.length] || list[(i + 1) % list.length];
  c.lockT = 1.6;
}
function autoSelect(team, dt) {
  const c = ctl[team];
  c.lockT -= dt;
  if (c.lockT > 0 && c.active) return;
  const list = teamFigs(team, !G.autoGoalie);
  let best = null, bd = 1e9;
  for (const f of list) {
    let d = puckDistToFig(f);
    // suosi ukkoa, jonka maila on kiekon "takana" hyökkäyssuunnassa
    const along = (puck.y - f.y) * (team === 0 ? 1 : -1);
    d += along < -6 ? 3 : 0;
    if (d < bd) { bd = d; best = f; }
  }
  if (!c.active || (best !== c.active && bd < puckDistToFig(c.active) - 1.5)) c.active = best;
}

function humanControl(team, dt) {
  const c = ctl[team];
  autoSelect(team, dt);
  const act = c.active;
  for (const f of teamFigs(team)) {
    if (f === act) continue;
    if (f.kind === 'goalie' && G.autoGoalie) continue; // tekoäly ohjaa
    f.cmdMove = 0; f.cmdRot = null; f.cmdHeading = null; f.targetT = null;
  }
  if (!act) return;
  let ix = 0, iy = 0, rot = 0;
  if (team === 0) {
    ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    iy = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    rot = (keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0);
    if (G.mode === 1) {
      if (mouse.l) rot = 1; if (mouse.r) rot = -1;
      if (ix || iy) mouse.active = false;
    }
  } else {
    ix = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    iy = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    rot = (keys.Comma ? 1 : 0) - (keys.Period ? 1 : 0);
  }
  // syötteen suunta näytöllä projisoidaan uran suuntaan näytöllä
  const pa = P(act.ax, act.ay), pb = P(act.bx, act.by);
  let sx = pb.x - pa.x, sy = pb.y - pa.y; const sl = hyp(sx, sy) || 1; sx /= sl; sy /= sl;
  act.targetT = null;
  if (ix || iy) {
    const m = ix * sx + (-iy) * sy;
    const il = hyp(ix, iy);
    act.cmdMove = clamp(m / il * 1.25, -1, 1) * 78;
  } else if (team === 0 && G.mode === 1 && mouse.active) {
    const w = unproject(mouse.x, mouse.y);
    act.targetT = slotClosestT(act, w[0], w[1]);
    act.cmdMove = 0;
  } else act.cmdMove = 0;

  if (team === 0 && G.mode === 1 && mouse.wheel) {
    act.spinLeft = 0; act.angVel += -mouse.wheel * 7; mouse.wheel = 0;
  }
  if (c.spinReq) {
    c.spinReq = 0;
    // laukaus: täysi kierros siihen suuntaan joka lähettää kiekon kohti maalia
    act.spinDir = bestSpinDir(act) || (rot ? Math.sign(rot) : 1);
    act.spinLeft = Math.PI * 2;
  }
  // pyöritys kiihtyy pidettäessä: lyhyt painallus = tarkka säätö, pitkä = kova pyöräytys
  if (rot) { c.rotHold = (c.rotHold || 0) + dt; act.spinLeft = 0; act.cmdRot = rot * Math.min(34, 4 + 75 * c.rotHold * c.rotHold * 4); act.cmdHeading = null; }
  else { c.rotHold = 0; act.cmdRot = null; act.cmdHeading = null; }
}
function bestSpinDir(f) {
  const gy = GOAL_Y[1 - f.team];
  const dx = puck.x - f.x, dy = puck.y - f.y, d = hyp(dx, dy);
  if (d < 0.01 || d > 6) return 0;
  const gx = 0 - puck.x, gyy = gy - puck.y, gl = hyp(gx, gyy);
  const px = -dy / d, py = dx / d;   // vastapäivään kiertävän pisteen tangentti
  return (px * gx + py * gyy) / gl >= 0 ? 1 : -1;
}

// ---------------------------------------------------------------- tekoäly
const AI_LEVEL = [
  { spin: 20, move: 46, think: 0.24, noise: 0.5, quality: 0.52, hands: 1 },
  { spin: 28, move: 62, think: 0.12, noise: 0.25, quality: 0.6, hands: 2 },
  { spin: 34, move: 80, think: 0.05, noise: 0.1, quality: 0.66, hands: 2 }
];
function aiTeam(team, dt) {
  const lv = AI_LEVEL[G.diff];
  const fl = teamFigs(team, false).map(f => [f, puckDistToFig(f)]).sort((a, b) => a[1] - b[1]);
  const hands = new Set(fl.slice(0, lv.hands).map(a => a[0]));
  for (const f of teamFigs(team)) {
    if (f.kind === 'goalie') { aiGoalie(f, dt, lv); continue; }
    if (hands.has(f)) aiSkater(f, dt, lv);
    else { f.cmdMove = 0; f.targetT = null; f.cmdRot = null; if (f.spinLeft <= 0) f.cmdHeading = ATTACK_DIR[team] + 0.5; }
  }
}
const BLADE_ANG = Math.atan2(2.85, 1.25);   // terän keskikohdan suunta suhteessa katsesuuntaan
function aiSkater(f, dt, lv) {
  f.ai.next -= dt; f.ai.cool -= dt;
  if (f.ai.next > 0) return;
  f.ai.next = lv.think * rnd(0.7, 1.3);
  const team = f.team, gy = GOAL_Y[1 - team];
  const px = puck.x + puck.vx * 0.06, py = puck.y + puck.vy * 0.06;
  const dx = px - f.x, dy = py - f.y, d = hyp(dx, dy);
  const reach = d > 1.0 && d < 6.0 && puck.z < 1.2 && !puck.falling;
  if (!reach) f.ai.stall = 0;
  // tähtää paremmin avoinna olevaan maalin kulmaan
  const gk = figs.find(o => o.team !== team && o.kind === 'goalie');
  const corner = gk && gk.x > 0 ? -GW / 2 + 1.6 : GW / 2 - 1.6;
  const tgx = corner + rnd(-2, 2) * lv.noise, gx = tgx - px, gyy = gy - py, gl = hyp(gx, gyy);
  f.targetT = null;
  if (reach && f.ai.cool <= 0) {
    const nx = dx / d, ny = dy / d, tx = -ny, ty = nx;
    const q = (tx * gx + ty * gyy) / gl;
    const ownZone = team === 0 ? puck.y < 40 : puck.y > 60;
    f.ai.stall = (f.ai.stall || 0) + lv.think;
    const slow = hyp(puck.vx, puck.vy) < 25;
    if (Math.abs(q) > lv.quality || (ownZone && Math.abs(q) > 0.1) || (slow && f.ai.stall > 1.1) || (!slow && f.ai.stall > 0.5 && Math.abs(q) > 0.3)) {
      f.ai.stall = 0;
      f.spinDir = Math.sign(q) * (Math.random() < lv.noise * 0.15 ? -1 : 1);
      f.spinLeft = Math.PI * 2 * rnd(0.8, 1.1);
      f.ai.cool = 0.35;
      f.cmdMove = 0;
      return;
    }
  }
  // asemoidu: kiekon viereen niin että maali on "tangentin" suunnassa
  const ux = gx / gl, uy = gyy / gl;
  const side = (f.x - px) * -uy + (f.y - py) * ux >= 0 ? 1 : -1;
  const wx = px + -uy * side * 2.9 - ux * 0.6, wy = py + ux * side * 2.9 - uy * 0.6;
  f.targetT = slotClosestT(f, wx, wy);
  if (d < 12) f.cmdHeading = Math.atan2(dy, dx) - BLADE_ANG; // terä kiekkoa kohti
  else f.cmdHeading = ATTACK_DIR[team];
  f.cmdRot = null;
  f.maxMove = lv.move;
}
function aiGoalie(f, dt, lv) {
  const team = f.team, gy = GOAL_Y[team], out = team === 0 ? 1 : -1;
  f.ai.next -= dt; f.ai.cool -= dt;
  f.ai.gt = (f.ai.gt || 0) - dt;
  if (f.ai.gt <= 0) {
    f.ai.gt = lv.think * 1.3;
    let tx = puck.x * 0.55;
    const vyIn = -puck.vy * out;
    if (vyIn > 20) {
      const tt = (puck.y - f.y) / -puck.vy;
      if (tt > 0 && tt < 1.5) tx = puck.x + puck.vx * tt;
    }
    if (puck.hidden || puck.falling) tx = 0;
    tx += rnd(-1, 1) * lv.noise * 3;
    f.ai.tx = clamp(tx, -GW / 2 - 0.5, GW / 2 + 0.5);
  }
  f.targetT = slotClosestT(f, f.ai.tx ?? 0, f.y);
  f.maxMove = lv.move * 0.9;
  f.cmdHeading = ATTACK_DIR[team];
  f.cmdRot = null;
  // puhdistus: kiekko hiljaa edessä
  const dx = puck.x - f.x, dy = puck.y - f.y, d = hyp(dx, dy);
  if (f.ai.next <= 0) {
    f.ai.next = lv.think;
    if (d < 5.5 && hyp(puck.vx, puck.vy) < 45 && puck.z < 1 && f.ai.cool <= 0) {
      // kierrä niin, että terän liike vie kiekkoa poispäin omasta maalista (tai sivuun)
      const ty2 = dx / d;
      f.spinDir = ty2 * out >= 0 ? 1 : -1;
      if (Math.abs(ty2) < 0.25) f.spinDir = dx > 0 ? -out : out;
      f.spinLeft = Math.PI * 2;
      f.ai.cool = 0.6;
    }
  }
}

// ---------------------------------------------------------------- fysiikka
function stepFigure(f, dt) {
  const maxMove = f.maxMove || 78;
  let want = f.cmdMove;
  if (f.targetT != null) want = clamp((f.targetT - f.t) * f.len * 16, -maxMove, maxMove);
  const acc = 1100;
  f.vel += clamp(want - f.vel, -acc * dt, acc * dt);
  f.t += f.vel * dt / f.len;
  if (f.t < 0) { f.t = 0; f.vel = 0; } else if (f.t > 1) { f.t = 1; f.vel = 0; }
  updatePos(f);
  const maxSpin = isAI(f.team) ? AI_LEVEL[G.diff].spin : 34;
  const angAcc = 420;
  if (f.spinLeft > 0) {
    f.angVel += clamp(f.spinDir * maxSpin - f.angVel, -angAcc * 2 * dt, angAcc * 2 * dt);
    f.spinLeft -= Math.abs(f.angVel) * dt;
  } else if (f.cmdRot != null) {
    f.angVel += clamp(f.cmdRot - f.angVel, -angAcc * dt, angAcc * dt);
  } else if (f.cmdHeading != null) {
    const err = wrapA(f.cmdHeading - f.ang);
    const want2 = clamp(err * 14, -16, 16);
    f.angVel += clamp(want2 - f.angVel, -angAcc * dt, angAcc * dt);
  } else {
    f.angVel *= Math.exp(-7 * dt);
  }
  f.ang = wrapA(f.ang + f.angVel * dt);
  f.click = (f.click || 0) + Math.abs(f.angVel) * dt;
  if (f.click > 0.9) { f.click = 0; snd('tick', Math.min(1, Math.abs(f.angVel) / 30) * 0.5); }
}

function hitCapsule(ax, ay, bx, by, r, vax, vay, vbx, vby, e, liftK, kind) {
  const ex = bx - ax, ey = by - ay, el = ex * ex + ey * ey;
  let t = el > 1e-9 ? ((puck.x - ax) * ex + (puck.y - ay) * ey) / el : 0;
  t = clamp(t, 0, 1);
  const qx = ax + ex * t, qy = ay + ey * t;
  let nx = puck.x - qx, ny = puck.y - qy;
  const d = hyp(nx, ny), minD = r + PUCK_R;
  if (d >= minD) return 0;
  if (d < 1e-6) { nx = 1; ny = 0; } else { nx /= d; ny /= d; }
  puck.x = qx + nx * minD; puck.y = qy + ny * minD;
  const vqx = vax + (vbx - vax) * t, vqy = vay + (vby - vay) * t;
  const rx = puck.vx - vqx, ry = puck.vy - vqy;
  const vn = rx * nx + ry * ny;
  if (vn >= 0) return 0;
  puck.vx -= (1 + e) * vn * nx; puck.vy -= (1 + e) * vn * ny;
  // kitka tangentin suuntaan + pyöriminen
  const tx = -ny, ty = nx, vt = rx * tx + ry * ty;
  puck.vx -= vt * tx * 0.12; puck.vy -= vt * ty * 0.12;
  puck.spin += vt * 0.6;
  const imp = -vn;
  if (liftK > 0 && imp > 35 && Math.random() < 0.55) {
    puck.vz += imp * liftK * Math.random();
    if (puck.vz > 20) puck.tumbleRate = rnd(12, 34) * (Math.random() < 0.5 ? -1 : 1);
  }
  return imp;
}

function collideFigures() {
  if (puck.falling || puck.hidden) return;
  for (const f of figs) {
    const sh = SHAPES[f.kind];
    const c = Math.cos(f.ang), s = Math.sin(f.ang);
    const sv = f.vel, svx = f.dx * sv, svy = f.dy * sv;
    const pt = (fw, lf) => [f.x + c * fw - s * lf, f.y + s * fw + c * lf];
    const vel = (p) => [svx - f.angVel * (p[1] - f.y), svy + f.angVel * (p[0] - f.x)];
    // maila (vain jäätä lähellä)
    if (puck.z < 1.15) {
      const a = pt(...sh.blade[0]), b = pt(...sh.blade[1]);
      const va = vel(a), vb = vel(b);
      const imp = hitCapsule(a[0], a[1], b[0], b[1], sh.bladeR, va[0], va[1], vb[0], vb[1], 0.5, 0.38, 'blade');
      if (imp) { snd('hit', imp / 140); G.lastToucher = f.team; }
    }
    // vartalo / pehmusteet
    if (puck.z < sh.bodyH) {
      const a = pt(...sh.body[0]), b = pt(...sh.body[1]);
      const va = vel(a), vb = vel(b);
      const imp = hitCapsule(a[0], a[1], b[0], b[1], sh.bodyR, va[0], va[1], vb[0], vb[1], 0.35, 0.12, 'body');
      if (imp) { snd('hit', imp / 220); G.lastToucher = f.team; }
    }
    // maalivahdin räpylä (ilmakiekot)
    if (sh.glove && puck.z > 1.5) {
      const g = pt(sh.glove[0], sh.glove[1]);
      const dz = puck.z + PUCK_H / 2 - sh.glove[2];
      if (Math.abs(dz) < sh.glove[3] + PUCK_H / 2) {
        const v = vel(g);
        const imp = hitCapsule(g[0], g[1], g[0], g[1], sh.glove[3], v[0], v[1], v[0], v[1], 0.25, 0.05, 'glove');
        if (imp) snd('hit', imp / 220);
      }
    }
  }
}

function collideBoards() {
  const R = PUCK_R, w = HW - CR;
  let nx = 0, ny = 0, pen = 0;
  const ax = Math.abs(puck.x);
  if (ax > w && (puck.y < CR || puck.y > L - CR)) {
    const cx = Math.sign(puck.x) * w, cy = puck.y < CR ? CR : L - CR;
    const dx = puck.x - cx, dy = puck.y - cy, d = hyp(dx, dy);
    if (d > CR - R) { nx = -dx / d; ny = -dy / d; pen = d - (CR - R); }
  } else {
    if (puck.x > HW - R) { nx = -1; pen = puck.x - (HW - R); }
    else if (puck.x < -HW + R) { nx = 1; pen = -HW + R - puck.x; }
    if (puck.y > L - R) { ny = -1; nx = 0; pen = puck.y - (L - R); }
    else if (puck.y < R) { ny = 1; nx = 0; pen = R - puck.y; }
  }
  if (pen > 0) {
    puck.x += nx * pen; puck.y += ny * pen;
    const vn = puck.vx * nx + puck.vy * ny;
    if (vn < 0) {
      const e = 0.62;
      puck.vx -= (1 + e) * vn * nx; puck.vy -= (1 + e) * vn * ny;
      const tx = -ny, ty = nx, vt = puck.vx * tx + puck.vy * ty;
      puck.vx -= vt * tx * 0.08; puck.vy -= vt * ty * 0.08;
      puck.spin -= vt * 0.3;
      if (-vn > 80 && Math.random() < 0.3 && puck.z < 1) { puck.vz += -vn * rnd(0, 0.09); puck.tumbleRate = rnd(8, 20); }
      snd('board', -vn / 160);
    }
  }
  if (puck.z + PUCK_H > DOME_Z) { puck.z = DOME_Z - PUCK_H; if (puck.vz > 0) puck.vz *= -0.4; snd('board', 0.2); }
}

function inGoalInterior(gi, x, y, m = 0) {
  const gy = GOAL_Y[gi], back = gi === 0 ? gy - GD : gy + GD;
  return Math.abs(x) < GW / 2 - m && y > Math.min(gy, back) + m && y < Math.max(gy, back) - m;
}
function onNetTop(gi) {
  const gy = GOAL_Y[gi], back = gi === 0 ? gy - GD : gy + GD;
  return Math.abs(puck.x) < GW / 2 + 0.3 && puck.y > Math.min(gy, back) - 0.3 && puck.y < Math.max(gy, back) + 0.3;
}
function collideGoals() {
  for (let gi = 0; gi < 2; gi++) {
    const gy = GOAL_Y[gi], out = gi === 0 ? 1 : -1, back = gy - out * GD;
    if (puck.z < GH) {
      // tolpat
      for (const sx of [-1, 1]) {
        const imp = hitCapsule(sx * GW / 2, gy, sx * GW / 2, gy, POST_R, 0, 0, 0, 0, 0.72, 0.25, 'post');
        if (imp) { snd('post', imp / 120); if (Math.random() < 0.4) puck.tumbleRate = rnd(10, 30); }
      }
      // verkon sivut ja takaosa (pehmeä)
      const nets = [[-GW / 2, gy, -GW / 2, back], [GW / 2, gy, GW / 2, back], [-GW / 2, back, GW / 2, back]];
      for (const n of nets) {
        const imp = hitCapsule(n[0], n[1], n[2], n[3], 0.15, 0, 0, 0, 0, 0.12, 0, 'net');
        if (imp) snd('net', imp / 150);
      }
    }
    // ylärima: kiekko osittain riman korkeudella ylittämässä maaliviivaa
    const crossing = Math.abs(puck.x) < GW / 2 && (puck.y - gy) * out < PUCK_R && (puck.y - gy) * out > -0.4 && puck.vy * out < 0;
    if (crossing && puck.z + PUCK_H > GH - 0.45 && puck.z < GH + 0.1) {
      puck.vy = -puck.vy * 0.55;
      puck.y = gy + out * (PUCK_R + 0.01);
      puck.vz += rnd(-0.6, 0.8) * Math.abs(puck.vy) * 0.6;
      puck.tumbleRate = rnd(15, 35);
      snd('post', Math.abs(puck.vy) / 90);
    }
  }
}

function startFall(gi) {
  puck.falling = true; puck.fallGoal = gi; puck.onNet = false;
  snd('fall', 1);
}

function stepPuck(dt) {
  if (puck.hidden) return;
  // painovoima & alusta
  if (puck.falling) {
    puck.vz -= GRAV * dt;
    puck.vx *= Math.exp(-6 * dt); puck.vy *= Math.exp(-6 * dt);
    puck.x += puck.vx * dt; puck.y += puck.vy * dt; puck.z += puck.vz * dt;
    // pysy maalin sisällä (verkko/kehikko)
    const gy = GOAL_Y[puck.fallGoal], back = puck.fallGoal === 0 ? gy - GD : gy + GD;
    const lo = Math.min(gy, back) + 0.2, hi = Math.max(gy, back) - 0.2;
    puck.x = clamp(puck.x, -GW / 2 + 0.3, GW / 2 - 0.3); puck.y = clamp(puck.y, lo, hi);
    puck.tumble += puck.tumbleRate * dt;
    if (puck.z < -14) { puck.hidden = true; }
    return;
  }
  puck.x += puck.vx * dt; puck.y += puck.vy * dt; puck.z += puck.vz * dt;
  // mikä on alla? jää, maalin reikä vai verkon katto
  let ground = 0;
  for (let gi = 0; gi < 2; gi++) {
    if (onNetTop(gi) && puck.z > GH - 0.35) ground = GH;
    else if (inGoalInterior(gi, puck.x, puck.y, 0.1) && puck.z < GH) {
      // kiekko maalin sisällä -> ei jäätä, putoaa pelin sisään = MAALI
      startFall(gi);
      goalScored(1 - gi);
      return;
    }
  }
  if (puck.z > ground + 0.001 || puck.vz > 0) {
    puck.vz -= GRAV * dt;
    puck.vx *= Math.exp(-0.15 * dt); puck.vy *= Math.exp(-0.15 * dt);
    puck.tumble += puck.tumbleRate * dt;
  }
  if (puck.z <= ground) {
    puck.z = ground;
    if (puck.vz < -25) {
      snd(ground > 0 ? 'net' : 'ice', -puck.vz / 200);
      puck.vz = -puck.vz * (ground > 0 ? 0.18 : 0.38);
      puck.tumbleRate *= 0.6;
      // epätasainen pomppu
      puck.vx += rnd(-1, 1) * Math.abs(puck.vz) * 0.08; puck.vy += rnd(-1, 1) * Math.abs(puck.vz) * 0.08;
    } else {
      puck.vz = 0;
      // kiekko asettuu lappeelleen
      const k = Math.round(puck.tumble / Math.PI) * Math.PI;
      puck.tumble += (k - puck.tumble) * Math.min(1, 25 * dt);
      puck.tumbleRate *= Math.exp(-14 * dt);
      // kitka
      const sp = hyp(puck.vx, puck.vy);
      const fr = (ground > 0 ? 160 : 14) + sp * 0.32;
      if (sp > 0) { const ns = Math.max(0, sp - fr * dt); puck.vx *= ns / sp; puck.vy *= ns / sp; }
      // verkon katolta valuminen reunoille
      if (ground > 0) {
        for (let gi = 0; gi < 2; gi++) if (onNetTop(gi)) { puck.vy += (GOAL_Y[gi] < 50 ? -1 : 1) * 30 * dt; }
      }
    }
  }
  // jää on hieman kupera urien suuntaan: tavoittamattomiin kohtiin pysähtynyt kiekko valuu hitaasti lähimmän uran luo
  if (puck.z < 0.05 && ground === 0) {
    let bd = 1e9, bx = 0, by = 0;
    for (const f of figs) {
      const t = slotClosestT(f, puck.x, puck.y);
      const qx = f.ax + (f.bx - f.ax) * t, qy = f.ay + (f.by - f.ay) * t, d = hyp(qx - puck.x, qy - puck.y);
      if (d < bd) { bd = d; bx = qx; by = qy; }
    }
    if (bd > 3.4) { puck.vx += (bx - puck.x) / bd * 34 * dt; puck.vy += (by - puck.y) / bd * 34 * dt; }
  }
  // maalin takana ja kulmissa jää nousee loivasti laitaa kohti (kuten oikeissa pöydissä): kiekko valuu takaisin peliin
  if (puck.z < 0.05 && ground === 0) {
    const behind = puck.y < GOAL_Y[0] ? GOAL_Y[0] - puck.y : puck.y > GOAL_Y[1] ? puck.y - GOAL_Y[1] : 0;
    if (behind > 0) {
      puck.vy += (puck.y < 50 ? 1 : -1) * (40 + behind * 9) * dt;
      puck.vx += -Math.sign(puck.x) * (Math.abs(puck.x) > GW / 2 + 2 ? 26 : 0) * dt;
    }
  }
  // kiekko kolahtaa urien yli
  if (puck.z < 0.1) {
    const sp = hyp(puck.vx, puck.vy);
    for (const f of figs) {
      const u = (puck.x - f.ax) * f.dx + (puck.y - f.ay) * f.dy;
      const side = (puck.x - f.ax) * -f.dy + (puck.y - f.ay) * f.dx;
      const sg = side > 0 ? 1 : -1;
      if (f.pside && f.pside !== sg && u > -1.4 && u < f.len + 1.4 && sp > 12) snd('groove', sp / 260);
      f.pside = sg;
    }
  }
  puck.spin *= Math.exp(-0.8 * dt);
  puck.yaw += puck.spin * dt * 0.05;
  collideFigures();
  collideGoals();
  collideBoards();
}

// ---------------------------------------------------------------- pelikulku
function message(t, dur = 1.6, big = false) { G.msg = t; G.msgT = dur; G.msgBig = big; }
function dropPuck() {
  puck.hidden = false; puck.falling = false; puck.onNet = false;
  puck.x = rnd(-0.6, 0.6); puck.y = 50 + rnd(-0.6, 0.6); puck.z = 24;
  puck.vx = rnd(-14, 14); puck.vy = rnd(-14, 14); puck.vz = 0;
  puck.tumble = rnd(0, 6); puck.tumbleRate = rnd(6, 14); puck.spin = rnd(-20, 20);
  G.state = 'play'; G.stuckT = 0;
  snd('drop', 1);
}
function faceoff(delay = 1.2) {
  puck.hidden = true; puck.falling = false;
  G.state = 'drop'; G.timer = delay;
  message('Kiekko pudotetaan keskiympyrään…', delay);
}
function goalScored(team) {
  if (G.state !== 'play') return;
  G.score[team]++;
  G.shots[team]++;
  G.state = 'goal'; G.timer = 3.2;
  message(team === 0 ? 'MAALI! KOTI' : 'MAALI! VIERAS', 3, true);
  snd('horn');
  G.goalFlash = 1.6; G.goalTeam = team;
  if (G.overtime) { G.timer = 3.2; G.endAfterGoal = true; }
}
function startGame(mode) {
  audio();
  G.mode = mode; G.demo = false;
  G.diff = +document.getElementById('diff').value;
  G.periodLen = +document.getElementById('plen').value;
  G.autoGoalie = document.getElementById('autog').checked;
  G.score = [0, 0]; G.shots = [0, 0]; G.period = 1; G.clock = G.periodLen; G.overtime = false; G.endAfterGoal = false;
  G.paused = false;
  makeFigures();
  ctl[0].active = null; ctl[1].active = null;
  document.getElementById('menu').classList.add('hidden');
  faceoff(1.6);
}
function openMenu() {
  G.paused = true;
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('bres').style.display = (G.state !== 'over' && G.state !== 'menu') ? '' : 'none';
}
function togglePause() {
  if (G.state === 'over') return;
  if (document.getElementById('menu').classList.contains('hidden')) openMenu();
  else { document.getElementById('menu').classList.add('hidden'); G.paused = false; }
}
document.getElementById('b1').onclick = () => startGame(1);
document.getElementById('b2').onclick = () => startGame(2);
document.getElementById('b0').onclick = () => startGame(0);
document.getElementById('bres').onclick = () => { document.getElementById('menu').classList.add('hidden'); G.paused = false; audio(); };

function endPeriod() {
  snd('whistle');
  if (G.period >= 3 && G.score[0] !== G.score[1] || G.overtime) { gameOver(); return; }
  if (G.period >= 3) {
    G.overtime = true; G.period = 4; G.clock = G.periodLen;
    G.state = 'periodEnd'; G.timer = 3; message('Tasapeli – jatkoaika! Seuraava maali ratkaisee.', 3, true);
    return;
  }
  G.state = 'periodEnd'; G.timer = 3;
  message(G.period + '. erä päättyi', 3, true);
  G.period++; G.clock = G.periodLen;
}
function gameOver() {
  G.state = 'over'; puck.hidden = true;
  const w = G.score[0] > G.score[1] ? 'KOTI VOITTI' : G.score[1] > G.score[0] ? 'VIERAS VOITTI' : 'TASAPELI';
  message(w + '  ' + G.score[0] + '–' + G.score[1], 999, true);
}

function update(dt) {
  G.time += dt;
  updateLoops(dt);
  if (G.msgT > 0) G.msgT -= dt;
  if (G.goalFlash > 0) G.goalFlash -= dt;
  if (G.paused) return;
  // ohjaus (kerran per ruutu)
  if (G.mode === 0) { aiTeam(0, dt); aiTeam(1, dt); }
  else {
    humanControl(0, dt);
    if (G.mode === 2) humanControl(1, dt); else aiTeam(1, dt);
  }
  if (G.autoGoalie && G.mode !== 0) {
    const gl = figs.find(f => f.team === 0 && f.kind === 'goalie'); aiGoalie(gl, dt, AI_LEVEL[1]);
    if (G.mode === 2) { const g2 = figs.find(f => f.team === 1 && f.kind === 'goalie'); aiGoalie(g2, dt, AI_LEVEL[1]); }
  }
  // fysiikka pienin askelin
  const n = Math.ceil(dt / DT), h = dt / n;
  for (let i = 0; i < n; i++) {
    for (const f of figs) stepFigure(f, h);
    if (G.state === 'play' || G.state === 'goal' || G.state === 'periodEnd') stepPuck(h);
  }
  // tila
  if (G.state === 'drop') { G.timer -= dt; if (G.timer <= 0) dropPuck(); }
  else if (G.state === 'goal') {
    G.timer -= dt;
    if (G.timer <= 0) { if (G.endAfterGoal) gameOver(); else faceoff(1.0); }
  } else if (G.state === 'periodEnd') {
    G.timer -= dt; if (G.timer <= 0) faceoff(1.2);
  } else if (G.state === 'play') {
    if (!G.demo) G.clock -= dt;
    if (G.clock <= 0) { G.clock = 0; puck.hidden = true; endPeriod(); return; }
    // laukaukset
    for (let gi = 0; gi < 2; gi++) {
      const gy = GOAL_Y[gi], out = gi === 0 ? 1 : -1, att = 1 - gi;
      const dy = (puck.y - gy) * out, vin = -puck.vy * out;
      const cross = vin > 0 ? puck.x + puck.vx * dy / vin : 99;
      if (dy > 0 && dy < 30 && vin > 70 && Math.abs(cross) < GW / 2 + 0.3 && puck.z < GH && G.time - G.lastShot[att] > 1.2) {
        G.shots[att]++; G.lastShot[att] = G.time;
      }
    }
    // jumissa oleva kiekko
    const sp = hyp(puck.vx, puck.vy);
    let near = false;
    for (const f of figs) if (hyp(f.x - puck.x, f.y - puck.y) < 5.2) { near = true; break; }
    if (sp < 4 && (!near || puck.z > 0.5)) G.stuckT += dt;
    else if (sp < 2) G.stuckT += dt * 0.5;
    else G.stuckT = 0;
    if (G.stuckT > 4.5) { message('Kiekko jumissa – uusi pudotus', 1.4); faceoff(1.2); }
  }
}

// ---------------------------------------------------------------- piirto: staattinen tausta
let bgCanvas = null, fgCanvas = null;
function renderStatic() {
  bgCanvas = document.createElement('canvas'); bgCanvas.width = cv.width; bgCanvas.height = cv.height;
  fgCanvas = document.createElement('canvas'); fgCanvas.width = cv.width; fgCanvas.height = cv.height;
  const main = ctx;
  // --- tausta
  let c = bgCanvas.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  swapCtx(c);
  const grd = c.createRadialGradient(VW / 2, VH * 0.55, 50, VW / 2, VH * 0.55, Math.max(VW, VH) * 0.8);
  grd.addColorStop(0, '#2a3140'); grd.addColorStop(1, '#090b10');
  c.fillStyle = grd; c.fillRect(0, 0, VW, VH);
  // pöydän runko
  const rim = rinkOutline(-6, 10);
  fillPoly(rim, '#1a1e26', -6);
  // sivut alaspäin (paksuus)
  const nearRim = rim.filter(p => p[1] < 30);
  fillPoly(rim, '#0d2f6e', BOARD_H);
  ringBand(rinkOutline(-6, 10), rinkOutline(-0.6, 10), BOARD_H, '#123c8a');
  // jää
  const ice = rinkOutline(0, 16);
  pathPoly(ice);
  const pT = P(0, 100), pB = P(0, 0);
  const ig = c.createLinearGradient(0, pT.y, 0, pB.y);
  ig.addColorStop(0, '#e9eef4'); ig.addColorStop(0.5, '#f7f9fb'); ig.addColorStop(1, '#eef2f6');
  c.fillStyle = ig; c.fill();
  c.save(); pathPoly(ice); c.clip();
  // merkinnät
  const red = '#d4232b', blue = '#2b3f9e';
  for (const gy of GOAL_Y) { const hw = rinkHalfWidthAt(gy); rect(-hw, gy - 0.18, hw, gy + 0.18, red); }
  rect(-HW, 36.4, HW, 37.6, blue); rect(-HW, 62.4, HW, 63.6, blue);
  rect(-HW, 49.4, HW, 50.6, red);
  for (let x = -HW + 1; x < HW; x += 3) rect(x, 49.75, x + 1.1, 50.25, '#ffffff');
  ring(0, 50, 7.5, 0.35, red);
  fillPoly(circlePts(0, 50, 0.7), blue);
  for (const fy of [22, 78]) for (const fx of [-13, 13]) {
    ring(fx, fy, 6.5, 0.3, red);
    fillPoly(circlePts(fx, fy, 0.75), red);
    for (const s of [-1, 1]) { rect(fx - 6.5 - 1.1, fy + s * 0.9 - 0.12, fx - 6.5, fy + s * 0.9 + 0.12, red); rect(fx + 6.5, fy + s * 0.9 - 0.12, fx + 6.5 + 1.1, fy + s * 0.9 + 0.12, red); }
  }
  for (const fy of [42, 58]) for (const fx of [-13, 13]) fillPoly(circlePts(fx, fy, 0.65), red);
  // maalialueet
  for (let gi = 0; gi < 2; gi++) {
    const gy = GOAL_Y[gi], o = gi === 0 ? 1 : -1;
    const pts = circlePts(0, gy, 5.6, 24, o > 0 ? 0 : Math.PI, o > 0 ? Math.PI : Math.PI * 2);
    fillPoly(pts, 'rgba(110,170,230,0.45)');
    pathPoly(pts); c.strokeStyle = red; c.lineWidth = 1.2; c.stroke();
  }
  // logo keskelle (likimääräinen perspektiivi affiinimuunnoksella)
  drawLogo(c);
  // urat
  for (const f of figs.length ? figs : (makeFigures(), figs)) {
    const ext = 1.4;
    const pts = capsulePts(f.ax - f.dx * ext, f.ay - f.dy * ext, f.bx + f.dx * ext, f.by + f.dy * ext, 0.55);
    fillPoly(pts, '#15171c');
    const pts2 = capsulePts(f.ax - f.dx * ext, f.ay - f.dy * ext, f.bx + f.dx * ext, f.by + f.dy * ext, 0.3);
    fillPoly(pts2, '#050608');
  }
  // maalien reiät: maalin sisällä ei ole jäätä
  for (let gi = 0; gi < 2; gi++) {
    const gy = GOAL_Y[gi], back = gi === 0 ? gy - GD : gy + GD;
    fillPoly([[-GW / 2, gy], [GW / 2, gy], [GW / 2, back], [-GW / 2, back]], '#060708');
    // reiän sisäseinä (syvyysvaikutelma)
    const nearY = gi === 0 ? back : gy, farY = gi === 0 ? gy : back;
    fillPoly([[-GW / 2, farY, 0], [GW / 2, farY, 0], [GW / 2, farY, -3], [-GW / 2, farY, -3]], '#23262d');
  }
  c.restore();
  // laidat: kaukaiset sisäpinnat
  drawWalls(true);
  swapCtx(main);

  // --- etualan laidat
  c = fgCanvas.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
  swapCtx(c);
  drawWalls(false);
  // kupu (heijastus)
  const a = P(-HW - 4, 104, 26), b = P(HW + 4, 104, 26), d0 = P(-HW - 6, -4, 0);
  const g2 = c.createLinearGradient(d0.x, 0, VW - d0.x, 0);
  g2.addColorStop(0, 'rgba(255,255,255,0.10)'); g2.addColorStop(0.18, 'rgba(255,255,255,0.0)');
  g2.addColorStop(0.82, 'rgba(255,255,255,0.0)'); g2.addColorStop(1, 'rgba(255,255,255,0.08)');
  c.fillStyle = g2;
  c.beginPath(); c.moveTo(d0.x, d0.y); c.lineTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(VW - d0.x, d0.y); c.closePath(); c.fill();
  swapCtx(main);
}
function swapCtx(c) { ctx = c; ctxRef.c = c; }
const ctxRef = { c: mainCtx };

function ringBand(outer, inner, z, col) {
  const c = ctxRef.c;
  c.beginPath();
  outer.forEach((p, i) => { const q = P(p[0], p[1], z); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.closePath();
  inner.slice().reverse().forEach((p, i) => { const q = P(p[0], p[1], z); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.closePath();
  c.fillStyle = col; c.fill('evenodd');
}
function drawWalls(far) {
  const c = ctxRef.c;
  const o = rinkOutline(0, 16), n = o.length;
  for (let i = 0; i < n; i++) {
    const a = o[i], b = o[(i + 1) % n];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    // sisäänpäin osoittava normaali (ääriviiva vastapäivään -> vasen normaali)
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const nx = -ey, ny = ex;
    const vis = (cam.C[0] - mx) * nx + (cam.C[1] - my) * ny > 0; // sisäpinta näkyy kameralle
    if (vis !== far) continue;
    const q = [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], BOARD_H), P(a[0], a[1], BOARD_H)];
    c.beginPath(); q.forEach((p, k) => k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
    const shade = 225 + Math.round(20 * (ny > 0 ? 0 : 1));
    c.fillStyle = far ? `rgb(${shade},${shade + 3},${shade + 8})` : '#14408f';
    c.fill(); c.strokeStyle = far ? `rgb(${shade},${shade + 3},${shade + 8})` : '#14408f'; c.lineWidth = 1; c.stroke();
    // keltainen yläreuna
    const t1 = P(a[0], a[1], BOARD_H), t2 = P(b[0], b[1], BOARD_H);
    c.strokeStyle = '#f2c519'; c.lineWidth = Math.max(2, 0.7 * t1.s); c.lineCap = 'round';
    c.beginPath(); c.moveTo(t1.x, t1.y); c.lineTo(t2.x, t2.y); c.stroke();
    // lasi
    if (far) {
      const g = [P(a[0], a[1], BOARD_H), P(b[0], b[1], BOARD_H), P(b[0], b[1], 13), P(a[0], a[1], 13)];
      c.beginPath(); g.forEach((p, k) => k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath();
      c.fillStyle = 'rgba(200,225,255,0.06)'; c.fill();
    }
  }
}
function drawLogo(c) {
  const oc = document.createElement('canvas'); oc.width = 600; oc.height = 150;
  const o = oc.getContext('2d');
  o.font = 'italic 900 92px system-ui, sans-serif'; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.lineWidth = 10; o.strokeStyle = '#ffffff'; o.strokeText('PÖYTÄKIEKKO', 300, 78);
  o.fillStyle = '#2b3f9e'; o.fillText('PÖYTÄKIEKKO', 300, 78);
  // affiini: kuvan vasen-ylä -> maailma (-10, 52.5), oikea-ylä -> (10, 52.5), vasen-ala -> (-10, 47.5)
  const p0 = P(-10, 52.5), p1 = P(10, 52.5), p2 = P(-10, 47.5);
  c.save();
  c.globalAlpha = 0.82;
  c.transform((p1.x - p0.x) / 600, (p1.y - p0.y) / 600, (p2.x - p0.x) / 150, (p2.y - p0.y) / 150, p0.x, p0.y);
  c.drawImage(oc, 0, 0);
  c.restore();
}

// ---------------------------------------------------------------- piirto: dynaaminen
function pickView(list, deg) {
  deg = ((deg % 360) + 360) % 360;
  let best = list[0][0], bd = 1e9;
  for (const [fr, a] of list) { let d = Math.abs(a - deg); d = Math.min(d, 360 - d); if (d < bd) { bd = d; best = fr; } }
  return best;
}
function drawFigure(f) {
  const c = ctxRef.c;
  const base = P(f.x, f.y, 0);
  // varjo & alusta
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath(); c.ellipse(base.x, base.y, 2.4 * base.s, 1.1 * base.s, 0, 0, Math.PI * 2); c.fill();
  // aktiivisen ukon rengas
  for (let t = 0; t < 2; t++) {
    if (ctl[t].active === f && (t === 0 || G.mode === 2) && G.state !== 'over') {
      const pts = circlePts(f.x, f.y, 3.2, 30);
      c.strokeStyle = TEAM_COL[t]; c.lineWidth = 2.5; c.globalAlpha = 0.85;
      c.beginPath(); pts.forEach((p, i) => { const q = P(p[0], p[1], 0.05); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke();
      c.globalAlpha = 1;
    }
  }
  c.fillStyle = '#2a2d33';
  c.beginPath(); c.ellipse(base.x, base.y, 1.3 * base.s, 0.6 * base.s, 0, 0, Math.PI * 2); c.fill();
  const view = (f.ang - azimuth(f.x, f.y)) * 180 / Math.PI - 180;
  const kind = f.kind;
  const list = kind === 'goalie' ? GOALIE_VIEWS : PLAYER_VIEWS;
  const fr = pickView(list, view);
  const r = SP[kind][fr];
  const img = IMGS[kind + (f.team === 0 ? '_blue' : '_red')];
  const s = base.s / FIG_PX_PER_CM;
  if (img.complete) c.drawImage(img, r[0], r[1], r[2], r[3], base.x - r[4] * s, base.y - r[5] * s, r[2] * s, r[3] * s);
  if (G.showHit) drawHitbox(f);
}
function drawHitbox(f) {
  const c = ctxRef.c, sh = SHAPES[f.kind];
  const a = local2world(f, ...sh.blade[0]), b = local2world(f, ...sh.blade[1]);
  line3([a[0], a[1], 0.5], [b[0], b[1], 0.5], 'rgba(255,220,0,0.9)', sh.bladeR * 2);
  const p = local2world(f, ...sh.body[0]), q = local2world(f, ...sh.body[1]);
  line3([p[0], p[1], 0.3], [q[0], q[1], 0.3], 'rgba(0,255,120,0.5)', sh.bodyR * 2);
}
function drawPuck() {
  const c = ctxRef.c;
  if (puck.hidden) return;
  const img = IMGS.puck;
  const airborne = puck.z > 0.05 || Math.abs(puck.tumbleRate) > 2;
  // varjo
  if (!puck.falling) {
    const g = P(puck.x, puck.y, 0);
    const k = clamp(1 - puck.z / 30, 0.3, 1);
    c.fillStyle = `rgba(0,0,0,${0.3 * k})`;
    c.beginPath(); c.ellipse(g.x, g.y, PUCK_R * 1.1 * g.s, PUCK_R * 0.55 * g.s, 0, 0, Math.PI * 2); c.fill();
  }
  let fr, ref;
  const tb = ((puck.tumble % Math.PI) + Math.PI) % Math.PI;
  if (airborne && Math.min(tb, Math.PI - tb) > 0.25) {
    fr = PUCK_TUMBLE[Math.floor((puck.tumble / (Math.PI * 2)) * PUCK_TUMBLE.length * 2) % PUCK_TUMBLE.length];
    if (fr === undefined || fr < 0) fr = PUCK_TUMBLE[0];
  } else {
    const n = PUCK_FLAT.length;
    fr = PUCK_FLAT[((Math.floor(puck.yaw * n / (Math.PI * 2)) % n) + n) % n];
  }
  const r = SP.puck[fr];
  ref = Math.max(r[2], r[3]);
  const ctr = P(puck.x, puck.y, puck.z + PUCK_H / 2);
  const s = (PUCK_R * 2.05 * ctr.s) / ref;
  if (puck.falling) {
    // leikataan reiän muotoon
    const gy = GOAL_Y[puck.fallGoal], back = puck.fallGoal === 0 ? gy - GD : gy + GD;
    c.save();
    pathPoly([[-GW / 2, gy], [GW / 2, gy], [GW / 2, back], [-GW / 2, back]], 0);
    if (puck.z < -0.5) c.clip();
    c.globalAlpha = clamp(1 + puck.z / 14, 0, 1);
    if (img.complete) c.drawImage(img, r[0], r[1], r[2], r[3], ctr.x - r[2] * s / 2, ctr.y - r[3] * s / 2, r[2] * s, r[3] * s);
    c.restore();
    return;
  }
  if (img.complete) c.drawImage(img, r[0], r[1], r[2], r[3], ctr.x - r[2] * s / 2, ctr.y - r[3] * s / 2, r[2] * s, r[3] * s);
}
function drawGoalPart(gi, part) {
  const c = ctxRef.c;
  const gy = GOAL_Y[gi], back = gi === 0 ? gy - GD : gy + GD;
  const hw = GW / 2;
  if (part === 'net') {
    // takaverkko, sivut ja katto
    const quads = [
      [[-hw, back, 0], [hw, back, 0], [hw, back, GH * 0.8], [-hw, back, GH * 0.8]],
      [[-hw, gy, 0], [-hw, back, 0], [-hw, back, GH * 0.8], [-hw, gy, GH]],
      [[hw, gy, 0], [hw, back, 0], [hw, back, GH * 0.8], [hw, gy, GH]],
      [[-hw, gy, GH], [hw, gy, GH], [hw, back, GH * 0.8], [-hw, back, GH * 0.8]]
    ];
    for (const q of quads) {
      c.beginPath(); q.forEach((p, i) => { const s = P(p[0], p[1], p[2]); i ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); }); c.closePath();
      c.fillStyle = 'rgba(245,248,255,0.16)'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.stroke();
    }
    // verkon silmukat
    c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 0.8;
    for (let i = 1; i < 10; i++) {
      const x = -hw + GW * i / 10;
      line3([x, back, 0], [x, back, GH * 0.8], 'rgba(255,255,255,0.28)', 0.05);
      line3([x, gy, GH], [x, back, GH * 0.8], 'rgba(255,255,255,0.28)', 0.05);
    }
    for (let j = 1; j < 4; j++) {
      const z = GH * 0.8 * j / 4;
      line3([-hw, back, z], [hw, back, z], 'rgba(255,255,255,0.28)', 0.05);
      line3([-hw, gy, z * 1.2], [-hw, back, z], 'rgba(255,255,255,0.28)', 0.05);
      line3([hw, gy, z * 1.2], [hw, back, z], 'rgba(255,255,255,0.28)', 0.05);
    }
    line3([-hw, back, GH * 0.8], [hw, back, GH * 0.8], '#c9252b', 0.35);
  } else {
    line3([-hw, gy, 0], [-hw, gy, GH], '#d42a2a', POST_R * 2);
    line3([hw, gy, 0], [hw, gy, GH], '#d42a2a', POST_R * 2);
    line3([-hw, gy, GH], [hw, gy, GH], '#d42a2a', POST_R * 2);
    line3([-hw, gy, 0.05], [hw, gy, 0.05], 'rgba(200,30,30,0.6)', 0.2);
  }
}

function drawScoreboard() {
  const c = ctxRef.c;
  const { w, h } = sbSize();
  const x = VW / 2 - w / 2, y = 8;
  c.fillStyle = '#16181c'; c.strokeStyle = '#3b3f48'; c.lineWidth = 2;
  roundRect(c, x, y, w, h, 8); c.fill(); c.stroke();
  const led = (txt, cx, cy, size, col = '#ff3b2a') => {
    c.font = `700 ${size}px "Courier New", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,60,40,0.06)'; c.fillText('8'.repeat(txt.length), cx, cy);
    c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col; c.fillText(txt, cx, cy); c.shadowBlur = 0;
  };
  const lab = (txt, cx, cy, size) => { c.font = `600 ${size}px system-ui, sans-serif`; c.fillStyle = '#d7dbe3'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, cx, cy); };
  lab('LAUKAUKSET', VW / 2, y + h * 0.12, h * 0.1);
  led(String(G.shots[0]).padStart(2, ' '), x + w * 0.12, y + h * 0.24, h * 0.2);
  led(String(G.shots[1]).padStart(2, ' '), x + w * 0.88, y + h * 0.24, h * 0.2);
  const cl = Math.ceil(G.clock), mm = Math.floor(cl / 60), ss = cl % 60;
  led(mm + ':' + String(ss).padStart(2, '0'), VW / 2, y + h * 0.33, h * 0.26, '#ffb020');
  // joukkueet
  c.fillStyle = TEAM_COL[0]; roundRect(c, x + w * 0.04, y + h * 0.5, w * 0.24, h * 0.17, 4); c.fill();
  c.fillStyle = TEAM_COL[1]; roundRect(c, x + w * 0.72, y + h * 0.5, w * 0.24, h * 0.17, 4); c.fill();
  lab('KOTI', x + w * 0.16, y + h * 0.585, h * 0.12); lab('VIERAS', x + w * 0.84, y + h * 0.585, h * 0.12);
  lab(G.overtime ? 'JATKOAIKA' : 'ERÄ', VW / 2, y + h * 0.58, h * 0.1);
  led(G.overtime ? 'JA' : String(G.period), VW / 2, y + h * 0.75, h * 0.2, '#ffb020');
  led(String(G.score[0]), x + w * 0.3, y + h * 0.83, h * 0.3);
  led(String(G.score[1]), x + w * 0.7, y + h * 0.83, h * 0.3);
  lab('MAALIT', VW / 2, y + h * 0.93, h * 0.08);
}
function sbSize() { const w = Math.min(440, VW * 0.46); return { w, h: w * 0.27 }; }
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function render() {
  swapCtx(mainCtx);
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (bgCanvas) c.drawImage(bgCanvas, 0, 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  // aktiivisen ukon ura korostettuna
  for (let t = 0; t < 2; t++) {
    const a = ctl[t].active;
    if (a && (t === 0 || G.mode === 2) && G.state !== 'menu' && G.state !== 'over') {
      const pts = capsulePts(a.ax, a.ay, a.bx, a.by, 0.6);
      fillPoly(pts, t === 0 ? 'rgba(47,124,240,0.35)' : 'rgba(226,50,42,0.35)', 0.02);
    }
  }
  // syvyysjärjestetyt objektit
  const items = [];
  for (const f of figs) items.push({ d: P(f.x, f.y).d, draw: () => drawFigure(f) });
  if (!puck.hidden) items.push({ d: P(puck.x, puck.y).d + (puck.falling ? 0 : -0.01), draw: drawPuck });
  for (let gi = 0; gi < 2; gi++) {
    const gy = GOAL_Y[gi], back = gi === 0 ? gy - GD : gy + GD;
    items.push({ d: P(0, gy).d, draw: () => drawGoalPart(gi, 'frame') });
    items.push({ d: P(0, back).d, draw: () => drawGoalPart(gi, 'net') });
  }
  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.draw();
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (fgCanvas) c.drawImage(fgCanvas, 0, 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawScoreboard();
  // maalivälähdys
  if (G.goalFlash > 0) {
    c.fillStyle = G.goalTeam === 0 ? `rgba(47,124,240,${0.18 * G.goalFlash})` : `rgba(226,50,42,${0.18 * G.goalFlash})`;
    c.fillRect(0, 0, VW, VH);
  }
  // viestit
  if (G.msgT > 0 && G.msg) {
    const a = clamp(G.msgT * 2, 0, 1);
    c.globalAlpha = a;
    c.font = G.msgBig ? `900 ${Math.min(72, VW / 12)}px system-ui, sans-serif` : `700 ${Math.min(28, VW / 30)}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = G.msgBig ? 8 : 5; c.strokeStyle = 'rgba(0,0,0,0.7)';
    const y = VH * 0.47;
    c.strokeText(G.msg, VW / 2, y);
    c.fillStyle = G.msgBig ? '#ffd23a' : '#ffffff'; c.fillText(G.msg, VW / 2, y);
    if (G.state === 'over') {
      c.font = `600 ${Math.min(20, VW / 40)}px system-ui, sans-serif`;
      c.fillStyle = '#fff'; c.fillText('Välilyönti / Enter = uusi peli', VW / 2, y + 60);
    }
    c.globalAlpha = 1;
  }
  if (G.paused && G.state !== 'menu') {
    // valikko näkyy
  }
  // ohjevihje
  c.font = '12px system-ui, sans-serif'; c.fillStyle = 'rgba(220,226,236,0.55)'; c.textAlign = 'left'; c.textBaseline = 'bottom';
  if (G.mode === 0 && !G.demo) {
    c.font = '700 14px system-ui, sans-serif'; c.fillStyle = 'rgba(255,210,58,0.85)'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('KATSELUTILA – tietokone vs. tietokone', 14, 14);
    c.font = '12px system-ui, sans-serif'; c.fillStyle = 'rgba(220,226,236,0.55)'; c.textBaseline = 'bottom';
  }
  c.fillText((muted ? 'Äänet pois (M)' : 'M = äänet') + '  ·  H = osuma-alueet  ·  P = tauko', 12, VH - 10);
}

// ---------------------------------------------------------------- käynnistys
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  setupCamera();
  if (!figs.length) makeFigures();
  renderStatic();
}
addEventListener('resize', resize);
resize();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// demotila valikon taustalla: tietokone vs. tietokone
G.mode = 0; G.demo = true; G.diff = 1; makeFigures(); faceoff(0.8);
