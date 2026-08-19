// Mockup — plugin sandbox side.
//
// Select the mockup (or its screen layer) plus the screen you want inside it,
// then hit 화면 넣기.
//
// Two kinds of screen surface are supported:
//   quad — a VECTOR whose path is a flat four-point quadrilateral. The mockup
//          is in perspective, so the source has to be warped and baked.
//   rect — anything rectangular in its own local space (a RECTANGLE, FRAME,
//          rounded screen plate…). Its placement is affine, so no warp is
//          needed and the source can be dropped in live as a real frame.

const PREV_HASH_KEY = 'mockupmap:prevHash';
const LIVE_NAME = '↳ screen (live)';
const MAX_IMAGE_DIM = 4096;
const MAX_EXPORT_SCALE = 4;
const POINTER = '\u{1F448}';

figma.showUI(__html__, { width: 320, height: 384, themeColors: true });

let screenNode = null;
let screenGeo = null;
let sourceNode = null;
let swapped = false;

// --- shared:geometry (byte-identical across code.js and ui.html; test/verify.js enforces it)
function parseQuadPath(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) || []).map(Number);
  if (nums.length % 2) throw new Error('path has an odd number of coordinates');
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) {
    const p = [nums[i], nums[i + 1]];
    const last = pts[pts.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1e-6) continue;
    pts.push(p);
  }
  if (pts.length > 1) {
    const a = pts[0], b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) pts.pop();
  }
  if (pts.length !== 4) throw new Error('expected a 4-point quad, got ' + pts.length);
  return pts;
}

// A quad whose corners line up on two x values and two y values needs no warp —
// an image fill already lands exactly there, and stays sharper for it.
function isAxisAlignedRect(pts, tol) {
  if (pts.length !== 4) return false;
  const xs = pts.map(p => p[0]).sort((a, b) => a - b);
  const ys = pts.map(p => p[1]).sort((a, b) => a - b);
  return Math.abs(xs[0] - xs[1]) <= tol && Math.abs(xs[2] - xs[3]) <= tol &&
         Math.abs(ys[0] - ys[1]) <= tol && Math.abs(ys[2] - ys[3]) <= tol;
}
// --- end shared:geometry

function screenGeometry(node) {
  if (node.vectorPaths && node.vectorPaths.length === 1) {
    let pts = null;
    try { pts = parseQuadPath(node.vectorPaths[0].data); } catch (e) { pts = null; }
    if (pts) {
      const tol = Math.max(node.width, node.height) * 0.004 + 0.5;
      return isAxisAlignedRect(pts, tol) ? { kind: 'rect' } : { kind: 'quad', points: pts };
    }
    return null;                       // a curved or many-point path isn't a screen
  }
  const f = node.fills;
  if (f !== undefined && f !== figma.mixed && Array.isArray(f) &&
      node.width > 1 && node.height > 1) {
    return { kind: 'rect' };
  }
  return null;
}

// Find the screen surface inside a selected node. A layer named 👈 wins — that's
// the convention every mockup kit we use follows. Failing that, a genuine
// perspective quad is unambiguous. A bare rectangle is only trusted when the
// user pointed straight at it, since a flat mockup is full of rectangles.
function findScreen(root) {
  const named = [], quads = [];
  const visit = (n) => {
    const geo = screenGeometry(n);
    if (geo) {
      if (n.name.indexOf(POINTER) !== -1) named.push({ node: n, geo });
      else if (geo.kind === 'quad') quads.push({ node: n, geo });
    }
    if (n.children) n.children.forEach(visit);
  };
  visit(root);

  const biggest = (a) => a.reduce((x, y) =>
    (x.node.width * x.node.height >= y.node.width * y.node.height ? x : y));
  if (named.length) return biggest(named);
  if (quads.length) return biggest(quads);

  const own = screenGeometry(root);
  return own ? { node: root, geo: own } : null;
}

function send(extra) {
  figma.ui.postMessage(Object.assign({
    type: 'selection', ready: false, screenName: '', sourceName: '',
    kind: '', canSwap: false, canRevert: false, canLive: false, hint: '',
  }, extra));
}

