"""Cuts the tree palette photo into tree sprites (GrabCut per tree) and packs them into an atlas.
Usage: python3 cut_trees.py <palette image> <out_dir>"""
import sys, os, json
import numpy as np, cv2
from PIL import Image
# (x0, y0, x1, y1, base_x, base_y, kind)
TREES = [
 (195,15,320,215,262,210,'spruce'),(375,15,505,210,440,205,'bluespruce'),(580,15,690,215,630,210,'spruce'),(745,0,900,215,818,210,'larch'),
 (935,15,1100,215,1010,210,'spruce'),(1130,20,1265,215,1195,212,'birch'),(1340,15,1440,210,1385,205,'spruce'),
 (180,215,315,370,245,368,'birchgold'),(360,205,510,375,440,372,'birch'),(560,215,710,360,630,360,'willow'),(750,205,905,375,830,370,'broad'),
 (950,205,1100,380,1022,378,'rowan'),(1135,215,1290,380,1210,378,'broad'),(1345,210,1470,365,1405,362,'larchgold'),
 (150,355,305,545,232,542,'broad'),(360,360,500,550,432,548,'spruce'),(550,350,705,545,630,542,'spruce'),(765,360,905,550,835,545,'spruce'),
 (965,355,1110,555,1040,552,'spruce'),(1160,355,1290,555,1220,552,'spruce'),(1345,350,1490,555,1420,552,'pine'),
 (115,540,290,750,215,745,'spruce'),(350,540,500,755,422,752,'pine'),(550,540,720,750,638,748,'pine'),(760,540,925,755,845,752,'birchgold'),
 (975,570,1140,750,1050,748,'willow'),(1190,545,1310,765,1255,762,'bluespruce'),(1375,550,1525,770,1445,768,'spruce'),
 (20,700,105,752,62,748,'shrub'),(30,40,105,92,68,88,'shrub'),(480,760,540,805,510,802,'shrub'),(1480,825,1548,882,1514,878,'shrub')]
CW, CH = 192, 240

def cut(img, t):
    x0, y0, x1, y1, bx, by, kind = t
    pad = 14
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(img.shape[1], x1 + pad), min(img.shape[0], y1 + pad)
    crop = img[Y0:Y1, X0:X1].copy()
    mask = np.full(crop.shape[:2], cv2.GC_BGD, np.uint8)
    mask[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = cv2.GC_PR_BGD
    # probable foreground: an ellipse around the crown axis
    cx, cy = bx - X0, (y0 + by) // 2 - Y0
    cv2.ellipse(mask, (cx, cy), (int((x1 - x0) * .46), int((by - y0) * .5)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    cv2.ellipse(mask, (cx, cy), (max(3, int((x1 - x0) * .14)), int((by - y0) * .3)), 0, 0, 360, cv2.GC_FGD, -1)
    bgd = np.zeros((1, 65), np.float64); fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(crop, mask, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    fg[by - Y0 + 3:, :] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg, 8)
    if n > 1:
        big = st[1:, cv2.CC_STAT_AREA].max(); fg = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > big * .06]).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    a = cv2.GaussianBlur(fg.astype(np.float32), (3, 3), 0)
    rgba = np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), (a * 255).astype(np.uint8)])
    return rgba, bx - X0, by - Y0

def main(src, out):
    img = cv2.imread(src)
    cols = 8; rows = (len(TREES) + cols - 1) // cols
    atlas = np.zeros((rows * CH, cols * CW, 4), np.uint8); meta = []
    for i, t in enumerate(TREES):
        rgba, bx, by = cut(img, t)
        ys, xs = np.nonzero(rgba[:, :, 3] > 40)
        top = ys.min(); h, w = rgba.shape[:2]
        sc = min(1.0, (CH - 8) / (by - top + 6), (CW - 4) / w)
        if sc < 1:
            rgba = cv2.resize(rgba, (int(w * sc), int(h * sc)), interpolation=cv2.INTER_AREA); bx *= sc; by *= sc; top *= sc; h, w = rgba.shape[:2]
        r, k = divmod(i, cols)
        ox = int(CW / 2 - bx); oy = int(CH - 6 - by)
        dx0, dy0 = max(0, ox), max(0, oy); sx0, sy0 = dx0 - ox, dy0 - oy
        ww = min(w - sx0, CW - dx0); hh = min(h - sy0, CH - dy0)
        tile = atlas[r * CH:(r + 1) * CH, k * CW:(k + 1) * CW]
        tile[dy0:dy0 + hh, dx0:dx0 + ww] = rgba[sy0:sy0 + hh, sx0:sx0 + ww]
        meta.append({'kind': t[6], 'r': r, 'k': k, 'px': float(by - top), 'w': float(w)})
    Image.fromarray(atlas).save(os.path.join(out, 'trees.webp'), 'WEBP', quality=90, method=6)
    json.dump({'cell': [CW, CH, CH - 6], 'cols': cols, 'rows': rows, 'trees': meta}, open(os.path.join(out, 'trees.json'), 'w'))
    print('ok', len(meta))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
