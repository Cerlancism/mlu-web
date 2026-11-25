"""Make the site icons from the games' own sprites.

Usage: python3 -I tools/make_icons.py

Writes into web/ (the landing page), web/mlu1/ and web/mlu2/:
  favicon.ico           16, 32 and 48 pixels, transparent
  apple-touch-icon.png  180 pixels, on the page colour (iOS fills transparency with black)

and, into web/ only, the icons of the site's one web app manifest (web/site.webmanifest):
  icon-192.png, icon-512.png                    the sprite large, on the page colour
  icon-maskable-192.png, icon-maskable-512.png  the sprite inside the central safe circle (80% of
                                                the width), so Android can crop the icon to any shape

The landing page, the app and MLU 1 use MLU 1's mining pod as the game draws it standing on the
ground, facing right, at the starting upgrades: the drill (dig_r0_1.png) under the hull
(hull_r1.PNG). MLU 2 uses its alexxzandrite crystal. pod() also builds MLU 2's pod, for
make_og_images.py. Large icons are scaled by a whole number with hard pixel edges, as the games draw; the
favicon sizes are smaller than the sprite, so they are resampled smoothly. Needs Pillow.
"""
import math
from pathlib import Path

from PIL import Image, ImageOps

WEB = Path(__file__).resolve().parent.parent / "web"

# The hull's drawing offset at each hull level, as the games set it.
HULL_OFFSETS = {
    "mlu1": [None, (0, 0), (0, 0), (-3, 1), (-3, 1), (-3, 1), (-1, 1), (-1, 1), (0, 1)],
    "mlu2": [None, (0, 0), (0, 0), (-3, 2), (-3, 2), (-3, 1), (-1, 1), (-1, 1), (0, 1)],
}


def pod(game, hull=1, drill=1):
    """The mining pod standing on the ground, facing right, layered as the game draws it."""
    images = WEB / game / "images"
    hx, hy = HULL_OFFSETS[game][hull]
    if game == "mlu1":
        ext = "png" if hull == 8 else "PNG"
        layers = [(images / f"dig_r0_{drill}.png", 12, -33, False),
                  (images / f"hull_r{hull}.{ext}", 14 + hx, -33 + hy, False)]
    else:  # MLU 2 draws tracks of their own, and mirrors the left-facing hull
        layers = [(images / "drills" / f"dig_r0_{drill}.png", 49, -30, False),
                  (images / "tracks.png", 12, -11, False),
                  (images / f"hull_l{hull}.png", 14 + hx, -33 + hy, True)]
    placed = []
    for path, x, y, mirror in layers:
        img = Image.open(path).convert("RGBA")
        placed.append((ImageOps.mirror(img) if mirror else img, x, y))
    left = min(x for _, x, _ in placed)
    top = min(y for _, _, y in placed)
    right = max(x + img.width for img, x, _ in placed)
    bottom = max(y + img.height for img, _, y in placed)
    out = Image.new("RGBA", (right - left, bottom - top))
    for img, x, y in placed:
        out.alpha_composite(img, (x - left, y - top))
    return out.crop(out.getbbox())


def sprite(path):
    """An image file trimmed to its visible pixels."""
    img = Image.open(path).convert("RGBA")
    return img.crop(img.getbbox())


TARGETS = [
    # folder, image, background colour of the opaque icons, also make the app icons
    (WEB, lambda: pod("mlu1"), (204, 102, 0), True),
    (WEB / "mlu1", lambda: pod("mlu1"), (204, 102, 0), False),
    (WEB / "mlu2", lambda: sprite(WEB / "mlu2" / "images" / "alexxzandrite.png"), (34, 38, 46), False),
]


def square(img):
    """img centred on a transparent square."""
    side = max(img.size)
    out = Image.new("RGBA", (side, side))
    out.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return out


def big(src, size, background, fill):
    """src scaled by the largest whole number at which it spans at most fill of the icon."""
    k = max(1, int(size * fill) // src.width)
    scaled = src.resize((src.width * k, src.height * k), Image.NEAREST)
    out = Image.new("RGBA", (size, size), background + (255,))
    out.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return out.convert("RGB")


# A square inside the maskable safe circle (diameter 80% of the icon) spans at most 0.8 / sqrt(2).
SAFE = 0.8 / math.sqrt(2)


def main():
    for folder, make, background, app in TARGETS:
        src = square(make())
        src.resize((48, 48), Image.LANCZOS).save(
            folder / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
        big(src, 180, background, 0.8).save(folder / "apple-touch-icon.png", optimize=True)
        if app:
            for size in (192, 512):
                big(src, size, background, 0.8).save(folder / f"icon-{size}.png", optimize=True)
                big(src, size, background, SAFE).save(
                    folder / f"icon-maskable-{size}.png", optimize=True)
        print("wrote icons in", folder)


if __name__ == "__main__":
    main()
