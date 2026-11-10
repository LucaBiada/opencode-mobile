"""Regenerate the Expo asset bundle from the Devmote mark.

Run from anywhere: python scripts/make-icons.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from icon_glyph import draw_glyph, full_icon, adaptive_front

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
S = 1024

full_icon(S, radius_ratio=0.22).save(os.path.join(ASSETS, "icon.png"))
full_icon(S).convert("RGB").save(os.path.join(ASSETS, "icon-appstore.png"))
adaptive_front(S).save(os.path.join(ASSETS, "adaptive-icon.png"))
draw_glyph(512, scale=0.78).save(os.path.join(ASSETS, "splash-icon.png"))
print("assets written")
