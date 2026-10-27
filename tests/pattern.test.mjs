import test from "node:test";
import assert from "node:assert/strict";
import {
  L_POLYGON,
  TICK_LINES,
  CROSSHAIRS,
  OVERLAY_OFFSET,
  polygonArea,
  translatePoly,
  scalePoly,
  pointInPolygon,
  patternBounds,
} from "../src/logic/pattern.js";

test("L 形多边形是简单闭合多边形且面积非零", () => {
  assert.equal(L_POLYGON.length, 8);
  assert.notEqual(polygonArea(L_POLYGON), 0);
  // 顶点无重复
  const set = new Set(L_POLYGON.map((p) => p.join(",")));
  assert.equal(set.size, L_POLYGON.length);
});

test("版图元素落在 [-1,1] 单位版面内", () => {
  const b = patternBounds();
  for (const x of [b.minX, b.maxX]) {
    assert.ok(x >= -1 && x <= 1, `x=${x} 越界`);
  }
  for (const y of [b.minY, b.maxY]) {
    assert.ok(y >= -1 && y <= 1, `y=${y} 越界`);
  }
  for (const [x1, y1, x2, y2] of TICK_LINES) {
    for (const v of [x1, y1, x2, y2]) assert.ok(v >= -1 && v <= 1);
  }
  for (const key of Object.keys(CROSSHAIRS)) {
    const [x, y] = CROSSHAIRS[key];
    assert.ok(x >= -1 && x <= 1 && y >= -1 && y <= 1);
  }
});

test("射线法判定：L 形内部点在多边形内、外部点在外", () => {
  // L 的竖臂中心
  assert.equal(pointInPolygon(L_POLYGON, -0.35, -0.25), true);
  // L 的横臂中心
  assert.equal(pointInPolygon(L_POLYGON, 0.25, 0.25), true);
  // L 的缺口（右上被挖掉的区域）
  assert.equal(pointInPolygon(L_POLYGON, -0.35, 0.35), false);
  // 版面外
  assert.equal(pointInPolygon(L_POLYGON, 0.95, 0.95), false);
});

test("translate/scale 后面积按预期变化", () => {
  const a0 = Math.abs(polygonArea(L_POLYGON));
  const moved = translatePoly(L_POLYGON, 0.2, -0.1);
  assert.equal(Math.abs(polygonArea(moved)), a0);
  const scaled = scalePoly(L_POLYGON, 2);
  assert.equal(Math.abs(polygonArea(scaled)), a0 * 4);
});

test("套刻偏移量是小的有意义位移且两个十字初始重合", () => {
  const [dx, dy] = OVERLAY_OFFSET;
  assert.ok(Math.hypot(dx, dy) < 0.2, "错位量应小（示意性）");
  assert.ok(Math.hypot(dx, dy) > 0.01, "错位量应可感知");
  assert.deepEqual(CROSSHAIRS.layer1, CROSSHAIRS.layer2);
});
