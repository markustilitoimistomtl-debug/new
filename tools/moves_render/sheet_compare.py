"""Kontaktiarkit pelikuvista (game/<liike>/body.webp + hair_crew.webp), vanha | uusi.
usage: python sheet_compare.py <old game dir> <new game dir> <out dir>"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tint import over, tint, toimg

COLS = {"skin": "#c48a5e", "jersey": "#c4282b", "trim": "#f4f1ea", "shoe2": "#c4282b", "hair": "#3b2616"}
old, new, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
JO = json.load(open(os.path.join(old, "vb_sprites.json")))
JN = json.load(open(os.path.join(new, "vb_sprites.json")))


def cells(gdir, J, move):
    C = J["cell"]
    b = np.asarray(Image.open(f"{gdir}/{move}/body.webp").convert("RGBA"), np.float32) / 255
    h = np.asarray(Image.open(f"{gdir}/{move}/hair_crew.webp").convert("RGBA"), np.float32) / 255
    a = toimg(over(tint(b, COLS), tint(h, COLS)))
    return a, C


for move in JN["moves"]:
    n = JN["moves"][move]["frames"]
    fr = list(range(0, n, 4))
    imgs = []
    for gdir, J in ((old, JO), (new, JN)):
        a, C = cells(gdir, J, move)
        R = J["ball_radius"]
        sh = Image.new("RGBA", (C * len(fr), C * 8), (196, 150, 104, 255))
        for r, d in enumerate(J["dirs"]):
            for k, i in enumerate(fr):
                if i >= J["moves"][move]["frames"]:
                    continue
                cell = Image.new("RGBA", (C, C), (196, 150, 104, 255))
                bp = J["moves"][move]["ball"][d][i]
                dr = ImageDraw.Draw(cell)
                if bp and not bp[2]:
                    dr.ellipse([bp[0] - R, bp[1] - R, bp[0] + R, bp[1] + R], fill=(226, 112, 30, 255), outline=(42, 20, 10, 255))
                cell.alpha_composite(a.crop((i * C, r * C, i * C + C, r * C + C)))
                if bp and bp[2]:
                    ImageDraw.Draw(cell).ellipse([bp[0] - R, bp[1] - R, bp[0] + R, bp[1] + R], fill=(226, 112, 30, 255), outline=(42, 20, 10, 255))
                sh.paste(cell, (k * C, r * C))
        imgs.append(sh)
    W = imgs[0].width + imgs[1].width + 16
    page = Image.new("RGBA", (W, imgs[0].height + 22), (255, 255, 255, 255))
    page.paste(imgs[0], (0, 22)); page.paste(imgs[1], (imgs[0].width + 16, 22))
    ImageDraw.Draw(page).text((4, 4), f"{move}: vanha (vasen) | uusi (oikea), rivit S SE E NE N NW W SW, joka 4. ruutu", fill=(0, 0, 0, 255))
    page.convert("RGB").save(f"{out}/{move}.png", optimize=True)
    print(move, end=" ", flush=True)
print()
