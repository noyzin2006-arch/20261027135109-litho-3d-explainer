// EUV 原理装置（第 10 章）：真空腔 + 锡滴等离子体光源 + 全反射光路 + 反射式掩模
// 位于独立区域；绝不允许出现玻璃透镜或透射掩模（科学红线 R06）。
import * as THREE from "three";
import { mat, makeLabel, beamTube } from "./env.js";
import { L_POLYGON } from "../logic/pattern.js";

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

/** 反射式掩模：斜置镜面 + L 图案（反射区域） */
function makeReflectiveMask() {
  const grp = new THREE.Group();
  const substrate = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.72, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.06, metalness: 1 })
  );
  grp.add(substrate);
  // 图案面（L 形多层膜反射区，用 canvas 贴图）
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#20242a"; // 吸收层
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#eef1f5"; // 反射图案区
  const toPx = ([x, y]) => [128 + x * 105, 128 - y * 105];
  g.beginPath();
  L_POLYGON.forEach(([x, y], i) => {
    const [px, py] = toPx([x, y]);
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  });
  g.closePath();
  g.fill();
  g.fillRect(128 - 0.75 * 105, 128 - 0.62 * 105 - 2, 1.5 * 105, 3.4);
  g.fillRect(128 - 0.75 * 105, 128 - 0.74 * 105 - 2, 1.5 * 105, 3.4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.68),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.15, metalness: 0.8 })
  );
  face.position.z = 0.028;
  grp.add(face);
  grp.rotation.x = -0.62; // 倾斜承接入射与反射光路
  return grp;
}

