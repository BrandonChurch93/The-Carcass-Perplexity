import path from 'node:path';

export const ENCODERS = {
  h264: ['-c:v', 'libx264', '-preset', 'medium'],
  prores_422_hq: ['-c:v', 'prores_ks', '-profile:v', '3', '-vendor', 'apl0', '-pix_fmt', 'yuv422p10le'],
};
export const SOUND_TYPES = ['.flac', '.wav'];
const BITEXACT = ['-fflags', '+bitexact', '-map_metadata', '-1'];
const QUIET = ['-hide_banner', '-loglevel', 'error', '-y'];
const COLOUR = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const TO_VIDEO = 'scale=out_color_matrix=bt709:out_range=tv';
const pad = (n) => String(n).padStart(6, '0');
const sec = (v) => String(Number(v.toFixed(6)));
const whole = (v) => Number.isInteger(v) && v >= 0;

export function formatOf(cfg, id) {
  const key = Object.keys(cfg.formats).find((k) => cfg.formats[k].id === id || k === id);
  if (!key) throw new Error(`No such format: ${id}. The formats are ${Object.values(cfg.formats).map((f) => f.id).join(', ')}.`);
  return { key, ...cfg.formats[key] };
}

export function tierOf(cfg, tier) {
  if (!cfg.tiers[tier]) throw new Error(`No such tier: ${tier}. The tiers are ${Object.keys(cfg.tiers).join(', ')}.`);
  return tier;
}

export function rateOf(cfg, fps = null) {
  const full = cfg.film.fps;
  const rate = fps === null || fps === undefined ? full : Number(fps);
  if (!Number.isInteger(rate) || rate <= 0 || full % rate !== 0) throw new Error(`--fps takes a whole number that divides film.fps, which is ${full}. ${fps} does not.`);
  return { rate, step: full / rate };
}

export function countFrames({ first, last, step = 1 }) {
  if (last < first) return 0;
  return Math.floor(last / step) - Math.ceil(first / step) + 1;
}

export function spanFrames({ first, last, step = 1 }) {
  const out = [];
  for (let f = Math.ceil(first / step) * step; f <= last; f += step) out.push(f);
  return out;
}

export function unitSpan(film, unit) {
  const place = (film.places ?? []).find((p) => p.unit === unit);
  if (place) return { first: place.first, last: place.last, from: 'places' };
  const shots = (film.shots ?? []).filter((s) => s.unit === unit);
  if (!shots.length) throw new Error(`The film has no place and no shot with the unit ${unit}.`);
  return { first: Math.min(...shots.map((s) => s.first)), last: Math.max(...shots.map((s) => s.last)), from: 'shots' };
}

export function resolveSpan({ frameCount, first = null, last = null, unit = null, film = null }) {
  if (unit !== null && (first !== null || last !== null)) throw new Error('--unit cannot be given with --first or --last.');
  if (unit !== null) {
    const s = unitSpan(film, unit);
    return { first: s.first, last: s.last, whole: s.first === 0 && s.last === frameCount - 1, unit, from: s.from };
  }
  const a = first === null ? 0 : Number(first);
  const b = last === null ? frameCount - 1 : Number(last);
  if (!whole(a) || !whole(b) || b < a || b >= frameCount) throw new Error(`--first and --last take frames from 0 to ${frameCount - 1}, with --last not before --first.`);
  return { first: a, last: b, whole: a === 0 && b === frameCount - 1, unit: null, from: 'frames' };
}

export function chunkName({ what = 'film', format, tier, rate, first, last }) {
  return `${what}-${format}-${tier}-${rate}fps-${pad(first)}-${pad(last)}`;
}

