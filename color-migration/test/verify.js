// Verifies the matching core that ships inside code.js.
//
// The mapping block and the `// --- core:begin … core:end` block are pulled out
// of code.js verbatim and run here, so this tests the code that actually ships.
// Run with test/run.sh (node if present, otherwise macOS' built-in jsc).

(function () {
  'use strict';
  var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  var log = isNode ? console.log : print;
  var src = isNode ? require('fs').readFileSync('code.js', 'utf8') : read('code.js');

  var mm = src.match(/const MAPPING = (\/\* mapping:begin \*\/[\s\S]*?\/\* mapping:end \*\/);/);
  var cm = src.match(/\/\/ --- core:begin[^\n]*\n([\s\S]*?)\/\/ --- core:end/);
  if (!mm || !cm) throw new Error('mapping or core block not found in code.js');
  var M = new Function('return ' + mm[1])();
  var core = new Function(cm[1] + '\nreturn { deltaE, glob, normStyleName, parseBdl, lookupVariable, systemOf, contextOf, rankSemantics, suggest };')();
  var R = M.toMaster;                      // 역방향(→ Master) 표
  function rsug(o) {
    return core.suggest(Object.assign({ isText: false, context: 'surface', mode: 'light' }, o), R);
  }

  var pass = 0, fail = 0;
  function ok(name, cond, detail) {
    if (cond) { pass++; log('  ok   ' + name); }
    else { fail++; log('  FAIL ' + name + (detail !== undefined ? '\n         got: ' + JSON.stringify(detail) : '')); }
  }
  function feat(o) {
    return Object.assign({ type: 'RECTANGLE', prop: 'fill', names: ['Rect', 'Card', 'Screen'], w: 100, h: 40, topW: 360, topH: 800, opacity: 1 }, o);
  }
  function sug(o) {
    return core.suggest(Object.assign({ isText: false, context: 'surface', mode: 'light' }, o), M);
  }

  log('mapping ' + M.version);

  log('data');
  var missing = [];
  ['master', 'masterPrimitive', 'bdl'].forEach(function (sys) {
    Object.keys(M[sys]).forEach(function (k) {
      var e = M[sys][k];
      ['target', 'targetText', 'targetDarkStyle'].forEach(function (c) {
        if (e[c] && !(M.tokens[e[c]] && /^[0-9a-f]{40}$/.test(M.tokens[e[c]].key))) missing.push(sys + ' ' + k + ' ' + c);
      });
    });
  });
  ok('every target has a 40-hex Foundation variable key', missing.length === 0, missing.slice(0, 5));
  var CONTEXTS = ['badgeText', 'badge', 'text', 'icon', 'divider', 'control', 'stroke', 'scrim', 'surface'];
  ok('every context carries candidates and a demote list',
     M.contexts.length === CONTEXTS.length && M.contexts.every(function (c) { return c.candidates.length && Array.isArray(c.demote); }),
     M.contexts.map(function (c) { return c.context; }));
  ok('contexts are ordered most specific first',
     M.contexts.map(function (c) { return c.context; }).join() === CONTEXTS.join(),
     M.contexts.map(function (c) { return c.context; }));

  log('names');
  ok('normalizes spaced style names', core.normStyleName('Dark / Stock / blue-bright-new') === 'Dark/Stock/blue-bright-new');
  var b = core.parseBdl('Dark / Stock / blue-bright-new', M);
  ok('BDL spaced name resolves with dark mode', b && b.mode === 'dark' && b.entry && b.entry.target === 'functional/stock/down/bright', b);
  b = core.parseBdl('Light/Semantic/Button/stock-cancle', M);
  ok('BDL typo alias resolves', b && b.key === 'Semantic/Button/stock-cancel' && b.entry, b && b.key);
  ok('non-BDL style name is ignored', core.parseBdl('Heading/H1', M) === null);
  b = core.parseBdl('Light/font/gray20%', M);
  ok('옛 BDL 이름(Light/font/gray20%) → textIcon/normal', b && b.entry && b.entry.target === 'plain/textIcon/normal', b && b.key);
  b = core.parseBdl('Primary/orange', M);
  ok('접두어 없는 옛 이름도 표에 있으면 인식', b && b.mode === 'light' && b.entry && b.entry.target === 'functional/brand/normal', b);
  b = core.parseBdl('font/font-gray-20%', M);
  ok('접두어 없는 표기 변형도 별칭으로 정규화', b && b.key === 'font/gray20%', b && b.key);

  log('variables');
  var fGray10 = M.tokens['gray/10'].key, mGray10 = R.tokens['gray/10'].key;
  ok('Foundation gray/10 은 키로 갈린다', core.systemOf('gray/10', null, fGray10, M).sys === 'foundation');
  ok('Master gray/10 도 키로 갈린다', core.systemOf('gray/10', null, mGray10, M).sys === 'master');
  ok('이름만으로는 어느 쪽인지 모른다', core.systemOf('gray/10', null, 'x', M).sys === 'unknown');
  var TO_F = 'toFoundation', TO_M = 'toMaster';
  ok('→Foundation: Master 변수는 원본', core.lookupVariable('label/normal', 'mode', 'x', M, TO_F).kind === 'master');
  ok('→Foundation: Foundation 시맨틱은 건너뛴다', core.lookupVariable('plain/textIcon/normal', 'colorSemantic', M.tokens['plain/textIcon/normal'].key, M, TO_F).kind === 'done');
  ok('→Foundation: Foundation 원시는 시맨틱을 권한다', core.lookupVariable('gray/10', 'colorScale', fGray10, M, TO_F).kind === 'foundationPrimitive');
  ok('→Master: Foundation 시맨틱이 원본', core.lookupVariable('plain/textIcon/normal', 'colorSemantic', M.tokens['plain/textIcon/normal'].key, M, TO_M).kind === 'master');
  ok('→Master: Master 변수는 건너뛴다', core.lookupVariable('label/normal', 'mode', 'x', M, TO_M).kind === 'done');
  ok('→Master: 표에 없는 Foundation 토큰은 알 수 없음',
     core.lookupVariable('plain/nope', 'colorSemantic', 'x', M, TO_M).kind === 'unknown');

  log('context');
  ok('text', core.contextOf(feat({ type: 'TEXT', names: ['Label', 'Row'] })) === 'text');
  ok('text named label is not a badge', core.contextOf(feat({ type: 'TEXT', names: ['label', 'List'] })) === 'text');
  ok('text inside a badge', core.contextOf(feat({ type: 'TEXT', names: ['Text', 'Badge/primary'] })) === 'badgeText');
  ok('badge surface', core.contextOf(feat({ names: ['bg', '뱃지'] })) === 'badge');
  ok('vector is icon', core.contextOf(feat({ type: 'VECTOR' })) === 'icon');
  ok('ic_ ancestor is icon', core.contextOf(feat({ names: ['Rect', 'ic_arrow'] })) === 'icon');
  ok('"picture" is not an icon', core.contextOf(feat({ names: ['Rect', 'picture'] })) === 'surface');
  ok('line is divider', core.contextOf(feat({ type: 'LINE', prop: 'stroke' })) === 'divider');
  ok('1px rect fill is divider', core.contextOf(feat({ h: 1 })) === 'divider');
  ok('stroke', core.contextOf(feat({ prop: 'stroke' })) === 'stroke');
  ok('translucent full-screen fill is scrim', core.contextOf(feat({ w: 360, h: 800, opacity: 0.4 })) === 'scrim');
  ok('otherwise surface', core.contextOf(feat({})) === 'surface');

  log('→ Master (역방향)');
  ok('역방향 표가 세 갈래를 모두 담는다',
     Object.keys(R.foundation).length === 90 && Object.keys(R.bdl).length === Object.keys(M.bdl).length && R.contexts.length === M.contexts.length);
  var missingKey = Object.keys(R.tokens).filter(function (n) { return !/^[0-9a-f]{40}$/.test(R.tokens[n].key); });
  ok('Master 목적지마다 40자리 변수 키', missingKey.length === 0, missingKey.slice(0, 5));
  var deprecated = Object.keys(R.foundation).filter(function (f) { var t = R.foundation[f].target; return t && t.indexOf('_삭제예정') === 0; });
  ok('폐기 예정 Master 토큰은 목적지가 되지 않는다', deprecated.length === 0, deprecated);
  ok('label/normal 로 돌아간다', R.foundation['plain/textIcon/normal'].target === 'label/normal', R.foundation['plain/textIcon/normal']);
  ok('값이 같은 흰색 둘은 글자·면으로 갈라 둔다',
     R.foundation['functional/static/white'].target === 'interactive/inverted/normal' &&
     R.foundation['functional/static/white'].targetText === 'label/invertedNormal', R.foundation['functional/static/white']);
  ok('값이 바뀌는 자리는 확인 필요', R.foundation['functional/brand/normal'].action === 'review', R.foundation['functional/brand/normal']);
  ok('Master 에 없는 것은 대상 없음', R.foundation['functional/riskGrade/heavy/1'].action === 'hold' && !R.foundation['functional/riskGrade/heavy/1'].target);
  ok('원시도 되돌아간다', R.foundationPrimitive['gray/990'].target === 'gray/10', R.foundationPrimitive['gray/990']);
  s = rsug({ kind: 'master', entry: R.foundation['plain/background/normal'], context: 'surface' });
  ok('Foundation 면 토큰 → Master 면 토큰', s.target === 'background/common/normal' && s.checked, s);
  s = rsug({ kind: 'bdl', entry: R.bdl['Semantic/Text/basic'], styleMode: 'light', isText: true, context: 'text' });
  ok('BDL 도 Master 로 바로 간다', s.target === 'label/normal', s);
  s = rsug({ kind: 'bdl', entry: R.bdl['Semantic/Grade/Grade-1'], styleMode: 'light', context: 'badge' });
  ok('등급색은 Master 로 돌리면 값이 달라져 확인 필요', s.target === 'grade/point/1' && !s.checked, s);
  ok('역방향 맥락 후보는 Master 이름', R.contexts.every(function (c) { return c.candidates.every(function (n) { return !!R.tokens[n]; }); }));

  log('suggest — table entries');
  var s = sug({ kind: 'master', entry: M.master['label/normal'], isText: true, context: 'text' });
  ok('Master label/normal → auto textIcon/normal', s.status === 'auto' && s.checked && s.target === 'plain/textIcon/normal', s);
  s = sug({ kind: 'master', entry: M.master['grade/point/1'], isText: true, context: 'text' });
  ok('grade text → riskGrade heavy', s.target === 'functional/riskGrade/heavy/1', s.target);
  s = sug({ kind: 'master', entry: M.master['grade/point/1'], context: 'badge' });
  ok('grade fill → riskGrade normal', s.target === 'functional/riskGrade/normal/1', s.target);
  s = sug({ kind: 'master', entry: M.master['elevation/lowRaised'] });
  ok('hold entry → no target, unchecked', s.status === 'hold' && !s.target && !s.checked, s);
  s = sug({ kind: 'bdl', entry: M.bdl['Semantic/Text/basic'], styleMode: 'dark', isText: true, context: 'text' });
  ok('BDL Text/basic → textIcon/normal', s.status === 'auto' && s.target === 'plain/textIcon/normal', s.target);

  log('suggest — name declares a role');
  s = sug({ kind: 'bdl', entry: M.bdl['bg/gray98%'], styleMode: 'light', context: 'surface' });
  ok('bg/ 를 면에 쓰면 배경 토큰, 자동', s.target === 'plain/background/subtle' && s.checked && !s.clash, s);
  s = sug({ kind: 'bdl', entry: M.bdl['bg/gray98%'], styleMode: 'light', context: 'stroke' });
  ok('bg/ 를 선에 쓰면 이름 기준을 제안하되 확인 필요', s.target === 'plain/background/subtle' && !s.checked && s.clash === 'plain/border/subtle', s);
  ok('  쓰임 기준 후보도 드롭다운에 들어간다', s.candidates.some(c => c.name === 'plain/border/subtle'), s.candidates.map(c => c.name));
  s = sug({ kind: 'bdl', entry: M.bdl['stroke/gray90%'], styleMode: 'light', context: 'icon' });
  ok('stroke/ 는 아이콘 안에서도 선 토큰으로', s.target === 'plain/border/normal' && !s.checked, s);
  s = sug({ kind: 'bdl', entry: M.bdl['font/white'], styleMode: 'light', context: 'surface' });
  ok('font/ 를 면에 쓰면 글자 토큰을 제안하되 확인 필요', s.target === 'plain/textIcon/subtle3' && !s.checked, s);
  s = sug({ kind: 'bdl', entry: M.bdl['font/gray20%'], styleMode: 'light', context: 'icon' });
  ok('글자색을 아이콘에 쓰는 것은 충돌이 아니다 — 답이 같으므로 자동', s.target === 'plain/textIcon/normal' && s.checked && !s.clash, s);

  log('suggest — buttons take container, grounds take background');
  var BTN = ['201 button / 02 negative', 'Frame 33508', 'button', 'con'];
  ok('버튼 면은 control 맥락', core.contextOf(feat({ type: 'FRAME', names: BTN, w: 81, h: 36 })) === 'control');
  ok('버튼 위 글자는 그대로 글자', core.contextOf(feat({ type: 'TEXT', names: ['Text'].concat(BTN) })) === 'text');
  ok('버튼 테두리는 선', core.contextOf(feat({ type: 'FRAME', prop: 'stroke', names: BTN, w: 81, h: 36 })) === 'stroke');
  s = sug({ kind: 'bdl', entry: M.bdl['bg/gray98%'], styleMode: 'light', context: 'control' });
  ok('bg/ 가 버튼 면이면 container 로', s.target === 'plain/container/subtle', s.target);
  s = sug({ kind: 'bdl', entry: M.bdl['bg/white'], styleMode: 'light', context: 'control' });
  ok('흰 버튼·입력칸 면은 container/subtle2', s.target === 'plain/container/subtle2', s.target);
  s = sug({ kind: 'bdl', entry: M.bdl['bg/white'], styleMode: 'light', context: 'surface' });
  ok('화면 바탕은 그대로 background/normal', s.target === 'plain/background/normal' && s.checked, s.target);

  log('suggest — primitives by context');
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/95'], styleMode: 'light', context: 'surface' });
  ok('BDL Gray/95 surface → plain/background/subtle, exact', s.status === 'exact' && s.target === 'plain/background/subtle', s);
  ok('  primitive fallback for Light/ is gray/10', s.fallback === 'gray/10', s.fallback);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/95'], styleMode: 'dark', context: 'stroke' });
  ok('BDL Gray/95 stroke → plain/border/subtle', /^plain\/border\//.test(s.target), s.target);
  ok('  primitive fallback for Dark/ is gray/980', s.fallback === 'gray/980', s.fallback);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/70'], styleMode: 'light', context: 'stroke' });
  ok('BDL Gray/70 stroke → plain/border/normal (role hint beats a demoted alias)', s.target === 'plain/border/normal', s.target);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/70'], styleMode: 'light', context: 'surface' });
  ok('BDL Gray/70 surface → plain/container/normal exact', s.status === 'exact' && s.target === 'plain/container/normal', s.target);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/5'], styleMode: 'light', isText: true, context: 'text' });
  ok('BDL Gray/5 text → plain/textIcon/normal by role hint, unchecked', s.target === 'plain/textIcon/normal' && s.status === 'review' && !s.checked, s);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/10'], styleMode: 'light', context: 'surface' });
  ok('BDL Gray/10 (no close semantic) falls back to primitive, checked', s.status === 'prim' && s.target === 'gray/970' && s.checked, s);
  s = sug({ kind: 'bdl', entry: M.bdl['Gray/0'], styleMode: 'light', isText: true, context: 'text' });
  ok('BDL Gray/0 text → textIcon/normal before the primitive fallback', s.target === 'plain/textIcon/normal' && s.status === 'review', s.target);
  s = sug({ kind: 'bdl', entry: M.bdl['primary/50'], styleMode: 'light', context: 'surface' });
  ok('BDL primitive already judged to a semantic → table target, auto', s.status === 'auto' && s.target === 'functional/brand/normal', s);
  s = sug({ kind: 'bdl', entry: M.bdl['primary/60'], styleMode: 'light', context: 'surface' });
  ok('BDL primary/60 (mode-flipping, no target) still gets context candidates', s.candidates.length > 0, s.status);
  s = sug({ kind: 'masterPrimitive', entry: M.masterPrimitive['gray/10'], name: 'gray/10', isText: true, context: 'text' });
  ok('Master gray/10 text → textIcon/normal exact', s.status === 'exact' && s.target === 'plain/textIcon/normal', s);
  s = sug({ kind: 'foundationPrimitive', name: 'orange/400', value: '#FF7434', context: 'surface' });
  ok('Foundation orange/400 surface → brand/normal exact', s.status === 'exact' && s.target === 'functional/brand/normal', s);
  s = sug({ kind: 'foundationPrimitive', name: 'gray/990', value: '#09090A', mode: 'dark', context: 'surface' });
  ok('dark frame compares the dark side', s.candidates[0] && M.tokens[s.candidates[0].name].dark === '#09090A', s.candidates[0]);
  s = sug({ kind: 'hex', name: '#FFFFFF', value: '#FFFFFF', context: 'surface' });
  ok('hex #FFFFFF surface → value match, checked', s.status === 'match' && s.checked && /^plain\//.test(s.target), s);
  s = sug({ kind: 'hex', name: '#68635F', value: '#68635F', isText: true, context: 'text' });
  ok('off-palette hex → unchecked review', !s.checked && (s.status === 'review' || s.status === 'approx'), s);
  s = sug({ kind: 'hex', name: '#FFFFFF1A', value: '#FFFFFF1A', context: 'surface' });
  ok('10% white hex has nothing near → no target', s.status === 'hold' && !s.target && s.candidates.length > 0, s.status);
  s = sug({ kind: 'hex', name: '#68635F', value: '#68635F', isText: true, context: 'text' });

  log('\n' + pass + ' passed, ' + fail + ' failed');
  if (isNode) process.exit(fail ? 1 : 0);
})();
