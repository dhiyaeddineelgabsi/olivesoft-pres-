/* Slide interactions. Loaded before deck.js; listens to slide:enter / slide:step / slide:leave. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const EXPORT = new URLSearchParams(location.search).has("export");
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icon = (name) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${(window.ICONS || {})[name] || ""}</svg>`;

  /* ---------- icons ---------- */
  $$("i[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); });

  /* ---------- count-ups ---------- */
  function countUp(el) {
    const to = Number(el.dataset.count), dec = Number(el.dataset.dec || 0);
    if (EXPORT || REDUCED) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1400;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - t, 4);
      el.textContent = (to * e).toFixed(dec);
      if (t < 1) el._raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(el._raf); el._raf = requestAnimationFrame(tick);
  }
  function runCounts(slide) {
    $$("[data-count]", slide).forEach((el) => {
      const gate = el.closest("[data-step]");
      const visible = !gate || gate.classList.contains("shown");
      if (visible && !el._done) { el._done = true; countUp(el); }
      if (!visible) { el._done = false; el.textContent = "0"; }
    });
  }
  function resetCounts(slide) { $$("[data-count]", slide).forEach((el) => { el._done = false; }); }

  /* ---------- tilt on frames ---------- */
  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
      el.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
    });
    el.addEventListener("mouseleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  });

  const on = (id, ev, fn) => { const s = document.getElementById(id); if (s) s.addEventListener(ev, fn); };

  /* ---------- 01 title: noise first, then the mark assembles ---------- */
  let titleTimer;
  on("s-title", "slide:enter", () => {
    if (EXPORT) return;
    clearTimeout(titleTimer);
    window.Field.set({ shape: "drift", alpha: 0.6 });
    titleTimer = setTimeout(() => { if (window.Deck.index === 0) window.Field.set(JSON.parse($("#s-title").dataset.field)); }, 900);
  });

  /* ---------- 03 mission: expandable phases ---------- */
  $$("#s-mission [data-phase]").forEach((b, i) => {
    b.addEventListener("click", () => { const open = !b.classList.contains("open"); $$("#s-mission [data-phase]").forEach((x) => x.classList.remove("open")); b.classList.toggle("open", open); });
  });
  on("s-mission", "slide:enter", () => { $$("#s-mission [data-phase]").forEach((x, i) => x.classList.toggle("open", EXPORT && i === 0)); });

  /* ---------- 04 tagline: words light up in reading order ---------- */
  (function () {
    const h = $("#tagline-text"); if (!h) return;
    const keys = new Set(["answer.", "document"]);
    const html = h.innerHTML.split(/<br\s*\/?>/i).map((line) => line.trim().split(/\s+/).map((w) => `<span class="tw${keys.has(w) ? " key" : ""}">${w}</span>`).join(" ")).join("<br>");
    h.innerHTML = html;
    let timers = [];
    on("s-tagline", "slide:enter", () => {
      timers.forEach(clearTimeout); timers = [];
      const words = $$(".tw", h);
      words.forEach((w) => w.classList.remove("lit"));
      if (EXPORT || REDUCED) { words.forEach((w) => w.classList.add("lit")); return; }
      words.forEach((w, i) => timers.push(setTimeout(() => w.classList.add("lit"), 500 + i * 140)));
    });
  })();

  /* ---------- 05 journey ---------- */
  const journey = [
    { x: 260, y: 560, ic: "radar", ic2: "scan", t: "Detect", s: "Workflows 14 and 00 · daily 06:00", d: "Public notices from TED, BOAMP, Find a Tender and HAICOP, or a tender added by hand. Incomplete notices are held for review." },
    { x: 540, y: 600, ic2: "buildings", t: "Research", s: "Workflow 02 · Tavily agent", d: "Sector, revenue or budget range, past projects and partners of the buyer. Every fact carries its source." },
    { x: 820, y: 560, ic2: "books", t: "Match", s: "Workflows 04 and 05 · RAG", d: "Each requirement is judged supported, partial, unsupported or unknown against CVs, projects and stacks, with the quote." },
    { x: 1100, y: 600, ic2: "target", t: "Qualify", s: "Pipeline · fit above 70%", d: "Fit above 70% joins the pipeline on its own. A person reviews the evidence and accepts the opportunity." },
    { x: 1380, y: 560, ic2: "robot", t: "Write", s: "Workflow 19 · strategy and writing agents", d: "Cited proposal content built from the buyer research and the matched internal evidence." },
    { x: 1660, y: 600, ic2: "presentation-chart", t: "Deliver", s: "Workflow 22 · renderer", d: "An editable PowerPoint and a PDF on the OliveBranch template, ready to download or polish in Canva." },
  ];
  (function () {
    const wrap = $("#s-journey .nodes"); if (!wrap) return;
    journey.forEach((n, i) => {
      const b = document.createElement("button");
      b.className = "node"; b.dataset.step = String(i + 1); b.dataset.inStyle = "scale";
      b.style.left = `${n.x - 128}px`; b.style.top = `${n.y - 96}px`; b.style.transform = "translate(-50%, -36px)";
      b.innerHTML = `<span class="dot">${icon(n.ic2)}</span><span class="title-2">${n.t}</span><span class="k">0${i + 1}</span>`;
      b.addEventListener("click", () => select(i));
      wrap.appendChild(b);
    });
    const card = $("#s-journey .detail");
    let cur = -1;
    function select(i) {
      if (i === cur) return; cur = i;
      $$("#s-journey .node").forEach((x, k) => x.classList.toggle("sel", k === i));
      card.classList.add("changing");
      setTimeout(() => {
        $("#jr-num").textContent = `0${i + 1}`; $("#jr-title").textContent = journey[i].t; $("#jr-sub").textContent = journey[i].s; $("#jr-text").textContent = journey[i].d;
        card.classList.remove("changing");
      }, EXPORT ? 0 : 220);
      if (window.Field && !EXPORT) window.Field.pulse(journey[i].x, journey[i].y, 6);
    }
    on("s-journey", "slide:step", (e) => { const st = e.detail.step; cur = -1; select(Math.max(0, st - 1)); });
  })();

  /* ---------- 08 RAG: family highlight and queries ---------- */
  (function () {
    const slide = $("#s-rag"); if (!slide) return;
    const base = JSON.parse(slide.dataset.field);
    const setHi = (hi) => window.Field.set(Object.assign({}, base, hi == null ? {} : { hi }));
    $$("#s-rag .fam").forEach((b) => b.addEventListener("click", () => {
      const sel = !b.classList.contains("sel");
      $$("#s-rag .fam").forEach((x) => x.classList.remove("sel"));
      b.classList.toggle("sel", sel); setHi(sel ? Number(b.dataset.fam) : null);
    }));
    $$("#s-rag .q").forEach((b) => b.addEventListener("click", () => {
      $$("#s-rag .q").forEach((x) => x.classList.toggle("sel", x === b));
      const hi = Number(b.dataset.hi);
      $$("#s-rag .fam").forEach((x) => x.classList.toggle("sel", Number(x.dataset.fam) === hi));
      setHi(hi);
      const t = $("#rag-res-text"); t.style.opacity = "0";
      setTimeout(() => { t.textContent = b.dataset.res; t.style.opacity = "1"; t.style.color = "var(--text)"; }, 200);
      const g = base.groups[hi]; window.Field.pulse(g.x, g.y, 8);
    }));
    $("#rag-res-text").style.transition = "opacity 0.3s var(--ease)";
    on("s-rag", "slide:enter", () => {
      $$("#s-rag .fam, #s-rag .q").forEach((x) => x.classList.remove("sel"));
      if (EXPORT) { const q = $$("#s-rag .q")[0]; q.classList.add("sel"); $("#rag-res-text").textContent = q.dataset.res; $("#rag-res-text").style.color = "var(--text)"; $$("#s-rag .fam")[1].classList.add("sel"); window.Field.set(Object.assign({}, base, { hi: 1 })); }
    });
  })();

  /* ---------- 09 fit simulator ---------- */
  (function () {
    const list = $("#fit-reqs"); if (!list) return;
    const states = [
      { k: "ok", label: "Supported", v: 1 },
      { k: "part", label: "Partial", v: 0.5 },
      { k: "no", label: "Unsupported", v: 0 },
      { k: "unk", label: "Unknown", v: 0 },
    ];
    const reqs = [
      { t: "Data platform on Azure", m: true, s: 0 },
      { t: "Airflow orchestration of pipelines", m: true, s: 0 },
      { t: "Power BI dashboards for finance", m: false, s: 1 },
      { t: "French speaking project lead", m: false, s: 0 },
      { t: "ISO 27001 certified hosting", m: false, s: 3 },
      { t: "Kubernetes with a service mesh", m: false, s: 2 },
    ];
    function render() {
      list.innerHTML = "";
      reqs.forEach((r, i) => {
        const st = states[r.s];
        const row = document.createElement("div"); row.className = "req";
        row.innerHTML = `<span class="body-4">${r.t}</span><button class="m${r.m ? " on" : ""}" aria-pressed="${r.m}" title="Mandatory">M</button><button class="chip st ${st.k}"><span class="dot"></span>${st.label}</button>`;
        row.querySelector(".m").addEventListener("click", () => { r.m = !r.m; render(); });
        row.querySelector(".st").addEventListener("click", () => { r.s = (r.s + 1) % states.length; render(); });
        list.appendChild(row);
      });
      compute();
    }
    let shown = 0;
    function compute() {
      let num = 0, den = 0;
      reqs.forEach((r) => { const w = r.m ? 2 : 1; num += w * states[r.s].v; den += w; });
      const fit = den ? num / den : 0;
      const pct = Math.round(fit * 100);
      const val = $("#fit-val"), ver = $("#fit-verdict");
      const from = shown; shown = pct;
      if (EXPORT || REDUCED) val.textContent = `${pct}%`;
      else { const t0 = performance.now(); const tick = (now) => { const t = Math.min(1, (now - t0) / 600); const e = 1 - Math.pow(1 - t, 3); val.textContent = `${Math.round(from + (pct - from) * e)}%`; if (t < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
      const pass = fit > 0.7;
      ver.textContent = pass ? "Joins the pipeline" : "Stays in Opportunities";
      ver.style.color = pass ? "var(--mint)" : "var(--amber)";
      const missingMandatory = reqs.some((r) => r.m && states[r.s].v < 1);
      ver.title = missingMandatory ? "A mandatory requirement is not fully supported" : "";
      if (window.Deck && window.Deck.slides[window.Deck.index] && window.Deck.slides[window.Deck.index].id === "s-fit") window.Field.set({ shape: "ring", cx: 1440, cy: 590, r: 250, value: fit });
    }
    render();
    on("s-fit", "slide:enter", () => setTimeout(compute, 30));
  })();

  /* ---------- 10 proposal: fanned deck of generated pages ---------- */
  (function () {
    const fan = $("#deck-fan"); if (!fan) return;
    const pages = (fan.dataset.pages || "assets/shots/deck-1.png,assets/shots/deck-2.png,assets/shots/deck-3.png,assets/shots/deck-4.png").split(",");
    let order = pages.map((_, i) => i);
    const cards = pages.map((src, i) => {
      const c = document.createElement("button"); c.className = "deckcard";
      c.innerHTML = `<img src="${src}" alt="Generated proposal page ${i + 1}">`;
      c.addEventListener("click", () => { order.push(order.shift()); layout(); if (window.Field) { const r = c.getBoundingClientRect(); } });
      fan.appendChild(c); return c;
    });
    function layout() {
      order.forEach((ci, pos) => {
        const c = cards[ci]; const n = order.length;
        const rot = (pos - (n - 1) / 2) * -6; const tx = pos * -48; const ty = pos * -36; const z = -pos * 80;
        c.style.zIndex = String(10 - pos);
        c.style.transform = `translate(-50%, -50%) translate3d(${tx}px, ${ty}px, ${z}px) rotateY(-14deg) rotateZ(${rot}deg)`;
        c.style.filter = `brightness(${1 - pos * 0.18})`;
      });
    }
    layout();
  })();

  /* ---------- 11 architecture ---------- */
  (function () {
    const slide = $("#s-arch"); if (!slide) return;
    const cfg = JSON.parse(slide.dataset.field);
    const meta = {
      team: { ic: "users-three", n: "Bid team", s: "browser", k: "People", t: "The team decides", d: "Reviews evidence, accepts opportunities and downloads proposals with the shared team access." },
      dash: { ic: "presentation-chart", n: "Dashboard", s: "Next.js 16 on Vercel", k: "Dashboard", t: "Shows, never decides", d: "Displays saved results and sends explicit actions through server side proxies. Keys never reach the browser." },
      n8n: { ic: "tree-structure", n: "n8n", s: "29 workflows on Azure", k: "n8n on Azure", t: "29 workflows, one brain", d: "Collection, extraction, research, matching and generation. Durable jobs with leases, checkpoints and three retries.", core: true },
      src: { ic: "globe-hemisphere-west", n: "Procurement portals", s: "TED · BOAMP · FTS · HAICOP", k: "Sources", t: "Official notices", d: "Four public feeds scanned every morning, plus manual intake." },
      pg: { ic: "database", n: "Supabase Postgres", s: "state, jobs, idempotency", k: "Database", t: "SQL owns the state", d: "Atomic claims, state transitions, idempotency keys and every judgment, citation and artifact record." },
      sto: { ic: "lock-key", n: "Private storage", s: "originals and outputs", k: "Supabase Storage", t: "Private by default", d: "Knowledge originals and generated PPTX and PDF files, served only through validated downloads." },
      qd: { ic: "stack", n: "Qdrant", s: "vector search", k: "Qdrant", t: "Knowledge vectors", d: "66 points for 55 documents, filtered by family and source, deduplicated by document." },
      gem: { ic: "sparkle", n: "Gemini", s: "768-d embeddings", k: "Gemini", t: "Embeddings", d: "Documents and queries embedded in the same 768 dimension space, in English and French." },
      ds: { ic: "robot", n: "DeepSeek", s: "judge and writers", k: "DeepSeek", t: "Judgments and writing", d: "Extraction, requirement judgments with quotes, and the strategy and writing agents." },
      tav: { ic: "magnifying-glass", n: "Tavily", s: "search and extract", k: "Tavily", t: "Public research", d: "Search and page extraction tools for the buyer research agent." },
      ren: { ic: "file-ppt", n: "Renderer", s: "PPTX and PDF on Vercel", k: "Renderer", t: "Formats, never invents", d: "Turns validated content into native PowerPoint objects and a composed PDF. Rejects claims without verbatim evidence." },
      canva: { ic: "paint-brush-broad", n: "Canva", s: "optional editing", k: "Canva", t: "Optional polish", d: "Import a ready proposal, detect newer edits and sync the export back as a new revision." },
    };
    const svg = $("#arch-edges");
    cfg.edges.forEach(([a, b]) => {
      const A = cfg.nodes[a], B = cfg.nodes[b];
      const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l.setAttribute("x1", A[0]); l.setAttribute("y1", A[1]); l.setAttribute("x2", B[0]); l.setAttribute("y2", B[1]);
      l.dataset.a = a; l.dataset.b = b; svg.appendChild(l);
    });
    const wrap = $("#arch-nodes");
    Object.keys(meta).forEach((id, i) => {
      const m = meta[id], p = cfg.nodes[id];
      const b = document.createElement("button");
      b.className = "anode" + (m.core ? " core sel" : ""); b.dataset.node = id; b.dataset.in = "scale"; b.style.setProperty("--i", String(i + 2));
      b.style.left = `${p[0] - 128}px`; b.style.top = `${p[1] - 96}px`;
      b.innerHTML = `<span class="icon">${icon(m.ic)}</span><span><b class="title-3">${m.n}</b><small>${m.s}</small></span>`;
      b.addEventListener("click", () => select(id));
      wrap.appendChild(b);
    });
    const info = $("#arch-info");
    function select(id) {
      $$("#s-arch .anode").forEach((x) => x.classList.toggle("sel", x.dataset.node === id));
      $$("#arch-edges line").forEach((l) => l.classList.toggle("hi", l.dataset.a === id || l.dataset.b === id));
      info.classList.add("changing");
      setTimeout(() => { const m = meta[id]; $("#ai-k").textContent = m.k; $("#ai-t").textContent = m.t; $("#ai-d").textContent = m.d; info.classList.remove("changing"); }, EXPORT ? 0 : 220);
      window.Field.set(Object.assign({}, cfg, { hi: id === "n8n" ? null : id }));
      const p = cfg.nodes[id]; if (!EXPORT) window.Field.pulse(p[0], p[1], 7);
    }
    on("s-arch", "slide:enter", () => { $$("#s-arch .anode").forEach((x) => x.classList.toggle("sel", x.dataset.node === "n8n")); $$("#arch-edges line").forEach((l) => l.classList.add("hi")); });
  })();

  /* ---------- 12 benchmark ---------- */
  (function () {
    const box = $("#bench-metrics"); if (!box) return;
    // docs/rag-evaluation.md, ablation 2026-10-20 (A, B, C, D)
    const rows = [
      { n: "hit@1", v: [1, 1, 1, 0.743], f: 2 },
      { n: "MRR", v: [1, 1, 1, 0.871], f: 2 },
      { n: "recall@5", v: [0.831, 0.831, 0.855, 0.824], f: 2 },
      { n: "nDCG@5", v: [0.857, 0.857, 0.886, 0.776], f: 2 },
      { n: "Matching accuracy", v: [0.833, 0.875, 0.917, 0.875], pct: true, sec: true },
      { n: "Matching macro F1", v: [0.786, 0.854, 0.891, 0.854], f: 2 },
    ];
    box.innerHTML = rows.map((r) => `<div class="metric${r.sec ? " sec" : ""}"><span class="body-3">${r.n}</span><span class="track"><i></i></span><span class="v mono">0</span></div>`).join("");
    let cfg = 0;
    function show(c) {
      cfg = c;
      $$("#s-bench .tab").forEach((t) => { const s = Number(t.dataset.cfg) === c; t.classList.toggle("sel", s); t.setAttribute("aria-selected", String(s)); });
      $$(".metric", box).forEach((m, i) => {
        const r = rows[i], v = r.v[c];
        m.querySelector(".track i").style.transform = `scaleX(${v})`;
        const out = m.querySelector(".v");
        const text = r.pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(r.f);
        if (EXPORT || REDUCED) { out.textContent = text; return; }
        const from = parseFloat(out.textContent) / (r.pct ? 100 : 1) || 0; const t0 = performance.now();
        const tick = (now) => { const t = Math.min(1, (now - t0) / 700); const e = 1 - Math.pow(1 - t, 3); const x = from + (v - from) * e; out.textContent = r.pct ? `${(x * 100).toFixed(1)}%` : x.toFixed(r.f); if (t < 1) requestAnimationFrame(tick); else out.textContent = text; };
        requestAnimationFrame(tick);
      });
    }
    $$("#s-bench .tab").forEach((t) => t.addEventListener("click", () => show(Number(t.dataset.cfg))));
    on("s-bench", "slide:enter", () => { $$(".metric .track i", box).forEach((i) => { i.style.transform = "scaleX(0)"; }); $$(".metric .v", box).forEach((v) => { v.textContent = "0"; }); setTimeout(() => show(0), EXPORT ? 0 : 400); });

    // Confusion matrix, config A (docs/rag-evaluation.md, 2026-10-20)
    const labels = ["Supported", "Partial", "Unsupported", "Unknown"];
    const m = [[13, 1, 0, 0], [0, 4, 0, 0], [0, 2, 3, 1]];
    const tips = {
      "0,0": "13 of 14 supported requirements judged supported.",
      "0,1": "API governance judged partial instead of supported: cautious by one step.",
      "1,1": "All 4 partial requirements judged partial.",
      "2,1": "On premise LLM fine tuning and GPU cluster judged partial: adjacent GenAI experience. The main weakness.",
      "2,2": "3 of 6 unsupported requirements judged unsupported.",
      "2,3": "Kubernetes with a service mesh judged unknown instead of unsupported.",
      "2,0": "Zero. The judge never called an unsupported requirement supported.",
      "1,2": "Zero. Nothing partial was judged unsupported.",
      "0,2": "Zero. Nothing supported was judged unsupported.",
    };
    const t = $("#bench-matrix");
    t.innerHTML = `<tr><th></th>${labels.map((l) => `<th>${l}</th>`).join("")}</tr>` + m.map((row, i) => `<tr><th class="rowh">${labels[i]}<br><span style="color:var(--faint)">expected</span></th>${row.map((v, j) => `<td class="cell${v ? (i === j ? " diag" : " off") : ""}" data-k="${i},${j}">${v}</td>`).join("")}</tr>`).join("");
    const tip = $("#bench-tip"); const def = tip.textContent;
    $$("td.cell", t).forEach((c) => {
      c.addEventListener("mouseenter", () => { tip.textContent = tips[c.dataset.k] || `${c.textContent} requirement(s).`; tip.style.color = "var(--text)"; });
      c.addEventListener("mouseleave", () => { tip.textContent = def; tip.style.color = ""; });
    });
  })();

  /* ---------- global hooks ---------- */
  document.querySelectorAll("#stage > .slide").forEach((slide) => {
    slide.addEventListener("slide:enter", () => { resetCounts(slide); setTimeout(() => runCounts(slide), EXPORT ? 0 : 350); });
    slide.addEventListener("slide:step", () => runCounts(slide));
  });
})();
