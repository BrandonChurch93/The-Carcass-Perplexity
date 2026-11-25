import type * as THREE from 'three';
import type { Parts } from '../../../core/place';
import type { Rng } from '../../../core/rng';
import type { Rig } from './rig';

/** A place where vapour leaves the ground or hangs over it. The air folder draws every source in its one volume pass, lit by the rig's sun. */
export interface SteamSource {
  /** Where it leaves the ground, world metres. */
  at: [number, number, number];
  /** Radius of the source at the ground, metres. */
  radius: number;
  /** 0 to 1: how thick it is at the ground. */
  strength: number;
  /** How high it stays visible, metres. */
  rise: number;
  /** `steam` is a thin rising wisp, `heavy` lies low and slides downwind over the ground. */
  kind: 'steam' | 'heavy';
  /** Lean of the column, metres sideways for each metre of rise, on x and z. */
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
    /** A picture under `public/assets/breath/`, for example `land/rock.jpg`. The place waits for every picture before its first frame. */
    texture(file: string, options?: TextureOptions): THREE.Texture;
  };
  /** At most 8 sources are drawn. Push at creation. */
  readonly sources: { steam: SteamSource[] };
  /** Seconds, in the time of the place, of the events the cut list marks. */
  readonly events: { exhale: number };
}

export interface Piece {
  setTime?(seconds: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  resize?(width: number, height: number): void;
  /** Only the air folder: the half-size volume pass of the place. */
  volume?: THREE.ShaderMaterial;
  /** `part` is the id of an effect drawn alone (`breath/vapour`), or null. */
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface Folder {
  /** The names of the parts this folder draws. A name listed here gets no stand-in. */
  readonly PARTS: readonly string[];
  create(ctx: Context): Piece;
}
