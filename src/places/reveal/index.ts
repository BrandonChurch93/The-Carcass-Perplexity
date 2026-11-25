import * as THREE from 'three';
import pullback from '../../../references/approved/7-reveal/pullback.json';
import { risePath, type RiseWindow } from '../../../tools/lib/rise-core.mjs';
import { config } from '../../config';
import { createBlockout } from '../../core/blockout';
import type { CameraPath, Pose } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { cut, eventSeconds, shotsOf } from '../../film/cut';
import traced from './continent.json';

const UNIT = 'reveal';
const KM = pullback.scale_STATED.km_per_master_px;
const MASTER_W = pullback.master.width;
const MASTER_H = pullback.master.height;
const FILM_ASPECT = config.formats.master.width / config.formats.master.height;
const FOV = 30;
const HALF_TAN = Math.tan((FOV * Math.PI) / 360);
const COVER = 1.001;
const CREEP = 0.03;
const CLOUD_HEIGHT = 12;
const CLOUDS = 380;
const CLOUD_DRIFT: [number, number] = [1.2, -0.3];

const X = (px: number): number => (px - MASTER_W / 2) * KM;
const Z = (py: number): number => (py - MASTER_H / 2) * KM;

const COLOUR = {
  sea: 0x0f2236,
  land: 0xb3a48f,
  deep: 0x0c1a2c,
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

interface Mark {
  x: number;
  y: number;
}

const frame4 = pullback.frames['4'].window_in_master_px;
const mark = (percentX: number, percentY: number): Mark => ({ x: frame4.x0 + (percentX / 100) * frame4.w, y: frame4.y0 + (percentY / 100) * frame4.h });
const first = pullback.frames['1'].window_in_master_px;

const AT = {
  lake: { x: first.x0 + first.w / 2, y: first.y0 + first.h / 2 },
  lava: mark(37.45, 38.75),
  throat: mark(28.6, 42.2),
  salt: mark(62.89, 47.68),
  storm: mark(53.5, 45.63),
  cyclone: { x: 5557, y: 3007 },
};

function keysOfRise(): { frames: number[]; windows: RiseWindow[] } {
  const frames: number[] = [];
  const windows: RiseWindow[] = [];
  const byFile = new Map(config.keys.map((k) => [k.image.split('/').pop() as string, k.id]));
  for (const n of Object.keys(pullback.frames).sort((a, b) => Number(a) - Number(b))) {
    const f = pullback.frames[n as keyof typeof pullback.frames];
    const id = byFile.get(f.file);
    if (!id) throw new Error(`No key in the config has the picture ${f.file}`);
    const at = cut.keyFrames[id];
    if (!Number.isFinite(at)) throw new Error(`The cut list has no key frame for ${id}`);
    const w = f.window_in_master_px;
    frames.push(at);
    windows.push({ x: w.x0, y: w.y0, w: w.w, h: w.h });
  }
  return { frames, windows };
}

const riseShots = shotsOf(UNIT).filter((s) => s.picture !== 'black');
const rise = risePath({ start: riseShots[0].first, ...keysOfRise(), cover: COVER, creep: CREEP });

function poseAt(frame: number): Pose {
  const v = rise.at(frame);
  const x = X(v.cx);
  const z = Z(v.cy);
  const height = (v.w * KM) / FILM_ASPECT / 2 / HALF_TAN;
  return { position: [x, height, z], aim: [x, 0, z], fov: FOV, up: [0, 0, -1] };
}

const shots: Record<string, CameraPath> = {};
for (const s of riseShots) shots[s.id] = (_part, frame) => poseAt(frame);

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

function onLand(px: number, py: number): boolean {
  for (const shape of traced.shapes) {
    const o = shape.outer;
    let inside = false;
    for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
      if (o[i + 1] > py !== o[j + 1] > py && px < ((o[j] - o[i]) * (py - o[i + 1])) / (o[j + 1] - o[i + 1]) + o[i]) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

function continent(): THREE.BufferGeometry {
  const loop = (flat: number[]): THREE.Vector2[] => {
    const out: THREE.Vector2[] = [];
    for (let i = 0; i < flat.length; i += 2) out.push(new THREE.Vector2(X(flat[i]), Z(flat[i + 1])));
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

function create(): Place {
  const parts = new Parts(UNIT);
  const kit = createBlockout(parts);
  const scene = new THREE.Scene();
  let order = 0;

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

  layer(parts.standIn('sea', new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000).rotateX(-Math.PI / 2), paint(COLOUR.sea))));
  layer(parts.standIn('continent', new THREE.Mesh(continent(), paint(COLOUR.land))));
  layer(parts.standIn('salt', oval(COLOUR.salt, AT.salt, 150, 115)));
  const shore = layer(oval(COLOUR.shore, AT.lake, 62, 54));
  const deep = layer(oval(COLOUR.deep, AT.lake, 56, 48));
  parts.standIn('lake', shore, deep);
  const lava = layer(parts.standIn('lava', oval(COLOUR.lava, AT.lava, 42, 42)));

  const vapour = new THREE.Group();
  const wisps: THREE.Mesh[] = [];
  [
    [-40, -150, 150, 17],
    [-95, -110, 110, 14],
    [10, -105, 85, 12],
  ].forEach(([dx, dy, long, wide]) => {
    const wisp = oval(COLOUR.vapour, { x: AT.throat.x + dx, y: AT.throat.y + dy }, long, wide, 1.2);
    wisps.push(wisp);
    vapour.add(wisp);
  });
  layer(parts.standIn('vapour', vapour));

  const storm = layer(parts.standIn('storm', oval(COLOUR.storm, AT.storm, 215, 52)));

  const cloud = new THREE.InstancedMesh(disc, paint(COLOUR.cloud), CLOUDS);
  const rnd = random(7);
  const limb = traced.limb;
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
    if (limb && Math.hypot(px - limb.cx, py - limb.cy) > limb.r - 120) continue;
    q.setFromAxisAngle(up, turn);
    m4.compose(new THREE.Vector3(X(px), 0, Z(py)), q, new THREE.Vector3(rx, 1, rz));
    cloud.setMatrixAt(made++, m4);
  }
  cloud.count = made;
  cloud.instanceMatrix.needsUpdate = true;
  cloud.position.y = CLOUD_HEIGHT;
  layer(parts.standIn('cloud', cloud));

  const cyclone = new THREE.Group();
  const white = paint(COLOUR.cloud);
  cyclone.add(new THREE.Mesh(spiral(), white), new THREE.Mesh(new THREE.RingGeometry(42, 100, 48).rotateX(-Math.PI / 2), white));
  cyclone.position.set(X(AT.cyclone.x), CLOUD_HEIGHT, Z(AT.cyclone.y));
  layer(parts.standIn('cyclone', cyclone));

  if (limb) {
    const ring = (inner: number, outer: number, colour: number): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.RingGeometry(inner * KM, outer * KM, 512).rotateX(-Math.PI / 2), paint(colour));
      m.position.set(X(limb.cx), 0, Z(limb.cy));
      return m;
    };
    layer(parts.standIn('space', ring(limb.r, limb.r * 4, COLOUR.space)));
    layer(parts.standIn('atmosphere', ring(limb.r - 18, limb.r, COLOUR.atmosphere)));
  }

  const beat = eventSeconds(UNIT, 'heartbeat');
  const lavaCool = new THREE.Color(COLOUR.lava);
  const lavaHot = new THREE.Color(COLOUR.lavaHot);
  const stormDull = new THREE.Color(COLOUR.storm);
  const stormFlash = new THREE.Color(COLOUR.flash);
  const flicker = random(31);
  const flashes = Array.from({ length: 4096 }, () => flicker());

  const camera = new THREE.PerspectiveCamera(FOV, FILM_ASPECT, 1, 120000);
  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
    volume: null,
    parts,
    setTime: (seconds) => {
      kit.setTime(seconds);
      const t = Math.max(0, seconds);
      cloud.position.set(CLOUD_DRIFT[0] * t, CLOUD_HEIGHT, CLOUD_DRIFT[1] * t);
      cyclone.rotation.y = 0.03 * t;
      const hit = beat !== null && t >= beat ? Math.exp(-(t - beat) / 0.5) : 0;
      const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 1.8);
      lava.material.uniforms.uColour.value.copy(lavaCool).lerp(lavaHot, Math.min(1, 0.25 * pulse + hit));
      const swell = 1 + 0.08 * pulse + 1.4 * hit;
      lava.scale.set(42 * KM * swell, 1, 42 * KM * swell);
      const slot = Math.floor(t * 9);
      const lit = flashes[slot % flashes.length] > 0.82 ? 1 : flashes[(slot + 4095) % flashes.length] > 0.82 ? 0.45 : 0;
      storm.material.uniforms.uColour.value.copy(stormDull).lerp(stormFlash, lit);
      wisps.forEach((wisp, i) => {
        const along = 1 + 0.12 * Math.sin(t * 0.5 + i * 2.1);
        wisp.scale.x = [150, 110, 85][i] * KM * along;
      });
    },
    solo: (part) => kit.solo(part),
  };
}

const module: PlaceModule = {
  unit: UNIT,
  shots,
  heightOf: (pose) => pose.position[1],
  view: (pose, aspect) => {
    const h = 2 * pose.position[1] * Math.tan((pose.fov * Math.PI) / 360);
    const w = h * aspect;
    return {
      master: { x0: (pose.position[0] - w / 2) / KM + MASTER_W / 2, y0: (pose.position[2] - h / 2) / KM + MASTER_H / 2, w: w / KM, h: h / KM },
      widthKm: w,
    };
  },
  create,
};

export default module;
