import * as THREE from 'three';
import { judgedFrames } from '../../tools/lib/judged.mjs';
import { config, FPS } from '../config';
import { applyPose, focusOf, resolve, type CameraPath, type Pose } from '../core/cameras';
import type { Parts, Place, PlaceModule } from '../core/place';
import { neutralLook, type CameraState, type Lens, type Look, type Stage } from '../core/stage';
import { places } from '../places';
import { cut, partOfFrame, placeOf, type CutShot } from './cut';

export interface Shot {
  id: string;
  unit: string | null;
  first: number;
  last: number;
  key: string | null;
}

export interface FilmInfo {
  fps: number;
  frameCount: number;
  shots: Shot[];
  places: { unit: string; first: number; last: number }[];
  keyFrames: Record<string, number>;
  judged: Record<string, number>;
  events: { id: string; unit: string; frame: number }[];
  titanFrame: number | null;
  loop: { frameCount: number; unit: string };
}

export interface FilmState {
  frame: number;
  shot: string;
  unit: string | null;
  camera: CameraState;
  view?: Record<string, unknown>;
}

export interface Film {
  info(): FilmInfo;
  shotAt(frame: number): Shot;
  ready(frame: number): Promise<void>;
  readyLoop(): Promise<void>;
  readyAll(): Promise<void>;
  stageAt(frame: number): Stage;
  loopStage(): Stage;
  state(frame: number): FilmState;
  partsOf(unit: string): Promise<PartInfo[]>;
}

export interface PartInfo {
  id: string;
  unit: string;
  name: string;
  kind: string;
  state: string;
}

const BLACK = 'black';
const ASPECT = config.formats.master.width / config.formats.master.height;
const LOOP_FRAMES = config.deliver.cardLoop.seconds * FPS;
const LOOP_UNIT = config.deliver.cardLoop.unit;

const REST: Pose = { position: [0, 0, 0], aim: [0, 0, -1], fov: 40 };

function blackStage(): Stage {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, ASPECT, 0.1, 10);
  const look: Look = { ...neutralLook(), bloom: 0, vignette: 0 };
  return {
    id: BLACK,
    unit: null,
    scene,
    camera,
    lens: { aperture: 0, focus: 1 },
    look,
    volume: null,
    resize: () => undefined,
    setTime: () => undefined,
    cameraAt: () => ({ position: REST.position, aim: REST.aim, height: 0, lens: { fovDegrees: REST.fov, aperture: 0, focus: 1 } }),
    beforeSample: () => undefined,
  };
}

function pathOf(module: PlaceModule, shot: CutShot): CameraPath {
  const path = module.shots[shot.id];
  if (!path) throw new Error(`The place ${module.unit} has no camera for the shot ${shot.id}`);
  return path;
}

function cameraState(module: PlaceModule | null, pose: Pose): CameraState {
  return {
    position: pose.position,
    aim: pose.aim,
    height: module?.heightOf?.(pose) ?? pose.position[1],
    lens: { fovDegrees: pose.fov, aperture: pose.aperture ?? 0, focus: focusOf(pose) },
  };
}

class UnitStage implements Stage {
  readonly id: string;
  readonly unit: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly lens: Lens = { aperture: 0, focus: 100 };
  readonly look: Look;
  readonly volume: THREE.ShaderMaterial | null;
  readonly warp: THREE.ShaderMaterial | null;
  readonly depthFirst: boolean;
  readonly parts: Parts;
  shot: CutShot | null = null;
  private readonly first: number;

  constructor(private readonly module: PlaceModule, private readonly place: Place) {
    this.id = module.unit;
    this.unit = module.unit;
    this.scene = place.scene;
    this.camera = place.camera;
    this.look = place.look;
    this.volume = place.volume;
    this.warp = place.warp ?? null;
    this.depthFirst = place.depthFirst ?? false;
    this.parts = place.parts;
    this.first = placeOf(module.unit).first;
  }

  private pose(seconds: number): Pose {
    const frame = seconds * FPS;
    if (this.shot) return resolve(pathOf(this.module, this.shot), partOfFrame(this.shot, frame), frame);
    const loop = this.module.loop;
    if (!loop) throw new Error(`The place ${this.unit} has no loop`);
    return resolve(loop.path, frame / LOOP_FRAMES, frame);
  }

