import type * as THREE from 'three';
import type { Parts } from '../../../core/place';
import type { Rng } from '../../../core/rng';
import type { Rig } from './rig';

/** A place where vapour hangs or leaves the ground. The air folder draws every source in its volume. */
export interface SteamSource {
  /** Where it leaves the ground, world metres. */
  at: [number, number, number];
  /** Radius of the source at the ground, metres. */
  radius: number;
  /** 0 to 1: how thick it is at the ground. */
  strength: number;
  /** How high it stays visible, metres. */
  rise: number;
  kind: 'steam' | 'smoke' | 'fume';
  lean?: [number, number];
}

export interface HeatSource {
  at: [number, number, number];
  radius: number;
  height: number;
  strength: number;
}

export interface TextureOptions {
  /** `colour` pictures are decoded from sRGB. `data` pictures are read as they are. */
  kind?: 'colour' | 'data';
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
    /** A picture under `public/assets/eye/`. The place waits for every picture before its first frame. */
    texture(file: string, options?: TextureOptions): THREE.Texture;
  };
  readonly sources: { steam: SteamSource[]; heat: HeatSource[] };
  /** Seconds, in the time of the place: `rise` is the crest of the dome at the centre (key eye-4), `end` the first frame of the rise to orbit. */
  readonly events: { rise: number; end: number };
}

export interface Piece {
  setTime?(seconds: number): void;
  beforeSample?(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  resize?(width: number, height: number): void;
  /** Only the air folder: the half-size volume pass of the place. */
  volume?: THREE.ShaderMaterial;
  /** `part` is the id of an effect drawn alone (`eye/air`), or null. */
  solo?(part: string | null): void;
  dispose?(): void;
}

export interface Folder {
  /** The names of the parts this folder draws. A name listed here gets no stand-in. */
  readonly PARTS: readonly string[];
  create(ctx: Context): Piece;
}
