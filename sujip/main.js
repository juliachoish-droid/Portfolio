'use strict';

/* ════════════════════════════════════════════
   DOM
════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const trailCanvas  = $('trail-canvas');
const bottleCanvas = $('bottle-canvas');
const tCtx = trailCanvas.getContext('2d');
const bCtx = bottleCanvas.getContext('2d');

const cursor      = $('cursor');
const coordsEl    = $('coords');
const timeEl      = $('time-display');
const itemCountEl = $('bottle-item-count');
const countEl     = $('count');
const collectWrap = $('collect-wrap');
const collectBtn  = $('collect-btn');

const archiveEl   = $('section-archive');
const returnBtn   = $('return-btn');
const viewLatest  = $('view-latest-btn');
const archTotal   = $('arch-total');
const archTotal2  = $('arch-total2');
const archMsgSub  = $('arch-msg-sub');
const gridEl      = $('grid');
const colSlider   = $('col-slider');
const colLabel    = $('col-label');
const moreBtn     = $('more-btn');

const popupEl     = $('popup');
const popupBd     = $('popup-backdrop');
const popupClose  = $('popup-close');
const popupNum    = $('popup-num');
const popupId     = $('popup-id');
const popupDur    = $('popup-duration');
const popupCoords = $('popup-coords');
const popupCanvas = $('popup-canvas');
const popupList   = $('popup-items-list');
const popupCount  = $('popup-items-count');
const viewBtns    = document.querySelectorAll('.view-btn');
const binderTabs  = document.querySelectorAll('.binder-tab');
const filterTags  = document.querySelectorAll('.filter-tag');

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
let W = 0, H = 0;
let mx = -1e4, my = -1e4, pmx = -1e4, pmy = -1e4;
let mVX = 0, mVY = 0, mSpeed = 0, mActive = false;
let lastMoveT = Date.now();

let trail = [];          // 현재 세션 좌표
let hasMoved = false;
let sessionStart = Date.now();

let records = [];        // 저장된 기록들
let visibleRecords = [];
let latestRec = null;
let currentRec = null;
let popupView = 'blob';
let popupHoverType = null, popupHoverPt = null;
let popupRowMap = new Map();
let lastScrollType = null;
const archiveFilters = {
  shape: new Set(),
  color: new Set(),
  period: null
};

let spawnCooldown = 0;
let bottleItems = [];
let bottleLoopRunning = false;

/* ════════════════════════════════════════════
   PALETTES
════════════════════════════════════════════ */
const PALETTES = [
  { name:'rose',    bg:'#f6f2f5', arc:'#f7f1f5', pop:'#f5eef3', line:'rgba(85,74,92,.62)',
    i:[92,63,126],  m:[191,132,186], o:[235,208,234] },
  { name:'sage',    bg:'#f2f6f1', arc:'#f1f7f2', pop:'#edf5ef', line:'rgba(64,88,70,.62)',
    i:[66,107,75],  m:[142,193,144], o:[216,236,220] },
  { name:'sky',     bg:'#f2f5f8', arc:'#f1f5f8', pop:'#eef3f8', line:'rgba(72,91,120,.62)',
    i:[73,107,143], m:[135,177,214], o:[214,229,243] },
  { name:'peach',   bg:'#f8f4ef', arc:'#f8f2ee', pop:'#f7efe9', line:'rgba(108,82,66,.62)',
    i:[132,89,69],  m:[214,155,123], o:[241,223,205] },
  { name:'butter',  bg:'#f7f7ef', arc:'#f6f7ee', pop:'#f3f6ec', line:'rgba(91,96,61,.62)',
    i:[113,110,57], m:[171,193,115], o:[228,236,204] },
  { name:'violet',  bg:'#f5f2f8', arc:'#f4f1f8', pop:'#f2eef8', line:'rgba(84,74,121,.62)',
    i:[88,75,142],  m:[164,145,220], o:[224,216,242] },
];
let paletteIdx = 0;
let pal = PALETTES[0];

function nextPalette() {
  paletteIdx = (paletteIdx + 1) % PALETTES.length;
  pal = PALETTES[paletteIdx];
  document.documentElement.style.setProperty('--bg', pal.bg);
  document.documentElement.style.setProperty('--overlay', pal.arc);
  document.documentElement.style.setProperty('--overlay-soft', hexRgba(pal.arc, .88));
}
function applyPalette() {
  document.documentElement.style.setProperty('--bg', pal.bg);
  document.documentElement.style.setProperty('--overlay', pal.arc);
  document.documentElement.style.setProperty('--overlay-soft', hexRgba(pal.arc, .88));
}

/* ════════════════════════════════════════════
   BOTTLE  SHAPES  — 6종
   totalH 대비 비율. bodyBulge 음수 = 모래시계
════════════════════════════════════════════ */
// const SHAPES = [
//   { id:'apothecary', bW:.70, bH:.50, sH:.07, nW:.30, nH:.13, lW:.34, lH:.022, bulge:.06,  flare:1.0 },
//   { id:'long-neck',  bW:.86, bH:.28, sH:.15, nW:.16, nH:.38, lW:.19, lH:.022, bulge:.018, flare:1.5 },
//   { id:'hourglass',  bW:.62, bH:.52, sH:.08, nW:.28, nH:.16, lW:.32, lH:.022, bulge:-.09, flare:.65 },
//   { id:'potion',     bW:.58, bH:.44, sH:.10, nW:.14, nH:.30, lW:.17, lH:.025, bulge:.12,  flare:1.7 },
//   { id:'decanter',   bW:.72, bH:.46, sH:.17, nW:.21, nH:.21, lW:.25, lH:.022, bulge:.016, flare:1.9 },
//   { id:'cylinder',   bW:.38, bH:.62, sH:.04, nW:.31, nH:.10, lW:.35, lH:.025, bulge:.002, flare:.9  },
//   { id:'jar-round',   bW:.82, bH:.54, sH:.05, nW:.23, nH:.10, lW:.28, lH:.022, bulge:.12,  flare:1.05 },
//   { id:'slim-vase',   bW:.52, bH:.42, sH:.10, nW:.14, nH:.32, lW:.18, lH:.020, bulge:.02,  flare:1.35 },
//   { id:'flat-flask',  bW:.92, bH:.26, sH:.12, nW:.18, nH:.24, lW:.22, lH:.022, bulge:.01,  flare:1.60 },
//   { id:'soft-hour',   bW:.66, bH:.50, sH:.08, nW:.22, nH:.16, lW:.26, lH:.022, bulge:-.05, flare:.90 },
//   { id:'mini-jar',    bW:.74, bH:.58, sH:.04, nW:.26, nH:.08, lW:.30, lH:.024, bulge:.09,  flare:1.00 },
//   { id:'tall-bottle', bW:.58, bH:.36, sH:.11, nW:.13, nH:.40, lW:.17, lH:.020, bulge:.015, flare:1.45 },
// ];

const SHAPES = [
  {
    id: 'round-jar',
    family: 'jar',
    bW: .82, bH: .56, sH: .04,
    nW: .22, nH: .10,
    lW: .28, lH: .020,
    belly: 1.12,
    base: .90,
    flare: 1.00
  },
  {
    id: 'soft-oval-vase',
    family: 'vase',
    bW: .54, bH: .50, sH: .08,
    nW: .14, nH: .22,
    lW: .18, lH: .018,
    waist: .86,
    base: .84,
    flare: 1.06
  },
  {
  id: 'double-oval',
  family: 'hourglass',
  bW: .82, bH: .58, sH: .05,
  nW: .18, nH: .14,
  lW: .22, lH: .020,
  pinch: .48,
  base: .94,
  flare: .78
  }
];

