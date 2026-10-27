// 界面：章节轨 / 文案卡 / 动作条 / 封面 / 加载 / 错误降级 / 部件提示 / 吐司
import { CHAPTERS } from "../logic/chapters-data.js";
import { createFieldmap } from "./fieldmap.js";
import { createRayleighPanel } from "./rayleigh-panel.js";

const $ = (sel) => document.querySelector(sel);

const ICONS = {
  close:
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  recenter:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.4" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2.5"/></svg>',
  chevron:
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M4 5.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export class UI {
  constructor({ onChapter, onAction, onFreeMode, onRecenter }) {
    this.onChapter = onChapter;
    this.onAction = onAction;
    this.onFreeMode = onFreeMode;
    this.onRecenter = onRecenter;
    this.fieldmap = null;
    this.rayleigh = null;
    this.toastTimer = null;
    this.buildRail();
    this.wireStatic();
  }

  /* ---------- 章节轨 ---------- */
  buildRail() {
    const rail = $("#rail");
    rail.innerHTML = "";
    const heading = document.createElement("div");
    heading.className = "rail-heading";
    heading.textContent = "章节";
    rail.appendChild(heading);
    this.chapterBtns = CHAPTERS.map((c, i) => {
      const btn = document.createElement("button");
      btn.className = "chapter-btn";
      btn.type = "button";
      btn.dataset.id = c.id;
      btn.innerHTML = `<span class="no num">${c.no}</span><span class="name">${c.title}</span>`;
      btn.addEventListener("click", () => this.onChapter(i));
      rail.appendChild(btn);
      return btn;
    });
  }

  markVisited(ids) {
    this.chapterBtns.forEach((b, i) => {
      b.classList.toggle("visited", ids.includes(CHAPTERS[i].id) && this.currentId !== CHAPTERS[i].id);
    });
  }

  selectRail(id) {
    this.currentId = id;
    this.chapterBtns.forEach((b) => {
      const on = b.dataset.id === id;
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
      b.classList.toggle("visited", b.classList.contains("visited") && !on);
    });
    const cur = this.chapterBtns[CHAPTERS.findIndex((c) => c.id === id)];
    if (cur && window.innerWidth <= 768) {
      cur.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } else if (cur) {
      cur.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ---------- 静态接线 ---------- */
  wireStatic() {
    // 封面
    $("#cover-start").addEventListener("click", () => {
      this.hideCover();
      this.onChapter(0);
    });
    $("#cover-free").addEventListener("click", () => {
      this.hideCover();
      this.onFreeMode();
    });
    // 回到本章视角
    $("#recenter").addEventListener("click", () => this.onRecenter());
    // 移动端文案折叠
    $("#copy-toggle").addEventListener("click", () => {
      $("#copy-card").classList.toggle("collapsed");
      const collapsed = $("#copy-card").classList.contains("collapsed");
      $("#copy-toggle").setAttribute("aria-expanded", String(!collapsed));
    });
  }

  hideCover() {
    $("#cover").style.display = "none";
  }

  /* ---------- 章节内容 ---------- */
  setChapter(def, opts = {}) {
    this.selectRail(def.id);
    $("#progress-num").textContent = `${def.no} / ${CHAPTERS[CHAPTERS.length - 1].no}`;
    $("#progress-fill").style.width = `${Math.round((opts.progress || 0) * 100)}%`;

    // 文案卡
    $("#copy-no").textContent = `第 ${def.no} 章`;
    $("#copy-title").textContent = def.title;
    $("#copy-what").textContent = def.what;
    $("#copy-why").textContent = def.why;
    const termEl = $("#copy-term");
    if (def.term) {
      termEl.style.display = "";
      const [head, ...rest] = def.term.split("：");
      termEl.innerHTML = `<b>${head}</b>：${rest.join("：")}`;
    } else {
      termEl.style.display = "none";
    }
    const scaleEl = $("#copy-scale");
    if (def.scaleNote) {
      scaleEl.style.display = "";
      scaleEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 12L12 2M12 2H6.5M12 2v5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>${def.scaleNote}</span>`;
    } else {
      scaleEl.style.display = "none";
    }
    $("#copy-card").classList.remove("collapsed");
    $("#copy-card").classList.remove("hidden");
    $("#action-bar").classList.remove("hidden");

    // 动作条
    const bar = $("#action-bar");
    bar.innerHTML = "";
    this.actionButtons = {};
    for (const a of opts.actions || []) {
      const btn = document.createElement("button");
      btn.className = "btn" + (a.primary ? " primary" : "");
      btn.type = "button";
      btn.textContent = a.toggle ? a.labels[1] : a.label;
      btn.dataset.actionId = a.id;
      if (a.toggle) {
        btn.dataset.on = "false";
        btn.setAttribute("aria-pressed", "false");
      }
      btn.addEventListener("click", () => {
        if (a.toggle) {
          const on = btn.dataset.on !== "true";
          btn.dataset.on = String(on);
          btn.setAttribute("aria-pressed", String(on));
          btn.textContent = on ? a.labels[0] : a.labels[1];
          this.onAction(a, on, this.wrapBtn(btn));
        } else {
          this.onAction(a, true, this.wrapBtn(btn));
        }
      });
      bar.appendChild(btn);
      this.actionButtons[a.id] = btn;
    }
    // 辅图（场图 / 瑞利面板）——靠右放置，避开左下文案卡
    let hasAux = false;
    if (opts.fieldmap) {
      const holder = document.createElement("div");
      holder.className = "aux-right";
      bar.appendChild(holder);
      this.fieldmap = createFieldmap(holder);
      this.fieldmap.update(0);
      hasAux = true;
    } else {
      this.fieldmap = null;
    }
    if (opts.rayleigh) {
      const holder = document.createElement("div");
      holder.className = "aux-right";
      bar.appendChild(holder);
      this.rayleigh = createRayleighPanel(holder);
      hasAux = true;
    } else {
      this.rayleigh = null;
    }
    if (!hasAux) {
      const spacer = document.createElement("div");
      spacer.className = "spacer";
      bar.appendChild(spacer);
    }
  }

  wrapBtn(btn) {
    return {
      el: btn,
      emitAction: (id) => {
        const target = this.actionButtons[id];
        if (target) target.click();
      },
    };
  }

  setPlayState(on) {
    // 若当前章有 toggle 按钮，同步其文案
    const btn = document.querySelector('#action-bar [data-action-id="toggleDemo"]');
    if (btn) {
      btn.dataset.on = String(on);
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "暂停" : "继续";
    }
  }

  updateFieldmap(activeField, scan) {
    if (this.fieldmap) this.fieldmap.update(activeField);
  }

  /* ---------- 加载 / 错误 ---------- */
  loaderProgress(k, status) {
    $("#loader-fill").style.width = `${Math.round(k * 100)}%`;
    if (status) $("#loader-status").textContent = status;
  }
  loaderDone() {
    $("#loader").classList.add("done");
  }
  showFail(reason) {
    const panel = $("#fail-panel");
    panel.classList.add("show");
    $("#loader").classList.add("done");
    $("#fail-reason").textContent = reason;
    // 静态兜底：章节因果清单
    const list = $("#fail-fallback");
    list.innerHTML =
      "<strong>文字图解 · 光刻流程</strong><ol>" +
      CHAPTERS.map((c) => `<li><b>${c.title}</b> — ${c.what}</li>`).join("") +
      "</ol>";
  }

  /* ---------- 吐司 / 拖动提示 ---------- */
  toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove("show"), 9000);
  }

  showDragHint(msg) {
    const h = $("#drag-hint");
    h.textContent = msg || "拖动旋转 · 滚轮缩放";
    h.classList.add("show");
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => h.classList.remove("show"), 2600);
  }

  /* ---------- 部件提示 ---------- */
  showPartTip(x, y, data) {
    this.closePartTip();
    const tip = document.createElement("div");
    tip.className = "part-tip";
    tip.id = "part-tip";
    tip.setAttribute("role", "dialog");
    tip.setAttribute("aria-label", `${data.name}说明`);
    tip.innerHTML = `
      <button class="tip-close" aria-label="关闭提示">${ICONS.close}</button>
      <div class="part-name">${data.name}</div>
      <div class="part-role">${data.role}</div>
      ${data.more ? `<div class="part-more">${data.more}</div>` : ""}
      ${data.more ? `<button class="btn ghost" style="margin-top:8px;padding:6px 12px;min-height:36px" data-more>展开更多</button>` : ""}
    `;
    document.querySelector(".stage").appendChild(tip);
    const rect = document.querySelector(".stage").getBoundingClientRect();
    const tw = 280;
    tip.style.left = `${Math.min(Math.max(8, x - rect.left + 12), rect.width - tw - 8)}px`;
    tip.style.top = `${Math.min(Math.max(8, y - rect.top + 12), rect.height - 160)}px`;
    tip.querySelector(".tip-close").addEventListener("click", () => this.closePartTip());
    const moreBtn = tip.querySelector("[data-more]");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        tip.classList.add("expanded");
        moreBtn.style.display = "none";
      });
    }
    tip.querySelector(".tip-close").focus();
  }

  closePartTip() {
    const existing = document.getElementById("part-tip");
    if (existing) existing.remove();
  }

  /* ---------- 自由观察模式 ---------- */
  enterFreeMode() {
    this.hideCover();
    this.toast("自由观察模式：拖动旋转，滚轮缩放；点部件看名称");
    this.showDragHint();
  }

  /* ---------- HTML 骨架 ---------- */
  static skeleton() {
    return `
      <div id="app">
        <header class="topbar">
          <div class="brand">
            <span class="brand-title">把光，印成电路</span>
            <span class="brand-sub">深入一台光刻机，看电路图案如何一层层落在硅片上</span>
          </div>
          <div class="progress" aria-live="polite">
            <span id="progress-num" class="num">-- / --</span>
            <span class="progress-bar"><i id="progress-fill"></i></span>
          </div>
        </header>
        <nav class="rail" id="rail" aria-label="章节导航"></nav>
        <main class="stage" id="stage">
          <div id="canvas-host" style="position:absolute;inset:0"></div>
          <button class="btn ghost recenter-btn" id="recenter" title="回到本章视角">
            ${ICONS.recenter}<span>本章视角</span>
          </button>
          <div class="drag-hint" id="drag-hint" role="status"></div>
          <section class="copy-card hidden" id="copy-card" aria-live="polite">
            <div class="chap-no num" id="copy-no"></div>
            <h2 id="copy-title"></h2>
            <p class="what" id="copy-what"></p>
            <p class="why" id="copy-why"></p>
            <div class="term" id="copy-term"></div>
            <div class="scale-note" id="copy-scale"></div>
            <button class="btn ghost copy-toggle" id="copy-toggle" aria-expanded="true">
              展开 / 收起 ${ICONS.chevron}
            </button>
          </section>
          <div class="action-bar hidden" id="action-bar"></div>
          <div class="toast" id="toast" role="status"></div>
          <div class="cover" id="cover">
            <div class="cover-copy">
              <h1>把光，印成电路。</h1>
              <p class="cover-sub">深入一台光刻机，看电路图案如何一层层落在硅片上。</p>
              <div class="cover-actions">
                <button class="btn primary" id="cover-start">开始探索</button>
                <button class="btn" id="cover-free">自由观察</button>
              </div>
              <p class="cover-note">原理级示意｜比例局部放大｜光束颜色用于讲解</p>
            </div>
            <div class="cover-right"></div>
          </div>
        </main>
      </div>
      <div class="loader" id="loader">
        <div class="loader-box">
          <div class="loader-title">正在布展…</div>
          <div class="loader-bar"><i id="loader-fill"></i></div>
          <div class="loader-status" id="loader-status">初始化 3D 展厅</div>
        </div>
      </div>
      <div class="fail-panel" id="fail-panel" role="alert">
        <div class="fail-box">
          <h2>3D 场景未正常显示</h2>
          <p id="fail-reason"></p>
          <p>你可以重新打开本页再试，或先阅读下面的文字图解了解光刻流程。</p>
          <div class="fail-fallback" id="fail-fallback"></div>
        </div>
      </div>
    `;
  }
}