  resize(width: number, height: number): void {
    this.place.resize?.(width, height);
  }

  setTime(seconds: number, worldShift = 0): void {
    const pose = this.pose(seconds);
    applyPose(this.camera, pose);
    this.lens.aperture = pose.aperture ?? 0;
    this.lens.focus = focusOf(pose);
    const world = this.shot ? seconds - this.first / FPS : (this.module.loop?.timeOffset ?? 0) + seconds;
    // Staging by shot follows the camera: a held camera keeps the staging of its frame while the world runs on, the loop that of the moment its place names.
    const staged = this.shot ? world : (this.module.loop?.staged ?? world);
    this.place.setTime(world + worldShift, staged);
  }

  cameraAt(seconds: number): CameraState {
    return cameraState(this.module, this.pose(seconds));
  }

  beforeSample(renderer: THREE.WebGLRenderer): void {
    this.place.beforeSample?.(renderer, this.camera);
  }

  solo(part: string | null): void {
    this.place.solo?.(part);
  }
}

export function createFilm(): Film {
  const shots = cut.shots;
  const frameCount = cut.frameCount;
  const stages = new Map<string, UnitStage>();
  const loading = new Map<string, Promise<UnitStage>>();
  const black = blackStage();
  const info: FilmInfo = {
    fps: FPS,
    frameCount,
    shots: shots.map((s) => ({ id: s.id, unit: s.unit, first: s.first, last: s.last, key: s.key })),
    places: cut.places.map((p) => ({ unit: p.unit, first: p.first, last: p.last })),
    keyFrames: cut.keyFrames,
    judged: judgedFrames(config, cut),
    events: cut.events.map((e) => ({ id: e.id, unit: e.unit, frame: e.frame })),
    titanFrame: cut.titanFrame,
    loop: { frameCount: LOOP_FRAMES, unit: LOOP_UNIT },
  };

  const moduleOf = (unit: string): PlaceModule => {
    const module = places[unit];
    if (!module) throw new Error(`No place is built for the unit ${unit}`);
    return module;
  };

  const shotAt = (frame: number): CutShot => {
    if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) throw new Error(`No such film frame: ${frame}`);
    return shots.find((s) => frame >= s.first && frame <= s.last) as CutShot;
  };

  const ensure = (unit: string): Promise<UnitStage> => {
    let job = loading.get(unit);
    if (!job) {
      job = Promise.resolve(moduleOf(unit).create()).then((place) => {
        const stage = new UnitStage(moduleOf(unit), place);
        stages.set(unit, stage);
        return stage;
      });
      loading.set(unit, job);
    }
    return job;
  };

  const built = (unit: string): UnitStage => {
    const stage = stages.get(unit);
    if (!stage) throw new Error(`The place ${unit} was asked for a frame before it was ready`);
    return stage;
  };

  return {
    info: () => info,
    shotAt,
    ready: async (frame) => {
      const shot = shotAt(frame);
      if (shot.picture !== BLACK) await ensure(shot.unit);
    },
    readyLoop: async () => {
      await ensure(LOOP_UNIT);
    },
    readyAll: async () => {
      for (const p of cut.places) await ensure(p.unit);
    },
    stageAt: (frame) => {
      const shot = shotAt(frame);
      if (shot.picture === BLACK) return black;
      const stage = built(shot.unit);
      stage.shot = shot;
      return stage;
    },
    loopStage: () => {
      const stage = built(LOOP_UNIT);
      stage.shot = null;
      return stage;
    },
    partsOf: async (unit) => {
      const stage = await ensure(unit);
      return stage.parts.all().map((p) => ({ id: p.id, unit: p.unit, name: p.name, kind: p.kind, state: p.state }));
    },
    state: (frame) => {
      const shot = shotAt(frame);
      if (shot.picture === BLACK) return { frame, shot: shot.id, unit: shot.unit, camera: cameraState(null, REST) };
      const module = moduleOf(shot.unit);
      const pose = resolve(pathOf(module, shot), partOfFrame(shot, frame), frame);
      const state: FilmState = { frame, shot: shot.id, unit: shot.unit, camera: cameraState(module, pose) };
      const view = module.view?.(pose, ASPECT);
      if (view) state.view = view;
      return state;
    },
  };
}