// 새로고침마다 순서대로
let shapeIdx = (() => {
  const s = parseInt(sessionStorage.getItem('si') || '-1');
  const n = (s + 1) % SHAPES.length;
  sessionStorage.setItem('si', n);
  return s < 0 ? 0 : s;
})();
let S = SHAPES[shapeIdx];   // 현재 병 모양

/* 병 치수 (resize/shapeChange 시 재계산) */
const B = {};
function calcBottle() {
  const totalH = Math.min(H * 0.50, 300);
  const cx = W * 0.5;
  const baseY = H - Math.max(130, H * 0.16)+130;

  B.cx = cx; B.totalH = totalH; B.baseY = baseY;
  B.bW = totalH * S.bW;
  B.bH = totalH * S.bH;
  B.sH = totalH * S.sH;
  B.nW = totalH * S.nW;
  B.nH = totalH * S.nH;
  B.lW = totalH * S.lW;
  B.lH = totalH * S.lH;

  B.floorY      = baseY - totalH * 0.06;
  B.bodyTopY    = B.floorY - B.bH;
  B.shoulderTopY= B.bodyTopY - B.sH;
  B.neckTopY    = B.shoulderTopY - B.nH;
}

/* y 위치에서 병 내부 x 범위 */
function innerBounds(y) {
  if (y > B.floorY || y < B.neckTopY) return null;
  const cx = B.cx;
  const bulge = S.bulge;

  if (y >= B.bodyTopY) {
    const t  = (y - B.bodyTopY) / B.bH;
    const sg = Math.sin(t * Math.PI);
    const hw = bulge >= 0
      ? (B.bW / 2) * 0.90 * (1 + sg * bulge)
      : Math.max((B.bW / 2) * 0.90 + sg * bulge * B.bW * 1.8, B.nW * 0.28);
    return { l: cx - hw, r: cx + hw };
  }
  if (y >= B.shoulderTopY) {
    const t  = (y - B.shoulderTopY) / B.sH;
    const hw = lerp(B.nW / 2 * 0.94, B.bW / 2 * 0.90, t);
    return { l: cx - hw, r: cx + hw };
  }
  return { l: cx - B.nW / 2 * 0.88, r: cx + B.nW / 2 * 0.88 };
}

function lerp(a, b, t) { return a + (b - a) * t; }

/* ════════════════════════════════════════════
   BOTTLE  PATH  BUILDER
════════════════════════════════════════════ */
// function bottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape) {
//   const p   = new Path2D();
//   const hw  = bW / 2;
//   const hnw = nW / 2;
//   const hlw = lW / 2;
//   const bodyH      = totalH * bH_ratio;
//   const bodyTopY   = floorY - bodyH;
//   const shdTopY    = bodyTopY - sH;
//   const neckTopY   = shdTopY  - nH;
//   const lipTopY    = neckTopY - lH;
//   const flare = shape.flare ?? 1.0;
//   const bulge = shape.bulge ?? 0.025;

//   p.moveTo(cx - hlw, lipTopY);
//   p.lineTo(cx + hlw, lipTopY);
//   p.lineTo(cx + hlw, neckTopY);
//   p.lineTo(cx + hnw, neckTopY);
//   p.lineTo(cx + hnw, shdTopY);

//   // 어깨 오른쪽
//   p.bezierCurveTo(
//     cx + hnw * (1 + (flare-1) * .28), shdTopY + sH * .28,
//     cx + hw  * (.88 + (flare-1) * .07), bodyTopY - sH * .04,
//     cx + hw  * .96, bodyTopY
//   );

//   // 몸통 오른쪽
//   const mR = bulge >= 0
//     ? cx + hw * (1.0 + bulge)
//     : cx + hw * (1.0 + bulge * 2.0);
//   p.bezierCurveTo(mR, bodyTopY + bodyH*.28, mR, floorY - bodyH*.28, cx + hw*.92, floorY);

//   // 바닥
//   p.bezierCurveTo(cx + hw*.56, floorY + totalH*.056, cx - hw*.56, floorY + totalH*.056, cx - hw*.92, floorY);

//   // 몸통 왼쪽
//   const mL = bulge >= 0
//     ? cx - hw * (1.0 + bulge)
//     : cx - hw * (1.0 + bulge * 2.0);
//   p.bezierCurveTo(mL, floorY - bodyH*.28, mL, bodyTopY + bodyH*.28, cx - hw*.96, bodyTopY);

//   // 어깨 왼쪽
//   p.bezierCurveTo(
//     cx - hw  * (.88 + (flare-1) * .07), bodyTopY - sH * .04,
//     cx - hnw * (1 + (flare-1) * .28), shdTopY + sH * .28,
//     cx - hnw, shdTopY
//   );

//   p.lineTo(cx - hnw, neckTopY);
//   p.lineTo(cx - hlw, neckTopY);
//   p.lineTo(cx - hlw, lipTopY);
//   p.closePath();
//   return p;
// }

/* ════════════════════════════════════════════
   BOTTLE  PATH  BUILDER
   family: jar / vase / hourglass
════════════════════════════════════════════ */
function bottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape) {
  const family = shape.family || 'jar';

  if (family === 'vase') {
    return vaseBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape);
  }

  if (family === 'hourglass') {
    return hourglassBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape);
  }

  return jarBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape);
}

function jarBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape) {
  const p   = new Path2D();
  const hw  = bW / 2;
  const hnw = nW / 2;
  const hlw = lW / 2;

  const bodyH    = totalH * bH_ratio;
  const bodyTopY = floorY - bodyH;
  const shdTopY  = bodyTopY - sH;
  const neckTopY = shdTopY - nH;
  const lipTopY  = neckTopY - lH;

  const belly = shape.belly ?? 1.10;
  const base  = shape.base ?? 0.90;
  const flare = shape.flare ?? 1.0;

  p.moveTo(cx - hlw, lipTopY);
  p.lineTo(cx + hlw, lipTopY);
  p.lineTo(cx + hlw, neckTopY);
  p.lineTo(cx + hnw, neckTopY);
  p.lineTo(cx + hnw, shdTopY);

  // 어깨 → 몸통
  p.bezierCurveTo(
    cx + hnw * (1 + (flare - 1) * 0.25), shdTopY + sH * 0.30,
    cx + hw * 0.92,                        bodyTopY + bodyH * 0.02,
    cx + hw * 0.98,                        bodyTopY + bodyH * 0.12
  );

  // 몸통 오른쪽 (둥글고 안정감)
  p.bezierCurveTo(
    cx + hw * belly, bodyTopY + bodyH * 0.30,
    cx + hw * belly, floorY  - bodyH * 0.26,
    cx + hw * base,  floorY
  );

  // 바닥
  p.bezierCurveTo(
    cx + hw * 0.58, floorY + totalH * 0.05,
    cx - hw * 0.58, floorY + totalH * 0.05,
    cx - hw * base, floorY
  );

  // 몸통 왼쪽
  p.bezierCurveTo(
    cx - hw * belly, floorY  - bodyH * 0.26,
    cx - hw * belly, bodyTopY + bodyH * 0.30,
    cx - hw * 0.98,  bodyTopY + bodyH * 0.12
  );

  // 어깨 왼쪽
  p.bezierCurveTo(
    cx - hw * 0.92,                        bodyTopY + bodyH * 0.02,
    cx - hnw * (1 + (flare - 1) * 0.25),  shdTopY + sH * 0.30,
    cx - hnw,                              shdTopY
  );

  p.lineTo(cx - hnw, neckTopY);
  p.lineTo(cx - hlw, neckTopY);
  p.lineTo(cx - hlw, lipTopY);
  p.closePath();

  return p;
}

function vaseBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape) {
  const p   = new Path2D();
  const hw  = bW / 2;
  const hnw = nW / 2;
  const hlw = lW / 2;

  const bodyH    = totalH * bH_ratio;
  const bodyTopY = floorY - bodyH;
  const shdTopY  = bodyTopY - sH;
  const neckTopY = shdTopY - nH;
  const lipTopY  = neckTopY - lH;

  const waist = shape.waist ?? 0.86;
  const base  = shape.base ?? 0.84;
  const flare = shape.flare ?? 1.06;

  p.moveTo(cx - hlw, lipTopY);
  p.lineTo(cx + hlw, lipTopY);
  p.lineTo(cx + hlw, neckTopY);
  p.lineTo(cx + hnw, neckTopY);
  p.lineTo(cx + hnw, shdTopY);

  // 어깨: 덜 뾰족하고 부드럽게
  p.bezierCurveTo(
    cx + hnw * (1 + (flare - 1) * 0.10), shdTopY + sH * 0.32,
    cx + hw  * 0.92,                     bodyTopY + bodyH * 0.10,
    cx + hw  * 0.96,                     bodyTopY + bodyH * 0.24
  );

  // 몸통 위쪽: 거의 직선처럼 보이게 완만하게
  p.bezierCurveTo(
    cx + hw * 0.98,  bodyTopY + bodyH * 0.36,
    cx + hw * waist, bodyTopY + bodyH * 0.62,
    cx + hw * base,  floorY
  );

  // 바닥
  p.bezierCurveTo(
    cx + hw * 0.56, floorY + totalH * 0.035,
    cx - hw * 0.56, floorY + totalH * 0.035,
    cx - hw * base, floorY
  );

  // 몸통 왼쪽
  p.bezierCurveTo(
    cx - hw * waist, bodyTopY + bodyH * 0.62,
    cx - hw * 0.98,  bodyTopY + bodyH * 0.36,
    cx - hw * 0.96,  bodyTopY + bodyH * 0.24
  );

  // 어깨 왼쪽
  p.bezierCurveTo(
    cx - hw  * 0.92,                     bodyTopY + bodyH * 0.10,
    cx - hnw * (1 + (flare - 1) * 0.10), shdTopY + sH * 0.32,
    cx - hnw,                            shdTopY
  );

  p.lineTo(cx - hnw, neckTopY);
  p.lineTo(cx - hlw, neckTopY);
  p.lineTo(cx - hlw, lipTopY);
  p.closePath();

  return p;
}

function hourglassBottlePath(cx, floorY, totalH, bW, bH_ratio, sH, nW, nH, lW, lH, shape) {
  const p   = new Path2D();
  const hw  = bW / 2;
  const hnw = nW / 2;
  const hlw = lW / 2;

  const bodyH    = totalH * bH_ratio;
  const bodyTopY = floorY - bodyH;
  const shdTopY  = bodyTopY - sH;
  const neckTopY = shdTopY - nH;
  const lipTopY  = neckTopY - lH;

  const pinch = shape.pinch ?? 0.42;
  const base  = shape.base ?? 0.90;
  const flare = shape.flare ?? 0.82;

  p.moveTo(cx - hlw, lipTopY);
  p.lineTo(cx + hlw, lipTopY);
  p.lineTo(cx + hlw, neckTopY);
  p.lineTo(cx + hnw, neckTopY);
  p.lineTo(cx + hnw, shdTopY);

  // 윗 타원으로 부드럽게 퍼짐 (어깨 각 없음)
  p.bezierCurveTo(
    cx + hnw * (1 + (1 - flare) * 0.08), shdTopY + sH * 0.35,
    cx + hw  * 0.98,                     bodyTopY + bodyH * 0.10,
    cx + hw  * 0.96,                     bodyTopY + bodyH * 0.24
  );

  // 위 타원 → 허리
  p.bezierCurveTo(
    cx + hw  * 0.94,  bodyTopY + bodyH * 0.34,
    cx + hw  * pinch, bodyTopY + bodyH * 0.46,
    cx + hw  * pinch, bodyTopY + bodyH * 0.52
  );

  // 허리 → 아래 타원
  p.bezierCurveTo(
    cx + hw  * pinch, bodyTopY + bodyH * 0.58,
    cx + hw  * 1.02,  floorY  - bodyH * 0.18,
    cx + hw  * base,  floorY
  );

  // 바닥
  p.bezierCurveTo(
    cx + hw * 0.58, floorY + totalH * 0.04,
    cx - hw * 0.58, floorY + totalH * 0.04,
    cx - hw * base, floorY
  );

  // 아래 타원 → 허리
  p.bezierCurveTo(
    cx - hw  * 1.02,  floorY  - bodyH * 0.18,
    cx - hw  * pinch, bodyTopY + bodyH * 0.58,
    cx - hw  * pinch, bodyTopY + bodyH * 0.52
  );

  // 허리 → 윗 타원
  p.bezierCurveTo(
    cx - hw  * pinch, bodyTopY + bodyH * 0.46,
    cx - hw  * 0.94,  bodyTopY + bodyH * 0.34,
    cx - hw  * 0.96,  bodyTopY + bodyH * 0.24
  );

  // 윗 타원 → 목
  p.bezierCurveTo(
    cx - hw  * 0.98,                     bodyTopY + bodyH * 0.10,
    cx - hnw * (1 + (1 - flare) * 0.08), shdTopY + sH * 0.35,
    cx - hnw,                            shdTopY
  );

  p.lineTo(cx - hnw, neckTopY);
  p.lineTo(cx - hlw, neckTopY);
  p.lineTo(cx - hlw, lipTopY);
  p.closePath();

  return p;
}

function currentBottlePath() {
  return bottlePath(B.cx, B.floorY, B.totalH, B.bW, S.bH, B.sH, B.nW, B.nH, B.lW, B.lH, S);
}

/* ════════════════════════════════════════════
   GLASS  EFFECT
════════════════════════════════════════════ */
function drawGlass(c, path, cx, hw, bodyTopY, floorY) {
  c.save();
  c.fillStyle = 'rgba(26,26,24,.018)';
  c.fill(path);

  c.save();
  c.clip(path);
  const g1 = c.createLinearGradient(cx - hw*.72, bodyTopY, cx - hw*.44, floorY);
  g1.addColorStop(0,   'rgba(255,255,255,0)');
  g1.addColorStop(.25, 'rgba(255,255,255,.08)');
  g1.addColorStop(.7,  'rgba(255,255,255,.04)');
  g1.addColorStop(1,   'rgba(255,255,255,0)');
  c.fillStyle = g1;
  c.fillRect(cx - hw*.8, bodyTopY - 30, hw*.38, floorY - bodyTopY + 60);
  c.restore();

  c.strokeStyle = 'rgba(26,26,24,.16)';
  c.lineWidth = .9;
  c.stroke(path);
  c.restore();
}

