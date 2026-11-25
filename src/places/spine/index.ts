// The Spine: a knife ridge of vertebrae above a sea of cloud, at dusk, with a storm standing against one side.
// This file is the root of the place: the cameras, and the order in which the folders are made. What each folder draws is in its own index.ts.
// Origin: the foot of the first spire, on its axis. The ridge runs toward +x (down the spine), the storm stands on -z, the cloud sea and the last light lie on +z.
import * as THREE from 'three';
import type { CameraPath, Move, Pose, Vec3 } from '../../core/cameras';
import { mix, through } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { keyPart, shotById } from '../../film/cut';
import * as air from './air';
import * as kites from './kites';
import * as land from './land';
import * as runners from './runners';
import * as strikes from './strikes';
import { first, heightAbove, world } from './ridge';
import { CANAL_KEY, CARCASS, RAD, STRIKES, UNIT, canalFar, carcassView, heading, kiteEdge, raised, spire, step, strikeTip, tube } from './shared/anchors';
import { on, tipOf } from './ridge';
import { createStandIns } from './shared/blockout';
import type { Context, Folder, Piece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';

function aimed(position: Vec3, h: number, pitch: number, fov: number, reach = 600): Pose {
  const c = Math.cos(pitch * RAD);
  return { position, aim: [position[0] + Math.cos(h * RAD) * c * reach, position[1] + Math.sin(pitch * RAD) * reach, position[2] + Math.sin(h * RAD) * c * reach], fov };
}

const E_S = first.s - 552;
const standE = on(E_S, 0, 8);
const viewE = heading(standE, [first.x, 0, first.z]) + 17;
const keyEstablishing = aimed(standE, viewE, 5.6, 50);
const establishingMove: Move = [
  { at: 0, pose: aimed(on(E_S - 150, -2, 34), viewE - 5, 1.2, 50) },
  { at: 0.34, pose: aimed(on(E_S - 62, -1, 17), viewE - 2, 3.4, 50) },
  { at: keyPart(shotById('spine-01')), pose: keyEstablishing },
  { at: 1, pose: aimed(on(E_S + 44, 2, 6), viewE + 1.5, 5, 50) },
];

const KITE_FOV = 36;
const KITE_REACH = 78;
const KITE_PITCH = 7.2;
const kiteBack = heading(tipOf(spire(2)), kiteEdge) - 12.3;
const kiteFlat = step(kiteEdge, kiteBack, KITE_REACH);
const kiteStand: Vec3 = [kiteFlat[0], kiteEdge[1] - KITE_REACH * Math.tan(KITE_PITCH * RAD), kiteFlat[2]];
const keyKites = aimed(kiteStand, heading(kiteStand, kiteEdge) + 5.3, KITE_PITCH, KITE_FOV);

const CARCASS_FOV = 48;
const carcassStand = raised(step(CARCASS, carcassView + 190, 2.1), 0.56);
const keyCarcass = aimed(carcassStand, carcassView, -7.4, CARCASS_FOV, 40);
const carcassFrom = aimed(raised(step(carcassStand, carcassView + 176, 11), 3.2), carcassView - 2.5, -10, CARCASS_FOV, 40);
const carcassTo = aimed(raised(step(carcassStand, carcassView - 4, 0.22), 0.55), carcassView + 0.4, -7.3, CARCASS_FOV, 40);
const carcassKeyAt = keyPart(shotById('spine-03'));
const carcassMove: CameraPath = (part) => {
  const lead = Math.max(0, 1 - part / carcassKeyAt);
  const tail = Math.max(0, (part - carcassKeyAt) / (1 - carcassKeyAt));
  const back = 0.93 * lead * lead + 0.07 * lead;
  const to = part > carcassKeyAt ? carcassTo : carcassFrom;
  const k = part > carcassKeyAt ? tail : back;
  return { position: mix(keyCarcass.position, to.position, k), aim: mix(keyCarcass.aim, to.aim, k), fov: CARCASS_FOV };
};

const STRIKE_FOV = 10;
const STRIKE_REACH = 1650;
const strikePass = world(spire(2).s, 20, 0);
const strikeBack = heading(strikeTip, strikePass);
const strikeFlat = step(strikeTip, strikeBack, STRIKE_REACH);
const strikeStand: Vec3 = [strikeFlat[0], strikeTip[1] - STRIKE_REACH * Math.tan(4.2 * RAD), strikeFlat[2]];
const keyStrike = aimed(strikeStand, heading(strikeStand, strikeTip) + 2.5, 1.8, STRIKE_FOV, 1700);

const canalPose = (d: number, h: number, yaw: number, pitch: number): Pose => {
  const p = tube(d, 0.6, h);
  return aimed(p, heading(p, canalFar) + yaw, pitch, 54, 30);
};
const keyCanal = canalPose(CANAL_KEY, 0.7, -24, -2);
const canalMove: Move = [
  { at: 0, pose: canalPose(CANAL_KEY - 6.5, 0.95, -20, -1) },
  { at: keyPart(shotById('spine-05')), pose: keyCanal },
  { at: 1, pose: canalPose(CANAL_KEY + 6.5, 0.8, -20, -1) },
];

const shots: Record<string, CameraPath> = {
  'spine-01': establishingMove,
  'spine-02': through(keyKites, keyPart(shotById('spine-02')), { right: -20, forward: -22, up: -4 }, { right: 20, forward: 22, up: 4 }),
  'spine-03': carcassMove,
  'spine-04': through(keyStrike, keyPart(shotById('spine-04')), { forward: -10, right: -5 }, { forward: 260, right: 130, up: 20, turn: -2.6 }),
  'spine-05': canalMove,
};

// The order matters: the land tells the rig its shape before anything reads it, and the air comes last because it draws over everything.
const FOLDERS: Folder[] = [land, strikes, kites, runners, air];

async function create(): Promise<Place> {
  const parts = new Parts(UNIT);
  const scene = new THREE.Scene();
  const rig = createRig();

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
    const t = loader.load(`${import.meta.env.BASE_URL}assets/spine/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/spine/${file} did not load`)));
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
    rng: (name) => stream(`spine/${name}`),
    assets: { texture },
    sources: { steam: [] },
    events: { strikes: STRIKES },
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

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.25, 52000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.03, vignette: 0.1, grain: 0.006 },
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
  heightOf: (pose) => heightAbove(pose.position),
  create,
};

export default place;