export function chunkPlan({ what = 'film', first, last, shots = [], unit = null, cfg, format, tier, rate }) {
  const { step } = rateOf(cfg, rate);
  const size = Math.round(cfg.sandbox.chunkSeconds * cfg.film.fps);
  if (size < 1) throw new Error('sandbox.chunkSeconds holds less than one frame.');
  const sorted = [...shots].sort((a, b) => a.first - b.first);
  const out = [];
  let f = first;
  while (f <= last) {
    const shot = sorted.find((s) => f >= s.first && f <= s.last) ?? null;
    const next = sorted.find((s) => s.first > f) ?? null;
    const anchor = shot ? shot.first : sorted.length ? f : 0;
    const segmentLast = shot ? shot.last : next ? next.first - 1 : last;
    const end = Math.min(last, segmentLast, anchor + (Math.floor((f - anchor) / size) + 1) * size - 1);
    const frames = countFrames({ first: f, last: end, step });
    if (frames > 0) {
      out.push({
        index: out.length,
        name: chunkName({ what, format, tier, rate, first: f, last: end }),
        first: f,
        last: end,
        frames,
        shot: shot ? shot.id : null,
        unit: shot ? (shot.unit ?? null) : unit,
      });
    }
    f = end + 1;
  }
  return out;
}

export function shareOf(plan, { chunks = null, of = null, part = null } = {}) {
  if (chunks !== null && (of !== null || part !== null)) throw new Error('--chunks cannot be given with --of and --part.');
  if (chunks !== null) {
    const asked = String(chunks).split(',').map((s) => s.trim()).filter(Boolean);
    if (!asked.length) throw new Error('--chunks takes a list of chunk numbers or chunk names with commas between them.');
    return asked.map((a) => {
      const found = /^\d+$/.test(a) ? plan[Number(a)] : plan.find((c) => c.name === a);
      if (!found) throw new Error(`The plan has no chunk ${a}. It has chunks 0 to ${plan.length - 1}.`);
      return found;
    });
  }
  if (of === null && part === null) return plan;
  const k = Number(of);
  const i = Number(part);
  if (!Number.isInteger(k) || !Number.isInteger(i) || k < 1 || i < 1 || i > k) throw new Error('--of K and --part I go together, with I from 1 to K.');
  return plan.filter((c) => c.index % k === i - 1);
}

export function qualityArgs(cfg, formatKey) {
  if (formatKey === 'master') return ['-crf', String(cfg.export.master.crf)];
  if (formatKey === 'hd') return ['-crf', String(cfg.export.hd.crf)];
  if (formatKey === 'preview') return bitrateArgs(cfg.export.preview.bitrateMbps);
  throw new Error(`No encoding is set for the format ${formatKey}.`);
}

export function bitrateArgs(mbps) {
  return ['-b:v', `${mbps}M`, '-maxrate', `${mbps * 2}M`, '-bufsize', `${mbps * 2}M`];
}

export function encoderOf(codec) {
  if (!ENCODERS[codec]) throw new Error(`No encoder is known for the codec ${codec}.`);
  return ENCODERS[codec];
}

export function videoArgs(cfg, quality, rate) {
  return [...encoderOf(cfg.export.master.videoCodec), '-pix_fmt', cfg.export.master.pixelFormat, ...quality, '-g', String(rate), '-flags:v', '+cgop+bitexact', ...COLOUR];
}

export function chunkArgs({ cfg, format, rate, out }) {
  const f = formatOf(cfg, format);
  return [
    ...QUIET,
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${f.width}x${f.height}`, '-r', String(rate), '-i', 'pipe:0',
    '-an', '-vf', `vflip,${TO_VIDEO}`,
    ...videoArgs(cfg, qualityArgs(cfg, f.key), rate),
    '-r', String(rate), ...BITEXACT, '-f', cfg.export.master.container, out,
  ];
}

export function editArgs({ cfg, format, rate, out }) {
  const f = formatOf(cfg, format);
  return [
    ...QUIET,
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${f.width}x${f.height}`, '-r', String(rate), '-i', 'pipe:0',
    '-an', '-vf', `vflip,${TO_VIDEO}`,
    ...encoderOf(cfg.export.local.videoCodec), ...COLOUR, '-flags:v', '+bitexact',
    '-r', String(rate), ...BITEXACT, '-f', cfg.export.local.container, out,
  ];
}

