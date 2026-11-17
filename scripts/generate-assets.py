#!/usr/bin/env python3
"""
generate-assets.py -- procedurally drawn starfield app icon & splash screens.

Everything is drawn with Pillow (no network assets, no font files, no text),
so the output is fully reproducible:

    python3 scripts/generate-assets.py

Outputs (RGBA PNG, in ./assets):
    icon.png               1024 x 1024  full app icon (opaque, deep-space bg)
    icon-only.png          1024 x 1024  legacy icon, identical composition
    icon-foreground.png    1024 x 1024  adaptive-icon foreground, transparent
                                        around a ringed planet inside the 66%
                                        safe circle
    icon-background.png    1024 x 1024  adaptive-icon background (gradient+stars)
    splash.png             2732 x 2732  dark splash, small centred emblem
    splash-dark.png        2732 x 2732  darker variant of the splash
    splash-logo.png        1024 x 1024  transparent centred emblem used by the
                                        Android launch screen (never stretched)

Design: deep navy/black radial gradient (#0b0f1e -> #1b2340), scattered stars,
subtle nebula haze, a cyan gas-giant with a tilted golden ring, a small
constellation and a faint comet.  No text anywhere.

The script self-checks every file (size / mode / transparency / safe-zone).
"""

import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
ANDROID = os.path.join(ROOT, "android")
ANDROID_RES = os.path.join(ANDROID, "app", "src", "main", "res")
ANDROID_SPLASH_RES = os.path.join(ANDROID_RES, "drawable-nodpi")
SPLASH_LOGO_DP = 256  # launch logo 按 256dp 生成各密度，居中显示且不拉伸
SPLASH_LOGO_SIZE = 1024  # assets/ 中的源图
SPLASH_LOGO_DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}

# --------------------------------------------------------------------------
# palette
# --------------------------------------------------------------------------
BG_DEEP = (7, 10, 20)        # near-black navy
BG_MID = (27, 35, 64)        # #1b2340
BG_GLOW = (38, 52, 96)       # slightly lifted centre

PLANET_HI = (176, 240, 255)  # cyan highlight
PLANET_MID = (62, 148, 200)
PLANET_LO = (8, 30, 52)

RING_STOPS = [
    (0.00, (255, 251, 240)),
    (0.35, (246, 226, 182)),
    (0.68, (224, 192, 136)),
    (1.00, (158, 128, 84)),
]

STAR_WARM = (255, 235, 198)
STAR_WHITE = (236, 243, 255)
STAR_ICE = (196, 224, 255)
STAR_CYAN = (170, 230, 255)

# Cassiopeia-style "W" constellation, normalized canvas fractions.
# Icon version sits in the upper-left corner, clear of the ring.
ICON_CONSTELLATION = [
    (0.072, 0.262),
    (0.134, 0.150),
    (0.199, 0.240),
    (0.263, 0.148),
    (0.327, 0.242),
]

# Splash version floats above the emblem, kept near the horizontal centre so it
# survives the centre-crop Android performs on tall screens.
SPLASH_CONSTELLATION = [
    (0.368, 0.376),
    (0.432, 0.284),
    (0.499, 0.370),
    (0.566, 0.282),
    (0.633, 0.374),
]


# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------
def _lut(stops):
    """256-entry RGB lookup table from [(pos, (r,g,b)), ...] stops."""
    lut = []
    for i in range(256):
        t = i / 255.0
        for j in range(len(stops) - 1):
            p0, c0 = stops[j]
            p1, c1 = stops[j + 1]
            if p0 <= t <= p1:
                u = 0.0 if p1 == p0 else (t - p0) / (p1 - p0)
                lut.append(tuple(int(round(c0[k] + (c1[k] - c0[k]) * u)) for k in range(3)))
                break
        else:
            lut.append(stops[-1][1])
    return lut


def _mix(c0, c1, u):
    return tuple(int(round(c0[k] + (c1[k] - c0[k]) * u)) for k in range(3))


