#!/usr/bin/env python3
"""Generates the Organization listing art for the Color Migration plugin.

The rows on the cover aren't invented — they're read straight out of the
mapping table the plugin ships (`code.js`'s embedded `mapping.json`), so the
cover can't drift from what the tool actually does. No screen or product UI
is rendered; only color chips and Foundation token names, which is the same
information the plugin's own list shows.

    python3 branding/make_assets.py
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
CODE_JS = os.path.join(HERE, '..', 'code.js')

BG = (18, 18, 21)
INK = (243, 243, 245)
MUTED = (138, 140, 148)
ACCENT = (13, 153, 255)          # Figma blue — neutral, matches Mockup's icon system
ROW_BG = (30, 31, 35)
LINE = (52, 53, 60)
OK = (61, 209, 138)
OK_BG = (22, 45, 37)

HELV = '/System/Library/Fonts/HelveticaNeue.ttc'
KR = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
KR_FACE = {'r': 0, 'm': 2, 'sb': 4, 'b': 6}


def font(size, index=0):
    return ImageFont.truetype(HELV, size, index=index)


def kfont(size, weight='r'):
    return ImageFont.truetype(KR, size, index=KR_FACE[weight])


def mono(size):
    return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', size)


# --------------------------------------------------------------------------
# pull four real rows out of the shipped mapping — same source the plugin reads
# --------------------------------------------------------------------------

def load_rows():
    src = open(CODE_JS, encoding='utf8').read()
    blob = re.search(r'/\* mapping:begin \*/(.*?)/\* mapping:end \*/', src, re.S).group(1)
    m = json.loads(blob)
    picks = [
        ('bdl', 'Semantic/Button/stock-correction', 'Button/stock-correction'),
        ('bdl', 'Semantic/Badge/blue2', 'Badge/blue2'),
        ('bdl', 'Semantic/Grade/Grade-4', 'Grade-4'),
        ('bdl', 'Semantic/Badge/red', 'Badge/red'),
    ]
    rows = []
    for sys, key, label in picks:
        e = m[sys][key]
        t = m['tokens'][e['target']]
        rows.append((label, e['light'], split_name(e['target']), t['light']))
    return rows, m['version']


def split_name(name):
    """Same convention the plugin's own dropdown uses: the last two path
    segments carry the name, the rest is a muted prefix above/below it."""
    p = name.split('/')
    if len(p) <= 2:
        return name, ''
    return '/'.join(p[-2:]), '/'.join(p[:-2])


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def shadow(size, box, radius, blur, spread, opacity, dy=10):
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(layer).rounded_rectangle(
        [x0 - spread, y0 - spread + dy, x1 + spread, y1 + spread + dy], radius + spread,
        fill=(0, 0, 0, opacity))
    return layer.filter(ImageFilter.GaussianBlur(blur))


# --------------------------------------------------------------------------
# cover art — 1920 x 1080
# --------------------------------------------------------------------------

def cover():
    rows, version = load_rows()
    W, H = 1920, 1080
    im = Image.new('RGBA', (W, H), BG + (255,))

    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([1020, 20, 2040, 1040], fill=(24, 34, 54, 255))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(200)))

    # --- right: a card of real mapping rows, drawn like the plugin's own list.
    # Widths are MEASURED, not guessed, so the card always fits whatever four
    # rows the mapping happens to hand it — a longer token name just widens
    # the card instead of clipping.
    fname = font(22, index=1)
    fkind = mono(16)
    fchip = font(20, index=1)
    fsub = font(15)
    fbadge = kfont(15, 'sb')

    meas = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    tw = lambda s, f: meas.textlength(s, font=f)
    sw = 56                                            # swatch side
    label_w = max(tw(r[0], fname) for r in rows)
    target_w = max(max(tw(r[2][0], fchip), tw(r[2][1], fsub)) for r in rows)
    badge_box = meas.textbbox((0, 0), '자동', font=fbadge)
    badge_w = badge_box[2] - badge_box[0] + 20
    badge_h = 30

    pad, row_h, gap = 24, 118, 14
    name_x, arrow_x = sw + 18, sw + 18 + label_w + 28
    tswatch_x = arrow_x + 42 + 28
    ttext_x = tswatch_x + sw + 18
    badge_x = ttext_x + target_w + 18
    content_w = badge_x + badge_w
    cw = pad * 2 + content_w
    cx, cy = 1780 - cw, 214                             # right-align to a fixed margin
    card_h = pad * 2 + len(rows) * row_h + (len(rows) - 1) * gap

    im = Image.alpha_composite(im, shadow((W, H), (cx, cy, cx + cw, cy + card_h), 28, 50, 6, 150))
    card = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle([cx, cy, cx + cw, cy + card_h], 28,
                                            fill=(24, 25, 29, 255), outline=(44, 45, 51, 255), width=2)
    im = Image.alpha_composite(im, card)

    d = ImageDraw.Draw(im)
    rx0 = cx + pad
    y = cy + pad
    for label, sv, (tname, tsub), tv in rows:
        d.rounded_rectangle([rx0, y, rx0 + content_w, y + row_h], 16, fill=ROW_BG + (255,))

        sx, sy = rx0, y + (row_h - sw) // 2
        d.rounded_rectangle([sx, sy, sx + sw, sy + sw], 12, fill=hex_to_rgb(sv) + (255,),
                             outline=(255, 255, 255, 30), width=1)
        d.text((rx0 + name_x, y + 30), label, font=fname, fill=INK)
        d.text((rx0 + name_x, y + 63), sv, font=fkind, fill=MUTED)

        ax = rx0 + arrow_x
        d.line([(ax, y + row_h // 2), (ax + 42, y + row_h // 2)], fill=(90, 92, 100, 255), width=3)
        d.polygon([(ax + 36, y + row_h // 2 - 8), (ax + 54, y + row_h // 2),
                   (ax + 36, y + row_h // 2 + 8)], fill=(90, 92, 100, 255))

        tsx = rx0 + tswatch_x
        d.rounded_rectangle([tsx, sy, tsx + sw, sy + sw], 12, fill=hex_to_rgb(tv) + (255,),
                             outline=(255, 255, 255, 30), width=1)
        d.text((rx0 + ttext_x, y + 22), tsub, font=fsub, fill=MUTED)
        d.text((rx0 + ttext_x, y + 42), tname, font=fchip, fill=INK)

        cbx, cby = rx0 + badge_x, y + (row_h - badge_h) // 2
        d.rounded_rectangle([cbx, cby, cbx + badge_w, cby + badge_h], 9, fill=OK_BG + (255,))
        bb = d.textbbox((0, 0), '자동', font=fbadge)
        d.text((cbx + (badge_w - bb[2]) / 2, cby + (badge_h - bb[3]) / 2 - 2), '자동', font=fbadge, fill=OK)
        y += row_h + gap

    # --- left: wordmark ------------------------------------------------------
    d.text((150, 372), 'Color', font=font(112, index=1), fill=INK)
    d.text((150, 484), 'Migration', font=font(112, index=1), fill=INK)
    d.text((156, 634), '레거시 컬러를 MDS 3.0 Foundation 변수로', font=kfont(34, 'm'), fill=MUTED)

    d.rounded_rectangle([156, 700, 402, 748], 24, outline=(70, 72, 82, 255), width=2)
    d.text((184, 712), 'Figma plugin · Organization', font=font(22), fill=MUTED)

    d.text((156, 792), f'매핑 {version} 기준 · 실제 변환 예시', font=kfont(20), fill=(90, 92, 100))

    im.convert('RGB').save(os.path.join(HERE, 'cover-1920x1080.png'))
    print('cover-1920x1080.png ·', len(rows), 'rows from mapping', version)


# --------------------------------------------------------------------------
# icon — 128 x 128, drawn at 8x and downsampled
# --------------------------------------------------------------------------

def icon():
    """Reads at 128px: two color chips trading places — a swap glyph, not a
    literal screenshot, so it stays legible on both light and dark chrome."""
    S, s = 1024, 128
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    d.rounded_rectangle([64, 64, S - 65, S - 65], 168, fill=ACCENT + (255,))

    # small chip (legacy, back-left) → large chip (Foundation, front-right)
    d.rounded_rectangle([180, 200, 460, 480], 56, fill=(255, 255, 255, 130))
    d.rounded_rectangle([320, 340, 844, 864], 84, fill=(255, 255, 255, 255))

    im.resize((s, s), Image.LANCZOS).save(os.path.join(HERE, 'icon-128.png'))
    print('icon-128.png')


if __name__ == '__main__':
    cover()
    icon()
