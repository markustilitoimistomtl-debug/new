'use strict';
/* Introtekijä – YouTube-videon introteksti, lopputekstit ja tilaa/tykkää-muistutukset.
   Kaikki piirretään canvasille; tallennus MediaRecorderilla (kuva + klipin ääni). */

// ------------------------------------------------------------ asetukset
const DEFAULTS = {
  out: { res: 'auto', fps: 'auto', fit: 'contain', vol: 1, quality: 'max' },
  intro: {
    on: true, title: 'Videon otsikko', sub: 'Kanavan nimi', anim: 'zoom', pos: 'center', mode: 'overlay',
    cardDur: 4, start: 0.5, dur: 4, inT: 0.8, outT: 0.6, font: 'Montserrat', size: 9,
    color: '#ffffff', accent: '#ff3d4a', box: false, shadow: true, bg1: '#0b1020', bg2: '#3a1c71'
  },
  cta: { on: true, like: true, sub: true, bell: true, cursor: true, at: 6, dur: 5, repeat: 'no', pos: 'bl', lang: 'fi', scale: 100, note: '' },
  credits: {
    on: true, mode: 'card', style: 'scroll', dur: 8, font: 'Montserrat',
    text: '# Kiitos katsomisesta!\n\n# Kuvaus ja editointi\nOma Nimi\n\n# Musiikki\nKappaleen nimi – Esittäjä\n\n# Erityiskiitos\nKaikille katsojille', color: '#ffffff', accent: '#ff3d4a', bg: '#0b0d12'
  }
};
const LS_KEY = 'introtekija.v1';
let S = structuredClone(DEFAULTS);
try { const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (s) S = merge(structuredClone(DEFAULTS), s); } catch (e) { }
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) merge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; }
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } }
const getK = p => p.split('.').reduce((o, k) => o[k], S);
const setK = (p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };

// ------------------------------------------------------------ elementit
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const vid = $('vid');
let W = 2560, H = 1440;
let videoURL = null, hasVideo = false, clipFps = 30, srcBps = 0, srcFileSize = 0;

