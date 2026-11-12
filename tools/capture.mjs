// Read-only capture of the live OliveSoft workspace for the pitch deck.
// Usage: OLIVESOFT_PASSWORD=... node capture.mjs [--explore]
// Never clicks Accept / Generate / Add / Upload / Retry, and never opens /proposals (the studio).
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://olivesoft-lime.vercel.app";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/shots");
const PASSWORD = process.env.OLIVESOFT_PASSWORD;
if (!PASSWORD) { console.error("Set OLIVESOFT_PASSWORD"); process.exit(1); }

// Guard: refuse any click whose text looks like a write action.
const FORBIDDEN = /accept|generate|add to pipeline|add opportunity|upload|retry|refresh|delete|sync|import|open in canva|submit|scan/i;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: "no-preference" });
const page = await context.newPage();
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("/proposals") && !url.includes("/api/leads")) console.warn("WARN studio-like request:", url);
  if (req.method() !== "GET" && req.url().startsWith(BASE) && !/\/api\/(session|access|auth|unlock|health|connection)/.test(url)) console.log("non-GET:", req.method(), url);
});

async function shot(name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 1800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log("captured", name);
}
async function safeClick(locator, label) {
  const text = (await locator.innerText().catch(() => label || "")).trim();
  if (FORBIDDEN.test(text)) throw new Error(`Refusing write-like click: ${text}`);
  await locator.click();
}

// 1. Landing hero
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await shot("landing-hero", { wait: 3500 });

// 2. Workspace login
await page.goto(BASE + "/workspace", { waitUntil: "networkidle" });
await page.fill("#workspace-password", PASSWORD);
await page.getByRole("button", { name: /open workspace/i }).click();
await page.waitForSelector("nav, aside", { timeout: 30000 });
await page.waitForLoadState("networkidle").catch(() => {});
await shot("ws-overview", { wait: 4000 });

if (process.argv.includes("--explore")) {
  const buttons = await page.locator("button, a, [role=tab], [role=row], tr").evaluateAll((els) => els.map((e) => `${e.tagName}:${(e.innerText || e.getAttribute("aria-label") || "").trim().slice(0, 70).replace(/\n/g, " | ")}`));
  await writeFile(path.join(OUT, "_explore.txt"), buttons.join("\n"));
}

const navTo = async (label) => safeClick(page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first(), label);
const settle = async () => {
  await page.waitForFunction(() => !document.querySelector(".discovery-skeleton, [aria-busy=true], .skeleton"), null, { timeout: 45000 }).catch(() => console.warn("still loading"));
  await page.waitForLoadState("networkidle").catch(() => {});
};

for (const [label, name] of [["Opportunities", "ws-opportunities"], ["Knowledge base", "ws-knowledge"], ["Proposals", "ws-proposals"], ["Pipeline", "ws-pipeline"]]) {
  await navTo(label);
  await settle();
  await shot(name, { wait: 2500 });
}

// Austria lead (ASFINAG): open the row, then read-only tabs.
await safeClick(page.locator("tr", { hasText: "Austria" }).first(), "Austria lead row");
await settle();
await shot("lead-overview", { wait: 3000 });
for (const [tab, name] of [["Requirements", "lead-requirements"], ["Evidence", "lead-evidence"], ["Research", "lead-research"]]) {
  const t = page.getByRole("tab", { name: new RegExp(`^${tab}`, "i") }).first();
  const target = (await t.count()) ? t : page.getByRole("button", { name: new RegExp(`^${tab}`, "i") }).first();
  await safeClick(target, tab);
  await settle();
  await shot(name, { wait: 2500 });
}

await browser.close();
