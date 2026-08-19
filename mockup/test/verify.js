// Verifies the geometry + resampling core that ships inside ui.html.
//
// The <script id="warp-core"> block is pulled out of ui.html verbatim and run
// here, so this tests the code that actually ships rather than a copy of it.
//
// Run it with test/run.sh — that picks a JS runtime and builds the fixtures
// used by the cross-check against the Python reference implementation.

(function () {
  'use strict';

  // --- runtime shim: works under both Node and macOS' built-in jsc ----------
  var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  var fs = isNode ? require('fs') : null;
  var log = isNode ? console.log : print;

  function readText(p) {
    return isNode ? fs.readFileSync(p, 'utf8') : read(p);
  }
  function readBytes(p) {
    if (isNode) return new Uint8Array(fs.readFileSync(p));
    return readFile(p, 'binary');
  }
  function exists(p) {
    try { readText(p); return true; } catch (e) { return false; }
  }

  // --- load the shipped core -----------------------------------------------
  var html = readText('ui.html');
  var m = html.match(/<script id="warp-core">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('could not find <script id="warp-core"> in ui.html');
  var core = new Function(m[1] +
    '\nreturn { parseQuadPath: parseQuadPath, isAxisAlignedRect: isAxisAlignedRect,' +
    ' orderCorners: orderCorners, findCoeffs: findCoeffs, warpToQuad: warpToQuad };')();

  var parseQuadPath = core.parseQuadPath, isAxisAlignedRect = core.isAxisAlignedRect,
      orderCorners = core.orderCorners, findCoeffs = core.findCoeffs,
      warpToQuad = core.warpToQuad;

  var pass = 0, fail = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; log('  ok   ' + name); }
    else { fail++; log('  FAIL ' + name + (detail ? '\n         ' + detail : '')); }
  }
  function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); }
  function cornersNear(got, want, tol) {
    return got.length === 4 && got.every(function (p, i) {
      return near(p[0], want[i][0], tol || 1e-3) && near(p[1], want[i][1], tol || 1e-3);
    });
  }

  // --- quad geometry, used to judge the rendered pixels ---------------------
  // Signed distance from a point to the quad: negative inside, positive outside.
  function quadDistance(q, px, py) {
    var inside = true, sign = 0, best = Infinity;
    for (var i = 0; i < 4; i++) {
      var a = q[i], b = q[(i + 1) % 4];
      var ex = b[0] - a[0], ey = b[1] - a[1];
      var cross = ex * (py - a[1]) - ey * (px - a[0]);
      if (sign === 0) sign = cross >= 0 ? 1 : -1;
      else if ((cross >= 0 ? 1 : -1) !== sign) inside = false;

      var len2 = ex * ex + ey * ey;
      var t = len2 ? Math.max(0, Math.min(1, ((px - a[0]) * ex + (py - a[1]) * ey) / len2)) : 0;
      best = Math.min(best, Math.hypot(px - (a[0] + t * ex), py - (a[1] + t * ey)));
    }
    return inside ? -best : best;
  }

  // --- 0. the geometry helpers are duplicated on purpose; keep them in step --
  log('\nshared geometry block');

  function sharedBlock(src, file) {
    var re = /\/\/ --- shared:geometry[\s\S]*?\/\/ --- end shared:geometry/;
    var hit = src.match(re);
    if (!hit) throw new Error('no shared:geometry block in ' + file);
    return hit[0];
  }
  var sharedUi = sharedBlock(html, 'ui.html');
  var sharedCode = sharedBlock(readText('code.js'), 'code.js');
  ok('code.js and ui.html carry the same geometry helpers', sharedUi === sharedCode,
    'the two copies have drifted — re-sync them');

  // --- 0b. flat screens must be told apart from perspective ones ------------
  log('\nflat vs perspective classification');

  var FLAT = [
    ['axis-aligned rect', 'M 0 0 L 240 0 L 240 520 L 0 520 Z', 240, 520],
    ['rect written anticlockwise', 'M 0 520 L 240 520 L 240 0 L 0 0 Z', 240, 520],
    ['rect with sub-pixel jitter', 'M 0.2 0 L 240 0.3 L 239.8 520 L 0 519.7 Z', 240, 520],
  ];
  FLAT.forEach(function (c) {
    var tol = Math.max(c[2], c[3]) * 0.004 + 0.5;
    ok('flat: ' + c[0], isAxisAlignedRect(parseQuadPath(c[1]), tol));
  });

  CASES_PERSPECTIVE_TOL().forEach(function (c) {
    ok('perspective: ' + c.name, !isAxisAlignedRect(parseQuadPath(c.path), c.tol));
  });

  function CASES_PERSPECTIVE_TOL() {
    return [
      { name: 'splash mockup quad',
        path: 'M 160.63470375705774 0 L 343.97930908203125 99.01516256141845 L 160.63470375705774 636.4827880859375 L 0 510.06434658932534 L 160.63470375705774 0 Z',
        tol: 636.5 * 0.004 + 0.5 },
      { name: 'chart mockup quad',
        path: 'M 0 0 L 235.22987758115113 17.317537078657534 L 361.6066589355469 587.7654779654275 L 118.95498738209544 605.7014770507812 L 0 0 Z',
        tol: 605.7 * 0.004 + 0.5 },
      { name: 'landscape quad',
        path: 'M 0 20 L 600 0 L 580 340 L 20 350 Z', tol: 600 * 0.004 + 0.5 },
    ];
  }

  // --- 1. corner roles, against what the Python reference prints ------------
  log('\ncorner assignment');

  var CASES = [
    { name: 'portrait phone, tilted right (splash mockup)',
      path: 'M 160.63470375705774 0 L 343.97930908203125 99.01516256141845 L 160.63470375705774 636.4827880859375 L 0 510.06434658932534 L 160.63470375705774 0 Z',
      sw: 393, sh: 850,
      want: [[160.6347, 0], [343.9793, 99.0152], [160.6347, 636.4828], [0, 510.0643]] },
    { name: 'portrait phone, tilted left (chart mockup)',
      path: 'M 0 0 L 235.22987758115113 17.317537078657534 L 361.6066589355469 587.7654779654275 L 118.95498738209544 605.7014770507812 L 0 0 Z',
      sw: 786, sh: 1700,
      want: [[0, 0], [235.2299, 17.3175], [361.6067, 587.7655], [118.955, 605.7015]] },
    { name: 'landscape screen (long edges are top/bottom)',
      path: 'M 0 20 L 600 0 L 580 340 L 20 350 Z',
      sw: 1600, sh: 900,
      want: [[0, 20], [600, 0], [580, 340], [20, 350]] },
    { name: 'same quad wound counter-clockwise',
      path: 'M 20 350 L 580 340 L 600 0 L 0 20 Z',
      sw: 1600, sh: 900,
      want: [[0, 20], [600, 0], [580, 340], [20, 350]] }
  ];

  CASES.forEach(function (c) {
    var got = orderCorners(parseQuadPath(c.path), c.sw, c.sh);
    ok(c.name, cornersNear(got, c.want),
      'got ' + JSON.stringify(got.map(function (p) { return [+p[0].toFixed(3), +p[1].toFixed(3)]; })));
  });

  ok('source aspect decides which edge is the top',
    JSON.stringify(orderCorners(parseQuadPath(CASES[1].path), 1600, 900)) !==
    JSON.stringify(orderCorners(parseQuadPath(CASES[1].path), 786, 1700)));

  // --- 2. homography invariants --------------------------------------------
  log('\nhomography');

  CASES.slice(0, 3).forEach(function (c) {
    var corners = orderCorners(parseQuadPath(c.path), c.sw, c.sh);
    var k = 4;
    var dst = corners.map(function (p) { return [p[0] * k, p[1] * k]; });
    var src = [[0, 0], [c.sw, 0], [c.sw, c.sh], [0, c.sh]];
    var co = findCoeffs(dst, src);
    var worst = 0;
    dst.forEach(function (p, i) {
      var den = co[6] * p[0] + co[7] * p[1] + 1;
      worst = Math.max(worst,
        Math.abs((co[0] * p[0] + co[1] * p[1] + co[2]) / den - src[i][0]),
        Math.abs((co[3] * p[0] + co[4] * p[1] + co[5]) / den - src[i][1]));
    });
    ok('corners round-trip exactly — ' + c.name, worst < 1e-6,
      'worst error ' + worst.toExponential(2) + 'px');
  });

  ok('degenerate quad is rejected', (function () {
    try { findCoeffs([[0, 0], [0, 0], [0, 0], [0, 0]], [[0, 0], [1, 0], [1, 1], [0, 1]]); return false; }
    catch (e) { return true; }
  })());

  ok('a curved (non-quad) path is rejected', (function () {
    try { parseQuadPath('M 0 0 C 48 0 96 0 145 0 L 500 500 Z'); return false; }
    catch (e) { return true; }
  })());

  // --- 3. pixels: warp a landmark pattern and check where corners land ------
  log('\nresampling');

  (function () {
    var sw = 200, sh = 400;
    var src = new Uint8ClampedArray(sw * sh * 4);
    for (var y = 0; y < sh; y++) {
      for (var x = 0; x < sw; x++) {
        var i = (y * sw + x) * 4;
        src[i] = x < sw / 2 ? 255 : 0;        // red = left half
        src[i + 1] = y < sh / 2 ? 255 : 0;    // green = top half
        src[i + 2] = 40;
        src[i + 3] = 255;
      }
    }

    var path = 'M 0 0 L 235.2 17.3 L 361.6 587.8 L 119.0 605.7 Z';
    var corners = orderCorners(parseQuadPath(path), sw, sh);
    var W = 362, H = 606;
    var out = warpToQuad(src, sw, sh, corners, W, H, 2, 2);

    function at(p) {
      var i = (Math.round(p[1]) * W + Math.round(p[0])) * 4;
      return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    }
    var centre = [(corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2];
    function inset(c) { return [c[0] + (centre[0] - c[0]) * 0.12, c[1] + (centre[1] - c[1]) * 0.12]; }

    var tl = at(inset(corners[0])), tr = at(inset(corners[1]));
    var br = at(inset(corners[2])), bl = at(inset(corners[3]));
    ok('source top-left lands in the top-left corner', tl[0] > 200 && tl[1] > 200, 'rgba ' + tl);
    ok('source top-right lands in the top-right corner', tr[0] < 60 && tr[1] > 200, 'rgba ' + tr);
    ok('source bottom-right lands in the bottom-right corner', br[0] < 60 && br[1] < 60, 'rgba ' + br);
    ok('source bottom-left lands in the bottom-left corner', bl[0] > 200 && bl[1] < 60, 'rgba ' + bl);

    // every pixel clearly beyond the quad edge must be fully transparent, and
    // every pixel clearly inside must be fully opaque — checked exhaustively
    // rather than by sampling, with a 1.5px allowance for the edge itself
    var leaked = 0, holes = 0, filled = 0;
    for (var py2 = 0; py2 < H; py2++) {
      for (var px2 = 0; px2 < W; px2++) {
        var alpha = out[(py2 * W + px2) * 4 + 3];
        if (alpha > 8) filled++;
        var sd = quadDistance(corners, px2 + 0.5, py2 + 0.5);
        if (sd > 1.5 && alpha > 8) leaked++;
        if (sd < -1.5 && alpha < 247) holes++;
      }
    }
    ok('no pixel outside the quad is painted', leaked === 0, leaked + ' stray pixels');
    ok('no gaps inside the quad', holes === 0, holes + ' under-filled pixels');
    var area = Math.abs(corners.reduce(function (s, p, i) {
      var q = corners[(i + 1) % 4];
      return s + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2);
    var ratio = filled / area;
    ok('filled area matches the quad area', ratio > 0.97 && ratio < 1.03, 'ratio ' + ratio.toFixed(3));
  })();

  // --- 4. cross-check against the Python reference --------------------------
  log('\ncross-check vs the /figma-mockup Python reference');

  if (!exists('test/fixtures/meta.json')) {
    log('  skip  no fixtures (run test/run.sh, needs python3 + Pillow)');
  } else {
    var meta = JSON.parse(readText('test/fixtures/meta.json'));
    var srcPix = new Uint8ClampedArray(readBytes('test/fixtures/src.rgba'));
    var refPix = new Uint8ClampedArray(readBytes('test/fixtures/ref.rgba'));
    var cs = orderCorners(parseQuadPath(meta.path), meta.sw, meta.sh);
    var mine = warpToQuad(srcPix, meta.sw, meta.sh, cs, meta.W, meta.H, meta.scale * 2, 2);

    ok('output dimensions agree with the reference', mine.length === refPix.length,
      mine.length + ' vs ' + refPix.length);

    // The two implementations use different resampling kernels (bicubic +
    // LANCZOS there, bilinear + box here), so pixels along the quad edge are
    // expected to differ. What must hold is that every disagreement sits on
    // that edge — a shifted or mis-cornered warp would disagree in the middle.
    var mcorners = orderCorners(parseQuadPath(meta.path), meta.sw, meta.sh)
      .map(function (p) { return [p[0] * meta.scale, p[1] * meta.scale]; });

    var disagree = 0, farthest = 0, diffSum = 0, diffN = 0, worst = 0;
    for (var yy = 0; yy < meta.H; yy++) {
      for (var xx = 0; xx < meta.W; xx++) {
        var p = (yy * meta.W + xx) * 4;
        var a = refPix[p + 3] > 128, b = mine[p + 3] > 128;
        if (a !== b) {
          disagree++;
          farthest = Math.max(farthest, Math.abs(quadDistance(mcorners, xx + 0.5, yy + 0.5)));
        }
        if (a && b && quadDistance(mcorners, xx + 0.5, yy + 0.5) < -2) {
          for (var ch = 0; ch < 3; ch++) {
            var d = Math.abs(refPix[p + ch] - mine[p + ch]);
            diffSum += d; diffN++; if (d > worst) worst = d;
          }
        }
      }
    }
    var meanDiff = diffSum / Math.max(diffN, 1);
    var perimeter = mcorners.reduce(function (s, c, i) {
      var n = mcorners[(i + 1) % 4];
      return s + Math.hypot(n[0] - c[0], n[1] - c[1]);
    }, 0);

    ok('silhouette disagreements are confined to the quad edge', farthest < 2.5,
      'farthest disagreement is ' + farthest.toFixed(2) + 'px from the edge');
    ok('disagreements scale with the perimeter, not the area', disagree < perimeter * 1.5,
      disagree + ' pixels vs a ' + Math.round(perimeter) + 'px perimeter (area is ' +
      (meta.W * meta.H) + 'px)');
    ok('interior colour matches the reference', meanDiff < 6,
      'mean |diff| ' + meanDiff.toFixed(2) + '/255, worst ' + worst);
  }

  log('\n' + pass + ' passed, ' + fail + ' failed\n');
  if (isNode) process.exit(fail ? 1 : 0);
  else if (fail) throw new Error(fail + ' test(s) failed');
})();
