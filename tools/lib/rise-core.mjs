export function monotone(ts, ys, startSlope = 0, endSlope = 0) {
  const n = ts.length;
  const h = [];
  const d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] > 0) {
      const a = 2 * h[i] + h[i - 1];
      const b = h[i] + 2 * h[i - 1];
      m[i] = (a + b) / (a / d[i - 1] + b / d[i]);
    }
  }
  const fit = (slope, secant) => (slope * secant <= 0 ? 0 : Math.sign(secant) * Math.min(Math.abs(slope), 3 * Math.abs(secant)));
  m[0] = fit(startSlope, d[0]);
  m[n - 1] = fit(endSlope, d[n - 2]);
  return (t) => {
    if (t <= ts[0]) return ys[0];
    if (t >= ts[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > ts[i + 1]) i++;
    const s = (t - ts[i]) / h[i];
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}

function quintic(t0, t1, z0, z1, v0, v1, a0, a1) {
  const h = t1 - t0;
  return (t) => {
    const s = (t - t0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const s4 = s3 * s;
    const s5 = s4 * s;
    return (
      (1 - 10 * s3 + 15 * s4 - 6 * s5) * z0 +
      (s - 6 * s3 + 8 * s4 - 3 * s5) * h * v0 +
      (0.5 * s2 - 1.5 * s3 + 1.5 * s4 - 0.5 * s5) * h * h * a0 +
      (0.5 * s3 - s4 + 0.5 * s5) * h * h * a1 +
      (-4 * s3 + 7 * s4 - 3 * s5) * h * v1 +
      (10 * s3 - 15 * s4 + 6 * s5) * z1
    );
  };
}

export function riseSpeeds(frames, heights, endSpeed = 0) {
  const n = frames.length;
  const v = new Array(n).fill(0);
  v[n - 1] = endSpeed;
  for (let i = n - 2; i >= 0; i--) v[i] = (2 * (heights[i + 1] - heights[i])) / (frames[i + 1] - frames[i]) - v[i + 1];
  return v;
}

const launchArea = (k) => 3 / (2 * k + 1) - 2 / (3 * k + 1);

export function riseLaunch(t0, t1, z0, z1, v0, v1) {
  const n = t1 - t0;
  const share = ((z1 - z0) / n - v0) / (v1 - v0);
  if (!(v1 > v0) || !(v0 >= 0) || !(share > 0.02) || !(share <= 0.5)) {
    throw new Error(`the rise cannot leave at ${v0} a frame and reach ${v1} a frame over ${n} frames while climbing ${(z1 - z0).toFixed(4)}`);
  }
  let low = 1;
  let high = 80;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (launchArea(mid) > share) low = mid;
    else high = mid;
  }
  const k = (low + high) / 2;
  return (t) => {
    const s = Math.min(1, Math.max(0, (t - t0) / n));
    return z0 + n * (v0 * s + (v1 - v0) * ((3 * s ** (2 * k + 1)) / (2 * k + 1) - (2 * s ** (3 * k + 1)) / (3 * k + 1)));
  };
}

export const RISE_FALLBACK_START = 1.5;

export function riseCurve(start, frames, heights, { launch = null, endSpeed = 0 } = {}) {
  if (frames[0] <= start) throw new Error(`the first key of the rise is at frame ${frames[0]}, not after its first frame ${start}`);
  const speeds = riseSpeeds(frames, heights, endSpeed);
  const ts = [start, ...frames];
  if (speeds.some((v) => v < 0)) {
    if (launch) throw new Error('the keys of the rise ask it to go backwards, so it cannot leave at a set height and speed');
    const zs = [heights[0] - RISE_FALLBACK_START, ...heights];
    return { at: monotone(ts, zs), start: zs[0], speeds: null };
  }
  const zs = [launch ? launch.height : heights[0] - (speeds[0] * (frames[0] - start)) / 2, ...heights];
  const vs = [launch ? launch.speed : 0, ...speeds];
  const as = ts.map((_, i) => {
    if (i === 0 || i === ts.length - 1) return 0;
    if (vs[i] >= vs[i - 1] && vs[i] >= vs[i + 1]) return 0;
    return (vs[i + 1] - vs[i - 1]) / (ts[i + 1] - ts[i - 1]);
  });
  const pieces = frames.map((_, i) => quintic(ts[i], ts[i + 1], zs[i], zs[i + 1], vs[i], vs[i + 1], as[i], as[i + 1]));
  if (launch) pieces[0] = riseLaunch(ts[0], ts[1], zs[0], zs[1], vs[0], vs[1]);
  const last = ts.length - 1;
  const at = (t) => {
    if (t <= ts[0]) return zs[0];
    if (t >= ts[last]) return zs[last];
    let i = 0;
    while (t > ts[i + 1]) i++;
    return pieces[i](t);
  };
  return { at, start: zs[0], speeds: vs };
}

export function risePath({ start, frames, windows, cover = 1, creep = 0, creepFrames = 900, startWidth = null, startSpeed = 0, endSpeed = 0, endFrames = 900, hold = null }) {
  const launch = startWidth === null ? null : { height: Math.log(startWidth), speed: startSpeed };
  const curve = riseCurve(start, frames, windows.map((w) => Math.log(w.w * cover)), { launch, endSpeed });
  const ts = [start, ...frames];
  const first = windows[0];
  const cx = monotone(ts, [first.x + first.w / 2, ...windows.map((w) => w.x + w.w / 2)]);
  const cy = monotone(ts, [first.y + first.h / 2, ...windows.map((w) => w.y + w.h / 2)]);
  const last = frames[frames.length - 1];
  const at = (frame) => {
    const f = Math.max(start, frame);
    let z = curve.at(f);
    let x = cx(f);
    let y = cy(f);
    if (f > last) {
      if (creep > 0) {
        const u = (f - last) / creepFrames;
        z += (creep * u * u) / (1 + u * u);
      }
      if (endSpeed > 0) z += endSpeed * endFrames * (1 - Math.exp(-(f - last) / endFrames));
      if (hold) {
        const u = Math.min(1, (f - last) / hold.frames);
        const ease = u * u * (3 - 2 * u);
        x += (hold.x - x) * ease;
        y += (hold.y - y) * ease;
      }
    }
    return { cx: x, cy: y, w: Math.exp(z) };
  };
  return { at, startWidth: Math.exp(curve.start), speeds: curve.speeds };
}

export function riseFaults(heights, { first = 0, maxTurn = 0.25, still = 0.002 } = {}) {
  const faults = [];
  const steps = [];
  for (let i = 1; i < heights.length; i++) {
    const a = heights[i - 1];
    const b = heights[i];
    if (!(a > 0) || !(b > 0)) {
      faults.push(`The camera has no height above zero at frame ${first + i - (a > 0 ? 0 : 1)}.`);
      return faults;
    }
    if (b < a) faults.push(`The camera falls from ${a.toPrecision(6)} to ${b.toPrecision(6)} at frame ${first + i}.`);
    steps.push(Math.log(b / a));
  }
  for (let i = 1; i < steps.length; i++) {
    const turn = Math.abs(steps[i] - steps[i - 1]);
    const room = Math.max(still, maxTurn * Math.max(Math.abs(steps[i]), Math.abs(steps[i - 1])));
    if (turn > room) faults.push(`The camera jumps at frame ${first + i + 1}: its climb changes from ${(steps[i - 1] * 100).toFixed(2)} to ${(steps[i] * 100).toFixed(2)} percent a frame.`);
  }
  return faults;
}
