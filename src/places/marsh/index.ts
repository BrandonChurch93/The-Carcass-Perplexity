// The Blood Marsh: salt flats over the old blood, which still seeps up red through pools and channels under a white overcast.
// This file is the root of the place: the cameras, and the order in which the folders are made. What each folder draws is in its own index.ts.
import * as THREE from 'three';
import { through, type CameraPath, type Pose } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { keyPart, shotById } from '../../film/cut';
import * as air from './air';
import * as brine from './brine';
import * as dead from './dead';
import * as fliers from './fliers';
import * as land from './land';
import * as stalks from './stalks';
import * as wallowers from './wallowers';
import { BURST, DEG, EYE_HEIGHT, K1_AT, K1_DIR, K2_AT, K2_DIR, T0, UNIT, at, keyTime } from './shared/anchors';
import { createStandIns } from './shared/blockout';
import type { Context, Folder, Piece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';

// The five cameras. Positions are fixed numbers in the world, not heights above whatever the land is today: the land is built round the cameras.

/** marsh-0, the establishing view: from the rock rise, over the seep pool and down the vein to the flats. */
const K0: Pose = { position: at(3, -1.5, 7.6), aim: at(63, -1.5, 7.6 - 60 * Math.tan(13.2 * DEG)), fov: 44 };

/** marsh-2, the stalk colony, from the bank of the pool. */
const K2: Pose = {
  position: [K2_AT[0], 2.7, K2_AT[1]],
  aim: [K2_AT[0] + K2_DIR[0] * 20, 2.7 - 20 * Math.tan(7.6 * DEG), K2_AT[1] + K2_DIR[1] * 20],
  fov: 30,
  focus: 3.2,
  aperture: 0.006,
};

/** marsh-1, the seep pool, from half a metre over its brine at the lip of the bank. */
const K1_LENS: [number, number, number] = [K1_AT[0] + K1_DIR[0] * 1.0, 0.55, K1_AT[1] + K1_DIR[1] * 1.0];
const K1: Pose = {
  position: K1_LENS,
  aim: [K1_LENS[0] + K1_DIR[0] * 10, K1_LENS[1] - 10 * Math.tan(9.5 * DEG), K1_LENS[2] + K1_DIR[1] * 10],
  fov: 35,
  focus: 3.8,
  aperture: 0.011,
};

/** marsh-3, the wallowers in the vein. */
const K3: Pose = { position: at(27.7, 3, 1.5), aim: at(37.7, 3.2, 0.2), fov: 30, aperture: 0.007 };
/** marsh-4, the one on the thin crust. */
const K4: Pose = { position: at(24.6, 19.6, 1.5), aim: at(27.6, 10.07, -0.39), fov: 35, focus: 5.7, aperture: 0.016 };

// The five shots are one walk: each starts near where the last ended, on a heading close to it, with its subject already small in the last frames
// of the shot before. Thick stalks stand close to two of the paths, so those paths turn to keep them at the edge of the frame.
const shots: Record<string, CameraPath> = {
  // Down off the rock rise toward the seep pool.
  'marsh-01': through(K0, keyPart(shotById('marsh-01')), { forward: -8, right: 4, up: 2, turn: 10 }, { forward: 7.5, right: -1, up: -1.5, turn: -13 }),
  // Along the pool's bank, in and to the right round the near stalks while the lens turns left to hold them: they leave by the left edge.
  'marsh-02': through(K2, keyPart(shotById('marsh-02')), { right: -2.2, forward: -2.6, up: 0.3, turn: 10 }, { right: 2.6, forward: 0.6, turn: -8 }),
  // In over the brine to the dome; the last of it turns right, toward the wallowers.
  'marsh-03': through(K1, keyPart(shotById('marsh-03')), { forward: -2.6, right: -1.2, up: 0.6, turn: 5 }, { forward: 0.6, right: 0.5, up: 0.5, turn: 14, tilt: 3 }),
  // Left along the vein past the wallowers, turning right as it goes, so the stalks on the near bank leave by the left edge.
  'marsh-04': [
    { at: 0, pose: { position: at(26.9, 6.3, 1.8), aim: at(36.4, 4.6, 0.25), fov: 30, aperture: 0.011 } },
    { at: Math.min(0.98, Math.max(0.02, keyPart(shotById('marsh-04')))), pose: K3 },
    { at: 1, pose: { position: at(28.3, 1.5, 1.5), aim: at(38, 6, 0.25), fov: 30, aperture: 0.011 } },
  ],
  // From over the thin crust, wide, with the vein, the pool and its stalks behind the stuck one, down and in to it.
  'marsh-05': through(K4, keyPart(shotById('marsh-05')), { forward: -9, up: 2.2, right: 1.5, turn: 14, tilt: -6 }, { forward: 1.7, up: 0.15, right: 0.5 }),
};

// The order matters: the land tells the rig its shape before anything reads it, and the air comes last because it draws over everything.
const FOLDERS: Folder[] = [land, brine, stalks, wallowers, dead, fliers, air];

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
    const t = loader.load(`${import.meta.env.BASE_URL}assets/marsh/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/marsh/${file} did not load`)));
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

  const ctx: Context = {
    scene,
    parts,
    rig,
    rng: (name) => stream(`marsh/${name}`),
    assets: { texture },
    sources: { steam: [], heat: [] },
    events: { burst: BURST },
  };

  const pieces: Piece[] = [];
  const owned = new Set<string>();
  for (const folder of FOLDERS) {
    pieces.push(folder.create(ctx));
    for (const name of folder.PARTS) owned.add(name);
    // The land has told the rig its shape: bake it before the next folder reads it.
    if (folder === (land as Folder)) rig.bake();
  }
  const standIns = createStandIns(scene, parts, owned);
  await Promise.all(waiting);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.15, 30000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), exposure: 2, bloom: 0.02, vignette: 0.1, grain: 0.006 },
    volume,
    depthFirst: true,
    parts,
    resize: (width, height) => {
      for (const p of pieces) p.resize?.(width, height);
    },
    setTime: (seconds, staged) => {
      setStaged(staged ?? seconds);
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
  heightOf: (pose) => pose.position[1],
  create,
};

export default place;