function analyse() {
  screenNode = screenGeo = sourceNode = null;
  const sel = figma.currentPage.selection;

  if (sel.length !== 2) {
    return send({ hint: sel.length < 2
      ? '목업과 넣을 화면 두 개를 선택하세요.'
      : '두 개만 선택하세요. (현재 ' + sel.length + '개)' });
  }

  const found = sel.map(findScreen);
  let a = 0, b = 1;
  if (swapped) { a = 1; b = 0; }
  if (!found[a] && found[b]) { const t = a; a = b; b = t; }

  if (!found[a]) {
    return send({ hint:
      '선택한 노드에서 화면 면을 찾지 못했습니다.\n' +
      '목업의 스크린 레이어(보통 ' + POINTER + ')를 직접 선택해 보세요.' });
  }
  if (sel[b].exportAsync === undefined) {
    return send({ hint: '소스로 쓸 노드를 내보낼 수 없습니다.' });
  }

  screenNode = found[a].node;
  screenGeo = found[a].geo;
  sourceNode = sel[b];

  send({
    ready: true,
    kind: screenGeo.kind,
    canLive: screenGeo.kind === 'rect',
    screenName: screenNode.name + '  ' + Math.round(screenNode.width) + '×' + Math.round(screenNode.height),
    sourceName: sourceNode.name + '  ' + Math.round(sourceNode.width) + '×' + Math.round(sourceNode.height),
    canSwap: !!(found[0] && found[1]),
    canRevert: !!screenNode.getPluginData(PREV_HASH_KEY),
    hint: screenGeo.kind === 'quad'
      ? '원근 목업 — 이미지로 구워서 넣습니다.'
      : '평면 목업 — 프레임 그대로 넣을 수 있습니다.',
  });
}

figma.on('selectionchange', analyse);

function rememberPrevFill() {
  const prev = (screenNode.fills || []).filter((p) => p.type === 'IMAGE')[0];
  if (prev && prev.imageHash) screenNode.setPluginData(PREV_HASH_KEY, prev.imageHash);
}

function fit(scale, srcW, srcH, dstW, dstH) {
  const need = Math.max(dstW / srcW, dstH / srcH) * scale;
  return Math.min(MAX_EXPORT_SCALE, Math.max(1, Math.ceil(need * 2) / 2));
}