// ------------------------------------------------------------ apufunktiot
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const easeBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const fmt = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(1).padStart(4, '0'); };
function rr(c, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

// ------------------------------------------------------------ aikajana
function clipDur() { return hasVideo && isFinite(vid.duration) ? vid.duration : 8; }
function layout() {
  const ci = S.intro.on && S.intro.mode === 'card' ? +S.intro.cardDur : 0;
  const cd = clipDur();
  const cc = S.credits.on && S.credits.mode === 'card' ? +S.credits.dur : 0;
  return { introEnd: ci, clipEnd: ci + cd, total: ci + cd + cc, cd };
}
function applyRes() {
  let w, h;
  if ((S.out.res === 'auto' || S.out.res === 'clip') && hasVideo && vid.videoWidth) {
    // klipin oma koko pikselilleen; 'auto' pienentää vain jos klippi on yli 1440p (lyhyempi sivu > 1440)
    w = vid.videoWidth; h = vid.videoHeight;
    const s = S.out.res === 'auto' ? Math.min(1, 1440 / Math.min(w, h)) : 1;
    w = Math.round(w * s); h = Math.round(h * s);
  }
  else if (S.out.res === 'auto' || S.out.res === 'clip') { w = 2560; h = 1440; }
  else [w, h] = S.out.res.split('x').map(Number);
  w -= w % 2; h -= h % 2;
  if (w !== W || h !== H) { W = w; H = h; cv.width = W; cv.height = H; }
}

// ------------------------------------------------------------ piirto: taustat
function drawCardBg(t, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // hidas valopyyhkäisy ja pehmeät valopallot
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = W * (0.5 + 0.42 * Math.sin(t * 0.25 + i * 1.7)), y = H * (0.5 + 0.38 * Math.cos(t * 0.21 + i * 2.3));
    const r = Math.min(W, H) * (0.25 + 0.1 * Math.sin(i + t * 0.3));
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.07)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  const sx = ((t * 0.35) % 1.6 - 0.3) * W;
  const sg = ctx.createLinearGradient(sx - W * 0.15, 0, sx + W * 0.15, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.05)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function drawVideoFrame(alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (hasVideo && vid.readyState >= 2) {
    const vw = vid.videoWidth, vh = vid.videoHeight;
    const s = S.out.fit === 'cover' ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
    const dw = vw * s, dh = vh * s;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1c2433'); g.addColorStop(1, '#0c1018');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
    for (let x = 0; x < W; x += W / 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += H / 9) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `600 ${H * 0.035}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Tähän tulee videoklippisi – lataa klippi yläreunasta', W / 2, H * 0.62);
  }
  ctx.restore();
}

// ------------------------------------------------------------ piirto: introteksti
function fontStr(weight, px, fam) { return `${weight} ${Math.round(px)}px "${fam}", system-ui, sans-serif`; }
function titleWeight(f) { return f === 'Bebas Neue' || f === 'Permanent Marker' ? 400 : f === 'Oswald' ? 700 : f === 'Roboto Slab' ? 800 : 900; }
function drawIntro(tau) {
  const I = S.intro;
  if (!I.on || !I.title && !I.sub) return;
  const start = +I.start, dur = +I.dur, end = start + dur;
  if (tau < start || tau > end) return;
  const local = tau - start;
  const pin = clamp(local / I.inT), pout = clamp((end - tau) / I.outT);
  const ein = easeOut(pin), eout = easeOut(pout), e = Math.min(ein, eout);
  const base = Math.min(W, H * 16 / 9) * I.size / 100 * 0.56;
  const tPx = base, sPx = base * 0.42;
  const lines = [];
  if (I.title) lines.push({ text: I.title, font: fontStr(titleWeight(I.font), tPx, I.font), px: tPx, color: I.color });
  if (I.sub) lines.push({ text: I.sub, font: fontStr(600, sPx, I.font === 'Bebas Neue' || I.font === 'Permanent Marker' ? I.font : 'Montserrat'), px: sPx, color: I.accent, gap: tPx * 0.18 });
  // mitat
  let maxW = 0, totH = 0;
  for (const l of lines) { ctx.font = l.font; l.w = ctx.measureText(l.text).width; maxW = Math.max(maxW, l.w); totH += l.px * 1.12 + (l.gap || 0); }
  let align = 'center', cx = W / 2, cy = H / 2;
  if (I.pos === 'lower') { align = 'left'; cx = W * 0.07; cy = H * 0.8 - totH / 2; }
  else if (I.pos === 'top') { cy = H * 0.12 + totH / 2; }
  // liike
  let dx = 0, dy = 0, scale = 1, alpha = 1, blur = 0, chars = Infinity, clipFrac = 1, clipFrom = 0;
  const A = I.anim;
  if (A === 'fade') alpha = e;
  else if (A === 'zoom') { alpha = e; scale = pout < 1 ? 1 + (1 - eout) * 0.15 : 0.6 + 0.4 * easeBack(pin); }
  else if (A === 'slideL') { dx = pin < 1 ? -(1 - ein) * W * 0.6 : (1 - eout) * W * 0.6; alpha = Math.min(1, e * 1.5); }
  else if (A === 'slideR') { dx = pin < 1 ? (1 - ein) * W * 0.6 : -(1 - eout) * W * 0.6; alpha = Math.min(1, e * 1.5); }
  else if (A === 'slideUp') { dy = pin < 1 ? (1 - ein) * H * 0.18 : -(1 - eout) * H * 0.08; alpha = e; }
  else if (A === 'blur') { alpha = e; blur = (1 - e) * base * 0.35; scale = 1 + (1 - e) * 0.05; }
  else if (A === 'wipe') { if (pin < 1) clipFrac = ein; else { clipFrom = 1 - eout; } }
  else if (A === 'type') { chars = Math.floor(clamp(local / Math.max(0.2, I.inT * 1.6)) * lines.reduce((s, l) => s + l.text.length, 0)); alpha = eout; }
  else if (A === 'letters') { alpha = eout; }
  else if (A === 'across') {
    const tw = maxW + W * 0.1;
    const p = clamp(local / dur);
    dx = (W / 2 + tw / 2) - p * (W + tw) + (align === 'left' ? -(cx - W / 2) : 0);
  }
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur > 0.5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.translate(cx + dx, cy + dy);
  ctx.scale(scale, scale);
  // taustapalkki
  if (I.box) {
    const pad = base * 0.35;
    const bx = align === 'center' ? -maxW / 2 - pad : -pad, bw = maxW + pad * 2;
    const bf = A === 'wipe' ? 1 : (A === 'type' || A === 'letters' ? ein : 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, bx, -totH / 2 - pad * 0.6, bw * bf, totH + pad * 1.2, pad * 0.3); ctx.fill();
    ctx.fillStyle = I.accent;
    ctx.fillRect(bx, -totH / 2 - pad * 0.6, Math.max(4, base * 0.06), totH + pad * 1.2);
  } else if (I.pos === 'lower') {
    ctx.fillStyle = I.accent;
    ctx.fillRect(-base * 0.25, -totH / 2, Math.max(4, base * 0.07), totH * ein);
  }
  if (A === 'wipe') {
    const left = align === 'center' ? -maxW / 2 - 20 : -20, ww = maxW + 40;
    ctx.beginPath(); ctx.rect(left + ww * clipFrom, -totH, ww * (clipFrac - clipFrom), totH * 2); ctx.clip();
  }
  if (I.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = base * 0.12; ctx.shadowOffsetY = base * 0.04; }
  ctx.textBaseline = 'alphabetic';
  let y = -totH / 2, used = 0;
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li];
    y += (l.gap || 0) + l.px * 0.9;
    ctx.font = l.font; ctx.fillStyle = l.color;
    const x0 = align === 'center' ? -l.w / 2 : 0;
    if (A === 'letters') {
      let x = x0;
      for (let i = 0; i < l.text.length; i++) {
        const ch = l.text[i], cw = ctx.measureText(ch).width;
        const k = clamp((local - (used + i) * 0.045) / 0.35);
        if (k > 0) {
          ctx.save(); ctx.globalAlpha = alpha * clamp(k * 2);
          const sc = 0.4 + 0.6 * easeBack(k);
          ctx.translate(x + cw / 2, y - l.px * 0.35 + (1 - easeOut(k)) * l.px * 0.5);
          ctx.scale(sc, sc); ctx.textAlign = 'center';
          ctx.fillText(ch, 0, l.px * 0.35);
          ctx.restore();
        }
        x += cw;
      }
      used += l.text.length;
    } else {
      ctx.textAlign = 'left';
      let txt = l.text;
      if (A === 'type') { const n = clamp(chars - used, 0, txt.length); txt = txt.slice(0, n); used += l.text.length; }
      ctx.fillText(txt, x0, y);
      if (A === 'type' && chars - (used - l.text.length) >= 0 && chars - (used - l.text.length) <= l.text.length && Math.floor(local * 2.5) % 2 === 0) {
        const cwid = ctx.measureText(txt).width;
        ctx.fillRect(x0 + cwid + l.px * 0.06, y - l.px * 0.78, l.px * 0.07, l.px * 0.9);
      }
    }
    y += l.px * 0.22;
  }
  ctx.restore();
}

// ------------------------------------------------------------ piirto: tilaa / tykkää
const CTA_TXT = {
  fi: { like: 'TYKKÄÄ', liked: 'TYKÄTTY', sub: 'TILAA', subbed: 'TILATTU' },
  en: { like: 'LIKE', liked: 'LIKED', sub: 'SUBSCRIBE', subbed: 'SUBSCRIBED' }
};
function drawThumb(c, x, y, s, filled, col) {
  // yksinkertainen peukku: hiha + kämmen + peukalo
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineJoin = 'round'; c.lineWidth = 0.09;
  c.beginPath();
  c.moveTo(-0.5, -0.05); c.lineTo(-0.28, -0.05); c.lineTo(-0.28, 0.5); c.lineTo(-0.5, 0.5); c.closePath();
  c.moveTo(-0.2, -0.02);
  c.lineTo(0.02, -0.45); c.quadraticCurveTo(0.1, -0.58, 0.19, -0.5); c.quadraticCurveTo(0.24, -0.42, 0.18, -0.25);
  c.lineTo(0.12, -0.08); c.lineTo(0.42, -0.08);
  c.quadraticCurveTo(0.56, -0.06, 0.52, 0.08);
  c.lineTo(0.42, 0.42); c.quadraticCurveTo(0.38, 0.5, 0.28, 0.5); c.lineTo(-0.2, 0.5); c.closePath();
  if (filled) { c.fillStyle = col; c.fill(); }
  c.strokeStyle = col; c.stroke();
  c.restore();
}
function drawBell(c, x, y, s, col, ang) {
  c.save(); c.translate(x, y - s * 0.45); c.rotate(ang); c.translate(0, s * 0.45); c.scale(s, s);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-0.42, 0.3); c.quadraticCurveTo(-0.3, 0.18, -0.3, -0.05);
  c.quadraticCurveTo(-0.3, -0.42, 0, -0.45); c.quadraticCurveTo(0.3, -0.42, 0.3, -0.05);
  c.quadraticCurveTo(0.3, 0.18, 0.42, 0.3); c.closePath(); c.fill();
  c.beginPath(); c.arc(0, 0.38, 0.1, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0, -0.5, 0.07, 0, Math.PI * 2); c.fill();
  c.restore();
}
function drawCursor(c, x, y, s, press) {
  c.save(); c.translate(x, y); c.scale(s * (press ? 0.88 : 1), s * (press ? 0.88 : 1));
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 1); c.lineTo(0.27, 0.76); c.lineTo(0.45, 1.13); c.lineTo(0.6, 1.06); c.lineTo(0.42, 0.7); c.lineTo(0.75, 0.7); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.lineWidth = 0.07; c.strokeStyle = '#111'; c.stroke();
  c.restore();
}
function drawCTA(tc) {
  const C = S.cta;
  if (!C.on || !(C.like || C.sub || C.bell)) return;
  const times = [+C.at];
  if (C.repeat === 'yes') times.push(clipDur() - C.dur - 1.5);
  for (const at of times) {
    const local = tc - at;
    if (local < 0 || local > C.dur) continue;
    drawCTAOnce(local, C);
  }
}
function drawCTAOnce(local, C) {
  const L = CTA_TXT[C.lang] || CTA_TXT.fi;
  const k = Math.min(W, H * 16 / 9) / 1920 * C.scale / 100;
  const h = 64 * k, gap = 18 * k, fontPx = 28 * k;
  ctx.font = `800 ${fontPx}px Montserrat, system-ui, sans-serif`;
  // napit ja niiden leveydet
  const items = [];
  // klikkausajat
  const tLike = 1.2, tSub = C.like ? 2.1 : 1.3, tBell = (C.sub ? tSub : (C.like ? tLike : 0.9)) + 0.9;
  if (C.like) items.push({ kind: 'like', w: h * 0.9 + ctx.measureText(L.liked).width + 30 * k, click: tLike });
  if (C.sub) items.push({ kind: 'sub', w: ctx.measureText(L.subbed).width + 56 * k, click: tSub });
  if (C.bell) items.push({ kind: 'bell', w: h, click: tBell });
  const totW = items.reduce((s, i) => s + i.w, 0) + gap * (items.length - 1);
  const m = 60 * k;
  let x0, y0;
  const pos = C.pos;
  if (pos === 'bl') { x0 = m; y0 = H - m - h; }
  else if (pos === 'br') { x0 = W - m - totW; y0 = H - m - h; }
  else if (pos === 'bc') { x0 = (W - totW) / 2; y0 = H - m - h; }
  else if (pos === 'tr') { x0 = W - m - totW; y0 = m + (C.note ? fontPx * 1.6 : 0); }
  else { x0 = (W - totW) / 2; y0 = (H - h) / 2; }
  const end = C.dur;
  const pin = easeBack(clamp(local / 0.45)), pout = clamp((end - local) / 0.4);
  ctx.save();
  ctx.globalAlpha = clamp(local / 0.25) * easeOut(pout);
  const fromBottom = pos !== 'tr';
  ctx.translate(0, (1 - pin) * h * 1.5 * (fromBottom ? 1 : -1) + (1 - easeOut(pout)) * h * (fromBottom ? 1 : -1));
  // oma teksti
  if (C.note) {
    ctx.font = `700 ${fontPx * 0.95}px Montserrat, system-ui, sans-serif`;
    ctx.textBaseline = 'bottom'; ctx.textAlign = pos === 'br' || pos === 'tr' ? 'right' : pos === 'bl' ? 'left' : 'center';
    const nx = pos === 'br' || pos === 'tr' ? x0 + totW : pos === 'bl' ? x0 : x0 + totW / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 10 * k;
    ctx.fillStyle = '#fff'; ctx.fillText(C.note, nx, y0 - 12 * k);
    ctx.shadowBlur = 0;
  }
  let x = x0;
  let cursorTarget = null, cursorPress = false;
  for (const it of items) {
    const clicked = local >= it.click;
    const press = local >= it.click - 0.08 && local < it.click + 0.12;
    const sc = press ? 0.93 : clicked && local < it.click + 0.35 ? 1 + 0.06 * Math.sin((local - it.click) / 0.35 * Math.PI) : 1;
    ctx.save();
    ctx.translate(x + it.w / 2, y0 + h / 2); ctx.scale(sc, sc); ctx.translate(-it.w / 2, -h / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 16 * k; ctx.shadowOffsetY = 4 * k;
    if (it.kind === 'like') {
      ctx.fillStyle = '#ffffff'; rr(ctx, 0, 0, it.w, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
      drawThumb(ctx, h * 0.55, h * 0.52, h * 0.55, clicked, clicked ? '#1f6fe5' : '#111');
      ctx.fillStyle = clicked ? '#1f6fe5' : '#111'; ctx.font = `800 ${fontPx}px Montserrat, system-ui, sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(clicked ? L.liked : L.like, h * 0.98, h / 2 + 1);
      if (clicked && local < it.click + 0.6) sparkle(h * 0.55, h * 0.45, (local - it.click) / 0.6, h, '#1f6fe5');
    } else if (it.kind === 'sub') {
      ctx.fillStyle = clicked ? '#3a3f47' : '#e62117'; rr(ctx, 0, 0, it.w, h, 10 * k); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff'; ctx.font = `800 ${fontPx}px Montserrat, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(clicked ? L.subbed : L.sub, it.w / 2, h / 2 + 1);
    } else {
      ctx.fillStyle = clicked ? '#ffffff' : '#3a3f47'; rr(ctx, 0, 0, h, h, h / 2); ctx.fill(); ctx.shadowColor = 'transparent';
      const ring = clicked ? Math.sin((local - it.click) * 22) * 0.45 * Math.exp(-(local - it.click) * 2.2) : 0;
      drawBell(ctx, h / 2, h / 2, h * 0.55, clicked ? '#111' : '#fff', ring);
    }
    ctx.restore();
    if (!cursorTarget && local < it.click + 0.25) { cursorTarget = [x + it.w * (it.kind === 'like' ? 0.25 : 0.5), y0 + h * 0.55]; cursorPress = press; }
    x += it.w + gap;
  }
  // hiiren osoitin liikkuu nappien yli ja "klikkaa"
  if (C.cursor) {
    let cx, cy;
    const first = items[0];
    const path = items.map((it, i) => ({ t: it.click, p: [x0 + items.slice(0, i).reduce((s, q) => s + q.w + gap, 0) + it.w * (it.kind === 'like' ? 0.25 : 0.5), y0 + h * 0.55] }));
    const startP = [x0 + totW + 140 * k, y0 + h * 2.2], startT = 0.35;
    const pts = [{ t: startT, p: startP }, ...path.map(q => ({ t: q.t - 0.25, p: q.p })), ...path.slice(-1).map(q => ({ t: q.t + 0.6, p: q.p })), { t: path.length ? path[path.length - 1].t + 1.2 : 2, p: [startP[0], startP[1]] }];
    if (local < pts[0].t) { cx = startP[0]; cy = startP[1]; }
    else {
      let i = 0; while (i < pts.length - 1 && local > pts[i + 1].t) i++;
      const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
      const u = b.t > a.t ? easeOut((local - a.t) / (b.t - a.t)) : 1;
      cx = a.p[0] + (b.p[0] - a.p[0]) * u; cy = a.p[1] + (b.p[1] - a.p[1]) * u;
    }
    let press = false;
    for (const it of items) if (local >= it.click - 0.08 && local < it.click + 0.12) press = true;
    if (first) drawCursor(ctx, cx, cy, 40 * k, press);
  }
  ctx.restore();
}
function sparkle(x, y, p, h, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = h * 0.05; ctx.lineCap = 'round'; ctx.globalAlpha *= 1 - p;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, r1 = h * (0.45 + p * 0.3), r2 = r1 + h * 0.18;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ piirto: lopputekstit
function creditBlocks() {
  const out = [];
  for (const raw of S.credits.text.split('\n')) {
    const l = raw.trim();
    if (!l) out.push({ gap: true });
    else if (l.startsWith('#')) out.push({ head: true, text: l.replace(/^#+\s*/, '') });
    else out.push({ text: l });
  }
  return out;
}
function drawCredits(tc, overlay) {
  const C = S.credits, dur = +C.dur;
  if (tc < 0 || tc > dur) return;
  const k = Math.min(W, H * 16 / 9) / 1920;
  const bodyPx = 40 * k, headPx = 54 * k;
  const blocks = creditBlocks();
  if (overlay) {
    const a = clamp(tc / 0.8) * clamp((dur - tc) / 0.5);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8 * k;
  if (C.style === 'scroll') {
    let total = 0;
    for (const b of blocks) total += b.gap ? bodyPx * 0.9 : (b.head ? headPx * 1.35 : bodyPx * 1.4);
    const y0 = H + bodyPx - (tc / dur) * (H + total + bodyPx * 2);
    let y = y0;
    for (const b of blocks) {
      if (b.gap) { y += bodyPx * 0.9; continue; }
      const px = b.head ? headPx : bodyPx;
      const lh = b.head ? headPx * 1.35 : bodyPx * 1.4;
      if (y > -lh && y < H + lh) {
        const edge = clamp(Math.min(y, H - y) / (H * 0.12));
        ctx.globalAlpha = edge;
        ctx.font = fontStr(b.head ? titleWeight(C.font) : 500, px, C.font);
        ctx.fillStyle = b.head ? C.accent : C.color;
        ctx.fillText(b.text, W / 2, y + lh / 2);
      }
      y += lh;
    }
  } else {
    // sivu kerrallaan: tyhjä rivi erottaa sivut
    const pages = [[]];
    for (const b of blocks) { if (b.gap) { if (pages[pages.length - 1].length) pages.push([]); } else pages[pages.length - 1].push(b); }
    if (!pages[pages.length - 1].length) pages.pop();
    const per = dur / Math.max(1, pages.length);
    const pi = Math.min(pages.length - 1, Math.floor(tc / per)), lt = tc - pi * per;
    const pg = pages[pi] || [];
    ctx.globalAlpha = clamp(lt / 0.5) * clamp((per - lt) / 0.5);
    let total = 0; for (const b of pg) total += b.head ? headPx * 1.4 : bodyPx * 1.4;
    let y = H / 2 - total / 2;
    for (const b of pg) {
      const px = b.head ? headPx : bodyPx, lh = px * 1.4;
      ctx.font = fontStr(b.head ? titleWeight(C.font) : 500, px, C.font);
      ctx.fillStyle = b.head ? C.accent : C.color;
      ctx.fillText(b.text, W / 2, y + lh / 2 + (1 - easeOut(lt / 0.6)) * px * 0.4);
      y += lh;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------ koko ruutu ajanhetkellä t
function drawFrame(t) {
  const Lt = layout();
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < Lt.introEnd) {
    drawCardBg(t, S.intro.bg1, S.intro.bg2);
    const f = clamp((t - (Lt.introEnd - 0.6)) / 0.6);
    if (f > 0) drawVideoFrame(f);
  } else if (t < Lt.clipEnd || Lt.total === Lt.clipEnd) {
    drawVideoFrame(1);
  } else {
    drawVideoFrame(1);
    const f = clamp((t - Lt.clipEnd) / 0.7);
    ctx.globalAlpha = f; ctx.fillStyle = S.credits.bg; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  // introteksti: introruudulla ruudun aika, muuten klipin aika
  const tauIntro = S.intro.mode === 'card' ? t : t - Lt.introEnd;
  drawIntro(tauIntro);
  const tc = t - Lt.introEnd;
  if (tc >= 0 && tc <= Lt.cd) drawCTA(tc);
  if (S.credits.on) {
    if (S.credits.mode === 'card') drawCredits(t - Lt.clipEnd - 0.3, false);
    else drawCredits(tc - (Lt.cd - S.credits.dur), true);
  }
  ctx.restore();
}

// ------------------------------------------------------------ toisto
let T = 0, playing = false, lastNow = 0, rec = null;
function seekVideoFor(t, force) {
  if (!hasVideo) return;
  const Lt = layout();
  const want = clamp(t - Lt.introEnd, 0, Math.max(0, Lt.cd - 0.04));
  if (force || Math.abs(vid.currentTime - want) > 0.08) { try { vid.currentTime = want; } catch (e) { } }
}
function setPlaying(p) {
  playing = p;
  $('play').textContent = p ? '⏸ Tauko' : '▶ Toista';
  if (p) { ensureAudio(); lastNow = performance.now(); const Lt = layout(); if (T >= Lt.total - 0.02) { T = 0; seekVideoFor(0, true); } }
  else if (hasVideo) vid.pause();
}
function tick(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  const Lt = layout();
  if (playing) {
    const inClip = T >= Lt.introEnd && T < Lt.clipEnd;
    if (inClip && hasVideo) {
      if (vid.paused && !vid.ended) { seekVideoFor(T); vid.play().catch(() => { }); T += dt; }
      else if (vid.ended) T = Lt.clipEnd;
      else T = Lt.introEnd + vid.currentTime;
    } else {
      if (hasVideo && !vid.paused) vid.pause();
      T += dt;
      if (hasVideo && T < Lt.introEnd) seekVideoFor(Lt.introEnd);
    }
    if (T >= Lt.total) { T = Lt.total; setPlaying(false); if (rec) finishExport(); }
  }
  drawFrame(T);
  updateUI(Lt);
  requestAnimationFrame(tick);
}
function updateUI(Lt) {
  $('time').textContent = fmt(T) + ' / ' + fmt(Lt.total);
  if (!scrubbing) $('scrub').value = Lt.total ? Math.round(T / Lt.total * 1000) : 0;
  if (rec) $('expProg').value = T / Lt.total;
}
let scrubbing = false;
$('scrub').addEventListener('input', e => {
  scrubbing = true;
  const Lt = layout(); T = e.target.value / 1000 * Lt.total;
  if (playing) setPlaying(false);
  seekVideoFor(T, true);
});
$('scrub').addEventListener('change', () => { scrubbing = false; });
$('play').onclick = () => { if (!rec) setPlaying(!playing); };
$('rew').onclick = () => { if (rec) return; T = 0; seekVideoFor(0, true); };
addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  if (e.code === 'Space') { e.preventDefault(); if (!rec) setPlaying(!playing); }
});
function renderSegs() {
  const Lt = layout(), el = $('segs');
  const seg = (a, b, col, title) => `<div title="${title}" style="left:${a / Lt.total * 100}%;width:${(b - a) / Lt.total * 100}%;background:${col}"></div>`;
  let h = '';
  if (Lt.introEnd > 0) h += seg(0, Lt.introEnd, '#7b5cff', 'Introruutu');
  h += seg(Lt.introEnd, Lt.clipEnd, hasVideo ? '#2e8b57' : '#3a4352', 'Klippi');
  if (Lt.total > Lt.clipEnd) h += seg(Lt.clipEnd, Lt.total, '#c9802c', 'Lopputekstit');
  el.innerHTML = h;
}

// ------------------------------------------------------------ ääni
let AC = null, srcNode = null, gainNode = null, recDest = null;
function ensureAudio() {
  if (!hasVideo) return;
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    srcNode = AC.createMediaElementSource(vid);
    gainNode = AC.createGain();
    recDest = AC.createMediaStreamDestination();
    srcNode.connect(gainNode); gainNode.connect(AC.destination); gainNode.connect(recDest);
  }
  gainNode.gain.value = +S.out.vol;
  if (AC.state === 'suspended') AC.resume();
}

// ------------------------------------------------------------ klipin lataus
function loadFile(f) {
  if (!f || !f.type.startsWith('video')) { $('info').textContent = 'Valitse videotiedosto (esim. MP4, MOV, WebM).'; return; }
  if (videoURL) URL.revokeObjectURL(videoURL);
  videoURL = URL.createObjectURL(f);
  srcFileSize = f.size;
  vid.src = videoURL; vid.muted = false;
  hasVideo = false;
  vid.onloadedmetadata = async () => {
    hasVideo = true;
    srcBps = vid.duration ? srcFileSize * 8 / vid.duration : 0;
    applyRes(); renderSegs();
    $('info').textContent = `${f.name} – ${vid.videoWidth}×${vid.videoHeight}, ${fmt(vid.duration)}. Arvioidaan kuvataajuutta…`;
    clipFps = await estimateFps();
    vid.currentTime = 0;
    applyRes();
    $('info').textContent = `${f.name} – ${vid.videoWidth}×${vid.videoHeight}, n. ${clipFps} fps, ${fmt(vid.duration)}, n. ${(srcBps / 1e6).toFixed(1)} Mbit/s.`;
    fmtHint();
    T = 0; seekVideoFor(0, true);
  };
}
function estimateFps() {
  return new Promise(res => {
    if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return res(30);
    const times = []; let done = false;
    const wasMuted = vid.muted; vid.muted = true;
    const finish = () => {
      if (done) return; done = true; vid.pause(); vid.muted = wasMuted;
      const d = []; for (let i = 1; i < times.length; i++) { const x = times[i] - times[i - 1]; if (x > 0.001) d.push(x); }
      d.sort((a, b) => a - b);
      const med = d.length ? d[Math.floor(d.length * 0.15)] : 1 / 30;
      const raw = 1 / med, common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];
      let best = common.reduce((a, b) => Math.abs(b - raw) < Math.abs(a - raw) ? b : a);
      res(Math.round(best));
    };
    const cb = (now, md) => { times.push(md.mediaTime); if (times.length < 24) vid.requestVideoFrameCallback(cb); else finish(); };
    vid.requestVideoFrameCallback(cb);
    vid.play().catch(finish);
    setTimeout(finish, 2500);
  });
}
$('file').onchange = e => loadFile(e.target.files[0]);
const wrap = $('wrap');
wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.classList.add('drag'); });
wrap.addEventListener('dragleave', () => wrap.classList.remove('drag'));
wrap.addEventListener('drop', e => { e.preventDefault(); wrap.classList.remove('drag'); loadFile(e.dataTransfer.files[0]); });

// ------------------------------------------------------------ asetuspaneeli
function bindUI() {
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k, v = getK(k);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      let nv = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number' || el.type === 'range') nv = parseFloat(nv) || 0;
      setK(k, nv);
      if (k === 'out.res') applyRes();
      if (k === 'out.vol' && gainNode) gainNode.gain.value = +nv;
      if (k.startsWith('out.')) fmtHint();
      renderSegs(); save();
    });
    if (el.type === 'color') el.addEventListener('input', () => { setK(k, el.value); save(); });
  });
  document.querySelectorAll('summary input').forEach(i => i.addEventListener('click', e => e.stopPropagation()));
}
$('saveProj').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  a.download = 'intro-projekti.json'; a.click();
};
$('loadProj').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { S = merge(structuredClone(DEFAULTS), JSON.parse(await f.text())); save(); bindUIValues(); applyRes(); renderSegs(); fmtHint(); }
  catch (er) { alert('Projektitiedostoa ei voitu lukea.'); }
};
function bindUIValues() {
  document.querySelectorAll('[data-k]').forEach(el => { const v = getK(el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
}

// ------------------------------------------------------------ tallennus (vienti)
function pickMime() {
  const cands = [
    'video/mp4;codecs=avc1.640033,mp4a.40.2', 'video/mp4;codecs=avc1.640032,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a',
    'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'
  ];
  if (!window.MediaRecorder) return null;
  return cands.find(m => MediaRecorder.isTypeSupported(m)) || '';
}
function outFps() { return S.out.fps === 'auto' ? (hasVideo ? clipFps : 30) : +S.out.fps; }
function bitrate() {
  // bittiä / pikseli / kuva: "paras" on selvästi YouTuben suositusta korkeampi, jotta uudelleenpakkaus ei heikennä kuvaa
  const bpp = { max: 0.3, high: 0.16, std: 0.08 }[S.out.quality] || 0.3;
  let b = W * H * outFps() * bpp;
  // "paras": vähintään 1,5 × alkuperäisen tiedoston bittinopeus, ettei uudelleenpakkaus heikennä kuvaa
  if (S.out.quality === 'max' && srcBps) b = Math.max(b, srcBps * 1.5);
  return Math.round(Math.min(200e6, b));
}
function fmtHint() {
  const m = pickMime();
  const kind = m == null ? 'ei tuettu tässä selaimessa' : m.includes('avc1') ? 'MP4 (H.264)' : m.startsWith('video/mp4') ? 'MP4' : 'WebM (VP9/VP8)';
  let px = '';
  if (hasVideo) px = (vid.videoWidth === W && vid.videoHeight === H) ? ' Klipin kuva siirretään pikseli pikseliltä (ei skaalausta).'
    : (vid.videoHeight > H || vid.videoWidth > W) ? ` Klippi (${vid.videoWidth}×${vid.videoHeight}) pienennetään.` : ` Klippi (${vid.videoWidth}×${vid.videoHeight}) suurennetaan – valitse ”Klipin oma” jos et halua sitä.`;
  $('fmtHint').textContent = `Tallennus: ${W}×${H}, ${outFps()} fps, n. ${(bitrate() / 1e6).toFixed(0)} Mbit/s, ${kind}.${px}`;
}
let chunks = [], recMime = '';
$('export').onclick = async () => {
  const mime = pickMime();
  if (mime == null) { alert('Selaimesi ei tue videon tallennusta. Käytä Chromea, Edgeä tai Firefoxia.'); return; }
  applyRes();
  try { await document.fonts.ready; } catch (e) { }
  setPlaying(false);
  T = 0; seekVideoFor(0, true);
  ensureAudio();
  const fps = outFps();
  const stream = cv.captureStream(fps);
  if (recDest) recDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  chunks = []; recMime = mime;
  try {
    rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bitrate(), audioBitsPerSecond: 256000 } : { videoBitsPerSecond: bitrate() });
  } catch (e) { rec = new MediaRecorder(stream); }
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const type = (recMime || rec.mimeType || 'video/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const url = URL.createObjectURL(blob);
    $('expDone').innerHTML = `<a class="dl" href="${url}" download="video-intro.${ext}">Lataa video (${(blob.size / 1e6).toFixed(1)} Mt, ${ext.toUpperCase()})</a>`;
    $('expMsg').textContent = 'Valmis!';
    $('expCancel').textContent = 'Sulje';
    rec = null;
  };
  $('exportBox').style.display = 'flex'; $('expDone').innerHTML = ''; $('expCancel').textContent = 'Peruuta';
  $('expMsg').textContent = `Nauhoitetaan ${W}×${H} ${fps} fps reaaliajassa – tallennus kestää videon pituuden (${fmt(layout().total)}). Pidä tämä välilehti näkyvissä.`;
  // pieni viive, jotta ensimmäinen kuva ehtii piirtyä
  await new Promise(r => setTimeout(r, 300));
  rec.start(1000);
  setPlaying(true);
};
function finishExport() { if (rec && rec.state !== 'inactive') setTimeout(() => rec && rec.state !== 'inactive' && rec.stop(), 250); }
$('expCancel').onclick = () => {
  if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); rec = null; setPlaying(false); }
  $('exportBox').style.display = 'none';
};

// ------------------------------------------------------------ käynnistys
bindUI();
applyRes();
renderSegs();
fmtHint();
if (document.fonts) document.fonts.load('900 40px Montserrat').catch(() => { });
requestAnimationFrame(t => { lastNow = t; requestAnimationFrame(tick); });
