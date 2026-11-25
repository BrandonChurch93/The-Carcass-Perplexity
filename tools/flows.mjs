import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { FLAGS, browserPath } from './lib/render.mjs';

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const outDir = path.resolve('out/work/host');
fs.mkdirSync(outDir, { recursive: true });
const saved = path.join(outDir, 'url.txt');
const url = (arg('url') ?? (fs.existsSync(saved) ? fs.readFileSync(saved, 'utf8') : '')).trim();
if (!url) {
  console.error('flows: give --url URL, or save the address of index.html in out/work/host/url.txt');
  process.exit(2);
}
const base = url.replace(/index\.html(\?.*)?$/, '');
const waitMs = Number(arg('wait') ?? 6000);
const startMs = Number(arg('start') ?? 180000);
const results = [];
const note = (flow, ok, detail) => { results.push({ flow, ok, detail }); console.log(`${ok ? 'pass' : 'FAIL'}  ${flow}: ${detail}`); };
const lit = async (file) => {
  const s = await sharp(file).stats();
  return Math.max(...s.channels.slice(0, 3).map((c) => c.max));
};

const browser = await chromium.launch({ executablePath: browserPath(), headless: true, args: FLAGS });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const flow = { frames: 0, lit: 0, controlHidden: false, error: '' };
  window.__flow = flow;
  const probe = document.createElement('canvas');
  probe.width = 64;
  probe.height = 36;
  window.requestAnimationFrame = (cb) => raf((t) => {
    cb(t);
    try {
      const c = document.querySelector('canvas');
      if (!c || !c.width || getComputedStyle(c).display === 'none') return;
      const g = probe.getContext('2d', { willReadFrequently: true });
      g.drawImage(c, 0, 0, 64, 36);
      const d = g.getImageData(0, 0, 64, 36).data;
      let m = 0;
      for (let i = 0; i < d.length; i += 4) m = Math.max(m, d[i], d[i + 1], d[i + 2]);
      flow.frames += 1;
      flow.lit = Math.max(flow.lit, m);
      const b = document.querySelector('button');
      if (b && getComputedStyle(b).display === 'none') flow.controlHidden = true;
    } catch (e) {
      flow.error = String(e.message).slice(0, 120);
    }
  });
});
const page = await ctx.newPage();
const errors = [];
const failed = [];
const late = new Set();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ text: m.text().slice(0, 200), url: m.location()?.url ?? '' }); });
page.on('pageerror', (e) => errors.push(`page error: ${String(e.message).slice(0, 200)}`));
const brief = (u) => u.replace(base, '').split('?')[0].split('/').slice(-3).join('/');
page.on('requestfailed', (r) => {
  const why = r.failure()?.errorText ?? '';
  if (r.resourceType() === 'media' && why === 'net::ERR_ABORTED') return;
  failed.push(`${brief(r.url())} ${why}`);
});
page.on('response', (r) => {
  if (r.status() < 400) return;
  if (r.status() >= 500 && r.request().resourceType() === 'media') late.add(r.url());
  else failed.push(`${brief(r.url())} ${r.status()}`);
});

