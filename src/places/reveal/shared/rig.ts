// The light rig of the rise: the uniforms every surface shares. One sun, the blue of the air, the edge of the planet, and the beat of the Heart.
import * as THREE from 'three';
import { BEAT, DUSK_FROM, KM, LIMB, SUN, X, Z, halfHeightAt, handoff } from './anchors';
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

/** The round body the terminator is drawn on: its middle (the middle of the land) and its radius, km. */
const TERM = { x: 300, z: -100, radius: 5200 };
/** The moon the film never shows stands low in the lower right, across the body from where the sun went. Toward the moon. */
const MOON: [number, number, number] = [0.62, 0.52, 0.59];
const MOON_COLOUR: [number, number, number] = [0.06, 0.088, 0.135];

const ease = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Dusk {
  /** 0 by day, exactly; then the share of the night that has come, to 1. */
  dusk: number;
  /** Toward the sun. Below the horizon once it has set. */
  sun: [number, number, number];
  round: number;
  moon: number;
  gain: number;
  strikes: number;
  glintSlide: number;
  glint: number;
  working: number;
  ember: number;
}

/** The end of the day at a second of the place: a pure function of the time, and the day itself (dusk 0) up to DUSK_FROM. */
export function dusk(seconds: number): Dusk {
  const u = seconds - DUSK_FROM;
  if (!(u > 0)) return { dusk: 0, sun: [...SUN], round: 0, moon: 0, gain: 1, strikes: 1, glintSlide: 0, glint: 1, working: 1, ember: 0 };
  const length = Math.hypot(...SUN);
  const height0 = Math.asin(SUN[1] / length);
  const turn0 = Math.atan2(SUN[0], -SUN[2]);
  // The sun's height: it starts from rest, falls fastest as it sets (about 4.2 s in) and comes to rest well under the horizon.
  const fallen = 1 - Math.exp(-((u / SET_TAU) * (u / SET_TAU)));
  const height = height0 - SET_DROP * fallen;
  // And it sets to the left of where it stood: the planet turns under it.
  const turn = turn0 - SET_SWING * fallen;
  const flat = Math.cos(height);
  const sun: [number, number, number] = [Math.sin(turn) * flat, Math.sin(height), -Math.cos(turn) * flat];
  const degrees = (height * 180) / Math.PI;
  // The night: come when the sun stands 15 degrees under the horizon of the middle of the body.
  const night = ease(6, -20, degrees);
  const since = BEAT === null ? -10 : seconds - BEAT;
  // After the beat the night thins: the camera's eye closes a little, and the fire sinks back.
  const thin = ease(1.2, 6.8, since);
  return {
    dusk: Math.max(1e-4, ease(0, 7, u)),
    sun,
    round: ease(0, 1.6, u),
    moon: ease(0.5, 3.0, u) * (1 - 0.25 * thin),
    // (The exposure opens by stops, and begins before the sun is down: the eye follows the body, not the bright edge of the planet.)
    gain: Math.pow(NIGHT_GAIN, ease(23, -11, degrees)) * (1 - 0.18 * thin),
    strikes: 1 - ease(1.5, 5.2, u),
    glintSlide: 1900 * ease(0.3, 5.2, u),
    glint: 1 - ease(2.6, 4.9, u),
    working: 1 - 0.85 * ease(2, 6.5, u),
    ember: night * (1 - 0.3 * thin),
  };
}
const SET_TAU = 5.5;
const SET_DROP = (72 * Math.PI) / 180;
const SET_SWING = (30 * Math.PI) / 180;
const NIGHT_GAIN = 9;

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
    uCover: { value: null },
    uMatPopcorn: { value: null },
    uMatStreaks: { value: null },
    uMatSpecks: { value: null },
    uCoverRect: { value: new THREE.Vector4(...COVER_RECT) },
    // The end of the day (see dusk() below). Every one of these is at its day value, and uDusk exactly 0, up to DUSK_FROM:
    // every shader branches on uDusk > 0.0 and leaves the arithmetic of the day untouched.
    uDusk: { value: 0 },
    // x, z: the middle of the round body the terminator is drawn on. z: one over its radius. w: how far the round planet has taken over from the flat day.
    uTerm: { value: new THREE.Vector4(TERM.x, TERM.z, 1 / TERM.radius, 0) },
    uMoonDir: { value: new THREE.Vector3(...MOON).normalize() },
    uMoonColour: { value: new THREE.Color(0, 0, 0) },
    // The camera's exposure, as a gain on every radiance: it opens as the light goes.
    uGain: { value: 1 },
    // x: the lightning of the storm (1 by day, 0 by night). y: how far the sun's image has slid off the sea, km. z: how much of it is left. w: the working of the lava (1 by day, less by night).
    uCalm: { value: new THREE.Vector4(1, 0, 1, 1) },
    // x: the fire of the Heart as the night sees it (0 by day, 1 at night, less as the film ends). y: seconds since the beat (negative before it).
    uEmber: { value: new THREE.Vector2(0, -1) },
  };
  const sunDay = new THREE.Vector3(...SUN).normalize();
  let landHeight: Height = () => 0;
  const disc = new THREE.CircleGeometry(1, 8);
  const none = new THREE.MeshBasicMaterial({ visible: false });
  const beat = (seconds: number): number => {
    // (The glow is never still and never a loop: two slow swells that do not keep step.)
    const breath = 0.5 + 0.3 * Math.sin((2 * Math.PI * seconds) / 3.7) + 0.2 * Math.sin((2 * Math.PI * seconds) / 5.9 + 1.3);
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
      const d = dusk(seconds);
      (uniforms.uDusk as THREE.IUniform<number>).value = d.dusk;
      if (d.dusk > 0) (uniforms.uSunDir as THREE.IUniform<THREE.Vector3>).value.set(...d.sun);
      else (uniforms.uSunDir as THREE.IUniform<THREE.Vector3>).value.copy(sunDay);
      (uniforms.uTerm as THREE.IUniform<THREE.Vector4>).value.w = d.round;
      (uniforms.uMoonColour as THREE.IUniform<THREE.Color>).value.setRGB(MOON_COLOUR[0] * d.moon, MOON_COLOUR[1] * d.moon, MOON_COLOUR[2] * d.moon);
      (uniforms.uGain as THREE.IUniform<number>).value = d.gain;
      (uniforms.uCalm as THREE.IUniform<THREE.Vector4>).value.set(d.strikes, d.glintSlide, d.glint, d.working);
      (uniforms.uEmber as THREE.IUniform<THREE.Vector2>).value.set(d.ember, BEAT === null ? -1 : seconds - BEAT);
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
