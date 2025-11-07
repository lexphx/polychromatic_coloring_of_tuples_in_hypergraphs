const pad = 40;
let k = 3;
const k_choice = [3, 4, 5];
let cpts = 20;
const palette = [
  [10, 50, 255],
  [10, 255, 50],
  [255, 50, 50],
  [128, 128, 128],
  [230, 245, 40],
];
let view = { s: 1, ox: 0, oy: 0 };
let disk = { cx: 2, cy: 2, r: 0.5 };
let dragging = false;
let pts = [];
let kSel;
let ptsInpt;
let cur_cols = Array(k).fill(false);

function setup() {
  createCanvas(windowWidth, windowHeight);
  kSel = createSelect();
  k_choice.forEach((v) => kSel.option(v));
  kSel.selected(k);
  kSel.position(windowWidth - kSel.width - 20, 10);
  pts = generateRandomPoints(cpts);
  ptsInpt = createInput(cpts);
  ptsInpt.attribute("type", "number");
  ptsInpt.attribute("min", 5);
  ptsInpt.attribute("max", 200);
  ptsInpt.size(40);
  ptsInpt.position(windowWidth - ptsInpt.width - 50, 10);
  ptsInpt.changed(() => {
    const n = int(ptsInpt.value());
    pts = generateRandomPoints(n);
    computeView();
  });
  computeView();
}

function draw() {
  nk = int(kSel.value());
  if (nk != k) {
    cur_cols = Array(nk).fill(false);
    k = nk;
  }
  background(255);
  strokeWeight(2);
  cur_cols.fill(false);
  drawColorPairs(k);
  fill(30);
  noStroke();
  for (const p of pts) {
    const s = toScreen(p);
    circle(s.x, s.y, 4);
  }
  noFill();
  stroke(0, 120, 255);
  strokeWeight(2);
  const c = toScreen({ x: disk.cx, y: disk.cy });
  //circle(c.x, c.y, 2 * disk.r * view.s);
  drawDisk();
  drawLegendBoxes();
}

function drawDisk() {
  usedCols = cur_cols.reduce((a, v) => a + (v ? 1 : 0), 0);
  const allCols = usedCols === k;
  const pulse = allCols ? 0 : 0.015 * sin(frameCount * 0.08);
  const strokeCol = allCols ? color(0, 180, 80) : color(0, 120, 255);

  stroke(strokeCol);
  strokeWeight(allCols ? 3 : 2);

  //const alpha = map(usedCols, 0, k, 10, 50);
  const t = usedCols / k;
  //fill(0, 120, 255, alpha);
  let col = lerpColor(color(150), color(0, 200, 80), t);
  col.setAlpha(40);
  fill(col);

  const c = toScreen({ x: disk.cx, y: disk.cy });
  circle(c.x, c.y, 2 * (disk.r + pulse) * view.s);
}

function drawColorPairs(k) {
  const insideDisk = pts.filter((p) => inCircle(p, disk.cx, disk.cy, disk.r));
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const depth = depthAB(pts, pts[i], pts[j]);
      const color_idx = colorFromDepth(depth, k);
      if (insideDisk.includes(pts[i]) && insideDisk.includes(pts[j])) {
        const colorValue = depthToRGB(color_idx, k);
        stroke(colorValue);
        line(...toLine(pts[i], pts[j]));
        cur_cols[color_idx] = true;
      }
    }
  }
}

function drawLegendBoxes() {
  const x0 = 12,
    y0 = 12,
    box = 16,
    gap = 6;
  noStroke();
  for (let i = 0; i < k; i++) {
    const [r, g, b] = palette[Math.min(i, palette.length - 1)];
    stroke(r, g, b);
    fill(cur_cols[i] ? color(r, g, b) : 240);
    rect(x0 + i * (box + gap), y0, box, box, 3);
  }
  fill(20);
  noStroke();
  textSize(14);
  textAlign(LEFT, CENTER);
  text(
    cur_cols.every((v) => v) ? "✓ Polychromatic" : "✗ Missing colors",
    x0 + k * (box + gap) + 12,
    y0 + box / 2
  );
}

function depthToRGB(color_idx, k) {
  const [r, g, b] = palette[Math.min(color_idx, palette.length - 1)];
  return color(r, g, b);
}