/* ════════════════════════════════════════════
   ITEMS  — 아이템 타입, 모양, 레이블
════════════════════════════════════════════ */
const ITEM_TYPES = ['ticket','pebble','shell','coin','receipt','wrapper','leaf','button','stamp','key'];
const ITEM_LABELS = {
  ticket:  { ko:'티켓',    note:'가볍게 스치듯' },
  pebble:  { ko:'조약돌',  note:'묵직하게' },
  shell:   { ko:'조개껍질',note:'곡선을 그리며' },
  coin:    { ko:'동전',    note:'또렷하고 빠르게' },
  receipt: { ko:'영수증',  note:'길게 흔들리며' },
  wrapper: { ko:'포장지',  note:'불규칙하게' },
  leaf:    { ko:'잎사귀',  note:'빠르게 스치듯' },
  button:  { ko:'단추',    note:'작고 잦게' },
  stamp:   { ko:'우표',    note:'반듯하게' },
  key:     { ko:'열쇠',    note:'무게감 있게' },
};

const ITEM_DRAW = {
  ticket:  (c,s) => { c.rect(-s,-s*.44,s*2,s*.88); c.moveTo(-s*.7,-s*.44); c.arc(-s*.7,-s*.44,s*.13,0,Math.PI); c.moveTo(s*.7,-s*.44); c.arc(s*.7,-s*.44,s*.13,Math.PI,0); },
  pebble:  (c,s) => { c.ellipse(0,0,s*.90,s*.65,.35,0,Math.PI*2); },
  shell:   (c,s) => { c.moveTo(0,s*.28); for(let a=Math.PI+.25;a<=Math.PI*2-.25;a+=.06){ const r=s*(.92+.07*Math.sin((a-Math.PI)*8)); c.lineTo(Math.cos(a)*r,Math.sin(a)*r+s*.28); } c.closePath(); },
  coin:    (c,s) => { c.arc(0,0,s*.72,0,Math.PI*2); },
  receipt: (c,s) => { const w=s*.58,h=s*1.25; c.moveTo(-w,-h); c.lineTo(w,-h); c.lineTo(w,h*.65); for(let i=5;i>=0;i--){ const x=lerp(-w,w,i/5); c.lineTo(x,h*(i%2===0?.65:.95)); } c.closePath(); },
  wrapper: (c,s) => { [[-1,-.48],[-.38,-.88],[.42,-.92],[.96,-.38],[.98,.18],[.58,.82],[-.08,.92],[-.72,.56],[-.96,.12]].forEach(([px,py],i)=>{ i===0?c.moveTo(px*s,py*s):c.lineTo(px*s,py*s); }); c.closePath(); },
  leaf:    (c,s) => { c.moveTo(0,-s); c.bezierCurveTo(s*.85,-s*.5,s*.85,s*.5,0,s); c.bezierCurveTo(-s*.85,s*.5,-s*.85,-s*.5,0,-s); },
  button:  (c,s) => { c.arc(0,0,s*.72,0,Math.PI*2); c.moveTo(s*.38,0); c.arc(0,0,s*.38,0,Math.PI*2,true); },
  stamp:   (c,s) => { const w=s*.80,h=s*.96,n=s*.09,st=4; const edge=(a,b,fx,fy,horiz,rev)=>{ for(let i=0;i<=st;i++){ const v=lerp(a,b,i/st); const bmp=(i===0||i===st)?0:(i%2===0?-n:n)*(rev?-1:1); horiz?c.lineTo(v,fy+bmp):c.lineTo(fx+bmp,v); } }; c.moveTo(-w+n,-h); edge(-w+n,w-n,0,-h,true,false); edge(-h+n,h-n,w,0,false,false); edge(w-n,-w+n,0,h,true,true); edge(h-n,-h+n,-w,0,false,true); c.closePath(); },
  key:     (c,s) => { c.arc(-s*.36,0,s*.46,0,Math.PI*2); c.moveTo(-s*.14,0); c.arc(-s*.36,0,s*.22,0,Math.PI*2,true); c.rect(-s*.02,-s*.13,s*.96,s*.26); c.rect(s*.52,s*.13,s*.18,s*.30); c.rect(s*.76,s*.13,s*.16,s*.22); },
};

/* ════════════════════════════════════════════
   PHYSICS
════════════════════════════════════════════ */
const GRAV = .40, FRIC = .68, BOUNCE = .22, MAX_ITEMS = 80;

function spawnItem(speed) {
  if (bottleItems.length >= MAX_ITEMS) return;
  const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
  const base = B.bW * .074;
  const sf   = Math.min(speed / 35, 1);
  const sz   = base * (.62 + sf * .42 + Math.random() * .26);
  bottleItems.push({
    type, sz,
    collectedAt: Date.now() - sessionStart,
    x: B.cx + (Math.random()-.5) * B.nW * .30,
    y: B.neckTopY - sz * 1.3,
    vx: (Math.random()-.5)*.9 + mVX*.03,
    vy: 1.5 + Math.random()*1.6,
    rot: Math.random()*Math.PI*2,
    aVel: (Math.random()-.5)*.13,
    opacity: 0, settled: false, sTimer: 0,
  });
}

function tickPhysics() {
  const n = bottleItems.length;

  for (let i = 0; i < n; i++) {
    const it = bottleItems[i];
    if (it.opacity < 1) it.opacity = Math.min(1, it.opacity + .055);
    if (it.settled) { it.rot += it.aVel; it.aVel *= .80; continue; }

    it.vy += GRAV; it.vx *= .994;
    it.x += it.vx; it.y += it.vy;
    it.rot += it.aVel; it.aVel *= .975;

    const bd = innerBounds(it.y);
    const r  = it.sz;
    if (bd) {
      if (it.x - r < bd.l) { it.x = bd.l + r; it.vx =  Math.abs(it.vx)*BOUNCE+.1; it.aVel += .03; }
      if (it.x + r > bd.r) { it.x = bd.r - r; it.vx = -Math.abs(it.vx)*BOUNCE-.1; it.aVel -= .03; }
    } else if (it.y < B.neckTopY) {
      it.x += (B.cx - it.x) * .05;
    }

    if (it.y + r > B.floorY) {
      it.y = B.floorY - r;
      it.vy = -Math.abs(it.vy) * BOUNCE;
      it.vx *= FRIC; it.aVel *= FRIC;
      if (Math.abs(it.vy) < .55 && Math.abs(it.vx) < .38) {
        if (++it.sTimer > 10) { it.settled = true; it.vy = 0; it.vx = 0; }
      } else { it.sTimer = 0; }
    }
  }

  // 아이템 간 충돌
  for (let i = 0; i < n; i++) {
    for (let j = i+1; j < n; j++) {
      const a = bottleItems[i], b = bottleItems[j];
      const dx = b.x-a.x, dy = b.y-a.y;
      const minD = (a.sz + b.sz) * .93;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist >= minD || dist < .001) continue;
      const ov = minD - dist, nx = dx/dist, ny = dy/dist;
      const wA = a.settled?0:1, wB = b.settled?0:1, wT = wA+wB||1;
      if (!a.settled) { a.x -= nx*ov*(wB/wT); a.y -= ny*ov*(wB/wT); }
      if (!b.settled) { b.x += nx*ov*(wA/wT); b.y += ny*ov*(wA/wT); }
      const rvn = (b.vx-a.vx)*nx + (b.vy-a.vy)*ny;
      if (rvn > 0) continue;
      const imp = rvn * .40;
      if (!a.settled) { a.vx += imp*nx; a.vy += imp*ny; a.sTimer=0; }
      if (!b.settled) { b.vx -= imp*nx; b.vy -= imp*ny; b.sTimer=0; }
      if (a.settled && !b.settled) b.sTimer += 3;
      if (b.settled && !a.settled) a.sTimer += 3;
    }
  }
}

