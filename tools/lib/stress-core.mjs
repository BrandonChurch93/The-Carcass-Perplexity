export const SCHEMA = 'carcass/stress 1';
export const WORK = 'out/work/stress';
export const REPORT = 'stress.json';
export const STRIKE = 'strike';
export const STRIKE_NTH = 3;
export const MOMENTS = [
  { id: 'heart', name: "The Heart's peak", unit: 'heart', event: 'surge' },
  { id: 'spine', name: 'The storm on the Spine', unit: 'spine', strike: true },
  { id: 'marsh', name: 'The seep pool on the marsh', unit: 'marsh', event: 'burst' },
  { id: 'titan', name: 'The titan frame', unit: null, titan: true }
];
export const ENCODE = { codec: 'libx264', preset: 'medium', matrix: 'bt709', bufferSeconds: 2, stressThreads: 1 };
export const CROP_ZOOM = 2;

const isFrame = (v) => Number.isInteger(v) && v >= 0;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r2 = (v) => Number(v.toFixed(2));

export function momentUnit(m, cfg) {
  const unit = m.unit ?? cfg.film.order[cfg.film.order.length - 1];
  if (!cfg.units.some((u) => u.id === unit)) throw new Error(`the moment ${m.id} names the unit ${unit}, which the config does not hold`);
  return unit;
}

