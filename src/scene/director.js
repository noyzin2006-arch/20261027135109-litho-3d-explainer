// 导演系统：章节切换 / 相机编排 / 章节内演示动画 / 状态复位
// 章节运行时数据（camPos/camTarget 为绝对坐标：整机在原点、微观舞台 z=60、EUV z=-60）
import * as THREE from "three";
import { flyCamera, REDUCED_MOTION } from "./env.js";
import { machineScanPose, resetStagePose } from "./machine.js";
import { CHAPTERS } from "../logic/chapters-data.js";
import { layoutFields } from "../logic/fields.js";

export const FIELD_LAYOUT = layoutFields({ fieldW: 0.46, fieldH: 0.4 });

const M = { // 整机机位
  wide: { pos: [8.2, 3.4, 9.6], target: [0.2, 1.25, 0] },
  source: { pos: [0.6, 2.9, 1.6], target: [-1.45, 1.95, -0.85] },
  mask: { pos: [2.6, 2.0, 1.9], target: [0.32, 1.55, -0.45] },
  both: { pos: [3.6, 2.1, 2.8], target: [0.85, 1.15, -0.45] },
  column: { pos: [0.2, 1.35, 1.7], target: [0.9, 1.05, -0.45] },
  waferClose: { pos: [2.2, 1.6, 1.3], target: [1.42, 0.62, -0.45] },
  waferTop: { pos: [1.42, 2.6, 0.9], target: [1.42, 0.6, -0.45] },
  scanView: { pos: [3.4, 2.4, 2.6], target: [0.8, 1.05, -0.45] },
};
const U = { // 微观舞台机位（z=60）
  top: { pos: [-3.4, 3.2, 63.6], target: [0, 0.4, 60] },
  closer: { pos: [-2.6, 2.4, 62.6], target: [0, 0.45, 60] },
  low: { pos: [-2.2, 1.2, 62.2], target: [0, 0.45, 60] },
  overlay: { pos: [-3.0, 3.6, 62.9], target: [0.15, 0.55, 60] },
};
const E = { // EUV 机位（z=-60）
  wide: { pos: [-1.2, 2.8, -54.6], target: [0.8, 1.3, -60] },
  maskClose: { pos: [1.4, 1.9, -57.6], target: [0.2, 1.4, -60.3] },
};

