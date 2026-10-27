// 第 06 章晶圆俯视场图（SVG，随扫描/步进进度点亮）
import { FIELD_LAYOUT } from "../scene/director.js";

const R = 46;
const CX = 52;
const CY = 52;
const SCALE = 42; // 单位圆半径 → px

export function createFieldmap(container) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "fieldmap";
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "104");
  svg.setAttribute("height", "104");
  svg.setAttribute("viewBox", "0 0 104 104");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "晶圆曝光场俯视进度图");

  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", CX);
  circle.setAttribute("cy", CY);
  circle.setAttribute("r", R);
  circle.setAttribute("fill", "var(--bg-2)");
  circle.setAttribute("stroke", "var(--line-1)");
  svg.appendChild(circle);

  const rects = FIELD_LAYOUT.map((f) => {
    const r = document.createElementNS(svgNS, "rect");
    const x = CX + (f.cx - f.hw) * SCALE;
    const y = CY - (f.cy + f.hh) * SCALE;
    r.setAttribute("x", x.toFixed(1));
    r.setAttribute("y", y.toFixed(1));
    r.setAttribute("width", (f.hw * 2 * SCALE).toFixed(1));
    r.setAttribute("height", (f.hh * 2 * SCALE).toFixed(1));
    r.setAttribute("fill", "transparent");
    r.setAttribute("stroke", "var(--c-teal)");
    r.setAttribute("stroke-width", "0.7");
    r.setAttribute("clip-path", "circle(46px at 52px 52px)");
    svg.appendChild(r);
    return r;
  });

  const caption = document.createElement("div");
  caption.className = "scale-note";
  caption.textContent = "晶圆俯视：青色框为曝光场";
  caption.style.marginTop = "0";

  wrap.appendChild(svg);
  wrap.appendChild(caption);
  container.appendChild(wrap);

  let filledIndex = -1;
  let lastActive = -1;
  return {
    update(activeField) {
      if (lastActive >= 0 && activeField !== lastActive) {
        filledIndex = Math.max(filledIndex, lastActive);
      }
      lastActive = activeField;
      rects.forEach((r, i) => {
        if (i <= filledIndex && i !== activeField) {
          r.setAttribute("fill", "color-mix(in srgb, var(--c-teal) 30%, transparent)");
        } else {
          r.setAttribute("fill", "transparent");
        }
      });
      if (rects[activeField]) {
        rects[activeField].setAttribute(
          "fill",
          "color-mix(in srgb, var(--c-gold) 45%, transparent)"
        );
      }
    },
    markDone(index) {
      filledIndex = Math.max(filledIndex, index);
    },
  };
}
