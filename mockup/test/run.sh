#!/bin/bash
# Runs the plugin's core tests.
#
# Picks whatever JS runtime is on the machine: node if installed, otherwise the
# JavaScriptCore shell that ships with macOS. Builds (and then removes) the
# fixtures used to cross-check against the /figma-mockup Python reference.
set -u

cd "$(dirname "$0")/.." || exit 1
FIX=test/fixtures
SKILL="$HOME/.claude/skills/figma-mockup/scripts/warp_to_quad.py"
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

PATH_D='M 0 0 L 235.22987758115113 17.317537078657534 L 361.6066589355469 587.7654779654275 L 118.95498738209544 605.7014770507812 L 0 0 Z'
BBOX_W=361.6066589355469
BBOX_H=605.7014770507812
SW=240; SH=500; SCALE=1

cleanup() { rm -rf "$FIX"; }
trap cleanup EXIT

# --- fixtures: a landmark image, warped by the Python reference --------------
if python3 -c 'import numpy, PIL' 2>/dev/null && [ -f "$SKILL" ]; then
  mkdir -p "$FIX"
  python3 - "$FIX" "$SW" "$SH" <<'PY'
import sys
import numpy as np
from PIL import Image
out, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
x = np.arange(w)[None, :]
y = np.arange(h)[:, None]
img = np.zeros((h, w, 4), np.uint8)
img[..., 0] = x * 255 // max(w - 1, 1)          # red ramp left->right
img[..., 1] = y * 255 // max(h - 1, 1)          # green ramp top->bottom
img[..., 2] = (((x // 17) + (y // 17)) % 2) * 255  # checkerboard
img[..., 3] = 255
img[:12, :, :3] = 0
img[-12:, :, :3] = 255
Image.fromarray(img).save(f'{out}/src.png')
open(f'{out}/src.rgba', 'wb').write(img.tobytes())
PY

  python3 "$SKILL" --src "$FIX/src.png" --out "$FIX/ref.png" \
    --path "$PATH_D" --bbox "$BBOX_W" "$BBOX_H" --scale "$SCALE" >/dev/null 2>&1

  python3 - "$FIX" "$SW" "$SH" "$SCALE" "$PATH_D" <<'PY'
import json
import sys
from PIL import Image
out, sw, sh, scale, path = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
im = Image.open(f'{out}/ref.png').convert('RGBA')
open(f'{out}/ref.rgba', 'wb').write(im.tobytes())
json.dump({'sw': sw, 'sh': sh, 'W': im.size[0], 'H': im.size[1], 'scale': scale, 'path': path},
          open(f'{out}/meta.json', 'w'))
PY
else
  echo "note: python3 + Pillow + the figma-mockup skill not all present — cross-check will be skipped"
fi

# --- run ---------------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  echo "runtime: node $(node --version)"
  node test/verify.js
  RC=$?
elif [ -x "$JSC" ]; then
  echo "runtime: JavaScriptCore (macOS built-in)"
  "$JSC" test/verify.js
  RC=$?
else
  echo "no JS runtime found (install node, or run on macOS for jsc)"
  RC=1
fi

exit $RC
