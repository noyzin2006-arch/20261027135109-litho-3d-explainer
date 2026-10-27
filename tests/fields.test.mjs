import test from "node:test";
import assert from "node:assert/strict";
import {
  layoutFields,
  rectIntersectsCircle,
  fieldInsideWafer,
  maxCornerDist,
} from "../src/logic/fields.js";

test("曝光场铺满晶圆：覆盖中心与边缘，且互不重叠", () => {
  const fields = layoutFields({ fieldW: 0.5, fieldH: 0.4 });
  assert.ok(fields.length >= 20, `场太少: ${fields.length}`);
  // 中心有场
  assert.ok(fields.some((f) => f.cx === 0 && f.cy === 0));
  // 互不重叠：同网格内任意两场中心距至少一个场距
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const a = fields[i];
      const b = fields[j];
      const dx = Math.abs(a.cx - b.cx);
      const dy = Math.abs(a.cy - b.cy);
      if (dx < a.hw + b.hw - 1e-9 && dy < a.hh + b.hh - 1e-9) {
        assert.fail(`场 ${i} 与 ${j} 重叠`);
      }
    }
  }
});

test("边缘存在截断场，且截断判定正确", () => {
  const fields = layoutFields({ fieldW: 0.5, fieldH: 0.4 });
  const truncated = fields.filter((f) => f.truncated);
  const full = fields.filter((f) => !f.truncated);
  assert.ok(truncated.length > 0, "应有边缘截断场");
  assert.ok(full.length > 0, "应有完整场");
  for (const f of fields) {
    assert.equal(
      f.truncated,
      !fieldInsideWafer(f.cx, f.cy, f.hw, f.hh, 1),
      `(${f.cx},${f.cy}) 截断标记错误`
    );
  }
});

test("所有场都与晶圆相交（无游离在圆外的场）", () => {
  const fields = layoutFields({ fieldW: 0.5, fieldH: 0.4 });
  for (const f of fields) {
    assert.ok(
      rectIntersectsCircle(f.cx, f.cy, f.hw, f.hh, 1),
      `(${f.cx},${f.cy}) 不与晶圆相交`
    );
  }
});

test("参数合法性：非正尺寸抛错", () => {
  assert.throws(() => layoutFields({ fieldW: 0, fieldH: 0.4 }), RangeError);
  assert.throws(() => layoutFields({ fieldW: 0.5, fieldH: -1 }), RangeError);
  assert.throws(() => layoutFields({ fieldW: 0.5, fieldH: 0.4, waferR: 0 }), RangeError);
});

test("maxCornerDist 中心场 = 对角半径", () => {
  assert.ok(Math.abs(maxCornerDist(0, 0, 0.3, 0.4) - 0.5) < 1e-12);
});
