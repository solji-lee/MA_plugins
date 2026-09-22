#!/usr/bin/env python3
"""Generates the three carousel screenshots for the Color Migration listing.

These are real screenshots of the shipped `ui.html`, not mockups of it — a
headless Chrome renders the actual file with a small in-memory stand-in for
the `db` capability and a scan payload built from the real mapping table
(read out of `code.js`, same as `make_assets.py`). No product screen or
project data is shown; the "frame" name is a placeholder.

Requires Chrome and Node. On another OS, adjust CHROME below.

    python3 branding/make_guide_shots.py
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H = 460, 760

# A representative spread of real mapping rows — enough contexts and statuses
# to show what the panel actually looks like, not a cherry-picked best case.
PICKS = [
    ('bdl', 'Semantic/Bg/white', 'surface', 'fills', False),
    ('bdl', 'Semantic/Bg/box-bg', 'surface', 'fills', False),
    ('master', 'interactive/common/normal', 'surface', 'fills', False),
    ('bdl', 'Semantic/Text/basic', 'text', 'fills', True),
    ('bdl', 'Semantic/Text/primary', 'text', 'fills', True),
    ('bdl', 'Semantic/Grade/Grade-1', 'text', 'fills', True),
    ('masterPrimitive', 'gray/300', 'icon', 'fills', False),
    ('bdl', 'Gray/70', 'stroke', 'strokes', False),
    ('bdl', 'Gray/5', 'text', 'fills', True),
    ('bdl', 'Semantic/Badge/blue2', 'surface', 'fills', False),
]


def node_build_rows():
    src = open(os.path.join(ROOT, 'code.js'), encoding='utf8').read()
    m = re.search(r'const MAPPING = (/\* mapping:begin \*/.*?/\* mapping:end \*/);', src, re.S)
    c = re.search(r'// --- core:begin[^\n]*\n(.*?)// --- core:end', src, re.S)
    script = f'''
const M = {m.group(1)};
{c.group(1)}
const L = {{}}; M.contexts.forEach(x => L[x.context] = x.label);
const picks = {json.dumps(PICKS)};
const rows = picks.map(([kind, name, ctx, prop, isText], i) => {{
  const entry = kind === 'bdl' ? M.bdl[name] : kind === 'master' ? M.master[name]
              : kind === 'masterPrimitive' ? M.masterPrimitive[name] : null;
  const value = (entry && (entry.light || entry.dark)) || '#CCCCCC';
  const mode = 'light';
  const styleMode = kind === 'bdl' ? 'light' : null;
  const sug = suggest({{ kind, entry, name, value, isText, context: ctx, mode, styleMode }}, M);
  return Object.assign({{ id: 'r' + i, kind, name, value, context: ctx, contextLabel: L[ctx],
    prop, styleMode, mode, count: [22,14,6,31,4,12,9,7,5,3][i], nodeCount: 1,
    note: (entry && entry.note) || '' }}, sug);
}});
const stats = {{ foundation: 9, skippedPaints: 1, skippedInstances: 3, otherStyles: 0 }};
const frames = [{{ id: 'f1', name: '주문 상세', reason: 'BDL Dark/ 스타일', checked: true }}];
console.log(JSON.stringify({{ type: 'scan', rows, frames, stats, selection: 1, tokens: M.tokens, version: M.version }}));
'''
    out = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
    return out.stdout.strip()


def shot(html_path, out_path):
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                     f'--window-size={W},{H}', '--virtual-time-budget=4000',
                     f'--screenshot={out_path}', 'file://' + html_path],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    if not os.path.exists(CHROME):
        sys.exit(f'Chrome not found at {CHROME} — edit the CHROME constant for this machine')
    scan_msg = node_build_rows()
    ui = open(os.path.join(ROOT, 'ui.html'), encoding='utf8').read()
    # Headless Chrome fires a synthetic `resize` right before `--screenshot`
    # captures the page, which trips the panel's real (and correct) "resize
    # closes the open dropdown" handler and closes it before the pixels are
    # grabbed. Only this offscreen harness needs the workaround — the shipped
    # ui.html is untouched.
    ui = ui.replace("addEventListener('resize', () => closePop());", '')

    with tempfile.TemporaryDirectory() as tmp:
        def write(name, extra_js):
            path = os.path.join(tmp, name)
            open(path, 'w', encoding='utf8').write(
                f'<body style="width:{W}px;height:{H}px">{ui}'
                f'<script>onmessage({{data:{{pluginMessage:{scan_msg}}}}});{extra_js}</script>')
            return path

        shot(write('panel.html', ''), os.path.join(HERE, 'guide-1-list.png'))
        shot(write('review.html', 'document.querySelector(\'[data-tab="check"]\').click();'),
             os.path.join(HERE, 'guide-2-review.png'))
        shot(write('pick.html',
                    'document.querySelector(\'[data-tab="check"]\').click();'
                    'document.querySelectorAll("[data-pick]")[0].click();'),
             os.path.join(HERE, 'guide-3-pick.png'))

    print('guide-1-list.png, guide-2-review.png, guide-3-pick.png')


if __name__ == '__main__':
    main()