/* ════════════════════════════════════════════
   TRAIL  RENDERING
════════════════════════════════════════════ */
const TRAIL_MAX  = 120;
const TRAIL_DRAW = 220;  // 한 번에 그릴 최근 포인트 수

let fullTrail = [];     // 세션 전체 (수집용)
let drawTrail = [];     // 최근 TRAIL_MAX 개 (라이브 렌더용)

function pushPoint(x, y, dt, now) {
  const pt = { x, y, t: now - sessionStart, dt: Math.min(dt, 120) };
  drawTrail.push(pt);
  if (drawTrail.length > TRAIL_MAX) drawTrail.shift();
  fullTrail.push(pt);
}

function drawLiveTrail() {
  tCtx.fillStyle = hexRgba(pal.bg, .028);
  tCtx.fillRect(0, 0, W, H);

  const pts = fullTrail.slice(-TRAIL_DRAW);
  if (pts.length < 2) return;

  for (const p of pts) {
    const dw = Math.min((p.dt||16)/16, 7);
    const r  = 28 + dw * 5.8;
    const al = Math.min(.0072 + dw * .0036, .032);
    const g  = tCtx.createRadialGradient(p.x,p.y,0, p.x,p.y,r);
    g.addColorStop(0,    rgba(pal.i, al));
    g.addColorStop(.38,  rgba(pal.m, al*.55));
    g.addColorStop(.72,  rgba(pal.o, al*.18));
    g.addColorStop(1,    rgba(pal.o, 0));
    tCtx.beginPath(); tCtx.fillStyle = g;
    tCtx.arc(p.x, p.y, r, 0, Math.PI*2); tCtx.fill();
  }

  // 라인
  for (let i = 1; i < pts.length; i++) {
    const t = i / pts.length;
    tCtx.beginPath();
    tCtx.moveTo(pts[i-1].x, pts[i-1].y);
    tCtx.lineTo(pts[i].x,   pts[i].y);
    tCtx.strokeStyle = rgba(pal.i, t * .011);
    tCtx.lineWidth = .55; tCtx.lineCap = 'round'; tCtx.stroke();
  }
}

/* ════════════════════════════════════════════
   BOTTLE  RENDERING
════════════════════════════════════════════ */
function drawBottleScene() {
  bCtx.clearRect(0, 0, W, H);
  const path = currentBottlePath();

  // 병 안 트레일 강조
  const pts = fullTrail.slice(-TRAIL_DRAW);
  if (pts.length) {
    bCtx.save();
    bCtx.clip(path);
    bCtx.fillStyle = 'rgba(255,255,255,.16)';
    bCtx.fill(path);
    for (const p of pts) {
      const dw = Math.min((p.dt||16)/16, 7);
      const r  = (26 + dw*5.4) * .82;
      const al = Math.min((.0072 + dw*.0036) * 2.6, .032*3);
      const g  = bCtx.createRadialGradient(p.x,p.y,0, p.x,p.y,r);
      g.addColorStop(0,   rgba(pal.i, al));
      g.addColorStop(.4,  rgba(pal.m, al*.52));
      g.addColorStop(1,   rgba(pal.o, 0));
      bCtx.beginPath(); bCtx.fillStyle = g;
      bCtx.arc(p.x, p.y, r, 0, Math.PI*2); bCtx.fill();
    }
    bCtx.restore();
  }

  // 아이템
  bCtx.save();
  bCtx.clip(path);
  for (const it of bottleItems) {
    bCtx.save();
    bCtx.globalAlpha = it.opacity * .76;
    bCtx.translate(it.x, it.y); bCtx.rotate(it.rot);
    bCtx.beginPath();
    ITEM_DRAW[it.type]?.(bCtx, it.sz);
    bCtx.fillStyle = 'rgba(26,26,24,.72)'; bCtx.fill();
    bCtx.restore();
  }
  bCtx.restore();

  // 유리 효과
  drawGlass(bCtx, path, B.cx, B.bW/2, B.bodyTopY, B.floorY);
}

/* ════════════════════════════════════════════
   MAIN  LOOPS
════════════════════════════════════════════ */
function trailLoop() {
  drawLiveTrail();
  requestAnimationFrame(trailLoop);
}

let frameCount = 0;
function bottleLoop() {
  frameCount++;
  // 2프레임에 한 번 물리 계산 (아이템 없으면 스킵)
  if (bottleItems.length > 0 && frameCount % 2 === 0) tickPhysics();
  if (bottleItems.length > 0 || fullTrail.length > 0) drawBottleScene();
  requestAnimationFrame(bottleLoop);
}

function startBottleLoop() {
  if (bottleLoopRunning) return;
  bottleLoopRunning = true;
  // 초기 병 외관 그리기
  bCtx.clearRect(0, 0, W, H);
  drawGlass(bCtx, currentBottlePath(), B.cx, B.bW/2, B.bodyTopY, B.floorY);
  requestAnimationFrame(bottleLoop);
}

/* ════════════════════════════════════════════
   SPAWN  (속도 기반)
════════════════════════════════════════════ */
const SPAWN = { minSpeed:4, baseProb:.010, maxProb:.055, fastSpeed:28, cooldown:18 };

function trySpawn() {
  if (spawnCooldown > 0) { spawnCooldown--; return; }
  if (mSpeed < SPAWN.minSpeed) return;
  const t  = Math.min((mSpeed - SPAWN.minSpeed) / (SPAWN.fastSpeed - SPAWN.minSpeed), 1);
  const pr = SPAWN.baseProb + t * (SPAWN.maxProb - SPAWN.baseProb);
  if (Math.random() < pr) {
    spawnItem(mSpeed);
    if (mSpeed > SPAWN.fastSpeed * .7)
      spawnCooldown = Math.floor(SPAWN.cooldown * (1 - t * .5));
  }
}

