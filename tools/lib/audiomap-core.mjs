export const SCHEMA = 'carcass/map 1';
export const ANALYSIS_RATE = 22050;
export const FRAME = 1024;
export const HOP = 256;
export const LOW_HZ = 150;
export const MIN_BPM = 40;
export const MAX_BPM = 160;
export const FLOOR_LUFS = -70;
export const CURVE_STEP = 0.1;
export const STRIKES = ['firstHit', 'midHit', 'revealHit', 'finalHit'];
export const CHECKED = ['firstHit', 'quietStart', 'quietEnd', 'revealHit'];

export const GRID_THRESHOLD = 0.25;
export const LOW_JUMP = 1.5;
export const ATTACK_SHARE = 0.5;
export const RISE_AFTER = 0.4;
export const RISE_BEFORE = 2;
export const RISE_GAP = 0.1;

export const DEFAULTS = {
  strength: 'attack',
  jumpDb: 8,
  hitThreshold: 0.3,
  strongThreshold: 0.45,
  minHits: 36,
  maxHits: 90,
  quietDropDb: 8,
  quietSideSeconds: 8,
  sectionMinSeconds: 3,
  trendDb: 5,
  slopeDbPerSecond: 0.8,
  loudDropDb: 6,
  peakDropDb: 2,
};

export const TRIES = [
  { changed: 'nothing', params: {} },
  { changed: 'strength from attack alone to rise and attack', params: { strength: 'rise' } },
  { changed: 'strength from attack alone to rise and attack, strongThreshold 0.45 to 0.3, quietDropDb 8 to 6', params: { strength: 'rise', strongThreshold: 0.3, quietDropDb: 6 } },
];

export const r4 = (v) => Number(Number(v).toFixed(4));
export const r2 = (v) => Number(Number(v).toFixed(2));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const top = (arr) => {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
};

