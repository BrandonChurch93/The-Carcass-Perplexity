// The two small pictures the ground is painted from, made on the processor and repeated: the salt's polygon plates and a grain.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

function finish(data: Uint8Array, n: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  // Nearest of the smaller copies, not a blend of two: the renderer is software, and a blend costs twice the reads for a grain that hides the seam.
  t.minFilter = THREE.LinearMipmapNearestFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.needsUpdate = true;
  return t;
}

// Heights to a picture: red the height, green a second value, blue and alpha the slope of the height along x and y (0.5 is level).
function pack(n: number, h: Float32Array, second: Float32Array, slope: number): THREE.DataTexture {
  const data = new Uint8Array(n * n * 4);
  const b = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const dx = (h[j * n + ((i + 1) % n)] as number) - (h[j * n + ((i + n - 1) % n)] as number);
      const dy = (h[((j + 1) % n) * n + i] as number) - (h[((j + n - 1) % n) * n + i] as number);
      data[k * 4] = b(h[k] as number);
      data[k * 4 + 1] = b(second[k] as number);
      data[k * 4 + 2] = b(0.5 + dx * slope);
      data[k * 4 + 3] = b(0.5 + dy * slope);
    }
  }
  return finish(data, n);
}

/** Polygon plates: red 1 on the raised rim between two plates and 0 in a plate's middle, green a number for each plate. `cells` plates across. */
export function bakePlates(rng: Rng, n = 512, cells = 9): THREE.DataTexture {
  const px = new Float32Array(cells * cells);
  const py = new Float32Array(cells * cells);
  const id = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) {
    px[i] = rng.range(0.12, 0.88);
    py[i] = rng.range(0.12, 0.88);
    id[i] = rng.next();
  }
  const h = new Float32Array(n * n);
  const second = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / n) * cells;
      const y = (j / n) * cells;
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      let d1 = 9;
      let d2 = 9;
      let who = 0;
      let ax = 0;
      let ay = 0;
      let bx = 0;
      let by = 0;
      for (let v = -1; v <= 1; v++) {
        for (let u = -1; u <= 1; u++) {
          const c = ((yi + v + cells) % cells) * cells + ((xi + u + cells) % cells);
          const qx = xi + u + (px[c] as number) - x;
          const qy = yi + v + (py[c] as number) - y;
          const d = qx * qx + qy * qy;
          if (d < d1) {
            d2 = d1;
            bx = ax;
            by = ay;
            d1 = d;
            ax = qx;
            ay = qy;
            who = c;
          } else if (d < d2) {
            d2 = d;
            bx = qx;
            by = qy;
          }
        }
      }
      // Distance to the line between the two nearest plates.
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const edge = Math.abs((mx * (bx - ax) + my * (by - ay)) / len);
      const rim = Math.exp(-((edge / 0.07) ** 2)) * 0.75 + Math.exp(-((edge / 0.2) ** 2)) * 0.25;
      h[j * n + i] = rim;
      second[j * n + i] = id[who] as number;
    }
  }
  return pack(n, h, second, 6);
}

/** Grain: red a soft field of four sizes, green a field of small pits unlike it. */
export function bakeGrain(rng: Rng, n = 256): THREE.DataTexture {
  const field = (period: number): ((x: number, y: number) => number) => {
    const g = new Float32Array(period * period);
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    return (x, y) => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const fx = x - xi;
      const fy = y - yi;
      const u = fx * fx * (3 - 2 * fx);
      const v = fy * fy * (3 - 2 * fy);
      const a = g[(yi % period) * period + (xi % period)] as number;
      const b = g[(yi % period) * period + ((xi + 1) % period)] as number;
      const c = g[((yi + 1) % period) * period + (xi % period)] as number;
      const d = g[((yi + 1) % period) * period + ((xi + 1) % period)] as number;
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  };
  const a = [field(4), field(8), field(16), field(32), field(64)];
  const p = [field(24), field(48)];
  const h = new Float32Array(n * n);
  const second = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const y = j / n;
      let sum = 0;
      let amp = 0.5;
      for (let o = 0; o < a.length; o++) {
        sum += amp * (a[o] as (x: number, y: number) => number)(x * 4 * 2 ** o, y * 4 * 2 ** o);
        amp *= 0.55;
      }
      h[j * n + i] = sum / 1.05;
      const pit = (p[0] as (x: number, y: number) => number)(x * 24, y * 24) * 0.6 + (p[1] as (x: number, y: number) => number)(x * 48, y * 48) * 0.4;
      second[j * n + i] = Math.max(0, Math.min(1, (pit - 0.3) * 2.4));
    }
  }
  return pack(n, h, second, 5);
}

