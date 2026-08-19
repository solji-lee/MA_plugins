#!/usr/bin/env python3
"""Generates the Community listing art for the Mockup plugin.

The demo screen and the perspective quad are both synthetic — no product UI and
no brand marks go into the published art. The warp itself reuses the plugin's own
homography, so the cover is literally rendered by the thing it advertises.

    python3 branding/make_assets.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

BG = (18, 18, 21)
INK = (243, 243, 245)
MUTED = (138, 140, 148)
ACCENT = (13, 153, 255)          # Figma blue — neutral, not a brand colour
SURFACE = (255, 255, 255)

HELV = '/System/Library/Fonts/HelveticaNeue.ttc'


def font(size, index=0):
    try:
        return ImageFont.truetype(HELV, size, index=index)
    except Exception:
        return ImageFont.load_default()


# --------------------------------------------------------------------------
# a generic app screen — deliberately nobody's product
# --------------------------------------------------------------------------

def demo_screen(w=1179, h=2550):
    im = Image.new('RGBA', (w, h), SURFACE + (255,))
    d = ImageDraw.Draw(im)
    u = w / 393.0                                    # design in 393pt units

    def r(x0, y0, x1, y1, fill, rad=0):
        d.rounded_rectangle([x0 * u, y0 * u, x1 * u, y1 * u], rad * u, fill=fill)

    r(0, 0, 393, 96, (247, 248, 250, 255))           # status + header
    r(24, 40, 96, 52, (170, 174, 182, 255), 6)
    r(320, 38, 369, 54, (170, 174, 182, 255), 8)

    r(24, 120, 369, 156, (28, 28, 32, 255), 8)       # title
    r(24, 168, 250, 192, (196, 200, 208, 255), 8)

    r(24, 224, 369, 470, (245, 247, 250, 255), 20)   # hero card with a line chart
    pts = [(52, 420), (92, 386), (132, 398), (172, 344), (212, 360),
           (252, 300), (292, 322), (341, 262)]
    d.line([(x * u, y * u) for x, y in pts], fill=ACCENT + (255,), width=int(5 * u), joint='curve')
    for x, y in pts:
        d.ellipse([(x - 5) * u, (y - 5) * u, (x + 5) * u, (y + 5) * u], fill=ACCENT + (255,))
    r(52, 256, 190, 276, (150, 155, 165, 255), 6)

    bars = [96, 150, 118, 210, 176, 240, 132]        # bar chart card
    r(24, 502, 369, 760, (245, 247, 250, 255), 20)
    for i, bh in enumerate(bars):
        x0 = 56 + i * 44
        r(x0, 720 - bh, x0 + 26, 720, (28, 28, 32, 255) if i % 3 else ACCENT + (255,), 6)

    y = 800                                          # list rows
    for _ in range(4):
        r(24, y, 369, y + 76, (247, 248, 250, 255), 16)
        r(44, y + 22, 76, y + 54, (206, 210, 218, 255), 16)
        r(92, y + 26, 250, y + 44, (60, 62, 70, 255), 6)
        r(300, y + 28, 350, y + 42, (176, 180, 188, 255), 6)
        y += 90

    r(140, 2510, 253, 2518, (24, 24, 28, 255), 4)    # home indicator
    return im


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


# --------------------------------------------------------------------------
# the plugin's own warp
# --------------------------------------------------------------------------

def find_coeffs(dst, src):
    m = []
    for (dx, dy), (sx, sy) in zip(dst, src):
        m.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        m.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    return np.linalg.lstsq(np.array(m, float), np.array(src, float).reshape(8), rcond=None)[0]


def warp(src, corners, W, H, ss=2):
    sw, sh = src.size
    co = find_coeffs([(x * ss, y * ss) for x, y in corners],
                     [(0, 0), (sw, 0), (sw, sh), (0, sh)])
    big = src.transform((W * ss, H * ss), Image.PERSPECTIVE, co,
                        resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    return big.resize((W, H), Image.LANCZOS)


def shadow(size, corners, blur, spread, opacity):
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).polygon([(x, y + spread) for x, y in corners],
                                  fill=(0, 0, 0, opacity))
    return layer.filter(ImageFilter.GaussianBlur(blur))


# --------------------------------------------------------------------------
# cover art — 1920 x 1080
# --------------------------------------------------------------------------

def cover():
    W, H = 1920, 1080
    im = Image.new('RGBA', (W, H), BG + (255,))

    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([980, 40, 2000, 1060], fill=(30, 40, 62, 255))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(190)))

    screen = demo_screen()

    # --- left: the flat source frame ---------------------------------------
    fw, fh = 268, 580
    flat = screen.resize((fw, fh), Image.LANCZOS)
    flat.putalpha(rounded_mask((fw, fh), 26))
    fx, fy = 762, 250
    im = Image.alpha_composite(im, shadow((W, H), [(fx, fy), (fx + fw, fy), (fx + fw, fy + fh), (fx, fy + fh)], 34, 22, 150))
    im.paste(flat, (fx, fy), flat)

    # --- right: the same screen inlaid into a tilted device -----------------
    corners = [(1325, 214), (1690, 300), (1606, 900), (1245, 830)]
    inlaid = warp(screen, corners, W, H)

    body = [(1306, 190), (1711, 285), (1622, 924), (1225, 852)]
    im = Image.alpha_composite(im, shadow((W, H), body, 46, 34, 190))

    device = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(device)
    dd.polygon(body, fill=(46, 47, 54, 255))
    dd.polygon(corners, fill=(10, 10, 12, 255))
    im = Image.alpha_composite(im, device)
    im = Image.alpha_composite(im, inlaid)

    # a hairline on the screen edge sells the glass
    edge = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(edge).polygon(corners, outline=(255, 255, 255, 46), width=2)
    im = Image.alpha_composite(im, edge)

    d = ImageDraw.Draw(im)

    # --- the arrow between the two states ----------------------------------
    ay = 540
    d.line([(1078, ay), (1160, ay)], fill=MUTED + (255,), width=4)
    d.polygon([(1158, ay - 12), (1190, ay), (1158, ay + 12)], fill=MUTED + (255,))

    # --- wordmark ----------------------------------------------------------
    d.text((150, 430), 'Mockup', font=font(126, index=1), fill=INK)
    d.text((156, 604), 'Any screen, any mockup —', font=font(36), fill=MUTED)
    d.text((156, 654), 'fitted in perspective.', font=font(36), fill=MUTED)

    d.rounded_rectangle([156, 748, 396, 796], 24, outline=(70, 72, 82, 255), width=2)
    d.text((184, 761), 'Figma plugin', font=font(24), fill=MUTED)

    im.convert('RGB').save(os.path.join(HERE, 'cover-1920x1080.png'))
    print('cover-1920x1080.png')


# --------------------------------------------------------------------------
# icon — 128 x 128, drawn at 8x and downsampled
# --------------------------------------------------------------------------

def icon():
    """Reads at 128px: a bright panel set at an angle into a darker frame.

    No outer plate — Figma renders the icon small on light and dark chrome
    alike, so the mark carries its own contrast instead of a background.
    """
    S, s = 1024, 128
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    # the frame it gets set into
    d.rounded_rectangle([64, 64, S - 65, S - 65], 168, fill=ACCENT + (255,))
    # the panel, in perspective
    d.polygon([(268, 300), (760, 386), (716, 754), (226, 668)], fill=(255, 255, 255, 255))

    im.resize((s, s), Image.LANCZOS).save(os.path.join(HERE, 'icon-128.png'))
    print('icon-128.png')


if __name__ == '__main__':
    cover()
    icon()