export function concatList(files) {
  return files.map((f) => `file '${String(f).split(path.sep).join('/').replaceAll("'", "'\\''")}'`).join('\n') + '\n';
}

export function soundSpan({ cfg, first, last, rate, whole }) {
  const { step } = rateOf(cfg, rate);
  const frames = countFrames({ first, last, step });
  return { whole, from: (Math.ceil(first / step) * step) / cfg.film.fps, seconds: frames / rate };
}

export function joinArgs({ cfg, list, sound = null, out, container = cfg.export.master.container }) {
  const a = [...QUIET, '-f', 'concat', '-safe', '0', '-i', list];
  if (sound) {
    a.push('-i', sound.file);
    if (sound.whole) a.push('-map', '0:v', '-map', '1:a', '-t', sec(sound.seconds));
    else a.push('-filter_complex', `[1:a]atrim=start=${sec(sound.from)},asetpts=PTS-STARTPTS,apad,atrim=end=${sec(sound.seconds)}[a]`, '-map', '0:v', '-map', '[a]');
    a.push('-c:v', 'copy', '-c:a', cfg.export.master.audioCodec, '-b:a', `${cfg.export.master.audioKbps}k`, '-ar', String(cfg.audio.sampleRate), '-ac', '2', '-flags:a', '+bitexact');
  } else a.push('-map', '0:v', '-c:v', 'copy', '-an');
  a.push(...BITEXACT, ...(container === 'mp4' ? ['-movflags', '+faststart'] : []), '-f', container, out);
  return a;
}

export function scaleArgs({ cfg, src, format, rate, srcRate, out }) {
  const f = formatOf(cfg, format);
  if (!Number.isInteger(srcRate / rate)) throw new Error(`A film at ${srcRate} frames a second cannot be thinned to ${rate}.`);
  const thin = srcRate === rate ? '' : `select='not(mod(n\\,${srcRate / rate}))',setpts=N/(${rate}*TB),`;
  return [
    ...QUIET, '-i', src,
    '-map', '0:v:0', '-map', '0:a?', '-vf', `${thin}scale=${f.width}:${f.height}:flags=lanczos`,
    ...videoArgs(cfg, qualityArgs(cfg, f.key), rate), '-r', String(rate),
    '-c:a', 'copy', ...BITEXACT, '-movflags', '+faststart', '-f', cfg.export.master.container, out,
  ];
}

export function webArgs({ cfg, src, rate, out }) {
  const web = cfg.deliver.cardLoop;
  return [
    ...QUIET, '-i', src,
    '-map', '0:v:0', '-an', '-vf', `scale=${web.webWidth}:-2:flags=lanczos`,
    ...videoArgs(cfg, bitrateArgs(web.webBitrateMbps), rate), '-r', String(rate),
    ...BITEXACT, '-movflags', '+faststart', '-f', cfg.export.master.container, out,
  ];
}

export function webSize(cfg, format) {
  const f = formatOf(cfg, format);
  const width = cfg.deliver.cardLoop.webWidth;
  return { width, height: Math.round((f.height * width) / f.width / 2) * 2 };
}

export function unitsShown(built, units) {
  const out = {};
  for (const u of [...new Set(units)].filter(Boolean).sort()) if (built.units && built.units[u]) out[u] = built.units[u];
  return out;
}

export function chunkRecord({ renderer, chunk, what = 'film', format, tier, rate, edit = false }) {
  return {
    kind: 'chunk',
    what,
    name: chunk.name,
    format,
    tier,
    rate,
    first: chunk.first,
    last: chunk.last,
    frames: chunk.frames,
    edit,
    engine: renderer.built.engine,
    units: unitsShown(renderer.built, [chunk.unit]),
    built: renderer.built,
    browser: renderer.browser,
    machine: renderer.machine,
  };
}