def linear_strip(size, stops, vertical=True):
    """RGBA gradient image of *size*."""
    w, h = size
    lut = _lut(stops)
    if vertical:
        strip = Image.new("RGB", (1, h))
        for y in range(h):
            strip.putpixel((0, y), lut[min(255, int(y / max(1, h - 1) * 255))])
        return strip.resize((w, h), Image.Resampling.BILINEAR).convert("RGBA")
    strip = Image.new("RGB", (w, 1))
    for x in range(w):
        strip.putpixel((x, 0), lut[min(255, int(x / max(1, w - 1) * 255))])
    return strip.resize((w, h), Image.Resampling.BILINEAR).convert("RGBA")


def radial_gradient(size, stops, cx=0.5, cy=0.42, squash=1.0, low=320):
    """Smooth elliptical radial gradient (rendered small, then upscaled)."""
    lut = _lut(stops)
    small = Image.new("RGB", (low, low))
    px = small.load()
    maxd = math.hypot(max(cx, 1.0 - cx), max(cy, 1.0 - cy) * squash) or 1.0
    for y in range(low):
        ny = (y + 0.5) / low
        dy = (ny - cy) * squash
        for x in range(low):
            nx = (x + 0.5) / low
            d = min(1.0, math.hypot(nx - cx, dy) / maxd)
            px[x, y] = lut[int(d * 255)]
    return small.resize(size, Image.Resampling.BICUBIC).convert("RGBA")


def radial_alpha_mask(size, cx, cy, inner=0.0, outer=1.0, low=256, invert=False):
    """L-mode mask: 255 inside *inner* radius, fading to 0 at *outer*."""
    small = Image.new("L", (low, low))
    px = small.load()
    for y in range(low):
        ny = (y + 0.5) / low
        for x in range(low):
            nx = (x + 0.5) / low
            d = math.hypot(nx - cx, (ny - cy)) / max(1e-6, outer)
            v = 0.0 if d <= inner else min(1.0, (d - inner) / max(1e-6, 1.0 - inner))
            v = 1.0 - v
            if invert:
                v = 1.0 - v
            px[x, y] = int(v * 255)
    return small.resize(size, Image.Resampling.BICUBIC)


