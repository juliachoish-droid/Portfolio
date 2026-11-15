// ════════════════════════════════════════════
// DOM 참조
// ════════════════════════════════════════════
const video        = document.getElementById('video');
const overlay      = document.getElementById('overlay');
const ctx          = overlay.getContext('2d');
const frozenImg    = document.getElementById('frozen-img');
const placeholder  = document.getElementById('placeholder');
const badge        = document.getElementById('status-badge');
const btnStart     = document.getElementById('btn-start');
const btnStop      = document.getElementById('btn-stop');
const btnReset     = document.getElementById('btn-reset');
const btnCapture   = document.getElementById('btn-capture');
const warpedWrap      = document.getElementById('warped-preview-wrap');
const warpedCvs       = document.getElementById('warped-canvas');
const fragmentBox     = document.getElementById('fragment-analysis');
const btnAsciiPreview = document.getElementById('btn-ascii-preview');
const asciiPreviewWrap = document.getElementById('ascii-preview-wrap');
const asciiPreview    = document.getElementById('ascii-preview');
const pinchGauge      = document.getElementById('pinch-gauge');
const pinchBar        = document.getElementById('pinch-bar');
const btnPrint        = document.getElementById('btn-print-fragment');

// ════════════════════════════════════════════
// 상태
// ════════════════════════════════════════════
let mpHands       = null;
let mpCamera      = null;
let cameraOn      = false;
let isFrozen      = false;
let frozenDataUrl = null;
let stream        = null;
let handData      = [];
let framePt0      = null;
let framePt1      = null;
let currentFragment = null;

const PINCH_THRESH  = 0.06;
const PINCH_HOLD_MS = 400;
let pinchStartTime = null;

// ════════════════════════════════════════════
// 카메라 시작
// ════════════════════════════════════════════
btnStart.onclick = async () => {
  try {
    badge.textContent = '카메라 & MediaPipe 로딩 중…';
    badge.className = 'active';

    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 }
    });

    video.srcObject = stream;
    video.style.display = 'block';
    placeholder.style.display = 'none';

    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });

    overlay.width  = video.videoWidth;
    overlay.height = video.videoHeight;

    initMediaPipe();

    btnStart.disabled   = true;
    btnStop.disabled    = false;
    btnReset.disabled   = false;
    btnCapture.disabled = false;
    cameraOn = true;

  } catch (e) {
    badge.textContent = '카메라 오류: ' + e.message;
    badge.className = 'error';
  }
};

// ════════════════════════════════════════════
// MediaPipe Hands 초기화
// ════════════════════════════════════════════
function initMediaPipe() {
  badge.textContent = 'MediaPipe 모델 로딩 중…';
  badge.className = 'active';

  mpHands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  mpHands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  mpHands.onResults(onHandResults);

  mpHands.initialize().then(() => {
    badge.textContent = '양손 검지를 들어 프레임을 잡으세요';
    badge.className = 'active';

    mpCamera = new Camera(video, {
      onFrame: async () => {
        try {
          await mpHands.send({ image: video });
        } catch (e) {
          console.warn(e);
        }
      },
      width: video.videoWidth,
      height: video.videoHeight,
    });

    mpCamera.start();
  }).catch(e => {
    badge.textContent = 'MediaPipe 로드 실패: ' + e.message;
    badge.className = 'error';
    console.error(e);
  });
}

// ════════════════════════════════════════════
// MediaPipe 결과 처리
// ════════════════════════════════════════════
function onHandResults(results) {
  if (isFrozen) return;

  const W = overlay.width;
  const H = overlay.height;
  handData = [];

  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      const indexTip = {
        x: (1 - landmarks[8].x) * W,
        y: landmarks[8].y * H,
      };

      const thumbTip = {
        x: (1 - landmarks[4].x) * W,
        y: landmarks[4].y * H,
      };

      const midPoint = {
        x: (indexTip.x + thumbTip.x) / 2,
        y: (indexTip.y + thumbTip.y) / 2,
      };

      const pinchDist = Math.hypot(
        landmarks[8].x - landmarks[4].x,
        landmarks[8].y - landmarks[4].y
      );

      handData.push({ indexTip, thumbTip, midPoint, pinchDist, landmarks });
    }
  }

  if (handData.length === 2) {
    framePt0 = handData[0].midPoint;
    framePt1 = handData[1].midPoint;
    detectPinch();
  } else if (handData.length === 1) {
    framePt0 = handData[0].midPoint;
    framePt1 = null;
    pinchStartTime = null;
    updatePinchUI(0);
  } else {
    framePt0 = null;
    framePt1 = null;
    pinchStartTime = null;
    updatePinchUI(0);
  }

  drawHandOverlay();
}

