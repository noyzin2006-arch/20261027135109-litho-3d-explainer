// 入口：装配场景、导演、UI 与全局交互
import * as THREE from "three";
import {
  createRenderer,
  createScene,
  createLights,
  createCamera,
  createControls,
  TweenManager,
  REDUCED_MOTION,
} from "./scene/env.js";
import { buildMachine } from "./scene/machine.js";
import { buildMicroStage } from "./scene/micro.js";
import { buildEuv } from "./scene/euv.js";
import { Director } from "./scene/director.js";
import { UI } from "./ui/ui.js";
import { CHAPTERS } from "./logic/chapters-data.js";

function boot() {
  const host = document.getElementById("canvas-host");
  document.getElementById("root").innerHTML = UI.skeleton();
  const ui = new UI({
    onChapter: (i) => director.goTo(i),
    onAction: (action, on, btn) => action.run(ctx, on, btn),
    onFreeMode: () => freeMode(),
    onRecenter: () => director.recenter(),
  });

  let renderer;
  try {
    ui.loaderProgress(0.08, "初始化渲染器");
    renderer = createRenderer(host);
  } catch (err) {
    ui.showFail("你的浏览器暂时无法运行 WebGL 3D（" + (err && err.message ? err.message : "未知原因") + "）。");
    return;
  }

  ui.loaderProgress(0.3, "搭建展厅灯光");
  const scene = createScene(renderer);
  createLights(scene);
  const camera = createCamera(host.clientWidth / Math.max(1, host.clientHeight));
  const controls = createControls(camera, renderer.domElement);
  const tweens = new TweenManager();

  ui.loaderProgress(0.55, "装配光刻机主体");
  const machine = buildMachine();
  scene.add(machine.root);

  ui.loaderProgress(0.75, "准备微观工艺台");
  const micro = buildMicroStage();
  scene.add(micro.root);

  ui.loaderProgress(0.9, "组装 EUV 原理装置");
  const euv = buildEuv();
  scene.add(euv.root);

  const director = new Director({ camera, controls, tweens, machine, micro, euv, ui });
  const ctx = director.makeCtx();
  window.__litho = { director, machine, micro, euv }; // 验收钩子

  // 尺寸自适应
  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(host);

  // 用户拖动时关闭补间（打断相机飞行）
  controls.addEventListener("start", () => {
    ui.showDragHint();
    director.setPlaying(false);
  });

  // 部件点击（第一层信息：名称 + 一句话职责）
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    downPos = [e.clientX, e.clientY];
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downPos) return;
    const dx = e.clientX - downPos[0];
    const dy = e.clientY - downPos[1];
    downPos = null;
    if (Math.hypot(dx, dy) > 6) return; // 拖动不算点击
    const set = [];
    const collect = (pickables, root) => {
      if (!root.visible) return;
      for (const p of pickables) set.push(p);
    };
    collect(machine.pickables, machine.root);
    collect(euv.pickables, euv.root);
    const meshes = set.map((p) => p.mesh);
    pointer.x = (e.clientX - host.getBoundingClientRect().left) / host.clientWidth * 2 - 1;
    pointer.y = -((e.clientY - host.getBoundingClientRect().top) / host.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const data = set[meshes.indexOf(hits[0].object)];
      ui.showPartTip(e.clientX, e.clientY, data);
    } else {
      ui.closePartTip();
    }
  });

  // 键盘：←→ 切章，空格 暂停/继续，R 回位，Esc 关提示
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      director.next();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      director.prev();
      e.preventDefault();
    } else if (e.key === " ") {
      director.togglePlay();
      e.preventDefault();
    } else if (e.key === "r" || e.key === "R") {
      director.recenter();
    } else if (e.key === "Escape") {
      ui.closePartTip();
    }
  });

  // 浏览器返回/前进：跟随 hash 恢复章节
  function fromHash() {
    const m = location.hash.match(/^#\/c\/([\w-]+)/);
    if (!m) return false;
    const idx = CHAPTERS.findIndex((c) => c.id === m[1]);
    if (idx < 0) return false;
    if (idx !== director.index) {
      document.getElementById("cover").style.display = "none";
      director.goTo(idx, { fromHash: true });
    }
    return true;
  }
  window.addEventListener("popstate", fromHash);
  window.addEventListener("hashchange", fromHash);

  function freeMode() {
    ui.enterFreeMode();
    if (director.index < 0) director.goTo(0);
    // 自由观察 = 停在当前章的全景机位，允许随意转动
    director.recenter();
  }

  // 主循环
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    tweens.tick(dt);
    if (!REDUCED_MOTION) controls.update();
    director.tick(dt, time);
    renderer.render(scene, camera);
  }

  ui.loaderProgress(1, "开展");
  setTimeout(() => {
    ui.loaderDone();
    loop();
    // 初始相机停在整机全景（封面背后即可见完整机身）
    camera.position.set(...[8.2, 3.4, 9.6]);
    controls.target.set(0.2, 1.25, 0);
    controls.update();
    // 若 URL 带章节 hash，直接恢复
    if (!fromHash()) {
      // 预选第 0 章但保持封面（点“开始探索”后进入）
      director.index = 0;
      director.visited.add(CHAPTERS[0].id);
    }
  }, 350);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
