// Export the deck: one PNG per slide (final build state) and a 1920x1080 PDF.
// Usage: node export-pdf.mjs   (serves ../ itself on a free port)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "export");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".mp4": "video/mp4" };

export function serve(root = ROOT) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const file = path.join(root, p === "/" ? "index.html" : p);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(body); }
      catch { res.writeHead(404).end(); }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(path.join(OUT, "slides"), { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: Number(process.env.DPR || 1.5) });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${base}?export&step=final#/1`);
  await page.waitForFunction(() => window.Deck && document.body.classList.contains("ready"));
  const total = await page.evaluate(() => window.Deck.slides.length);
  const pngs = [];
  for (let i = 1; i <= total; i++) {
    await page.evaluate((n) => { location.hash = `#/${n}`; }, i);
    await page.waitForTimeout(900);
    const file = path.join(OUT, "slides", `slide-${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    pngs.push(file);
    console.log("slide", i);
  }
  // Assemble the PDF from the PNGs so particles and canvas render exactly as on screen.
  const html = `<!doctype html><html><head><style>@page{size:1920px 1080px;margin:0}html,body{margin:0;background:#000}img{display:block;width:1920px;height:1080px;page-break-after:always}</style></head><body>${(await Promise.all(pngs.map(async (f) => `<img src="data:image/png;base64,${(await readFile(f)).toString("base64")}">`))).join("")}</body></html>`;
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: "load" });
  await pdfPage.pdf({ path: path.join(OUT, "OlivesoftBranch-CSTAM3.pdf"), width: "1920px", height: "1080px", printBackground: true });
  await browser.close(); server.close();
  if (errors.length) { console.error("Page errors:\n" + errors.join("\n")); process.exitCode = 1; }
  console.log("PDF written to", path.join(OUT, "OlivesoftBranch-CSTAM3.pdf"));
}