// ════════════════════════════════════════════
// 핀치 감지
// ════════════════════════════════════════════
function detectPinch() {
  const p0 = handData[0].pinchDist;
  const p1 = handData[1].pinchDist;
  const bothPinching = p0 < PINCH_THRESH && p1 < PINCH_THRESH;
  const closer = Math.min(p0, p1);
  const pct = Math.max(0, Math.min(100, (1 - closer / PINCH_THRESH) * 100));

  updatePinchUI(pct);

  if (bothPinching) {
    if (!pinchStartTime) pinchStartTime = Date.now();

    const held = Date.now() - pinchStartTime;
    updatePinchUI(Math.min(100, (held / PINCH_HOLD_MS) * 100));

    if (held >= PINCH_HOLD_MS) {
      pinchStartTime = null;
      triggerCapture();
    }
  } else {
    pinchStartTime = null;
  }
}

function updatePinchUI(pct) {
  pinchBar.style.width = pct + '%';
  pinchGauge.style.display = framePt0 && framePt1 ? 'flex' : 'none';
  pinchBar.style.background = pct >= 95 ? '#f5a623' : '#2dce89';
}

// ════════════════════════════════════════════
// 오버레이 그리기
// ════════════════════════════════════════════
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

function drawHandOverlay() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const W = overlay.width;
  const H = overlay.height;

  handData.forEach((hand, hi) => {
    const col = hi === 0 ? '#f5a623' : '#2dce89';
    const pts = hand.landmarks.map(lm => ({
      x: (1 - lm.x) * W,
      y: lm.y * H,
    }));

    ctx.save();

    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    });

    pts.forEach((p, idx) => {
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTip ? 8 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? col : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const isPinching = hand.pinchDist < PINCH_THRESH;

    ctx.beginPath();
    ctx.moveTo(hand.thumbTip.x, hand.thumbTip.y);
    ctx.lineTo(hand.indexTip.x, hand.indexTip.y);
    ctx.strokeStyle = isPinching ? '#fff' : col + '99';
    ctx.lineWidth = isPinching ? 2.5 : 1.5;
    ctx.setLineDash(isPinching ? [] : [4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(hand.midPoint.x, hand.midPoint.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = isPinching ? '#fff' : col;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hand.midPoint.x - 5, hand.midPoint.y);
    ctx.lineTo(hand.midPoint.x + 5, hand.midPoint.y);
    ctx.moveTo(hand.midPoint.x, hand.midPoint.y - 5);
    ctx.lineTo(hand.midPoint.x, hand.midPoint.y + 5);
    ctx.stroke();

    ctx.restore();
  });

  if (framePt0 && framePt1) {
    const x0 = Math.min(framePt0.x, framePt1.x);
    const y0 = Math.min(framePt0.y, framePt1.y);
    const x1 = Math.max(framePt0.x, framePt1.x);
    const y1 = Math.max(framePt0.y, framePt1.y);
    const fw = x1 - x0;
    const fh = y1 - y0;

    const isValid = fw > overlay.width * 0.1 && fh > overlay.height * 0.1;

    ctx.fillStyle = isValid ? 'rgba(77,159,255,0.06)' : 'rgba(255,68,68,0.06)';
    ctx.fillRect(x0, y0, fw, fh);

    ctx.strokeStyle = isValid ? '#4d9fff' : '#ff4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(x0, y0, fw, fh);
    ctx.setLineDash([]);

    const label = isValid ? `${Math.round(fw)} × ${Math.round(fh)}` : '너무 작음 — 손을 대각선으로';
    const labelW = isValid ? 80 : 180;

    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(x0 + fw / 2 - labelW / 2, y0 - 22, labelW, 18);
    ctx.fillStyle = isValid ? '#fff' : '#ff8888';
    ctx.font = isValid ? '11px sans-serif' : 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x0 + fw / 2, y0 - 13);
  }
}

