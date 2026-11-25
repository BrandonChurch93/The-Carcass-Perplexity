// The Heart: a caldera on the titan's heart, a lake of lava under a crust, and the animals that feed at its seams.
// This file is the root of the place: the cameras, and the order in which the folders are made. What each folder draws is in its own index.ts.
import * as THREE from 'three';
import { moved, through, type CameraPath, type Move, type Pose, type Vec3 } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { keyPart, shotById } from '../../film/cut';
import { MOUTH, bearing, establishing, floor } from './layout';
import * as air from './air';
import * as fall from './fall';
import * as lake from './lake';
import * as land from './land';
import * as sunk from './sunk';
import * as walkers from './walkers';
import { LINE, SUNK, SURGE, T0, UNIT, WALKERS, keySeconds, walkerPosition, type Walker } from './shared/anchors';
import { createStandIns } from './shared/blockout';
import type { HeartContext, HeartFolder, HeartPiece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';

function fly(position: Vec3, heading: number, pitch: number, fov: number): Pose {
  const [hx, hz] = bearing(heading);
  const c = Math.cos((pitch * Math.PI) / 180);
  const s = Math.sin((pitch * Math.PI) / 180);
  return { position, aim: [position[0] + hx * c * 200, position[1] + s * 200, position[2] + hz * c * 200], fov };
}

const over = (x: number, z: number, height: number): Vec3 => [x, floor(x, z) + height, z];

const KEY0 = establishing();

const groupAt = walkerPosition(WALKERS[1] as Walker, keySeconds('heart-3'));
const KEY3 = fly(over(groupAt[0] - 53.5, groupAt[1] + 59.5, 3), 44.5, 2.3, 18);

const KEY1 = fly(over(LINE[0], LINE[1], 1.6), 61, -7.5, 45);
const LINE_DIR = bearing(61);

const KEY2 = fly(over(SUNK[0] - 14.6, SUNK[2] + 21.4, 2.4), 26.5, -1.5, 33);

const MOUTH_AIM: Vec3 = [MOUTH.x + 26, 68, MOUTH.z];
const RETREAT = bearing(214);
const back = (distance: number, height: number, side = 0): Vec3 => {
  const x = MOUTH.x + RETREAT[0] * distance - RETREAT[1] * side;
  const z = MOUTH.z + RETREAT[1] * distance + RETREAT[0] * side;
  return over(x, z, height);
};
const KEY4: Pose = { position: back(760, 5), aim: MOUTH_AIM, fov: 15 };

const shots: Record<string, CameraPath> = {
  'heart-01': through(KEY0, keyPart(shotById('heart-01')), { forward: -58, up: 13, right: -9, turn: 1.5 }, { forward: 50, up: -8, turn: 2.5 }),
  'heart-02': through(KEY3, keyPart(shotById('heart-02')), { right: 13, forward: -14, turn: -6, up: 0.8 }, { right: -13, forward: 12, turn: 6.5, up: -0.4 }),
  'heart-03': [
    { at: 0, pose: fly(over(LINE[0] - LINE_DIR[0] * 13, LINE[1] - LINE_DIR[1] * 13, 4.2), 58, -11, 45) },
    { at: keyPart(shotById('heart-03')), pose: KEY1 },
    { at: 1, pose: fly(over(LINE[0] + LINE_DIR[0] * 4.5 - 1.5, LINE[1] + LINE_DIR[1] * 4.5 - 1, 1.7), 63.5, -8.5, 45) },
  ] satisfies Move,
  'heart-04': [
    { at: 0, pose: moved(KEY2, { right: -3.2, forward: -2.6, up: 0.5, turn: 1.5 }) },
    { at: keyPart(shotById('heart-04')), pose: KEY2 },
    { at: 1, pose: moved(KEY2, { right: 3.2, forward: 3, up: 0.1, turn: -1.5 }) },
  ] satisfies Move,
  'heart-05': [
    { at: 0, pose: { position: back(655, 9), aim: MOUTH_AIM, fov: 15 } },
    { at: keyPart(shotById('heart-05')), pose: KEY4 },
    { at: 1, pose: { position: back(850, 24, 62), aim: [MOUTH_AIM[0], MOUTH_AIM[1] - 8, MOUTH_AIM[2]], fov: 15 } },
  ] satisfies Move,
};

const LOOP_CENTRE = moved(KEY0, { forward: 34, up: -5, right: 16 });
const loopPath: CameraPath = (part) => {
  const a = part * Math.PI * 2;
  const pose = moved(LOOP_CENTRE, { right: 13 * Math.sin(a), forward: 10 * Math.cos(a), up: 1.8 * Math.sin(a + 0.9) });
  return { ...pose, aim: [LOOP_CENTRE.aim[0] + 20 * Math.sin(a), LOOP_CENTRE.aim[1], LOOP_CENTRE.aim[2] + 12 * Math.cos(a)] };
};

// The order matters: the land tells the rig its shape before anything reads it, and the air comes last because it draws over everything.
const FOLDERS: HeartFolder[] = [land, lake, fall, walkers, sunk, air];

async function create(): Promise<Place> {
  const parts = new Parts(UNIT);
  const scene = new THREE.Scene();
  const rig = createRig(T0);

  const loader = new THREE.TextureLoader();
  const pictures = new Map<string, THREE.Texture>();
  const waiting: Promise<void>[] = [];
  const texture = (file: string, options: TextureOptions = {}): THREE.Texture => {
    const kind = options.kind ?? 'colour';
    const repeat = options.repeat ?? true;
    const anisotropy = options.anisotropy ?? 1;
    const key = `${file}|${kind}|${repeat}|${anisotropy}`;
    const have = pictures.get(key);
    if (have) return have;
    let done: () => void = () => undefined;
    let failed: (e: Error) => void = () => undefined;
    waiting.push(
      new Promise<void>((resolve, reject) => {
        done = resolve;
        failed = reject;
      }),
    );
    const t = loader.load(`${import.meta.env.BASE_URL}assets/heart/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/heart/${file} did not load`)));
    t.colorSpace = kind === 'data' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = anisotropy;
    pictures.set(key, t);
    return t;
  };

  const ctx: HeartContext = {
    scene,
    parts,
    rig,
    rng: (name) => stream(`heart/${name}`),
    assets: { texture },
    sources: { steam: [], heat: [] },
    events: { surge: SURGE },
  };

  const pieces: HeartPiece[] = [];
  const owned = new Set<string>();
  for (const folder of FOLDERS) {
    pieces.push(folder.create(ctx));
    for (const name of folder.PARTS) owned.add(name);
    // The land has told the rig its shape: bake it before the next folder reads it.
    if (folder === (land as HeartFolder)) rig.bake();
  }
  const standIns = createStandIns(scene, parts, owned);
  await Promise.all(waiting);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.4, 40000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), exposure: 1.7, bloom: 0.05, vignette: 0.1, grain: 0.006 },
    volume,
    parts,
    resize: (width, height) => {
      for (const p of pieces) p.resize?.(width, height);
    },
    setTime: (seconds) => {
      rig.setTime(seconds);
      for (const p of pieces) p.setTime?.(seconds);
      standIns.setTime(seconds);
    },
    beforeSample: (renderer, view) => {
      rig.beforeSample(renderer, view);
      for (const p of pieces) p.beforeSample?.(renderer, view);
    },
    solo: (part) => {
      // An effect drawn alone: every built surface goes black and the piece that owns the effect draws it.
      const effect = part !== null && parts.byId(part)?.kind === 'effect';
      (rig.uniforms.uSolo as THREE.IUniform<number>).value = effect ? 1 : 0;
      for (const p of pieces) p.solo?.(part);
      standIns.solo(part);
    },
    dispose: () => {
      for (const p of pieces) p.dispose?.();
      rig.dispose();
      for (const t of pictures.values()) t.dispose();
    },
  };
}

const place: PlaceModule = {
  unit: UNIT,
  shots,
  loop: { path: loopPath, timeOffset: 7 },
  heightOf: (pose) => pose.position[1] - floor(pose.position[0], pose.position[2]),
  create,
};

export default place;
