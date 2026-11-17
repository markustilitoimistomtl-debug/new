"""Kontaktiarkki ennen/jalkeen (vaihe 2A). usage:
  python contact_sheet.py hair <before_render> <after_render> <out.png>        7 hiustyylia, idle ruutu 0, S/E/N, ennen | jalkeen
  python contact_sheet.py move <before_render> <after_render> <move> <out.png> kaikki 8 suuntaa, joka neljas ruutu, ennen | jalkeen
Varit kuten make_game_assets.py:n esikatselussa; pallo piirretaan moves.json:n kohtaan."""
import json
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tint import load, over, tint, toimg

COLS = {"skin": "#c48a5e", "jersey": "#c4282b", "trim": "#f4f1ea", "shoe2": "#c4282b", "hair": "#3b2616"}
SKINS = ["#f0c9a4", "#c48a5e", "#8d5a3a", "#5a3825"]
HAIRC = ["#3b2616", "#141010", "#d6b46a", "#6b4423"]
CELL = 128


def frame(src, move, d, i, hair=None, cols=COLS):
    M = json.load(open(os.path.join(src, "moves.json")))
    b = load(f"{src}/body/{move}_{d}/{move}_{d}_{i:03d}.png")
    a = tint(b, cols)
    if hair:
        a = over(a, tint(load(f"{src}/hair_{hair}/{move}_{d}/{move}_{d}_{i:03d}.png"), cols))
    im = toimg(a)
    cell = Image.new("RGBA", im.size, (196, 150, 104, 255))
    bp = M["moves"][move]["ball"][d][i]
    R = M["ball_radius"]

    def ball():
        x, y = bp[0], bp[1]
        ImageDraw.Draw(cell).ellipse([x - R, y - R, x + R, y + R], fill=(226, 112, 30, 255), outline=(42, 20, 10, 255), width=2)
    if bp and not bp[2]: ball()
    cell.alpha_composite(im)
    if bp and bp[2]: ball()
    s = cell.size[0]
    return cell.crop((s // 4, s // 8, 3 * s // 4, s * 15 // 16)).resize((CELL, int(CELL * 13 / 8)), Image.LANCZOS)


def label(img, txt):
    ImageDraw.Draw(img).text((4, 2), txt, fill=(0, 0, 0, 255))
    return img


if __name__ == "__main__":
    kind = sys.argv[1]
    if kind == "hair":
        bef, aft, out = sys.argv[2:5]
        styles = json.load(open(os.path.join(aft, "moves.json")))["hair"]
        cols_per = 6
        W, H = CELL * cols_per + 20, int(CELL * 13 / 8)
        sheet = Image.new("RGBA", (W, H * len(styles) + 24), (255, 255, 255, 255))
        ImageDraw.Draw(sheet).text((4, 4), "ennen: S  E  N            |            jalkeen: S  E  N", fill=(0, 0, 0, 255))
        for r, st in enumerate(styles):
            c = dict(COLS, skin=SKINS[r % 4], hair=HAIRC[r % 4])
            for k, (src, d) in enumerate([(bef, "S"), (bef, "E"), (bef, "N"), (aft, "S"), (aft, "E"), (aft, "N")]):
                im = frame(src, "idle", d, 0, st, c)
                sheet.paste(im, (k * CELL + (20 if k >= 3 else 0), 24 + r * H))
            label(sheet.crop((0, 0, 1, 1)), "")
            ImageDraw.Draw(sheet).text((2, 26 + r * H), st, fill=(0, 0, 0, 255))
        sheet.save(out)
    else:
        bef, aft, move, out = sys.argv[2:6]
        M = json.load(open(os.path.join(aft, "moves.json")))
        dirs = M["dirs"]
        n = M["moves"][move]["frames"]
        frames = list(range(0, n, 4)) or [0]
        H = int(CELL * 13 / 8)
        sheet = Image.new("RGBA", (CELL * len(frames) * 2 + 20, H * len(dirs) + 24), (255, 255, 255, 255))
        ImageDraw.Draw(sheet).text((4, 4), f"{move}: ennen (vasen) | jalkeen (oikea), rivit S SE E NE N NW W SW, joka 4. ruutu", fill=(0, 0, 0, 255))
        for r, d in enumerate(dirs):
            for k, i in enumerate(frames):
                sheet.paste(frame(bef, move, d, i, "crew"), (k * CELL, 24 + r * H))
                sheet.paste(frame(aft, move, d, i, "crew"), (len(frames) * CELL + 20 + k * CELL, 24 + r * H))
        sheet.save(out)
    print("wrote", out)