// ════════════════════════════════════════════
// 캡처 실행
// ════════════════════════════════════════════
function triggerCapture() {
  if (!framePt0 || !framePt1 || isFrozen) return;

  const x0 = Math.min(framePt0.x, framePt1.x);
  const x1 = Math.max(framePt0.x, framePt1.x);
  const y0 = Math.min(framePt0.y, framePt1.y);
  const y1 = Math.max(framePt0.y, framePt1.y);

  if (x1 - x0 < overlay.width * 0.1 || y1 - y0 < overlay.height * 0.1) {
    badge.textContent = '프레임이 너무 작아요 — 손을 대각선으로!';
    badge.className = 'error';

    setTimeout(() => {
      badge.textContent = '양손 검지를 들어 프레임을 잡으세요';
      badge.className = 'active';
    }, 2000);
    return;
  }

  badge.textContent = '캡처됨 — Fragment 분석 중…';
  badge.className = 'analyze';

  const snap = document.createElement('canvas');
  snap.width  = video.videoWidth;
  snap.height = video.videoHeight;

  const sc = snap.getContext('2d');
  sc.translate(snap.width, 0);
  sc.scale(-1, 1);
  sc.drawImage(video, 0, 0);

  frozenDataUrl = snap.toDataURL('image/png');
  frozenImg.src = frozenDataUrl;
  frozenImg.style.display = 'block';
  video.style.display = 'none';

  isFrozen = true;
  if (mpCamera) mpCamera.stop();

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  pinchGauge.style.display = 'none';

  const corners = getFrameCorners(false);
  analyzeFragment(snap, corners);
}

function getFrameCorners(mirrorFlip) {
  const W = overlay.width;
  let p0 = { ...framePt0 };
  let p1 = { ...framePt1 };

  if (mirrorFlip) {
    p0.x = W - p0.x;
    p1.x = W - p1.x;
  }

  const x0 = Math.min(p0.x, p1.x);
  const y0 = Math.min(p0.y, p1.y);
  const x1 = Math.max(p0.x, p1.x);
  const y1 = Math.max(p0.y, p1.y);

  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

btnCapture.onclick = () => {
  if (framePt0 && framePt1) triggerCapture();
};

btnStop.onclick = () => {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (mpCamera) mpCamera.stop();
  if (mpHands) mpHands.close();

  cameraOn = false;
  isFrozen = false;
  currentFragment = null;

  video.style.display = 'none';
  frozenImg.style.display = 'none';
  placeholder.style.display = '';

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  pinchGauge.style.display = 'none';
  warpedWrap.style.display = 'none';

  btnStart.disabled = false;
  btnStop.disabled = true;
  btnReset.disabled = true;
  btnCapture.disabled = true;
  btnPrint.disabled = true;
  btnAsciiPreview.disabled = true;
  asciiPreviewWrap.style.display = 'none';
  asciiPreview.textContent = '';

  badge.textContent = '대기 중';
  badge.className = '';

  fragmentBox.innerHTML = '<p class="no-fragment">핀치로 캡처 후<br>분석 결과가 여기 표시됩니다.</p>';
};

btnReset.onclick = () => {
  isFrozen = false;
  currentFragment = null;

  frozenImg.style.display = 'none';
  video.style.display = 'block';

  framePt0 = null;
  framePt1 = null;

  warpedWrap.style.display = 'none';
  btnPrint.disabled = true;
  btnAsciiPreview.disabled = true;
  asciiPreviewWrap.style.display = 'none';
  asciiPreview.textContent = '';

  fragmentBox.innerHTML = '<p class="no-fragment">핀치로 캡처 후<br>분석 결과가 여기 표시됩니다.</p>';

  badge.textContent = '양손 검지를 들어 프레임을 잡으세요';
  badge.className = 'active';

  if (mpCamera) mpCamera.start();
};

btnAsciiPreview.onclick = () => {
  if (!currentFragment) return;

  const ascii = canvasToAscii(warpedCvs, 40);

  asciiPreview.textContent = ascii;
  asciiPreviewWrap.style.display = 'block';
};
btnPrint.onclick = () => printFragment();

function renderAsciiPreview(sourceCanvas) {
  if (!currentFragment || !sourceCanvas) return;

  const ascii = makeAsciiString(sourceCanvas, 72);
  asciiPreview.textContent = ascii;
  asciiPreviewWrap.style.display = 'block';
  badge.textContent = 'ASCII 미리보기 생성 완료';
  badge.className = 'done';
}

function makeAsciiString(sourceCanvas, maxWidth = 72) {
  const asciiChars = ' .:-=+*#%@';
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const width = Math.min(maxWidth, srcW);
  const height = Math.max(1, Math.round(srcH * (width / srcW) * 0.45));

  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  const tmpCtx = tmp.getContext('2d', { willReadFrequently: true });
  tmpCtx.drawImage(sourceCanvas, 0, 0, width, height);

  const imageData = tmpCtx.getImageData(0, 0, width, height);
  const { data } = imageData;
  let result = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const index = Math.floor((1 - gray / 255) * (asciiChars.length - 1));
      result += asciiChars[index];
    }
    if (y < height - 1) result += '\n';
  }

  return result;
}

