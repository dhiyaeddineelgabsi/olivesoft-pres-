// Render an exported n8n workflow (credential-free JSON) to an SVG in the n8n canvas style.
// Used as the stand-in for the n8n screenshots until real captures are dropped into assets/captures/.
// Usage: node render-workflow.mjs <workflow.json> <out.svg>
import { readFile, writeFile } from "node:fs/promises";

const [, , inFile, outFile, wrapArg] = process.argv;
const wf = JSON.parse(await readFile(inFile, "utf8"));
const nodes = wf.nodes.filter((n) => !/stickyNote/i.test(n.type)).map((n) => ({ ...n, position: [...n.position] }));
// Optional wrap: fold very long single-line workflows into rows (render-workflow.mjs in out 3200)
const WRAP = Number(wrapArg || 0);
if (WRAP) {
  const x0 = Math.min(...nodes.map((n) => n.position[0])), y0 = Math.min(...nodes.map((n) => n.position[1]));
  const span = Math.max(...nodes.map((n) => n.position[1])) - y0 + 420;
  nodes.forEach((n) => { const row = Math.floor((n.position[0] - x0) / WRAP); n.position[0] -= row * WRAP; n.position[1] += row * span; });
}
const byName = new Map(nodes.map((n) => [n.name, n]));
const S = 100; // n8n node size

const kind = (t) => t.split(".").pop();
const GLYPH = {
  code: "{ }", postgres: "SQL", httpRequest: "HTTP", if: "IF", switch: "⇋", merge: "⋈", set: "SET", html: "</>",
  scheduleTrigger: "◷", webhook: "⚡", executeWorkflowTrigger: "▶", manualTrigger: "▶", executeWorkflow: "↳",
  agent: "AI", lmChatOpenAi: "LLM", respondToWebhook: "↩", wait: "⏸", extractFromFile: "TXT", compression: "ZIP",
};
const isTrigger = (t) => /trigger|webhook/i.test(kind(t)) && kind(t) !== "respondToWebhook";
const isAI = (t) => /agent|lmChat|langchain/i.test(t);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const xs = nodes.map((n) => n.position[0]), ys = nodes.map((n) => n.position[1]);
const pad = 120;
const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
const W = Math.max(...xs) + S + pad - minX, H = Math.max(...ys) + S + pad + 40 - minY;

let edges = "";
for (const [from, outs] of Object.entries(wf.connections || {})) {
  const a = byName.get(from); if (!a) continue;
  for (const [type, lists] of Object.entries(outs)) {
    lists.forEach((list, outIdx) => (list || []).forEach((c) => {
      const b = byName.get(c.node); if (!b) return;
      if (type !== "main") {
        // AI sub-node: from top of the model to bottom of the agent
        const x1 = a.position[0] + S / 2, y1 = a.position[1], x2 = b.position[0] + S / 2, y2 = b.position[1] + S;
        edges += `<path d="M${x1},${y1} C${x1},${y1 - 60} ${x2},${y2 + 60} ${x2},${y2}" class="ai"/>`;
        return;
      }
      const n = lists.length; const off = n > 1 ? (outIdx - (n - 1) / 2) * 24 : 0;
      const x1 = a.position[0] + S, y1 = a.position[1] + S / 2 + off, x2 = b.position[0], y2 = b.position[1] + S / 2;
      const dx = Math.max(60, Math.abs(x2 - x1) / 2);
      edges += `<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2 - 6},${y2}" class="e" marker-end="url(#arr)"/>`;
    }));
  }
}

let body = "";
for (const n of nodes) {
  const [x, y] = n.position; const k = kind(n.type);
  const trig = isTrigger(n.type), ai = isAI(n.type);
  const r = trig ? `M${x + 40},${y} H${x + S - 10} Q${x + S},${y} ${x + S},${y + 10} V${y + S - 10} Q${x + S},${y + S} ${x + S - 10},${y + S} H${x + 40} A40 40 0 0 1 ${x},${y + S - 40} V${y + 40} A40 40 0 0 1 ${x + 40},${y} Z` : null;
  const shape = r ? `<path d="${r}" class="n trig"/>` : ai && k !== "agent" ? `<circle cx="${x + S / 2}" cy="${y + S / 2}" r="${S / 2}" class="n ai"/>` : `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="10" class="n${ai ? " ai" : ""}"/>`;
  body += `<g>${shape}<text x="${x + S / 2}" y="${y + S / 2 + 9}" class="g${ai ? " gai" : trig ? " gtrig" : ""}">${esc(GLYPH[k] || k.slice(0, 3).toUpperCase())}</text><text x="${x + S / 2}" y="${y + S + 26}" class="l">${esc(short(n.name))}</text></g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${W} ${H}" width="${Math.round(W)}" height="${Math.round(H)}">
<defs>
<pattern id="dots" x="${minX}" y="${minY}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#2a2a2a"/></pattern>
<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6b6b6b"/></marker>
<style>
.e{fill:none;stroke:#6a6a6a;stroke-width:4}
.ai{fill:none;stroke:#9d9bff;stroke-width:4;stroke-dasharray:9 7}
.n{fill:#1d1d1d;stroke:#4a4a4a;stroke-width:3.5}
.n.trig{stroke:#12d9c8}
.n.ai{stroke:#9d9bff}
.g{font:600 26px "Geist Mono",ui-monospace,monospace;fill:#c9c9c9;text-anchor:middle}
.g.gtrig{fill:#51e9b8}.g.gai{fill:#9d9bff}
.l{font:500 20px "Geist",ui-sans-serif,system-ui,sans-serif;fill:#9b9b9b;text-anchor:middle}
</style>
</defs>
<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="#0e0e0e"/>
<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="url(#dots)"/>
${edges}
${body}
</svg>`;
await writeFile(outFile, svg);
console.log(outFile, nodes.length, "nodes");
