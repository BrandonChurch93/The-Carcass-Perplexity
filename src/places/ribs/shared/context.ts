import type * as THREE from 'three';
import type { Parts } from '../../../core/place';
import type { Rng } from '../../../core/rng';
import type { Rig } from './rig';

/** A place where spray or mist leaves a surface. The air folder draws every source in its volume, lit by the sun and the sky. */
export interface SteamSource {
  /** Where it leaves the surface, world metres. */
  at: [number, number, number];
  /** Radius of the source at its foot, metres. */
  radius: number;
  /** 0 to 1: how thick it is at its foot. */
  strength: number;
  /** How high it stays visible, metres. */
  rise: number;
  /** `spray` is white water thrown up (surf, the bore's front), `mist` is thin and hangs low. */
  kind: 'spray' | 'mist';
  /** Lean of the column, metres sideways for each metre of rise, on x and z. */
  lean?: [number, number];
  /** Metres a second the source travels along z (the bore's front). Its place at `seconds` is at + speed * (seconds - since). */
  speed?: number;
  since?: number;
}

/** Kept from the Heart's contract. The Ribs have no hot air: nothing reads this list. */
export interface HeatSource {
  at: [number, number, number];
  radius: number;
  height: number;
  strength: number;
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
    /** A picture under `public/assets/ribs/`, for example `land/sand.jpg`. The place waits for every picture before its first frame. */
    texture(file: string, options?: TextureOptions): THREE.Texture;
  };
  readonly sources: { steam: SteamSource[]; heat: HeatSource[] };
  /** Seconds, in the time of the place, of the events the cut list marks. */
  readonly events: { bore: number };
}

export interface Piece {
  setTime?(seconds: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  resize?(width: number, height: number): void;
  /** Only the air folder: the half-size volume pass of the place. */
  volume?: THREE.ShaderMaterial;
  /** `part` is the id of an effect drawn alone (`ribs/air`), or null. */
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface Folder {
  /** The names of the parts this folder draws. A name listed here gets no stand-in. */
  readonly PARTS: readonly string[];
  create(ctx: Context): Piece;
}