function canvasToAscii(sourceCanvas, cols = 40, rows = null) {
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // 글자는 세로로 길어서 보정 필요
  const charAspect = 0.55;

  if (rows === null) {
    rows = Math.round((height / width) * cols * charAspect);
  }

  rows = Math.max(8, Math.min(rows, 64));

  // 어두운 쪽이 더 진한 문자
  const chars = '@@@%%##**++=--::.. ';

  let output = '';

  const cellW = width / cols;
  const cellH = height / rows;

  // 1차 패스: 각 칸의 밝기 수집
  const brightnessMap = [];

  let minB = 255;
  let maxB = 0;

  for (let y = 0; y < rows; y++) {
    brightnessMap[y] = [];

    for (let x = 0; x < cols; x++) {
      const startX = Math.floor(x * cellW);
      const startY = Math.floor(y * cellH);
      const endX = Math.floor((x + 1) * cellW);
      const endY = Math.floor((y + 1) * cellH);

      let total = 0;
      let count = 0;

      // 한 점만 찍지 않고, 칸 안쪽 여러 픽셀 평균내기
      for (let py = startY; py < endY; py += 2) {
        for (let px = startX; px < endX; px += 2) {
          const pixel = sourceCtx.getImageData(
            Math.min(px, width - 1),
            Math.min(py, height - 1),
            1,
            1
          ).data;

          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];
          const a = pixel[3];

          const brightness = a === 0
            ? 255
            : 0.299 * r + 0.587 * g + 0.114 * b;

          total += brightness;
          count++;
        }
      }

      const avg = count > 0 ? total / count : 255;

      brightnessMap[y][x] = avg;
      minB = Math.min(minB, avg);
      maxB = Math.max(maxB, avg);
    }
  }

  // 대비가 너무 낮을 때 방지
  const range = Math.max(1, maxB - minB);

  // 2차 패스: 대비 보정 후 문자로 변환
  for (let y = 0; y < rows; y++) {
    let line = '';

    for (let x = 0; x < cols; x++) {
      let b = brightnessMap[y][x];

      // 대비 자동 확장
      b = ((b - minB) / range) * 255;

      // 감마 보정: 어두운 부분 형태를 더 살림
      b = Math.pow(b / 255, 0.8) * 255;

      const index = Math.floor((b / 255) * (chars.length - 1));
      line += chars[index];
    }

    output += line + '\n';
  }

  return output;
}

// ════════════════════════════════════════════
// 호모그래피 Perspective Warp
// ════════════════════════════════════════════
function solveHomography(src, dst) {
  const A = [];

  for (let i = 0; i < 4; i++) {
    const sx = dst[i].x;
    const sy = dst[i].y;
    const dx = src[i].x;
    const dy = src[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx, dx]);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy, dy]);
  }

  const n = 8;

  for (let col = 0; col < n; col++) {
    let maxRow = col;

    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }

    [A[col], A[maxRow]] = [A[maxRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = A[row][col] / pivot;
      for (let k = col; k <= n; k++) A[row][k] -= f * A[col][k];
    }
  }

  return A.map((row, i) => row[n] / row[i]);
}

