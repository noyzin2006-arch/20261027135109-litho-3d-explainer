// 第 11 章瑞利判据概念演示面板：同一组细线随 λ / NA 变化
import { visualParams, LAMBDA_OPTIONS, NA_OPTIONS, criticalDimension } from "../logic/rayleigh.js";

export function createRayleighPanel(container) {
  container.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "rayleigh-panel";

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 150;
  canvas.style.width = "320px";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "细线可分辨程度演示：同一组紧密线条，参数改变后清晰度随之变化");

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";
  btnRow.style.flexWrap = "wrap";

  const btnLambda = document.createElement("button");
  btnLambda.className = "btn";
  const btnNA = document.createElement("button");
  btnNA.className = "btn";
  btnRow.appendChild(btnLambda);
  btnRow.appendChild(btnNA);

  const readout = document.createElement("div");
  readout.className = "scale-note";
  readout.style.marginTop = "0";

  const note = document.createElement("div");
  note.className = "scale-note";
  note.style.marginTop = "0";
  note.textContent = "概念演示，非精确成像仿真；实际图形还取决于更多工艺因素。";

  panel.appendChild(canvas);
  panel.appendChild(btnRow);
  panel.appendChild(readout);
  panel.appendChild(note);
  container.appendChild(panel);

  let li = 3; // 默认 193 nm
  let ni = 2; // 默认 0.93

  function draw() {
    const lam = LAMBDA_OPTIONS[li];
    const na = NA_OPTIONS[ni];
    const { gap, blur } = visualParams(lam.nm, na.na);
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg-2") || "#e8ebef";
    ctx.fillRect(0, 0, W, H);

    const lines = 9;
    const margin = 28;
    const usable = W - margin * 2;
    const spacing = margin * 0.9 * (0.35 + 0.65 * gap) / 1.2 + 6;
    const width = Math.max(1.2, 4.2 * (1 - gap * 0.55));
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--c-teal") || "#0c6e78";
    ctx.shadowColor = "rgba(12,110,120,0.6)";
    ctx.shadowBlur = 10 * blur;
    for (let i = 0; i < lines; i++) {
      const y = 30 + i * spacing;
      if (y > H - 18) break;
      ctx.fillRect(margin, y, usable, width);
    }
    ctx.shadowBlur = 0;

    btnLambda.textContent = `缩短波长：${lam.label}`;
    btnNA.textContent = `增大 NA：${na.label}`;
    const cd = criticalDimension(lam.nm, na.na);
    readout.innerHTML = "";
    const cdSpan = document.createElement("span");
    cdSpan.className = "num";
    cdSpan.textContent = `CD ≈ k₁×λ/NA ≈ ${cd < 10 ? cd.toFixed(1) : Math.round(cd)} nm`;
    const noteSpan = document.createElement("span");
    noteSpan.textContent = "（示例工艺因子 k₁=0.35）";
    readout.appendChild(cdSpan);
    readout.appendChild(noteSpan);
  }

  btnLambda.addEventListener("click", () => {
    li = (li + 1) % LAMBDA_OPTIONS.length;
    draw();
  });
  btnNA.addEventListener("click", () => {
    ni = (ni + 1) % NA_OPTIONS.length;
    draw();
  });

  draw();
  return { draw };
}
