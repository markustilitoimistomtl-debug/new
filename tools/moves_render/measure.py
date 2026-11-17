"""MEASURE - pelaajan mittasuhteet body-kerroksen kuvasta (vaihe 2A).

Kaytto:
  blender -b -P moves_render.py -- --out mitat --rest --hair none --elev 0
  python measure.py mitat/body/rest_S/rest_S_000.png

Kuva: edesta (suunta S), kamera vaakasuoraan (--elev 0), lepoasento kadet suorina alas (--rest), ilman hiuksia.
Osat tunnistetaan avainvareista (savy eli hue asteina): iho 36-72, paita+shortsit 266-345.
Tulostaa taulukon: mitta, mitattu arvo, tavoite, OK/ei.  Paluuarvo 0 = kaikki OK, 1 = jokin rivi ei OK.
"""
import sys

import numpy as np
from PIL import Image

# kehon korkeudet suhteessa mallin pituuteen (moves_render.py:n luut): mittariveja varten
Z_UPPERARM, Z_FOREARM, Z_THIGH, Z_SHIN, Z_KNEE, Z_TOP = 1.25, 1.00, 0.70, 0.33, 0.53, 1.76   # Z_THIGH: shortsien helman ja sormenpaiden valissa


def hue_sat(rgb):
    r, g, b = [rgb[..., i].astype(np.float64) / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r); gg = m & (mx == g) & ~rr; bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)


def runs(mask_row):
    """[(x0, x1)] inclusive runs of True"""
    out, x, n = [], 0, len(mask_row)
    while x < n:
        if mask_row[x]:
            x0 = x
            while x < n and mask_row[x]: x += 1
            out.append((x0, x - 1))
        else:
            x += 1
    return out


def measure(path):
    a = np.array(Image.open(path).convert("RGBA"))
    A = a[..., 3] > 40
    h, s = hue_sat(a[..., :3])
    skin = A & (h >= 36) & (h <= 72) & (s > 0.2)
    shirt = A & (h >= 266) & (h <= 345) & (s > 0.2)
    ys = np.nonzero(A.any(1))[0]
    top, floor = ys.min(), ys.max()
    H = floor - top + 1
    row = lambda z: int(round(floor - (z / Z_TOP) * (H - 1)))
    cx = int(round(np.nonzero(A[floor - H // 3])[0].mean()))     # body centre (between the legs)

    # head: from the top down until the outline narrows to the neck
    widths = []
    for y in range(top, top + H // 3):
        r = [q for q in runs(A[y]) if q[0] <= cx + 30 and q[1] >= cx - 30]
        widths.append(max((q[1] - q[0] + 1 for q in r), default=0))
    wmax, chin = 0, None
    for i, w in enumerate(widths):
        wmax = max(wmax, w)
        if i > 5 and w < 0.62 * wmax:
            chin = top + i; break
    head_h = chin - top
    head_w = max(widths[: max(1, int(head_h * 0.42))])          # above the ears

    # shoulders: widest row just below the chin
    sh_rows = range(chin + 2, chin + int(0.12 * H))
    shoulder = max(int(np.nonzero(A[y])[0].max() - np.nonzero(A[y])[0].min() + 1) for y in sh_rows)

    def limb(y, mask):
        """thickness of the left-most limb run (the arm/leg on the image left)"""
        r = runs(mask[y])
        return (r[0][1] - r[0][0] + 1) if r else 0
    upper = limb(row(Z_UPPERARM), skin)
    fore = limb(row(Z_FOREARM), skin)
    thigh_y = row(Z_THIGH)
    lr = [q for q in runs(A[thigh_y]) if q[0] < cx]
    q = max(lr, key=lambda q: q[1])                                   # the left leg (shorts included), not the hand
    thigh = (min(q[1], cx) - q[0] + 1)
    shin = limb(row(Z_SHIN), skin)

    # crotch: the first row (going up from the knees) without a gap between the legs
    knee_y = row(Z_KNEE)
    crotch = knee_y
    for y in range(knee_y, top, -1):
        if not any(q[0] <= cx <= q[1] for q in runs(~A[y])):
            break
        crotch = y
    crotch -= 1
    legs = (floor - crotch) / H

    # reach: lowest skin pixel of the left arm (outside the left leg)
    def leg_run(y):   # the run nearest to the centre on the left: the leg, not the arm beside it
        r = [q for q in runs(A[y]) if q[0] < cx]
        return max(r, key=lambda q: q[1]) if r else (cx, cx)
    leg_left = min(leg_run(y)[0] for y in range(crotch + 1, knee_y + 1))
    fy = row(Z_FOREARM); fr = runs(skin[fy])
    ax0, ax1 = (fr[0][0] - 3, fr[0][1] + 3) if fr else (0, max(1, leg_left - 1))   # the arm's own columns
    arm_px = np.nonzero(skin[fy:, max(0, ax0):ax1].any(1))[0]
    finger = fy + arm_px.max() if len(arm_px) else crotch
    # the hand may touch the thigh: stop where the arm column meets the leg outline
    reach = (finger - crotch) / max(1, knee_y - crotch)          # 0 = crotch, 1 = knee, 0.5 = mid-thigh

    R = [
        ("Pään korkeus (leuka-päälaki)", head_h / H, f"{head_h} px = {100 * head_h / H:.1f} % pituudesta", 0.12, 0.13),
        ("Pään leveys", head_w / head_h, f"{head_w} px = {100 * head_w / head_h:.0f} % pään korkeudesta", 0.65, 0.75),
        ("Hartioiden leveys", shoulder / head_w, f"{shoulder} px = {shoulder / head_w:.2f} x pään leveys", 2.2, 2.5),
        ("Olkavarren paksuus", upper / head_w, f"{upper} px = {100 * upper / head_w:.0f} % pään leveydestä", 0.40, 0.50),
        ("Kyynärvarren paksuus", fore / head_w, f"{fore} px = {100 * fore / head_w:.0f} % pään leveydestä", 0.32, 0.40),
        ("Reiden paksuus (shortsit)", thigh / head_w, f"{thigh:.0f} px = {100 * thigh / head_w:.0f} % pään leveydestä", 0.75, 0.90),
        ("Säären paksuus", shin / head_w, f"{shin} px = {100 * shin / head_w:.0f} % pään leveydestä", 0.45, 0.55),
        ("Käden ulottuma", reach, f"sormenpäät {100 * reach:.0f} % haarasta polveen", 0.40, 0.60),
        ("Jalkojen pituus (lattia-haara)", legs, f"{floor - crotch} px = {100 * legs:.1f} % pituudesta", 0.48, 0.52),
    ]
    return H, R


def fmt_target(lo, hi, name):
    if "Hartioiden" in name: return f"{lo:.1f}-{hi:.1f} x"
    if "ulottuma" in name: return "reiden puoliväli (40-60 %)"
    return f"{100 * lo:.0f}-{100 * hi:.0f} %"


if __name__ == "__main__":
    H, R = measure(sys.argv[1])
    print(f"Kuva: {sys.argv[1]}   pituus {H} px")
    print(f"{'Mitta':32} | {'Mitattu':40} | {'Tavoite':28} | OK")
    print("-" * 112)
    bad = 0
    for name, v, txt, lo, hi in R:
        ok = lo <= v <= hi
        bad += not ok
        print(f"{name:32} | {txt:40} | {fmt_target(lo, hi, name):28} | {'OK' if ok else 'ei'}")
    sys.exit(1 if bad else 0)
