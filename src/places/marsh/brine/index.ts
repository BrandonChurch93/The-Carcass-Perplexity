// The brine of the Blood Marsh: the level red water of the seep pool, the vein and the creeks (part `brine`), the domes of gas that swell on the
// seep pool (part `domes`), and the tearing of a dome: the drops its edge lets go, the mound the pool heaves up, and the rings they leave (part `burst`).
// All of it is a function of the place's seconds: every dome has a period and a moment in it, and nothing is remembered between frames.
import * as THREE from 'three';
import { BEASTS, BURST, HERO_DOME, K1_AT, K1_DIR, POOL_R, SMALL_BURST, SMALL_DOME, TAU, fract, keyTime, rel } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { landShared } from '../land';
import { BRINE_DEPTH, BRINE_FRAGMENT, BRINE_VERTEX, CROWN_FRAGMENT, CROWN_LIFE, CROWN_VERTEX, DOME_FRAGMENT, DOME_VERTEX, MAX_RINGS, MAX_SEEPS, MAX_STIR, TEAR } from './shaders';

export const PARTS = ['brine', 'domes', 'burst'] as const;

interface Dome {
  x: number;
  z: number;
  /** Radius at full swell, metres. */
  size: number;
  period: number;
  /** Seconds, in the place, of one of its bursts. */
  burst: number;
  seed: number;
  drops: number;
}

/** The share of a dome's period it spends swelling; the rest is the burst and the still water after it. */
const SWELL = 0.8;
const DROP_LIFE = 1.5;
/** A ligament is drawn as so many beads in a row, which part into so many drops. */
const LIG_BEADS = 6;
const LIG_LIFE = 1.7;
/** How wide the column is from its foot to its head, bead by bead. */
const COLUMN_SHAPE = [3.4, 1.4, 1.0, 0.72, 0.54, 1.0];
const RING_LIFE = 5;
const RING_SPEED = 0.9;

