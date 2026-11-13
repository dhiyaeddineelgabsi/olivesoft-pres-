/* OliveBranch deck engine. Classic script so index.html also works from file://. */
(function () {
  "use strict";
  const stage = document.getElementById("stage");
  const slides = Array.from(document.querySelectorAll("#stage > .slide"));
  const params = new URLSearchParams(location.search);
  const EXPORT = params.has("export");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (EXPORT) document.body.classList.add("export");
  if (reduced) document.body.classList.add("reduced");

  /* ---------- word splitting for .split headlines ---------- */
  function splitWords(el) {
    let n = 0;
    const walk = (node, cls) => {
      const out = [];
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.push(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi" + (cls ? " " + cls : "");
            wi.style.setProperty("--wi", String(n++)); wi.textContent = part;
            w.appendChild(wi); out.push(w);
          });
        } else if (child.nodeName === "BR") {
          out.push(document.createElement("br"));
        } else if (child.nodeType === 1) {
          out.push(...walk(child, [cls, child.className].filter(Boolean).join(" ")));
        }
      });
      return out;
    };
    const nodes = walk(el, "");
    el.textContent = "";
    nodes.forEach((x) => el.appendChild(x));
  }
  document.querySelectorAll(".split").forEach(splitWords);

  /* ---------- auto stagger index for [data-in] ---------- */
  slides.forEach((slide) => {
    slide.querySelectorAll("[data-in]").forEach((el, i) => { if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", String(i)); });
  });

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty("--scale", String(s));
    window.__deckScale = s;
  }
  window.addEventListener("resize", fit); fit();

  /* ---------- state ---------- */
  const maxStep = slides.map((s) => Array.from(s.querySelectorAll("[data-step]")).reduce((m, el) => Math.max(m, Number(el.dataset.step) || 0), Number(s.dataset.steps || 0)));
  let index = -1, step = 0;
  const progress = document.querySelector("#progress i");
  const counter = document.getElementById("counter");
  const dots = document.getElementById("stepdots");
  const notesBox = document.getElementById("notes");

  function fieldFor(slide, st) {
    let cfg = {};
    try { cfg = JSON.parse(slide.dataset.field || "{}"); } catch (e) { console.error("bad data-field", slide.id, e); }
    if (slide.dataset.fieldSteps) {
      let map = {};
      try { map = JSON.parse(slide.dataset.fieldSteps); } catch (e) { console.error("bad data-field-steps", slide.id, e); }
      Object.keys(map).map(Number).sort((a, b) => a - b).forEach((k) => { if (k <= st) cfg = Object.assign({}, cfg, map[k]); });
    }
    return cfg;
  }

  function applyStep(slide, st) {
    slide.querySelectorAll("[data-step]").forEach((el) => el.classList.toggle("shown", Number(el.dataset.step) <= st));
    slide.dataset.current = String(st);
    if (window.Field) window.Field.set(fieldFor(slide, st));
    slide.dispatchEvent(new CustomEvent("slide:step", { detail: { step: st } }));
    renderHud();
  }

  function renderHud() {
    const total = slides.length;
    progress.style.setProperty("--p", String((index + (maxStep[index] ? step / (maxStep[index] + 1) : 0) + 1) / total));
    counter.innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b> / ${String(total).padStart(2, "0")}`;
    dots.innerHTML = "";
    for (let i = 0; i < maxStep[index]; i++) { const d = document.createElement("span"); if (i < step) d.className = "on"; dots.appendChild(d); }
    const n = slides[index].querySelector("aside.notes");
    notesBox.innerHTML = `<h4>${String(index + 1).padStart(2, "0")} · ${slides[index].dataset.title || ""}</h4><p>${n ? n.innerHTML : "No notes."}</p>`;
  }

  function go(to, toStep, opts) {
    opts = opts || {};
    to = Math.max(0, Math.min(slides.length - 1, to));
    const prev = slides[index];
    const next = slides[to];
    if (to === index) { step = toStep; applyStep(next, step); return; }
    if (prev) {
      prev.classList.remove("entered", "active");
      prev.classList.add("leaving");
      prev.dispatchEvent(new CustomEvent("slide:leave"));
      const p = prev;
      setTimeout(() => p.classList.remove("leaving"), EXPORT ? 0 : 520);
    }
    index = to; step = toStep || 0;
    next.classList.remove("leaving");
    next.classList.add("active");
    applyStep(next, step);
    // two frames so the browser commits the hidden state before the entrance transition runs
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add("entered")));
    next.dispatchEvent(new CustomEvent("slide:enter", { detail: { step } }));
    if (!opts.noHash) history.replaceState(null, "", `${location.pathname}${location.search}#/${index + 1}${step ? "/" + step : ""}`);
  }

  function nextStep() {
    document.body.classList.add("started");
    if (step < maxStep[index]) { step++; applyStep(slides[index], step); history.replaceState(null, "", `${location.pathname}${location.search}#/${index + 1}/${step}`); }
    else if (index < slides.length - 1) go(index + 1, 0);
  }
  function prevStep() {
    if (step > 0) { step--; applyStep(slides[index], step); history.replaceState(null, "", `${location.pathname}${location.search}#/${index + 1}${step ? "/" + step : ""}`); }
    else if (index > 0) go(index - 1, maxStep[index - 1]);
  }

  function fromHash() {
    const m = location.hash.match(/^#\/(\d+)(?:\/(\d+))?/);
    const i = m ? Number(m[1]) - 1 : 0;
    let st = m && m[2] ? Number(m[2]) : 0;
    if (EXPORT && params.get("step") === "final") st = maxStep[Math.max(0, Math.min(slides.length - 1, i))];
    go(i, Math.min(st, maxStep[Math.max(0, Math.min(slides.length - 1, i))] || 0), { noHash: true });
  }
  window.addEventListener("hashchange", fromHash);

  /* ---------- input ---------- */
  const isInteractive = (t) => t.closest("button, a, input, select, textarea, label, [data-interactive], #overview, #notes");
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if ((e.key === "Enter" || e.key === " ") && e.target.closest("button, a")) return;
    if (overviewOpen() && e.key !== "o" && e.key !== "O" && e.key !== "Escape") return;
    switch (e.key) {
      case "ArrowRight": case "PageDown": case " ": case "Enter": e.preventDefault(); nextStep(); break;
      case "ArrowLeft": case "PageUp": case "Backspace": e.preventDefault(); prevStep(); break;
      case "ArrowDown": e.preventDefault(); go(index + 1, 0); break;
      case "ArrowUp": e.preventDefault(); go(index - 1, 0); break;
      case "Home": go(0, 0); break;
      case "End": go(slides.length - 1, 0); break;
      case "f": case "F": toggleFullscreen(); break;
      case "n": case "N": notesBox.classList.toggle("open"); break;
      case "o": case "O": case "Escape": toggleOverview(e.key === "Escape" ? false : undefined); break;
    }
  });
  stage.addEventListener("click", (e) => {
    if (isInteractive(e.target)) return;
    nextStep();
  });
  document.querySelector(".navbtn.prev").addEventListener("click", prevStep);
  document.querySelector(".navbtn.next").addEventListener("click", nextStep);
  let touchX = null;
  window.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 60) (dx < 0 ? nextStep : prevStep)();
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  /* ---------- idle HUD ---------- */
  let idleTimer;
  const wake = () => { document.body.classList.remove("idle"); clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add("idle"), 2600); };
  window.addEventListener("mousemove", wake); wake();

  /* ---------- overview ---------- */
  const overview = document.getElementById("overview");
  const overviewOpen = () => overview.classList.contains("open");
  let built = false;
  function buildOverview() {
    const grid = overview.querySelector(".grid");
    slides.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "thumb"; b.style.setProperty("--i", String(i));
      b.setAttribute("aria-label", `Go to slide ${i + 1}: ${s.dataset.title || ""}`);
      const mini = document.createElement("div"); mini.className = "mini";
      const clone = s.cloneNode(true);
      clone.classList.add("active", "entered");
      clone.setAttribute("aria-hidden", "true"); clone.setAttribute("inert", "");
      clone.querySelectorAll("[data-step]").forEach((x) => x.classList.add("shown"));
      clone.querySelectorAll("canvas").forEach((x) => x.remove());
      mini.appendChild(clone);
      const label = document.createElement("span"); label.className = "label";
      label.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${s.dataset.title || ""}</span>`;
      b.append(mini, label);
      b.addEventListener("click", () => { toggleOverview(false); go(i, 0); });
      grid.appendChild(b);
    });
    const ro = new ResizeObserver(() => grid.querySelectorAll(".thumb").forEach((t) => { t.querySelector(".mini").style.transform = `scale(${t.clientWidth / 1920})`; }));
    ro.observe(grid);
    built = true;
  }
  function toggleOverview(force) {
    const open = force === undefined ? !overviewOpen() : force;
    if (open && !built) buildOverview();
    overview.classList.toggle("open", open);
    overview.querySelectorAll(".thumb").forEach((t, i) => t.classList.toggle("current", i === index));
    if (open) { const cur = overview.querySelectorAll(".thumb")[index]; if (cur) cur.focus({ preventScroll: false }); }
  }

  window.Deck = { go, next: nextStep, prev: prevStep, get index() { return index; }, get step() { return step; }, slides, maxStep };

  // Start once fonts are ready so headline masks measure correctly.
  const start = () => { fromHash(); document.body.classList.add("ready"); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