const CHUNK_KEYS = ['kind', 'what', 'name', 'format', 'tier', 'rate', 'first', 'last', 'frames', 'engine', 'units', 'browser'];

export function chunkMatches(record, want) {
  if (!record || typeof record !== 'object') return false;
  if (want.edit && !record.edit) return false;
  return CHUNK_KEYS.every((k) => JSON.stringify(record[k]) === JSON.stringify(want[k]));
}

export function joinRecord({ renderer, what = 'film', name, format, tier, rate, first, last, whole = false, frames, chunks, sound = null, from = null }) {
  return {
    kind: what,
    name,
    format,
    tier,
    rate,
    first,
    last,
    whole,
    frames,
    chunks: chunks.map((c) => c.name ?? c),
    sound,
    from,
    built: renderer.built,
    browser: renderer.browser,
    machine: renderer.machine,
  };
}

export const sameBuild = (a, b) => Boolean(a && b) && a.engine === b.engine && JSON.stringify(sortKeys(a.units)) === JSON.stringify(sortKeys(b.units));
const sortKeys = (o) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => (a < b ? -1 : 1)));

export function filmName({ cfg, format, tier, rate, span, film }) {
  const f = formatOf(cfg, format);
  const files = cfg.export.files;
  const own = f.key === 'preview' ? cfg.film.previewFps : cfg.film.fps;
  const ext = path.extname(files.master);
  const atRate = rate === own ? '' : `-${rate}fps`;
  const named = (file) => (atRate ? `${path.basename(file, path.extname(file))}${atRate}${path.extname(file)}` : file);
  if (span.whole && files[f.key]) return named(files[f.key]);
  if (f.key === 'hd' && film) {
    let heart = null;
    try {
      heart = unitSpan(film, cfg.lookLockUnit);
    } catch {
      heart = null;
    }
    if (heart && heart.first === span.first && heart.last === span.last) return named(files.heartReview);
  }
  return `film-${f.id}-${tier}-${rate}fps-${pad(span.first)}-${pad(span.last)}${ext}`;
}

export function loopNames({ cfg, format, tier, span }) {
  const files = cfg.export.files;
  const says = span.whole ? '' : `-${formatOf(cfg, format).id}-${tier}-${pad(span.first)}-${pad(span.last)}`;
  const named = (file) => `${path.basename(file, path.extname(file))}${says}${path.extname(file)}`;
  return { loop: named(files.cardLoop), web: named(files.cardLoopWeb), still: files.cardStill };
}

export function stillRecord({ renderer, format, tier, unit }) {
  return {
    kind: 'card-still',
    loop: 0,
    frame: null,
    format,
    tier,
    engine: renderer.built.engine,
    units: unitsShown(renderer.built, [unit]),
    built: renderer.built,
    browser: renderer.browser,
    machine: renderer.machine,
  };
}

export const PROBE_ARGS = ['-v', 'error', '-count_packets', '-show_entries', 'stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,nb_read_packets', '-of', 'json'];

export function readProbe(json) {
  const streams = (typeof json === 'string' ? JSON.parse(json) : json).streams ?? [];
  const v = streams.find((s) => s.codec_type === 'video') ?? null;
  const [n, d] = String(v?.r_frame_rate ?? '').split('/').map(Number);
  return {
    width: v?.width ?? null,
    height: v?.height ?? null,
    fps: v && d ? n / d : null,
    frames: v && v.nb_read_packets !== undefined ? Number(v.nb_read_packets) : null,
    codec: v?.codec_name ?? null,
    pixelFormat: v?.pix_fmt ?? null,
    sound: streams.some((s) => s.codec_type === 'audio'),
  };
}