export function median(values) {
  if (values.length === 0) return 0;
  const s = Array.from(values).sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(values, p) {
  if (values.length === 0) return 0;
  const s = Array.from(values).sort((a, b) => a - b);
  return s[clamp(Math.round((s.length - 1) * p), 0, s.length - 1)];
}

export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export function onsetCurves(samples, sampleRate = ANALYSIS_RATE) {
  const n = FRAME;
  const half = n / 2;
  const frames = Math.max(0, Math.floor((samples.length - n) / HOP) + 1);
  const win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const lowBins = Math.max(1, Math.floor((LOW_HZ * n) / sampleRate));
  const full = new Float64Array(frames);
  const low = new Float64Array(frames);
  const fullLog = new Float64Array(frames);
  const lowLog = new Float64Array(frames);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const lag = 2;
  const mags = [];
  let top = 0;
  for (let f = 0; f < frames; f++) {
    const off = f * HOP;
    for (let i = 0; i < n; i++) {
      re[i] = samples[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float32Array(half);
    for (let b = 0; b < half; b++) {
      mag[b] = Math.hypot(re[b], im[b]);
      if (mag[b] > top) top = mag[b];
    }
    mags.push(mag);
    if (mags.length > lag + 1) mags[f - lag - 1] = null;
    if (f >= lag) {
      const prev = mags[f - lag];
      let sf = 0;
      let sl = 0;
      for (let b = 1; b < half; b++) {
        const d = mag[b] - prev[b];
        if (d > 0) {
          sf += d;
          if (b <= lowBins) sl += d;
        }
      }
      full[f] = sf;
      low[f] = sl;
    }
  }
  const frameSeconds = HOP / sampleRate;
  const times = new Float64Array(frames);
  for (let f = 0; f < frames; f++) times[f] = (f * HOP + half) / sampleRate;
  const compress = (c) => {
    const ref = percentile(c, 0.99) || 1;
    const out = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) out[i] = Math.log1p((20 * c[i]) / ref);
    return out;
  };
  fullLog.set(compress(full));
  lowLog.set(compress(low));
  return { full, low, fullLog, lowLog, times, frameSeconds, frames };
}

function biquad(samples, b, a) {
  const out = new Float64Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = (b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0];
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

export function kWeight(samples, sampleRate = ANALYSIS_RATE) {
  const shelf = () => {
    const A = 10 ** (3.999843853973347 / 40);
    const w = (2 * Math.PI * 1681.974450955533) / sampleRate;
    const al = Math.sin(w) / (2 * 0.7071752369554196);
    const c = Math.cos(w);
    const q = 2 * Math.sqrt(A) * al;
    return [
      [A * (A + 1 + (A - 1) * c + q), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - q)],
      [A + 1 - (A - 1) * c + q, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - q],
    ];
  };
  const pass = () => {
    const w = (2 * Math.PI * 38.13547087602444) / sampleRate;
    const al = Math.sin(w) / (2 * 0.5003270373238773);
    const c = Math.cos(w);
    return [
      [(1 + c) / 2, -(1 + c), (1 + c) / 2],
      [1 + al, -2 * c, 1 - al],
    ];
  };
  const [sb, sa] = shelf();
  const [pb, pa] = pass();
  return biquad(biquad(samples, sb, sa), pb, pa);
}

export function loudnessCurves(samples, sampleRate = ANALYSIS_RATE, step = CURVE_STEP) {
  const k = kWeight(samples, sampleRate);
  const sum = new Float64Array(k.length + 1);
  for (let i = 0; i < k.length; i++) sum[i + 1] = sum[i] + k[i] * k[i];
  const seconds = samples.length / sampleRate;
  const count = Math.max(1, Math.floor(seconds / step) + 1);
  const level = (t, span) => {
    const a = clamp(Math.round((t - span / 2) * sampleRate), 0, k.length);
    const b = clamp(Math.round((t + span / 2) * sampleRate), 0, k.length);
    if (b <= a) return FLOOR_LUFS;
    const ms = (sum[b] - sum[a]) / (b - a);
    return ms > 0 ? Math.max(FLOOR_LUFS, -0.691 + 10 * Math.log10(ms)) : FLOOR_LUFS;
  };
  const lowPass = () => {
    const w = (2 * Math.PI * LOW_HZ) / sampleRate;
    const al = Math.sin(w) / (2 * Math.SQRT1_2);
    const c = Math.cos(w);
    return [
      [(1 - c) / 2, 1 - c, (1 - c) / 2],
      [1 + al, -2 * c, 1 - al],
    ];
  };
  const [lb, la] = lowPass();
  const lowWave = biquad(biquad(samples, lb, la), lb, la);
  const lowSum = new Float64Array(k.length + 1);
  for (let i = 0; i < k.length; i++) lowSum[i + 1] = lowSum[i] + lowWave[i] * lowWave[i];
  const between = (acc, from, to) => {
    const a = clamp(Math.round(from * sampleRate), 0, k.length);
    const b = clamp(Math.round(to * sampleRate), 0, k.length);
    if (b <= a) return FLOOR_LUFS;
    const ms = (acc[b] - acc[a]) / (b - a);
    return ms > 0 ? Math.max(FLOOR_LUFS, -0.691 + 10 * Math.log10(ms)) : FLOOR_LUFS;
  };
  const rise = (t, acc) => {
    const from = Math.max(0, t - RISE_BEFORE);
    if (t - RISE_GAP - from < RISE_BEFORE / 2) return 0;
    return between(acc, t, t + RISE_AFTER) - between(acc, from, t - RISE_GAP);
  };
  const riseFull = (t) => rise(t, sum);
  const riseLow = (t) => rise(t, lowSum);
  const fullAfter = (t) => between(sum, t, t + RISE_AFTER);
  const lowAfter = (t) => between(lowSum, t, t + RISE_AFTER);
  const times = new Float64Array(count);
  const momentary = new Float64Array(count);
  const shortTerm = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    times[i] = i * step;
    momentary[i] = level(times[i], 0.4);
    shortTerm[i] = level(times[i], 3);
  }
  return { times, momentary, shortTerm, step, seconds, level, riseFull, riseLow, fullAfter, lowAfter };
}

function interp(arr, x) {
  if (x <= 0) return arr[0];
  if (x >= arr.length - 1) return arr[arr.length - 1];
  const i = Math.floor(x);
  const f = x - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
}

export function findTempo(curves, { configBpm = null, alike = 0.6 } = {}) {
  const { fullLog, lowLog, frameSeconds } = curves;
  const n = fullLog.length;
  const env = new Float64Array(n);
  const mf = fullLog.reduce((a, b) => a + b, 0) / (n || 1) || 1;
  const ml = lowLog.reduce((a, b) => a + b, 0) / (n || 1) || 1;
  for (let i = 0; i < n; i++) env[i] = fullLog[i] / mf + lowLog[i] / ml;
  const w = Math.max(3, Math.round(1 / frameSeconds));
  const flat = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += env[i];
    if (i >= w) acc -= env[i - w];
    flat[i] = Math.max(0, env[i] - acc / Math.min(i + 1, w));
  }
  const minLag = 60 / MAX_BPM / frameSeconds;
  const maxLag = 60 / MIN_BPM / frameSeconds;
  const lags = Math.min(n - 1, Math.ceil(maxLag * 4) + 2);
  const acf = new Float64Array(lags + 1);
  for (let l = 0; l <= lags; l++) {
    let s = 0;
    for (let i = l; i < n; i++) s += flat[i] * flat[i - l];
    acf[l] = s / (n - l);
  }
  const zero = acf[0] || 1;
  const comb = (p) => {
    let s = 0;
    let c = 0;
    for (let k = 1; k <= 4; k++) {
      if (p * k > lags) break;
      s += interp(acf, p * k) / zero;
      c++;
    }
    return c ? s / c : 0;
  };
  let best = { p: minLag, s: -Infinity };
  for (let p = minLag; p <= maxLag; p += 0.1) {
    const s = comb(p);
    if (s > best.s) best = { p, s };
  }
  const notes = [];
  let pick = best;
  const family = [0.5, 2, 2 / 3, 1.5]
    .map((m) => best.p * m)
    .filter((p) => p >= minLag && p <= maxLag)
    .map((p0) => {
      let top = { p: p0, s: comb(p0) };
      for (let p = p0 * 0.97; p <= p0 * 1.03; p += 0.05) {
        const s = comb(p);
        if (s > top.s) top = { p, s };
      }
      return top;
    })
    .filter((c) => c.s >= best.s * alike);
  if (family.length > 0 && configBpm) {
    const bpmOf = (c) => 60 / (c.p * frameSeconds);
    const all = [best, ...family];
    pick = all.reduce((a, b) => (Math.abs(Math.log(bpmOf(b) / configBpm)) < Math.abs(Math.log(bpmOf(a) / configBpm)) ? b : a));
    notes.push(
      `Tempo: ${all.map((c) => `${bpmOf(c).toFixed(1)} (score ${c.s.toFixed(2)})`).join(', ')} beats a minute scored alike, the first of them highest. Took ${bpmOf(pick).toFixed(1)}, the one nearest music.bpm.`
    );
  }
  let period = pick.p;
  let phase = 0;
  let top = -Infinity;
  for (let p = pick.p * 0.98; p <= pick.p * 1.02; p += pick.p * 0.0002) {
    for (let ph = 0; ph < p; ph += 1) {
      let s = 0;
      let c = 0;
      for (let x = ph; x < n - 1; x += p) {
        s += interp(flat, x);
        c++;
      }
      s /= c || 1;
      if (s > top) {
        top = s;
        period = p;
        phase = ph;
      }
    }
  }
  const lead = (FRAME / 2) / (HOP);
  return {
    beatSeconds: period * frameSeconds,
    phaseSeconds: (phase + lead) * frameSeconds,
    score: pick.s,
    notes,
    flat,
  };
}

export function refineGrid(beatSeconds, phaseSeconds, hits, { rounds = 4, tolerance = 0.08, sigma = 0.03, reach = 0.012 } = {}) {
  const weight = (h) => Math.max(h.attackLow ?? h.low, h.attackFull ?? h.full);
  let period = beatSeconds;
  let phase = phaseSeconds;
  if (hits.length >= 6) {
    let best = -Infinity;
    const stepP = beatSeconds * 0.00005;
    const stepPh = 0.004;
    const ws = hits.map(weight);
    for (let p = beatSeconds * (1 - reach); p <= beatSeconds * (1 + reach); p += stepP) {
      const fr = hits.map((h) => h.t / p);
      for (let ph = 0; ph < p; ph += stepPh) {
        const o = ph / p;
        let sc = 0;
        for (let i = 0; i < fr.length; i++) {
          const x = fr[i] - o;
          const e = (x - Math.round(x)) * p;
          if (e > -0.09 && e < 0.09) sc += ws[i] * Math.exp(-(e * e) / (2 * sigma * sigma));
        }
        if (sc > best) {
          best = sc;
          period = p;
          phase = ph;
        }
      }
    }
  }
  let used = 0;
  let rms = null;
  for (let r = 0; r < rounds; r++) {
    let sw = 0;
    let sk = 0;
    let st = 0;
    let skk = 0;
    let skt = 0;
    const picked = [];
    for (const h of hits) {
      const k = Math.round((h.t - phase) / period);
      const err = h.t - (phase + k * period);
      if (Math.abs(err) > tolerance * period) continue;
      const w = weight(h);
      sw += w;
      sk += w * k;
      st += w * h.t;
      skk += w * k * k;
      skt += w * k * h.t;
      picked.push(err);
    }
    used = picked.length;
    rms = used ? Math.sqrt(picked.reduce((a, e) => a + e * e, 0) / used) : null;
    if (used < 6) break;
    const det = sw * skk - sk * sk;
    if (Math.abs(det) < 1e-9) break;
    const p = (sw * skt - sk * st) / det;
    if (Math.abs(p / period - 1) > 0.01) break;
    period = p;
    phase = (st - p * sk) / sw;
  }
  phase -= Math.floor(phase / period) * period;
  let all = 0;
  let on = 0;
  for (const h of hits) {
    const k = Math.round((h.t - phase) / period);
    all += weight(h);
    if (Math.abs(h.t - (phase + k * period)) <= tolerance * period) on += weight(h);
  }
  const share = all > 0 ? on / all : 0;
  const chance = 2 * tolerance;
  return { beatSeconds: period, phaseSeconds: phase, used, of: hits.length, rms, confidence: clamp((share - chance) / (1 - chance), 0, 1) };
}

