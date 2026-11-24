import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { ROOT, rel, readJson, writeJson, config, utc } from './paths.mjs';
import { state } from './hash.mjs';
import { addLook } from '../look.mjs';

export const SITE = rel('out', 'work', 'site');
export const STILLS = rel('out', 'work', 'stills');
export const LOCK = rel('out', 'work', 'render.lock');

export const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ktx2': 'image/ktx2',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
};

export function browserPath() {
  if (process.env.CARCASS_BROWSER) return process.env.CARCASS_BROWSER;
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith('chromium_headless_shell-')).sort() : [];
  for (const d of dirs.reverse()) {
    const file = path.join(base, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`No browser found under ${base}. Set CARCASS_BROWSER to a Chrome binary.`);
}

export function freeGb(dir = ROOT) {
  const s = fs.statfsSync(dir);
  return (Number(s.bavail) * Number(s.bsize)) / 1e9;
}

export function ensureDisk(cfg = config()) {
  const need = cfg.sandbox.minFreeDiskGb;
  if (freeGb() >= need) return;
  for (const dir of ['frames', 'bigfile', 'imgtest', 'gate', 'agents']) fs.rmSync(rel('out', 'work', dir), { recursive: true, force: true });
  const day = Date.now() - 24 * 3600 * 1000;
  if (fs.existsSync(STILLS)) {
    for (const f of fs.readdirSync(STILLS)) {
      const file = path.join(STILLS, f);
      if (fs.statSync(file).isFile() && fs.statSync(file).mtimeMs < day) fs.rmSync(file, { force: true });
    }
  }
  if (freeGb() < need) throw new Error(`Only ${freeGb().toFixed(1)} GB of disk is free and a render needs ${need} GB. Nothing was rendered.`);
}

export function ensureSite() {
  const now = state();
  const file = path.join(SITE, 'build.json');
  if (fs.existsSync(file) && JSON.stringify(readJson(file)) === JSON.stringify(now)) return now;
  const r = spawnSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: ROOT, env: { ...process.env, CARCASS_OUT_DIR: SITE }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`The site did not build:\n${(r.stdout + r.stderr).trim().split('\n').slice(-20).join('\n')}`);
  return now;
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function takeLock() {
  fs.mkdirSync(path.dirname(LOCK), { recursive: true });
  const limit = Date.now() + config().sandbox.stepTimeoutMinutes * 60000;
  for (;;) {
    const holder = fs.existsSync(LOCK) ? Number(fs.readFileSync(LOCK, 'utf8').trim().split(' ')[0]) : 0;
    if (!holder || holder === process.pid || !alive(holder)) break;
    if (Date.now() > limit) throw new Error(`Another render process, pid ${holder}, has held the render slot for too long.`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  fs.writeFileSync(LOCK, `${process.pid} ${utc()}\n`);
}

function dropLock() {
  if (!fs.existsSync(LOCK)) return;
  if (Number(fs.readFileSync(LOCK, 'utf8').trim().split(' ')[0]) === process.pid) fs.rmSync(LOCK, { force: true });
}

let shared = null;

async function startServer() {
  const waiting = new Map();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname.startsWith('/frame/')) {
      const token = url.pathname.slice(7);
      const parts = [];
      req.on('data', (d) => parts.push(d));
      req.on('end', () => {
        const done = waiting.get(token);
        waiting.delete(token);
        if (done) done(Buffer.concat(parts));
        res.writeHead(done ? 200 : 404).end();
      });
      return;
    }
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204).end();
      return;
    }
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.join(SITE, name);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, waiting, origin: `http://127.0.0.1:${server.address().port}` };
}

