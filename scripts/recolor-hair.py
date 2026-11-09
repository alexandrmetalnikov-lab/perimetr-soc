# Перекраска волос портрета (по умолчанию в чёрный), чтобы персонажи не путались между собой.
# Маска задаётся полигонами в JSON рядом с исходником (art-src/probes/<id>.mask.json):
#   { "src": "...png", "out": "...png", "include": [[[x,y],...], ...], "soft": [{"strength": 0.55, "pts": [[x,y],...]}],
#     "shadow": [r,g,b], "sheen": [r,g,b], "gamma": 1.7 }   ← цвет: по умолчанию чёрный; для рыжего задать свои
# Меняются только тёплые (коричнево-рыжие) пиксели внутри маски: тёмно-синий фон и холодные блики остаются.
# Запуск: python3 scripts/recolor-hair.py art-src/probes/p-orlova.mask.json
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

cfg = json.load(open(sys.argv[1], encoding='utf-8'))
im = Image.open(cfg['src']).convert('RGB'); W, H = im.size

def mask(polys):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon([tuple(x) for x in p], fill=255)
    return np.asarray(m, dtype=np.float32) / 255

w = mask(cfg.get('include', []))
for s in cfg.get('soft', []): w = np.maximum(w, mask([s['pts']]) * s['strength'])
w = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32) / 255

a = np.asarray(im, dtype=np.float32) / 255
r, g, b = a[..., 0], a[..., 1], a[..., 2]
warm = np.clip((r - b - 0.02) / 0.12, 0, 1)
L = 0.3 * r + 0.59 * g + 0.11 * b
shadow = np.array(cfg.get('shadow', [0.055, 0.05, 0.07])); sheen = np.array(cfg.get('sheen', [0.62, 0.46, 0.36]))
new = shadow + (sheen - shadow) * (np.clip(L, 0, 1)[..., None] ** cfg.get('gamma', 1.7))
k = (w * warm)[..., None]
out = a * (1 - k) + new * k
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(cfg['out'])
print(f"{cfg['src']} → {cfg['out']}")
