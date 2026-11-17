"""Moves Render output -> Vintage Basket game assets + Moves preview.
usage: python make_game_assets.py <render_dir> <out_dir> [--cell 128] [--preview 192]
- game/<move>/body.webp, game/<move>/hair_<style>.webp : sheets, rows = 8 directions (S,SE,E,NE,N,NW,W,SW), cols = frames
- game/vb_sprites.json : cell, foot, fps, loop, frames, ball positions (scaled), tint classes
- preview/<move>_<DIR>/... : coloured composites with the ball, for the Moves viewer
"""
import sys, os, json, argparse
import numpy as np
from PIL import Image, ImageDraw
from concurrent.futures import ProcessPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tint import tint, over, load, toimg

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--cell", type=int, default=128); ap.add_argument("--preview", type=int, default=192)
ap.add_argument("--lossless", action="store_true")
A = ap.parse_args()
M = json.load(open(os.path.join(A.src, "moves.json")))
DIRS = M["dirs"]; HAIR = M["hair"]; S0 = M["size"]
PREV_COLS = {"skin": "#c48a5e", "jersey": "#c4282b", "trim": "#f4f1ea", "shoe2": "#c4282b", "hair": "#3b2616"}

def sheet_job(args):
    move, layer = args
    m = M["moves"][move]; n = m["frames"]; C = A.cell
    sh = Image.new("RGBA", (C * n, C * len(DIRS)), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for i in range(n):
            im = Image.open(f"{A.src}/{layer}/{move}_{d}/{move}_{d}_{i:03d}.png").convert("RGBA")
            if C != S0: im = im.resize((C, C), Image.LANCZOS)
            sh.paste(im, (i * C, r * C))
    os.makedirs(f"{A.dst}/game/{move}", exist_ok=True)
    out = f"{A.dst}/game/{move}/{layer}.webp"
    sh.save(out, lossless=True, quality=100, method=6)   # lossless keeps hues exact for tinting (and is smaller here)
    return out, os.path.getsize(out)

def preview_job(args):
    move, d, hair = args
    m = M["moves"][move]; P = A.preview; k = P / S0; R = M["ball_radius"] * k
    os.makedirs(f"{A.dst}/preview/{move}_{d}", exist_ok=True)
    for i in range(m["frames"]):
        b = load(f"{A.src}/body/{move}_{d}/{move}_{d}_{i:03d}.png")
        h = load(f"{A.src}/hair_{hair}/{move}_{d}/{move}_{d}_{i:03d}.png")
        im = toimg(over(tint(b, PREV_COLS), tint(h, PREV_COLS))).resize((P, P), Image.LANCZOS)
        cell = Image.new("RGBA", (P, P), (0, 0, 0, 0)); bp = m["ball"][d][i]
        def ball(img):
            if not bp: return
            x, y = bp[0] * k, bp[1] * k; dr = ImageDraw.Draw(img)
            dr.ellipse([x - R, y - R, x + R, y + R], fill=(226, 112, 30, 255), outline=(42, 20, 10, 255), width=max(1, round(R / 6)))
            dr.line([x - R, y, x + R, y], fill=(42, 20, 10, 255), width=1); dr.line([x, y - R, x, y + R], fill=(42, 20, 10, 255), width=1)
        if bp and not bp[2]: ball(cell)
        cell.alpha_composite(im)
        if bp and bp[2]: ball(cell)
        cell.save(f"{A.dst}/preview/{move}_{d}/{move}_{d}_{i:03d}.png", optimize=True)
    return move, d

if __name__ == "__main__":
    os.makedirs(A.dst, exist_ok=True)
    jobs = [(mv, "body") for mv in M["moves"]] + [(mv, f"hair_{h}") for mv in M["moves"] for h in HAIR]
    total = 0
    with ProcessPoolExecutor(2) as ex:
        for out, size in ex.map(sheet_job, jobs): total += size
    k = A.cell / S0
    J = {"cell": A.cell, "foot": [M["foot"][0] * k, M["foot"][1] * k], "dirs": DIRS, "hair": HAIR,
         "ball_radius": round(M["ball_radius"] * k, 2), "palette_key": M["palette_colors"],
         "tint_classes": [["ball", 5, 32], ["skin", 36, 72], ["shoe2", 88, 152], ["trim", 165, 220], ["hair", 223, 262], ["jersey", 266, 345]],
         "moves": {},
         # Vintage Basket poseOf() -> sprite move (speed / facing decide walk-jog-run-backpedal at draw time)
         "game_pose_map": {"run": ["walk", "jog", "run", "backpedal"], "dribble": ["dribble", "dribble_run"], "lowdrib": "lowdrib",
                           "post": "post", "defend": ["defend", "defense_slide"], "gather": "shoot:0-8", "shoot": "shoot", "pumpshot": "shoot",
                           "pump": "pump", "hookA": "hook:0-12", "hook": "hook", "overhead": "overhead", "pickup": "pickup", "point": "point",
                           "celebrate": "celebrate", "raise1": "celebrate", "block": ["block", "rebound"], "stumble": "stumble", "down": "down",
                           "blind": "idle", "idle": "idle", "dunk": "dunk", "layup": "layup", "pass": ["pass_chest", "pass_bounce"]}}
    for mv, m in M["moves"].items():
        J["moves"][mv] = {"frames": m["frames"], "fps": m["fps"], "loop": m["loop"],
                          "ball": {d: [None if b is None else [round(b[0] * k, 1), round(b[1] * k, 1), b[2]] for b in m["ball"][d]] for d in DIRS}}
    json.dump(J, open(f"{A.dst}/game/vb_sprites.json", "w"), separators=(",", ":"))
    print("game sheets", round(total / 1e6, 1), "MB")
    if A.preview:
        pj = [(mv, d, "messy") for mv in M["moves"] for d in DIRS]
        with ProcessPoolExecutor(2) as ex: list(ex.map(preview_job, pj))
        pm = {"size": A.preview, "foot": [M["foot"][0] * A.preview / S0, M["foot"][1] * A.preview / S0], "dirs": DIRS,
              "moves": {mv: {"frames": m["frames"], "fps": m["fps"], "loop": m["loop"]} for mv, m in M["moves"].items()}}
        json.dump(pm, open(f"{A.dst}/preview/moves.json", "w"), indent=1)
        print("preview done")
