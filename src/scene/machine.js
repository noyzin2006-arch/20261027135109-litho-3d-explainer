// 光刻机整机（原理级通用机型，结构简化示意）
// 布局：光源(左后) → 照明系统(上) → 掩模台(中上) → 投影光学(斜柱) → 晶圆台(右下)
// 前面板左侧被"展陈移开"，露出内部光路舱。
import * as THREE from "three";
import { mat, makeLabel, beamTube, beamArrow } from "./env.js";
import { L_POLYGON } from "../logic/pattern.js";

const BAY = { x0: -1.85, x1: 0.75, y0: 0.28, y1: 2.35 }; // 前面板开口范围

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = false;
  if (parent) parent.add(m);
  return m;
}

function cyl(rt, rb, h, seg, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

/** 掩模版：玻璃板 + 遮光铬膜上的透光图案（L 形 + 细线，用 CanvasTexture） */
function makeMaskPlate(patternScale = 1) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#3a3f45"; // 遮光铬膜
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#e8ecf0"; // 透光区
  const toPx = ([x, y]) => [128 + x * 110 * patternScale, 128 - y * 110 * patternScale];
  // L 形
  g.beginPath();
  L_POLYGON.forEach(([x, y], i) => {
    const [px, py] = toPx([x, y]);
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  });
  g.closePath();
  g.fill();
  // 两段细线
  g.fillRect(128 - 0.75 * 110, 128 - 0.62 * 110 - 2, 1.5 * 110, 3.4);
  g.fillRect(128 - 0.75 * 110, 128 - 0.74 * 110 - 2, 1.5 * 110, 3.4);
  // 套刻十字
  g.strokeStyle = "#e8ecf0";
  g.lineWidth = 4;
  const [cx, cy] = toPx([-0.72, -0.72]);
  g.beginPath();
  g.moveTo(cx - 16, cy);
  g.lineTo(cx + 16, cy);
  g.moveTo(cx, cy - 16);
  g.lineTo(cx, cy + 16);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.035, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 0.15, metalness: 0.1 })
  );
  const chrome = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.58),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.2 })
  );
  chrome.rotation.x = -Math.PI / 2;
  chrome.position.y = 0.019;
  plate.add(chrome);
  return plate;
}

/** 晶圆（含胶层） */
function makeWafer() {
  const grp = new THREE.Group();
  const disc = cyl(0.26, 0.26, 0.02, 64, mat.wafer(), 0, 0.01, 0, grp);
  // 缺口（定位边）
  const notch = box(0.03, 0.021, 0.05, mat.graphite(), 0.25, 0.01, 0, grp);
  notch.visible = true;
  // 光刻胶层（极薄、半透明）
  const resist = cyl(0.255, 0.255, 0.006, 64, mat.resist(), 0, 0.024, 0, grp);
  // 待图形化薄膜（在晶圆上方、胶层之下，视觉上以一圈深色边缘表达）
  const film = cyl(0.258, 0.258, 0.004, 64, mat.film(), 0, 0.016, 0, grp);
  return { grp, disc, resist, film, notch };
}

