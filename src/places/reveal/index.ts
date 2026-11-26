// The rise: one shot from the lake in the Eye to orbit, where the continent is the titan.
// This file is the root of the place: the camera, and the order in which the folders are made. What each folder draws is in its own index.ts.
import * as THREE from 'three';
import type { CameraPath } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { stream } from '../../core/rng';
import { neutralLook } from '../../core/stage';
import { BEAT, FILM_ASPECT, FOV, KM, MASTER_H, MASTER_W, UNIT, poseAt, riseShots } from './shared/anchors';
import * as join from './join';
import * as land from './land';
import { createStandIns } from './shared/blockout';
import type { Context, Folder, Piece, TextureOptions } from './shared/context';
import { createRig } from './shared/rig';
import { setStaged } from './shared/stage';
import * as sky from './sky';

// The camera of the rise is one path (shared/anchors.ts, from rise.json and the windows of pullback.json): straight above its window, looking down.
const shots: Record<string, CameraPath> = {};
for (const s of riseShots) shots[s.id] = (_part, frame) => poseAt(frame);

const FOLDERS: Folder[] = [land, sky, join];

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
    const t = loader.load(`${import.meta.env.BASE_URL}assets/reveal/${file}`, () => done(), undefined, () => failed(new Error(`The picture assets/reveal/${file} did not load`)));
    t.colorSpace = kind === 'data' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.flipY = false;
    t.anisotropy = anisotropy;
    pictures.set(key, t);
    return t;
  };

  const ctx: Context = {
    scene,
    parts,
    rig,
    rng: (name) => stream(`reveal/${name}`),
    assets: { texture },
    events: { heartbeat: BEAT },
  };

  const pieces: Piece[] = [];
  const owned = new Set<string>();
  for (const folder of FOLDERS) {
    pieces.push(folder.create(ctx));
    for (const name of folder.PARTS) owned.add(name);
  }
  const standIns = createStandIns(scene, parts, owned);
  await Promise.all(waiting);

  const camera = new THREE.PerspectiveCamera(FOV, FILM_ASPECT, 1, 120000);
  const volume = pieces.find((p) => p.volume)?.volume ?? null;

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
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
