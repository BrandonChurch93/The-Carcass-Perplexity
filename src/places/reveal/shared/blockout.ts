// The stand-ins of the rise, from the blockout. A part keeps its stand-in until a folder lists its name in PARTS; then the stand-in is not made at all.
import * as THREE from 'three';
import { createBlockout } from '../../../core/blockout';
import type { Parts } from '../../../core/place';
import { AT, BEAT, KM, LIMB, MASTER_H, MASTER_W, RING_FADE, X, Z, halfHeightAt, handoff, traced, tuning, type Mark } from './anchors';

const CLOUD_HEIGHT = 12;
const CLOUDS = 380;
const CLOUD_DRIFT: [number, number] = [9, -2.2];

const COLOUR = {
  sea: 0x0f2236,
  land: 0xb3a48f,
  deep: new THREE.Color(handoff.water).getHex(),
  ring: new THREE.Color(handoff.ring).getHex(),
  shore: 0x8c6a2a,
  lava: 0xff6a1a,
  lavaHot: 0xffd9a0,
  salt: 0x8e2f2a,
  storm: 0xaab1b8,
  flash: 0xffffff,
  vapour: 0xdfe6ea,
  cloud: 0xc6ccd2,
  space: 0x000000,
  atmosphere: 0x3a8dff,
};

