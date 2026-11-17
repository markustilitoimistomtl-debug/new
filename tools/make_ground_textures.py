"""Builds seamless ground textures for the local view from the painted terrain samples.
Usage: python3 make_ground_textures.py <terrain sample sheet (2x2)> <out webp>
Layers (512 x 512, stacked vertically): 0 forest floor, 1 meadow, 2 dry sandy grass, 3 beach pebbles, 4 shallow water."""
import sys
import numpy as np
from PIL import Image
T = 512
CROPS = [(120, 0, 620, 500), (875, 0, 1375, 500), (125, 500, 625, 1000), (788, 772, 1008, 992), (1250, 560, 1500, 810)]

def seamless(a):
    b = np.roll(np.roll(a, T // 2, 0), T // 2, 1)
    y, x = np.mgrid[0:T, 0:T]
    e = np.minimum(np.minimum(x, T - 1 - x), np.minimum(y, T - 1 - y)) / (T * 0.25)
    m = np.clip(e, 0, 1); m = m * m * (3 - 2 * m)
    return (a * m[..., None] + b * (1 - m[..., None])).astype(np.uint8)

src = Image.open(sys.argv[1]).convert('RGB')
layers = []
for c in CROPS:
    a = np.array(src.crop(c).resize((T, T), Image.LANCZOS)).astype(np.float32)
    layers.append(seamless(a))
Image.fromarray(np.concatenate(layers, 0)).save(sys.argv[2], 'WEBP', quality=86, method=6)
print('ok', len(layers))