export function chosen(value) {
  if (value === undefined || value === null || value === true) return MOMENTS;
  const ids = (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
  const wrong = ids.find((id) => !MOMENTS.some((m) => m.id === id));
  if (wrong) throw new Error(`${wrong} is not a moment. The moments are ${MOMENTS.map((m) => m.id).join(', ')}`);
  if (ids.length === 0) throw new Error(`--moments takes a list such as ${MOMENTS.map((m) => m.id).join(',')}`);
  return MOMENTS.filter((m) => ids.includes(m.id));
}

export function unitSpan(film, unit) {
  const from = (film.places ?? []).filter((p) => p.unit === unit);
  const list = from.length ? from : (film.shots ?? []).filter((s) => s.unit === unit);
  if (list.length === 0) return null;
  return { first: Math.min(...list.map((p) => p.first)), last: Math.max(...list.map((p) => p.last)), from: from.length ? 'places' : 'shots' };
}

const middle = (span) => Math.floor((span.first + span.last) / 2);

function fallback(film, unit, notes) {
  const span = unitSpan(film, unit);
  if (span) {
    const frame = middle(span);
    notes.push(`The middle of the span of ${unit} is used, frame ${frame}.`);
    return { frame, source: `the middle of ${unit}` };
  }
  const frame = Math.floor((film.frameCount - 1) / 2);
  notes.push(`The film on the page has no span for ${unit} either, so the middle of the film is used, frame ${frame}.`);
  return { frame, source: 'the middle of the film' };
}

export function pickMoment(m, film, cfg) {
  const unit = momentUnit(m, cfg);
  const events = (film.events ?? []).filter((e) => isFrame(e.frame));
  const notes = [];
  let found = null;
  if (m.titan) {
    if (isFrame(film.titanFrame)) found = { frame: film.titanFrame, source: 'the titan frame' };
    else notes.push('The film on the page has no titan frame.');
  } else if (m.strike) {
    const strikes = events.filter((e) => String(e.id).startsWith(STRIKE)).sort((a, b) => a.frame - b.frame);
    if (strikes.length >= STRIKE_NTH) found = { frame: strikes[STRIKE_NTH - 1].frame, source: `the event ${strikes[STRIKE_NTH - 1].id}` };
    else {
      notes.push(`The film on the page has ${strikes.length} of the ${STRIKE_NTH} events named ${STRIKE} that the storm needs.`);
      const span = unitSpan(film, unit);
      const own = events.filter((e) => e.unit === unit);
      if (span && own.length) {
        const mid = middle(span);
        const near = own.reduce((a, b) => (Math.abs(b.frame - mid) < Math.abs(a.frame - mid) ? b : a));
        notes.push(`The event nearest the middle of ${unit} is used: ${near.id}, frame ${near.frame}.`);
        found = { frame: near.frame, source: `the event ${near.id}` };
      } else if (!own.length) notes.push(`It has no event in ${unit}.`);
    }
  } else {
    const e = events.find((x) => x.id === m.event);
    if (e) found = { frame: e.frame, source: `the event ${e.id}` };
    else notes.push(`The film on the page has no event named ${m.event}.`);
  }
  if (!found) found = fallback(film, unit, notes);
  const frame = clamp(found.frame, 0, film.frameCount - 1);
  if (frame !== found.frame) notes.push(`Frame ${found.frame} is outside the film of ${film.frameCount} frames, so frame ${frame} is used.`);
  return { id: m.id, name: m.name, unit, frame, source: found.source, exact: notes.length === 0, notes };
}

export const pickMoments = (film, cfg, value = null) => chosen(value).map((m) => pickMoment(m, film, cfg));

export function clipRange(frame, frameCount, seconds, fps) {
  const count = Math.min(frameCount, Math.max(1, Math.round(seconds * fps)));
  const first = clamp(frame - Math.floor(count / 2), 0, frameCount - count);
  return { first, last: first + count - 1, count, index: frame - first };
}

export function unitsIn(film, first, last) {
  return [...new Set((film.shots ?? []).filter((s) => s.last >= first && s.first <= last && s.unit).map((s) => s.unit))];
}

export function crfFor(format, cfg) {
  return format === cfg.formats.master.id ? cfg.export.master.crf : cfg.export.hd.crf;
}

export function encodeSettings(mode, format, cfg) {
  const base = { codec: cfg.export.master.videoCodec, encoder: ENCODE.codec, preset: ENCODE.preset, pixelFormat: cfg.export.master.pixelFormat, container: cfg.export.master.container, matrix: ENCODE.matrix };
  if (mode === 'delivered') return { ...base, mode, crf: crfFor(format, cfg) };
  if (mode === 'stress') return { ...base, mode, mbps: cfg.quality.compressionStressMbps, bufferSeconds: ENCODE.bufferSeconds, threads: ENCODE.stressThreads };
  throw new Error(`no such encode: ${mode}`);
}

export function encodeArgs({ settings, width, height, fps, out }) {
  const m = settings.matrix;
  const a = ['-v', 'error', '-nostdin', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', '-'];
  a.push('-vf', `vflip,scale=in_range=pc:out_range=tv:out_color_matrix=${m},format=${settings.pixelFormat}`);
  a.push('-an', '-c:v', settings.encoder, '-preset', settings.preset, '-pix_fmt', settings.pixelFormat);
  if (settings.mode === 'delivered') a.push('-crf', String(settings.crf));
  else a.push('-b:v', `${settings.mbps}M`, '-maxrate', `${settings.mbps}M`, '-bufsize', `${settings.mbps * settings.bufferSeconds}M`, '-threads', String(settings.threads));
  a.push('-colorspace', m, '-color_primaries', m, '-color_trc', m, '-color_range', 'tv', '-movflags', '+faststart', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-f', settings.container, out);
  return a;
}

export function stillArgs({ file, index, matrix = ENCODE.matrix }) {
  return ['-v', 'error', '-nostdin', '-i', file, '-vf', `select=eq(n\\,${index}),scale=in_color_matrix=${matrix}:in_range=tv:out_range=pc,format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', '-'];
}

export function flipToRgb(rgba, width, height) {
  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const from = (height - 1 - y) * width * 4;
    const to = y * width * 3;
    for (let x = 0; x < width; x++) {
      out[to + x * 3] = rgba[from + x * 4];
      out[to + x * 3 + 1] = rgba[from + x * 4 + 1];
      out[to + x * 3 + 2] = rgba[from + x * 4 + 2];
    }
  }
  return out;
}

export function psnr(a, b) {
  if (a.length !== b.length || a.length === 0) throw new Error('two pictures of the same size are needed for a PSNR');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  if (sum === 0) return Infinity;
  return r2(10 * Math.log10((255 * 255) / (sum / a.length)));
}

export const psnrText = (v) => (Number.isFinite(v) ? `${v} dB` : 'no difference');
export const psnrValue = (v) => (Number.isFinite(v) ? v : null);

export function worstBox(a, b, width, height, boxWidth, boxHeight) {
  const bw = Math.min(width, boxWidth);
  const bh = Math.min(height, boxHeight);
  const stepX = Math.max(1, Math.floor(bw / 2));
  const stepY = Math.max(1, Math.floor(bh / 2));
  const cols = Math.ceil(width / stepX);
  const rows = Math.ceil(height / stepY);
  const cells = new Float64Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / stepY) * cols;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const d0 = a[i] - b[i];
      const d1 = a[i + 1] - b[i + 1];
      const d2 = a[i + 2] - b[i + 2];
      cells[row + Math.floor(x / stepX)] += d0 * d0 + d1 * d1 + d2 * d2;
    }
  }
  let best = { left: 0, top: 0, sum: -1 };
  for (let top = 0; top + bh <= height; top += stepY) {
    for (let left = 0; left + bw <= width; left += stepX) {
      let sum = 0;
      for (let cy = top / stepY; cy * stepY < top + bh && cy < rows; cy++) for (let cx = left / stepX; cx * stepX < left + bw && cx < cols; cx++) sum += cells[cy * cols + cx];
      if (sum > best.sum) best = { left, top, sum };
    }
  }
  return { left: best.left, top: best.top, width: bw, height: bh };
}

export function mbpsOf(bytes, frames, fps) {
  return r2((bytes * 8) / (frames / fps) / 1e6);
}

export function sizeOf(format, cfg) {
  const f = Object.values(cfg.formats).find((x) => x.id === format);
  if (!f) throw new Error(`no such format: ${format}`);
  return { width: f.width, height: f.height };
}

export function fileNames(moment, format, tier) {
  const base = `${moment.id}-${format}-${tier}`;
  return { delivered: `${base}-delivered.mp4`, stress: `${base}-stress.mp4`, stillSource: `${base}-source.png`, stillDelivered: `${base}-delivered.png`, stillStress: `${base}-stress.png`, sideBySide: `${base}-side-by-side.png` };
}

export function want({ moment, range, format, tier, fps, built, browser, units }) {
  return { engine: built.engine, units: Object.fromEntries(units.filter((u) => built.units?.[u]).map((u) => [u, built.units[u]])), format, tier, diag: null, browser, moment: moment.id, frame: moment.frame, source: moment.source, first: range.first, last: range.last, fps };
}

export function sameRecord(record, wanted, settings) {
  if (!record) return false;
  return Object.keys(wanted).every((k) => JSON.stringify(record[k]) === JSON.stringify(wanted[k])) && JSON.stringify(record.encode) === JSON.stringify(settings);
}

export function verdictLine(m, stressMbps) {
  const d = m.measured;
  const softer = d.delivered.mbps <= d.stress.mbps ? ` The delivered file is under the rate of the second encode here, so the second is no harsher than the first.` : '';
  return `${m.name}, film frame ${m.frame} (${m.source}): as delivered ${d.delivered.mbps} Mb/s and ${psnrText(d.delivered.psnrDb)} against the rendered frame, at ${stressMbps} Mb/s ${d.stress.mbps} Mb/s measured and ${psnrText(d.stress.psnrDb)}.${softer}`;
}
