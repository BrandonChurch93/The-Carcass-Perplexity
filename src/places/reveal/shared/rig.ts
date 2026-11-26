// The light rig of the rise: the uniforms every surface shares. One sun, the blue of the air, the edge of the planet, and the beat of the Heart.
import * as THREE from 'three';
import { BEAT, KM, LIMB, SUN, X, Z, halfHeightAt, handoff } from './anchors';
import { COVER_RECT } from './weather';

export interface Emitter {
  position: THREE.Vector3;
  radius: number;
  radiance: THREE.Color;
}

export type Height = (x: number, z: number) => number;

export interface Rig {
  readonly uniforms: Record<string, THREE.IUniform>;
  readonly emitters: Emitter[];
  readonly land: { height: Height };
  setLand(height: Height): void;
  /** Kept for the shape of the contract: from orbit nothing stands on the ground, so the discs are never drawn. */
  contactDiscs(count: number): THREE.InstancedMesh;
  setDisc(mesh: THREE.InstancedMesh, index: number, x: number, z: number, radius: number, strength: number): void;
  /** 0 to 1: the swell of the Heart's glow at a second of the place. A slow breath, and one beat at the event. */
  beat(seconds: number): number;
  setTime(seconds: number): void;
  beforeSample(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void;
  dispose(): void;
}

export function createRig(): Rig {
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uSolo: { value: 0 },
    uBeat: { value: 0 },
    uSunDir: { value: new THREE.Vector3(...SUN).normalize() },
    uSunColour: { value: new THREE.Color(3.2, 3.0, 2.75) },
    uSkyColour: { value: new THREE.Color(0.27, 0.41, 0.7) },
    uAirColour: { value: new THREE.Color(0.1, 0.2, 0.42) },
    uLimb: { value: new THREE.Vector4(X(LIMB.cx), Z(LIMB.cy), LIMB.r * KM, 1 / (LIMB.r * KM)) },
    uViewKm: { value: 20 },
    // 0 on the frame of the handoff, where only water and rings are drawn; 1 once the view is 1.7 times as wide.
    uArrive: { value: 0 },
    // The cloud of the world (shared/weather.ts): the sky folder gives the pictures.
    uCloudTile: { value: null },
    uCloudCover: { value: null },
    uMatCells: { value: null },
    uMatStreets: { value: null },
    uMatVeil: { value: null },
    uCoverRect: { value: new THREE.Vector4(...COVER_RECT) },
  };
  let landHeight: Height = () => 0;
  const disc = new THREE.CircleGeometry(1, 8);
  const none = new THREE.MeshBasicMaterial({ visible: false });
  const beat = (seconds: number): number => {
    const breath = 0.5 + 0.5 * Math.sin((2 * Math.PI * seconds) / 2.6);
    const since = BEAT === null ? -1 : seconds - BEAT;
    // The beat: up in a tenth of a second, down over a second and a half, with a second, smaller throb after it as a heart has.
    const hit = since < 0 ? 0 : (1 - Math.exp(-since / 0.04)) * Math.exp(-since / 0.55) + 0.45 * Math.exp(-((since - 0.42) * (since - 0.42)) / 0.012);
    return Math.min(1.6, 0.12 * breath + hit);
  };
  return {
    uniforms,
    emitters: [],
    land: { height: (x, z) => landHeight(x, z) },
    setLand: (height) => {
      landHeight = height;
    },
    contactDiscs: (count) => new THREE.InstancedMesh(disc, none, count),
    setDisc: () => undefined,
    beat,
    setTime: (seconds) => {
      (uniforms.uTime as THREE.IUniform<number>).value = seconds;
      (uniforms.uBeat as THREE.IUniform<number>).value = beat(seconds);
      (uniforms.uViewKm as THREE.IUniform<number>).value = halfHeightAt(Math.max(0, seconds));
      const wide = Math.min(1, Math.max(0, (halfHeightAt(Math.max(0, seconds)) / handoff.revealHalfHeightKm - 1) / 0.7));
      (uniforms.uArrive as THREE.IUniform<number>).value = wide * wide * (3 - 2 * wide);
    },
    beforeSample: () => undefined,
    dispose: () => {
      disc.dispose();
      none.dispose();
    },
  };
}