function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whether a point of the master, px, lies on the traced land. */
export function onLand(px: number, py: number): boolean {
  for (const shape of traced.shapes) {
    const o = shape.outer;
    let inside = false;
    for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
      if ((o[i + 1] as number) > py !== (o[j + 1] as number) > py && px < (((o[j] as number) - (o[i] as number)) * (py - (o[i + 1] as number))) / ((o[j + 1] as number) - (o[i + 1] as number)) + (o[i] as number)) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

function continent(): THREE.BufferGeometry {
  const loop = (flat: number[]): THREE.Vector2[] => {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < flat.length; i += 2) out.push(new THREE.Vector2(X(flat[i] as number), Z(flat[i + 1] as number)));
    return out;
  };
  const shapes = traced.shapes.map((s) => {
    const shape = new THREE.Shape(loop(s.outer));
    for (const hole of s.holes) shape.holes.push(new THREE.Path(loop(hole)));
    return shape;
  });
  return new THREE.ShapeGeometry(shapes).rotateX(Math.PI / 2);
}

function spiral(): THREE.BufferGeometry {
  const positions: number[] = [];
  const arms = 3;
  const steps = 64;
  for (let k = 0; k < arms; k++) {
    let before: [number, number, number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const turn = 0.6 + (4.6 * i) / steps;
      const r = 90 * Math.exp(0.38 * turn);
      const half = 0.09 * r + 6;
      const angle = turn + (k * 2 * Math.PI) / arms;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const now: [number, number, number, number] = [(r - half) * c, (r - half) * s, (r + half) * c, (r + half) * s];
      if (before) positions.push(before[0], 0, before[1], before[2], 0, before[3], now[0], 0, now[1], now[0], 0, now[1], before[2], 0, before[3], now[2], 0, now[3]);
      before = now;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return g;
}

export interface StandIns {
  setTime(seconds: number): void;
  solo(part: string | null): void;
}

export function createStandIns(scene: THREE.Scene, parts: Parts, owned: ReadonlySet<string>): StandIns {
  const kit = createBlockout(parts);
  const updates: ((t: number) => void)[] = [];
  // The stand-ins are flat layers drawn in this order with no depth test. Built parts draw before them (render order 0).
  let order = 100;

  const paint = (colour: number): THREE.ShaderMaterial => {
    const m = kit.flat(colour, { side: THREE.DoubleSide });
    m.depthTest = false;
    m.depthWrite = false;
    return m;
  };
  const layer = <T extends THREE.Object3D>(object: T): T => {
    order++;
    object.traverse((o) => {
      o.renderOrder = order;
      o.frustumCulled = false;
    });
    scene.add(object);
    return object;
  };
  const disc = new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2);
  const oval = (colour: number, at: Mark, rx: number, ry: number, turn = 0): THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> => {
    const m = new THREE.Mesh(disc, paint(colour));
    m.position.set(X(at.x), 0, Z(at.y));
    m.scale.set(rx * KM, 1, ry * KM);
    m.rotation.y = turn;
    return m;
  };
  const want = (name: string): boolean => !owned.has(name);

  if (want('sea')) layer(parts.standIn('sea', new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000).rotateX(-Math.PI / 2), paint(COLOUR.sea))));
  if (want('continent')) layer(parts.standIn('continent', new THREE.Mesh(continent(), paint(COLOUR.land))));
  if (want('salt')) layer(parts.standIn('salt', oval(COLOUR.salt, AT.salt, 150, 115)));
  if (want('lake')) {
    const shore = layer(oval(COLOUR.shore, AT.lake, tuning.lakeShorePx[0] as number, tuning.lakeShorePx[1] as number));
    const deep = layer(oval(COLOUR.deep, AT.lake, tuning.lakeDeepPx[0] as number, tuning.lakeDeepPx[1] as number));
    const ringPaint = paint(COLOUR.ring);
    const rings = new THREE.Group();
    for (const share of handoff.ringRadii) {
      const r = share * handoff.revealHalfHeightKm;
      rings.add(new THREE.Mesh(new THREE.RingGeometry(r * (1 - handoff.ringWidth / 2), r * (1 + handoff.ringWidth / 2), 160).rotateX(-Math.PI / 2), ringPaint));
    }
    rings.position.set(X(AT.lake.x), 0, Z(AT.lake.y));
    layer(rings);
    parts.standIn('lake', shore, deep, rings);
    const ringColour = (ringPaint.uniforms.uColour as THREE.IUniform<THREE.Color>).value;
    const ringFull = new THREE.Color(COLOUR.ring);
    const ringGone = new THREE.Color(COLOUR.deep);
    updates.push((t) => {
      const wide = halfHeightAt(t) / handoff.revealHalfHeightKm;
      const fade = Math.min(1, Math.max(0, (wide - RING_FADE[0]) / (RING_FADE[1] - RING_FADE[0])));
      ringColour.copy(ringFull).lerp(ringGone, fade * fade * (3 - 2 * fade));
      rings.visible = fade < 1;
    });
  }
  if (want('lava')) {
    const lava = layer(parts.standIn('lava', oval(COLOUR.lava, AT.lava, 42, 42)));
    const lavaColour = (lava.material.uniforms.uColour as THREE.IUniform<THREE.Color>).value;
    const lavaCool = new THREE.Color(COLOUR.lava);
    const lavaHot = new THREE.Color(COLOUR.lavaHot);
    updates.push((t) => {
      const hit = BEAT !== null && t >= BEAT ? Math.exp(-(t - BEAT) / 0.5) : 0;
      const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 1.8);
      lavaColour.copy(lavaCool).lerp(lavaHot, Math.min(1, 0.25 * pulse + hit));
      const swell = 1 + 0.08 * pulse + 1.4 * hit;
      lava.scale.set(42 * KM * swell, 1, 42 * KM * swell);
    });
  }
  if (want('vapour')) {
    const vapour = new THREE.Group();
    const wisps: THREE.Mesh[] = [];
    const spans = [150, 110, 85];
    [
      [-40, -150, 150, 17],
      [-95, -110, 110, 14],
      [10, -105, 85, 12],
    ].forEach(([dx, dy, long, wide]) => {
      const wisp = oval(COLOUR.vapour, { x: AT.throat.x + (dx as number), y: AT.throat.y + (dy as number) }, long as number, wide as number, 1.2);
      wisps.push(wisp);
      vapour.add(wisp);
    });
    layer(parts.standIn('vapour', vapour));
    updates.push((t) => {
      wisps.forEach((wisp, i) => {
        wisp.scale.x = (spans[i] as number) * KM * (1 + 0.12 * Math.sin(t * 0.5 + i * 2.1));
      });
    });
  }
  if (want('storm')) {
    const storm = layer(parts.standIn('storm', oval(COLOUR.storm, AT.storm, 215, 52)));
    const stormColour = (storm.material.uniforms.uColour as THREE.IUniform<THREE.Color>).value;
    const stormDull = new THREE.Color(COLOUR.storm);
    const stormFlash = new THREE.Color(COLOUR.flash);
    const flicker = random(31);
    const flashes = Array.from({ length: 4096 }, () => flicker());
    updates.push((t) => {
      const slot = Math.floor(t * 9);
      const lit = (flashes[slot % flashes.length] as number) > 0.82 ? 1 : (flashes[(slot + 4095) % flashes.length] as number) > 0.82 ? 0.45 : 0;
      stormColour.copy(stormDull).lerp(stormFlash, lit);
    });
  }
  if (want('cloud')) {
    const cloud = new THREE.InstancedMesh(disc, paint(COLOUR.cloud), CLOUDS);
    const rnd = random(7);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let made = 0;
    let tries = 0;
    while (made < CLOUDS && tries < CLOUDS * 40) {
      tries++;
      const px = -1200 + rnd() * (MASTER_W + 2400);
      const py = -700 + rnd() * (MASTER_H + 1400);
      const rx = 14 + rnd() * 46;
      const rz = 5 + rnd() * 13;
      const turn = 0.25 + (rnd() - 0.5) * 0.7;
      if (onLand(px, py)) continue;
      if (LIMB && Math.hypot(px - LIMB.cx, py - LIMB.cy) > LIMB.r - 120) continue;
      q.setFromAxisAngle(up, turn);
      m4.compose(new THREE.Vector3(X(px), 0, Z(py)), q, new THREE.Vector3(rx, 1, rz));
      cloud.setMatrixAt(made++, m4);
    }
    cloud.count = made;
    cloud.instanceMatrix.needsUpdate = true;
    cloud.position.y = CLOUD_HEIGHT;
    layer(parts.standIn('cloud', cloud));
    updates.push((t) => cloud.position.set(CLOUD_DRIFT[0] * t, CLOUD_HEIGHT, CLOUD_DRIFT[1] * t));
  }
  if (want('cyclone')) {
    const cyclone = new THREE.Group();
    const white = paint(COLOUR.cloud);
    cyclone.add(new THREE.Mesh(spiral(), white), new THREE.Mesh(new THREE.RingGeometry(42, 100, 48).rotateX(-Math.PI / 2), white));
    cyclone.position.set(X(AT.cyclone.x), CLOUD_HEIGHT, Z(AT.cyclone.y));
    layer(parts.standIn('cyclone', cyclone));
    updates.push((t) => {
      cyclone.rotation.y = 0.03 * t;
    });
  }
  if (LIMB) {
    const ring = (inner: number, outer: number, colour: number): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.RingGeometry(inner * KM, outer * KM, 512).rotateX(-Math.PI / 2), paint(colour));
      m.position.set(X(LIMB.cx), 0, Z(LIMB.cy));
      return m;
    };
    if (want('space')) layer(parts.standIn('space', ring(LIMB.r, LIMB.r * 4, COLOUR.space)));
    if (want('atmosphere')) layer(parts.standIn('atmosphere', ring(LIMB.r - 18, LIMB.r, COLOUR.atmosphere)));
  }

  return {
    setTime: (seconds) => {
      kit.setTime(seconds);
      const t = Math.max(0, seconds);
      for (const u of updates) u(t);
    },
    solo: (part) => kit.solo(part),
  };
}