/** 章节运行时表（与 chapters-data 一一对应，按 id 索引） */
export function buildChapterRuntime({ machine, micro, euv }) {
  const P = machine.parts;

  const rt = {
    prologue: {
      stage: "machine",
      cam: M.wide,
      actions: [
        {
          id: "tour",
          label: "认识它",
          primary: true,
          run(ctx) {
            ctx.fly(M.mask, 1.6, () => ctx.fly(M.waferClose, 1.6));
          },
        },
      ],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(true);
        P.labels.visible = true;
      },
    },
    coat: {
      stage: "micro",
      cam: U.top,
      scaleChip: true,
      actions: [
        {
          id: "spin",
          label: "旋涂光刻胶",
          primary: true,
          run(ctx) {
            ctx.demo((k) => {
              micro.parts.resistFull.visible = true;
              micro.parts.resistFull.material.opacity = 0.72 * k;
            }, 1.4);
          },
        },
      ],
      enter(ctx) {
        ctx.showMicro(true);
        micro.setCoated(true);
        micro.parts.resistFull.material.opacity = 0;
        micro.setEtched(0);
        micro.showOverlayLayer(false);
        micro.parts.ticks.visible = false;
      },
    },
    source: {
      stage: "machine",
      cam: M.source,
      actions: [
        {
          id: "ignite",
          label: "点亮光源",
          primary: true,
          run(ctx) {
            ctx.beam(true);
            ctx.pulseBeam(2.2);
          },
        },
      ],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(false);
        P.labels.visible = true;
      },
    },
    mask: {
      stage: "machine",
      cam: M.both,
      actions: [],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(true);
        P.labels.visible = true;
      },
    },
    projection: {
      stage: "machine",
      cam: M.column,
      actions: [
        {
          id: "seeMask",
          label: "看掩模",
          run(ctx) {
            ctx.fly(M.mask, 1.2);
          },
        },
        {
          id: "seeWafer",
          label: "看晶圆",
          run(ctx) {
            ctx.fly(M.waferClose, 1.2);
          },
        },
      ],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(true);
        P.labels.visible = false;
      },
    },
    expose: {
      stage: "machine",
      cam: M.waferTop,
      demoDefault: true,
      actions: [
        {
          id: "toggleDemo",
          label: "暂停曝光",
          toggle: true,
          labels: ["继续曝光", "暂停曝光"],
          run(ctx, on) {
            ctx.setPlaying(on);
          },
        },
      ],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(true);
        P.labels.visible = false;
        ctx.exposeSlit(true);
        ctx.setPlaying(!REDUCED_MOTION);
      },
      exit() {
        resetStagePose(P);
      },
    },
    scan: {
      stage: "machine",
      cam: M.scanView,
      demoDefault: true,
      fieldmap: true,
      actions: [
        {
          id: "toggleDemo",
          label: "暂停",
          toggle: true,
          labels: ["继续", "暂停"],
          run(ctx, on) {
            ctx.setPlaying(on);
          },
        },
      ],
      enter(ctx) {
        ctx.showMachine(true);
        ctx.beam(true);
        P.labels.visible = false;
        ctx.exposeSlit(true);
        ctx.setPlaying(!REDUCED_MOTION);
        ctx.scanState = { scan: -1, field: 0, phase: "scan" };
      },
      exit() {
        resetStagePose(P);
      },
    },
    develop: {
      stage: "micro",
      cam: U.closer,
      scaleChip: true,
      actions: [
        {
          id: "develop",
          label: "开始显影",
          primary: true,
          run(ctx) {
            micro.setExposed(true);
            ctx.demo((k) => micro.setDeveloped(k), 3.2);
          },
        },
        {
          id: "reset",
          label: "重置",
          run(ctx) {
            micro.setCoated(true);
            micro.setExposed(false);
            micro.setDeveloped(0);
          },
        },
      ],
      enter(ctx) {
        ctx.showMicro(true);
        micro.setCoated(true);
        micro.setExposed(true);
        micro.setDeveloped(0);
        micro.setEtched(0);
        micro.showOverlayLayer(false);
      },
    },
    etch: {
      stage: "micro",
      cam: U.low,
      actions: [
        {
          id: "etch",
          label: "开始刻蚀",
          primary: true,
          run(ctx, _on, btn) {
            micro.setDeveloped(1);
            ctx.demo((k) => micro.setEtched(k), 2.6, () => {
              btn && btn.emitAction("strip");
            });
          },
        },
        {
          id: "strip",
          label: "去胶",
          run(ctx) {
            micro.setStripped(true);
            micro.parts.resistHoled.visible = false;
          },
        },
      ],
      enter(ctx) {
        ctx.showMicro(true);
        micro.setCoated(true);
        micro.setExposed(true);
        micro.setDeveloped(1);
        micro.setEtched(0);
        micro.showOverlayLayer(false);
      },
    },
    overlay: {
      stage: "micro",
      cam: U.overlay,
      actions: [
        {
          id: "align",
          label: "对准",
          primary: true,
          run(ctx) {
            ctx.demo((k) => micro.setOverlayAligned(k), 2.2);
          },
        },
        {
          id: "again",
          label: "再次演示",
          run(ctx) {
            micro.setOverlayAligned(0);
            ctx.demo((k) => micro.setOverlayAligned(k), 2.2);
          },
        },
      ],
      enter(ctx) {
        ctx.showMicro(true);
        micro.setCoated(true);
        micro.setDeveloped(1);
        micro.setEtched(1);
        micro.setStripped(true);
        micro.showOverlayLayer(true);
        micro.setOverlayAligned(0);
      },
    },
    euv: {
      stage: "euv",
      cam: E.wide,
      demoDefault: true,
      actions: [
        {
          id: "toggleDemo",
          label: "暂停",
          toggle: true,
          labels: ["继续", "暂停"],
          run(ctx, on) {
            ctx.setPlaying(on);
            euv.setPlaying(on);
          },
        },
        {
          id: "seeMask",
          label: "看反射掩模",
          run(ctx) {
            ctx.fly(E.maskClose, 1.2);
          },
        },
      ],
      enter(ctx) {
        ctx.showEuv(true);
        ctx.setPlaying(!REDUCED_MOTION);
        euv.setPlaying(!REDUCED_MOTION);
      },
      exit() {
        euv.setPlaying(false);
      },
    },
    rayleigh: {
      stage: "micro",
      cam: U.top,
      rayleigh: true,
      actions: [],
      enter(ctx) {
        ctx.showMicro(true);
        micro.setCoated(true);
        micro.setDeveloped(0);
        micro.setEtched(0);
        micro.showOverlayLayer(false);
        micro.parts.ticks.visible = true;
      },
    },
    epilogue: {
      stage: "micro",
      cam: U.closer,
      actions: [
        {
          id: "restart",
          label: "重新从头看",
          primary: true,
          run(ctx) {
            ctx.goToId("prologue");
          },
        },
        {
          id: "free",
          label: "自由观察",
          run(ctx) {
            ctx.ui.enterFreeMode();
          },
        },
      ],
      async enter(ctx) {
        ctx.showMicro(true);
        // 展示多层结构：图形化薄膜 + 第 2 层
        micro.setCoated(false);
        micro.setDeveloped(1);
        micro.setEtched(1);
        micro.setStripped(true);
        micro.showOverlayLayer(true);
        micro.setOverlayAligned(1);
        // 温柔回退到整机
        await ctx.sleep(2.4);
        if (ctx.stillCurrent()) {
          ctx.showMachine(true);
          ctx.fly(M.wide, 2.6);
        }
      },
    },
  };

  // 与数据章节数对齐
  const out = [];
  for (const def of CHAPTERS) {
    out.push({ def, ...(rt[def.id] || {}) });
  }
  return out;
}

