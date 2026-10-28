"""Traces RGBA logo crops into LSP library art (smooth vector color layers).
Usage: python3 tools/trace_logos.py <cropdir> <colors> <out.json> [prefix]
Each logo becomes {n, e:1, d: silhouette, parts: [[color, d], ...]} on a -100..100 box.
Needs: pip install potracer numpy scipy pillow"""
import sys, os, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.cluster.vq import kmeans2
import potrace

src, K, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
UP = 4  # upscale before tracing so curves come out smooth


def trace(mask, sx, ox, oy):
    bm = potrace.Bitmap(~mask)  # potracer fills the False pixels
    path = bm.trace(turdsize=10 * UP, alphamax=1.2, opticurve=True, opttolerance=1.6)
    f = lambda p: f'{(p.x * sx + ox):.1f},{(p.y * sx + oy):.1f}'
    d = []
    for c in path:
        d.append('M' + f(c.start_point))
        for seg in c.segments:
            d.append(('L' + f(seg.c) + ' L' + f(seg.end_point)) if seg.is_corner else
                     ('C' + f(seg.c1) + ' ' + f(seg.c2) + ' ' + f(seg.end_point)))
        d.append('Z')
    s = ' '.join(d)
    return s.replace('.0 ', ' ').replace('.0,', ',')


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in c)


lib = {}
for fn in sorted(glob.glob(os.path.join(src, '*.png'))):
    key = os.path.basename(fn)[:-4]
    im = Image.open(fn).convert('RGBA')
    w, h = im.size
    big = im.resize((w * UP, h * UP), Image.LANCZOS)
    a = np.asarray(big).astype(float)
    alpha = a[..., 3] > 127
    alpha = ndi.binary_opening(alpha, iterations=2)
    rgb = ndi.gaussian_filter(a[..., :3], sigma=(UP * 0.35, UP * 0.35, 0))
    px = rgb[alpha]
    np.random.seed(1)
    cent, lab = kmeans2(px, K, minit='++', seed=1)
    labels = np.full(alpha.shape, -1)
    labels[alpha] = lab
    # mode-filter the label map to remove speckle
    stack = np.stack([ndi.uniform_filter((labels == k).astype(float), size=UP + 1) for k in range(K)])
    labels = np.where(alpha, stack.argmax(0), -1)
    areas = [(labels == k).sum() for k in range(K)]
    order = [k for k in np.argsort(areas)[::-1] if areas[k] > (UP * UP * 6)]
    sx = 200.0 / (max(w, h) * UP)
    ox, oy = -w * UP * sx / 2, -h * UP * sx / 2
    sil = ndi.gaussian_filter(alpha.astype(float), UP * 0.5) > 0.5
    parts = []
    for i, k in enumerate(order):
        # stack layers: each layer also covers the regions of the smaller layers above it, so no gaps show
        m = np.isin(labels, order[i:])
        m = ndi.gaussian_filter(m.astype(float), UP * 0.45) > 0.5
        if i == 0: m = sil
        d = trace(m, sx, ox, oy)
        if d: parts.append([hexc(cent[k]), d])
    lib[key] = {'d': trace(sil, sx, ox, oy), 'parts': parts, 'e': 1}
    print(key, len(parts), sum(len(p[1]) for p in parts) // 1024, 'KB')

json.dump(lib, open(out, 'w'), separators=(',', ':'))
print('total', os.path.getsize(out) // 1024, 'KB')
