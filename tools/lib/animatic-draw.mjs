import sharp from 'sharp';
import { rel, readJson } from './paths.mjs';
import { STYLE, textWidth } from './img.mjs';
import * as core from './animatic-core.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function load(file) {
  const { data, info } = await sharp(rel(file)).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

export async function labelTag(text, L = core.LABEL) {
  const tw = await textWidth(text, L.size);
  const edge = Math.ceil(L.soft * 2);
  const w = tw + 2 * L.padX + 2 * edge;
  const h = Math.round(L.size * 1.25) + 2 * L.padY + 2 * edge;
  const base = edge + L.padY + Math.round(L.size * 1.02);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="s" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="${L.soft}"/></filter></defs><rect x="${edge}" y="${edge}" width="${w - 2 * edge}" height="${h - 2 * edge}" rx="5" fill="${L.plate}" fill-opacity="${L.plateOpacity}" filter="url(#s)"/><text x="${edge + L.padX}" y="${base}" font-family="${STYLE.family}" font-size="${L.size}" fill="${L.ink}" fill-opacity="${L.inkOpacity}">${esc(text)}</text></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function drawer({ cut, cfg, keepPlaces = 3 }) {
  const W = cfg.formats.preview.width;
  const H = cfg.formats.preview.height;
  const fps = cfg.film.fps;
  const pullback = readJson(rel(core.pullbackPath(cfg)));
  const rp = core.revealPath(cut, cfg, pullback);
  const sources = core.revealSources(cfg, pullback);
  const places = new Map();
  const reveal = new Map();
  const tags = new Map();
  let held = null;

  const place = async (file) => {
    if (!places.has(file)) {
      if (places.size >= keepPlaces) places.delete(places.keys().next().value);
      places.set(file, await load(file));
    }
    return places.get(file);
  };
  const source = async (i) => {
    if (!reveal.has(i)) {
      const img = await load(sources[i].file);
      reveal.set(i, i === sources.length - 1 ? core.pyramid(img, 4) : [img]);
    }
    return reveal.get(i);
  };
  const tag = async (text) => {
    if (!tags.has(text)) tags.set(text, await labelTag(text));
    return tags.get(text);
  };
  const words = async (text) => {
    const id = `words|${text}`;
    if (!tags.has(id)) tags.set(id, await labelTag(text, core.WORDS));
    return tags.get(id);
  };
  const lay = async (acc, i, view) => {
    const levels = await source(i);
    const at = core.toSource(view, sources[i], levels[0].width, levels[0].height);
    const m = core.mipFor(at, W, H, levels.length);
    core.sampleInto(acc, levels[m.level], m.view, W, H, m.next ? 1 - m.next.share : 1);
    if (m.next) core.sampleInto(acc, levels[m.next.level], m.next.view, W, H, m.next.share);
    return acc;
  };

  async function frame(f) {
    const p = core.plan(cut, cfg, rp, f);
    let id;
    let view = null;
    let img = null;
    if (p.kind === 'place') {
      img = await place(p.key.image);
      view = core.placeView(p.shot, f, img, { width: W, height: H }, fps);
    } else if (p.kind === 'reveal') view = p.view;
    const silent = p.kind === 'black' ? null : core.silentLine(cut, f);
    id = `${p.kind}|${p.shot.label}|${p.kind === 'place' ? p.key.id : ''}|${view ? [view.x, view.y, view.w, view.h].join(',') : ''}|${silent ? `${silent.clip}-${silent.line}` : ''}`;
    if (held && held.id === id) return held.data;
    let data;
    if (p.kind === 'black') data = core.fill(W, H, core.BLACK);
    else {
      const acc = new Float32Array(W * H * 3);
      if (p.kind === 'place') core.sampleInto(acc, img, view, W, H, 1);
      else {
        const s = core.sourceFor(view, sources);
        await lay(acc, s.index, view);
        if (s.inset) {
          const fine = await lay(new Float32Array(W * H * 3), s.inset.index, view);
          core.insetInto(acc, fine, W, H, core.footprint(view, sources[s.inset.index].window, W, H), s.inset.share, s.inset.feather);
        }
      }
      data = core.toBytes(acc);
    }
    let labelHeight = 0;
    if (p.shot.label) {
      const t = await tag(p.shot.label);
      const at = core.labelPlace(t, W, H);
      core.overlay(data, W, t, at.left, at.top);
      labelHeight = t.height;
    }
    if (silent) {
      const t = await words(silent.text);
      const at = core.wordsPlace(t, W, H, labelHeight);
      core.overlay(data, W, t, at.left, at.top);
    }
    held = { id, data };
    return data;
  }

  return { frame, width: W, height: H, reveal: rp, sources };
}

export async function still(draw, f, file) {
  const data = await draw.frame(f);
  await sharp(Buffer.from(data.buffer, data.byteOffset, data.length), { raw: { width: draw.width, height: draw.height, channels: 3 } }).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(file);
  return file;
}
