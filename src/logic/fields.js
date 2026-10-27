// 曝光场布局：把矩形曝光场铺满圆形晶圆，边缘允许截断场。
// 晶圆坐标系：单位圆（半径 1），场以中心 (cx, cy) 与半宽 hw、半高 hh 描述。

/**
 * 生成曝光场布局。
 * @param {object} opts
 * @param {number} opts.fieldW  场宽（归一化，全宽）
 * @param {number} opts.fieldH  场高
 * @param {number} [opts.waferR=1]
 * @returns {{cx:number,cy:number,hw:number,hh:number,truncated:boolean}[]}
 */
export function layoutFields({ fieldW, fieldH, waferR = 1 }) {
  if (!(fieldW > 0 && fieldH > 0)) throw new RangeError("field size must be > 0");
  if (!(waferR > 0)) throw new RangeError("wafer radius must be > 0");
  const hw = fieldW / 2;
  const hh = fieldH / 2;
  const fields = [];
  const cols = Math.ceil(waferR / fieldW) + 1;
  const rows = Math.ceil(waferR / fieldH) + 1;
  for (let iy = -rows; iy <= rows; iy++) {
    for (let ix = -cols; ix <= cols; ix++) {
      const cx = ix * fieldW;
      const cy = iy * fieldH;
      if (!rectIntersectsCircle(cx, cy, hw, hh, waferR)) continue;
      const fullyInside = fieldInsideWafer(cx, cy, hw, hh, waferR);
      fields.push({ cx, cy, hw, hh, truncated: !fullyInside });
    }
  }
  fields.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  return fields;
}

/** 矩形四角到原点的最大距离 */
export function maxCornerDist(cx, cy, hw, hh) {
  const corners = [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx - hw, cy + hh],
    [cx + hw, cy + hh],
  ];
  return Math.max(...corners.map(([x, y]) => Math.hypot(x, y)));
}

/** 矩形与圆是否相交（含相切） */
export function rectIntersectsCircle(cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(cx) - hw, 0);
  const dy = Math.max(Math.abs(cy) - hh, 0);
  return Math.hypot(dx, dy) <= r;
}

/** 判定场是否完全在晶圆内 */
export function fieldInsideWafer(cx, cy, hw, hh, r) {
  return maxCornerDist(cx, cy, hw, hh) <= r;
}
