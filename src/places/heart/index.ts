// The Heart: a caldera on the titan's heart, a lake of lava under a crust, and the animals that feed at its seams.
// This file is the root of the place: the cameras, and the order in which the folders are made. What each folder draws is in its own index.ts.
import * as THREE from 'three';
import { moved, through, type CameraPath, type Move, type Pose, type Travel, type Vec3 } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { keyPart, shotById } from '../../film/cut';
import { MOUTH, bearing, establishing } from './layout';
import * as air from './air';
import * as fall from './fall';
import * as lake from './lake';
import * as land from './land';
import * as sunk from './sunk';
import * as walkers from './walkers';
import { landHeight } from './land/height';
import { LINE, SURGE, T0, UNIT, WALKERS, keySeconds, walkerPosition, type Walker } from './shared/anchors';
import { createStandIns } from './shared/blockout';
import type { HeartContext, HeartFolder, HeartPiece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';

function fly(position: Vec3, heading: number, pitch: number, fov: number): Pose {
  const [hx, hz] = bearing(heading);
  const c = Math.cos((pitch * Math.PI) / 180);
  const s = Math.sin((pitch * Math.PI) / 180);
  return { position, aim: [position[0] + hx * c * 200, position[1] + s * 200, position[2] + hz * c * 200], fov };
}

/** The lens of a pose: the radius of the lens in metres and the distance of sharp focus in metres. */
const lens = (pose: Pose, aperture: number, focus: number): Pose => ({ ...pose, aperture, focus });

/** A pose moved along its own axis keeps its focus on the same thing: the focus shortens by the way forward. */
const refocused = (key: Pose, pose: Pose, forward: number): Pose => (key.focus === undefined ? pose : { ...pose, focus: Math.max(0.5, key.focus - forward) });

/** `through`, with the focus held on what the key is focused on. */
const pushed = (key: Pose, keyAt: number, before: Travel, after: Travel): Move => {
  const move = through(key, keyAt, before, after);
  return [
    { at: (move[0] as Move[number]).at, pose: refocused(key, (move[0] as Move[number]).pose, before.forward ?? 0) },
    move[1] as Move[number],
    { at: (move[2] as Move[number]).at, pose: refocused(key, (move[2] as Move[number]).pose, after.forward ?? 0) },
  ];
};

/** A point at a height above the built ground: the land where there is land, the lake where there is none. */
const over = (x: number, z: number, height: number): Vec3 => [x, Math.max(0, landHeight(x, z)) + height, z];

// The five cameras. Every key looks toward the vessel mouth, and every move is the same kind of move: a push forward with a slight crab to the
// right, slower and lower shot by shot, so the five shots read as one passage down from the bench to the crust and out toward the fall.
// Positions are fixed numbers in the world, not heights above whatever the land is today: the land is built round the cameras, not the other way.
// The wide view is sharp throughout. The other four have a lens: the near rocks and the far wall go soft as in the approved pictures, by no more
// than the pictures show, so the place keeps its size.

/** heart-0, the establishing view: the pose the wide picture was fitted to. */
const KEY0 = establishing();

/** heart-3, the group feeding at the seam, through a long lens: 66 m from the hero and 6.3 m over the crust, so its back stands at about twice the
 *  height of the lens and its feet a third of the way up the frame, as in the approved picture. The hero stands left of the axis. */
const groupAt = walkerPosition(WALKERS[1] as Walker, keySeconds('heart-3'));
const KEY3 = lens(fly([groupAt[0] - 42.8, 6.3, groupAt[1] + 50.5], 44.5, 0.4, 18), 0.15, 68);

/** heart-1, the lava at the line: on the last rocks of the shore, with the channel leaving the shore ahead on the left and passing on the right. */
const KEY1 = lens(fly([LINE[0] - 3.5, 1.7, LINE[1] + 3.5], 52, -7.5, 45), 0.016, 6);

/** heart-2, the one that sank: from the shore, the carcass in the middle distance and the mouth behind it on the left. */
const KEY2 = lens(fly(over(-520, 287, 4.4), 43, -4.5, 40), 0.075, 21);

/** heart-4, the mouth and its fall, through the longest lens of the place, from the crust. */
const MOUTH_AIM: Vec3 = [MOUTH.x + 26, 68, MOUTH.z];
const KEY4: Pose = lens({ position: [-455, 3, 178], aim: MOUTH_AIM, fov: 13.2 }, 0.2, 760);
/** A push that keeps looking at one point. */
const toward = (pose: Pose, forward: number, right: number, up: number): Pose => refocused(pose, { ...moved(pose, { forward, right, up }), aim: pose.aim }, forward);

const key = (id: string): number => keyPart(shotById(id));

const shots: Record<string, CameraPath> = {
  // 60 m down off the bench, from 28 m to 17 m, and the lake opens under the lens.
  'heart-01': through(KEY0, key('heart-01'), { forward: -28, right: -7.8, up: 0.5, turn: -3 }, { forward: 28, right: 7.8, up: -5.5, turn: 4.8 }),
  // 16 m toward the group, 6 m above the crust, with the least crab of the five: on this lens a metre sideways slides the hero a tenth of the frame.
  'heart-02': pushed(KEY3, key('heart-02'), { forward: -8, right: -1, up: 0.3, turn: -0.3 }, { forward: 8, right: 1, up: -0.3, turn: 0.3 }),
  // 7 m down to the edge of the shore, from 2.7 m to 1.6 m, slowing onto the channel.
  'heart-03': pushed(KEY1, key('heart-03'), { forward: -4.2, right: -0.6, up: 0.5 }, { forward: 2.8, right: 0.5, up: 0.25 }),
  // 5 m toward the carcass.
  'heart-04': pushed(KEY2, key('heart-04'), { forward: -2.6, right: -0.8, up: 0.3 }, { forward: 2.6, right: 0.8, up: -0.1 }),
  // 34 m toward the mouth on the long lens: the near crust slides, the wall hardly grows, and the surge comes at the key.
  'heart-05': [
    { at: 0, pose: toward(KEY4, -17, -3, 0.9) },
    { at: key('heart-05'), pose: KEY4 },
    { at: 1, pose: toward(KEY4, 17, 3, -0.6) },
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
  const warp = pieces.find((p) => p.warp)?.warp ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), exposure: 2.4, bloom: 0.07, vignette: 0.06, grain: 0.006, knee: [0.38, 0.61], fire: [0.2, 0.75, 0.6] },
    volume,
    warp,
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
  // The loop keeps the staging of the wide view's key for its whole length: its world runs across two cuts of the film.
  loop: { path: loopPath, timeOffset: 7, staged: keySeconds('heart-0') },
  heightOf: (pose) => pose.position[1] - Math.max(0, landHeight(pose.position[0], pose.position[2])),
  create,
};

export default place;
