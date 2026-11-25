"""Make the site icons from the games' own sprites.

Usage: python3 -I tools/make_icons.py

Writes into web/ (the landing page), web/mlu1/ and web/mlu2/:
  favicon.ico           16, 32 and 48 pixels, transparent
  apple-touch-icon.png  180 pixels, on the page colour (iOS fills transparency with black)

and, into web/ only, the icons of the site's one web app manifest (web/site.webmanifest):
  icon-192.png, icon-512.png                    the sprite large, on the page colour
  icon-maskable-192.png, icon-maskable-512.png  the sprite inside the central safe circle (80% of
                                                the width), so Android can crop the icon to any shape

The landing page, the app and MLU 1 use MLU 1's flying pod (fly_0.png), MLU 2 its alexxzandrite
crystal. Large icons are scaled by a whole number with hard pixel edges, as the games draw; the
favicon sizes are smaller than the sprite, so they are resampled smoothly. Needs Pillow.
"""
import math
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent / "web"

TARGETS = [
    # folder, sprite, background colour of the opaque icons, also make the app icons
    (WEB, WEB / "mlu1" / "images" / "fly_0.png", (204, 102, 0), True),
    (WEB / "mlu1", WEB / "mlu1" / "images" / "fly_0.png", (204, 102, 0), False),
    (WEB / "mlu2", WEB / "mlu2" / "images" / "alexxzandrite.png", (34, 38, 46), False),
]


def square(sprite):
    """The sprite trimmed to its visible pixels and centred on a transparent square."""
    img = Image.open(sprite).convert("RGBA")
    img = img.crop(img.getbbox())
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
    for folder, sprite, background, app in TARGETS:
        src = square(sprite)
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