/* ════════════════════════════════════════════
   ARCHIVE  CELL  DRAWING
════════════════════════════════════════════ */
function drawCell(canvas, rec) {
  const c  = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  const p  = rec.palette;
  const sh = rec.shape;

  c.clearRect(0, 0, cw, ch);

  // 모든 병 바닥을 같은 선반선에 맞춘다.
  const shelfY  = ch - 8;
  const maxH    = ch * 0.86;
  const sc      = Math.min(maxH / rec.totalH, cw / (rec.bW * 1.28));
  const snapCx  = cw * .5;
  const snapFlY = shelfY;

  const sp = bottlePath(
    snapCx, snapFlY, rec.totalH * sc,
    rec.bW * sc, sh.bH,
    rec.sH * sc, rec.nW * sc, rec.nH * sc,
    rec.lW * sc, rec.lH * sc, sh
  );

  const bodyH    = rec.totalH * sc * sh.bH;
  const bodyTopY = snapFlY - bodyH;
  const shdTopY  = bodyTopY - rec.sH * sc;
  const neckTopY = shdTopY  - rec.nH * sc;
  const iL = snapCx - rec.bW * sc * .34;
  const iR = snapCx + rec.bW * sc * .34;
  const iT = bodyTopY + bodyH * .10;
  const iB = snapFlY  - bodyH * .08;

  c.save();
  c.clip(sp);

  // 병 내부 유리층을 두껍게 깔아 내부를 더 밝게 띄운다.
  const glassBase = c.createLinearGradient(snapCx, neckTopY, snapCx, snapFlY);
  glassBase.addColorStop(0, 'rgba(255,255,255,.36)');
  glassBase.addColorStop(.28, rgba(p.o, .10));
  glassBase.addColorStop(.52, 'rgba(255,255,255,.18)');
  glassBase.addColorStop(.68, rgba(p.m, .08));
  glassBase.addColorStop(1, 'rgba(245,244,240,.36)');
  c.fillStyle = glassBase;
  c.fillRect(snapCx - rec.bW * sc * .68, neckTopY, rec.bW * sc * 1.36, snapFlY - neckTopY + 8);

  const innerFog = c.createRadialGradient(
    snapCx, bodyTopY + bodyH * .58, rec.bW * sc * .08,
    snapCx, bodyTopY + bodyH * .58, rec.bW * sc * .82
  );
  innerFog.addColorStop(0, rgba(p.o, .14));
  innerFog.addColorStop(.42, rgba(p.m, .08));
  innerFog.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = innerFog;
  c.fillRect(snapCx - rec.bW * sc * .84, bodyTopY, rec.bW * sc * 1.68, snapFlY - bodyTopY);

  // 트레일 블롭을 병 안에 피팅
  if (rec.trail.length) {
    const xs = rec.trail.map(pt=>pt.x), ys = rec.trail.map(pt=>pt.y);
    const mnX=Math.min(...xs), mxX=Math.max(...xs);
    const mnY=Math.min(...ys), mxY=Math.max(...ys);
    const fit = Math.min((iR-iL)/Math.max(mxX-mnX,1), (iB-iT)/Math.max(mxY-mnY,1));
    const ox  = iL + ((iR-iL) - (mxX-mnX)*fit) * .5;
    const oy  = iT + ((iB-iT) - (mxY-mnY)*fit) * .5;
    const mapped = rec.trail.map(pt=>({...pt, x:ox+(pt.x-mnX)*fit, y:oy+(pt.y-mnY)*fit}));

    c.fillStyle = 'rgba(255,255,255,.09)';
    c.fillRect(iL-4, neckTopY, (iR-iL)+8, iB-neckTopY+6);

    for (const pt of mapped) {
      const dw = Math.min((pt.dt||16)/16, 7);
      const r  = 11 + dw*9;
      const al = Math.min(.018+dw*.01, .09);
      const g  = c.createRadialGradient(pt.x,pt.y,0, pt.x,pt.y,r);
      g.addColorStop(0,    rgba(p.i, al));
      g.addColorStop(.44,  rgba(p.m, al*.60));
      g.addColorStop(1,    rgba(p.o, 0));
      c.beginPath(); c.fillStyle = g;
      c.arc(pt.x, pt.y, r, 0, Math.PI*2); c.fill();
    }
  }

  // 아이템
  const ox2 = snapCx - rec.cx * sc;
  const oy2 = snapFlY + rec.totalH*sc*.06 - (rec.baseY - rec.totalH*.06) * sc;
  for (const it of rec.items) {
    c.save();
    c.globalAlpha = it.opacity * .52;
    c.translate(it.x*sc+ox2, it.y*sc+oy2); c.rotate(it.rot);
    c.beginPath(); ITEM_DRAW[it.type]?.(c, it.sz*sc);
    c.fillStyle = 'rgba(26,26,24,.48)'; c.fill();
    c.restore();
  }

  c.restore();
  drawGlass(c, sp, snapCx, rec.bW*sc/2, bodyTopY, snapFlY);
}

/* ════════════════════════════════════════════
   GRID
════════════════════════════════════════════ */
const CELLS_INIT = 40;
let totalCells = 0;

function addEmptyCell(i) {
  const d = document.createElement('div');
  d.className = 'cell empty';
  d.innerHTML = `<span class="cell-num">${String(i+1).padStart(3,'0')}</span>`;
  gridEl.appendChild(d);
  totalCells++;
}

function resizeCellCanvas(cell, rec) {
  const cv = cell.querySelector('canvas');
  if (!cv) return;

  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(cell.clientWidth * dpr));
  const height = Math.max(1, Math.round(cell.clientHeight * dpr));

  if (cv.width !== width || cv.height !== height) {
    cv.width = width;
    cv.height = height;
  }
  drawCell(cv, rec);
}

function redrawFilledCells() {
  const filled = gridEl.querySelectorAll('.cell.filled');
  filled.forEach((cell, idx) => {
    const rec = visibleRecords[idx];
    if (rec) resizeCellCanvas(cell, rec);
  });
}

function renderGrid(list = records) {
  visibleRecords = list;
  gridEl.innerHTML = '';
  totalCells = 0;

  const cellCount = Math.max(CELLS_INIT, list.length);

  for (let i = 0; i < cellCount; i++) {
    if (i < list.length) {
      const rec = list[i];
      const cell = document.createElement('div');
      cell.className = 'cell filled';
      cell.innerHTML = `<span class="cell-num">${String(i + 1).padStart(3, '0')}</span>`;

      const cv = document.createElement('canvas');
      cell.appendChild(cv);

      cell.addEventListener('click', () => openPopup(rec));
      gridEl.appendChild(cell);
      totalCells++;

      requestAnimationFrame(() => resizeCellCanvas(cell, rec));
    } else {
      addEmptyCell(i);
    }
  }

  archTotal2.textContent = list.length;
}

// 슬라이더 → CSS 변수 업데이트
function updateGridCols(val) {
  gridEl.style.setProperty('--grid-cols', val);
  colLabel.textContent = val;
  requestAnimationFrame(redrawFilledCells);
}
colSlider.addEventListener('input', () => updateGridCols(colSlider.value));
updateGridCols(colSlider.value);

/* ════════════════════════════════════════════
   COLLECT  /  RESET
════════════════════════════════════════════ */
function collect() {
  if (!fullTrail.length) return;
  const duration = Math.floor((Date.now() - sessionStart) / 1000);
  const items    = bottleItems.map(it => ({...it}));
  const rec = {
    idx: records.length + 1,
    trail: [...fullTrail],
    items,
    duration,
    createdAt: Date.now(),
    palette: pal,
    paletteName: pal.name,
    shape: S,
    shapeId: S.id,
    // 병 geometry 스냅샷
    totalH: B.totalH, bW: B.bW, sH: B.sH, nW: B.nW, nH: B.nH,
    lW: B.lW, lH: B.lH, cx: B.cx, baseY: B.baseY,
  };
  records.push(rec);
  latestRec = rec;

  const tot = records.length;
  countEl.textContent   = tot;
  archTotal.textContent = tot;
  archTotal2.textContent= tot;
  archMsgSub.textContent= `${fmtTime(duration)} 동안 ${fullTrail.length.toLocaleString()}개의 좌표`;

  renderGrid(getFilteredRecords());
  showArchive();
}

