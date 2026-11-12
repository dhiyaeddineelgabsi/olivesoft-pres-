/* Capture stacks for the technical pitch. Loaded before deck.js.
   Drop a screenshot named after its ID (N1, N4, A2, F1 ...) into assets/captures/ as .png, .jpg or .webp
   and it replaces the stand-in automatically. Optional slots without a file are hidden. */
(function () {
  "use strict";
  const EXPORT = new URLSearchParams(location.search).has("export");
  const EXT = ["png", "jpg", "jpeg", "webp"];
  const probe = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(src); i.onerror = () => ok(null); i.src = src; });

  async function resolve(fig) {
    const id = fig.dataset.cap;
    for (const e of EXT) { const s = await probe(`assets/captures/${id}.${e}`); if (s) return { src: s, real: true }; }
    if (fig.dataset.fallback) { const s = await probe(fig.dataset.fallback); if (s) return { src: s, real: false }; }
    return null;
  }

  function layout(stack) {
    const figs = stack._order;
    figs.forEach((f, pos) => {
      const hidden = pos > 3;
      f.style.zIndex = String(20 - pos);
      f.style.opacity = hidden ? "0" : "1";
      f.style.filter = `brightness(${1 - pos * 0.22})`;
      f.style.transform = `translate3d(${pos * -36}px, ${pos * -30}px, ${pos * -90}px) rotateY(${pos ? -9 : -4}deg) rotateZ(${pos * -1.6}deg)`;
      f.setAttribute("aria-hidden", pos ? "true" : "false");
    });
    const c = stack.querySelector(".count");
    if (c && figs[0]) c.innerHTML = `<span class="caption-5">${figs[0].dataset.label || ""}</span><span class="caption-5">· click for next (${figs.length})</span>`;
  }

  document.querySelectorAll(".capstack").forEach(async (stack) => {
    stack.setAttribute("data-interactive", "");
    const figs = Array.from(stack.querySelectorAll("figure.cap"));
    const results = await Promise.all(figs.map(resolve));
    const kept = [];
    figs.forEach((f, i) => {
      const r = results[i];
      if (!r) { f.remove(); console.info(`[deck] capture ${f.dataset.cap} not provided (${f.dataset.label || ""})`); return; }
      const img = f.querySelector("img"); img.src = r.src;
      if (f.dataset.cover !== undefined && !r.real) img.classList.add("cover");
      kept.push(f);
    });
    if (!kept.length && stack.hasAttribute("data-optional")) { stack.remove(); return; }
    if (!kept.length) {
      const ids = figs.map((f) => f.dataset.cap).join(", ");
      const slot = document.createElement("figure"); slot.className = "cap";
      slot.innerHTML = `<div class="media"><div class="slot"><b>${ids}</b><span class="body-4">Add the capture to assets/captures/</span></div></div>`;
      stack.appendChild(slot); kept.push(slot);
    }
    stack._order = kept;
    stack.classList.toggle("single", kept.length < 2);
    stack.addEventListener("click", () => { if (stack._order.length < 2) return; stack._order.push(stack._order.shift()); layout(stack); });
    layout(stack);
  });

  /* logos: assets/logos/<slug>.svg|png replaces the monogram if present */
  document.querySelectorAll("[data-logo]").forEach(async (el) => {
    for (const e of ["svg", "png", "webp"]) {
      const s = await probe(`assets/logos/${el.dataset.logo}.${e}`);
      if (s) { el.innerHTML = `<img src="${s}" alt="">`; return; }
    }
  });

  /* 03 solution: pulse the particle stream at each step */
  const sol = document.getElementById("p-solution");
  if (sol) sol.addEventListener("slide:step", (e) => {
    const n = sol.querySelectorAll(".pnode")[e.detail.step - 1];
    if (n && window.Field && !EXPORT) window.Field.pulse(Number(n.dataset.x), 600, 6);
  });
  /* 11 demo film: step 1 plays from the start; leaving the slide stops it. The poster stands in for exports and the overview. */
  const demo = document.getElementById("p-demo");
  if (demo) {
    const fig = demo.querySelector(".demo"), video = demo.querySelector(".demo-video");
    const stop = () => { video.pause(); fig.classList.remove("playing"); };
    video.addEventListener("play", () => fig.classList.add("playing"));
    video.addEventListener("ended", () => fig.classList.remove("playing"));
    if (EXPORT) video.removeAttribute("controls");
    demo.addEventListener("slide:step", (e) => {
      if (EXPORT) return;
      if (e.detail.step >= 1) { video.currentTime = 0; video.play().catch(() => {}); }
      else stop();
    });
    demo.addEventListener("slide:leave", stop);
  }
})();