function warpPerspective(srcCanvas, pts) {
  const sW = srcCanvas.width;
  const sH = srcCanvas.height;
  const scaleX = srcCanvas.width / overlay.width;
  const scaleY = srcCanvas.height / overlay.height;

  const srcPts = pts.map(p => ({
    x: p.x * scaleX,
    y: p.y * scaleY
  }));

  const dstW = Math.max(1, Math.round((dist(srcPts[0], srcPts[1]) + dist(srcPts[3], srcPts[2])) / 2));
  const dstH = Math.max(1, Math.round((dist(srcPts[0], srcPts[3]) + dist(srcPts[1], srcPts[2])) / 2));

  const dstPts = [
    { x: 0, y: 0 },
    { x: dstW - 1, y: 0 },
    { x: dstW - 1, y: dstH - 1 },
    { x: 0, y: dstH - 1 }
  ];

  const h = solveHomography(srcPts, dstPts);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;

  const dc = dstCanvas.getContext('2d', { willReadFrequently: true });
  const srcData = srcCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sW, sH);
  const dstImg = dc.createImageData(dstW, dstH);

  for (let dv = 0; dv < dstH; dv++) {
    for (let du = 0; du < dstW; du++) {
      const denom = h[6] * du + h[7] * dv + 1;
      if (!Number.isFinite(denom) || Math.abs(denom) < 1e-10) continue;

      const ox = Math.round((h[0] * du + h[1] * dv + h[2]) / denom);
      const oy = Math.round((h[3] * du + h[4] * dv + h[5]) / denom);

      if (ox < 0 || ox >= sW || oy < 0 || oy >= sH) continue;

      const si = (oy * sW + ox) * 4;
      const di = (dv * dstW + du) * 4;

      dstImg.data[di]     = srcData.data[si];
      dstImg.data[di + 1] = srcData.data[si + 1];
      dstImg.data[di + 2] = srcData.data[si + 2];
      dstImg.data[di + 3] = 255;
    }
  }

  dc.putImageData(dstImg, 0, 0);
  return dstCanvas;
}

// ════════════════════════════════════════════
// Fragment 분석: Brightness / Texture / Density
// ════════════════════════════════════════════
function analyzeFragment(srcCanvas, corners) {
  const warped = warpPerspective(srcCanvas, corners);

  warpedWrap.style.display = 'block';
  warpedCvs.width  = warped.width;
  warpedCvs.height = warped.height;

  const warpedCtx = warpedCvs.getContext('2d', { willReadFrequently: true });
  warpedCtx.clearRect(0, 0, warpedCvs.width, warpedCvs.height);
  warpedCtx.drawImage(warped, 0, 0);

  const imageData = warpedCtx.getImageData(0, 0, warpedCvs.width, warpedCvs.height);
  const metrics = calculateFragmentMetrics(imageData);

  const collectionNo = getNextCollectionNumber();
  const capturedAt = new Date();

  currentFragment = {
    collectionNo,
    capturedAt: capturedAt.toISOString(),
    brightness: metrics.brightness,
    texture: metrics.texture,
    density: metrics.density,
    width: warpedCvs.width,
    height: warpedCvs.height
  };

  renderFragmentPanel(currentFragment);

  btnPrint.disabled = false;
  badge.textContent = `Fragment #${String(collectionNo).padStart(3, '0')} 분석 완료`;
  badge.className = 'done';
  btnPrint.disabled = false;
  btnAsciiPreview.disabled = false;

  badge.textContent = `Fragment #${String(collectionNo).padStart(3, '0')} 분석 완료`;
  badge.className = 'done';
}