export function buildMachine() {
  const root = new THREE.Group();

  /* ---------- 底座与框架 ---------- */
  box(4.3, 0.22, 3.4, mat.graphite(), 0, 0.11, 0, root); // 基座
  // 减振脚
  for (const [fx, fz] of [
    [-1.95, -1.5],
    [1.95, -1.5],
    [-1.95, 1.5],
    [1.95, 1.5],
  ]) {
    cyl(0.07, 0.09, 0.1, 16, mat.darkSteel(), fx, 0.05, fz, root);
  }

  /* ---------- 机柜外壳（白，前面左半开口） ---------- */
  const shell = new THREE.Group();
  root.add(shell);
  const W = 4.3, H = 2.6, D = 3.4;
  // 后壁
  box(W, H, 0.08, mat.cabinetWhite(), 0, 0.22 + H / 2, -D / 2, shell);
  // 左壁 / 右壁
  box(0.08, H, D, mat.cabinetWhite(), -W / 2, 0.22 + H / 2, 0, shell);
  box(0.08, H, D, mat.cabinetWhite(), W / 2, 0.22 + H / 2, 0, shell);
  // 顶板 + FFU 风栅
  box(W, 0.08, D, mat.cabinetWhite(), 0, 0.22 + H + 0.04, 0, shell);
  for (let i = 0; i < 4; i++) {
    const grille = box(0.8, 0.02, 0.5, mat.darkSteel(), -1.5 + i * 1.0, 0.22 + H + 0.085, 0.4, shell);
    grille.name = "ffu";
  }
  // 前面板：右半保留；左半开口（框架柱保留）
  const frontZ = D / 2;
  box(1.9, H, 0.08, mat.cabinetWhite(), 1.65, 0.22 + H / 2, frontZ, shell); // 右前板
  // 左半框架柱
  box(0.12, H, 0.12, mat.cabinetPanel(), BAY.x0 - 0.06, 0.22 + H / 2, frontZ, shell);
  box(0.12, H, 0.12, mat.cabinetPanel(), BAY.x1 + 0.06, 0.22 + H / 2, frontZ, shell);
  box(BAY.x1 - BAY.x0 + 0.12, 0.12, 0.12, mat.cabinetPanel(), (BAY.x0 + BAY.x1) / 2, BAY.y1 + 0.06, frontZ, shell);
  box(BAY.x1 - BAY.x0 + 0.12, 0.12, 0.12, mat.cabinetPanel(), (BAY.x0 + BAY.x1) / 2, BAY.y0 - 0.06, frontZ, shell);
  // 被移开的前板：斜靠在机器左侧
  const removedPanel = box(2.0, H - 0.3, 0.06, mat.cabinetPanel(), -2.75, (H - 0.3) / 2 + 0.2, 0.4, shell);
  removedPanel.rotation.z = 0.10;
  removedPanel.rotation.y = -0.22;
  // 把手、铰链等细节（右前板上）
  box(0.3, 0.04, 0.03, mat.steel(), 1.65, 1.3, frontZ + 0.06, shell);
  for (let i = 0; i < 3; i++) {
    box(0.05, 0.1, 0.03, mat.steel(), 0.85 + i * 0.12, 0.9 + i * 0.5, frontZ + 0.06, shell);
  }
  // 左右壁的接缝与通风栅（增加真实感）
  for (let i = 0; i < 5; i++) {
    box(0.02, 0.18, 0.02, mat.darkSteel(), -W / 2 - 0.01, 0.6 + i * 0.4, -0.8, shell);
    box(0.02, 0.18, 0.02, mat.darkSteel(), W / 2 + 0.01, 0.6 + i * 0.4, -0.8, shell);
  }

  /* ---------- 内舱（深石墨腔体） ---------- */
  const bay = new THREE.Group();
  root.add(bay);
  box(0.06, BAY.y1 - BAY.y0, 2.4, mat.darkBay(), BAY.x1 + 0.03, (BAY.y0 + BAY.y1) / 2, -0.35, bay); // 分隔墙
  box(BAY.x1 - BAY.x0, BAY.y1 - BAY.y0, 0.06, mat.darkBay(), (BAY.x0 + BAY.x1) / 2, (BAY.y0 + BAY.y1) / 2, -1.45, bay); // 舱后壁

  /* ---------- 光源模块（左后） ---------- */
  const source = new THREE.Group();
  bay.add(source);
  const srcBody = box(0.85, 0.8, 0.7, mat.steel(), -1.45, 1.95, -0.85, source);
  box(0.2, 0.2, 0.2, mat.anodized(), -1.45, 2.42, -0.85, source); // 顶部谐振腔
  // 散热鳍
  for (let i = 0; i < 4; i++) {
    box(0.8, 0.03, 0.6, mat.darkSteel(), -1.45, 1.68 + i * 0.09, -0.85, source);
  }

  /* ---------- 照明系统（顶腔） ---------- */
  const illuminator = new THREE.Group();
  bay.add(illuminator);
  const illumBody = box(1.1, 0.42, 0.8, mat.cabinetPanel(), -0.62, 2.12, -0.45, illuminator);
  // 出光口
  box(0.18, 0.06, 0.18, mat.darkSteel(), -0.1, 1.93, -0.45, illuminator);

  /* ---------- 掩模台 ---------- */
  const maskStage = new THREE.Group();
  bay.add(maskStage);
  box(0.95, 0.1, 0.85, mat.anodized(), 0.32, 1.55, -0.45, maskStage); // 台板
  // 导轨
  box(1.3, 0.04, 0.06, mat.steel(), 0.32, 1.49, -0.78, maskStage);
  box(1.3, 0.04, 0.06, mat.steel(), 0.32, 1.49, -0.12, maskStage);
  const mask = makeMaskPlate(1);
  mask.position.set(0.32, 1.63, -0.45);
  mask.rotation.y = -0.5; // 微转角方便观众看图案
  maskStage.add(mask);

  /* ---------- 投影光学柱（斜柱：掩模 → 晶圆台） ---------- */
  const projection = new THREE.Group();
  bay.add(projection);
  const axisFrom = new THREE.Vector3(0.32, 1.42, -0.45);
  const axisTo = new THREE.Vector3(1.42, 0.62, -0.45);
  const axis = axisTo.clone().sub(axisFrom);
  const len = axis.length();
  const barrelMat = mat.cabinetPanel();
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.17 - i * 0.012, len / 4 - 0.03, 32), barrelMat);
    const t = (i + 0.5) / 4;
    seg.position.copy(axisFrom).addScaledVector(axis, t);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    projection.add(seg);
    // 透镜（玻璃圆片）
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1 - i * 0.008, 0.1 - i * 0.008, 0.015, 32), mat.glass());
    lens.position.copy(axisFrom).addScaledVector(axis, (i + 0.82) / 4);
    lens.quaternion.copy(seg.quaternion);
    lens.rotateX(Math.PI / 2);
    projection.add(lens);
  }

  /* ---------- 晶圆台 ---------- */
  const waferStage = new THREE.Group();
  bay.add(waferStage);
  box(0.72, 0.1, 0.72, mat.anodized(), 1.42, 0.5, -0.45, waferStage); // 台板
  box(1.2, 0.05, 0.08, mat.steel(), 1.42, 0.42, -0.7, waferStage); // 导轨
  box(1.2, 0.05, 0.08, mat.steel(), 1.42, 0.42, -0.2, waferStage);
  const waferAssembly = makeWafer();
  waferAssembly.grp.position.set(1.42, 0.55, -0.45);
  waferStage.add(waferAssembly.grp);

  /* ---------- 传片机械手（右前，简化） ---------- */
  const robot = new THREE.Group();
  root.add(robot);
  box(0.25, 1.3, 0.25, mat.cabinetPanel(), 1.95, 0.9, 0.9, robot);
  const arm = box(0.55, 0.05, 0.18, mat.steel(), 1.7, 1.5, 0.75, robot);
  arm.rotation.y = 0.5;

  /* ---------- 光路（金色示意束） ---------- */
  const beamMat = mat.goldBeam();
  const pathPoints = [
    [-1.45, 1.95, -0.85], // 光源
    [-0.85, 2.0, -0.6],
    [-0.62, 2.12, -0.45], // 照明系统
    [-0.1, 1.9, -0.45],
    [0.32, 1.7, -0.45], // 掩模
    [0.32, 1.42, -0.45], // 入投影柱
    [1.42, 0.62, -0.45], // 出投影柱
    [1.42, 0.58, -0.45], // 晶圆
  ];
  const beam = beamTube(pathPoints, 0.012, beamMat);
  bay.add(beam);
  const arrows = [
    beamArrow([-0.62, 2.12, -0.45], [-0.1, 1.9, -0.45], beamMat),
    beamArrow([0.32, 1.42, -0.45], [1.42, 0.62, -0.45], beamMat),
  ];
  arrows.forEach((a) => bay.add(a));

  /* ---------- 标签 ---------- */
  const labels = new THREE.Group();
  root.add(labels);
  const labelDefs = [
    ["光源模块", [-1.45, 2.55, -0.85]],
    ["照明系统", [-0.62, 2.45, -0.45]],
    ["掩模台", [0.32, 1.85, -0.45]],
    ["投影光学", [0.95, 1.15, -0.45]],
    ["晶圆台", [1.42, 0.82, -0.45]],
    ["晶圆", [1.42, 0.62, 0.1]],
  ];
  const labelSprites = {};
  for (const [text, pos] of labelDefs) {
    const s = makeLabel(text);
    s.position.set(...pos);
    labels.add(s);
    labelSprites[text] = s;
  }

  /* ---------- 部件点击注册表 ---------- */
  const pickables = [
    { mesh: srcBody, name: "光源模块", role: "产生特定波长的深紫外光", more: "典型 ArF 光源波长 193 nm（DUV）；EUV 机型用激光等离子体产生 13.5 nm 光，图中为示意。" },
    { mesh: illumBody, name: "照明系统", role: "把光整形为均匀光场照向掩模", more: "均匀的照明是曝光一致性的前提；这一段光路被称为照明光学。" },
    { mesh: mask, name: "掩模版", role: "携带本层电路图案的“原稿”", more: "DUV 掩模是透射式：透光区域即图案。掩模图案尺寸是晶圆上像的 4 倍（典型）。" },
    { mesh: maskStage.children[0], name: "掩模台", role: "承载并高速移动掩模，与晶圆台反向扫描", more: "扫描曝光时掩模台与晶圆台严格同步反向运动。" },
    { mesh: projection.children[0], name: "投影光学", role: "把掩模图案缩小成像到胶层", more: "DUV 用多片透镜折射成像；EUV 则用多层膜反射镜——透镜方案在 13.5 nm 完全失效。" },
    { mesh: waferStage.children[0], name: "晶圆台", role: "承载晶圆完成扫描与步进", more: "纳米级定位精度；换曝光场时晶圆台步进移动。" },
    { mesh: waferAssembly.disc, name: "晶圆", role: "薄硅片，芯片在这里一层层长大", more: "典型直径 300 mm；表面先有薄膜，再旋涂光刻胶。" },
    { mesh: waferAssembly.resist, name: "光刻胶", role: "感光薄层，图案先“写”进这里", more: "正胶曝光区显影后被移除；负胶相反。本片用正胶。" },
  ];

  return {
    root,
    parts: {
      source,
      illuminator,
      maskStage,
      mask,
      projection,
      waferStage,
      waferAssembly,
      robot,
      beam,
      arrows,
      labels,
      labelSprites,
      removedPanel,
      shell,
    },
    pickables,
    beamPath: pathPoints,
  };
}

/** 掩模台/晶圆台的扫描步进动画（第 06 章用）：在初始位姿上做偏移 */
export function machineScanPose(parts, { scan, step }) {
  // scan: -1..1 场内扫描进度（掩模/晶圆反向）；step: 换场偏移
  const ms = parts.maskStage;
  const ws = parts.waferStage;
  if (!ms.userData.base) ms.userData.base = ms.position.clone();
  if (!ws.userData.base) ws.userData.base = ws.position.clone();
  ms.position.copy(ms.userData.base);
  ws.position.copy(ws.userData.base);
  ms.position.z += -scan * 0.16;
  ws.position.z += scan * 0.16;
  ws.position.x += step * 0.5;
}

/** 晶圆台步进复位 */
export function resetStagePose(parts) {
  if (parts.maskStage.userData.base) parts.maskStage.position.copy(parts.maskStage.userData.base);
  if (parts.waferStage.userData.base) parts.waferStage.position.copy(parts.waferStage.userData.base);
}