try {
  const res = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('button[aria-label="Play the film"]', { timeout: 30000 }).catch(() => {});
  const control = page.locator('button[aria-label="Play the film"]');
  const link = page.locator('a', { hasText: 'Review page' });
  note('1 start page', res.status() === 200 && (await page.title()) === 'The Carcass' && (await control.count()) === 1 && (await link.count()) === 1,
    `status ${res.status()}, title "${await page.title()}", play control ${await control.count()}, review link ${await link.count()}`);
  await page.screenshot({ path: path.join(outDir, 'start.png') });

  // Starting the film builds every place before the first frame. MEASURED on 2 cores with a software
  // renderer, 2026-11-25: 40 s for the click to return, so the click gets its own, longer limit.
  await control.click({ timeout: startMs });
  await page.waitForFunction(() => window.__flow.frames >= 2 || window.__flow.error, null, { timeout: waitMs * 10, polling: 500 }).catch(() => {});
  const played = await page.evaluate(() => ({ ...window.__flow, size: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })() }));
  note('2 play the film', played.controlHidden && Boolean(played.size) && played.size[0] >= 960 && played.frames >= 2 && played.lit > 60 && !played.error,
    `the control hides while it plays: ${played.controlHidden ? 'yes' : 'no'}, canvas ${played.size ? `${played.size[0]} x ${played.size[1]}` : 'none'}, ${played.frames} frames drawn, brightest value in the picture ${played.lit} of 255${played.error ? `, ${played.error}` : ''}`);

  const probe = await page.evaluate(async () => {
    const one = async (u) => { try { const r = await fetch(u); const b = (await r.arrayBuffer()).byteLength; return `${r.status}, ${b} bytes`; } catch (e) { return `failed, ${String(e.message).slice(0, 80)}`; } };
    return { text: await one('./build.json') };
  });

  await page.goto(`${base}review.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    for (const i of document.querySelectorAll('img')) {
      i.scrollIntoView();
      for (let n = 0; n < 40 && !i.complete; n++) await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => [...document.querySelectorAll('audio, video')].every((m) => m.readyState >= 1 || (m.error && Number(m.dataset.tries || 0) >= 3)), null, { timeout: 30000, polling: 500 }).catch(() => {});
  const rev = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '',
    sections: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
    imgs: [...document.querySelectorAll('img')].map((i) => [i.getAttribute('src'), i.naturalWidth]),
    media: [...document.querySelectorAll('audio, video')].map((m) => m.currentSrc || m.getAttribute('src') || m.querySelector('source')?.getAttribute('src') || ''),
    players: [...document.querySelectorAll('audio, video')].map((m) => ({ src: m.getAttribute('src') || '', ready: m.readyState, error: m.error ? m.error.code : 0, tries: Number(m.dataset.tries || 0) })),
    links: [...document.querySelectorAll('a')].map((a) => [a.textContent.trim(), a.getAttribute('href')]),
  }));
  await page.screenshot({ path: path.join(outDir, 'review.png'), fullPage: true });
  const dead = rev.imgs.filter((i) => !i[1]);
  note('3 review page', rev.h1 === 'The Carcass' && rev.sections.length >= 5 && dead.length === 0,
    `heading "${rev.h1}", ${rev.sections.length} sections, ${rev.imgs.length} pictures of which ${dead.length} did not load, ${rev.media.length} sound and film players`);

  const firstPicture = rev.imgs[0]?.[0];
  if (firstPicture) {
    probe.binary = await page.evaluate(async (u) => { try { const r = await fetch(u); const b = (await r.arrayBuffer()).byteLength; return `${r.status}, ${b} bytes`; } catch (e) { return `failed, ${String(e.message).slice(0, 80)}`; } }, firstPicture);
  }
  let mediaBad = 0;
  const mediaLines = [];
  for (const src of rev.media.filter(Boolean)) {
    const r = await page.evaluate(async (u) => { try { const x = await fetch(u, { headers: { Range: 'bytes=0-1023' } }); return x.status; } catch { return 0; } }, src);
    if (r !== 200 && r !== 206) mediaBad += 1;
    mediaLines.push(`${src.replace(base, '')} ${r}`);
  }
  const stuck = rev.players.filter((p) => p.error || p.ready < 1);
  const retried = rev.players.reduce((n, p) => n + p.tries, 0);
  note('4 sound and films on the review page', mediaBad === 0 && stuck.length === 0, rev.media.length ? `${rev.media.length} files, ${mediaBad} did not answer, ${stuck.length} did not open in their player${retried ? `, ${retried} opened on a second try` : ''}` : 'none on the page yet');

  const film = rev.links.find((l) => l[0] === 'Play the film as it stands');
  const loop = rev.links.find((l) => l[0] === 'Play the card loop');
  note('5 play links on the review page', Boolean(film) && film[1] === './index.html' && Boolean(loop) && loop[1] === './index.html?mode=loop', `film ${film ? film[1] : 'missing'}, card loop ${loop ? loop[1] : 'missing'}`);

  // The card loop plays a finished place live. On a machine with no graphics card one frame of it can
  // take longer than a screenshot waits, so the loop gets the start limit and a slow page is a named
  // failure of this flow, not a crash of the tool.
  const loopStart = Date.now();
  await page.goto(`${base}index.html?mode=loop`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__flow.frames >= 3 || window.__flow.error, null, { timeout: startMs, polling: 500 }).catch(() => {});
  const looped = await page.evaluate(() => ({ ...window.__flow, size: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })() }));
  const loopSeconds = Math.round((Date.now() - loopStart) / 1000);
  const shot = await page.screenshot({ path: path.join(outDir, 'loop.png'), timeout: startMs }).then(() => '', (e) => `no screenshot: ${String(e.message).split('\n')[0]}`);
  note('6 card loop', Boolean(looped.size) && looped.size[0] >= 960 && looped.frames >= 3 && looped.lit > 60 && !looped.error && !shot,
    `canvas ${looped.size ? `${looped.size[0]} x ${looped.size[1]}` : 'none'}, ${looped.frames} frames drawn in ${loopSeconds} s, brightest value in the picture ${looped.lit} of 255${looped.error ? `, ${looped.error}` : ''}${shot ? `, ${shot}` : ''}`);

  for (const e of consoleErrors) if (!late.has(e.url)) errors.push(e.text);
  note('7 no errors', errors.length === 0 && failed.length === 0, `${errors.length} console errors, ${failed.length} failed requests${late.size ? `, ${late.size} sound or film ${late.size === 1 ? 'request was' : 'requests were'} answered with a server error by the storage host and asked again by the page` : ''}${errors.length || failed.length ? `: ${[...errors, ...failed].slice(0, 4).join(' | ')}` : ''}`);
  console.log(`page fetch of a text file: ${probe.text}`);
  console.log(`page fetch of a picture: ${probe.binary ?? 'no picture on the page'}`);
  fs.writeFileSync(path.join(outDir, 'flows.json'), JSON.stringify({ at: new Date().toISOString(), base: base.replace(/\/proxy\/[^/]+\//, '/proxy/…/'), results, probe, media: mediaLines, errors, failed }, null, 2));
} finally {
  await browser.close();
}
const bad = results.filter((r) => !r.ok).length;
console.log(`flows: ${results.length - bad} of ${results.length} pass, screenshots in out/work/host/`);
process.exit(bad ? 1 : 0);
