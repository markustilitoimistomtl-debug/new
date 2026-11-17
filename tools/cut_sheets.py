"""Cuts the character sprite sheets into frames: row bands by alpha projection, then 9 column slots per band."""
import sys, json
import numpy as np
from PIL import Image

def bands(a, axis, min_gap, thr=8):
    prof = (a > thr).sum(axis=axis)
    on = prof > 0
    out = []; start = None; gap = 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            gap = 0; end = i
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                out.append((start, end + 1)); start = None
    if start is not None: out.append((start, end + 1))
    return out

def cut(path, cols=9):
    im = Image.open(path).convert('RGBA'); a = np.array(im)[:, :, 3]
    rows = bands(a, 1, 6)
    res = []
    W = im.width
    for (y0, y1) in rows:
        seg = bands(a[y0:y1], 0, 5)
        # merge tiny fragments into the nearest segment
        segs = []
        for s in seg:
            if segs and s[0] - segs[-1][1] < 12 and (s[1] - s[0] < 25 or segs[-1][1] - segs[-1][0] < 25):
                segs[-1] = (segs[-1][0], s[1])
            else:
                segs.append(s)
        cells = [None] * cols
        for (x0, x1) in segs:
            c = min(cols - 1, int(((x0 + x1) / 2) / (W / cols)))
            if cells[c] is None: cells[c] = [x0, x1]
            else: cells[c] = [min(cells[c][0], x0), max(cells[c][1], x1)]
        res.append({'y': [y0, y1], 'cells': cells})
    return res

if __name__ == '__main__':
    print(json.dumps({p: cut(p) for p in sys.argv[1:]}))
