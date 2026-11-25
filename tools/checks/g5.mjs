import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';
import { runParts, loadRenderer } from './parts.mjs';
import { report } from './inputs.mjs';

export const FRAME_TOOLS = ['tools/film.mjs', 'tools/loop.mjs', 'tools/render-local.mjs', 'tools/still.mjs'];
export const HARNESS = 'tools/lib/render.mjs';
export const PAGE_PICTURES = [
  ['a screenshot call', /\bscreenshot\s*\(|captureScreenshot|startScreencast/],
  ['a picture of the page as a PDF', /\.pdf\s*\(|printToPDF/],
  ['toDataURL', /\btoDataURL\b/],
  ['toBlob', /\btoBlob\b/],
  ['captureStream', /\bcaptureStream\b/]
];
const GRAB = /__carcass\.grab\s*\(/;
const IMPORT = /(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm' };

export function localImports(text) {
  return [...text.matchAll(IMPORT)].map((m) => m[1]);
}

export function sourcesOf(root, entries = FRAME_TOOLS) {
  const seen = new Map();
  const missing = [];
  const walk = (file) => {
    if (seen.has(file)) return;
    const full = path.join(root, file);
    if (!fs.existsSync(full)) return void missing.push(file);
    const text = fs.readFileSync(full, 'utf8');
    seen.set(file, text);
    for (const to of localImports(text)) walk(path.posix.normalize(path.posix.join(path.posix.dirname(file), to)));
  };
  for (const e of entries) walk(e);
  return { sources: [...seen].map(([file, text]) => ({ file, text })), missing };
}

export function sourceFaults({ sources, missing = [] }, entries = FRAME_TOOLS) {
  const faults = [];
  const info = [];
  const skipped = [];
  const have = new Set(sources.map((s) => s.file));
  for (const m of missing) {
    if (entries.includes(m)) skipped.push(`${m} is not there yet, so its source was not read`);
    else faults.push(`${m} is imported and is not there.`);
  }
  for (const s of sources) {
    const lines = s.text.split('\n');
    for (const [what, pattern] of PAGE_PICTURES) {
      const at = lines.findIndex((l) => pattern.test(l));
      if (at >= 0) faults.push(`${s.file} line ${at + 1} holds ${what}, and a frame may only come from the canvas through grab.`);
    }
  }
  const harness = sources.find((s) => s.file === HARNESS);
  for (const e of entries.filter((x) => have.has(x))) {
    const reach = reaches(sources, e, HARNESS);
    if (!reach) faults.push(`${e} does not reach ${HARNESS}, so its frames do not come through grab.`);
  }
  if (harness && !GRAB.test(harness.text)) faults.push(`${HARNESS} never calls window.__carcass.grab.`);
  if (!faults.length) info.push(`${entries.filter((x) => have.has(x)).join(', ')} and the ${sources.length} files they load hold no screenshot call, and their frames come from ${HARNESS} through grab.`);
  return { faults, info, skipped };
}

function reaches(sources, from, to) {
  const text = new Map(sources.map((s) => [s.file, s.text]));
  const seen = new Set();
  const walk = (file) => {
    if (file === to) return true;
    if (seen.has(file) || !text.has(file)) return false;
    seen.add(file);
    return localImports(text.get(file)).some((i) => walk(path.posix.normalize(path.posix.join(path.posix.dirname(file), i))));
  };
  return walk(from);
}

export function documentFaults(doc) {
  const faults = [];
  const info = [];
  if (!doc.carcass) faults.push('The capture page did not set up window.__carcass.');
  if (doc.canvases !== 1) faults.push(`The capture page holds ${doc.canvases} canvases and has to hold one.`);
  if (doc.boxed.length) faults.push(`The capture page holds ${doc.boxed.length} other ${doc.boxed.length === 1 ? 'element' : 'elements'} with a box: ${doc.boxed.slice(0, 6).join(', ')}.`);
  if (doc.text) faults.push(`The capture page holds text: "${doc.text.slice(0, 80)}".`);
  if (!faults.length) info.push('In capture mode the page holds one canvas, no other element with a box and no text.');
  return { faults, info, skipped: [] };
}

export function readInPage() {
  const others = [...document.body.querySelectorAll('*')].filter((e) => e.tagName !== 'CANVAS');
  const boxed = others
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map((e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}`);
  return { carcass: Boolean(window.__carcass), canvases: document.querySelectorAll('canvas').length, boxed, text: (document.body.innerText || '').trim() };
}

export async function readDocument(renderer) {
  renderer.ensureSite();
  const site = renderer.SITE;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = path.join(site, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(site) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return void res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: renderer.browserPath(), headless: true, args: renderer.FLAGS });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?mode=capture`);
    await page.waitForFunction(() => Boolean(window.__carcass), null, { timeout: 180000 });
    await page.evaluate(() => window.__carcass.ready);
    return await page.evaluate(readInPage);
  } finally {
    await browser.close().catch(() => {});
    await new Promise((r) => server.close(r));
  }
}

export async function runG5(ctx, read = readDocument) {
  const page = {
    name: 'The capture page',
    run: async () => {
      const { renderer, error } = await loadRenderer(ctx);
      if (error) return { ok: false, lines: [error] };
      return report(documentFaults(await read(renderer)));
    }
  };
  const source = {
    name: 'The source of the tools that make frames',
    run: async () => report(sourceFaults(sourcesOf(ctx.root)))
  };
  return runParts(ctx.phase, [page, source]);
}
