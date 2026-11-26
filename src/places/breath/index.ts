// The Breath: a tidal shelf of bone-rock on the titan's lung, pierced by its airways, at a cold dawn under sea fog.
// This file is the root of the place: the cameras, and the order in which the folders are made. What each folder draws is in its own index.ts.
// Origin: the centre of the main shaft at shelf level. North is -z (the top of the layout sketch), east is +x, metres, y up.
import * as THREE from 'three';
import { through, type CameraPath, type Pose, type Vec3 } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { stream } from '../../core/rng';
import { neutralLook } from '../../core/stage';
import { keyPart, shotById } from '../../film/cut';
import * as air from './air';
import * as dead from './dead';
import * as land from './land/index';
import * as plumes from './plumes';
import * as waders from './waders';
import * as water from './water';
import { RAD, SEA, ground } from './land';
import { EXHALE, UNIT } from './shared/anchors';
import { createStandIns } from './shared/blockout';
import type { Context, Folder, Piece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';

function look(position: Vec3, bearingDeg: number, pitchDeg: number, fov: number, reach = 60): Pose {
  const b = bearingDeg * RAD;
  const p = pitchDeg * RAD;
  return { position, aim: [position[0] + Math.sin(b) * Math.cos(p) * reach, position[1] + Math.sin(p) * reach, position[2] - Math.cos(b) * Math.cos(p) * reach], fov };
}

/** The lens of a pose: the radius of the lens in metres and the distance of sharp focus in metres. */
const lens = (pose: Pose, aperture: number, focus: number): Pose => ({ ...pose, aperture, focus });

const key = (id: string): number => keyPart(shotById(id));

// One way through the place: in over the shelf toward the pit, up to its south lip and out over the drop, along the west lip past the plumes,
// down to the channel where the waders feed, and back to the lip where the dead one lies. No shot pulls back: each one travels the way it looks.
const shots: Record<string, CameraPath> = {
  'breath-01': through(look([-41.5, 11, 42.3], 21, -15, 50), key('breath-01'), { forward: -24, up: 4, right: -3 }, { forward: 14, up: -3, right: 10, turn: -8 }),
  'breath-02': through(look([-8.6, 4.4, 31.2], 13, -25, 50), key('breath-02'), { forward: -7, up: -1.5, right: 3, turn: 11, tilt: 8 }, { forward: 3, up: 3.5, right: 6, turn: -2, tilt: -4 }),
  'breath-03': through(lens(look([-32.5, 3.6, 5], 12, -8, 38), 0.03, 4.8), key('breath-03'), { forward: -11, up: 0.8, right: 1.5, turn: -4 }, { forward: 0.6, right: 0.1 }),
  'breath-04': through(lens(look([-50.7, 1.9, -19.5], 15, -8.5, 38), 0.075, 10.5), key('breath-04'), { right: -5, forward: -3 }, { right: 4, forward: 2.5 }),
  'breath-05': through(lens(look([-28.5, 2.6, 28.3], 12, -10.3, 40), 0.028, 6.2), key('breath-05'), { forward: -6, up: 0.6, right: -1 }, { forward: 2.5, up: -0.1, right: 0.4 }),
};

// The order matters: the land tells the rig its shape before anything reads it, and the air comes last because it draws over everything.
const FOLDERS: Folder[] = [land, water, plumes, waders, dead, air];

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
    const id = `${file}|${kind}|${repeat}|${anisotropy}`;
    const have = pictures.get(id);
    if (have) return have;
    let done: () => void = () => undefined;
    let failed: (e: Error) => void = () => undefined;
    waiting.push(
      new Promise<void>((resolve, reject) => {
        done = resolve;
        failed = reject;
      }),
    );
    const t = loader.load(`${import.meta.env.BASE_URL}assets/breath/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/breath/${file} did not load`)));
    t.colorSpace = kind === 'data' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = anisotropy;
    pictures.set(id, t);
    return t;
  };

  const ctx: Context = {
    scene,
    parts,
    rig,
    rng: (name) => stream(`breath/${name}`),
    assets: { texture },
    sources: { steam: [] },
    events: { exhale: EXHALE },
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

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.3, 40000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.08, grain: 0.006 },
    volume,
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

const placeModule: PlaceModule = {
  unit: UNIT,
  shots,
  heightOf: (pose) => pose.position[1] - Math.max(SEA, ground(pose.position[0], pose.position[2])),
  create,
};

export default placeModule;