async function openPage(s, { portableOnly = false } = {}) {
  const page = await s.browser.newPage({ viewport: { width: 640, height: 360 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  if (portableOnly) {
    await page.addInitScript((list) => {
      const allowed = new Set(list);
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        const gl = original.call(this, type, ...rest);
        if (gl && String(type).startsWith('webgl') && !gl.leanOnly) {
          const get = gl.getExtension.bind(gl);
          const list = gl.getSupportedExtensions.bind(gl);
          gl.getExtension = (n) => (allowed.has(n) ? get(n) : null);
          gl.getSupportedExtensions = () => (list() || []).filter((n) => allowed.has(n));
          gl.leanOnly = true;
        }
        return gl;
      };
    }, readJson(rel('config', 'portable.json')).portable);
  }
  await page.goto(`${s.origin}/index.html?mode=capture`);
  try {
    await page.waitForFunction(() => Boolean(window.__carcass), null, { timeout: 180000 });
    await page.evaluate(() => window.__carcass.ready);
  } catch (e) {
    throw new Error(`The capture page did not start: ${problems.join(' | ') || e.message}`);
  }
  page.problems = problems;
  return page;
}

async function open() {
  if (shared) return shared;
  ensureDisk();
  const built = ensureSite();
  const s = await startServer();
  s.built = built;
  s.browser = await chromium.launch({ executablePath: browserPath(), headless: true, args: FLAGS });
  s.version = s.browser.version();
  s.page = await openPage(s);
  s.film = await s.page.evaluate(() => window.__carcass.film());
  s.count = 0;
  shared = s;
  return s;
}

export async function closeRenderer() {
  dropLock();
  if (!shared) return;
  const s = shared;
  shared = null;
  await s.browser.close().catch(() => {});
  await new Promise((r) => s.server.close(r));
}

export async function filmInfo() {
  return (await open()).film;
}

export async function pageInfo() {
  const s = await open();
  return s.page.evaluate(() => window.__carcass.info());
}

function resolveFrame(film, { frame, key, id, loop }) {
  if (key !== undefined && key !== null) {
    if (!(key in film.keyFrames)) throw new Error(`The film has no key frame for ${key} yet.`);
    return { frame: film.keyFrames[key], loop: null, key, what: `key-${key}` };
  }
  if (id !== undefined && id !== null) {
    const judged = film.judged ?? {};
    if (!(id in judged)) throw new Error(`The film has no judged frame named ${id} yet.`);
    return { frame: judged[id], loop: null, key: null, id, what: `id-${id}` };
  }
  if (loop !== undefined && loop !== null) {
    const n = Number(loop);
    if (!Number.isInteger(n) || n < 0 || n > film.loop.frameCount) throw new Error(`No such loop frame: ${loop}`);
    return { frame: null, loop: n, key: null, what: `loop-${n}` };
  }
  const n = Number(frame);
  if (!Number.isInteger(n) || n < 0 || n >= film.frameCount) throw new Error(`No such film frame: ${frame}. The film has ${film.frameCount} frames.`);
  return { frame: n, loop: null, key: null, what: `frame-${n}` };
}

function unitsShown(s, at) {
  const unit = at.loop !== null ? s.film.loop.unit : (s.film.shots.find((x) => at.frame >= x.first && at.frame <= x.last)?.unit ?? null);
  const shotUnit = at.loop !== null && !(s.film.shots ?? []).some((x) => x.unit === unit) ? null : unit;
  return shotUnit && s.built.units[shotUnit] ? { [shotUnit]: s.built.units[shotUnit] } : {};
}

async function draw(page, at, tier, format, diag) {
  const started = process.hrtime.bigint();
  await page.evaluate(
    async ({ at, tier, format, diag }) => {
      const c = window.__carcass;
      c.setFormat(format);
      c.setDiagnostic(diag);
      if (at.loop !== null) await c.renderLoopFrame(at.loop, tier);
      else await c.renderFilmFrame(at.frame, tier);
    },
    { at, tier, format, diag },
  );
  if (page.problems.length) throw new Error(`The page reported: ${page.problems.join(' | ')}`);
  return Number(process.hrtime.bigint() - started) / 1e9;
}

async function grab(s, page, file) {
  const token = `${process.pid}-${++s.count}`;
  const body = new Promise((resolve) => s.waiting.set(token, resolve));
  const size = await page.evaluate((url) => window.__carcass.grab(url), `${s.origin}/frame/${token}`);
  const raw = await body;
  if (raw.length !== size.width * size.height * 4) throw new Error(`The frame arrived with ${raw.length} bytes, not ${size.width * size.height * 4}.`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(raw, { raw: { width: size.width, height: size.height, channels: 4 } }).flip().removeAlpha().png({ compressionLevel: 3 }).toFile(file);
  return size;
}

export async function renderStill({
  frame,
  key,
  id,
  loop,
  tier = 'review',
  format = 'hd',
  diag = null,
  force = false,
  fresh = false,
  portableOnly = false,
  name = null,
  look = true,
  by = 'builder',
  caption = null,
} = {}) {
  const s = await open();
  const cfg = config();
  if (!cfg.tiers[tier]) throw new Error(`No such tier: ${tier}`);
  if (!Object.values(cfg.formats).some((f) => f.id === format)) throw new Error(`No such format: ${format}`);
  const at = resolveFrame(s.film, { frame, key, id, loop });
  const file = path.join(STILLS, `${name ?? `${at.what}-${format}-${tier}${diag ? `-${diag}` : ''}`}.png`);
  const want = { engine: s.built.engine, units: unitsShown(s, at), format, tier, diag: diag ?? null, browser: s.version, frame: at.frame, loop: at.loop, key: at.key };
  if (!force && !fresh && !portableOnly && fs.existsSync(file) && fs.existsSync(`${file}.json`)) {
    const record = readJson(`${file}.json`);
    const same = Object.keys(want).every((k) => JSON.stringify(record[k]) === JSON.stringify(want[k]));
    if (same) return { file, record, reused: true, seconds: 0 };
  }
  await takeLock();
  let seconds;
  try {
    let page = s.page;
    if (portableOnly) page = await openPage(s, { portableOnly: true });
    else if (fresh) {
      await s.page.close();
      s.page = page = await openPage(s);
    }
    seconds = await draw(page, at, tier, format, diag ?? null);
    await grab(s, page, file);
    if (portableOnly) await page.close();
  } finally {
    dropLock();
  }
  const record = { ...want, machine: os.hostname(), made: utc(), seconds: Math.round(seconds * 1000) / 1000, portableOnly, id: at.id ?? null };
  writeJson(`${file}.json`, record);
  if (look) {
    const where = at.loop !== null ? `Loop frame ${at.loop}` : at.key ? `The frame that answers ${at.key}, film frame ${at.frame}` : `Film frame ${at.frame}`;
    addLook(file, caption ?? `${where}, ${format}, ${tier} tier${diag ? `, ${diag} view` : ''}`, by);
  }
  return { file, record, reused: false, seconds };
}

export async function timeFrame({ frame, loop, tier = 'draft', format = 'hd' } = {}) {
  const s = await open();
  const at = resolveFrame(s.film, { frame, loop });
  await takeLock();
  try {
    const seconds = await draw(s.page, at, tier, format, null);
    return { seconds, samples: config().tiers[tier].samplesPerFrame };
  } finally {
    dropLock();
  }
}

export async function startCost() {
  ensureSite();
  const s = await open();
  await takeLock();
  try {
    const started = process.hrtime.bigint();
    const browser = await chromium.launch({ executablePath: browserPath(), headless: true, args: FLAGS });
    const page = await openPage({ ...s, browser });
    await draw(page, { frame: 0, loop: null }, 'draft', config().formats.preview.id, null);
    const seconds = Number(process.hrtime.bigint() - started) / 1e9;
    await browser.close();
    return { seconds };
  } finally {
    dropLock();
  }
}
