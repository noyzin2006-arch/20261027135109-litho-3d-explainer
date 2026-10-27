// 微观工艺舞台：晶圆叠层剖面（涂胶/曝光/显影/刻蚀/套刻）
// 放置在远离整机的独立区域，由导演系统切换镜头。
import * as THREE from "three";
import { mat, makeLabel } from "./env.js";
import { L_POLYGON, TICK_LINES, CROSSHAIRS, OVERLAY_OFFSET } from "../logic/pattern.js";

function shapeFromPolygon(pts, scale = 1, dx = 0, dy = 0) {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const px = x * scale + dx;
    const py = y * scale + dy;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  shape.closePath();
  return shape;
}

function rectShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();
  return s;
}

/** 带孔的平板（Shape + holes，挤出薄板） */
function slabWithHoles(outer, holes, depth, matr) {
  for (const h of holes) outer.holes.push(h);
  const geo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false });
  return new THREE.Mesh(geo, matr);
}

/** 十字标记 */
function crosshair(size, thick, matr) {
  const grp = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(size, thick, thick), matr);
  const b = new THREE.Mesh(new THREE.BoxGeometry(thick, size, thick), matr);
  grp.add(a, b);
  return grp;
}

const PATTERN_SCALE = 0.52; // 版图在剖面舞台的实际半宽