/** Ripples: two unlike fields of small crossing wavelets that repeat without a seam. Red and green are the slopes of the first along x and y,
 *  blue and alpha of the second (0.5 is level; the spread is about 0.15). `least` to `most` crests across the tile. */
export function bakeRipple(rng: Rng, n = 512, least = 7, most = 44): THREE.DataTexture {
  const data = new Uint8Array(n * n * 4);
  const b = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let set = 0; set < 2; set++) {
    const waves = 54;
    const kx = new Float32Array(waves);
    const ky = new Float32Array(waves);
    const amp = new Float32Array(waves);
    const ph = new Float32Array(waves);
    let power = 0;
    for (let w = 0; w < waves; w++) {
      // Whole numbers of crests across the tile, so it meets itself; short wavelets are the lower ones.
      const a = rng.range(0, Math.PI * 2);
      const k = least * Math.pow(most / least, rng.next());
      kx[w] = Math.round(Math.cos(a) * k);
      ky[w] = Math.round(Math.sin(a) * k);
      const len = Math.hypot(kx[w] as number, ky[w] as number) || 1;
      // Slope of one wavelet: its height (falling with its number of crests) times that number.
      amp[w] = Math.pow(len / least, -0.35);
      ph[w] = rng.range(0, Math.PI * 2);
      power += (amp[w] as number) ** 2 * 0.5;
    }
    const norm = 0.42 / Math.sqrt(power);
    // Each wavelet is a product of one table along x and one along y: cos(a + b) from four tables.
    const cx = new Float32Array(waves * n);
    const sx = new Float32Array(waves * n);
    for (let w = 0; w < waves; w++) {
      for (let i = 0; i < n; i++) {
        cx[w * n + i] = Math.cos(((kx[w] as number) * i * Math.PI * 2) / n + (ph[w] as number));
        sx[w * n + i] = Math.sin(((kx[w] as number) * i * Math.PI * 2) / n + (ph[w] as number));
      }
    }
    const cy = new Float32Array(waves);
    const sy = new Float32Array(waves);
    for (let j = 0; j < n; j++) {
      for (let w = 0; w < waves; w++) {
        cy[w] = Math.cos(((ky[w] as number) * j * Math.PI * 2) / n);
        sy[w] = Math.sin(((ky[w] as number) * j * Math.PI * 2) / n);
      }
      for (let i = 0; i < n; i++) {
        let gx = 0;
        let gy = 0;
        for (let w = 0; w < waves; w++) {
          const c = (cx[w * n + i] as number) * (cy[w] as number) - (sx[w * n + i] as number) * (sy[w] as number);
          const len = Math.hypot(kx[w] as number, ky[w] as number) || 1;
          gx += ((c * (amp[w] as number) * (kx[w] as number)) / len);
          gy += ((c * (amp[w] as number) * (ky[w] as number)) / len);
        }
        // Crests are sharper than troughs: the slope is steepened where it is already steep.
        const m = Math.hypot(gx, gy) * norm;
        const sharp = (0.7 + 0.6 * m) * norm;
        const k = (j * n + i) * 4 + set * 2;
        data[k] = b(0.5 + gx * sharp * 0.5);
        data[k + 1] = b(0.5 + gy * sharp * 0.5);
      }
    }
  }
  const t = finish(data, n);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
