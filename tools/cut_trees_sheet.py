"""Cuts trees from a palette drawn on a grey/white checkerboard (fake transparency) into the tree atlas.
Usage: python3 cut_trees_sheet.py <palette image> <out_dir>"""
import sys, os, json
import numpy as np, cv2
from PIL import Image
KINDS = [['spruce', 'birch', 'pine', 'bluespruce', 'birchgold', 'larch', 'spruce'],
         ['broad', 'spruce', 'birch', 'spruce', 'broad', 'pine', 'rowan'],
         ['pine', 'spruce', 'birchgold', 'bluespruce', 'birchgold', 'bluespruce', 'spruce'],
         ['rowan', 'spruce', 'broad', 'pine', 'birchgold', 'bluespruce', 'broad']]
CW, CH = 192, 240

def grade(sub, kind):
    # bring every crown to the muted tones of the painted heath: limit brightness and saturation,
    # pull yellow-green leaves towards green (autumn trees keep their hue, only darker)
    rgb = sub[:, :, :3].astype(np.float32) / 255.0; a = sub[:, :, 3] > 40
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    leaf = a & (S > 0.15)
    autumn = kind in ('rowan', 'birchgold', 'larchgold')
    if not autumn:
        H[leaf] = np.where((H[leaf] > 40) & (H[leaf] < 110), H[leaf] + (110 - H[leaf]) * 0.35, H[leaf])
    mv = V[leaf].mean() if leaf.any() else 0.5
    target = 0.40 if not autumn else 0.46
    if mv > target: V[a] *= target / mv
    ms = S[leaf].mean() if leaf.any() else 0.5
    if ms > 0.55: S[leaf] *= 0.55 / ms
    out = cv2.cvtColor(np.dstack([H, S, V]), cv2.COLOR_HSV2RGB)
    sub = sub.copy(); sub[:, :, :3] = np.clip(out * 255, 0, 255).astype(np.uint8)
    return sub

def main(src, out):
    rgb = np.array(Image.open(src).convert('RGB'))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    S, V = hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    bg = ((S < 26) & (V > 190)).astype(np.uint8)
    # background = checker pixels connected to the border
    n, lab = cv2.connectedComponents(bg, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = (~np.isin(lab, list(border))).astype(np.uint8)
    fg[(S < 16) & (V > 200)] = 0   # checker seen through gaps in the crowns
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # soft edge: fade pixels whose colour is close to the checker
    soft = np.clip((S - 10) / 30.0, 0, 1) + np.clip((190 - V) / 50.0, 0, 1)
    edge = cv2.dilate(fg, np.ones((3, 3), np.uint8)) - cv2.erode(fg, np.ones((3, 3), np.uint8))
    alpha = fg.astype(float)
    alpha[edge > 0] = np.clip(soft[edge > 0], 0, 1) * fg[edge > 0]
    H, W = fg.shape
    # rows split at the trunk bases (horizontal gaps are tiny), columns at equal widths
    prof = fg.sum(1).astype(float); rb = [0]
    for g in (H * .27, H * .49, H * .715):
        lo, hi = int(g - H * .05), int(g + H * .05); rb.append(lo + int(np.argmin(prof[lo:hi])))
    rb.append(H)
    # decontaminate the rim: light, greyish edge pixels take the darkened colour of the crown next to them
    inner = cv2.erode(fg, np.ones((3, 3), np.uint8), iterations=3)
    fgc = rgb.astype(np.float32) * inner[..., None]
    wsum = cv2.blur(inner.astype(np.float32), (15, 15)) + 1e-4
    local = cv2.blur(fgc, (15, 15)) / wsum[..., None]
    rim = (fg > 0) & (inner == 0)
    L = rgb.astype(np.float32).mean(2) / 255.0; sat = S / 255.0
    whiteish = np.clip((L - 0.42) / 0.25, 0, 1) * np.clip((0.45 - sat) / 0.3, 0, 1)
    w = np.where(rim, np.maximum(whiteish, 0.35), np.where(fg > 0, whiteish, 0))[..., None]
    dark = local * 0.62
    rgb = (rgb * (1 - w) + dark * w).clip(0, 255).astype(np.uint8)
    fg = cv2.erode(fg, np.ones((2, 2), np.uint8))
    alpha = np.minimum(alpha, fg)
    trees = {}
    for r in range(4):
        for k in range(7):
            m = np.zeros_like(fg); xa, xb = int(k * W / 7), int((k + 1) * W / 7)
            m[rb[r]:rb[r + 1], xa:xb] = fg[rb[r]:rb[r + 1], xa:xb]
            n2, l2, st2, _ = cv2.connectedComponentsWithStats(m, 8)
            if n2 < 2: continue
            big = 1 + int(np.argmax(st2[1:, cv2.CC_STAT_AREA]))
            if st2[big, cv2.CC_STAT_AREA] > 3000: trees[(r, k)] = (l2 == big)
    cols = 8; items = sorted(trees.items()); rows = (len(items) + cols - 1) // cols
    atlas = np.zeros((rows * CH, cols * CW, 4), np.uint8); meta = []
    for n_, ((r, k), ids) in enumerate(items):
        m = ids
        ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub = np.dstack([rgb[y0:y1, x0:x1], (alpha[y0:y1, x0:x1] * m[y0:y1, x0:x1] * 255).astype(np.uint8)])
        sub = grade(sub, KINDS[r][k])
        h, w = sub.shape[:2]
        # trunk base: lowest opaque pixel near the centre column
        cx = int(np.median(xs[ys > y1 - 8]) - x0) if (ys > y1 - 8).any() else w // 2
        sc = min((CH - 10) / h, (CW - 6) / w)
        sub = cv2.resize(sub, (max(1, int(w * sc)), max(1, int(h * sc))), interpolation=cv2.INTER_AREA); h, w = sub.shape[:2]; cx = int(cx * sc)
        R, K = divmod(n_, cols)
        ox = max(0, min(CW - w, CW // 2 - cx)); oy = CH - 6 - h
        atlas[R * CH + oy:R * CH + oy + h, K * CW + ox:K * CW + ox + w] = sub
        meta.append({'kind': KINDS[r][k], 'r': R, 'k': K, 'px': float(h), 'w': float(w)})
    Image.fromarray(atlas).save(os.path.join(out, 'trees.webp'), 'WEBP', quality=90, method=6)
    json.dump({'cell': [CW, CH, CH - 6], 'cols': cols, 'rows': rows, 'trees': meta}, open(os.path.join(out, 'trees.json'), 'w'))
    print('ok', len(meta))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
