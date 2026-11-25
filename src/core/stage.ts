import type * as THREE from 'three';
import type { Parts } from './place';

export interface Lens {
  aperture: number;
  focus: number;
}

export interface Look {
  exposure: number;
  bloom: number;
  bloomRadius: number;
  vignette: number;
  grain: number;
  saturation: number;
  contrast: number;
  tint: [number, number, number];
  /** A knee on what is brighter than its first number, laid on every sample before it is averaged: the brightest channel b becomes knee[0] * (1 + knee[1] * ln(b / knee[0])) and the colour keeps its hue. Absent: none. */
  knee?: [number, number];
  /** The curve of what glows. A pixel whose brightest channel, after exposure, lies above the first number passes to a filmic curve laid on each channel, fully by the second number; the third is that curve's exposure against the look's. Absent: one curve for everything. */
  fire?: [number, number, number];
}

export const neutralLook = (): Look => ({
  exposure: 1,
  bloom: 0.06,
  bloomRadius: 1,
  vignette: 0.15,
  grain: 0.012,
  saturation: 1,
  contrast: 1,
  tint: [1, 1, 1],
});

export interface CameraState {
  position: [number, number, number];
  aim: [number, number, number];
  height: number;
  lens: { fovDegrees: number; aperture: number; focus: number };
}

export interface Stage {
  readonly id: string;
  readonly unit: string | null;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly lens: Lens;
  readonly look: Look;
  readonly volume: THREE.ShaderMaterial | null;
  /** A half-size pass drawn after the volume with the same uniforms. Red and green: how far the scene behind the pixel is displaced, in frame heights. */
  readonly warp?: THREE.ShaderMaterial | null;
  /** True when the engine draws the opaque shader materials depth-first, so each pixel is shaded once. */
  readonly depthFirst?: boolean;
  readonly parts?: Parts;
  resize(width: number, height: number): void;
  setTime(seconds: number, worldShift?: number): void;
  cameraAt(seconds: number): CameraState;
  beforeSample(renderer: THREE.WebGLRenderer): void;
  solo?(part: string | null): void;
}
