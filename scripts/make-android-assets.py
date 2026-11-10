"""Regenerate the Android mipmaps/drawables that ship in the native project.

Expo writes these at prebuild time from assets/*.png, but this repo commits the
native project, so they need to be replaced in place when the mark changes.
Run from anywhere: python scripts/make-android-assets.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from icon_glyph import draw_glyph, full_icon, adaptive_front, round_icon, WHITE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
SPLASH = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}
NOTIFICATION = {"mdpi": 24, "hdpi": 36, "xhdpi": 48, "xxhdpi": 72, "xxxhdpi": 96}


def save(im, *parts, webp=False):
    path = os.path.join(RES, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if webp:
        im.save(path, "WEBP", lossless=True, quality=100, method=6)
    else:
        im.save(path)
    print("wrote", os.path.relpath(path, ROOT), im.size)


for density, size in LAUNCHER.items():
    save(full_icon(size), f"mipmap-{density}", "ic_launcher.webp", webp=True)
    save(round_icon(size), f"mipmap-{density}", "ic_launcher_round.webp", webp=True)

for density, size in FOREGROUND.items():
    save(adaptive_front(size), f"mipmap-{density}", "ic_launcher_foreground.webp", webp=True)

for density, size in SPLASH.items():
    save(draw_glyph(size, scale=0.78), f"drawable-{density}", "splashscreen_logo.png")

for density, size in NOTIFICATION.items():
    save(draw_glyph(size, scale=0.9, color=WHITE), f"drawable-{density}", "notification_icon.png")