function resetSession() {
  hideArchive(); closePopup();
  fullTrail = []; drawTrail = [];
  bottleItems = []; hasMoved = false;
  sessionStart = Date.now();
  mSpeed = 0; mActive = false; mx = my = -1e4;

  // 다음 병 모양
  shapeIdx = (shapeIdx + 1) % SHAPES.length;
  S = SHAPES[shapeIdx];
  sessionStorage.setItem('si', shapeIdx);
  calcBottle();

  // 다음 팔레트
  nextPalette();

  collectWrap.classList.remove('visible');
  timeEl.textContent = '00:00';
  coordsEl.innerHTML = 'x:— &nbsp;y:—';
  itemCountEl.textContent = '0';

  // 병 외관 갱신
  bCtx.clearRect(0, 0, W, H);
  drawGlass(bCtx, currentBottlePath(), B.cx, B.bW/2, B.bodyTopY, B.floorY);

  // 배경 갱신
  tCtx.clearRect(0, 0, W, H);
  tCtx.fillStyle = pal.bg;
  tCtx.fillRect(0, 0, W, H);
}

/* ════════════════════════════════════════════
   ARCHIVE  SHOW / HIDE
════════════════════════════════════════════ */
function showArchive() {
  archiveEl.classList.add('visible');
  archiveEl.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function hideArchive() {
  archiveEl.classList.remove('visible');
  document.body.style.overflow = 'hidden';
}

/* ════════════════════════════════════════════
   POPUP
════════════════════════════════════════════ */
function openPopup(rec) {
  currentRec = rec;
  popupHoverType = null; popupHoverPt = null;
  lastScrollType = null; popupRowMap = new Map();

  document.documentElement.style.setProperty('--popup-surface', rec.palette.pop);
  document.documentElement.style.setProperty('--popup-panel', rec.palette.arc);
  document.documentElement.style.setProperty('--popup-panel-soft', hexRgba(rec.palette.arc, .55));

  popupNum.textContent  = `RECORD — ${String(rec.idx).padStart(3,'0')}`;
  popupId.textContent   = String(rec.idx).padStart(3,'0');
  popupDur.textContent  = fmtTime(rec.duration);
  popupCoords.textContent = rec.trail.length.toLocaleString();

  sizePopupCanvas();
  renderItemList(rec.items);
  setView(popupView, false);
  popupEl.classList.add('visible');
}

function closePopup() {
  popupEl.classList.remove('visible');
  currentRec = null; popupHoverType = null; popupHoverPt = null;
}

function setView(v, redraw=true) {
  popupView = v;
  viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === v));
  if (!currentRec) return;
  if (redraw) renderPopupTrail();
  else renderPopupTrail();
}

function sizePopupCanvas() {
  const wrap = popupCanvas.parentElement;
  if (!wrap) return;
  popupCanvas.width = popupCanvas.height = Math.max(240, wrap.clientWidth);
}

function renderPopupTrail() {
  if (!currentRec) return;
  const p = currentRec.palette;
  const w = popupCanvas.width, h = popupCanvas.height;
  const c = popupCanvas.getContext('2d');
  const sx = w / window.innerWidth, sy = h / window.innerHeight;

  c.clearRect(0,0,w,h);
  c.fillStyle = popupView === 'line' ? p.arc : p.pop;
  c.fillRect(0,0,w,h);

  const pts = currentRec.trail;
  if (!pts.length) return;

  if (popupView === 'line') {
    for (let i=1;i<pts.length;i++) {
      const t=i/pts.length;
      c.beginPath();
      c.moveTo(pts[i-1].x*sx, pts[i-1].y*sy);
      c.lineTo(pts[i].x*sx,   pts[i].y*sy);
      c.strokeStyle = p.line.replace(')', `,${t*.55})`).replace('rgba','rgba') || `rgba(60,60,60,${t*.55})`;
      // 그냥 직접 처리
      c.strokeStyle = p.line;
      c.globalAlpha = t * .55;
      c.lineWidth = 1.0; c.lineCap='round'; c.stroke();
      c.globalAlpha = 1;
    }
  } else {
    for (const pt of pts) {
      const dw = Math.min((pt.dt||16)/16,7);
      const r  = 12 + dw*9.5;
      const al = Math.min(.019+dw*.010,.092);
      const x  = pt.x*sx, y = pt.y*sy;
      const g  = c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,    rgba(p.i,al));
      g.addColorStop(.44,  rgba(p.m,al*.60));
      g.addColorStop(1,    rgba(p.o,0));
      c.beginPath(); c.fillStyle=g; c.arc(x,y,r,0,Math.PI*2); c.fill();
    }
    // 컨투어
    const sampled = pts.filter((_,i)=>i%10===0);
    if (sampled.length>=3) {
      for (let ring=0;ring<3;ring++) {
        const sp=7+ring*5, al=.024-ring*.005;
        c.beginPath();
        sampled.forEach((pt,idx)=>{
          const x=pt.x*sx+Math.sin(idx*.8)*sp, y=pt.y*sy+Math.cos(idx*.8)*sp;
          idx===0?c.moveTo(x,y):c.lineTo(x,y);
        });
        c.closePath();
        c.strokeStyle=rgba(p.i,Math.max(al,.005));
        c.lineWidth=.6; c.stroke();
      }
    }
  }

  // 호버 마커
  if (popupHoverPt) {
    c.beginPath(); c.arc(popupHoverPt.x, popupHoverPt.y, 5.5, 0, Math.PI*2);
    c.fillStyle='rgba(255,255,255,.9)'; c.fill();
    c.strokeStyle='rgba(26,26,24,.6)'; c.lineWidth=1.1; c.stroke();
  }
}

function renderItemList(items) {
  const grouped = new Map();
  for (const it of items) {
    const e = grouped.get(it.type);
    if (e) e.count++; else grouped.set(it.type, {type:it.type, count:1});
  }
  const list = [...grouped.values()].sort((a,b)=>a.type.localeCompare(b.type));
  popupCount.textContent = `${list.length}종`;
  popupList.innerHTML = '';
  popupRowMap = new Map();

  if (!list.length) {
    const d = document.createElement('div');
    d.className='item-empty'; d.textContent='병 안에 모인 물건이 없습니다.';
    popupList.appendChild(d); return;
  }

  for (const entry of list) {
    const meta = ITEM_LABELS[entry.type] || {ko:entry.type, note:''};
    const row  = document.createElement('div');
    row.className = 'item-row'; row.dataset.type = entry.type;

    const ic = document.createElement('canvas');
    ic.className='item-icon'; ic.width=ic.height=32;
    const ic2 = ic.getContext('2d');
    ic2.translate(16,16); ic2.beginPath();
    ITEM_DRAW[entry.type]?.(ic2, 7);
    ic2.fillStyle='rgba(26,26,24,.76)'; ic2.fill();

    const bd = document.createElement('div');
    bd.innerHTML = `
      <div style="display:flex;justify-content:space-between">
        <span class="item-name">${meta.ko}</span>
        <span class="item-count">${entry.count}개</span>
      </div>
      <div class="item-note">${meta.note}</div>`;

    row.append(ic, bd);
    popupList.appendChild(row);
    popupRowMap.set(entry.type, row);
  }
  highlightItem();
}

function highlightItem() {
  for (const [type, row] of popupRowMap)
    row.classList.toggle('active', type === popupHoverType);
  if (popupHoverType && popupHoverType !== lastScrollType) {
    popupRowMap.get(popupHoverType)?.scrollIntoView({block:'nearest', behavior:'smooth'});
    lastScrollType = popupHoverType;
  }
  if (!popupHoverType) lastScrollType = null;
}