export function buildMicroStage() {
  const root = new THREE.Group();
  root.position.set(0, 0, 60); // 独立区域

  /* ---------- 底板（展台） ---------- */
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.12, 64),
    new THREE.MeshStandardMaterial({ color: 0xe4e7ec, roughness: 0.8, metalness: 0.05 })
  );
  stage.position.y = -0.06;
  root.add(stage);

  /* ---------- 叠层（自下而上）：基底 / 薄膜 / 光刻胶 ---------- */
  const W = 2.2, D = 2.2;
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), mat.wafer());
  substrate.position.y = 0.15;
  root.add(substrate);

  // 薄膜层（y: 0.30..0.38）
  const filmY = 0.34;
  const filmHole = shapeFromPolygon(L_POLYGON, PATTERN_SCALE);
  const filmFull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rectShape(W, D), { depth: 0.08, bevelEnabled: false }),
    mat.film()
  );
  filmFull.rotation.x = -Math.PI / 2;
  filmFull.position.y = filmY + 0.08;
  root.add(filmFull);
  const filmHoled = slabWithHoles(rectShape(W, D), [filmHole], 0.08, mat.film());
  filmHoled.rotation.x = -Math.PI / 2;
  filmHoled.position.y = filmY + 0.08;
  filmHoled.visible = false;
  root.add(filmHoled);
  // 被刻蚀移除的薄膜 L 块（刻蚀动画中下沉消失）
  const filmL = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shapeFromPolygon(L_POLYGON, PATTERN_SCALE), { depth: 0.08, bevelEnabled: false }),
    mat.film()
  );
  filmL.rotation.x = -Math.PI / 2;
  filmL.position.y = filmY + 0.08;
  filmL.visible = false;
  root.add(filmL);
  // 刻蚀后的凹槽底（视觉上露出的基底）
  const cavityFloor = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shapeFromPolygon(L_POLYGON, PATTERN_SCALE), { depth: 0.001, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0x9aa2ac, roughness: 0.6, metalness: 0.4 })
  );
  cavityFloor.rotation.x = -Math.PI / 2;
  cavityFloor.position.y = filmY + 0.002;
  cavityFloor.visible = false;
  root.add(cavityFloor);

  // 光刻胶层（y: 0.38..0.50，示意加厚）
  const resistY = 0.44;
  const resistHole = shapeFromPolygon(L_POLYGON, PATTERN_SCALE);
  const resistFull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rectShape(W, D), { depth: 0.12, bevelEnabled: false }),
    mat.resist()
  );
  resistFull.rotation.x = -Math.PI / 2;
  resistFull.position.y = resistY + 0.12;
  root.add(resistFull);
  const resistHoled = slabWithHoles(rectShape(W, D), [resistHole], 0.12, mat.resist());
  resistHoled.rotation.x = -Math.PI / 2;
  resistHoled.position.y = resistY + 0.12;
  resistHoled.visible = false;
  root.add(resistHoled);
  // 曝光高亮（L 形贴片，解释性颜色；胶层实体仍在）
  const exposeGlow = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shapeFromPolygon(L_POLYGON, PATTERN_SCALE), { depth: 0.122, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({
      color: 0xc46e86,
      emissive: 0x8a2c44,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.85,
      roughness: 0.5,
    })
  );
  exposeGlow.rotation.x = -Math.PI / 2;
  exposeGlow.position.y = resistY + 0.121;
  exposeGlow.visible = false;
  root.add(exposeGlow);

  /* ---------- 第 2 层（套刻演示，y: 0.5 之上） ---------- */
  const overlayGrp = new THREE.Group();
  root.add(overlayGrp);
  const layer2H = 0.14;
  const l2FilmFull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(rectShape(1.6, 1.6), { depth: 0.05, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xb58a5a, roughness: 0.4, metalness: 0.5 })
  );
  l2FilmFull.rotation.x = -Math.PI / 2;
  l2FilmFull.position.y = 0.5 + layer2H;
  overlayGrp.add(l2FilmFull);
  const cross1 = crosshair(0.34, 0.028, mat.tealMark());
  cross1.position.set(CROSSHAIRS.layer1[0] * PATTERN_SCALE, 0.58, -CROSSHAIRS.layer1[1] * PATTERN_SCALE);
  root.add(cross1);
  const cross2 = crosshair(0.34, 0.028, new THREE.MeshBasicMaterial({ color: 0xd977a4, transparent: true, opacity: 0.95 }));
  cross2.position.set(
    CROSSHAIRS.layer2[0] * PATTERN_SCALE + OVERLAY_OFFSET[0] * PATTERN_SCALE * 2,
    0.66,
    -(CROSSHAIRS.layer2[1] * PATTERN_SCALE + OVERLAY_OFFSET[1] * PATTERN_SCALE * 2)
  );
  cross2.visible = false;
  root.add(cross2);

  /* ---------- 细线对（分辨率演示的实体参照，平时隐藏） ---------- */
  const ticks = new THREE.Group();
  root.add(ticks);
  for (const [x1, y1, x2, y2] of TICK_LINES) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(Math.abs(x2 - x1) * PATTERN_SCALE, 0.02, 0.018),
      mat.goldBeam()
    );
    line.position.set(((x1 + x2) / 2) * PATTERN_SCALE, 0.53, -y1 * PATTERN_SCALE);
    ticks.add(line);
  }
  ticks.visible = false;

  /* ---------- 标签 ---------- */
  const labels = new THREE.Group();
  root.add(labels);
  const labelDefs = [
    ["光刻胶（示意加厚）", [-1.5, 0.62, 0.4]],
    ["待图形化薄膜", [-1.5, 0.42, 0.7]],
    ["硅晶圆基底", [-1.5, 0.2, 1.0]],
  ];
  const labelSprites = {};
  for (const [text, pos] of labelDefs) {
    const s = makeLabel(text);
    s.position.set(...pos);
    labels.add(s);
    labelSprites[text] = s;
  }

  /* ---------- 状态接口 ---------- */
  const api = {
    root,
    parts: { substrate, filmFull, filmHoled, filmL, cavityFloor, resistFull, resistHoled, exposeGlow, overlayGrp, l2FilmFull, cross1, cross2, ticks, labels, labelSprites },
    /** 涂胶状态 */
    setCoated(on) {
      api.parts.resistFull.visible = on;
      api.parts.resistHoled.visible = false;
      api.parts.exposeGlow.visible = false;
    },
    /** 曝光高亮（胶层仍在） */
    setExposed(on) {
      api.parts.exposeGlow.visible = on;
      if (on) {
        api.parts.resistFull.visible = true;
        api.parts.resistHoled.visible = false;
      }
    },
    /** 显影进度 0..1：完整胶层淡出、带 L 开口的胶层浮现 */
    setDeveloped(k) {
      const { resistFull, resistHoled } = api.parts;
      if (k <= 0) {
        resistFull.visible = api.coated !== false;
        resistHoled.visible = false;
        resistFull.material.opacity = 0.72;
        return;
      }
      resistFull.visible = k < 1;
      resistHoled.visible = true;
      resistFull.material.opacity = 0.72 * (1 - k);
      resistHoled.material.opacity = 0.72 * (0.25 + 0.75 * k);
    },
    /** 刻蚀进度 0..1：薄膜 L 块下沉消失，凹槽底显现 */
    setEtched(k) {
      const { filmFull, filmHoled, filmL, cavityFloor } = api.parts;
      if (k <= 0) {
        filmFull.visible = true;
        filmHoled.visible = false;
        filmL.visible = false;
        cavityFloor.visible = false;
        return;
      }
      filmFull.visible = false;
      filmHoled.visible = true;
      filmL.visible = true;
      cavityFloor.visible = true;
      filmL.position.y = 0.34 + 0.08 - 0.08 * k;
      filmL.material = filmL.material.clone();
      filmL.material.transparent = true;
      filmL.material.opacity = 1 - k * 0.85;
    },
    /** 去胶：胶层全部消失 */
    setStripped(on) {
      api.parts.resistFull.visible = !on && api._coatedState;
      api.parts.resistHoled.visible = false;
      api.parts.exposeGlow.visible = false;
    },
    /** 套刻偏移 0..1（0=错位，1=重合） */
    setOverlayAligned(k) {
      const [dx, dy] = OVERLAY_OFFSET;
      cross2.position.x = (CROSSHAIRS.layer2[0] + dx * (1 - k) * 2) * PATTERN_SCALE;
      cross2.position.z = -(CROSSHAIRS.layer2[1] + dy * (1 - k) * 2) * PATTERN_SCALE;
    },
    showOverlayLayer(on) {
      api.parts.overlayGrp.visible = on;
      api.parts.cross2.visible = on;
    },
  };
  api._coatedState = true;
  return api;
}
