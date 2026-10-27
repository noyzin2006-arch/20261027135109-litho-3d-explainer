// 渲染环境：渲染器 / 场景 / 灯光 / 相机 / 轨道控制 / 补间
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const REDUCED_MOTION =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 创建渲染器；WebGL 不可用时抛错由调用方降级 */
export function createRenderer(container) {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(canvas);
  return renderer;
}

export function createScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  return scene;
}

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8d949c, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(6, 10, 7);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8f2, 0.4);
  fill.position.set(-7, 4, -4);
  scene.add(fill);
  return { hemi, key, fill };
}

export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(40, aspect, 0.05, 500);
  camera.position.set(8, 3.2, 10);
  return camera;
}

export function createControls(camera, dom) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = !REDUCED_MOTION;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.4;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.52;
  return controls;
}

/* ---------------- 补间（可打断） ---------------- */

const easings = {
  linear: (t) => t,
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
};

class Tween {
  constructor({ duration = 1, ease = "easeInOut", onUpdate, onDone }) {
    this.duration = REDUCED_MOTION ? 0 : duration;
    this.ease = ease;
    this.onUpdate = onUpdate;
    this.onDone = onDone;
    this.start = performance.now(); // 墙钟时间：标签页被节流也能按时到达
    this.dead = false;
  }
  tick() {
    if (this.dead) return true;
    const elapsed = (performance.now() - this.start) / 1000;
    const k = this.duration <= 0 ? 1 : Math.min(1, elapsed / this.duration);
    this.onUpdate(easings[this.ease](k), k);
    if (k >= 1) {
      this.dead = true;
      if (this.onDone) this.onDone();
      return true;
    }
    return false;
  }
  cancel() {
    this.dead = true;
  }
}

export class TweenManager {
  constructor() {
    this.list = [];
  }
  add(opts) {
    const tw = new Tween(opts);
    this.list.push(tw);
    return tw;
  }
  tick() {
    // tick() 返回 true = 已完成需移除；返回 false = 进行中需保留
    this.list = this.list.filter((tw) => !tw.tick());
  }
  cancelAll() {
    for (const tw of this.list) tw.cancel();
    this.list.length = 0;
  }
}

/** 相机飞行（被用户拖动立即打断） */
export function flyCamera(camera, controls, tweens, { pos, target, duration = 1.6 }, onArrive) {
  if (REDUCED_MOTION) duration = 0;
  const p0 = camera.position.clone();
  const t0 = controls.target.clone();
  const p1 = new THREE.Vector3(...pos);
  const t1 = new THREE.Vector3(...target);
  const tw = tweens.add({
    duration,
    ease: "easeInOut",
    onUpdate: (k) => {
      camera.position.lerpVectors(p0, p1, k);
      controls.target.lerpVectors(t0, t1, k);
    },
    onDone: onArrive,
  });
  // 用户一上手就打断
  const stop = () => tw.cancel();
  controls.addEventListener("start", stop, { once: true });
  return tw;
}

/** 通用材质工厂（统一质感语言） */
export const mat = {
  cabinetWhite: () =>
    new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.62, metalness: 0.05 }),
  cabinetPanel: () =>
    new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.66, metalness: 0.05 }),
  graphite: () =>
    new THREE.MeshStandardMaterial({ color: 0x2c3138, roughness: 0.55, metalness: 0.35 }),
  darkBay: () =>
    new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.7, metalness: 0.3 }),
  steel: () =>
    new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.32, metalness: 0.9 }),
  darkSteel: () =>
    new THREE.MeshStandardMaterial({ color: 0x565c63, roughness: 0.4, metalness: 0.85 }),
  anodized: () =>
    new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.45, metalness: 0.75 }),
  glass: () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xcfe4ef,
      roughness: 0.06,
      metalness: 0,
      transmission: 0.92,
      thickness: 0.06,
      transparent: true,
      opacity: 0.5,
    }),
  mirror: () =>
    new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.05, metalness: 1 }),
  wafer: () =>
    new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.18, metalness: 0.9 }),
  film: () =>
    new THREE.MeshStandardMaterial({ color: 0x9fb2c4, roughness: 0.35, metalness: 0.6 }),
  resist: () =>
    new THREE.MeshStandardMaterial({
      color: 0xe8c9b8,
      roughness: 0.5,
      metalness: 0,
      transparent: true,
      opacity: 0.72,
    }),
  resistExposed: () =>
    new THREE.MeshStandardMaterial({
      color: 0xc46e86,
      roughness: 0.5,
      metalness: 0,
      emissive: 0x6e2438,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.75,
    }),
  goldBeam: () =>
    new THREE.MeshBasicMaterial({ color: 0xd9a419, transparent: true, opacity: 0.85 }),
  violetBeam: () =>
    new THREE.MeshBasicMaterial({ color: 0x9d8ce0, transparent: true, opacity: 0.8 }),
  tealMark: () =>
    new THREE.MeshBasicMaterial({ color: 0x2aa7b2, transparent: true, opacity: 0.9 }),
};

/** 画布文字精灵（部件标签） */
export function makeLabel(text, { size = 28, color = "#46525f", bg = "rgba(255,255,255,0.9)" } = {}) {
  const pad = 10;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = `${size}px "PingFang SC", "Noto Sans SC", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = size + pad * 2;
  c.width = w;
  c.height = h;
  const ctx2 = c.getContext("2d");
  ctx2.font = font;
  ctx2.fillStyle = bg;
  const r = 10;
  ctx2.beginPath();
  ctx2.moveTo(r, 0);
  ctx2.arcTo(w, 0, w, h, r);
  ctx2.arcTo(w, h, 0, h, r);
  ctx2.arcTo(0, h, 0, 0, r);
  ctx2.arcTo(0, 0, w, 0, r);
  ctx2.fill();
  ctx2.fillStyle = color;
  ctx2.textBaseline = "middle";
  ctx2.fillText(text, pad, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(w / 220, h / 220, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** 细线束（光路示意）：沿点列生成 TubeGeometry */
export function beamTube(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "catmullrom",
    0.0
  );
  const geo = new THREE.TubeGeometry(curve, 64, radius, 8, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.isBeam = true;
  return mesh;
}

/** 箭头锥（光路方向标记） */
export function beamArrow(from, to, material) {
  const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize();
  const geo = new THREE.ConeGeometry(0.03, 0.09, 12);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(...to);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return mesh;
}
