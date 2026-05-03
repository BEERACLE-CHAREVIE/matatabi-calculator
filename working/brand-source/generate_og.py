#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = "#F8F6F2"
INK = "#72665B"
LINE = "#BEB5AA"
ACCENT = "#9CAEB8"

FONT_BOLD = "/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc"
FONT_MEDIUM = "/System/Library/Fonts/ヒラギノ角ゴシック W5.ttc"
FONT_REGULAR = "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# --- Decorative cat (right side, behind text) ---
# Sitting cat silhouette, soft tone
def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# Use a separate RGBA layer to apply opacity to the cat
cat_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(cat_layer)
line_rgba = hex_to_rgb(LINE) + (130,)  # ~50% opacity

# Body
cd.ellipse([880, 380, 1160, 580], fill=line_rgba)
# Head
cd.ellipse([910, 240, 1120, 440], fill=line_rgba)
# Ears
cd.polygon([(945, 290), (970, 215), (1010, 295)], fill=line_rgba)
cd.polygon([(1090, 290), (1065, 215), (1025, 295)], fill=line_rgba)
# Tail
for i in range(20):
    t = i / 19
    # Bezier-ish curve approximation
    x = (1 - t) * (1 - t) * 1140 + 2 * (1 - t) * t * 1210 + t * t * 1170
    y = (1 - t) * (1 - t) * 480 + 2 * (1 - t) * t * 360 + t * t * 280
    cd.ellipse([x - 14, y - 14, x + 14, y + 14], fill=line_rgba)

img = Image.alpha_composite(img.convert("RGBA"), cat_layer).convert("RGB")
d = ImageDraw.Draw(img)

# --- Header cat icon (small, top-left) ---
# Ears
d.polygon([(140, 152), (160, 120), (180, 156)], fill=INK)
d.polygon([(228, 152), (208, 120), (188, 156)], fill=INK)
# Face circle (outline)
d.ellipse([150, 140, 218, 208], outline=INK, width=4)
# Eyes
d.ellipse([165, 168, 173, 176], fill=INK)
d.ellipse([195, 168, 203, 176], fill=INK)
# Nose
d.polygon([(180, 184), (188, 184), (184, 190)], fill=INK)
# Whiskers
d.line([(120, 180), (152, 182)], fill=INK, width=3)
d.line([(120, 192), (152, 188)], fill=INK, width=3)
d.line([(248, 180), (216, 182)], fill=INK, width=3)
d.line([(248, 192), (216, 188)], fill=INK, width=3)

# --- Wordmark ---
title_font = ImageFont.truetype(FONT_BOLD, 130)
sub_font = ImageFont.truetype(FONT_MEDIUM, 44)
co_font = ImageFont.truetype(FONT_REGULAR, 30)

d.text((120, 270), "またたび計算機", font=title_font, fill=INK)
d.text((120, 430), "中小企業向け ROI 診断アプリ", font=sub_font, fill=INK)

# Accent line + company name
d.line([(120, 540), (280, 540)], fill=ACCENT, width=4)
d.text((120, 555), "株式会社ねこにまたたび", font=co_font, fill=INK)

out = "src/app/opengraph-image.png"
img.save(out, optimize=True)
size = os.path.getsize(out)
print(f"Saved {out} ({size:,} bytes, {size/1024:.1f} KB)")
