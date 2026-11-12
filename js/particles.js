/* Persistent morphing particle field. One canvas behind every slide; each slide sets a shape via data-field. */
(function () {
  "use strict";
  const W = 1920, H = 1080, N = 1700;
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const EXPORT = new URLSearchParams(location.search).has("export");
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COLORS = { mint: [81, 233, 184], teal: [18, 217, 200], sky: [19, 166, 218], white: [235, 245, 245], amber: [245, 189, 127], red: [246, 139, 148], violet: [157, 155, 255], grey: [120, 130, 135] };
  const BRAND = ["mint", "teal", "teal", "sky", "white"];

  let dpr = 1;
  function resize() {
    dpr = Math.min(2, (window.devicePixelRatio || 1) * (window.__deckScale || 1)) || 1;
    if (EXPORT) dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  }
  window.addEventListener("resize", () => setTimeout(resize, 30));

  // deterministic random so exports are repeatable
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  const P = [];
  for (let i = 0; i < N; i++) {
    const x = rnd() * W, y = rnd() * H;
    P.push({ x, y, vx: 0, vy: 0, tx: x, ty: y, hx: x, hy: y, s: 0.6 + rnd() * 1.6, ts: 1, c: COLORS[BRAND[i % BRAND.length]], tc: null, a: 0, ta: 0.4, ph: rnd() * Math.PI * 2, sp: 0.4 + rnd() * 0.8, t: rnd(), lane: gauss(), role: 0 });
  }

  /* ---------- logo sampling ---------- */
  const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 58" width="520" height="580"><g fill="#fff"><circle cx="26" cy="4" r="2.1"/><circle cx="19" cy="7" r="2"/><circle cx="13" cy="11" r="1.8"/><circle cx="9" cy="16" r="1.7"/><circle cx="22" cy="12" r="2.2"/><circle cx="16" cy="16" r="2"/><circle cx="10" cy="22" r="2"/><circle cx="5" cy="27" r="1.5"/><circle cx="25" cy="20" r="2.3"/><circle cx="18" cy="23" r="2.2"/><circle cx="12" cy="28" r="2.1"/><circle cx="6" cy="33" r="1.7"/><circle cx="26" cy="28" r="2.3"/><circle cx="19" cy="31" r="2.2"/><circle cx="13" cy="36" r="2.1"/><circle cx="8" cy="41" r="1.7"/><circle cx="25" cy="36" r="2.2"/><circle cx="19" cy="40" r="2"/><circle cx="13" cy="45" r="1.9"/><circle cx="20" cy="48" r="1.7"/><circle cx="25" cy="45" r="2"/><circle cx="26" cy="52" r="1.8"/><path d="M31 3c8 2 14 8 16 17 4 16-4 29-17 35V42c7-4 11-10 12-17-4 5-8 7-12 8v-8c6-2 10-8 10-15-3 4-6 7-10 8V4l1-1Z"/></g></svg>';
  let logoPts = null; // normalized [0..1] x, y within 52x58 box, with gradient color
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = 520; c.height = 580;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, 520, 580);
    const d = g.getImageData(0, 0, 520, 580).data;
    const pts = [];
    for (let y = 0; y < 580; y += 4) for (let x = 0; x < 520; x += 4) if (d[(y * 520 + x) * 4 + 3] > 140) pts.push([x / 520, y / 580]);
    // shuffle deterministically
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    logoPts = pts;
    if (current) set(current, true);
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO);

  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const brandAt = (t) => t < 0.5 ? mix(COLORS.mint, COLORS.teal, t * 2) : mix(COLORS.teal, COLORS.sky, (t - 0.5) * 2);

  /* ---------- shapes: assign targets ---------- */
  let current = null, mode = "static", modeCfg = {}, time = 0;

  function dust(p, alpha) { p.hx = rnd() * W; p.hy = rnd() * H; p.tx = p.hx; p.ty = p.hy; p.ta = alpha == null ? 0.16 : alpha; p.ts = 0.5 + rnd() * 0.9; p.tc = null; p.role = 0; }

  const shapes = {
    drift(cfg) { mode = "drift"; P.forEach((p) => dust(p, (cfg.alpha || 0.45) * (0.4 + rnd() * 0.8))); },
    mark(cfg) {
      mode = "static";
      const cx = cfg.cx ?? W / 2, cy = cfg.cy ?? H / 2, h = cfg.h ?? 620, w = h * 52 / 58;
      const pts = logoPts || [];
      const use = Math.min(pts.length, cfg.count || 1400);
      P.forEach((p, i) => {
        if (i < use) {
          const [nx, ny] = pts[i];
          p.hx = cx - w / 2 + nx * w + gauss() * 0.6; p.hy = cy - h / 2 + ny * h + gauss() * 0.6;
          p.tx = p.hx; p.ty = p.hy; p.ta = 0.95; p.ts = 1.3 + rnd() * 0.9; p.tc = brandAt(Math.min(1, (nx * 0.6 + ny * 0.6))); p.role = 1;
        } else dust(p, cfg.dust ?? 0.14);
      });
    },
    rain(cfg) {
      mode = "rain"; modeCfg = cfg;
      const cols = cfg.cols || [360, 780, 1140, 1560];
      const tints = ["mint", "teal", "sky", "violet"];
      P.forEach((p, i) => {
        const k = i % (cols.length + 2);
        if (k < cols.length) { p.lane = k; p.hx = cols[k] + gauss() * (cfg.spread || 60); p.ta = 0.35 + rnd() * 0.5; p.tc = COLORS[tints[k % 4]]; p.ts = 0.8 + rnd() * 1.4; p.role = 2; p.sp = 1.2 + rnd() * 3.2; }
        else { dust(p, 0.12); }
      });
    },
    flow(cfg) {
      mode = "flow"; modeCfg = cfg;
      P.forEach((p, i) => {
        if (i % 3 !== 2) { p.role = 3; p.t = rnd(); p.lane = gauss(); p.ta = 0.35 + rnd() * 0.55; p.tc = null; p.ts = 0.7 + rnd() * 1.3; p.sp = 0.6 + rnd() * 0.9; }
        else dust(p, 0.1);
      });
    },
    clusters(cfg) {
      mode = "static";
      const groups = cfg.groups || [];
      const total = groups.reduce((s, g) => s + g.n, 0);
      const per = (cfg.count || 1100) / total;
      let i = 0;
      groups.forEach((g, gi) => {
        const n = Math.round(g.n * per);
        for (let k = 0; k < n && i < N; k++, i++) {
          const p = P[i]; const r = Math.sqrt(rnd()) * (g.r || 90); const a = rnd() * Math.PI * 2;
          p.hx = g.x + Math.cos(a) * r; p.hy = g.y + Math.sin(a) * r * 0.85; p.tx = p.hx; p.ty = p.hy;
          p.tc = COLORS[g.c || "teal"]; p.ta = cfg.hi == null || cfg.hi === gi ? 0.9 : 0.22; p.ts = 0.9 + rnd() * 1.4; p.role = 10 + gi;
        }
      });
      for (; i < N; i++) dust(P[i], 0.1);
    },
    sort(cfg) {
      // first `n` particles are tender notices; phase 0 = inlet, phase 1 = split into a/b
      mode = "static";
      const n = cfg.n || 50; const phase = cfg.phase || 0;
      for (let i = 0; i < N; i++) {
        const p = P[i];
        if (i < n) {
          let gx, gy, col;
          if (phase === 0) { const c = i % 10, r = Math.floor(i / 10); gx = cfg.inlet.x + c * 26; gy = cfg.inlet.y + r * 26; col = COLORS.white; }
          else {
            const toA = i < cfg.a.n; const z = toA ? cfg.a : cfg.b; const k = toA ? i : i - cfg.a.n;
            const cols = z.cols || 8; gx = z.x + (k % cols) * 26; gy = z.y + Math.floor(k / cols) * 26; col = COLORS[z.c];
          }
          p.hx = gx; p.hy = gy; p.tx = gx; p.ty = gy; p.tc = col; p.ta = 1; p.ts = 4.2; p.role = 20;
        } else dust(p, 0.1);
      }
    },
    ring(cfg) {
      mode = "static";
      const cx = cfg.cx, cy = cfg.cy, r = cfg.r || 220, v = cfg.value ?? 1;
      const used = cfg.count || 900;
      P.forEach((p, i) => {
        if (i < used) {
          const t = i / used; const a = -Math.PI / 2 + t * Math.PI * 2; const rr = r + gauss() * (cfg.thick || 6);
          p.hx = cx + Math.cos(a) * rr; p.hy = cy + Math.sin(a) * rr; p.tx = p.hx; p.ty = p.hy;
          const on = t <= v; p.tc = on ? brandAt(t) : COLORS.grey; p.ta = on ? 0.95 : 0.18; p.ts = on ? 1.4 + rnd() : 0.9; p.role = 30;
        } else dust(p, 0.1);
      });
    },
    bars(cfg) {
      mode = "static";
      const bars = cfg.bars || []; const per = Math.floor((cfg.count || 1200) / Math.max(1, bars.length));
      let i = 0;
      bars.forEach((b) => {
        const hh = b.h * (b.v ?? 1);
        for (let k = 0; k < per && i < N; k++, i++) {
          const p = P[i];
          const inBar = rnd() < (b.v ?? 1);
          p.hx = b.x + rnd() * b.w; p.hy = inBar ? b.base - rnd() * hh : b.base - hh - rnd() * (b.h - hh);
          p.tx = p.hx; p.ty = p.hy; p.tc = inBar ? COLORS[b.c || "teal"] : COLORS.grey; p.ta = inBar ? 0.85 : 0.14; p.ts = 1 + rnd() * 1.2; p.role = 40;
        }
      });
      for (; i < N; i++) dust(P[i], 0.08);
    },
    net(cfg) {
      mode = "net"; modeCfg = cfg;
      const edges = cfg.edges || [];
      P.forEach((p, i) => {
        if (i % 2 === 0 && edges.length) { p.role = 5; p.lane = Math.floor(rnd() * edges.length); p.t = rnd(); p.sp = 0.5 + rnd() * 1.2; p.ta = 0.55 + rnd() * 0.4; p.ts = 0.8 + rnd() * 1.2; p.tc = null; p.off = gauss() * 3; }
        else dust(p, 0.09);
      });
    },
    orbit(cfg) {
      mode = "orbit"; modeCfg = cfg;
      P.forEach((p, i) => {
        if (i < (cfg.count || 1200)) { p.role = 6; p.t = rnd(); p.lane = (cfg.r0 || 160) + Math.pow(rnd(), 0.7) * (cfg.r1 || 520); p.sp = (0.15 + rnd() * 0.35) * (rnd() < 0.5 ? 1 : 1); p.ta = 0.25 + rnd() * 0.55; p.ts = 0.6 + rnd() * 1.4; p.tc = null; }
        else dust(p, 0.08);
      });
    },
    wave(cfg) {
      mode = "wave"; modeCfg = cfg;
      P.forEach((p, i) => { p.role = 7; p.t = i / N; p.lane = rnd(); p.ta = 0.2 + rnd() * 0.6; p.ts = 0.6 + rnd() * 1.4; p.tc = null; });
    },
  };

  function set(cfg, force) {
    if (!cfg || !cfg.shape) cfg = { shape: "drift" };
    const key = JSON.stringify(cfg);
    if (!force && current && JSON.stringify(current) === key) return;
    current = cfg;
    seed = 7 + (cfg.seed || 0);
    (shapes[cfg.shape] || shapes.drift)(cfg);
    dim = cfg.dim ?? 1;
    if (EXPORT) settle(260);
  }
  let dim = 1;

  /* ---------- pointer ---------- */
  const mouse = { x: -9999, y: -9999, on: false };
  const pulses = [];
  function toStage(e) {
    const r = stage.getBoundingClientRect(); const s = r.width / W;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }
  window.addEventListener("mousemove", (e) => { const p = toStage(e); mouse.x = p.x; mouse.y = p.y; mouse.on = true; });
  window.addEventListener("mouseleave", () => { mouse.on = false; mouse.x = mouse.y = -9999; });
  stage.addEventListener("pointerdown", (e) => { const p = toStage(e); pulse(p.x, p.y); });
  function pulse(x, y, strength) {
    if (REDUCED) return;
    pulses.push({ x, y, r: 0, life: 1 });
    const st = strength || 14;
    P.forEach((p) => { const dx = p.x - x, dy = p.y - y; const d = Math.hypot(dx, dy); if (d < 420 && d > 0.1) { const f = (1 - d / 420) * st; p.vx += dx / d * f; p.vy += dy / d * f; } });
  }

  /* ---------- simulation ---------- */
  function flowPoint(pts, t) {
    const n = pts.length - 1; const ft = Math.max(0, Math.min(0.9999, t)) * n; const i = Math.floor(ft); const f = ft - i;
    const a = pts[i], b = pts[i + 1];
    const s = f * f * (3 - 2 * f);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * s, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  function step(dt) {
    time += dt;
    const wob = REDUCED ? 0 : 1;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (mode === "drift" || p.role === 0) {
        p.tx = p.hx + Math.sin(time * 0.25 * p.sp + p.ph) * 40 * wob; p.ty = p.hy + Math.cos(time * 0.21 * p.sp + p.ph * 1.3) * 40 * wob;
      } else if (mode === "static") {
        p.tx = p.hx + Math.sin(time * 1.1 + p.ph) * 1.6 * wob; p.ty = p.hy + Math.cos(time * 0.9 + p.ph) * 1.6 * wob;
      } else if (mode === "rain" && p.role === 2) {
        p.hy += p.sp * dt * 60 * (REDUCED ? 0.2 : 1); if (p.hy > H + 20) { p.hy = -20 - rnd() * 200; }
        p.tx = p.hx + Math.sin(time + p.ph) * 6; p.ty = p.hy;
        if (p.y > H + 10 || p.hy < 0) { p.y = p.hy; p.x = p.tx; p.vx = 0; p.vy = 0; }
      } else if (mode === "flow" && p.role === 3) {
        p.t += 0.0009 * p.sp * dt * 60 * (REDUCED ? 0.2 : 1); if (p.t > 1) { p.t -= 1; const s = flowPoint(modeCfg.pts, 0); p.x = s[0]; p.y = s[1]; }
        const [fx, fy, ang] = flowPoint(modeCfg.pts, p.t); const sp = (modeCfg.spread || 26);
        p.tx = fx - Math.sin(ang) * p.lane * sp; p.ty = fy + Math.cos(ang) * p.lane * sp;
        const u = p.t; p.c = brandAt(u);
      } else if (mode === "net" && p.role === 5) {
        const e = modeCfg.edges[p.lane]; const a = modeCfg.nodes[e[0]], b = modeCfg.nodes[e[1]];
        p.t += 0.0035 * p.sp * dt * 60 * (REDUCED ? 0.2 : 1); if (p.t > 1) { p.t -= 1; p.x = a[0]; p.y = a[1]; }
        const hi = modeCfg.hi; const lit = hi == null || e[0] === hi || e[1] === hi;
        p.ta = lit ? 0.8 : 0.1;
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        p.tx = a[0] + (b[0] - a[0]) * p.t - Math.sin(ang) * p.off; p.ty = a[1] + (b[1] - a[1]) * p.t + Math.cos(ang) * p.off;
        p.c = brandAt(p.t);
      } else if (mode === "orbit" && p.role === 6) {
        p.t += 0.00025 * p.sp * dt * 60 * (REDUCED ? 0.1 : 1) * (300 / p.lane);
        const a = p.t * Math.PI * 2; p.tx = modeCfg.cx + Math.cos(a) * p.lane; p.ty = modeCfg.cy + Math.sin(a) * p.lane * (modeCfg.squash || 0.42);
        p.c = brandAt((Math.sin(a) + 1) / 2);
      } else if (mode === "wave" && p.role === 7) {
        const x = p.t * W; const amp = modeCfg.amp || 60; const base = modeCfg.y || 860;
        p.tx = x; p.ty = base + Math.sin(x / 210 + time * 0.6 * wob) * amp * Math.sin(time * 0.2 + x / 900) + (p.lane - 0.5) * (modeCfg.band || 90);
        p.c = brandAt(p.t);
      }
      if (EXPORT) { p.x = p.tx; p.y = p.ty; p.a = p.ta * dim; p.s = p.ts; if (p.tc) p.c = p.tc; continue; }
      // spring toward target
      const k = 0.035, damp = 0.84;
      let ax = (p.tx - p.x) * k, ay = (p.ty - p.y) * k;
      if (mouse.on && !REDUCED) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150 && d2 > 1) { const d = Math.sqrt(d2); const f = (1 - d / 150) * 2.2; ax += dx / d * f; ay += dy / d * f; }
      }
      p.vx = (p.vx + ax) * damp; p.vy = (p.vy + ay) * damp;
      p.x += p.vx; p.y += p.vy;
      p.a += ((p.ta * dim) - p.a) * 0.06;
      p.s += (p.ts - p.s) * 0.08;
      if (p.tc) p.c = mix(p.c, p.tc, 0.08);
    }
    for (let i = pulses.length - 1; i >= 0; i--) { const q = pulses[i]; q.r += 14 * dt * 60; q.life -= 0.022 * dt * 60; if (q.life <= 0) pulses.splice(i, 1); }
  }

  function draw() {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = EXPORT ? "#000" : "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < N; i++) {
      const p = P[i]; if (p.a < 0.02) continue;
      const c = p.c;
      if (p.s > 2.2) {
        ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${p.a * 0.12})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${p.a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    pulses.forEach((q) => {
      ctx.strokeStyle = `rgba(18,217,200,${q.life * 0.5})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
    });
  }

  function settle(n) { for (let i = 0; i < n; i++) step(1 / 60); }

  let last = performance.now(), running = true, acc = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) {
      // fixed 60 Hz substeps so convergence time does not depend on the frame rate
      acc += dt; let n = 0;
      while (acc >= 1 / 60 && n < 6) { step(1 / 60); acc -= 1 / 60; n++; }
      if (n === 6) acc = 0;
      draw();
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => { running = !document.hidden; last = performance.now(); });

  resize();
  requestAnimationFrame(loop);
  window.Field = { set, pulse, settle, get cfg() { return current; } };
})();
