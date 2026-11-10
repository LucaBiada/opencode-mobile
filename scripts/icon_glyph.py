"""Shared drawing for Devmote's launcher, splash and notification assets.

The mark is a terminal prompt (chevron + underscore) in the app's accent purple
on the app's near-black. It is deliberately generic: no vendor wordmark, no
third-party glyph.
"""
from PIL import Image, ImageDraw

BG = (20, 20, 21, 255)
ACCENT = (139, 92, 246, 255)
WHITE = (255, 255, 255, 255)


def draw_glyph(size, scale=1.0, color=ACCENT):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = size / 2, size / 2 - 0.055 * size
    w = 64 * scale * size / 1024
    # chevron
    d.line(
        [
            (cx - 0.29 * size * scale, cy - 0.14 * size * scale),
            (cx - 0.09 * size * scale, cy),
            (cx - 0.29 * size * scale, cy + 0.14 * size * scale),
        ],
        fill=color,
        width=max(1, int(w)),
        joint="curve",
    )
    for px, py in [
        (cx - 0.29 * size * scale, cy - 0.14 * size * scale),
        (cx - 0.29 * size * scale, cy + 0.14 * size * scale),
        (cx - 0.09 * size * scale, cy),
    ]:
        d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=color)
    # underscore
    x0, x1 = cx - 0.09 * size * scale, cx + 0.27 * size * scale
    y = cy + 0.14 * size * scale
    d.line([(x0, y), (x1, y)], fill=color, width=max(1, int(w)))
    for px in (x0, x1):
        d.ellipse([px - w / 2, y - w / 2, px + w / 2, y + w / 2], fill=color)
    return layer


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def full_icon(size, radius_ratio=0.0, glyph_scale=0.95):
    im = Image.new("RGBA", (size, size), BG)
    if radius_ratio:
        im.putalpha(rounded_mask(size, int(size * radius_ratio)))
    im.alpha_composite(draw_glyph(size, scale=glyph_scale))
    return im


def adaptive_front(size, glyph_scale=0.66):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.alpha_composite(draw_glyph(size, scale=glyph_scale))
    return layer


def round_icon(size):
    im = full_icon(size)
    im.putalpha(rounded_mask(size, size // 2))
    return im