def add_nebula(img, blobs):
    """Soft coloured haze. blobs: [(nx, ny, rx, ry, rgb, alpha), ...]"""
    w, h = img.size
    low = 384
    layer = Image.new("RGBA", (low, low), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for nx, ny, rx, ry, col, alpha in blobs:
        d.ellipse(
            [(nx - rx) * low, (ny - ry) * low, (nx + rx) * low, (ny + ry) * low],
            fill=col + (alpha,),
        )
    layer = layer.filter(ImageFilter.GaussianBlur(low * 0.09))
    layer = layer.resize((w, h), Image.Resampling.BICUBIC)
    return Image.alpha_composite(img, layer)


# --------------------------------------------------------------------------
# star sprites
# --------------------------------------------------------------------------
_SPRITE_CACHE = {}


def star_sprite(color, px, strength=1.0):
    """A glowing 4-point star sprite, cached by (colour, size, strength)."""
    px = max(6, int(px))
    strength = round(max(0.0, strength), 2)
    key = (color, px, strength)
    if key in _SPRITE_CACHE:
        return _SPRITE_CACHE[key]

    s = px
    c = s / 2.0
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    for i in range(26, 0, -1):
        t = i / 26.0
        r = c * 0.94 * t
        a = int(96 * strength * (1.0 - t) ** 2.1)
        dg.ellipse([c - r, c - r, c + r, c + r], fill=color + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(max(0.8, s * 0.035)))

    spikes = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ds = ImageDraw.Draw(spikes)
    for ang, frac, alpha in (
        (0.0, 0.98, 170),
        (90.0, 0.98, 170),
        (45.0, 0.46, 80),
        (135.0, 0.46, 80),
    ):
        rad = math.radians(ang)
        dx, dy = math.cos(rad), math.sin(rad)
        length = c * frac
        # taper the spike by drawing a few short segments
        segs = 10
        for k in range(segs):
            t0 = k / segs
            t1 = (k + 1) / segs
            x0, y0 = c + dx * length * t0, c + dy * length * t0
            x1, y1 = c + dx * length * t1, c + dy * length * t1
            wdt = max(1, int(round((1.0 - t0) * s * 0.035 * 2)))
            ds.line([x0, y0, x1, y1],
                    fill=color + (int(alpha * strength * (1.0 - t0) ** 1.4),), width=wdt)
    spikes = spikes.filter(ImageFilter.GaussianBlur(max(0.6, s * 0.018)))

    core = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    dc = ImageDraw.Draw(core)
    rc = max(1.0, s * 0.045)
    dc.ellipse([c - rc, c - rc, c + rc, c + rc], fill=(255, 255, 255, 255))
    core = core.filter(ImageFilter.GaussianBlur(max(0.4, s * 0.012)))

    out = Image.alpha_composite(glow, spikes)
    out = Image.alpha_composite(out, core)
    _SPRITE_CACHE[key] = out
    return out


def paste_sprite(img, sprite, cx, cy):
    """Paste a sprite centred on (cx, cy), clipping at the canvas edge.

    NOTE: ``Image.Image.alpha_composite`` composites IN PLACE and returns
    ``None`` (unlike the module level ``Image.alpha_composite``), so it must
    never be used on the right hand side of an assignment.
    """
    w, h = img.size
    sw, sh = sprite.size
    x, y = int(round(cx - sw / 2)), int(round(cy - sh / 2))
    x = max(0, min(w - sw, x)) if sw <= w else 0
    y = max(0, min(h - sh, y)) if sh <= h else 0
    img.alpha_composite(sprite, dest=(x, y))
    return img


def add_starfield(img, rng, count, sparkle_count=8, bright_frac=0.05,
                  avoid=None, scale=1.0, soft=1.0):
    """Crisp stars + soft halos + a handful of 4-point sparkles.

    avoid: (cx, cy, radius) region where no *bright* star is placed.
    scale: relative star size (down for huge canvases that are viewed scaled).
    soft:  halo/glow strength multiplier (down for large canvases).
    """
    w, h = img.size
    u = w / 1024.0  # design unit scale

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dg = ImageDraw.Draw(glow)
    core = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dc = ImageDraw.Draw(core)
    bright = []

    for _ in range(count):
        x = rng.uniform(0, w)
        y = rng.uniform(0, h)
        b = rng.random()
        if avoid:
            ax, ay, ar = avoid
            if math.hypot(x - ax, y - ay) < ar and b > 0.35:
                continue
        roll = rng.random()
        if roll < 0.62:
            col = STAR_WHITE
        elif roll < 0.80:
            col = STAR_ICE
        elif roll < 0.92:
            col = STAR_WARM
        else:
            col = STAR_CYAN
        r = (0.45 + b ** 3.2 * 2.1) * scale * u * 1.15
        # halo
        hr = r * (2.2 + 2.0 * b)
        dg.ellipse([x - hr, y - hr, x + hr, y + hr],
                   fill=col + (int((12 + 74 * b ** 2) * soft),))
        # core
        rr = max(0.55, r)
        bright_core = b > 0.72
        if bright_core:
            dc.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 255, 255, 255))
        else:
            dc.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col + (int(120 + 120 * b),))
        if rng.random() < bright_frac:
            bright.append((x, y, col, 0.55 + 0.45 * rng.random()))

    glow = glow.filter(ImageFilter.GaussianBlur(max(1.0, w * 0.005)))
    img = Image.alpha_composite(img, glow)
    img = Image.alpha_composite(img, core)

    for x, y, col, sb in bright:
        size = int((7 + 13 * sb) * u * max(0.72, scale))
        sprite = star_sprite(col, size, strength=min(1.0, 0.55 + 0.45 * soft))
        img = paste_sprite(img, sprite, x, y)

    # a few explicit warm sparkles (4-point)
    for _ in range(sparkle_count):
        x = rng.uniform(0.04, 0.96) * w
        y = rng.uniform(0.04, 0.96) * h
        if avoid:
            ax, ay, ar = avoid
            if math.hypot(x - ax, y - ay) < ar * 1.1:
                continue
        sprite = star_sprite(STAR_WARM, int(rng.uniform(11, 22) * u * max(0.72, scale)))
        img = paste_sprite(img, sprite, x, y)
    return img



