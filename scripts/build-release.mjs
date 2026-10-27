// 生成自包含静态发布目录 site/（供站点发布 / file:// 直开）
// 用法：node scripts/build-release.mjs
import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");

mkdirSync(SITE, { recursive: true });

// 1. index.html：改写资源路径为相对路径 + 版本号防缓存
let html = readFileSync(join(ROOT, "index.html"), "utf8");
const ver = Date.now().toString(36);
html = html.replaceAll('/src/styles/tokens.css', './tokens.css');
html = html.replaceAll('/src/styles/main.css', './main.css');
html = html.replaceAll('/dist/app.js', `./app.js?v=${ver}`);
writeFileSync(join(SITE, "index.html"), html);

// 2. 样式与脚本
copyFileSync(join(ROOT, "src/styles/tokens.css"), join(SITE, "tokens.css"));
copyFileSync(join(ROOT, "src/styles/main.css"), join(SITE, "main.css"));
copyFileSync(join(ROOT, "dist/app.js"), join(SITE, "app.js"));

console.log("release ->", SITE);
