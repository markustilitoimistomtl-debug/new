"""Finds each logo in a sheet image, removes the background and saves RGBA crops.
Usage: python3 tools/extract_logos.py vbl|concepts <image> <outdir>"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi

mode, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
im = np.asarray(Image.open(src).convert('RGB')).astype(int)
H, W, _ = im.shape

def flood_bg(crop, tol, holes=0):
    """Background = pixels connected to the crop border whose color is close to the border color.
    With holes > 0, enclosed background-colored areas larger than that many pixels count as background too."""
    border = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]])
    ref = np.median(border, axis=0)
    close = np.abs(crop - ref).sum(axis=2) < tol
    lab, n = ndi.label(close)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    if holes:
        sizes = ndi.sum(close, lab, range(1, n + 1))
        edge |= {i + 1 for i, s in enumerate(sizes) if s > holes}
    return np.isin(lab, list(edge))

def save(name, crop, bg, xr=None):
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=2))
    if n == 0: return
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    ok = [i + 1 for i, s in enumerate(sizes) if s > max(60, sizes.max() * 0.04)]
    if xr:  # keep only parts whose center lies in this logo's slot
        cx = ndi.center_of_mass(fg, lab, ok)
        ok = [i for i, c in zip(ok, cx) if xr[0] <= c[1] < xr[1]]
    keep = np.isin(lab, ok) & fg
    ys, xs = np.where(keep)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([crop, keep * 255]).astype(np.uint8)[y0:y1, x0:x1]
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, name + '.png'))

if mode == 'vbl2':
    # current league sheet on a white background: every icon is its own blob below the title
    names = ['providence-jewelers', 'buffalo-windmills', 'montreal-beavers', 'richmond-foxes', 'raleigh-red-wolves',
             'pittsburgh-passers', 'cincinnati-cleaners', 'columbus-inventors', 'louisville-claws', 'nashville-pickers', 'birmingham-ironmen', 'jacksonville-manatees',
             'st-louis-arches', 'kansas-city-stockmen', 'omaha-express', 'tulsa-oilmen', 'el-paso-scorpions',
             'melbourne-moose', 'honolulu-nene', 'san-diego-sea-lions', 'albuquerque-balloons']
    nonwhite = np.abs(im - 255).sum(axis=2) > 60
    lab, n = ndi.label(ndi.binary_dilation(nonwhite, iterations=6))
    blobs = []
    for sl in ndi.find_objects(lab):
        y0, x0, y1, x1 = sl[0].start, sl[1].start, sl[0].stop, sl[1].stop
        if y1 - y0 > 40 and x1 - x0 > 40 and (y0 + y1) / 2 > 150:
            blobs.append((round((y0 + y1) / 2 / 150), (x0 + x1) / 2, y0, x0, y1, x1))
    blobs.sort()
    assert len(blobs) == len(names), len(blobs)
    for nm, (_, _, y0, x0, y1, x1) in zip(names, blobs):
        crop = im[max(0, y0 - 4):y1 + 4, max(0, x0 - 4):x1 + 4]
        save(nm, crop, flood_bg(crop, 60))
elif mode == 'vbl':
    # icon grid of the league wallpaper: 7 columns, 4 rows (label text below each icon is left out)
    names = [['baltimore-shipwrights', 'providence-jewelers', 'hartford-underwriters', 'buffalo-windmills', 'montreal-beavers', 'richmond-foxes', 'raleigh-red-wolves'],
             ['pittsburgh-passers', 'cincinnati-cleaners', 'columbus-inventors', 'louisville-claws', 'nashville-pickers', 'birmingham-ironmen', 'jacksonville-manatees'],
             ['st-louis-arches', 'kansas-city-stockmen', 'omaha-express', 'tulsa-oilmen', 'austin-ramparts', 'el-paso-scorpions', 'mexico-city-cardones'],
             ['seattle-ferries', 'vancouver-cedars', 'melbourne-moose', 'honolulu-nene', 'san-diego-sea-lions', 'albuquerque-balloons', None]]
    xs = [250, 425, 600, 775, 950, 1125, 1300]
    rows = [(112, 228), (285, 400), (455, 572), (622, 742)]
    for r, (ya, yb) in enumerate(rows):
        for c, x in enumerate(xs):
            nm = names[r][c]
            if not nm: continue
            cx = x if not (r == 3 and c == 5) else 1150
            xa, xb = max(0, cx - 85), min(W, cx + 85)
            crop = im[ya:yb, xa:xb]
            save(nm, crop, flood_bg(crop, 12, holes=150))
else:
    # concept sheet: each team panel has two rows of five logos, each slot starting at its number label
    panels = [('baltimore-bigfeet', [22, 94, 168, 233, 297, 362], (91, 241, 372)),
              ('hartford-connectors', [376, 447, 519, 587, 658, 722], (91, 241, 372)),
              ('louisville-claws', [735, 806, 879, 943, 1005, 1057], (91, 241, 372)),
              ('kansas-city-tumblers', [1071, 1130, 1188, 1248, 1306, 1370], (91, 241, 372)),
              ('mexico-city-cardones', [20, 116, 201, 287, 380, 460], (473, 619, 778)),
              ('seattle-greens', [472, 557, 640, 725, 800, 880], (473, 619, 778)),
              ('melbourne-diggers', [895, 985, 1085, 1180, 1270, 1372], (473, 619, 778))]
    img = im.copy()
    for t, edges, (r1, r2, bottom) in panels:
        for row, (ly, yb) in enumerate(((r1, r2 - 6), (r2, bottom))):
            for k in range(5):
                pad = 26
                xa, xb = max(0, edges[k] - pad), min(W, edges[k + 1] + pad)
                crop = img[ly - 8:yb, xa:xb].copy()
                for e in edges:                # blank the number labels in this window
                    if xa <= e < xb: crop[:18, max(0, e - xa):e - xa + 14] = 255
                save(f'{t}__{row * 5 + k + 1:02d}', crop, flood_bg(crop, 70), (edges[k] - xa, edges[k + 1] - xa))