# --------------------------------------------------------------------------
# background
# --------------------------------------------------------------------------
def make_background(size, dark=False, stars=240, star_seed=7, nebula=True,
                    star_scale=1.0, star_soft=1.0):
    """Deep-space gradient background with optional haze + starfield."""
    w, h = size
    if dark:
        stops = [
            (0.00, (26, 33, 58)),
            (0.42, (14, 18, 36)),
            (0.78, (8, 10, 20)),
            (1.00, (4, 5, 11)),
        ]
    else:
        stops = [
            (0.00, BG_GLOW),
            (0.30, BG_MID),
            (0.68, BG_DEEP),
            (1.00, (5, 7, 14)),
        ]
    img = radial_gradient(size, stops, cx=0.5, cy=0.42, squash=0.92)

    # gentle vertical bias so the bottom falls off to black
    vgrad = linear_strip(size, [(0.0, (12, 16, 30)), (1.0, (0, 0, 0))])
    img = Image.blend(img, vgrad, 0.22 if not dark else 0.32)

    if nebula:
        blobs = [
            (0.16, 0.20, 0.30, 0.20, (54, 60, 132), 46 if not dark else 30),
            (0.82, 0.28, 0.30, 0.20, (22, 88, 104), 38 if not dark else 24),
            (0.66, 0.86, 0.34, 0.17, (66, 34, 88), 34 if not dark else 22),
            (0.44, 0.52, 0.40, 0.36, (32, 58, 116), 26 if not dark else 18),
        ]
        img = add_nebula(img, blobs)

    if stars:
        rng = random.Random(star_seed)
        img = add_starfield(img, rng, stars, sparkle_count=int(stars * 0.03),
                            avoid=(0.5 * w, 0.48 * h, w * 0.30),
                            scale=star_scale, soft=star_soft)
    return img


def add_vignette(img, strength=105, cx=0.5, cy=0.48, inner=0.30, outer=0.82):
    w, h = img.size
    mask = radial_alpha_mask((w, h), cx, cy, inner=inner, outer=outer, low=256, invert=True)
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dark.putalpha(ImageChops.multiply(mask, Image.new("L", (w, h), 255 - strength)))
    return Image.alpha_composite(img, dark)


# --------------------------------------------------------------------------
# the ringed-planet emblem
# --------------------------------------------------------------------------
def make_sphere_sprite(px, hi, mid, lo, bands=True):
    """Lighting-shaded sphere (Lambert + latitude banding + antialiased rim)."""
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    pm = img.load()
    lx, ly, lz = -0.52, -0.62, 0.59
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    c = (px - 1) / 2.0
    for y in range(px):
        ny = (y - c) / c
        for x in range(px):
            nx = (x - c) / c
            d2 = nx * nx + ny * ny
            if d2 > 1.0:
                continue
            nz = math.sqrt(max(0.0, 1.0 - d2))
            lam = nx * lx + ny * ly + nz * lz
            t = max(0.0, lam) ** 0.85
            if t < 0.5:
                col = _mix(lo, mid, t / 0.5)
            else:
                col = _mix(mid, hi, (t - 0.5) / 0.5)
            shade = 0.82 + 0.18 * nz                     # limb darkening
            if bands:
                shade *= 0.94 + 0.06 * (0.5 + 0.5 * math.sin(ny * 9.5 + 0.7))
            edge = (1.0 - math.sqrt(d2)) * c * 1.6       # antialias fringe
            a = 255 if edge >= 1.0 else max(0, int(255 * edge))
            pm[x, y] = (
                min(255, int(col[0] * shade)),
                min(255, int(col[1] * shade)),
                min(255, int(col[2] * shade)),
                a,
            )
    return img


