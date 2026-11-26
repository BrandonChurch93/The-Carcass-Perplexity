import type * as THREE from 'three';
import type { CameraPath, Pose } from './cameras';
import type { Look } from './stage';

export type PartKind = 'solid' | 'effect';
export type PartState = 'stand-in' | 'built' | 'fallback';

export interface LivePart {
  id: string;
  unit: string;
  name: string;
  kind: PartKind;
  state: PartState;
  objects: THREE.Object3D[];
}

export class Parts {
  private readonly list: LivePart[] = [];

  constructor(readonly unit: string) {}

  private add(name: string, kind: PartKind, state: PartState, objects: THREE.Object3D[]): void {
    const id = `${this.unit}/${name}`;
    if (this.list.some((p) => p.id === id)) throw new Error(`The part ${id} is registered twice`);
    for (const o of objects) o.userData.part = id;
    this.list.push({ id, unit: this.unit, name, kind, state, objects });
  }

  standIn<T extends THREE.Object3D>(name: string, object: T, ...more: THREE.Object3D[]): T {
    this.add(name, 'solid', 'stand-in', [object, ...more]);
    return object;
  }

  built<T extends THREE.Object3D>(name: string, object: T, ...more: THREE.Object3D[]): T {
    this.add(name, 'solid', 'built', [object, ...more]);
    return object;
  }

  fallback<T extends THREE.Object3D>(name: string, object: T, ...more: THREE.Object3D[]): T {
    this.add(name, 'solid', 'fallback', [object, ...more]);
    return object;
  }

  effect(name: string, state: PartState): void {
    this.add(name, 'effect', state, []);
  }

  all(): readonly LivePart[] {
    return this.list;
  }

  byId(id: string): LivePart | undefined {
    return this.list.find((p) => p.id === id);
  }
}

export function partOf(object: THREE.Object3D): string | null {
  let cur: THREE.Object3D | null = object;
  while (cur) {
    const id = cur.userData.part as string | undefined;
    if (id) return id;
    cur = cur.parent;
  }
  return null;
}

export interface Place {
  readonly unit: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly look: Look;
  readonly volume: THREE.ShaderMaterial | null;
  readonly warp?: THREE.ShaderMaterial | null;
  readonly depthFirst?: boolean;
  readonly parts: Parts;
  /** `staged` is the seconds of the place the camera stands at, where that is not the world's clock (a held camera, the loop); a place that stages by shot tests its shots against it. */
  /** `loop` is given by the card loop alone, never by the film: the phase of the loop, 0 to 1. What must come round with the loop is set from it and not from the seconds. */
  setTime(seconds: number, staged?: number, loop?: number): void;
  resize?(width: number, height: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface PlaceModule {
  readonly unit: string;
  readonly shots: Record<string, CameraPath>;
  /** `staged`: the seconds of the place whose staging by shot the loop keeps for its whole length. */
  readonly loop?: { path: CameraPath; timeOffset: number; staged?: number };
  heightOf?(pose: Pose): number;
  view?(pose: Pose, aspect: number): Record<string, unknown>;
  create(): Place | Promise<Place>;
}
