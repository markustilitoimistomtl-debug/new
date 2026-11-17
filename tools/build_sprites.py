"""Builds the sprite atlases used by the game from the source sheets.

Usage: python3 build_sprites.py <male_a> <male_b> <female_a> <female_b> <plane> <out_dir>
Characters: each sheet is an 8 x 9 grid of side-view frames (facing right). Frames are separated by
connected components, anchored on a common baseline per row and packed into a 9 x 16 atlas per
character with recoloured clothes. The aircraft sheet is a 4 x 4 grid of views.
"""
import sys, os, json, colorsys
from collections import deque
import numpy as np
from PIL import Image

FW, FH = 150, 104          # frame cell in the atlas
BASE = FH - 6              # baseline (feet) inside the frame

def components(alpha, thr=12):
    h, w = alpha.shape
    lab = np.zeros((h, w), np.int32)
    on = alpha > thr
    comps = []
    nid = 0
    for y in range(h):
        row = on[y]
        for x in np.nonzero(row & (lab[y] == 0))[0]:
            if lab[y, x]:
                continue
            nid += 1
            q = deque([(y, x)]); lab[y, x] = nid
            ys = []; xs = []
            while q:
                cy, cx = q.popleft(); ys.append(cy); xs.append(cx)
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1), (cy + 1, cx + 1), (cy - 1, cx - 1), (cy + 1, cx - 1), (cy - 1, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and on[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = nid; q.append((ny, nx))
            ys = np.array(ys); xs = np.array(xs)
            comps.append({'id': nid, 'n': len(ys), 'y0': ys.min(), 'y1': ys.max() + 1, 'x0': xs.min(), 'x1': xs.max() + 1, 'cy': ys.mean(), 'cx': xs.mean()})
    return lab, comps

def row_bounds(alpha, guesses, win=22):
    prof = (alpha > 8).sum(1).astype(float)
    prof = np.convolve(prof, np.ones(5) / 5, 'same')
    out = [0]
    for g in guesses:
        lo, hi = max(1, g - win), min(len(prof) - 1, g + win)
        out.append(lo + int(np.argmin(prof[lo:hi])))
    out.append(alpha.shape[0])
    return out

def cut_sheet(path, guesses, cols=9):
    im = np.array(Image.open(path).convert('RGBA'))
    rb = row_bounds(im[:, :, 3], guesses)
    # label each row band separately so figures touching the next row stay apart
    lab = np.zeros(im.shape[:2], np.int32); comps = []
    for r in range(8):
        y0, y1 = rb[r], rb[r + 1]
        l2, c2 = components(im[y0:y1, :, 3])
        off = len(comps)
        lab[y0:y1][l2 > 0] = l2[l2 > 0] + off
        for c in c2:
            c['id'] += off; c['y0'] += y0; c['y1'] += y0; c['cy'] += y0
            comps.append(c)
    W = im.shape[1]
    big = [c for c in comps if c['n'] >= 40]
    cells = {}
    for c in big:
        r = max(0, min(7, int(np.searchsorted(rb, c['cy'], side='right') - 1)))
        k = min(cols - 1, int(c['cx'] / (W / cols)))
        cells.setdefault((r, k), []).append(c)
    # attach small pieces (thrown ball, gaps in props) to the nearest big component
    for c in comps:
        if c['n'] >= 40 or c['n'] < 4:
            continue
        best = None; bd = 1e9
        for key, lst in cells.items():
            for b in lst:
                d = max(b['x0'] - c['cx'], c['cx'] - b['x1'], 0) + max(b['y0'] - c['cy'], c['cy'] - b['y1'], 0)
                if d < bd:
                    bd = d; best = key
        if best is not None and bd < 40:
            cells[best].append(c)
    frames = {}
    for (r, k), lst in cells.items():
        ids = [c['id'] for c in lst]
        y0 = min(c['y0'] for c in lst); y1 = max(c['y1'] for c in lst)
        x0 = min(c['x0'] for c in lst); x1 = max(c['x1'] for c in lst)
        sub = im[y0:y1, x0:x1].copy()
        mask = np.isin(lab[y0:y1, x0:x1], ids)
        sub[~mask] = 0
        frames[(r, k)] = {'img': sub, 'x0': x0, 'y0': y0, 'y1': y1}
    return frames

def recolor(img, shirt, pants, hair=None):
    out = img.copy().astype(float)
    rgb = out[:, :, :3] / 255.0
    a = out[:, :, 3]
    hls = np.array([colorsys.rgb_to_hls(*p) for p in rgb.reshape(-1, 3)]).reshape(rgb.shape)
    H, L, S = hls[:, :, 0] * 360, hls[:, :, 1], hls[:, :, 2]
    vis = a > 10
    def paint(mask, col, ref):
        tgt = np.array(col) / 255.0
        k = (L / ref)[..., None]
        rgb[mask] = np.clip(tgt * k[mask] ** 1.1, 0, 1)
    sm = vis & (H > 160) & (H < 220) & (S > 0.07) & (L > 0.1)
    paint(sm, shirt, 0.38)
    if pants:
        ys = np.arange(img.shape[0])[:, None] * np.ones((1, img.shape[1]))
        pm = vis & (S < 0.07) & (L > 0.19) & (L < 0.45) & (ys > img.shape[0] * 0.35)
        paint(pm, pants, 0.3)
    if hair:
        ys = np.arange(img.shape[0])[:, None] * np.ones((1, img.shape[1]))
        hm = vis & (H > 8) & (H < 42) & (S > 0.16) & (L > 0.08) & (L < 0.24) & (ys < img.shape[0] * 0.3) & (img.shape[0] > img.shape[1] * 0.8)
        paint(hm, hair, 0.22)
    out[:, :, :3] = rgb * 255
    return out.astype(np.uint8)

def build_character(sheet_a, sheet_b, outfit, out_png):
    rows = {}
    for si, (fr, guesses) in enumerate(((cut_sheet(sheet_a, [121, 216, 314, 411, 516, 565, 668]), None), (cut_sheet(sheet_b, [150, 218, 320, 417, 514, 612, 700]), None))):
        for (r, k), f in fr.items():
            rows.setdefault(si * 8 + r, {})[k] = f
    atlas = np.zeros((16 * FH, 9 * FW, 4), np.uint8)
    meta = {}
    for R, cells in rows.items():
        base = max(f['y1'] for f in cells.values())
        for k, f in cells.items():
            img = recolor(f['img'], *outfit)
            a = img[:, :, 3].astype(float)
            ys, xs = np.nonzero(a > 10)
            top = ys < (ys.min() + (ys.max() - ys.min()) * 0.3)
            ax = xs[top].mean() if R not in (5, 9) else xs.mean()   # head x for upright poses
            h, w = img.shape[:2]
            ox = int(round(FW / 2 - ax)); oy = BASE - (base - f['y0'])
            dx0, dy0 = max(0, ox), max(0, oy)
            sx0, sy0 = dx0 - ox, dy0 - oy
            ww = min(w - sx0, FW - dx0); hh = min(h - sy0, FH - dy0)
            if ww <= 0 or hh <= 0:
                continue
            tile = atlas[R * FH:(R + 1) * FH, k * FW:(k + 1) * FW]
            tile[dy0:dy0 + hh, dx0:dx0 + ww] = img[sy0:sy0 + hh, sx0:sx0 + ww]
            meta.setdefault(R, []).append(k)
    # premultiply-friendly: bleed colour into transparent texels
    im = Image.fromarray(atlas)
    im.save(out_png, 'WEBP', quality=88, method=6)
    return {str(k): sorted(v) for k, v in meta.items()}

def build_plane(path, out_png):
    im = np.array(Image.open(path).convert('RGBA'))
    lab, comps = components(im[:, :, 3])
    H, W = im.shape[:2]
    cells = {}
    for c in comps:
        if c['n'] < 30:
            continue
        r = min(3, int(c['cy'] / (H / 4))); k = min(3, int(c['cx'] / (W / 4)))
        cells.setdefault((r, k), []).append(c)
    S = 320
    atlas = np.zeros((4 * S, 4 * S, 4), np.uint8)
    info = {}
    for (r, k), lst in cells.items():
        y0 = min(c['y0'] for c in lst); y1 = max(c['y1'] for c in lst); x0 = min(c['x0'] for c in lst); x1 = max(c['x1'] for c in lst)
        sub = im[y0:y1, x0:x1].copy(); sub[~np.isin(lab[y0:y1, x0:x1], [c['id'] for c in lst])] = 0
        sc = min(1.0, (S - 8) / max(sub.shape[:2]))
        img = Image.fromarray(sub).resize((max(1, int(sub.shape[1] * sc)), max(1, int(sub.shape[0] * sc))), Image.LANCZOS)
        a = np.array(img)
        oy = (S - a.shape[0]) // 2; ox = (S - a.shape[1]) // 2
        atlas[r * S + oy:r * S + oy + a.shape[0], k * S + ox:k * S + ox + a.shape[1]] = a
        info[f'{r},{k}'] = {'w': a.shape[1], 'h': a.shape[0], 'scale': sc}
    Image.fromarray(atlas).save(out_png, 'WEBP', quality=90, method=6)
    return info

if __name__ == '__main__':
    ma, mb, fa, fb, plane, out = sys.argv[1:7]
    os.makedirs(out, exist_ok=True)
    outfits = {
        'leilani': (fa, fb, ((214, 98, 64), (70, 72, 80), None)),
        'mateo': (ma, mb, ((54, 86, 150), (52, 62, 92), None)),
        'nia': (fa, fb, ((86, 136, 70), (122, 104, 78), (196, 160, 92))),
    }
    meta = {}
    for name, (a, b, outfit) in outfits.items():
        meta[name] = build_character(a, b, outfit, os.path.join(out, f'{name}.webp'))
    meta['plane'] = build_plane(plane, os.path.join(out, 'plane.webp'))
    json.dump({'frame': [FW, FH, BASE], 'chars': meta}, open(os.path.join(out, 'sprites.json'), 'w'))
    print('ok')