export function create(ctx: Context): Piece {
  const { grain, field, plates } = landShared();
  const rng = ctx.rng('brine/domes');

  const domes: Dome[] = [
    { x: HERO_DOME[0], z: HERO_DOME[1], size: 0.62, period: 10.4, burst: BURST, seed: 0.37, drops: 440 },
    { x: SMALL_DOME[0], z: SMALL_DOME[1], size: 0.4, period: 7.6, burst: SMALL_BURST - 0.2, seed: 0.81, drops: 240 },
    // The one the second lens ends on: it stands full in the middle of that pool and tears a second after the key frame.
    { x: -4.0, z: 0.6, size: 0.6, period: 12.4, burst: keyTime('marsh-2') + 1, seed: 0.53, drops: 100 },
  ];
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(0.6, POOL_R * 0.62);
    const period = rng.range(3.6, 7.5);
    domes.push({ x: Math.sin(a) * r - 1.5, z: Math.cos(a) * r - 1, size: rng.range(0.14, 0.36), period, burst: rng.range(0, period), seed: rng.next(), drops: 12 });
  }
  // Under the third lens's bank the gas comes up small and slow, and its bubbles gather against the salt rim in a cluster: a hand to
  // two hands across, long in the swelling, so that they stand there through that lens's whole look and tear only after it.
  const nook = ctx.rng('brine/nook');
  for (let i = 0; i < 7; i++) {
    const forward = nook.range(1.9, 3.3);
    const right = nook.range(-1.5, 1.3);
    const period = nook.range(15, 24);
    const x = K1_AT[0] + K1_DIR[0] * forward - K1_DIR[1] * right;
    const z = K1_AT[1] + K1_DIR[1] * forward + K1_DIR[0] * right;
    if (Math.hypot(x, z) > POOL_R - 0.25) continue;
    domes.push({ x, z, size: nook.range(0.07, 0.17), period, burst: BURST + nook.range(2.5, 0.5 * period), seed: nook.next(), drops: 6 });
  }

  const uniforms = { ...ctx.rig.uniforms, tGrain: { value: grain }, tPlates: { value: plates } };
  const rings = Array.from({ length: MAX_RINGS }, () => new THREE.Vector4());
  const ringCount = { value: 0 };
  // Where gas comes up all the time: the main seep under the steam, and lesser ones over the pool's floor.
  const seepRng = ctx.rng('brine/seeps');
  const seeps = Array.from({ length: MAX_SEEPS }, (_, i) => {
    if (i === 0) return new THREE.Vector4(-3.4, -1.6, 0.31, 0.06);
    // Gas comes up under each of the two great domes before and after it stands: their rings never stop.
    if (i === 1) return new THREE.Vector4(HERO_DOME[0], HERO_DOME[1], 0.67, 0.075);
    if (i === 2) return new THREE.Vector4(SMALL_DOME[0], SMALL_DOME[1], 0.13, 0.06);
    const a = seepRng.range(0, TAU);
    const r = seepRng.range(1.5, POOL_R * 0.8);
    return new THREE.Vector4(Math.sin(a) * r, Math.cos(a) * r, seepRng.next(), seepRng.range(0.015, 0.04));
  });

  // The animals keep the brine about them moving: each is a place rings leave from (the surface asks only where it stands and how
  // far its body reaches; how it moves is the life builder's).
  const stirCount = Math.min(BEASTS.length, MAX_STIR);
  const stir = Array.from({ length: MAX_STIR }, (_, i) => {
    const beast = BEASTS[i];
    if (!beast) return new THREE.Vector4(0, 0, 0, 0);
    const at = rel(beast.d, beast.l);
    return new THREE.Vector4(at[0], at[1], 1.9 * beast.size, fract(0.37 + i * 0.6180339));
  });

  // The mirror: the scene as the level brine sees it, drawn a sixth of the frame's size before every sample.
  const MIRROR_SHARE = 6;
  const mirror = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  mirror.texture.generateMipmaps = true;
  const under = new THREE.PerspectiveCamera();
  const blank = (ctx.rig.uniforms.tMirror as THREE.IUniform<THREE.Texture>).value;
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const eye = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const upward = new THREE.Vector3();

  const frothSheet = ctx.assets.texture('mat/froth.jpg', { kind: 'colour', repeat: true, anisotropy: 4 });
  const surface = new THREE.ShaderMaterial({
    vertexShader: BRINE_VERTEX,
    fragmentShader: BRINE_FRAGMENT,
    uniforms: { ...uniforms, uWade: { value: new THREE.Vector2(...rel(34.3, 3)) }, tFieldNear: { value: field.near }, tFieldFar: { value: field.far }, uRings: { value: rings }, uRingCount: ringCount, uSeeps: { value: seeps }, uStir: { value: stir }, uStirCount: { value: stirCount }, tFrothN: { value: ctx.assets.texture('mat/froth-nh.png', { kind: 'data', repeat: true, anisotropy: 4 }) }, tBed: { value: ctx.assets.texture('mat/crust.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) }, tFroth: { value: frothSheet } },
    toneMapped: false,
  });
  surface.userData.depthFragment = BRINE_DEPTH;
  // The surface is laid only where there is brine: squares of two metres, kept where any of their ground is within a stride of a shore.
  const cell = 2;
  const half = 250;
  const count = (half * 2) / cell;
  const wetCell = new Uint8Array(count * count);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      let least = 9;
      for (let v = 0; v <= 4 && least > 0.6; v++) {
        for (let u = 0; u <= 4; u++) least = Math.min(least, field.shore(-half + (i + u / 4) * cell, -half + (j + v / 4) * cell));
      }
      wetCell[j * count + i] = least < 0.6 ? 1 : 0;
    }
  }
  const corners: number[] = [];
  for (let j = 0; j < count; j++) {
    let i = 0;
    while (i < count) {
      if (!wetCell[j * count + i]) {
        i++;
        continue;
      }
      let end = i;
      while (end < count && wetCell[j * count + end]) end++;
      const x0 = -half + i * cell;
      const x1 = -half + end * cell;
      const z0 = -half + j * cell;
      const z1 = z0 + cell;
      corners.push(x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
      i = end;
    }
  }
  const plane = new THREE.BufferGeometry();
  plane.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  const water = new THREE.Mesh(plane, surface);
  water.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('brine', water));

  // The skin of a dome is a film, drawn after everything solid and twice: first what it lets through of what is behind it (the frame is
  // multiplied by it), then the light it gives back itself (added).
  const domeUniforms = { ...uniforms, tFroth: { value: frothSheet } };
  const film = { vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms: domeUniforms, toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor } as const;
  const skinThrough = new THREE.ShaderMaterial({ ...film, defines: { THROUGH: 1 }, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor });
  const skin = new THREE.ShaderMaterial({ ...film, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  // The air is laid over the frame by depth. A skin that writes none takes the haze of whatever is behind it: over the far flats it
  // was all but hazed away while over the pool it stood whole, a straight line across the dome at the far bank. So it is drawn a third
  // time, for its depth alone.
  const skinDepth = new THREE.ShaderMaterial({ ...film, defines: { THROUGH: 1 }, depthWrite: true, colorWrite: false, blending: THREE.NoBlending });
  const dropSkin = new THREE.ShaderMaterial({ vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms: domeUniforms, defines: { DROP: 1 }, toneMapped: false });
  const ball = new THREE.SphereGeometry(1, 96, 32, 0, TAU, 0, Math.PI / 2);
  const domeLife = new THREE.InstancedBufferAttribute(new Float32Array(domes.length * 4), 4);
  ball.setAttribute('aLife', domeLife);
  const domeShade = new THREE.InstancedMesh(ball, skinThrough, domes.length);
  domeShade.frustumCulled = false;
  domeShade.renderOrder = 1;
  const domeMesh = new THREE.InstancedMesh(ball, skin, domes.length);
  domeMesh.frustumCulled = false;
  domeMesh.renderOrder = 2;
  const domeGroup = new THREE.Group();
  const domeDepth = new THREE.InstancedMesh(ball, skinDepth, domes.length);
  domeDepth.frustumCulled = false;
  domeDepth.renderOrder = 3;
  domeGroup.add(domeShade, domeMesh, domeDepth);
  ctx.scene.add(ctx.parts.built('domes', domeGroup));

  const dropCount = domes.reduce((n, d) => n + d.drops, 0);
  const bead = new THREE.SphereGeometry(1, 18, 12);
  const dropLife = new THREE.InstancedBufferAttribute(new Float32Array(dropCount * 4), 4);
  bead.setAttribute('aLife', dropLife);
  const dropMesh = new THREE.InstancedMesh(bead, dropSkin, dropCount);
  dropMesh.frustumCulled = false;
  // What each drop is: where on the skin it was (turn, height), how much of the edge's speed it took, its size, a number of its own.
  const throwRng = ctx.rng('brine/drops');
  const thrown = new Float32Array(dropCount * 5);
  for (let i = 0; i < dropCount; i++) {
    thrown[i * 5] = throwRng.range(0, TAU);
    thrown[i * 5 + 1] = throwRng.next();
    thrown[i * 5 + 2] = throwRng.next();
    thrown[i * 5 + 3] = 0.0012 + 0.007 * Math.pow(throwRng.next(), 3.2);
    thrown[i * 5 + 4] = throwRng.next();
  }

  const crownMaterial = new THREE.ShaderMaterial({
    vertexShader: CROWN_VERTEX, fragmentShader: CROWN_FRAGMENT, uniforms, side: THREE.DoubleSide, toneMapped: false, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const tube = new THREE.CylinderGeometry(1, 1, 1, 192, 14, true).translate(0, 0.5, 0);
  const crownLife = new THREE.InstancedBufferAttribute(new Float32Array(domes.length * 4), 4);
  tube.setAttribute('aLife', crownLife);
  const crownMesh = new THREE.InstancedMesh(tube, crownMaterial, domes.length);
  crownMesh.frustumCulled = false;
  const burst = new THREE.Group();
  burst.add(crownMesh, dropMesh);
  ctx.scene.add(ctx.parts.built('burst', burst));

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const setTime = (t: number): void => {
    let ring = 0;
    let drop = 0;
    domes.forEach((d, i) => {
      // Where the dome is in its life: 0 at the moment it starts to swell, SWELL when it tears.
      const cycle = fract((t - d.burst) / d.period + SWELL);
      const swell = cycle < SWELL ? cycle / SWELL : 0;
      const age = cycle >= SWELL ? (cycle - SWELL) * d.period : -1;
      // It rises slowly, then quickly at the last: gas gathers under a skin that gives.
      const grow = swell <= 0 ? 0 : 0.25 * swell + 0.75 * Math.pow(swell, 2.6);
      // The skin does not vanish: a hole opens at one point on its side and its edge runs back over the dome, rolling the film up as it goes.
      const tear = age >= 0 && age < TEAR ? age / TEAR : 0;
      const full = age >= 0 && age < TEAR ? 1 : grow;
      const r = d.size * (0.35 + 0.65 * full) * (swell > 0 || tear > 0 || (age >= 0 && age < TEAR) ? 1 : 0);
      const tall = r * (0.22 + 0.5 * full);
      m.makeScale(r, tall, r).setPosition(d.x, -0.01, d.z);
      domeMesh.setMatrixAt(i, m);
      domeShade.setMatrixAt(i, m);
      domeDepth.setMatrixAt(i, m);
      domeLife.setXYZW(i, full, d.seed, d.size, age >= 0 && age < TEAR ? Math.max(tear, 0.04) : 0);

      // As the edge comes down on the pool the brine it gathered is thrown up in a wall of fingers.
      const back = age - TEAR * 0.2;
      const risen = back > 0 && back < CROWN_LIFE * Math.sqrt(d.size / 0.4);
      m.makeScale(risen ? 1 : 0, risen ? 1 : 0, risen ? 1 : 0).setPosition(d.x, 0, d.z);
      crownMesh.setMatrixAt(i, m);
      crownLife.setXYZW(i, risen ? back : 0, d.seed, d.size, 0);

      // The drops are the edge's beads let go: each leaves the place on the skin where the edge found it, at the moment the edge came by,
      // along the way the edge was running and a little off the skin, and then it only falls.
      const fh = Math.hypot(0.72, 0.69);
      const fx = (Math.cos(d.seed * 40) * 0.72) / fh;
      const fy = 0.69 / fh;
      const fz = (Math.sin(d.seed * 40) * 0.72) / fh;
      const landed: number[] = [];
      // Ligaments. Where the edge of the hole runs over the skin the brine it has rolled up is flung off in strings: each is rooted
      // near the pool and thrown at its tip, so it is drawn out, thins as it lengthens (the same brine in a longer string), necks
      // between its swellings and parts into drops, the tip first. Every point of a string flies its own thrown path from the
      // moment it left, so string and drops are one motion and a pure function of the seconds.
      const big = Math.sqrt(d.size / 0.4);
      const ligs = Math.floor((d.drops * 0.5) / LIG_BEADS);
      for (let g = 0; g < ligs; g++) {
        const base = drop;
        const r1 = thrown[base * 5 + 1] as number;
        const r2 = thrown[base * 5 + 2] as number;
        const r3 = thrown[(base + 1) * 5 + 1] as number;
        const r4 = thrown[(base + 1) * 5 + 2] as number;
        const own = thrown[base * 5 + 4] as number;
        const az = thrown[base * 5] as number;
        const uy = 0.08 + 0.8 * r1;
        const ur = Math.sqrt(1 - uy * uy);
        const ux = Math.cos(az) * ur;
        const uz = Math.sin(az) * ur;
        const c = ux * fx + uy * fy + uz * fz;
        let since = age < 0 ? -1 : age - ((-1.1 + Math.sqrt(1.21 + 3.6 * (1 - c))) / 1.8) * TEAR - 0.03 * own;
        let tx = ux * c - fx;
        let ty = uy * c - fy;
        let tz = uz * c - fz;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx = (tx / tl) * (0.25 + 0.5 * r3) + ux * 0.8;
        ty = Math.abs(ty / tl) * 0.4 + uy * 0.5 + 0.3 + 0.7 * r4;
        tz = (tz / tl) * (0.25 + 0.5 * r3) + uz * 0.8;
        const tipSpeed = (2.5 * big * (0.35 + 0.65 * r2 * r2)) / Math.hypot(tx, ty, tz);
        let ax = tx * tipSpeed;
        let ay = ty * tipSpeed;
        let az2 = tz * tipSpeed;
        const held = 0.1 + 0.16 * own;
        let bx = ax * held;
        let by = ay * held + 0.25 * big;
        let bz = az2 * held;
        let x0 = d.x + ux * d.size * 0.95;
        let y0 = uy * d.size * 0.66;
        let z0 = d.z + uz * d.size * 0.95;
        let r0 = (0.007 + 2.0 * (thrown[base * 5 + 3] as number)) * (0.6 + d.size) * (0.5 + 0.95 * own * own);
        let breaksAt = (0.16 + 0.4 * r3) * big;
        let taper = -1.1;
        let column = false;
        // The last of a great dome's strings is the column: the pool closes over the place the gas left and throws one thick jet
        // straight up out of its middle, which stands, necks and lets its head go.
        if (i < 3 && g === ligs - 1) {
          since = age < 0 ? -1 : age - TEAR * 0.55;
          ax = (r1 - 0.5) * 1.1;
          // (A small dome throws a low one.)
          ay = (2.7 + 0.5 * r3) * big * Math.min(1, Math.pow(d.size / 0.62, 1.2));
          az2 = (r2 - 0.5) * 1.1;
          bx = 0;
          by = 0.45 * big;
          bz = 0;
          x0 = d.x;
          y0 = 0;
          z0 = d.z;
          r0 = 0.062 * (d.size / 0.6);
          column = true;
          breaksAt = 0.62 * big;
        }
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az2 - bz;
        const drawn = Math.hypot(dx, dy, dz) || 1;
        // (No string is ruled: it is bowed to one side, by what the edge gave it across its way.)
        const bow = (r4 - 0.5) * 1.7 * drawn;
        const sx = (-dz / drawn) * bow;
        const sy = (own - 0.5) * 0.9 * drawn;
        const sz = (dx / drawn) * bow;
        for (let j = 0; j < LIG_BEADS; j++, drop++) {
          const f = (j + 0.5) / LIG_BEADS;
          if (column) {
            // The column stands on the pool: its foot is the pool heaved up, wide and flared, its head is thrown and falls by its own
            // weight, and what is between is drawn out from the one to the other. It goes back down as its head comes down.
            const rise = since < 0 ? -1 : ay * since - 4.905 * since * since;
            if (rise < 0.012) {
              m.makeScale(0, 0, 0);
              dropMesh.setMatrixAt(drop, m);
              continue;
            }
            const grown = Math.min(1, since / 0.09);
            // (Its head gathers as it rises: a short column has none yet.)
            const gathers = j === LIG_BEADS - 1 ? 0.6 + 0.4 * Math.min(1, rise / 0.35) : 1;
            const shape = (COLUMN_SHAPE[j] as number) * gathers * (1 + 0.04 * Math.sin(j * 2.3 + since * 11 + own * 20));
            // (The same brine in a taller column is a thinner one, down to a half.)
            const wide = r0 * shape * (0.5 + 0.5 * grown) * Math.max(0.55, Math.sqrt(0.3 / (0.3 + rise)));
            // (Each bead reaches well into the next, so the column is one drawn shape and not a stack.)
            const half = (rise / LIG_BEADS) * (j === LIG_BEADS - 1 ? 0.9 : 1.7) + wide * 0.4;
            // Its head necks and comes away a little before the top of its rise.
            const lets = j === LIG_BEADS - 1 ? Math.min(Math.max((since - 0.27 * big) / 0.12, 0), 1) : 0;
            if (j === 0) {
              // (Its foot is a low mound of the pool, drawn up round it.)
              pos.set(x0, 0, z0);
              scale.set(wide, Math.min(wide * 0.42, 0.02 + rise * 0.3), wide);
              m.compose(pos, q.identity(), scale);
              dropMesh.setMatrixAt(drop, m);
              dropLife.setXYZW(drop, 0.5, own, wide, 0);
              continue;
            }
            dir.set(ax * 0.25 * f, 1, az2 * 0.25 * f).normalize();
            q.setFromUnitVectors(up, dir);
            pos.set(x0 + ax * since * f * f, rise * ((f - 0.2) * 1.12 + 0.07 * lets), z0 + az2 * since * f * f);
            scale.set(wide, half + (wide * 1.1 - half) * lets, wide);
            m.compose(pos, q, scale);
            dropMesh.setMatrixAt(drop, m);
            dropLife.setXYZW(drop, 0.5, own, wide, 0);
            continue;
          }
          // (A string is thick where it leaves the pool and a thread toward its tip, which carries a drop.)
          const tip = j === LIG_BEADS - 1 ? 1 : 0;
          const vx = bx + f * dx + f * (1 - f) * sx;
          const vy = by + f * dy + f * (1 - f) * sy;
          const vz = bz + f * dz + f * (1 - f) * sz;
          const y = since < 0 ? -1 : y0 + vy * since - 4.905 * since * since;
          // The tip parts first, the root last.
          const parts = (breaksAt / drawn) * (1.15 - 0.3 * f);
          const joined = Math.min(Math.max(since, 0), parts);
          // (A string is never even: it swells and necks along its length, each string its own way, and the column carries a head.)
          const swells = 1 + 0.38 * Math.sin(j * 2.6 + own * 23 + g) + 1.5 * tip;
          const thin = r0 * Math.sqrt(0.18 / (0.18 + drawn * joined)) * (1 - 0.5 * taper + taper * f) * swells;
          // (The necks between the swellings draw in as the moment of parting comes.)
          const nearing = Math.min(1, joined / Math.max(parts, 1e-3));
          const necks = 0.95 - 0.33 * nearing * nearing;
          const halfJoined = ((drawn * joined) / LIG_BEADS) * necks * (1 - 0.7 * tip) + thin;
          const round = Math.cbrt(1.5 * thin * thin * halfJoined);
          if (since < 0 || since > LIG_LIFE || y < -round) {
            m.makeScale(0, 0, 0);
            dropMesh.setMatrixAt(drop, m);
            continue;
          }
          const apart = Math.min(Math.max((since - parts) / 0.07, 0), 1);
          const parted = apart * apart * (3 - 2 * apart);
          const fall = vy - 9.81 * since;
          const speed = Math.hypot(vx, fall, vz);
          // Joined, a bead lies along the string; let go, it is a drop drawn out a little along its own way.
          dir.set(dx + (1 - 2 * f) * sx, dy + (1 - 2 * f) * sy, dz + (1 - 2 * f) * sz).normalize().multiplyScalar(1 - parted);
          dir.x += (vx / (speed || 1)) * parted;
          dir.y += (fall / (speed || 1)) * parted;
          dir.z += (vz / (speed || 1)) * parted;
          q.setFromUnitVectors(up, dir.normalize());
          const wide = thin + (round - thin) * parted;
          const half = halfJoined + (round * (1 + 0.12 * speed) - halfJoined) * parted;
          pos.set(x0 + vx * since, y, z0 + vz * since);
          scale.set(wide, half, wide);
          m.compose(pos, q, scale);
          dropMesh.setMatrixAt(drop, m);
          dropLife.setXYZW(drop, 0.5, own, wide, 0);
        }
      }
      for (let k = 0; k < d.drops - ligs * LIG_BEADS; k++, drop++) {
        const az = thrown[drop * 5] as number;
        const uy = 0.06 + 0.9 * (thrown[drop * 5 + 1] as number);
        const ur = Math.sqrt(1 - uy * uy);
        const ux = Math.cos(az) * ur;
        const uz = Math.sin(az) * ur;
        const own = thrown[drop * 5 + 4] as number;
        const size = (thrown[drop * 5 + 3] as number) * (0.6 + d.size);
        const c = ux * fx + uy * fy + uz * fz;
        let fl = age < 0 ? -1 : age - ((-1.1 + Math.sqrt(1.21 + 3.6 * (1 - c))) / 1.8) * TEAR - 0.03 * own;
        let tx = ux * c - fx;
        let ty = uy * c - fy;
        let tz = uz * c - fz;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx = (tx / tl) * 0.75 + ux * 0.5;
        ty = Math.abs(ty / tl) * 0.45 + uy * 0.5 + 0.3;
        tz = (tz / tl) * 0.75 + uz * 0.5;
        const speed0 = (3.1 * Math.sqrt(d.size / 0.4) * (0.25 + 0.75 * (thrown[drop * 5 + 2] as number))) / Math.hypot(tx, ty, tz);
        let vx = tx * speed0;
        let vy = ty * speed0;
        let vz = tz * speed0;
        let x0 = d.x + ux * d.size * 0.95;
        let y0 = uy * d.size * 0.66;
        let z0 = d.z + uz * d.size * 0.95;
        // One in three is not the skin's: it is a bead the wall of fingers lets go from a tip as it stands, later, slower, up and a little
        // out, to fall back beside the wall.
        if (k >= 9 && k % 3 === 2) {
          const out = (0.35 + 0.9 * (thrown[drop * 5 + 2] as number)) * big;
          fl = age < 0 ? -1 : age - TEAR * 0.2 - (0.08 + 0.3 * own) * big;
          x0 = d.x + Math.cos(az) * d.size * 0.98;
          y0 = d.size * (0.2 + 0.22 * own);
          z0 = d.z + Math.sin(az) * d.size * 0.98;
          vx = Math.cos(az) * out;
          vy = (1.1 + 1.3 * (thrown[drop * 5 + 1] as number)) * big;
          vz = Math.sin(az) * out;
        }
        if (k < 9 && i < 3 && fl > 0) {
          const lands = (vy + Math.sqrt(vy * vy + 19.62 * y0)) / 9.81;
          if (fl > lands) landed.push(x0 + vx * lands, z0 + vz * lands, fl - lands);
        }
        const y = fl < 0 ? -1 : y0 + vy * fl - 4.905 * fl * fl;
        if (fl < 0 || fl > DROP_LIFE || y < -size) {
          m.makeScale(0, 0, 0);
          dropMesh.setMatrixAt(drop, m);
          continue;
        }
        pos.set(x0 + vx * fl, y, z0 + vz * fl);
        // A drop in flight is drawn out along its way.
        dir.set(vx, vy - 9.81 * fl, vz);
        const speed = dir.length();
        q.setFromUnitVectors(up, dir.divideScalar(speed || 1));
        scale.set(size, size * (1 + 0.3 * speed), size);
        m.compose(pos, q, scale);
        dropMesh.setMatrixAt(drop, m);
        dropLife.setXYZW(drop, 0.5, own, size, 0);
      }

      // Where the lip of the burst fell back it leaves a line of froth on the pool, which widens slowly and thins out.
      // (Written like a dome's foot ring, below nothing: the pool's shader lays froth on such a ring and no wave.)
      if (age > TEAR * 0.7 && age < 3.2 && i < 3 && ring < MAX_RINGS) {
        const since = age - TEAR * 0.7;
        (rings[ring++] as THREE.Vector4).set(d.x, d.z, d.size * (0.72 + 0.5 * Math.min(1, since / 0.3)) + 0.16 * since, -0.9 * Math.min(1, since * 9) * Math.pow(1 - since / 3.1, 1.3));
      }
      // Where each of the larger drops comes down it leaves a ring of its own.
      for (let k = 0; k < landed.length && ring < MAX_RINGS; k += 3) {
        const since = landed[k + 2] as number;
        if (since > 1.6) continue;
        (rings[ring++] as THREE.Vector4).set(landed[k] as number, landed[k + 1] as number, 0.04 + 0.55 * since, 0.5 * Math.min(1, since * 10) * Math.pow(1 - since / 1.6, 1.5));
      }
      // The ring wave: one front from the lip, a second from the column falling back, a third as the pool settles.
      if (age >= 0) {
        for (let k = 0; k < 3 && ring < MAX_RINGS; k++) {
          const since = age - TEAR * 0.6 - k * 0.45;
          if (since <= 0 || since > RING_LIFE) continue;
          const fade = Math.min(1, since * 6) * Math.pow(1 - since / RING_LIFE, 1.5) * (k === 0 ? 1 : 0.6);
          (rings[ring++] as THREE.Vector4).set(d.x, d.z, d.size * 0.9 + RING_SPEED * since, fade * (0.4 + d.size));
        }
      } else if (ring < MAX_RINGS && swell > 0.5 && d.drops > 6) {
        // A swelling dome pushes a ripple ahead of its foot. (Not the small ones of the cluster under the bank: they only stand.)
        // (Its height is written below nothing: the pool's shader knows the foot ring by that, and lays the froth line there.)
        (rings[ring++] as THREE.Vector4).set(d.x, d.z, r + 0.12, -0.65 * grow);
        // And, round the three great ones (every pixel of the pool asks every ring), ring after ring leaves it as the skin heaves: each
        // runs out some strides and dies, the next already on its way.
        for (let k = 0; k < 3 && ring < MAX_RINGS && i < 3; k++) {
          const gone = fract(t * 0.42 + k / 3 + d.seed);
          (rings[ring++] as THREE.Vector4).set(d.x, d.z, r + 0.25 + 2.3 * gone, 0.7 * grow * Math.min(1, gone * 7) * Math.pow(1 - gone, 1.4));
        }
      }
    });
    ringCount.value = ring;
    domeMesh.instanceMatrix.needsUpdate = true;
    domeShade.instanceMatrix.needsUpdate = true;
    domeDepth.instanceMatrix.needsUpdate = true;
    domeLife.needsUpdate = true;
    crownMesh.instanceMatrix.needsUpdate = true;
    crownLife.needsUpdate = true;
    dropMesh.instanceMatrix.needsUpdate = true;
    dropLife.needsUpdate = true;
  };

  return {
    setTime,
    resize: (width, height) => {
      mirror.setSize(Math.max(8, Math.round(width / MIRROR_SHARE)), Math.max(8, Math.round(height / MIRROR_SHARE)));
    },
    beforeSample: (renderer, camera) => {
      const u = ctx.rig.uniforms;
      // The lens, put as far under the brine's level as it stands over it, looking up at the same things.
      eye.setFromMatrixPosition(camera.matrixWorld);
      ahead.set(0, 0, -1).transformDirection(camera.matrixWorld);
      upward.set(0, 1, 0).transformDirection(camera.matrixWorld);
      under.position.set(eye.x, -eye.y, eye.z);
      under.up.set(upward.x, -upward.y, upward.z);
      under.lookAt(eye.x + ahead.x, -eye.y - ahead.y, eye.z + ahead.z);
      under.near = camera.near;
      under.far = camera.far;
      under.projectionMatrix.copy(camera.projectionMatrix);
      under.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      under.updateMatrixWorld(true);
      (u.uMirrorMatrix as THREE.IUniform<THREE.Matrix4>).value.copy(bias).multiply(under.projectionMatrix).multiply(under.matrixWorldInverse);
      (u.tMirror as THREE.IUniform<THREE.Texture>).value = blank;
      (u.uMirror as THREE.IUniform<number>).value = 1;
      // (A still of one part alone has the surface switched off: it stays off after the mirror is drawn.)
      const shown = water.visible;
      water.visible = false;
      renderer.setRenderTarget(mirror);
      renderer.clear(true, true, false);
      renderer.render(ctx.scene, under);
      renderer.setRenderTarget(null);
      water.visible = shown;
      (u.uMirror as THREE.IUniform<number>).value = 0;
      (u.tMirror as THREE.IUniform<THREE.Texture>).value = mirror.texture;
    },
    dispose: () => {
      mirror.dispose();
      plane.dispose();
      ball.dispose();
      bead.dispose();
      tube.dispose();
      surface.dispose();
      skin.dispose();
      skinThrough.dispose();
      skinDepth.dispose();
      dropSkin.dispose();
      crownMaterial.dispose();
    },
  };
}
