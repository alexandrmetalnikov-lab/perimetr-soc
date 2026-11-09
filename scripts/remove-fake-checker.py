# ChatGPT иногда рисует «шахматку прозрачности» прямо в картинке вместо настоящего прозрачного фона.
# Скрипт убирает её: заливает от краёв светло-серые ненасыщенные пиксели и превращает их в прозрачные,
# затем оставляет только самый крупный объект (без случайных точек по краям).
# Опционально приглушает цвет, чтобы предмет совпал по тону с остальными: --sat 0.8 --val 0.86
# Запуск: python3 scripts/remove-fake-checker.py вход.png выход.png [--sat S] [--val V]
# Нужны numpy, pillow, scipy.
import argparse
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--sat', type=float, default=1.0); ap.add_argument('--val', type=float, default=1.0)
args = ap.parse_args()

a = np.asarray(Image.open(args.src).convert('RGB'), dtype=np.float32) / 255
mx, mn = a.max(2), a.min(2)
sat = (mx - mn) / np.maximum(mx, 1e-6)
bgish = (sat < 0.10) & (mx > 0.45)
lab, _ = ndimage.label(bgish)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = ndimage.binary_closing(np.isin(lab, list(edge)), iterations=2)
fg = ndimage.binary_opening(~bg, iterations=1)
lab, n = ndimage.label(fg)
if n > 1:
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    fg = ndimage.binary_dilation(lab == (np.argmax(sizes) + 1), iterations=2) & fg
alpha = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))

rgb = (a * 255).astype(np.uint8)
if args.sat != 1.0 or args.val != 1.0:
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(np.float32)
    hsv[..., 1] *= args.sat; hsv[..., 2] *= args.val
    rgb = np.asarray(Image.fromarray(np.clip(hsv, 0, 255).astype(np.uint8), 'HSV').convert('RGB'))
Image.fromarray(np.dstack([rgb, alpha]), 'RGBA').save(args.out)
print(f'{args.src} → {args.out} · объект {fg.mean() * 100:.1f}% кадра')
