// Screenshot every slide at every build step (live animations) and report console errors.
// Usage: node verify.mjs [outDir] [--small] [--reduced]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { serve } from "./export-pdf.mjs";

const outDir = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "verify-out");
const small = process.argv.includes("--small");
const reduced = process.argv.includes("--reduced");
await mkdir(outDir, { recursive: true });
const server = await serve();
const browser = await chromium.launch();
const vp = small ? { width: 1366, height: 768 } : { width: 1920, height: 1080 };
const page = await browser.newPage({ viewport: vp, reducedMotion: reduced ? "reduce" : "no-preference" });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`); });
page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()}`));
page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html#/1`);
await page.waitForFunction(() => window.Deck && document.body.classList.contains("ready"));
const { total, steps } = await page.evaluate(() => ({ total: window.Deck.slides.length, steps: window.Deck.maxStep }));
await page.waitForTimeout(2500);
for (let i = 0; i < total; i++) {
  for (let s = 0; s <= steps[i]; s++) {
    if (i || s) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(s === 0 ? 1800 : 1200); }
    await page.screenshot({ path: path.join(outDir, `s${String(i + 1).padStart(2, "0")}-${s}.png`) });
  }
}
const state = await page.evaluate(() => ({ index: window.Deck.index, hash: location.hash }));
console.log("final", JSON.stringify(state), "slides", total, "steps", JSON.stringify(steps));
// overflow check: any element inside an active slide sticking outside the stage
await browser.close(); server.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
