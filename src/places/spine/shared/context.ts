import type * as THREE from 'three';
import type { Parts } from '../../../core/place';
import type { Rng } from '../../../core/rng';
import type { Rig } from './rig';

/** A place where snow or vapour leaves a surface and streams down the wind. The air folder draws every source in its volume. */
export interface SteamSource {
  /** Where it leaves the surface, world metres. */
  at: [number, number, number];
  /** Radius of the source at the surface, metres. */
  radius: number;
  /** 0 to 1: how thick it is at the surface. */
  strength: number;
  /** How far down the wind it stays visible, metres. */
  rise: number;
  /** `steam` is pale and thin (breath, spindrift off a point), `smoke` is grey (what a strike leaves on a burned tip). */
  kind: 'steam' | 'smoke';
  /** Lean of the plume, metres sideways for each metre of its length, on x and z. Absent: straight down the wind. */
  lean?: [number, number];
}

export interface TextureOptions {
  /** `colour` pictures are decoded from sRGB. `data` pictures are read as they are. */
  kind?: 'colour' | 'data';
  /** Repeat in both directions. The default. */
  repeat?: boolean;
  anisotropy?: number;
}

export interface Context {
  readonly scene: THREE.Scene;
  readonly parts: Parts;
  readonly rig: Rig;
  /** A seeded stream. Never use Math.random. */
  rng(name: string): Rng;
  readonly assets: {
    /** A picture under `public/assets/spine/`, for example `land/rock.jpg`. The place waits for every picture before its first frame. */
    texture(file: string, options?: TextureOptions): THREE.Texture;
  };
  readonly sources: { steam: SteamSource[] };
  /** Seconds, in the time of the place, of the events the cut list marks: the six strikes, in order. */
  readonly events: { strikes: readonly number[] };
}

export interface Piece {
  setTime?(seconds: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  resize?(width: number, height: number): void;
  /** Only the air folder: the half-size volume pass of the place. */
  volume?: THREE.ShaderMaterial;
  /** `part` is the id of an effect drawn alone (`spine/air`), or null. */
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface Folder {
  /** The names of the parts this folder draws. A name listed here gets no stand-in. */
  readonly PARTS: readonly string[];
  create(ctx: Context): Piece;
}
