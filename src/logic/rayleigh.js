// 瑞利判据概念演示：CD = k1 × λ / NA
// 只表达趋势因果，不冒充精确成像仿真。

export const K1 = 0.35; // 教学示例工艺因子（典型量级，标注为示例）

/**
 * 最小可分辨特征尺寸（nm）
 * @param {number} lambdaNm 波长
 * @param {number} na 数值孔径
 */
export function criticalDimension(lambdaNm, na) {
  if (!(lambdaNm > 0)) throw new RangeError("lambda must be > 0");
  if (!(na > 0)) throw new RangeError("NA must be > 0");
  return (K1 * lambdaNm) / na;
}

/**
 * 把物理分辨率映射为可视化参数（0~1 归一化视觉量）。
 * 分辨率越小 → 线距越大越清晰（视觉 gap 大）、模糊越小。
 * @returns {{gap:number, blur:number}} gap/blur 均为 0..1
 */
export function visualParams(lambdaNm, na) {
  const cd = criticalDimension(lambdaNm, na);
  // 参考区间：最优 (13.5nm, 0.55) ≈ 8.6nm；最差 (436nm, 0.3) ≈ 507nm
  const lo = criticalDimension(13.5, 0.55);
  const hi = criticalDimension(436, 0.3);
  const t = clamp01((Math.log(cd) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)));
  return {
    gap: 0.15 + 0.85 * (1 - t),   // 分辨率越好 gap 越大
    blur: 0.04 + 0.96 * t,        // 分辨率越差 blur 越大
  };
}

// 波长与 NA 的可选档位（概念演示用，均有公开通识出处）
export const LAMBDA_OPTIONS = [
  { label: "436 nm（g 线）", nm: 436 },
  { label: "365 nm（i 线）", nm: 365 },
  { label: "248 nm（KrF）", nm: 248 },
  { label: "193 nm（ArF DUV）", nm: 193 },
  { label: "13.5 nm（EUV）", nm: 13.5 },
];

export const NA_OPTIONS = [
  { label: "0.30", na: 0.3 },
  { label: "0.60", na: 0.6 },
  { label: "0.93（干式极限）", na: 0.93 },
  { label: "1.35（浸没式）", na: 1.35 },
  { label: "0.33（EUV）", na: 0.33 },
  { label: "0.55（High-NA EUV）", na: 0.55 },
];

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}
