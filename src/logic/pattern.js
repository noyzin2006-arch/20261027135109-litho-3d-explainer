// 贯穿全场的示意版图：L 形导线 + 两段细线 + 套刻十字
// 归一化坐标：[-1, 1] x [-1, 1]，y 向上。教学示意，不冒充真实掩模版图。

/** L 形多边形（逆时针，简单多边形，无自交） */
export const L_POLYGON = [
  [-0.55, -0.45],
  [-0.15, -0.45],
  [-0.15, 0.05],
  [0.45, 0.05],
  [0.45, 0.45],
  [0.05, 0.45],
  [0.05, -0.05],
  [-0.55, -0.05],
];

/** 两段细线（线对，用于分辨率演示），[x1,y1,x2,y2] */
export const TICK_LINES = [
  [-0.75, 0.62, 0.75, 0.62],
  [-0.75, 0.74, 0.75, 0.74],
];

/** 套刻对准十字中心（第 1 层 / 第 2 层各一） */
export const CROSSHAIRS = {
  layer1: [-0.72, -0.72],
  layer2: [-0.72, -0.72], // 对准时重合；错位演示时层2被平移
};

/** 第 2 层套刻演示用的偏移量（归一化坐标） */
export const OVERLAY_OFFSET = [0.09, 0.055];

/** 多边形有向面积（shoelace）。面积 > 0 表示逆时针。 */
export function polygonArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** 平移多边形 */
export function translatePoly(pts, dx, dy) {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

/** 缩放多边形（绕原点） */
export function scalePoly(pts, k) {
  return pts.map(([x, y]) => [x * k, y * k]);
}

/** 点是否在简单多边形内（射线法） */
export function pointInPolygon(pts, px, py) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 版图整体包围盒 */
export function patternBounds() {
  const xs = L_POLYGON.map((p) => p[0]);
  const ys = L_POLYGON.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
