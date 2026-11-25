// The coat of a wallower: coarse hair in wet locks, sparse enough that the creased hide shows between them.
// Each lock is a few blades whose roots stand on the skin and whose ends come together; the roots follow the skin as it moves.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';
import { BODY_RINGS, BODY_SIDES, type Animal } from './animal';
import type { Skin } from './skin';

const VERTEX = /* glsl */ `
attribute vec3 aDir;
attribute vec4 aBlade;
attribute vec3 aSkinNormal;
attribute float aTint;
varying float vTint;
varying float vSalt;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying float vAcross;
varying float vAlong;
void main() {
  // aBlade: which corner (-1, 1 at the root; 0 at the end), half width, a number of its own, the height of the wet line.
  vec3 toCam = normalize(cameraPosition - position);
  vec3 side = normalize(cross(aDir, toCam) + 1e-5);
  vec3 p = position + side * aBlade.x * aBlade.y;
  vAlong = fract(aBlade.z);
  vWorld = p;
  vNormal = normalize(aSkinNormal + 0.35 * aDir);
  vBlade = aBlade;
  vTint = mod(aTint, 100.0);
  vSalt = floor(aTint / 100.0) * 0.25;
  vAcross = aBlade.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying float vAcross;
varying float vAlong;
varying float vTint;
varying float vSalt;
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  // A hair is round: at the edge of the trunk it does not turn its side to the sky as the hide does.
  vec3 n = normalize(normalize(vNormal) + 0.7 * v);
  // 1 at the root, 0 at the end.
  float root = 1.0 - vAlong;
  float tone = fract(floor(vBlade.z) * 0.137);
  // Grey brown, darker in the lock, salt-pale at the dry end.
  vec3 albedo = mix(vec3(0.105, 0.088, 0.07), vec3(0.04, 0.031, 0.025), root * mix(1.0, 0.45, min(1.0, vSalt))) * (0.7 + 0.6 * tone) * vTint;
  float wet = 1.0 - smoothstep(vBlade.w - 0.1, vBlade.w + 0.25, vWorld.y);
  albedo = mix(albedo, albedo * vec3(0.8, 0.56, 0.48) + vec3(0.008, 0.001, 0.001), wet);
  // Salt dries on the ends of the ropes.
  // Salt dries on the ropes, on some whole and on others not at all: a crust, not a white point on every hair.
  albedo = mix(albedo, vec3(0.3, 0.27, 0.245), min(1.0, vSalt) * 0.75 * smoothstep(0.08, 0.4, vAlong) * smoothstep(0.45, 0.6, tone));
  float soaked = 1.0 - smoothstep(0.03, 0.25, vWorld.y);
  albedo = mix(albedo, vec3(0.07, 0.02, 0.014), soaked * 0.8);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(1.0, 0.85, wet), 0.4 + 0.6 * (1.0 - root));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

interface Lock {
  /** Its blades: for each, the vertex of the skin it stands by, the next one round the trunk, the next one along it, how far toward each, and its own share of the length. */
  roots: number[];
  /** The vertex its direction is taken at, and its neighbours along the trunk. */
  at: number;
  fore: number;
  aft: number;
  length: number;
  /** How far it stands off the skin (0 lies along it, 1 stands straight out), how far it hangs. */
  stand: number;
  hang: number;
  swirl: number;
}

export class Hair {
  readonly mesh: THREE.Mesh;
  private readonly locks: Lock[] = [];
  private readonly position: Float32Array;
  private readonly dir: Float32Array;
  private readonly skinNormal: Float32Array;
  private readonly attrs: THREE.BufferAttribute[];
  private readonly material: THREE.ShaderMaterial;

  /** `coats`: for each animal, how many locks, how long (metres), how wide a blade is at the root (metres) and the height of its wet line. */
  constructor(
    ctx: Context,
    private readonly skin: Skin,
    coats: { animal: Animal; locks: number; length: number; width: number; wet: number; stand: number; tint: number; bare: number; fall?: number; salt?: number }[],
    name: string,
  ) {
    const rng = ctx.rng(name);
    const blade: number[] = [];
    const tint: number[] = [];
    const index: number[] = [];
    const w = BODY_SIDES + 1;
    for (const coat of coats) {
      const start = coat.animal.body.start;
      for (let n = 0; n < coat.locks; n++) {
        // More on the back, the shoulders and the haunches; little on the belly, none on the muzzle.
        let i = 0;
        let j = 0;
        for (let tries = 0; tries < 8; tries++) {
          i = 3 + rng.int(BODY_RINGS - 14);
          j = rng.int(BODY_SIDES);
          const up = Math.sin((j / BODY_SIDES) * Math.PI * 2);
          const head = i / BODY_RINGS;
          // `bare`: the back and the head of this one are bald, and what it has hangs from the flank and the belly.
          const all = (0.25 + 0.75 * Math.min(1, Math.max(0, up + 0.75))) * (head > 0.8 ? 0.35 : 1);
          const few = Math.min(1, Math.max(0, (0.45 - up) / 0.5)) * Math.min(1, Math.max(0.1, (up + 1.05) / 0.4)) * (head > 0.72 ? 0.15 : 1);
          if (rng.next() < all * (1 - coat.bare) + few * coat.bare) break;
        }
        const at = start + i * w + j;
        const count = 3 + rng.int(3);
        const roots: number[] = [];
        for (let b = 0; b < count; b++) {
          const ri = Math.min(BODY_RINGS - 3, Math.max(1, i + rng.int(3) - 1));
          const rj = (j + rng.int(2) + BODY_SIDES) % BODY_SIDES;
          roots.push(start + ri * w + rj, start + ri * w + rj + 1, start + (ri + 1) * w + rj, rng.next(), rng.next(), rng.range(0.6, 1.15));
          const own = rng.int(1000);
          const wide = coat.width * rng.range(0.7, 1.3);
          const first = blade.length / 4;
          blade.push(-1, wide, own, coat.wet, 1, wide, own, coat.wet, -0.7, wide, own + 0.5, coat.wet, 0.7, wide, own + 0.5, coat.wet, 0, wide, own + 0.99, coat.wet);
          for (let c = 0; c < 5; c++) tint.push(coat.tint + (coat.salt ?? 0) * 100);
          index.push(first, first + 1, first + 2, first + 1, first + 3, first + 2, first + 2, first + 3, first + 4);
        }
        this.locks.push({
          roots,
          at,
          fore: start + Math.min(BODY_RINGS - 1, i + 4) * w + j,
          aft: start + Math.max(0, i - 4) * w + j,
          length: coat.length * rng.range(0.55, 1.35),
          stand: rng.range(0.02, 0.14) + coat.stand * rng.next(),
          hang: rng.range(0.8, 1.4) * (coat.fall ?? 1),
          swirl: rng.range(-0.5, 0.5),
        });
      }
    }
    const verts = blade.length / 4;
    this.position = new Float32Array(verts * 3);
    this.dir = new Float32Array(verts * 3);
    this.skinNormal = new Float32Array(verts * 3);
    const g = new THREE.BufferGeometry();
    const dynamic = (a: Float32Array): THREE.BufferAttribute => {
      const at = new THREE.BufferAttribute(a, 3);
      at.setUsage(THREE.DynamicDrawUsage);
      return at;
    };
    this.attrs = [dynamic(this.position), dynamic(this.dir), dynamic(this.skinNormal)];
    g.setAttribute('position', this.attrs[0] as THREE.BufferAttribute);
    g.setAttribute('aDir', this.attrs[1] as THREE.BufferAttribute);
    g.setAttribute('aSkinNormal', this.attrs[2] as THREE.BufferAttribute);
    g.setAttribute('aBlade', new THREE.BufferAttribute(new Float32Array(blade), 4));
    g.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(tint), 1));
    g.setIndex(index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    this.material = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Stand every lock on the skin as it is now. Call after the animals are posed. */
  touch(): void {
    const P = this.skin.position;
    const N = this.skin.normal;
    const out = this.position;
    const dir = this.dir;
    const sn = this.skinNormal;
    let o = 0;
    for (const lock of this.locks) {
      const a = lock.at * 3;
      // Toward the rump: hair lies back along the trunk.
      const f = lock.fore * 3;
      const r = lock.aft * 3;
      // The lie of the hide round it, not of the one knob it stands on.
      let nx = (N[a] as number) + (N[f] as number) + (N[r] as number);
      let ny = (N[a + 1] as number) + (N[f + 1] as number) + (N[r + 1] as number);
      let nz = (N[a + 2] as number) + (N[f + 2] as number) + (N[r + 2] as number);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      let bx = (P[r] as number) - (P[f] as number);
      let by = (P[r + 1] as number) - (P[f + 1] as number);
      let bz = (P[r + 2] as number) - (P[f + 2] as number);
      const bl = Math.hypot(bx, by, bz) || 1;
      bx /= bl;
      by /= bl;
      bz /= bl;
      // Across the trunk, for the swirl.
      const cx = by * nz - bz * ny;
      const cy = bz * nx - bx * nz;
      const cz = bx * ny - by * nx;
      // It hangs: down the skin where the skin is steep, back along the trunk where it is level.
      const gx = ny * nx * lock.hang;
      const gy = (ny * ny - 1) * lock.hang;
      const gz = ny * nz * lock.hang;
      const lie = Math.min(1, lock.hang * 4);
      let dx = nx * lock.stand + (bx * 0.4 + cx * lock.swirl * 0.5) * lie + gx;
      let dy = ny * lock.stand + (by * 0.4 + cy * lock.swirl * 0.5) * lie + gy;
      let dz = nz * lock.stand + (bz * 0.4 + cz * lock.swirl * 0.5) * lie + gz;
      // It cannot hang into the hide: what points in is laid along the skin.
      const into = dx * nx + dy * ny + dz * nz;
      if (into < 0.02) {
        const lift = 0.02 - into;
        dx += nx * lift;
        dy += ny * lift;
        dz += nz * lift;
      }
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      // In a deep fold of the hide the hair is rubbed away.
      const even = Math.min(1, Math.max(0, (((N[f] as number) * (N[r] as number) + (N[f + 1] as number) * (N[r + 1] as number) + (N[f + 2] as number) * (N[r + 2] as number)) - 0.72) / 0.2));
      const R = lock.roots;
      for (let b = 0; b < R.length; b += 6) {
        const q = (R[b] as number) * 3;
        const q1 = (R[b + 1] as number) * 3;
        const q2 = (R[b + 2] as number) * 3;
        const fu = R[b + 3] as number;
        const fv = R[b + 4] as number;
        const len = lock.length * (R[b + 5] as number) * even;
        // Every hair has its own root and lies beside the others of its lock: they do not meet at a point.
        const px = (P[q] as number) + fu * ((P[q1] as number) - (P[q] as number)) + fv * ((P[q2] as number) - (P[q] as number)) - nx * 0.004;
        const py = (P[q + 1] as number) + fu * ((P[q1 + 1] as number) - (P[q + 1] as number)) + fv * ((P[q2 + 1] as number) - (P[q + 1] as number)) - ny * 0.004;
        const pz = (P[q + 2] as number) + fu * ((P[q1 + 2] as number) - (P[q + 2] as number)) + fv * ((P[q2 + 2] as number) - (P[q + 2] as number)) - nz * 0.004;
        const ex = dx;
        const ey = dy;
        const ez = dz;
        // It is limp: it follows the round of the trunk under it.
        const round = lock.stand < 0.5 ? 0.75 * len * len : 0;
        const tx = px + dx * len - nx * round;
        const ty = py + dy * len - ny * round;
        const tz = pz + dz * len - nz * round;
        // It leaves the skin, arches, and falls to the end of the lock.
        const arch = 0.03 * len + 0.006 + 0.5 * round;
        const mx = (px + tx) / 2 + nx * arch;
        const my = (py + ty) / 2 + ny * arch;
        const mz = (pz + tz) / 2 + nz * arch;
        for (let c = 0; c < 5; c++) {
          out[o] = c === 4 ? tx : c > 1 ? mx : px;
          out[o + 1] = c === 4 ? ty : c > 1 ? my : py;
          out[o + 2] = c === 4 ? tz : c > 1 ? mz : pz;
          dir[o] = ex;
          dir[o + 1] = ey;
          dir[o + 2] = ez;
          sn[o] = nx;
          sn[o + 1] = ny;
          sn[o + 2] = nz;
          o += 3;
        }
      }
    }
    for (const at of this.attrs) at.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