/* ============================================================ */

export class Director {
  constructor({ camera, controls, tweens, machine, micro, euv, ui }) {
    this.camera = camera;
    this.controls = controls;
    this.tweens = tweens;
    this.machine = machine;
    this.micro = micro;
    this.euv = euv;
    this.ui = ui;
    this.chapters = buildChapterRuntime({ machine, micro, euv });
    this.index = -1;
    this.playing = false;
    this.visited = new Set();
    this.scanState = { scan: -1, field: 0, phase: "scan" };
    this._sleepTimers = [];
  }

  stillCurrent() {
    return this._gen === this._enteredGen;
  }

  get current() {
    return this.index >= 0 ? this.chapters[this.index] : null;
  }

  /** 上下文对象：传给章节 enter/actions 使用 */
  makeCtx() {
    const self = this;
    return {
      fly: (cam, dur, done) => flyCamera(this.camera, this.controls, this.tweens, { pos: cam.pos, target: cam.target, duration: dur ?? 1.6 }, done),
      demo: (fn, dur = 2, done) => {
        this.tweens.add({ duration: dur, ease: "easeInOut", onUpdate: fn, onDone: done });
      },
      sleep: (s) => new Promise((res) => {
        const id = setTimeout(res, s * 1000);
        this._sleepTimers.push(id);
      }),
      stillCurrent: () => self.stillCurrent(),
      showMachine: (on) => this.showMachine(on),
      showMicro: (on) => this.showMicro(on),
      showEuv: (on) => this.showEuv(on),
      beam: (on) => this.beamVisible(on),
      pulseBeam: (s) => this.pulseBeam(s),
      exposeSlit: (on) => this.exposeSlit(on),
      setPlaying: (on) => this.setPlaying(on),
      goToId: (id) => this.goToId(id),
      ui: this.ui,
    };
  }

  goToId(id) {
    const idx = this.chapters.findIndex((c) => c.def.id === id);
    if (idx >= 0) this.goTo(idx);
  }

