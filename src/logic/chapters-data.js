// 章节数据（纯数据，供 UI 与导演系统消费；校验可脱离 three 运行）

export const CHAPTERS = [
  {
    id: "prologue",
    no: "00",
    title: "这台机器究竟印什么？",
    what: "光刻机是一台投影印刷装置：把掩模上的电路图案，用光印到晶圆的感光胶层上。",
    why: "芯片的每一层图形，都从这里开始——不是刀头在刻硅，而是光在“照相”。",
    term: null,
    scaleNote: null,
  },
  {
    id: "coat",
    no: "01",
    title: "先铺一层会“感光”的胶",
    what: "晶圆表面先覆盖上待图形化的薄膜，再均匀旋涂一层极薄的光刻胶。",
    why: "光刻胶被光照后溶解行为会改变——电路图案将先被“写”进这层胶里。",
    term: "光刻胶（photoresist）：对光敏感的聚合物薄层，曝光后改变在显影液中的溶解性。",
    scaleNote: "胶层厚度已示意放大，非按比例",
  },
  {
    id: "source",
    no: "02",
    title: "看见光源",
    what: "光源发出特定波长的深紫外光（典型 ArF：193 nm），经照明系统整形为均匀光场。",
    why: "波长越短，能印出的细节越细——这是整台机器追逐短波长的原因。",
    term: "DUV（深紫外）：193/248 nm 波段的紫外光，人眼不可见；图中的金色光路是伪彩示意。",
    scaleNote: "光束颜色用于讲解，实际不可见",
  },
  {
    id: "mask",
    no: "03",
    title: "掩模：电路图案的“原稿”",
    what: "掩模版是一块石英玻璃：深色区域挡光，透光区域就是这一层的电路图案。",
    why: "它像缩小印刷所用的原稿——图案先在这里，再被光学系统缩小投到晶圆上。",
    term: "掩模（reticle/mask）：携带一层电路版图的“底片”；DUV 掩模为透射式。",
    scaleNote: null,
  },
  {
    id: "projection",
    no: "04",
    title: "缩小投影",
    what: "投影光学系统（数十片透镜）把掩模图案聚焦成缩小的像，典型缩小 4 倍投到胶层。",
    why: "掩模做得大而容易精确，晶圆上才能得到小 4 倍、更精细的图形。",
    term: "数值孔径（NA）：光学系统收集与汇聚光的能力，越大越能分辨更细的线条。",
    scaleNote: "光学结构为原理简化示意",
  },
  {
    id: "expose",
    no: "05",
    title: "曝光：光改变了胶，胶还在",
    what: "狭缝光场扫过曝光场，被照到的胶区溶解性提高——但此刻胶层仍完整覆盖晶圆。",
    why: "曝光只是改变胶的化学性质；图案要等显影才真正显现。",
    term: "正性光刻胶：曝光区显影后被移除（本片全篇用它；负胶行为相反）。",
    scaleNote: null,
  },
  {
    id: "scan",
    no: "06",
    title: "扫描与步进",
    what: "狭缝沿一个曝光场扫描：掩模台与晶圆台反向同步移动；一个场印完，晶圆台步进到下一格。",
    why: "一片晶圆有数百枚相同芯片图案——是“扫描+步进”一场一场铺出来的。",
    term: "步进（step）：换曝光场时的晶圆台移动；与场内的扫描是两个动作。",
    scaleNote: null,
  },
  {
    id: "develop",
    no: "07",
    title: "显影：图案显形",
    what: "晶圆离开曝光腔进入显影工序：曝光过的正胶被显影液溶解，留下胶层开口。",
    why: "此刻你才第一次“看见”图案——它以胶层开口的形式出现。",
    term: "显影（develop）：用显影液溶解可溶区域；发生在独立工艺腔，不在曝光光路里。",
    scaleNote: "胶层厚度已示意放大，非按比例",
  },
  {
    id: "etch",
    no: "08",
    title: "刻蚀与去胶",
    what: "以剩余胶为保护，刻蚀把图案转移到下方薄膜；随后去掉残胶，留下被图形化的材料层。",
    why: "光刻负责“印出保护图案”，真正把图案刻进材料的是刻蚀——这是两道工序。",
    term: "刻蚀（etch）：选择性去除暴露薄膜的工艺；光刻机本身不刻蚀材料。",
    scaleNote: null,
  },
  {
    id: "overlay",
    no: "09",
    title: "套刻：层与层的对准",
    what: "下一层图案曝光前，必须与上一层精确对准——套刻十字从错位调整到重合。",
    why: "芯片有几十上百层，每层都要贴着上一层印；对准精度以纳米计。",
    term: "套刻（overlay）：不同层图案之间的对准精度；与“印得细”（分辨率）是两回事。",
    scaleNote: "错位量已示意放大",
  },
  {
    id: "euv",
    no: "10",
    title: "EUV：光不再穿过玻璃和空气",
    what: "13.5 nm 的极紫外光会被空气与玻璃强烈吸收：光路必须抽成高真空，透镜全部换成多层膜反射镜，掩模也变成反射式。",
    why: "这不是“更强的紫光”，而是整套物理环境的更换——锡液滴被激光打成等离子体才能发出 EUV。",
    term: "EUV（极紫外）：13.5 nm；画面中的紫色光路是伪彩示意，EUV 对人眼不可见。",
    scaleNote: "EUV 装置为原理级示意",
  },
  {
    id: "rayleigh",
    no: "11",
    title: "为什么光越短，细节越细？",
    what: "同一组细线：缩短波长或增大数值孔径，可分辨的程度随之改变。",
    why: "瑞利判据 CD = k₁ × λ / NA 概括了这条主旋律——但工艺因素同样重要。",
    term: null,
    scaleNote: "概念演示，非精确成像仿真",
  },
  {
    id: "epilogue",
    no: "12",
    title: "把每一层连成一枚芯片",
    what: "同一枚 L 形图案经历了涂胶、曝光、显影、刻蚀与套刻，成为层层叠起结构的一部分。",
    why: "掩模定义图案；光学负责缩小；胶和刻蚀负责转移；台面与套刻负责重复且对齐。",
    term: null,
    scaleNote: "多层结构为工艺理念示意",
  },
];

/** 校验章节数据完整性；返回错误列表（空数组 = 通过） */
export function validateChapters(chapters = CHAPTERS) {
  const errs = [];
  const seen = new Set();
  chapters.forEach((c, i) => {
    if (!c.id || seen.has(c.id)) errs.push(`#${i} id 缺失或重复: ${c.id}`);
    seen.add(c.id);
    if (!/^\d{2}$/.test(c.no || "")) errs.push(`#${i} (${c.id}) no 非两位数字`);
    if (!c.title || c.title.length > 18) errs.push(`#${i} (${c.id}) 标题缺失或超过 18 字`);
    if (!c.what || c.what.length < 8) errs.push(`#${i} (${c.id}) what 缺失或过短`);
    if (!c.why || c.why.length < 8) errs.push(`#${i} (${c.id}) why 缺失或过短`);
    if (c.term !== null && c.term !== undefined && typeof c.term !== "string")
      errs.push(`#${i} (${c.id}) term 类型错误`);
    if (c.scaleNote !== null && c.scaleNote !== undefined && typeof c.scaleNote !== "string")
      errs.push(`#${i} (${c.id}) scaleNote 类型错误`);
  });
  return errs;
}
