import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CHAPTERS, validateChapters } from "../src/logic/chapters-data.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("章节数据校验通过（13 章、无错误）", () => {
  const errs = validateChapters();
  assert.deepEqual(errs, []);
  assert.equal(CHAPTERS.length, 13);
});

test("章节 id 顺序与愿景案一致", () => {
  assert.deepEqual(
    CHAPTERS.map((c) => c.id),
    [
      "prologue",
      "coat",
      "source",
      "mask",
      "projection",
      "expose",
      "scan",
      "develop",
      "etch",
      "overlay",
      "euv",
      "rayleigh",
      "epilogue",
    ]
  );
});

test("关键科学表述出现在对应章节（防讲错）", () => {
  const get = (id) => CHAPTERS.find((c) => c.id === id);
  // 正胶：曝光区被移除
  assert.match(get("expose").term, /正性光刻胶/);
  assert.match(get("expose").what, /仍完整/);
  // 显影在独立工序
  assert.match(get("develop").term, /独立工艺腔/);
  // EUV 不穿过玻璃与空气
  assert.match(get("euv").what, /真空/);
  assert.match(get("euv").what, /反射镜/);
  // 步进 vs 扫描区分
  assert.match(get("scan").term, /两个动作/);
  // 缩小 4 倍标"典型"
  assert.match(get("projection").what, /典型/);
  // 伪彩标注
  assert.match(get("source").term, /伪彩示意/);
  assert.match(get("euv").term, /伪彩示意/);
});

test("index.html 引用的本地资源都存在", () => {
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"]+|\.\.?\/[^"]+)"/g)].map(
    (m) => m[1]
  );
  assert.ok(refs.length > 0, "index.html 应引用本地样式与脚本");
  for (const ref of refs) {
    const p = join(ROOT, ref.replace(/^\//, ""));
    assert.ok(existsSync(p), `引用缺失: ${ref}`);
  }
});

test("构建产物 dist/app.js 存在且非空", () => {
  const p = join(ROOT, "dist", "app.js");
  assert.ok(existsSync(p), "先运行 npm run build 生成 dist/app.js");
  const stat = readFileSync(p);
  assert.ok(stat.length > 10000, "app.js 过小，可能构建失败");
});