  goTo(index, { fromHash = false } = {}) {
    index = Math.max(0, Math.min(this.chapters.length - 1, index));
    if (index === this.index) return;
    // 清理旧章
    if (this.current && this.current.exit) this.current.exit(this.makeCtx());
    this.tweens.cancelAll();
    this._sleepTimers.forEach(clearTimeout);
    this._sleepTimers.length = 0;
    this.playing = false;
    this.index = index;
    this._gen = (this._gen || 0) + 1;
    this._enteredGen = this._gen;
    const ch = this.current;
    this.visited.add(ch.def.id);

    // 章节可见性基线
    this.showMachine(false);
    this.showMicro(false);
    this.showEuv(false);
    this.beamVisible(false);
    this.exposeSlit(false);
    this.euv.root.visible = false;
    this.micro.parts.labels.visible = true;

    // 相机
    const cam = ch.cam || M.wide;
    flyCamera(this.camera, this.controls, this.tweens, { pos: cam.pos, target: cam.target, duration: 1.8 });

    // UI
    this.ui.setChapter(ch.def, {
      progress: (index + 1) / this.chapters.length,
      actions: ch.actions || [],
      fieldmap: !!ch.fieldmap,
      rayleigh: !!ch.rayleigh,
      scaleChip: !!ch.scaleChip,
    });
    this.ui.markVisited([...this.visited]);

    // 章节入场
    const ctx = this.makeCtx();
    if (ch.enter) ch.enter(ctx);
    if (ch.demoDefault) this.setPlaying(!REDUCED_MOTION);

    // 浏览器历史
    if (!fromHash) {
      const h = `#/c/${ch.def.id}`;
      if (location.hash !== h) history.pushState({ chapter: ch.def.id }, "", h);
    }
  }

  next() {
    this.goTo(this.index + 1);
  }
  prev() {
    this.goTo(this.index - 1);
  }

  setPlaying(on) {
    this.playing = on;
    this.ui.setPlayState(on);
  }

  togglePlay() {
    this.setPlaying(!this.playing);
  }

  recenter() {
    const ch = this.current;
    if (ch) this.flyTo(ch.cam || M.wide);
  }

  flyTo(cam) {
    flyCamera(this.camera, this.controls, this.tweens, { pos: cam.pos, target: cam.target, duration: 1.4 });
  }

  /* ---------- 舞台与元素可见性 ---------- */
  showMachine(on) {
    this.machine.root.visible = on;
  }
  showMicro(on) {
    this.micro.root.visible = on;
  }
  showEuv(on) {
    this.euv.root.visible = on;
  }
  beamVisible(on) {
    this.machine.parts.beam.visible = on;
    this.machine.parts.arrows.forEach((a) => (a.visible = on));
  }
  pulseBeam(dur = 2) {
    const m = this.machine.parts.beam.material;
    this.tweens.add({
      duration: dur,
      ease: "easeInOut",
      onUpdate: (k) => {
        m.opacity = 0.35 + 0.5 * Math.abs(Math.sin(k * Math.PI * 3));
      },
    });
  }

  /** 狭缝光带（第 05/06 章） */
  exposeSlit(on) {
    if (!this._slit) {
      const g = new THREE.Group();
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.004, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xd9a419, transparent: true, opacity: 0.9 })
      );
      g.add(slit);
      this._slit = g;
      this.machine.parts.waferAssembly.grp.add(g);
    }
    this._slit.visible = on;
  }

  /** 每帧更新 */
  tick(dt, time) {
    // 章节 demo 动画
    const ch = this.current;
    if (ch && this.playing) {
      if (ch.def.id === "expose") {
        const s = (this.scanState.scan = (this.scanState.scan + dt * 0.25) % 2 - 1);
        if (this._slit) this._slit.position.z = s * 0.2;
        if (this._slit) this._slit.position.x = 0;
      } else if (ch.def.id === "scan") {
        const st = this.scanState;
        st.scan += dt * 0.3;
        if (st.scan >= 1) {
          st.scan = -1;
          st.field = (st.field + 1) % FIELD_LAYOUT.length;
        }
        machineScanPose(this.machine.parts, { scan: st.scan, step: 0 });
        if (this._slit) this._slit.position.z = st.scan * 0.18;
        this.ui.updateFieldmap(st.field, st.scan);
      } else if (ch.def.id === "euv") {
        this.euv.update(dt, time, true);
      }
    }
    if (ch && ch.def.id !== "euv") {
      this.euv.update(dt, time, false);
    }
  }
}