function calculateFragmentMetrics(imageData) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;

  let graySum = 0;
  let darkCount = 0;
  let textureSum = 0;
  let textureCount = 0;

  const gray = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const g = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    gray[i] = g;
    graySum += g;

    if (g < 128) darkCount++;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      if (x < width - 1) {
        textureSum += Math.abs(gray[i] - gray[i + 1]);
        textureCount++;
      }

      if (y < height - 1) {
        textureSum += Math.abs(gray[i] - gray[i + width]);
        textureCount++;
      }
    }
  }

  return {
    brightness: Math.round((graySum / totalPixels) / 255 * 100),
    texture: Math.round((textureSum / Math.max(1, textureCount)) / 255 * 100 * 8),
    density: Math.round(darkCount / totalPixels * 100)
  };
}

function renderFragmentPanel(fragment) {
  const displayNo = String(fragment.collectionNo).padStart(3, '0');
  const date = new Date(fragment.capturedAt);
  const timeText = formatDateTime(date);

  fragmentBox.innerHTML = `
    <div class="fragment-meta">
      <span>COLLECTION #${displayNo}</span>
      <span>${timeText}</span>
    </div>

    ${metricRow('Brightness', fragment.brightness)}
    ${metricRow('Texture', fragment.texture)}
    ${metricRow('Density', fragment.density)}
  `;
}

function metricRow(label, value) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

  return `
    <div class="metric-row">
      <label>${label}</label>
      <div class="metric-bar"><div class="metric-fill" style="width:${safe}%"></div></div>
      <span class="metric-value">${safe}%</span>
    </div>
  `;
}

function getNextCollectionNumber() {
  const key = 'fragment_archive_collection_no';
  const prev = Number(localStorage.getItem(key) || '0');
  const next = prev + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function formatDateTime(date) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

// ════════════════════════════════════════════
// 출력
// ════════════════════════════════════════════
async function printFragment() {
  if (!currentFragment) return;

  btnPrint.disabled = true;
  const prevText = badge.textContent;
  const prevClass = badge.className;

  badge.textContent = 'Fragment 영수증 출력 중…';
  badge.className = 'analyze';

  try {
    const asciiImage = canvasToAscii(warpedCvs, 40);

    const res = await fetch('http://localhost:3000/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asciiImage,
        fragment: currentFragment,
        printed_at: new Date().toISOString()
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    badge.textContent = 'Fragment 영수증 출력 요청 완료';
    badge.className = 'done';
  } catch (e) {
    console.error('print failed:', e);
    const onDevice = ['localhost', '127.0.0.1'].includes(location.hostname);
    badge.textContent = onDevice
      ? '출력 실패: 프린터 서버를 확인하세요'
      : '영수증 출력은 전시 현장에서만 작동합니다';
    badge.className = 'error';

    setTimeout(() => {
      badge.textContent = prevText;
      badge.className = prevClass;
    }, 2400);
  } finally {
    btnPrint.disabled = !currentFragment;
  }
}

function makeReceiptImage(sourceCanvas, targetWidth = 280) {
  const out = document.createElement('canvas');
  const ratio = targetWidth / sourceCanvas.width;

  out.width = targetWidth;
  out.height = Math.max(1, Math.round(sourceCanvas.height * ratio));

  const outCtx = out.getContext('2d', { willReadFrequently: true });
  outCtx.drawImage(sourceCanvas, 0, 0, out.width, out.height);

  const img = outCtx.getImageData(0, 0, out.width, out.height);
  applyFloydSteinbergDither(img);
  outCtx.putImageData(img, 0, 0);

  return out.toDataURL('image/png');
}

function applyFloydSteinbergDither(imageData) {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldPixel = gray[i];
      const newPixel = oldPixel < 150 ? 0 : 255;
      const err = oldPixel - newPixel;
      gray[i] = newPixel;

      if (x + 1 < width) gray[i + 1] += err * 7 / 16;
      if (y + 1 < height) {
        if (x > 0) gray[i + width - 1] += err * 3 / 16;
        gray[i + width] += err * 5 / 16;
        if (x + 1 < width) gray[i + width + 1] += err * 1 / 16;
      }
    }
  }

  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    const bw = gray[i] < 128 ? 0 : 255;
    data[p] = bw;
    data[p + 1] = bw;
    data[p + 2] = bw;
    data[p + 3] = 255;
  }
}

// ════════════════════════════════════════════
// 유틸
// ════════════════════════════════════════════
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