function mousePressed() {
  const { x, y } = fromScreen(mouseX, mouseY);
  const dist2 = (x - disk.cx) ** 2 + (y - disk.cy) ** 2;
  dragging = dist2 <= disk.r ** 2;
}

function mouseDragged() {
  if (!dragging) return;
  const { x, y } = fromScreen(mouseX, mouseY);
  disk.cx = x;
  disk.cy = y;
}

function mouseReleased() {
  dragging = false;
}

function mouseWheel(e) {
  disk.r = max(0.05, disk.r * (1 - e.delta / 800));
  return false;
}

windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
  computeView();
};

function inCircle(P, cx, cy, r) {
  return (P.x - cx) ** 2 + (P.y - cy) ** 2 <= r ** 2;
}

function countInside(points, cx, cy, r) {
  let inside = 0;
  for (const p of points) {
    if (inCircle(p, cx, cy, r)) inside++;
  }
  return inside;
}

function circleFromDiameter(A, B) {
  const cx = (A.x + B.x) / 2;
  const cy = (A.y + B.y) / 2;
  const r = Math.sqrt((A.x - B.x) ** 2 + (A.y - B.y) ** 2) / 2;

  return { cx, cy, r };
}

function depth(points, A, B) {
  const { cx, cy, r } = circleFromDiameter(A, B);
  const others = points.filter((p) => p !== A && p !== B);
  return countInside(others, cx, cy, r);
}

function circleFromThree(A, B, C) {
  const ax = A.x,
    ay = A.y,
    bx = B.x,
    by = B.y,
    cx = C.x,
    cy = C.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-8) return null;
  const ax2 = ax * ax + ay * ay,
    bx2 = bx * bx + by * by,
    cx2 = cx * cx + cy * cy;
  const ux = (ax2 * (by - cy) + bx2 * (cy - ay) + cx2 * (ay - by)) / d;
  const uy = (ax2 * (cx - bx) + bx2 * (ax - cx) + cx2 * (bx - ax)) / d;
  const r = Math.hypot(ux - ax, uy - ay);
  return { cx: ux, cy: uy, r };
}

function depthAB(points, A, B) {
  const others = points.filter((p) => p !== A && p !== B);
  let best = Infinity;
  // candidate 1: diameter circle
  {
    const { cx, cy, r } = circleFromDiameter(A, B);
    const cnt = countInside(others, cx, cy, r);
    best = Math.min(best, cnt);
  }
  // candidate 2: circumcircles with a third point C
  for (const C of others) {
    const circ = circleFromThree(A, B, C);
    if (!circ) continue;
    const cnt = countInside(others, circ.cx, circ.cy, circ.r);
    best = Math.min(best, cnt);
  }
  return best === Infinity ? 0 : best;
}

function colorFromDepth(depth, k, base = 3.7) {
  if (depth === 0) return 0;

  for (let i = 0; i <= k - 3; i++) {
    if (depth >= base ** i && depth < base ** (i + 1)) return i + 1;
  }
  return k - 1;
}

function toLine(A, B) {
  const a = toScreen(A),
    b = toScreen(B);
  return [a.x, a.y, b.x, b.y];
}

function computeView() {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    minX = min(minX, p.x);
    minY = min(minY, p.y);
    maxX = max(maxX, p.x);
    maxY = max(maxY, p.y);
  }
  const rangeX = maxX - minX || 1; // if all x are equal || 1
  const rangeY = maxY - minY || 1; // if all y are equal || 1
  // Uniform scale so everything fits
  const sx = (width - 2 * pad) / rangeX;
  const sy = (height - 2 * pad) / rangeY;
  const s = min(sx, sy);
  // Ranges
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Offsets so the data is centered
  const ox = width / 2 - s * cx;
  const oy = height / 2 - s * cy;

  view.s = s;
  view.ox = ox;
  view.oy = oy;
}

function toScreen(p) {
  return { x: view.s * p.x + view.ox, y: view.s * p.y + view.oy };
}

function fromScreen(x, y) {
  return {
    x: (x - view.ox) / view.s,
    y: (y - view.oy) / view.s,
  };
}

function generateRandomPoints(n, range = 3) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      x: random(range),
      y: random(range),
    });
  }
  return pts;
}
