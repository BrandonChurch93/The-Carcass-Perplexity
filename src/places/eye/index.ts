// The Eye: a round lake in a socket of pale cliffs, a ring of amber shallows and a centre that goes all the way down.
// Origin: the centre of the lake on the water surface. North is -z, east is +x, y is up. The low sun is in the west.
// This file is the root of the place: the order in which the folders are made. The cameras are in cameras.ts, the layout in land.ts,
// and what each folder draws is in its own index.ts.
import * as THREE from 'three';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import * as air from './air';
import { shots } from './cameras';
import * as drinkers from './drinkers';
import * as lake from './lake';
import * as land from './land';
import * as skeleton from './skeleton';
import { landHeight } from './layout';
import { END, RISE, UNIT } from './shared/anchors';
import { createStandIns } from './shared/blockout';
import type { Context, Folder, Piece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';

// The order matters: the land tells the rig its shape before anything reads it, and the air comes last because it draws over everything.
const FOLDERS: Folder[] = [land, lake, drinkers, skeleton, air];

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
    const t = loader.load(`${import.meta.env.BASE_URL}assets/eye/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/eye/${file} did not load`)));
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
    rng: (name) => stream(`eye/${name}`),
    assets: { texture },
    sources: { steam: [], heat: [] },
    events: { rise: RISE, end: END },
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

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 40000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
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
  heightOf: (pose) => pose.position[1] - Math.max(0, landHeight(pose.position[0], pose.position[2])),
  create,
};

export default place;
