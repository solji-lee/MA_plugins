#!/usr/bin/env python3
"""Renders the three step images for the mockup-kit "How to Replace" guide.

These are drawn from the plugin's own UI spec (ui.html), not screenshotted, so
they can be regenerated whenever the panel changes.

    python3 guide/make_guide_art.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
S = 4                                    # render scale

KR = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
FACE = {'r': 0, 'm': 2, 'sb': 4, 'b': 6}

INK = (30, 30, 30)
MUTED = (126, 126, 126)
LINE = (179, 179, 179)
ROW = (242, 242, 242)
BLUE = (13, 153, 255)
WHITE = (255, 255, 255)
GREEN = (48, 164, 108)

# Figma's own dark chrome, for the layers-panel illustration
FIG_BG = (44, 44, 44)
FIG_ROW = (24, 24, 24)
FIG_SEL = (13, 110, 200)
FIG_INK = (255, 255, 255)
FIG_MUTED = (155, 155, 155)


EMOJI = '/System/Library/Fonts/Apple Color Emoji.ttc'
EMOJI_STRIKE = 160          # the only bitmap strike Pillow will accept


def f(size, weight='r'):
    return ImageFont.truetype(KR, int(size * S), index=FACE[weight])


def emoji(im, char, x, y, size):
    """Composite a colour emoji — Apple's font only renders at one fixed size,
    so draw it big and scale down."""
    tile = Image.new('RGBA', (EMOJI_STRIKE * 2, EMOJI_STRIKE * 2), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((0, 0), char, font=ImageFont.truetype(EMOJI, EMOJI_STRIKE),
                              embedded_color=True)
    bbox = tile.getbbox()
    if not bbox:
        return
    px = int(size * S)
    im.alpha_composite(tile.crop(bbox).resize((px, px), Image.LANCZOS), (int(x), int(y)))


def shadowed(im, box, radius, blur=18, opacity=46, dy=6):
    """Drop a soft shadow behind a rounded box on a transparent layer."""
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [box[0], box[1] + dy * S, box[2], box[3] + dy * S], radius, fill=(0, 0, 0, opacity))
    return Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(blur * S / 4)))


# ---------------------------------------------------------------------------
# step 1 — two layers picked in the layers panel
# ---------------------------------------------------------------------------

def step1():
    W, H = 360 * S, 300 * S
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    im = shadowed(im, [20 * S, 20 * S, 340 * S, 280 * S], 10 * S)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([20 * S, 20 * S, 340 * S, 280 * S], 10 * S, fill=FIG_BG)

    d.text((36 * S, 34 * S), 'Layers', font=f(11, 'sb'), fill=FIG_INK)

    rows = [
        (0, None, 'iPhone 15 Pro', False),
        (1, None, 'Group', False),
        (2, None, 'display-frame', False),
        (2, None, 'Screen', False),
        (3, '\U0001F448', '', True),             # 👈 — the screen surface
        (3, None, 'mask', False),
        (2, '\U0001F3A8', 'change color here', False),
        (0, None, 'Your UI Frame', True),
    ]
    y = 56 * S
    for depth, icon, label, sel in rows:
        if sel:
            d.rounded_rectangle([28 * S, y - 3 * S, 332 * S, y + 18 * S], 3 * S, fill=FIG_SEL)
        x = (40 + depth * 13) * S
        d.rounded_rectangle([x, y + 3 * S, x + 9 * S, y + 12 * S], 2 * S,
                            outline=FIG_INK if sel else FIG_MUTED, width=max(1, S // 2))
        tx = x + 16 * S
        if icon:
            emoji(im, icon, tx, y + S, 13)
            tx += 17 * S
        if label:
            d.text((tx, y), label, font=f(10.5, 'sb' if sel else 'r'),
                   fill=FIG_INK if sel else FIG_MUTED)
        y += 24 * S

    d.text((36 * S, 250 * S), '2 layers selected', font=f(10, 'm'), fill=(120, 200, 255))
    return im


# ---------------------------------------------------------------------------
# the plugin panel itself, drawn from ui.html
# ---------------------------------------------------------------------------

def panel(highlight=None):
    """highlight: None | 'detect' | 'apply'"""
    PW, PH = 320, 292
    W, H = (PW + 40) * S, (PH + 40) * S
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    box = [20 * S, 20 * S, (20 + PW) * S, (20 + PH) * S]
    im = shadowed(im, box, 8 * S)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, 8 * S, fill=WHITE)

    ox, oy = 20 * S, 20 * S

    # window chrome
    d.rounded_rectangle([ox, oy, ox + PW * S, oy + 34 * S], 8 * S, fill=(247, 247, 247))
    d.rectangle([ox, oy + 26 * S, ox + PW * S, oy + 34 * S], fill=(247, 247, 247))
    d.line([ox, oy + 34 * S, ox + PW * S, oy + 34 * S], fill=(228, 228, 228), width=max(1, S // 2))
    d.rounded_rectangle([ox + 12 * S, oy + 11 * S, ox + 24 * S, oy + 23 * S], 3 * S, fill=BLUE)
    d.polygon([(ox + 15 * S, oy + 14 * S), (ox + 21.5 * S, oy + 15.2 * S),
               (ox + 21 * S, oy + 20.5 * S), (ox + 14.6 * S, oy + 19.3 * S)], fill=WHITE)
    d.text((ox + 31 * S, oy + 11 * S), 'Mockup', font=f(11, 'sb'), fill=INK)
    cx, cy = ox + PW * S - 20 * S, oy + 17 * S
    for dx, dy in ((-4, -4, ), (-4, 4)):
        d.line([cx + dx * S, cy + dy * S, cx - dx * S, cy - dy * S], fill=MUTED, width=max(1, S // 2))

    y = oy + 34 * S + 12 * S
    pad = 12 * S

    # detected screen / source rows
    for tag, icon, val in (('화면', '\U0001F448', '344×636'),
                           ('소스', None, 'Your UI Frame  393×850')):
        d.rounded_rectangle([ox + pad, y, ox + PW * S - pad, y + 30 * S], 6 * S, fill=ROW)
        if highlight == 'detect':
            d.rounded_rectangle([ox + pad, y, ox + PW * S - pad, y + 30 * S], 6 * S,
                                outline=BLUE, width=max(2, S // 2))
        d.text((ox + pad + 8 * S, y + 8 * S), tag, font=f(11, 'sb'), fill=MUTED)
        vx = ox + pad + 60 * S
        if icon:
            emoji(im, icon, vx, y + 8 * S, 13)
            vx += 18 * S
        d.text((vx, y + 8 * S), val, font=f(11, 'r'), fill=INK)
        y += 36 * S

    # options
    y += 6 * S
    d.text((ox + pad, y + 5 * S), '배율', font=f(11, 'r'), fill=INK)
    sel = [ox + pad + 30 * S, y, ox + pad + 76 * S, y + 24 * S]
    d.rounded_rectangle(sel, 5 * S, outline=BLUE if highlight == 'apply' else LINE,
                        width=max(2, S // 2) if highlight == 'apply' else max(1, S // 2))
    d.text((sel[0] + 8 * S, y + 5 * S), '2x', font=f(11, 'r'), fill=INK)
    d.polygon([(sel[2] - 15 * S, y + 10 * S), (sel[2] - 8 * S, y + 10 * S),
               (sel[2] - 11.5 * S, y + 15 * S)], fill=MUTED)

    d.text((ox + pad + 90 * S, y + 5 * S), '회전', font=f(11, 'r'), fill=INK)
    s2 = [ox + pad + 120 * S, y, ox + pad + 166 * S, y + 24 * S]
    d.rounded_rectangle(s2, 5 * S, outline=LINE, width=max(1, S // 2))
    d.text((s2[0] + 8 * S, y + 5 * S), '0°', font=f(11, 'r'), fill=INK)

    d.rounded_rectangle([ox + pad + 180 * S, y + 6 * S, ox + pad + 192 * S, y + 18 * S],
                        3 * S, outline=LINE, width=max(1, S // 2))
    d.text((ox + pad + 198 * S, y + 5 * S), '반전', font=f(11, 'r'), fill=INK)

    # primary button
    y += 36 * S
    btn = [ox + pad, y, ox + PW * S - pad, y + 34 * S]
    d.rounded_rectangle(btn, 6 * S, fill=BLUE)
    if highlight == 'apply':
        d.rounded_rectangle([btn[0] - 4 * S, btn[1] - 4 * S, btn[2] + 4 * S, btn[3] + 4 * S],
                            9 * S, outline=BLUE, width=max(2, S // 2))
    tw = d.textlength('화면 넣기', font=f(12, 'b'))
    d.text(((btn[0] + btn[2] - tw) / 2, y + 9 * S), '화면 넣기', font=f(12, 'b'), fill=WHITE)

    # secondary actions
    y += 42 * S
    half = (PW * S - 2 * pad - 6 * S) / 2
    for i, label in enumerate(('역할 바꾸기', '되돌리기')):
        x0 = ox + pad + i * (half + 6 * S)
        d.rounded_rectangle([x0, y, x0 + half, y + 28 * S], 6 * S, outline=LINE, width=max(1, S // 2))
        tw = d.textlength(label, font=f(11, 'r'))
        d.text((x0 + (half - tw) / 2, y + 6 * S), label, font=f(11, 'r'), fill=INK)

    # status line
    y += 38 * S
    if highlight == 'apply':
        d.text((ox + pad, y), '완료 — 723×1211 (412ms)', font=f(10, 'm'), fill=GREEN)
    else:
        d.text((ox + pad, y), '두 레이어가 인식되었습니다.', font=f(10, 'm'), fill=MUTED)

    return im, (ox, oy, PW * S, PH * S)


def cursor(im, x, y):
    d = ImageDraw.Draw(im)
    p = [(x, y), (x, y + 26 * S), (x + 7 * S, y + 19.5 * S),
         (x + 11.5 * S, y + 29 * S), (x + 16 * S, y + 27 * S),
         (x + 11.5 * S, y + 17.5 * S), (x + 20 * S, y + 17 * S)]
    d.polygon(p, fill=(20, 20, 20), outline=WHITE)
    return im


def step2():
    im, _ = panel(highlight='detect')
    return im


def step3():
    im, (ox, oy, pw, ph) = panel(highlight='apply')
    im = cursor(im, ox + pw * 0.56, oy + ph * 0.66)
    return im


if __name__ == '__main__':
    for name, fn in (('step1', step1), ('step2', step2), ('step3', step3)):
        img = fn()
        out = os.path.join(HERE, f'{name}.png')
        img.save(out)
        print(f'{name}.png  {img.size}')