// Drop the source in as a real, still-editable frame, clipped to the screen.
// Only valid when the screen's placement is affine — a perspective quad can't
// be expressed as a Figma transform.
async function placeLive() {
  const parent = screenNode.parent;

  // replace any previous live placement rather than stacking them up
  for (const sib of parent.children.slice()) {
    if (sib.name === LIVE_NAME && sib.getPluginData('mockupmap:for') === screenNode.id) sib.remove();
  }

  const fonts = new Map();
  const texts = sourceNode.type === 'TEXT' ? [sourceNode]
    : (sourceNode.findAll ? sourceNode.findAll((n) => n.type === 'TEXT') : []);
  for (const t of texts) {
    for (const sg of t.getStyledTextSegments(['fontName'])) {
      fonts.set(sg.fontName.family + '|' + sg.fontName.style, sg.fontName);
    }
  }
  const missing = [];
  for (const [key, f] of fonts) {
    try { await figma.loadFontAsync(f); } catch (e) { missing.push(key); }
  }
  if (missing.length) {
    throw new Error('폰트를 불러올 수 없습니다: ' + missing.slice(0, 3).join(', '));
  }

  const clip = figma.createFrame();
  clip.name = LIVE_NAME;
  clip.fills = [];
  clip.clipsContent = true;
  parent.insertChild(parent.children.indexOf(screenNode) + 1, clip);
  clip.resize(screenNode.width, screenNode.height);
  clip.relativeTransform = screenNode.relativeTransform;
  if (screenNode.cornerRadius !== undefined && screenNode.cornerRadius !== figma.mixed) {
    clip.cornerRadius = screenNode.cornerRadius;
  }
  clip.setPluginData('mockupmap:for', screenNode.id);

  const copy = sourceNode.clone();
  clip.appendChild(copy);
  copy.rescale(Math.max(clip.width / copy.width, clip.height / copy.height));
  copy.x = (clip.width - copy.width) / 2;
  copy.y = (clip.height - copy.height) / 2;

  return { id: clip.id, w: Math.round(clip.width), h: Math.round(clip.height) };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'ready') return analyse();
  if (msg.type === 'swap') { swapped = !swapped; return analyse(); }
  if (msg.type === 'failed') return;

  if (msg.type === 'revert') {
    const hash = screenNode && screenNode.getPluginData(PREV_HASH_KEY);
    if (!hash) return figma.ui.postMessage({ type: 'error', text: '되돌릴 원본이 없습니다.' });
    screenNode.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: hash }];
    screenNode.setPluginData(PREV_HASH_KEY, '');
    analyse();
    return figma.ui.postMessage({ type: 'done', text: '원본 이미지로 되돌렸습니다.' });
  }

  if (msg.type === 'run') {
    if (!screenNode || !sourceNode) return;
    const started = Date.now();
    try {
      // --- live frame: no raster at all -------------------------------------
      if (msg.mode === 'frame') {
        if (screenGeo.kind !== 'rect') {
          return figma.ui.postMessage({ type: 'error',
            text: '원근 목업에는 프레임을 그대로 넣을 수 없습니다.' });
        }
        const live = await placeLive();
        analyse();
        return figma.ui.postMessage({ type: 'done',
          text: '프레임으로 배치 — ' + live.w + '×' + live.h + ' (' + (Date.now() - started) + 'ms)' });
      }

      // --- flat mockup: a plain fill is exact, so skip the warp --------------
      if (screenGeo.kind === 'rect') {
        const scale = fit(msg.scale, sourceNode.width, sourceNode.height,
                          screenNode.width, screenNode.height);
        const png = await sourceNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
        const image = figma.createImage(png);
        rememberPrevFill();
        screenNode.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
        analyse();
        return figma.ui.postMessage({ type: 'done',
          text: '완료 — 이미지 ' + scale + 'x (' + (Date.now() - started) + 'ms)' });
      }

      // --- perspective quad: hand off to the UI for the warp -----------------
      const pts = screenGeo.points;
      const longest = Math.max.apply(null, pts.map((p, i) => {
        const q = pts[(i + 1) % 4];
        return Math.hypot(q[0] - p[0], q[1] - p[1]);
      }));
      const ss = 2;
      const need = (longest * msg.scale * ss) / Math.max(sourceNode.width, sourceNode.height);
      const exportScale = Math.min(MAX_EXPORT_SCALE, Math.max(1, Math.ceil(need * 2) / 2));
      const png = await sourceNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: exportScale } });

      const W = Math.round(screenNode.width * msg.scale);
      const H = Math.round(screenNode.height * msg.scale);
      if (W > MAX_IMAGE_DIM || H > MAX_IMAGE_DIM) {
        return figma.ui.postMessage({ type: 'error',
          text: '출력이 ' + W + '×' + H + '로 너무 큽니다. 배율을 낮추세요.' });
      }

      figma.ui.postMessage({
        type: 'warp', png,
        path: screenNode.vectorPaths[0].data,
        bboxW: screenNode.width, bboxH: screenNode.height,
        scale: msg.scale, rotate: msg.rotate, mirror: msg.mirror,
      });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', text: '실패: ' + err.message });
    }
    return;
  }

  if (msg.type === 'apply') {
    try {
      const image = figma.createImage(msg.png);
      rememberPrevFill();
      screenNode.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: image.hash }];
      analyse();
      figma.ui.postMessage({ type: 'done',
        text: '완료 — ' + msg.w + '×' + msg.h + ' (' + msg.ms + 'ms)' });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', text: '적용 실패: ' + err.message });
    }
  }
};