export function probeFaults(probe, want) {
  if (probe.width === null) return ['it holds no picture stream'];
  const wrong = [];
  if (probe.width !== want.width || probe.height !== want.height) wrong.push(`its size is ${probe.width} x ${probe.height}, not ${want.width} x ${want.height}`);
  if (probe.fps === null || Math.abs(probe.fps - want.fps) > 1e-6) wrong.push(`its rate is ${probe.fps === null ? 'unknown' : Number(probe.fps.toFixed(3))} frames a second, not ${want.fps}`);
  if (probe.frames !== want.frames) wrong.push(`it holds ${probe.frames ?? 'an unknown number of'} frames, not ${want.frames}`);
  if (want.sound !== undefined && probe.sound !== want.sound) wrong.push(want.sound ? 'it has no sound stream' : 'it has a sound stream and none was asked for');
  return wrong;
}

export function newestMix(files) {
  const fit = files.filter((f) => SOUND_TYPES.includes(path.extname(f.file).toLowerCase()));
  fit.sort((a, b) => b.mtimeMs - a.mtimeMs || (a.file < b.file ? -1 : 1));
  return fit.length ? fit[0].file : null;
}

export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
}

export function chunkLine({ done, total, chunk, perFrame, framesLeft, reused = false }) {
  const head = `chunk ${done} of ${total}, ${chunk.name}, ${chunk.frames} frames`;
  if (reused) return `${head}, kept from an earlier run`;
  return `${head}, ${perFrame.toFixed(2)} s a frame, ${clock(perFrame * framesLeft)} left`;
}

export function proofSpan({ film, cfg, loop = false }) {
  const want = Math.round(cfg.export.local.proofSeconds * cfg.film.fps);
  const total = loop ? film.loop.frameCount : film.frameCount;
  const n = Math.min(want, total);
  if (loop) return { first: 0, last: n - 1, cut: null, frames: n };
  const shots = [...(film.shots ?? [])].sort((a, b) => a.first - b.first);
  const cut = shots.length > 1 ? shots[1].first : null;
  const centre = cut ?? Math.floor(total / 2);
  const first = Math.max(0, Math.min(total - n, centre - Math.floor(n / 2)));
  return { first, last: first + n - 1, cut, frames: n };
}

export function testSpan({ film, cfg }) {
  const n = Math.min(Math.round(cfg.export.local.testSeconds * cfg.film.fps), film.frameCount);
  return { first: 0, last: n - 1, frames: n };
}

export function lengthFaults({ film, cfg, cut = null, plan }) {
  const out = [];
  if (film.fps !== cfg.film.fps) out.push(`the page runs at ${film.fps} frames a second and film.fps is ${cfg.film.fps}`);
  const planned = plan.reduce((n, c) => n + c.frames, 0);
  if (planned !== film.frameCount) out.push(`the plan holds ${planned} frames and the film has ${film.frameCount}`);
  if (cut && cut.frameCount !== film.frameCount) out.push(`the film on the page has ${film.frameCount} frames and the cut list has ${cut.frameCount}`);
  return out;
}

export function chromePaths({ platform, env = {}, home = '' }) {
  const out = [];
  if (platform === 'darwin') {
    for (const base of ['/Applications', path.posix.join(home, 'Applications')]) {
      out.push(`${base}/Google Chrome.app/Contents/MacOS/Google Chrome`, `${base}/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`, `${base}/Chromium.app/Contents/MacOS/Chromium`);
    }
  } else if (platform === 'win32') {
    for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean)) out.push(`${base}\\Google\\Chrome\\Application\\chrome.exe`);
  } else {
    out.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium');
  }
  if (env.CARCASS_BROWSER) out.push(env.CARCASS_BROWSER);
  return out;
}

export const LOCAL_FLAGS = ['--ignore-gpu-blocklist', '--enable-webgl', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];

export function psnr(a, b) {
  if (a.length !== b.length || a.length === 0) throw new Error('The two pictures are not the same size.');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum === 0 ? Infinity : 10 * Math.log10((255 * 255) / (sum / a.length));
}
