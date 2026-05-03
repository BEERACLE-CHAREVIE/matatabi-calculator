#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

S = 180
BG = "#F8F6F2"
INK = "#72665B"

# Render at 4x then downscale for AA
SCALE = 4
W = S * SCALE
img = Image.new("RGB", (W, W), BG)
d = ImageDraw.Draw(img)

c = W // 2
# Ears
d.polygon([(c - 70 * SCALE, c - 50 * SCALE),
           (c - 50 * SCALE, c - 88 * SCALE),
           (c - 28 * SCALE, c - 42 * SCALE)], fill=INK)
d.polygon([(c + 70 * SCALE, c - 50 * SCALE),
           (c + 50 * SCALE, c - 88 * SCALE),
           (c + 28 * SCALE, c - 42 * SCALE)], fill=INK)

# Face circle
r = 56 * SCALE
d.ellipse([c - r, c - r + 8 * SCALE, c + r, c + r + 8 * SCALE], fill=INK)

# Eyes (knockout in offwhite)
ex_off = 22 * SCALE
ey = c - 4 * SCALE
er = 6 * SCALE
d.ellipse([c - ex_off - er, ey - er, c - ex_off + er, ey + er], fill=BG)
d.ellipse([c + ex_off - er, ey - er, c + ex_off + er, ey + er], fill=BG)

# Nose (small triangle, knockout)
d.polygon([(c - 10 * SCALE, c + 16 * SCALE),
           (c + 10 * SCALE, c + 16 * SCALE),
           (c, c + 26 * SCALE)], fill=BG)

# Whiskers
ww = 3 * SCALE
d.line([(c - 78 * SCALE, c + 4 * SCALE), (c - 50 * SCALE, c + 6 * SCALE)], fill=BG, width=ww)
d.line([(c - 78 * SCALE, c + 18 * SCALE), (c - 50 * SCALE, c + 14 * SCALE)], fill=BG, width=ww)
d.line([(c + 78 * SCALE, c + 4 * SCALE), (c + 50 * SCALE, c + 6 * SCALE)], fill=BG, width=ww)
d.line([(c + 78 * SCALE, c + 18 * SCALE), (c + 50 * SCALE, c + 14 * SCALE)], fill=BG, width=ww)

img = img.resize((S, S), Image.LANCZOS)

# Convert to palette mode for smaller file
img_p = img.convert("P", palette=Image.ADAPTIVE, colors=16)

out = "src/app/apple-icon.png"
img_p.save(out, optimize=True)
size = os.path.getsize(out)
print(f"Saved {out} ({size:,} bytes, {size/1024:.1f} KB)")
