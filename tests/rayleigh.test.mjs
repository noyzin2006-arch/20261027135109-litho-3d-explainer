import test from "node:test";
import assert from "node:assert/strict";
import {
  criticalDimension,
  visualParams,
  LAMBDA_OPTIONS,
  NA_OPTIONS,
  K1,
} from "../src/logic/rayleigh.js";

test("瑞利判据：CD = k1·λ/NA", () => {
  assert.ok(Math.abs(criticalDimension(193, 0.93) - (K1 * 193) / 0.93) < 1e-9);
  // 波长减半 → CD 减半（NA 不变）
  assert.ok(
    Math.abs(criticalDimension(100, 0.5) / criticalDimension(50, 0.5) - 2) < 1e-9
  );
  // NA 增大 → CD 减小
  assert.ok(criticalDimension(193, 1.35) < criticalDimension(193, 0.93));
});

test("非法参数抛 RangeError", () => {
  assert.throws(() => criticalDimension(0, 0.5), RangeError);
  assert.throws(() => criticalDimension(193, 0), RangeError);
  assert.throws(() => criticalDimension(-1, 0.5), RangeError);
});

test("视觉映射：EUV(13.5,0.55) 最清晰，g线(436,0.3) 最模糊", () => {
  const best = visualParams(13.5, 0.55);
  const worst = visualParams(436, 0.3);
  assert.ok(best.gap > worst.gap, "最佳组合应有更大线距");
  assert.ok(best.blur < worst.blur, "最佳组合应更少模糊");
  for (const v of [best, worst]) {
    assert.ok(v.gap >= 0 && v.gap <= 1.01, `gap 越界: ${v.gap}`);
    assert.ok(v.blur >= 0 && v.blur <= 1.01, `blur 越界: ${v.blur}`);
  }
});

test("单调性：波长越短越清晰；NA 越大越清晰", () => {
  const lambdas = [436, 365, 248, 193, 13.5];
  for (let i = 1; i < lambdas.length; i++) {
    const a = visualParams(lambdas[i - 1], 0.6);
    const b = visualParams(lambdas[i], 0.6);
    assert.ok(b.blur < a.blur, `λ=${lambdas[i]} 应比 ${lambdas[i - 1]} 更清晰`);
  }
  const nas = [0.3, 0.6, 0.93, 1.35];
  for (let i = 1; i < nas.length; i++) {
    const a = visualParams(193, nas[i - 1]);
    const b = visualParams(193, nas[i]);
    assert.ok(b.blur < a.blur, `NA=${nas[i]} 应比 ${nas[i - 1]} 更清晰`);
  }
});

test("档位数据完整且为正值", () => {
  for (const o of LAMBDA_OPTIONS) assert.ok(o.nm > 0 && o.label);
  for (const o of NA_OPTIONS) assert.ok(o.na > 0 && o.label);
});
