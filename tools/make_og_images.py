"""Make the link-preview images (Open Graph og:image) from the games' own start pages and sprites.

Usage: python3 -I tools/make_og_images.py

Writes og-image.jpg, 1200x630 pixels, into:
  web/       the landing page: both games' title bands, each on its own start page
  web/mlu1/  MLU 1's title band and pod on its blurred start page
  web/mlu2/  MLU 2's title band and pod on its blurred start page

The title bands are cut from the start pages where the launchers show them. Sprites are scaled
by whole numbers with hard pixel edges, as the games draw. The pods are layered by
make_icons.pod(): MLU 1's at the starting upgrades, MLU 2's at the top hull and drill. The caption uses Rockwell, the
landing page's title font, when Windows has it, else Pillow's built-in font. Needs Pillow.
"""
from pathlib import Path

import importlib.util

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

WEB = Path(__file__).resolve().parent.parent / "web"

# make_icons.py, beside this script, builds the pods (loaded by path: python3 -I does not put
# the script's folder on sys.path).
_spec = importlib.util.spec_from_file_location("make_icons", Path(__file__).with_name("make_icons.py"))
make_icons = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(make_icons)
W, H = 1200, 630

GAMES = {
    "mlu1": dict(
        start=WEB / "mlu1" / "images" / "startpage.jpg",
        band=(0, 10, 800, 88),          # the launcher's title band
        frame=(170, 17, 17),
        pod=lambda: make_icons.pod("mlu1"),
        minerals=["copper", "silver", "gold", "diamond", "dark matter"],
        caption="Shaken Snowglobe Edition",
        ink=(255, 210, 138),
    ),
    "mlu2": dict(
        start=WEB / "mlu2" / "images" / "startpage2.jpg",
        band=(60, 15, 760, 92),          # the launcher's title band
        frame=(154, 166, 184),
        pod=lambda: make_icons.pod("mlu2", hull=8, drill=7),
        minerals=["copper", "silver", "gold", "diamond", "alexxzandrite"],
        caption="MLU2: Crematoria",
        ink=(201, 210, 223),
    ),
}


def font(size):
    for name in ("ROCKB.TTF", "rockb.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def backdrop(start, size, blur=6, light=0.45):
    """The start page scaled to cover size, blurred and darkened, as behind the launchers."""
    img = Image.open(start).convert("RGB")
    k = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    left, top = (img.width - size[0]) // 2, (img.height - size[1]) // 2
    img = img.crop((left, top, left + size[0], top + size[1]))
    img = img.filter(ImageFilter.GaussianBlur(blur))
    return ImageEnhance.Brightness(img).enhance(light)


def framed_band(game, width):
    """The title band scaled to width, with the launcher's coloured frame and rounded corners."""
    band = Image.open(game["start"]).convert("RGB").crop(game["band"])
    band = band.resize((width, round(band.height * width / band.width)), Image.LANCZOS)
    border, radius = 4, 14
    out = Image.new("RGBA", (band.width + 2 * border, band.height + 2 * border))
    mask = Image.new("L", out.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *out.size), radius, fill=255)
    fill = Image.new("RGBA", out.size, game["frame"] + (255,))
    out.paste(fill, (0, 0), mask)
    inner = Image.new("L", band.size)
    ImageDraw.Draw(inner).rounded_rectangle((0, 0, *band.size), radius - border, fill=255)
    out.paste(band, (border, border), inner)
    return out


def sprite(path, k):
    img = Image.open(path).convert("RGBA")
    img = img.crop(img.getbbox())
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def shadowed(canvas, img, xy):
    """img on canvas at xy, over a soft drop shadow."""
    alpha = img.getchannel("A")
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.putalpha(alpha.point(lambda a: a * 0.6))
    pad = 24
    blurred = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad))
    blurred.alpha_composite(shadow, (pad, pad))
    blurred = blurred.filter(ImageFilter.GaussianBlur(8))
    canvas.alpha_composite(blurred, (xy[0] - pad, xy[1] - pad + 6))
    canvas.alpha_composite(img, xy)


def text(canvas, xy, words, size, ink, anchor="mm"):
    draw = ImageDraw.Draw(canvas)
    f = font(size)
    draw.text((xy[0], xy[1] + 3), words, font=f, fill=(0, 0, 0, 160), anchor=anchor)
    draw.text(xy, words, font=f, fill=ink + (255,), anchor=anchor)


def game_image(game):
    canvas = backdrop(game["start"], (W, H)).convert("RGBA")
    band = framed_band(game, 1080)
    shadowed(canvas, band, ((W - band.width) // 2, 56))
    pod = game["pod"]()
    pod = pod.resize((pod.width * 4, pod.height * 4), Image.NEAREST)
    minerals = [sprite(WEB / game["start"].parent.parent.name / "images" / f"{m}.png", 2)
                for m in game["minerals"]]
    gap = 28
    row = pod.width + gap * 2 + sum(m.width for m in minerals) + gap * (len(minerals) - 1)
    x, mid = (W - row) // 2, 330
    shadowed(canvas, pod, (x, mid - pod.height // 2))
    x += pod.width + gap * 2
    for m in minerals:
        shadowed(canvas, m, (x, mid - m.height // 2))
        x += m.width + gap
    text(canvas, (W // 2, 480), "Play in your browser", 64, (255, 255, 255))
    text(canvas, (W // 2, 552), game["caption"], 36, game["ink"])
    return canvas.convert("RGB")


def landing_image():
    canvas = Image.new("RGBA", (W, H))
    half = H // 2
    for i, key in enumerate(("mlu1", "mlu2")):
        game = GAMES[key]
        canvas.paste(backdrop(game["start"], (W, half), light=0.5), (0, i * half))
        band = framed_band(game, 1000)
        shadowed(canvas, band, ((W - band.width) // 2, i * half + 40))
        text(canvas, (W // 2, i * half + 40 + band.height + 70),
             "MLU 1" if key == "mlu1" else "MLU 2: Crematoria", 44, game["ink"])
    ImageDraw.Draw(canvas).line((0, half, W, half), fill=(0, 0, 0, 255), width=4)
    return canvas.convert("RGB")


def main():
    for key, game in GAMES.items():
        game_image(game).save(WEB / key / "og-image.jpg", quality=86, optimize=True)
    landing_image().save(WEB / "og-image.jpg", quality=86, optimize=True)
    for path in (WEB / "og-image.jpg", WEB / "mlu1" / "og-image.jpg", WEB / "mlu2" / "og-image.jpg"):
        print(path.relative_to(WEB.parent), path.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