function peakNear(curve, times, t, span) {
  const fs = times.length > 1 ? times[1] - times[0] : 1;
  const c = Math.round((t - times[0]) / fs);
  const w = Math.max(1, Math.round(span / fs));
  let m = 0;
  for (let i = Math.max(0, c - w); i <= Math.min(curve.length - 1, c + w); i++) if (curve[i] > m) m = curve[i];
  return m;
}

export function attackTime(samples, sampleRate, t, span = 0.06) {
  const after = Math.round(0.003 * sampleRate);
  const before = Math.round(0.012 * sampleRate);
  const step = Math.max(1, Math.round(0.001 * sampleRate));
  const from = Math.max(before, Math.round((t - span) * sampleRate));
  const to = Math.min(samples.length - after, Math.round((t + span) * sampleRate));
  let best = Math.round(t * sampleRate);
  let top = -Infinity;
  let floor = 0;
  for (let i = Math.max(0, from - before); i < Math.min(samples.length, to + after); i++) floor += samples[i] * samples[i];
  floor = (floor / Math.max(1, to - from + before + after)) * 0.01 + 1e-12;
  for (let s = from; s <= to; s += step) {
    let ea = 0;
    let eb = 0;
    for (let i = s; i < s + after; i++) ea += samples[i] * samples[i];
    for (let i = s - before; i < s; i++) eb += samples[i] * samples[i];
    const ratio = (ea / after + floor) / (eb / before + floor);
    if (ratio > top) {
      top = ratio;
      best = s;
    }
  }
  return best / sampleRate;
}