def make_ring_layer(R, side):
    """Axis-aligned ring band (to be rotated as a whole)."""
    rc = side / 2.0
    A, B = 1.80 * R, 0.62 * R      # outer ellipse semi-axes
    a, b = 1.20 * R, 0.413 * R     # inner ellipse semi-axes (same plane ratio)

    outer = Image.new("L", (side, side), 0)
    ImageDraw.Draw(outer).ellipse([rc - A, rc - B, rc + A, rc + B], fill=255)
    inner = Image.new("L", (side, side), 0)
    ImageDraw.Draw(inner).ellipse([rc - a, rc - b, rc + a, rc + b], fill=255)
    band = ImageChops.subtract(outer, inner)

    grad = linear_strip((side, side), RING_STOPS)
    ring = Image.composite(grad, Image.new("RGBA", (side, side), (0, 0, 0, 0)), band)

    # slightly translucent: the planet reads faintly through the front of the ring
    ring.putalpha(ring.getchannel("A").point(lambda v: v * 228 // 255))

    # soft concentric grooves inside the band (kept low-contrast on purpose)
    d = ImageDraw.Draw(ring)
    for frac, alpha in ((0.26, 20), (0.50, 28), (0.74, 22)):
        aa = a + (A - a) * frac
        bb = b + (B - b) * frac
        d.ellipse([rc - aa, rc - bb, rc + aa, rc + bb],
                  outline=(150, 122, 82, alpha), width=max(1, int(R * 0.010)))
    # gently lit edges
    d.ellipse([rc - A, rc - B, rc + A, rc + B],
              outline=(255, 251, 238, 150), width=max(2, int(R * 0.014)))
    d.ellipse([rc - a, rc - b, rc + a, rc + b],
              outline=(255, 246, 226, 108), width=max(2, int(R * 0.011)))

    return ring.filter(ImageFilter.GaussianBlur(max(0.5, R * 0.006)))


def draw_emblem(img, cx, cy, R, glow_alpha=78, moon=True, seed=11, tilt_deg=-18.0):
    """Composite the ringed planet + glow onto *img* (RGBA)."""
    w, h = img.size
    u = R / 178.0

    # ---- soft bloom behind the planet ----
    low = 256
    bc = low / 2.0
    bloom = Image.new("RGBA", (low, low), (0, 0, 0, 0))
    db = ImageDraw.Draw(bloom)
    for i in range(30, 0, -1):
        t = i / 30.0
        rr = bc * 0.96 * t
        db.ellipse([bc - rr, bc - rr, bc + rr, bc + rr],
                   fill=(74, 146, 224, int(glow_alpha * (1.0 - t) ** 1.8)))
    bloom = bloom.filter(ImageFilter.GaussianBlur(low * 0.09))
    bloom = bloom.resize((w, h), Image.Resampling.BICUBIC)
    img = Image.alpha_composite(img, bloom)

    # ---- ring geometry ----
    side = int(R * 4.6) | 1
    rc = side / 2.0
    ring = make_ring_layer(R, side)

    def rot(layer):
        return layer.rotate(tilt_deg, resample=Image.Resampling.BICUBIC,
                            center=(rc, rc))

    dx = int(round(cx - rc))
    dy = int(round(cy - rc))
    img.alpha_composite(rot(ring), dest=(dx, dy))  # whole ring, behind the planet

    # ---- planet ----
    sprite_px = 384
    planet = make_sphere_sprite(sprite_px, PLANET_HI, PLANET_MID, PLANET_LO)
    planet = planet.resize((int(2 * R), int(2 * R)), Image.Resampling.LANCZOS)
    img.alpha_composite(planet, dest=(int(round(cx - R)), int(round(cy - R))))

    # thin atmosphere rim
    rim = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(rim).ellipse(
        [cx - R - 2 * u, cy - R - 2 * u, cx + R + 2 * u, cy + R + 2 * u],
        outline=(150, 226, 255, 110), width=max(2, int(R * 0.022)))
    rim = rim.filter(ImageFilter.GaussianBlur(max(1.0, R * 0.035)))
    img = Image.alpha_composite(img, rim)

    # ---- near half of the ring, redrawn only where the planet hid it ----
    # Outside the planet silhouette the full ring above is already correct, so
    # clipping the redraw to the planet disc keeps the halves perfectly seamless.
    near = Image.new("L", (side, side), 0)
    ImageDraw.Draw(near).rectangle([0, rc, side, side], fill=255)
    disc = Image.new("L", (side, side), 0)
    ImageDraw.Draw(disc).ellipse(
        [rc - R - 1, rc - R - 1, rc + R + 1, rc + R + 1], fill=255)
    near = ImageChops.multiply(near, disc)
    front = ring.copy()
    front.putalpha(ImageChops.multiply(front.getchannel("A"), near))
    img.alpha_composite(rot(front), dest=(dx, dy))

    # ---- small moon ----
    if moon:
        mr = max(3, int(R * 0.155))
        mx, my = cx + 1.62 * R, cy - 1.46 * R
        m = make_sphere_sprite(96, (222, 226, 236), (130, 136, 152), (30, 33, 44), bands=False)
        m = m.resize((mr * 2, mr * 2), Image.Resampling.LANCZOS)
        img.alpha_composite(m, dest=(int(round(mx - mr)), int(round(my - mr))))
        halo = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(halo).ellipse(
            [mx - mr * 2.0, my - mr * 2.0, mx + mr * 2.0, my + mr * 2.0],
            fill=(170, 200, 255, 26))
        halo = halo.filter(ImageFilter.GaussianBlur(mr * 1.4))
        img = Image.alpha_composite(img, halo)
    return img


def draw_constellation(img, pts, line_alpha=95, node_px=24):
    w, h = img.size
    u = w / 1024.0
    pts_px = [(x * w, y * h) for x, y in pts]
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(pts_px, fill=(132, 172, 255, line_alpha),
           width=max(1, int(round(2.0 * u))), joint="curve")
    layer = layer.filter(ImageFilter.GaussianBlur(max(0.5, 0.7 * u)))
    img = Image.alpha_composite(img, layer)
    for x, y in pts_px:
        sprite = star_sprite((198, 222, 255), int(round(node_px * u)))
        img = paste_sprite(img, sprite, x, y)
    return img


def draw_comet(img, cx, cy, length, angle_deg, u=1.0):
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    a = math.radians(angle_deg)
    steps = 70
    for i in range(steps):
        t = i / (steps - 1)
        px = cx + math.cos(a) * length * t
        py = cy + math.sin(a) * length * t
        rad = u * (9.0 * (1.0 - t) ** 1.7 + 0.6)
        alpha = int(110 * (1.0 - t) ** 2.6)
        d.ellipse([px - rad, py - rad, px + rad, py + rad],
                  fill=(168, 208, 255, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(max(1.0, 1.6 * u)))
    img = Image.alpha_composite(img, layer)
    head = star_sprite((255, 240, 198), int(round(30 * u)))
    return paste_sprite(img, head, cx, cy)


# --------------------------------------------------------------------------
# the six output images
# --------------------------------------------------------------------------
def build_icon(size=1024):
    img = make_background((size, size), stars=int(240 * (size / 1024) ** 2),
                          star_seed=7, nebula=True)
    img = img.convert("RGBA")
    img = draw_constellation(img, ICON_CONSTELLATION, line_alpha=88, node_px=24)
    img = draw_emblem(img, size * 0.5, size * 0.505, R=size * 0.174,
                      glow_alpha=80, seed=11)
    rng = random.Random(101)
    img = add_starfield(img, rng, int(70 * (size / 1024) ** 2), sparkle_count=4,
                        bright_frac=0.12, avoid=(size * 0.5, size * 0.505, size * 0.30))
    img = draw_comet(img, size * 0.795, size * 0.795,
                     length=size * 0.20, angle_deg=-36, u=size / 1024)
    img = add_vignette(img, strength=110, inner=0.34, outer=0.86)
    return img


def build_foreground(size=1024):
    """Transparent adaptive-icon foreground: planet + ring inside 66% safe circle."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    R = size * 0.182  # ring span ~62% of canvas, inside the 66% safe circle
    img = draw_emblem(img, size * 0.5, size * 0.5, R=R, glow_alpha=60,
                      moon=False, seed=11)
    # fixed key sparkles in the free corners around the ring (all inside the
    # central 66% circle, and no star-sized speck lands on the artwork itself)
    for fx, fy, px, warm in (
        (0.292, 0.292, 27, True),
        (0.708, 0.292, 22, False),
        (0.290, 0.716, 20, False),
        (0.716, 0.716, 25, True),
        (0.500, 0.218, 17, True),
        (0.500, 0.792, 15, False),
    ):
        sprite = star_sprite(STAR_WARM if warm else STAR_ICE,
                             int(px * size / 1024))
        img = paste_sprite(img, sprite, fx * size, fy * size)
    return img


def build_background_icon(size=1024):
    img = make_background((size, size), stars=int(300 * (size / 1024) ** 2),
                          star_seed=99, nebula=True)
    return img.convert("RGBA")


def build_splash(size=2732, dark=False):
    # Splash art is displayed at ~1/2.5 of its source size on a phone, so its
    # stars are drawn smaller/softer than the icon's to avoid a "bokeh dust"
    # look once the bitmap is scaled down by the platform.
    img = make_background((size, size), dark=dark,
                          stars=int(150 * (size / 1024) ** 2),
                          star_seed=41 if not dark else 42, nebula=True,
                          star_scale=0.82, star_soft=0.60)
    img = img.convert("RGBA")
    img = draw_constellation(img, SPLASH_CONSTELLATION, line_alpha=76, node_px=17)
    R = size * 0.048  # ring span ~ 17% of the square, ~35% of a phone's width
    img = draw_emblem(img, size * 0.5, size * 0.5, R=R,
                      glow_alpha=95 if not dark else 74, moon=False, seed=11)
    rng = random.Random(55 if not dark else 56)
    img = add_starfield(img, rng, int(26 * (size / 1024) ** 2), sparkle_count=4,
                        bright_frac=0.12, avoid=(size * 0.5, size * 0.5, size * 0.20),
                        scale=0.85, soft=0.65)
    img = add_vignette(img, strength=120, inner=0.32, outer=0.85)
    return img


# --------------------------------------------------------------------------
# self-check
# --------------------------------------------------------------------------
EXPECTED = {
    "icon.png": (1024, 1024),
    "icon-only.png": (1024, 1024),
    "icon-foreground.png": (1024, 1024),
    "icon-background.png": (1024, 1024),
    "splash.png": (2732, 2732),
    "splash-dark.png": (2732, 2732),
}


def self_check():
    print("\n== self-check ==")
    ok = True
    for name, (ew, eh) in EXPECTED.items():
        path = os.path.join(ASSETS, name)
        im = Image.open(path)
        size_ok = im.size == (ew, eh)
        mode_ok = im.mode == "RGBA"
        alpha = im.getchannel("A")
        amin, amax = alpha.getextrema()
        extra = ""
        if name == "icon-foreground.png":
            # visible content must sit inside the central 66% circle
            thresh = alpha.point(lambda v: 255 if v >= 40 else 0)
            bbox = thresh.getbbox()
            safe = 0.17 * ew
            corner_alpha = min(
                im.getpixel((0, 0))[3], im.getpixel((ew - 1, 0))[3],
                im.getpixel((0, eh - 1))[3], im.getpixel((ew - 1, eh - 1))[3])
            safe_ok = bbox is not None and bbox[0] >= safe and bbox[1] >= safe \
                and bbox[2] <= ew - safe and bbox[3] <= eh - safe
            transparent_ok = corner_alpha == 0
            extra = f" bbox={bbox} corners_a={corner_alpha}"
            ok = ok and safe_ok and transparent_ok
        else:
            extra = f" alpha_min={amin}"
            if name.startswith("icon-") and name != "icon-background.png":
                ok = ok and amin == 255
            elif name == "icon-background.png":
                ok = ok and amin == 255
            else:
                ok = ok and amin == 255
        size = im.size
        good = size_ok and mode_ok
        ok = ok and good
        print(f"  {'PASS' if good else 'FAIL'}  {name:<22} {size[0]}x{size[1]} {im.mode}{extra}")
    print("== self-check:", "ALL GOOD" if ok else "PROBLEMS FOUND", "==\n")
    return ok


def _progress(name, im):
    print(f"  wrote assets/{name}  {im.size[0]}x{im.size[1]} {im.mode}")


def main():
    os.makedirs(ASSETS, exist_ok=True)
    print("rendering procedural starfield assets ...")

    icon = build_icon(1024)
    icon.save(os.path.join(ASSETS, "icon.png"))
    _progress("icon.png", icon)
    icon.save(os.path.join(ASSETS, "icon-only.png"))
    _progress("icon-only.png", icon)

    fg = build_foreground(1024)
    fg.save(os.path.join(ASSETS, "icon-foreground.png"))
    _progress("icon-foreground.png", fg)

    # 启动页居中 logo：透明背景；Android 只做居中、不做拉伸，按各密度生成
    splash_logo = fg.resize((SPLASH_LOGO_SIZE, SPLASH_LOGO_SIZE), Image.LANCZOS)
    splash_logo.save(os.path.join(ASSETS, "splash-logo.png"))
    _progress("splash-logo.png", splash_logo)

    bg = build_background_icon(1024)
    bg.save(os.path.join(ASSETS, "icon-background.png"))
    _progress("icon-background.png", bg)

    splash = build_splash(2732, dark=False)
    splash.save(os.path.join(ASSETS, "splash.png"))
    _progress("splash.png", splash)

    splash_dark = build_splash(2732, dark=True)
    splash_dark.save(os.path.join(ASSETS, "splash-dark.png"))
    _progress("splash-dark.png", splash_dark)

    # Android 启动页资源：深色星空底（无可识别主体，可铺满）+ 居中 logo（不缩放）。
    # 直接把方形原图设成 window background 会被系统拉伸到屏幕比例，圆形行星会
    # 被压扁；改用 layer-list（launch_background.xml）后主体始终等比居中。
    if os.path.isdir(ANDROID):
        os.makedirs(ANDROID_SPLASH_RES, exist_ok=True)
        bg.save(os.path.join(ANDROID_SPLASH_RES, "splash_background.png"))
        for density, scale in SPLASH_LOGO_DENSITIES.items():
            out = os.path.join(ANDROID_RES, "drawable-" + density)
            os.makedirs(out, exist_ok=True)
            size = int(round(SPLASH_LOGO_DP * scale))
            logo = fg.resize((size, size), Image.LANCZOS)
            logo.save(os.path.join(out, "splash_logo.png"), optimize=True)
        print(
            "  wrote android/app/src/main/res/drawable-nodpi/"
            "splash_background.png + drawable-{mdpi..xxxhdpi}/splash_logo.png"
        )

    if not self_check():
        raise SystemExit(1)


if __name__ == "__main__":
    main()
