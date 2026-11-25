import type * as THREE from 'three';
import type { Parts } from '../../../core/place';
import type { Rng } from '../../../core/rng';
import type { Rig } from './rig';

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
    /** A picture under `public/assets/reveal/`. The place waits for every picture before its first frame. */
    texture(file: string, options?: TextureOptions): THREE.Texture;
  };
  /** Seconds, in the time of the place, of the events the cut list marks. */
  readonly events: { heartbeat: number | null };
}

export interface Piece {
  setTime?(seconds: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  resize?(width: number, height: number): void;
  volume?: THREE.ShaderMaterial;
  /** `part` is the id of an effect drawn alone (`reveal/cloud`), or null. */
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface Folder {
  /** The names of the parts this folder draws. A name listed here gets no stand-in. */
  readonly PARTS: readonly string[];
  create(ctx: Context): Piece;
}