export function findHits(curves, samples, sampleRate, p = DEFAULTS, loud = null) {
  const { full, low, times, frameSeconds } = curves;
  const w = Math.max(1, Math.round(0.12 / frameSeconds));
  const peaks = (c) => {
    const out = [];
    for (let i = 1; i < c.length - 1; i++) {
      if (c[i] <= 0) continue;
      let ok = true;
      for (let j = Math.max(0, i - w); j <= Math.min(c.length - 1, i + w); j++) {
        if (c[j] > c[i] || (c[j] === c[i] && j < i)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(i);
    }
    return out;
  };
  const pf = peaks(full);
  const pl = peaks(low);
  const maxF = pf.reduce((m, i) => Math.max(m, full[i]), 0) || 1;
  const maxL = pl.reduce((m, i) => Math.max(m, low[i]), 0) || 1;
  const cands = [...pf.map((i) => ({ i, s: full[i] / maxF })), ...pl.map((i) => ({ i, s: low[i] / maxL }))].sort((a, b) => b.s - a.s);
  const build = (thr) => {
    const taken = [];
    for (const c of cands) {
      if (c.s < thr) break;
      if (taken.some((t) => Math.abs(t.i - c.i) <= w)) continue;
      taken.push(c);
    }
    return taken;
  };
  let thr = p.hitThreshold;
  let taken = build(thr);
  while (taken.length > p.maxHits && thr < 0.9) {
    thr += 0.02;
    taken = build(thr);
  }
  while (taken.length < p.minHits && thr > 0.08) {
    thr -= 0.02;
    taken = build(thr);
  }
  const hits = taken
    .map((c) => {
      const rough = times[c.i];
      const t = samples ? attackTime(samples, sampleRate, rough) : rough;
      return {
        t,
        attackLow: Math.min(1, peakNear(low, times, rough, 0.06) / maxL),
        attackFull: Math.min(1, peakNear(full, times, rough, 0.06) / maxF),
      };
    })
    .sort((a, b) => a.t - b.t);
  let out = [];
  for (const h of hits) {
    const last = out[out.length - 1];
    if (last && h.t - last.t < 0.05) {
      last.attackLow = Math.max(last.attackLow, h.attackLow);
      last.attackFull = Math.max(last.attackFull, h.attackFull);
    } else out.push(h);
  }
  let jumps = 0;
  if (loud) {
    const grid = 0.01;
    const n = Math.floor(loud.seconds / grid);
    const fullTop = percentile(loud.shortTerm, 0.95);
    const rf = new Float64Array(n);
    const la = new Float64Array(n);
    for (let i = 0; i < n; i++) la[i] = loud.lowAfter(i * grid);
    const lowTop = percentile(la, 0.95);
    for (let i = 0; i < n; i++) {
      const t = i * grid;
      const f = loud.fullAfter(t) >= fullTop - 20 ? loud.riseFull(t) : 0;
      const l = la[i] >= lowTop - 20 ? loud.riseLow(t) / LOW_JUMP : 0;
      rf[i] = Math.max(f, l);
    }
    const span = Math.round(0.5 / grid);
    for (let i = 1; i < n - 1; i++) {
      if (rf[i] < p.jumpDb) continue;
      let top = true;
      for (let j = Math.max(0, i - span); j <= Math.min(n - 1, i + span); j++) {
        if (rf[j] > rf[i] || (rf[j] === rf[i] && j < i)) {
          top = false;
          break;
        }
      }
      if (!top) continue;
      const rough = i * grid;
      if (out.some((h) => Math.abs(h.t - rough) < 0.15)) continue;
      const t = samples ? attackTime(samples, sampleRate, rough) : rough;
      out.push({ t, attackLow: Math.min(1, peakNear(low, times, rough, 0.06) / maxL), attackFull: Math.min(1, peakNear(full, times, rough, 0.06) / maxF), jump: true });
      jumps++;
    }
    out.sort((a, b) => a.t - b.t);
    for (const h of out) {
      h.riseLow = Math.max(0, loud.riseLow(h.t));
      h.riseFull = Math.max(0, loud.riseFull(h.t));
    }
  }
  return { hits: out, threshold: thr, jumps };
}

export function withStrength(raw, mode) {
  if (mode !== 'rise') return raw.map((h) => ({ t: h.t, low: h.attackLow, full: h.attackFull }));
  const topL = Math.max(1e-9, ...raw.map((h) => h.riseLow ?? 0));
  const topF = Math.max(1e-9, ...raw.map((h) => h.riseFull ?? 0));
  return raw.map((h) => ({
    t: h.t,
    low: Math.max((h.riseLow ?? 0) / topL, ATTACK_SHARE * h.attackLow),
    full: Math.max((h.riseFull ?? 0) / topF, ATTACK_SHARE * h.attackFull),
  }));
}

export function findMeter(beatSeconds, phaseSeconds, curves, seconds) {
  const { low, full, times } = curves;
  const maxL = Math.max(top(low), 1e-12);
  const maxF = Math.max(top(full), 1e-12);
  const strengths = [];
  for (let k = 0; phaseSeconds + k * beatSeconds < seconds; k++) {
    const t = phaseSeconds + k * beatSeconds;
    strengths.push(peakNear(low, times, t, 0.07) / maxL + 0.25 * (peakNear(full, times, t, 0.07) / maxF));
  }
  const score = (m) => {
    const sums = new Array(m).fill(0);
    const counts = new Array(m).fill(0);
    strengths.forEach((s, k) => {
      sums[k % m] += s;
      counts[k % m]++;
    });
    const means = sums.map((s, i) => s / (counts[i] || 1));
    const mean = means.reduce((a, b) => a + b, 0) / m || 1e-12;
    const top = Math.max(...means);
    return { m, phase: means.indexOf(top), contrast: top / mean, means: means.map((v) => v / mean) };
  };
  const four = score(4);
  const three = score(3);
  const pick = three.contrast > four.contrast * 1.3 ? three : four;
  return { beatsPerBar: pick.m, barPhase: pick.phase, four: four.contrast, three: three.contrast, means: pick.means };
}

export function localOffsets(beatSeconds, phaseSeconds, hits, seconds, { windowBeats = 32, stepBeats = 8, sigma = 0.03, reach = 0.25, minHits = 10, contrast = 1.4, deadBand = 0.05 } = {}) {
  const weight = (h) => Math.max(h.attackLow ?? h.low, h.attackFull ?? h.full);
  const points = [];
  const span = (windowBeats * beatSeconds) / 2;
  for (let c = 0; c <= seconds; c += stepBeats * beatSeconds) {
    const inside = hits.filter((h) => Math.abs(h.t - c) <= span);
    if (inside.length < minHits) continue;
    let best = { d: 0, s: -Infinity };
    let total = 0;
    let count = 0;
    for (let d = -reach * beatSeconds; d <= reach * beatSeconds + 1e-9; d += 0.004) {
      let sc = 0;
      for (const h of inside) {
        const x = (h.t - d - phaseSeconds) / beatSeconds;
        const e = (x - Math.round(x)) * beatSeconds;
        sc += weight(h) * Math.exp(-(e * e) / (2 * sigma * sigma));
      }
      total += sc;
      count++;
      if (sc > best.s) best = { d, s: sc };
    }
    if (best.s >= (contrast * total) / count) points.push({ t: c, d: best.d });
  }
  for (let i = 1; i < points.length - 1; i++) points[i].m = median([points[i - 1].d, points[i].d, points[i + 1].d]);
  for (const q of points) {
    q.d = q.m ?? q.d;
    if (Math.abs(q.d) < deadBand) q.d = 0;
  }
  const at = (t) => {
    if (points.length === 0) return 0;
    if (t <= points[0].t) return points[0].d;
    if (t >= points[points.length - 1].t) return points[points.length - 1].d;
    let i = 1;
    while (points[i].t < t) i++;
    const a = points[i - 1];
    const b = points[i];
    return a.d + ((b.d - a.d) * (t - a.t)) / (b.t - a.t);
  };
  const ds = points.map((q) => q.d);
  return { at, points: points.map((q) => ({ t: r4(q.t), d: r4(q.d) })), min: ds.length ? Math.min(...ds) : 0, max: ds.length ? Math.max(...ds) : 0 };
}

export function makeGrid(beatSeconds, phaseSeconds, beatsPerBar, barPhase, seconds, warp = null) {
  const first = phaseSeconds + barPhase * beatSeconds;
  const k0 = -Math.floor(first / beatSeconds + 1e-9) - 1;
  const beats = [];
  const bars = [];
  for (let k = k0; first + k * beatSeconds <= seconds + beatSeconds; k++) {
    const steady = first + k * beatSeconds;
    const t = r4(steady + (warp ? warp.at(steady) : 0));
    if (t < 0 || t > seconds || (beats.length && t <= beats[beats.length - 1])) continue;
    beats.push(t);
    if (((k % beatsPerBar) + beatsPerBar) % beatsPerBar === 0) bars.push(t);
  }
  return { beats, bars };
}

export function nameSections(raw) {
  const totals = {};
  for (const s of raw) totals[s.name] = (totals[s.name] || 0) + 1;
  const seen = {};
  return raw.map((s) => {
    seen[s.name] = (seen[s.name] || 0) + 1;
    return { ...s, name: totals[s.name] > 1 ? `${s.name} ${seen[s.name]}` : s.name };
  });
}

export function findSections(loud, seconds, p = DEFAULTS) {
  const { times, shortTerm, step } = loud;
  const every = Math.max(1, Math.round(0.5 / step));
  const span = Math.max(1, Math.round(1.5 / step));
  const top = percentile(shortTerm, 0.95);
  const labels = [];
  for (let i = 0; i < times.length; i += every) {
    const a = shortTerm[Math.max(0, i - span)];
    const b = shortTerm[Math.min(times.length - 1, i + span)];
    const slope = (b - a) / (2 * span * step);
    let name = shortTerm[i] >= top - p.loudDropDb ? 'loud' : 'quiet';
    if (slope >= p.slopeDbPerSecond) name = 'rising';
    else if (slope <= -p.slopeDbPerSecond) name = 'falling';
    labels.push({ t: times[i], name });
  }
  let runs = [];
  for (const l of labels) {
    const last = runs[runs.length - 1];
    if (last && last.name === l.name) last.end = l.t;
    else runs.push({ name: l.name, start: l.t, end: l.t });
  }
  for (let i = 0; i < runs.length; i++) runs[i].end = i + 1 < runs.length ? runs[i + 1].start : seconds;
  if (runs.length) runs[0].start = 0;
  const join = () => {
    const out = [];
    for (const r of runs) {
      const last = out[out.length - 1];
      if (last && last.name === r.name) last.end = r.end;
      else out.push({ ...r });
    }
    runs = out;
  };
  for (;;) {
    join();
    if (runs.length < 2) break;
    let short = -1;
    for (let i = 0; i < runs.length; i++) {
      const len = runs[i].end - runs[i].start;
      if (len < p.sectionMinSeconds && (short < 0 || len < runs[short].end - runs[short].start)) short = i;
    }
    if (short < 0) break;
    const prev = runs[short - 1];
    const next = runs[short + 1];
    if (prev && next && prev.name === next.name) runs[short].name = prev.name;
    else if (!prev) runs[short].name = next.name;
    else if (!next) runs[short].name = prev.name;
    else {
      const mid = (runs[short].start + runs[short].end) / 2;
      prev.end = mid;
      next.start = mid;
      runs.splice(short, 1);
    }
  }
  const at = (t) => shortTerm[clamp(Math.round(t / step), 0, times.length - 1)];
  for (const r of runs) {
    r.lufs = loud.level((r.start + r.end) / 2, Math.max(0.4, r.end - r.start));
    const edge = Math.min(1.5, (r.end - r.start) / 4);
    const trend = at(r.end - edge) - at(r.start + edge);
    r.name = trend >= p.trendDb ? 'rising' : trend <= -p.trendDb ? 'falling' : r.lufs >= top - p.loudDropDb ? 'loud' : 'quiet';
  }
  join();
  return nameSections(
    runs.map((r) => ({ name: r.name, start: r4(r.start), end: r4(r.end), lufs: r2(loud.level((r.start + r.end) / 2, Math.max(0.4, r.end - r.start))) }))
  );
}

export function findQuiet(loud, from, to, p = DEFAULTS) {
  const { times, shortTerm, momentary, step } = loud;
  const idx = (t) => clamp(Math.round(t / step), 0, times.length - 1);
  const a = idx(from);
  const b = idx(to);
  if (b - a < 4) return null;
  const ref = median(shortTerm.slice(a, b + 1));
  const thr = ref - p.quietDropDb;
  const side = Math.round(p.quietSideSeconds / step);
  let best = null;
  let start = -1;
  for (let i = a; i <= b + 1; i++) {
    const under = i <= b && shortTerm[i] < thr;
    if (under && start < 0) start = i;
    if (!under && start >= 0) {
      const end = i - 1;
      const inside = median(shortTerm.slice(start, end + 1));
      const left = median(shortTerm.slice(Math.max(0, start - side), start));
      const right = median(shortTerm.slice(end + 1, Math.min(times.length, end + 1 + side)));
      const ok = left - inside >= p.quietDropDb / 2 && right - inside >= p.quietDropDb / 2;
      if (ok && (!best || end - start > best.end - best.start)) best = { start, end, inside, left, right };
      start = -1;
    }
  }
  if (!best) return null;
  let s = best.start;
  let e = best.end;
  const half = Math.round(1.5 / step);
  for (let i = Math.max(0, s - half); i <= s + half && i < times.length; i++) {
    if (momentary[i] < thr) {
      s = i;
      break;
    }
  }
  for (let i = Math.min(times.length - 1, e + half); i >= e - half && i >= 0; i--) {
    if (momentary[i] < thr) {
      e = i;
      break;
    }
  }
  return { start: r4(times[s]), end: r4(times[e]), lufs: r2(best.inside), leftLufs: r2(best.left), rightLufs: r2(best.right), thresholdLufs: r2(thr) };
}

export function findLandmarks({ hits, loud, seconds, barSeconds, quiet }, p = DEFAULTS) {
  const { times, shortTerm, momentary, step } = loud;
  const idx = (t) => clamp(Math.round(t / step), 0, times.length - 1);
  const power = (h) => Math.max(h.low, h.full);
  const strong = hits.filter((h) => power(h) >= p.strongThreshold);
  const out = {};
  if (strong.length === 0) return out;
  const first = strong[0];
  const last = strong[strong.length - 1];
  const reveal = hits.reduce((a, b) => (b.low > a.low ? b : a));
  out.firstHit = first.t;
  out.revealHit = reveal.t;
  out.finalHit = last.t;
  let low = idx(first.t);
  for (let i = idx(Math.max(0, first.t - barSeconds)); i <= idx(first.t); i++) if (momentary[i] < momentary[low]) low = i;
  out.preludeEnd = times[low];
  const half = idx(seconds / 2);
  let swell = -1;
  let run = idx(first.t);
  for (let i = idx(first.t) + 1; i <= half; i++) {
    if (shortTerm[i] > shortTerm[run]) run = i;
    if (shortTerm[run] - shortTerm[i] >= 3 && times[run] - first.t > barSeconds) {
      swell = run;
      break;
    }
  }
  if (swell >= 0) out.swellPeak = times[swell];
  let peak = 0;
  for (let i = 0; i <= half; i++) if (shortTerm[i] > shortTerm[peak]) peak = i;
  let a = peak;
  let b = peak;
  while (a > 0 && shortTerm[a - 1] >= shortTerm[peak] - p.peakDropDb) a--;
  while (b < half && shortTerm[b + 1] >= shortTerm[peak] - p.peakDropDb) b++;
  out.bigPeakStart = times[a];
  out.bigPeakEnd = times[b];
  const mid = hits.filter((h) => h.t >= seconds / 3 && h.t <= (2 * seconds) / 3);
  if (mid.length) out.midHit = mid.reduce((x, y) => (y.low + y.full > x.low + x.full ? y : x)).t;
  if (quiet) {
    out.quietStart = quiet.start;
    out.quietEnd = quiet.end;
  }
  const from = idx(reveal.t);
  let dip = from;
  for (let i = from; i <= idx(last.t); i++) if (shortTerm[i] < shortTerm[dip]) dip = i;
  const sec = Math.max(1, Math.round(1 / step));
  let fade = dip;
  while (fade - sec > from && shortTerm[fade - sec] - shortTerm[fade] >= 0.5) fade--;
  out.tailFadeStart = times[fade];
  const floor = Math.max(FLOOR_LUFS + 1, percentile(momentary, 0.99) - 60);
  let end = times.length - 1;
  while (end > 0 && momentary[end] <= floor) end--;
  out.end = Math.min(seconds, times[end] + step);
  for (const k of Object.keys(out)) out[k] = r4(out[k]);
  return out;
}

export function compareLandmarks(found, config, barSeconds) {
  const out = {};
  for (const [k, c] of Object.entries(config)) {
    const m = found[k] ?? null;
    out[k] = { map: m, config: c, bars: m === null ? null : r2((m - c) / barSeconds) };
  }
  return out;
}

export function agrees(compare, keys = CHECKED) {
  return keys.every((k) => compare[k] && compare[k].bars !== null && Math.abs(compare[k].bars) <= 1);
}

export function analyse(samples, sampleRate, { configBpm = null } = {}) {
  const seconds = samples.length / sampleRate;
  const curves = onsetCurves(samples, sampleRate);
  const loud = loudnessCurves(samples, sampleRate);
  const rough = findTempo(curves, { configBpm });
  const found = findHits(curves, samples, sampleRate, DEFAULTS, loud);
  const many = findHits(curves, samples, sampleRate, { ...DEFAULTS, hitThreshold: GRID_THRESHOLD, minHits: 0, maxHits: Infinity });
  const fit = refineGrid(rough.beatSeconds, rough.phaseSeconds, many.hits);
  const meter = findMeter(fit.beatSeconds, fit.phaseSeconds, curves, seconds);
  const warp = localOffsets(fit.beatSeconds, fit.phaseSeconds, many.hits, seconds);
  return { samples, sampleRate, seconds, curves, loud, rough, raw: found.hits, threshold: found.threshold, jumps: found.jumps, fit, meter, warp };
}

export function mapFromAnalysis(an, { source, music = {}, params = DEFAULTS, seconds = an.seconds }) {
  const notes = [...an.rough.notes];
  const { fit, meter, threshold } = an;
  const hits = withStrength(an.raw, params.strength);
  const grid = makeGrid(fit.beatSeconds, fit.phaseSeconds, meter.beatsPerBar, meter.barPhase, seconds, an.warp);
  const barSeconds = fit.beatSeconds * meter.beatsPerBar;
  const sections = findSections(an.loud, seconds, params);
  const power = (h) => Math.max(h.low, h.full);
  const strong = hits.filter((h) => power(h) >= params.strongThreshold);
  const reveal = hits.length ? hits.reduce((a, b) => (b.low > a.low ? b : a)) : null;
  const quiet = strong.length && reveal && reveal.t > strong[0].t ? findQuiet(an.loud, strong[0].t, reveal.t, params) : null;
  const found = findLandmarks({ hits, loud: an.loud, seconds, barSeconds, quiet }, params);
  const compare = compareLandmarks(found, music.landmarks || {}, barSeconds);
  const map = {
    schema: SCHEMA,
    madeFrom: 'audio',
    source,
    tempo: {
      bpm: r2(60 / fit.beatSeconds),
      beatSeconds: r4(fit.beatSeconds),
      beatsPerBar: meter.beatsPerBar,
      barSeconds: r4(barSeconds),
      confidence: r2(fit.confidence),
      configBpm: music.bpm ?? null,
    },
    beats: grid.beats,
    bars: grid.bars,
    hits: hits.map((h) => ({ t: r4(h.t), low: r2(h.low), full: r2(h.full) })),
    sections,
    quiet: quiet ? { start: quiet.start, end: quiet.end } : null,
    landmarks: found,
    compare,
    usedConfigFor: [],
    tries: [],
    notes,
  };
  return { map, detail: { fit, meter, threshold, quiet, warp: an.warp, strongCount: strong.length, jumps: an.jumps, strength: params.strength, raw: an.raw } };
}

export function buildMap(an, { source, music = {}, tries = TRIES, defaults = DEFAULTS }) {
  const log = [];
  let chosen = null;
  let first = null;
  for (let i = 0; i < tries.length; i++) {
    const params = { ...defaults, ...tries[i].params };
    const made = mapFromAnalysis(an, { source, music, params, seconds: source.seconds ?? an.seconds });
    const ok = music.landmarks ? agrees(made.map.compare) : true;
    const row = { try: i + 1, changed: tries[i].changed };
    for (const k of CHECKED) row[k] = made.map.landmarks[k] ?? null;
    row.agrees = ok;
    log.push(row);
    if (!first) first = made;
    if (ok) {
      chosen = made;
      break;
    }
  }
  const out = chosen || first;
  const map = out.map;
  map.tries = log;
  map.notes.push(
    out.detail.strength === 'rise'
      ? `Hit strength is the larger of two readings. One is the rise in level, the ${RISE_AFTER} s after the attack against the ${RISE_BEFORE} s before it, in dB, over the largest rise of the track in that band. The other is ${ATTACK_SHARE} times the size of the attack, the spectral flux over the largest of the track in that band. So a strike out of near silence can reach 1 and the sharpest drum inside a loud passage reaches ${ATTACK_SHARE}.`
      : 'Hit strength is the size of the attack: the spectral flux at the hit over the largest of the track in that band.'
  );
  map.notes.push(
    `A hit is listed where the attack in either band is at least ${out.detail.threshold.toFixed(2)} of the sharpest attack of the track, or where the level jumps with no sharp attack, by ${defaults.jumpDb} dB or more across the whole band or ${defaults.jumpDb * LOW_JUMP} dB or more in the low band (${out.detail.jumps} such). The threshold moves until between ${defaults.minHits} and ${defaults.maxHits} attacks are listed.`
  );
  if (!chosen && music.landmarks) {
    for (const k of CHECKED) {
      const c = map.compare[k];
      if (!c || c.bars === null || Math.abs(c.bars) > 1) {
        map.landmarks[k] = music.landmarks[k];
        map.usedConfigFor.push(k);
      }
    }
    if (map.usedConfigFor.includes('quietStart') || map.usedConfigFor.includes('quietEnd')) {
      map.quiet = { start: map.landmarks.quietStart, end: map.landmarks.quietEnd };
    }
    map.notes.push(
      `After ${log.length} tries the map still disagreed with music.landmarks by more than a bar at ${map.usedConfigFor.join(', ')}. The config values stand in for those points. The compare table keeps what was measured.`
    );
  }
  const fit = out.detail.fit;
  map.notes.push(
    `The tempo is one steady fit to the whole file. ${fit.used} of ${fit.of} attacks sit within 8 percent of a beat of it${fit.rms === null ? '' : `, ${(fit.rms * 1000).toFixed(0)} ms rms from it`}. Confidence is that share, weighted by strength, over what chance would give.`
  );
  const warp = out.detail.warp;
  const moved = warp ? warp.points.filter((q) => q.d !== 0) : [];
  if (moved.length) {
    map.notes.push(
      `The music does not hold the steady grid everywhere. Where the attacks over 32 beats sit 50 ms or more from it, the beats and bar lines are moved to them: from ${moved[0].t} s to ${moved[moved.length - 1].t} s by ${Math.round(Math.min(...moved.map((q) => q.d)) * 1000)} to ${Math.round(Math.max(...moved.map((q) => q.d)) * 1000)} ms, joined to the steady grid by straight lines. So the gap between two beats there is not always tempo.beatSeconds. A smaller drift is left alone.`
    );
  } else if (warp) {
    map.notes.push('The attacks stay within 50 ms of the steady grid wherever enough of them were found, so the beats and bar lines are the steady grid.');
  }
  const off = STRIKES.filter((k) => typeof map.landmarks[k] === 'number').map((k) => {
    const t = map.landmarks[k];
    const beat = map.beats.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    const bar = map.bars.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    const ms = Math.round((t - beat) * 1000);
    return `${k} at ${t} is ${Math.abs(ms)} ms ${ms < 0 ? 'before' : 'after'} the nearest beat${beat === bar ? ', which is bar line ' + map.bars.indexOf(bar) : ''}`;
  });
  if (off.length) map.notes.push(`The strikes against the grid: ${off.join('. ')}. A strike that is far from a beat is its own accent: cut to the hit, not to the bar line.`);
  const ordered = {};
  for (const k of Object.keys(music.landmarks || map.landmarks)) if (k in map.landmarks) ordered[k] = map.landmarks[k];
  for (const k of Object.keys(map.landmarks)) if (!(k in ordered)) ordered[k] = map.landmarks[k];
  map.landmarks = ordered;
  return { map, detail: out.detail };
}

export function mapFromLandmarks(music) {
  const lm = music.landmarks;
  const seconds = music.seconds;
  const bar = music.barSeconds;
  const perBar = 4;
  const beat = bar / perBar;
  const k0 = -Math.floor(lm.firstHit / beat + 1e-9);
  const beats = [];
  const bars = [];
  for (let k = k0; lm.firstHit + k * beat <= seconds + 1e-9; k++) {
    const t = r4(lm.firstHit + k * beat);
    beats.push(t);
    if (((k % perBar) + perBar) % perBar === 0) bars.push(t);
  }
  const edges = [
    ['quiet', 0, lm.preludeEnd],
    ['rising', lm.preludeEnd, lm.swellPeak],
    ['loud', lm.swellPeak, lm.quietStart],
    ['quiet', lm.quietStart, lm.quietEnd],
    ['rising', lm.quietEnd, lm.revealHit],
    ['loud', lm.revealHit, lm.tailFadeStart],
    ['falling', lm.tailFadeStart, seconds],
  ];
  const compare = compareLandmarks(lm, lm, bar);
  return {
    schema: SCHEMA,
    madeFrom: 'landmarks',
    source: { file: music.file, sha256: music.sha256, seconds, sampleRate: null, channels: null },
    tempo: { bpm: r2(music.bpm), beatSeconds: r4(beat), beatsPerBar: perBar, barSeconds: r4(bar), confidence: 0, configBpm: music.bpm },
    beats,
    bars,
    hits: STRIKES.map((k) => ({ t: r4(lm[k]), low: 1, full: 1 })).sort((a, b) => a.t - b.t),
    sections: nameSections(edges.map(([name, start, end]) => ({ name, start: r4(start), end: r4(end), lufs: null }))),
    quiet: { start: r4(lm.quietStart), end: r4(lm.quietEnd) },
    landmarks: { ...lm },
    compare,
    usedConfigFor: Object.keys(lm),
    tries: [],
    notes: [
      'No music file was read. This map is written from music.landmarks in the config.',
      'Bar lines stand every music.barSeconds counted from firstHit in both directions. A beat is a quarter of that bar, so every bar line is also a beat. music.bpm is reported as the tempo.',
      'The hits are the four strikes among the landmarks. Their strengths were not measured and are written as 1.',
      'Section loudness was not measured and is null.',
    ],
  };
}

export function checkMap(map) {
  const bad = [];
  const need = ['schema', 'madeFrom', 'source', 'tempo', 'beats', 'bars', 'hits', 'sections', 'quiet', 'landmarks', 'compare', 'usedConfigFor', 'tries', 'notes'];
  for (const k of need) if (!(k in map)) bad.push(`${k} is missing`);
  if (bad.length) return bad;
  if (map.schema !== SCHEMA) bad.push('schema is wrong');
  if (!['audio', 'landmarks'].includes(map.madeFrom)) bad.push('madeFrom is wrong');
  const rising = (a) => a.every((v, i) => i === 0 || v > a[i - 1]);
  if (!rising(map.beats)) bad.push('beats do not ascend');
  if (!rising(map.bars)) bad.push('bars do not ascend');
  const set = new Set(map.beats);
  if (!map.bars.every((b) => set.has(b))) bad.push('a bar line is not a beat');
  if (map.beats.some((b) => b < 0 || b > map.source.seconds)) bad.push('a beat lies outside the file');
  for (const h of map.hits) if (!(h.low >= 0 && h.low <= 1 && h.full >= 0 && h.full <= 1 && Number.isFinite(h.t))) bad.push(`hit at ${h.t} is out of range`);
  if (!rising(map.hits.map((h) => h.t))) bad.push('hits do not ascend');
  const s = map.sections;
  if (s.length === 0 || s[0].start !== 0 || s[s.length - 1].end !== map.source.seconds) bad.push('sections do not cover the file');
  for (let i = 1; i < s.length; i++) if (s[i].start !== s[i - 1].end) bad.push(`a gap before section ${s[i].name}`);
  if (new Set(s.map((x) => x.name)).size !== s.length) bad.push('a section name repeats');
  for (const k of ['bpm', 'beatSeconds', 'beatsPerBar', 'barSeconds', 'confidence', 'configBpm']) if (!(k in map.tempo)) bad.push(`tempo.${k} is missing`);
  return bad;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function plotSvg(map, curves = null, { from = 0, to = null, width = 2400, height = 900, pxPerSecond = null, configLandmarks = null } = {}) {
  const end = to ?? map.source.seconds;
  const left = 70;
  const right = 30;
  const w = pxPerSecond ? Math.round(left + right + (end - from) * pxPerSecond) : width;
  const x = (t) => left + ((t - from) / (end - from)) * (w - left - right);
  const inView = (t) => t >= from && t <= end;
  const C = { ground: '#151210', ink: '#e8dfd2', dim: '#8a7f72', bar: '#3a332c', st: '#e9b872', mo: '#7d6a4f', full: '#9fb4c7', low: '#d9694a', cfg: '#6fc3a8', map: '#f2d14b', sec: '#221d19' };
  const rows = { sec: [40, 70], loud: [90, 380], full: [400, 560], low: [580, 740], hits: [760, 850] };
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" font-family="DejaVu Sans, Arial, sans-serif">`);
  o.push(`<rect width="${w}" height="${height}" fill="${C.ground}"/>`);
  o.push(`<text x="${left}" y="24" fill="${C.ink}" font-size="16">${esc(map.source.file)} · ${map.tempo.bpm} beats a minute · ${map.tempo.beatsPerBar} beats to a bar · made from ${esc(map.madeFrom)} · ${from} s to ${r2(end)} s</text>`);
  map.sections.forEach((s, i) => {
    if (s.end < from || s.start > end) return;
    const a = x(Math.max(from, s.start));
    const b = x(Math.min(end, s.end));
    o.push(`<rect x="${a.toFixed(1)}" y="${rows.sec[0]}" width="${Math.max(0, b - a - 1).toFixed(1)}" height="${rows.sec[1] - rows.sec[0]}" fill="${i % 2 ? '#2b2520' : '#372f28'}"/>`);
    o.push(`<text x="${(a + 5).toFixed(1)}" y="${rows.sec[0] + 20}" fill="${C.ink}" font-size="13">${esc(s.name)}${s.lufs === null ? '' : ` ${s.lufs}`}</text>`);
  });
  map.bars.forEach((t, i) => {
    if (!inView(t)) return;
    o.push(`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${rows.loud[0]}" y2="${rows.hits[1]}" stroke="${C.bar}" stroke-width="1"/>`);
    if (i % 4 === 0) o.push(`<text x="${(x(t) + 2).toFixed(1)}" y="${rows.loud[0] - 4}" fill="${C.dim}" font-size="11">${i}</text>`);
  });
  if (map.quiet) {
    const a = x(Math.max(from, map.quiet.start));
    const b = x(Math.min(end, map.quiet.end));
    if (b > a) o.push(`<rect x="${a.toFixed(1)}" y="${rows.loud[0]}" width="${(b - a).toFixed(1)}" height="${rows.loud[1] - rows.loud[0]}" fill="#ffffff" opacity="0.06"/>`);
  }
  const line = (ts, vs, lo, hi, row, colour, sw = 1.5) => {
    const pts = [];
    const stride = Math.max(1, Math.floor(ts.length / ((w - left - right) * 2) / ((map.source.seconds || end) / (end - from)) ));
    for (let i = 0; i < ts.length; i += stride) {
      if (!inView(ts[i])) continue;
      let v = vs[i];
      for (let j = i; j < Math.min(ts.length, i + stride); j++) if (vs[j] > v) v = vs[j];
      const y = row[1] - clamp((v - lo) / (hi - lo), 0, 1) * (row[1] - row[0]);
      pts.push(`${x(ts[i]).toFixed(1)},${y.toFixed(1)}`);
    }
    if (pts.length > 1) o.push(`<polyline fill="none" stroke="${colour}" stroke-width="${sw}" points="${pts.join(' ')}"/>`);
  };
  const label = (row, text, colour) => o.push(`<text x="6" y="${row[0] + 14}" fill="${colour}" font-size="12">${esc(text)}</text>`);
  if (curves) {
    const hi = Math.ceil(top(curves.loud.momentary) / 6) * 6;
    const lo = hi - 54;
    for (let v = lo; v <= hi; v += 6) {
      const y = rows.loud[1] - ((v - lo) / (hi - lo)) * (rows.loud[1] - rows.loud[0]);
      o.push(`<line x1="${left}" x2="${w - right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.sec}" stroke-width="1"/>`);
      o.push(`<text x="${left - 6}" y="${(y + 4).toFixed(1)}" fill="${C.dim}" font-size="11" text-anchor="end">${v}</text>`);
    }
    line(curves.loud.times, curves.loud.momentary, lo, hi, rows.loud, C.mo, 1);
    line(curves.loud.times, curves.loud.shortTerm, lo, hi, rows.loud, C.st, 2);
    const mf = top(curves.onset.full) || 1;
    const ml = top(curves.onset.low) || 1;
    line(curves.onset.times, curves.onset.full, 0, mf, rows.full, C.full, 1);
    line(curves.onset.times, curves.onset.low, 0, ml, rows.low, C.low, 1);
  }
  label(rows.loud, 'loudness', C.st);
  label([rows.loud[0] + 16], '3 s and 0.4 s', C.dim);
  label(rows.full, 'onsets, full', C.full);
  label(rows.low, 'onsets, low', C.low);
  label(rows.hits, 'hits', C.ink);
  o.push(`<line x1="${left}" x2="${w - right}" y1="${rows.hits[1]}" y2="${rows.hits[1]}" stroke="${C.dim}" stroke-width="1"/>`);
  for (const h of map.hits) {
    if (!inView(h.t)) continue;
    const span = rows.hits[1] - rows.hits[0];
    o.push(`<line x1="${(x(h.t) - 1).toFixed(1)}" x2="${(x(h.t) - 1).toFixed(1)}" y1="${rows.hits[1]}" y2="${(rows.hits[1] - h.full * span).toFixed(1)}" stroke="${C.full}" stroke-width="2"/>`);
    o.push(`<line x1="${(x(h.t) + 1).toFixed(1)}" x2="${(x(h.t) + 1).toFixed(1)}" y1="${rows.hits[1]}" y2="${(rows.hits[1] - h.low * span).toFixed(1)}" stroke="${C.low}" stroke-width="2"/>`);
  }
  const marks = (set, colour, y, dash) => {
    Object.entries(set || {}).forEach(([k, t], i) => {
      if (t === null || !inView(t)) return;
      o.push(`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${rows.loud[0]}" y2="${rows.hits[1]}" stroke="${colour}" stroke-width="1.5" stroke-dasharray="${dash}" opacity="0.9"/>`);
      o.push(`<text x="${(x(t) + 3).toFixed(1)}" y="${y + (i % 3) * 13}" fill="${colour}" font-size="11">${esc(k)}</text>`);
    });
  };
  marks(configLandmarks, C.cfg, rows.loud[0] + 14, '6 4');
  marks(map.landmarks, C.map, rows.loud[1] - 34, 'none');
  const tick = end - from > 120 ? 10 : 5;
  for (let t = Math.ceil(from / tick) * tick; t <= end; t += tick) {
    o.push(`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${rows.hits[1]}" y2="${rows.hits[1] + 6}" stroke="${C.dim}"/>`);
    o.push(`<text x="${x(t).toFixed(1)}" y="${rows.hits[1] + 20}" fill="${C.ink}" font-size="12" text-anchor="middle">${t} s</text>`);
  }
  o.push(`<text x="${left}" y="${height - 10}" fill="${C.cfg}" font-size="12">dashed: music.landmarks in the config</text>`);
  o.push(`<text x="${left + 300}" y="${height - 10}" fill="${C.map}" font-size="12">solid: the map's own landmarks</text>`);
  o.push(`<text x="${left + 560}" y="${height - 10}" fill="${C.dim}" font-size="12">faint lines: bar lines, numbered every fourth</text>`);
  o.push('</svg>');
  return o.join('\n');
}