popupCanvas.addEventListener('mousemove', e => {
  if (!currentRec) return;
  const rect = popupCanvas.getBoundingClientRect();
  const lx = (e.clientX - rect.left) * (popupCanvas.width / rect.width);
  const ly = (e.clientY - rect.top)  * (popupCanvas.height / rect.height);
  const sx = popupCanvas.width / window.innerWidth;
  const sy = popupCanvas.height / window.innerHeight;
  let best = null;
  for (const pt of currentRec.trail) {
    const dx = lx - pt.x*sx, dy = ly - pt.y*sy;
    const d2 = dx*dx + dy*dy;
    if (!best || d2 < best.d2) best = {pt, x:pt.x*sx, y:pt.y*sy, d2};
  }
  const maxD = popupView==='line' ? 16 : 28;
  if (!best || best.d2 > maxD*maxD) {
    if (popupHoverType||popupHoverPt) { popupHoverType=null; popupHoverPt=null; highlightItem(); renderPopupTrail(); }
    return;
  }
  // 가장 가까운 포인트 시간 기반으로 아이템 매칭
  const items = currentRec.items;
  if (items.length) {
    const durMs = Math.max((currentRec.duration||0)*1000, 1000);
    const avgGap = durMs / Math.max(items.length,1);
    const maxDelta = Math.max(900, Math.min(3500, avgGap*1.4));
    let bestItem = null;
    for (const it of items) {
      const delta = Math.abs((it.collectedAt||0) - best.pt.t);
      if (!bestItem || delta < bestItem.delta) bestItem = {type:it.type, delta};
    }
    popupHoverType = (bestItem && bestItem.delta <= maxDelta) ? bestItem.type : null;
  }
  popupHoverPt = popupHoverType ? {x:best.x, y:best.y} : null;
  highlightItem(); renderPopupTrail();
});
popupCanvas.addEventListener('mouseleave', () => {
  if (popupHoverType||popupHoverPt) { popupHoverType=null; popupHoverPt=null; highlightItem(); renderPopupTrail(); }
});

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
function fmtTime(sec) {
  return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
}
function rgba(arr, a) { return `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`; }
function hexRgba(hex, a) {
  const n = parseInt(hex.replace('#',''),16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function matchesPeriod(createdAt, period) {
  if (!period) return true;

  const now = Date.now();
  const diff = now - createdAt;

  if (period === '1d') return diff <= 24 * 60 * 60 * 1000;
  if (period === '1w') return diff <= 7 * 24 * 60 * 60 * 1000;
  if (period === '1m') return diff <= 30 * 24 * 60 * 60 * 1000;

  return true;
}

function getFilteredRecords() {
  return records.filter(rec => {
    const shapeOk =
      archiveFilters.shape.size === 0 ||
      archiveFilters.shape.has(rec.shapeId);

    const colorOk =
      archiveFilters.color.size === 0 ||
      archiveFilters.color.has(rec.paletteName);

    const periodOk =
      matchesPeriod(rec.createdAt, archiveFilters.period);

    return shapeOk && colorOk && periodOk;
  });
}

/* ════════════════════════════════════════════
   MOUSE  /  INPUT
════════════════════════════════════════════ */
let sampleTick = 0;
function sampleIdle() {
  if (mActive && sampleTick%2===0)
    pushPoint(mx, my, 16, Date.now());
  sampleTick++;
  requestAnimationFrame(sampleIdle);
}

window.addEventListener('mousemove', e => {
  const now = Date.now(), dt = now - lastMoveT; lastMoveT = now;
  pmx=mx; pmy=my; mx=e.clientX; my=e.clientY; mActive=true;
  cursor.style.left=`${mx}px`; cursor.style.top=`${my}px`;
  coordsEl.innerHTML=`x:${mx} &nbsp;y:${my}`;
  if (pmx>-999&&dt>0) {
    mVX=mx-pmx; mVY=my-pmy;
    mSpeed=Math.sqrt(mVX*mVX+mVY*mVY)/(dt/16);
  }
  if (!archiveEl.classList.contains('visible')) {
    pushPoint(mx, my, dt, now);
    trySpawn();
    startBottleLoop();
  }
  if (!hasMoved) {
    hasMoved=true;
    setTimeout(()=>collectWrap.classList.add('visible'), 900);
  }
});

window.addEventListener('mouseleave', () => { mActive=false; mSpeed=0; });

/* ════════════════════════════════════════════
   TIMER
════════════════════════════════════════════ */
setInterval(() => {
  timeEl.textContent = fmtTime(Math.floor((Date.now()-sessionStart)/1000));
  itemCountEl.textContent = bottleItems.length;
}, 1000);

/* ════════════════════════════════════════════
   RESIZE
════════════════════════════════════════════ */
function resize() {
  W = trailCanvas.width  = bottleCanvas.width  = window.innerWidth;
  H = trailCanvas.height = bottleCanvas.height = window.innerHeight;
  calcBottle();
  tCtx.fillStyle = pal.bg; tCtx.fillRect(0,0,W,H);
  if (currentRec) { sizePopupCanvas(); renderPopupTrail(); }
  redrawFilledCells();
}
window.addEventListener('resize', resize);

/* ════════════════════════════════════════════
   EVENTS
════════════════════════════════════════════ */
collectBtn.addEventListener('click',  collect);
returnBtn.addEventListener('click',   resetSession);
viewLatest.addEventListener('click',  () => latestRec && openPopup(latestRec));
moreBtn.addEventListener('click', () => {
  const cur = totalCells;
  for (let i=cur;i<cur+16;i++) addEmptyCell(i);
});
popupClose.addEventListener('click', closePopup);
popupBd.addEventListener('click', closePopup);
viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view, true)));
binderTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const group = tab.closest('.binder-group');
    document.querySelectorAll('.binder-group').forEach(el => {
      if (el !== group) el.classList.remove('open');
    });
    group.classList.toggle('open');
  });
});
filterTags.forEach(tag => {
  tag.addEventListener('click', () => {
    const group = tag.dataset.filterGroup;
    const value = tag.dataset.filterValue;

    if (group === 'period') {
      if (archiveFilters.period === value) {
        archiveFilters.period = null;
      } else {
        archiveFilters.period = value;
      }

      document.querySelectorAll('[data-filter-group="period"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filterValue === archiveFilters.period);
      });
    } else {
      const targetSet = archiveFilters[group];
      if (targetSet.has(value)) {
        targetSet.delete(value);
        tag.classList.remove('active');
      } else {
        targetSet.add(value);
        tag.classList.add('active');
      }
    }

    renderGrid(getFilteredRecords());
  });
});
document.addEventListener('click', e => {
  const insideBinder = e.target.closest('.binder-group');
  if (!insideBinder) {
    document.querySelectorAll('.binder-group').forEach(el => {
      el.classList.remove('open');
    });
  }
});

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
resize();
applyPalette();
renderGrid(records);
trailLoop();
sampleIdle();

// 초기 병 외관
bCtx.clearRect(0,0,W,H);
drawGlass(bCtx, currentBottlePath(), B.cx, B.bW/2, B.bodyTopY, B.floorY);

console.log(`bottle: ${S.id} | palette: ${pal.name}`);
