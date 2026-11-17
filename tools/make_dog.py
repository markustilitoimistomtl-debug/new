"""Draws a placeholder dog sprite sheet (side view, facing right) in the cartoon style of the character sheets.
Rows: 0 walk (8), 1 run (6), 2 sit (1), 3 lie (1), 4 swim (6). Frames 150 x 104, baseline 98."""
import math, sys
from PIL import Image, ImageDraw
FW, FH, BASE, K = 150, 104, 98, 4
FUR, DARK, LIGHT, OUT = (150, 102, 58), (96, 62, 34), (232, 214, 180), (28, 22, 18)

def P(x, y): return (x * K, y * K)

def limb(d, a, b, w, col):
    d.line([P(*a), P(*b)], fill=OUT, width=int((w + 2) * K)); 
    for p in (a, b): d.ellipse([P(p[0] - (w + 2) / 2, p[1] - (w + 2) / 2), P(p[0] + (w + 2) / 2, p[1] + (w + 2) / 2)], fill=OUT)
    d.line([P(*a), P(*b)], fill=col, width=int(w * K))
    for p in (a, b): d.ellipse([P(p[0] - w / 2, p[1] - w / 2), P(p[0] + w / 2, p[1] + w / 2)], fill=col)

def leg(d, hip, ang, knee_bend, length, col, w=5):
    k = (hip[0] + math.sin(ang) * length * .55, hip[1] + math.cos(ang) * length * .55)
    f = (k[0] + math.sin(ang + knee_bend) * length * .5, k[1] + math.cos(ang + knee_bend) * length * .5)
    limb(d, hip, k, w, col); limb(d, k, f, w - 1, col)
    d.ellipse([P(f[0] - 3.5, f[1] - 2.2), P(f[0] + 3.8, f[1] + 2.2)], fill=OUT)

def ell(d, cx, cy, rx, ry, col, ang=0):
    pts = [(cx + math.cos(t) * rx * math.cos(ang) - math.sin(t) * ry * math.sin(ang), cy + math.cos(t) * rx * math.sin(ang) + math.sin(t) * ry * math.cos(ang)) for t in [i / 40 * math.tau for i in range(40)]]
    d.polygon([P(x + (x - cx) * 0.0, y) for x, y in pts], fill=OUT)
    pts2 = [(cx + (x - cx) * (1 - 1.8 / rx), cy + (y - cy) * (1 - 1.8 / ry)) for x, y in pts]
    d.polygon([P(*p) for p in pts2], fill=col)

def dog(d, cx, by, phase=0.0, gait='walk', pose='stand'):
    if pose == 'sit':
        body_c, tilt = (cx - 4, by - 26), -0.6
    elif pose == 'lie':
        body_c, tilt = (cx, by - 11), 0.0
    elif pose == 'swim':
        body_c, tilt = (cx, by - 6), 0.05
    else:
        bob = abs(math.sin(phase)) * (2.5 if gait == 'run' else 1.2)
        body_c, tilt = (cx, by - 30 - bob), (math.sin(phase * 2) * 0.05 if gait == 'run' else 0)
    bx, byy = body_c
    hipF = (bx + 15, byy + 4); hipB = (bx - 15, byy + 3)
    amp = 0.75 if gait == 'run' else 0.45
    # far legs (darker)
    if pose == 'stand':
        leg(d, hipB, math.sin(phase + math.pi) * amp, 0.35 if gait == 'walk' else 0.6, 27, DARK)
        leg(d, hipF, math.sin(phase) * amp, -0.15, 27, DARK)
    # tail
    tb = (bx - 22, byy - 4)
    wag = math.sin(phase * 3) * 0.3
    tt = (tb[0] - 14, tb[1] - 12 + wag * 10) if pose != 'lie' else (tb[0] - 16, tb[1] + 4)
    if pose == 'swim': tt = (tb[0] - 14, tb[1] - 2)
    limb(d, tb, tt, 4, FUR)
    # body
    ell(d, bx, byy, 25, 11.5, FUR, tilt)
    ell(d, bx + 12, byy + 4, 9, 7, LIGHT, tilt)
    # near legs
    if pose == 'stand':
        leg(d, hipB, math.sin(phase) * amp, 0.35 if gait == 'walk' else 0.6, 27, FUR)
        leg(d, hipF, math.sin(phase + math.pi) * amp, -0.15, 27, FUR)
    elif pose == 'sit':
        leg(d, (bx + 14, byy + 6), 0.05, 0, 21, FUR)
        ell(d, bx - 14, by - 9, 12, 8, FUR)
        d.ellipse([P(bx - 4, by - 3), P(bx + 6, by + 1)], fill=OUT)
    elif pose == 'lie':
        limb(d, (bx + 18, byy + 5), (bx + 36, byy + 9), 5, FUR)
        limb(d, (bx - 16, byy + 5), (bx - 2, byy + 9), 6, FUR)
    elif pose == 'swim':
        for s in (0, math.pi):
            a = math.sin(phase + s) * 0.9
            limb(d, (bx + 14, byy + 4), (bx + 14 + math.sin(a) * 9, byy + 12), 4, FUR)
    # neck + head
    if pose == 'sit': hx, hy = bx + 18, byy - 22
    elif pose == 'lie': hx, hy = bx + 28, byy - 10
    elif pose == 'swim': hx, hy = bx + 27, byy - 9
    else: hx, hy = bx + 27, byy - 14 + math.sin(phase * 2) * (1.5 if gait == 'run' else .8)
    limb(d, (bx + 16, byy - 3), (hx - 3, hy + 4), 10, FUR)
    ell(d, hx, hy, 10, 8.5, FUR)
    ell(d, hx + 10, hy + 3, 7, 4.5, FUR)
    d.ellipse([P(hx + 14.5, hy + 0.5), P(hx + 18.5, hy + 4)], fill=OUT)        # nose
    d.ellipse([P(hx + 3, hy - 3.5), P(hx + 6.5, hy)], fill=OUT)                 # eye
    d.ellipse([P(hx + 4.2, hy - 3), P(hx + 5.4, hy - 1.8)], fill=(255, 255, 255))
    ear = [(hx - 6, hy - 6), (hx + 1, hy - 7), (hx - 4, hy + 8 + math.sin(phase * 2) * 1.5)]
    d.polygon([P(x, y) for x, y in ear], fill=OUT)
    d.polygon([P(x + (0.9 if i == 2 else 0.6), y + (0.6 if i < 2 else -1.2)) for i, (x, y) in enumerate(ear)], fill=DARK)
    if pose == 'swim':
        d.line([P(bx - 40, by - 2), P(bx + 45, by - 2)], fill=(210, 230, 240), width=2 * K)

def frame(**kw):
    im = Image.new('RGBA', (FW * K, FH * K), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    dog(d, FW / 2 - 4, BASE, **kw)
    return im.resize((FW, FH), Image.LANCZOS)

rows = [[frame(phase=i / 8 * math.tau, gait='walk') for i in range(8)],
        [frame(phase=i / 6 * math.tau, gait='run') for i in range(6)],
        [frame(pose='sit')], [frame(pose='lie')],
        [frame(phase=i / 6 * math.tau, pose='swim') for i in range(6)]]
sheet = Image.new('RGBA', (9 * FW, len(rows) * FH), (0, 0, 0, 0))
for r, fr in enumerate(rows):
    for k, f in enumerate(fr): sheet.alpha_composite(f, (k * FW, r * FH))
sheet.save(sys.argv[1], 'WEBP', quality=90, method=6)
print('ok')