export function buildEuv() {
  const root = new THREE.Group();
  root.position.set(0, 0, -60); // 独立区域
  root.visible = false;

  /* ---------- 真空腔轮廓（描边盒，透明面板极淡） ---------- */
  const chamber = new THREE.Group();
  root.add(chamber);
  const CW = 6.4, CH = 3.0, CD = 3.2;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(CW, CH, CD)),
    new THREE.LineBasicMaterial({ color: 0x63549e, transparent: true, opacity: 0.7 })
  );
  edges.position.y = 1.55;
  chamber.add(edges);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x8d84c2,
    transparent: true,
    opacity: 0.06,
    roughness: 0.3,
    metalness: 0.2,
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CD), panelMat);
  panel.position.y = 1.55;
  chamber.add(panel);
  const vacLabel = makeLabel("高真空光路", { color: "#4a3f80", bg: "rgba(233,229,244,0.92)" });
  vacLabel.position.set(-CW / 2 + 0.9, CH + 0.25, 0);
  chamber.add(vacLabel);

  /* ---------- 锡滴发生器（左端） ---------- */
  const dropper = new THREE.Group();
  root.add(dropper);
  box(0.5, 0.7, 0.5, mat.steel(), -CW / 2 + 0.7, 2.2, 0, dropper);
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.06, 0.25, 16),
    mat.darkSteel()
  );
  nozzle.position.set(-CW / 2 + 0.7, 1.72, 0);
  dropper.add(nozzle);
  // 锡滴（动画中循环下落）
  const droplets = [];
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xc0c6cc, roughness: 0.25, metalness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), dropMat);
    d.position.set(-CW / 2 + 0.7, 1.6 - i * 0.12, 0);
    dropper.add(d);
    droplets.push(d);
  }

  /* ---------- 两束脉冲激光（预脉冲 + 主脉冲） ---------- */
  const laserA = beamTube(
    [
      [-CW / 2 + 0.7, 2.0, -0.9],
      [-CW / 2 + 0.7, 1.5, 0],
    ],
    0.014,
    mat.goldBeam()
  );
  const laserB = beamTube(
    [
      [-CW / 2 + 0.7, 1.0, 0.9],
      [-CW / 2 + 0.7, 1.5, 0],
    ],
    0.014,
    mat.goldBeam()
  );
  root.add(laserA, laserB);

  /* ---------- 等离子体光源（发光小球 + 点光） ---------- */
  const plasma = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xcfc4f2 })
  );
  plasma.position.set(-CW / 2 + 0.7, 1.5, 0);
  plasma.visible = false;
  root.add(plasma);
  const plasmaLight = new THREE.PointLight(0xb9a6ff, 0, 4);
  plasma.add(plasmaLight);

  /* ---------- 集光镜（凹面弧） ---------- */
  const collector = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.1, 12, 32, Math.PI * 1.2),
    mat.mirror()
  );
  collector.position.set(-CW / 2 + 1.15, 1.5, 0);
  collector.rotation.y = Math.PI / 2;
  collector.rotation.z = Math.PI * 0.42;
  root.add(collector);

  /* ---------- 反射镜链（6 面，折转光路到反射掩模） ---------- */
  const mirrors = [];
  const beamPts = [
    [-CW / 2 + 1.15, 1.5, 0], // 集光后
    [-2.2, 1.7, -0.6],
    [-1.4, 1.35, -0.3],
    [-0.6, 1.7, -0.55],
    [0.2, 1.4, -0.3], // 反射掩模
  ];
  const mirrorPositions = beamPts.slice(1, -1);
  for (const p of mirrorPositions) {
    const mir = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 32), mat.mirror());
    mir.position.set(...p);
    mir.rotation.set(Math.random() * 0.6 + 0.4, Math.random() * 1.2, 0.6);
    root.add(mir);
    mirrors.push(mir);
  }
  const euvBeam = beamTube(beamPts, 0.012, mat.violetBeam());
  root.add(euvBeam);

  /* ---------- 反射式掩模 ---------- */
  const mask = makeReflectiveMask();
  mask.position.set(0.2, 1.4, -0.3);
  mask.rotation.z = 0.5;
  root.add(mask);
  const maskLabel = makeLabel("反射式掩模", { color: "#4a3f80", bg: "rgba(233,229,244,0.92)" });
  maskLabel.position.set(0.2, 2.05, -0.3);
  root.add(maskLabel);

  /* ---------- 投影反射镜（4 面折转） + 晶圆 ---------- */
  const projPts = [
    [0.2, 1.4, -0.3],
    [1.1, 1.05, 0.1],
    [1.9, 1.5, -0.25],
    [2.7, 1.05, 0.1],
    [3.4, 0.62, -0.1],
  ];
  for (const p of projPts.slice(1, -1)) {
    const mir = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 32), mat.mirror());
    mir.position.set(...p);
    mir.rotation.set(0.7, Math.random() * 1.0, 0.4);
    root.add(mir);
  }
  const projBeam = beamTube(projPts, 0.012, mat.violetBeam());
  root.add(projBeam);

  const waferStage = box(0.8, 0.12, 0.8, mat.anodized(), 3.4, 0.36, -0.1, root);
  const wafer = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 64), mat.wafer());
  wafer.position.set(3.4, 0.45, -0.1);
  root.add(wafer);
  const wl = makeLabel("晶圆", {});
  wl.position.set(3.4, 0.75, 0.25);
  root.add(wl);

  /* ---------- 底座 ---------- */
  box(CW - 0.2, 0.16, CD - 0.2, mat.graphite(), 0, 0.08, 0, root);

  /* ---------- 标签 ---------- */
  const srcLabel = makeLabel("锡滴 + 激光等离子体光源", { color: "#4a3f80", bg: "rgba(233,229,244,0.92)" });
  srcLabel.position.set(-CW / 2 + 0.9, 2.75, 0);
  root.add(srcLabel);
  const mirrorLabel = makeLabel("多层膜反射镜（布喇格镜）", { color: "#4a3f80", bg: "rgba(233,229,244,0.92)" });
  mirrorLabel.position.set(-0.6, 2.15, -0.55);
  root.add(mirrorLabel);
  const waveLabel = makeLabel("EUV 13.5 nm · 伪彩示意（人眼不可见）", { color: "#4a3f80", bg: "rgba(233,229,244,0.92)" });
  waveLabel.position.set(1.4, 0.35, 1.1);
  root.add(waveLabel);

  /** 动画：t 秒内锡滴下落、脉冲打亮、等离子体发光 */
  function update(dt, time, playing) {
    if (!playing) return;
    // 锡滴循环下落
    for (let i = 0; i < droplets.length; i++) {
      const d = droplets[i];
      d.position.y -= dt * 0.25;
      if (d.position.y < 1.5) d.position.y = 1.6;
    }
    // 等离子体脉动
    if (plasma.visible) {
      const k = 0.7 + 0.3 * Math.sin(time * 9);
      plasma.scale.setScalar(k);
      plasmaLight.intensity = 2.4 * k;
    }
  }

  function setPlaying(on) {
    plasma.visible = on;
    if (!on) {
      plasmaLight.intensity = 0;
      plasma.scale.setScalar(1);
    }
  }

  return {
    root,
    parts: { dropper, plasma, collector, mask, wafer, euvBeam, projBeam, laserA, laserB, chamber },
    pickables: [
      { mesh: collector, name: "集光镜", role: "把等离子体发出的 EUV 收集进光路", more: "EUV 被一切材料强烈吸收：这里没有任何透镜，全部是多层膜反射镜。" },
      { mesh: mask, name: "反射式掩模", role: "图案以反射方式进入投影光路", more: "DUV 掩模透光，EUV 掩模反光——因为 13.5 nm 穿不过玻璃。" },
      { mesh: wafer, name: "晶圆", role: "缩小后的图案被逐场投到晶圆上", more: "EUV 光路处于高真空，整机内部没有空气。" },
    ],
    update,
    setPlaying,
  };
}
