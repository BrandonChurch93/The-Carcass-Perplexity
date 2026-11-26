// The light rig of the rise: the uniforms every surface shares. One sun, the blue of the air, the edge of the planet, and the beat of the Heart.
import * as THREE from 'three';
import { BEAT, DUSK_FROM, KM, LIMB, LIMB_FOLLOW, LIVE_FROM, RISE_FIRST, SUN, X, Z, driftAt, halfHeightAt, handoff, liveAt } from './anchors';
import { FPS } from '../../../config';
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
const MOON: [number, number, number] = [0.66, 0.38, 0.62];
const MOON_COLOUR: [number, number, number] = [0.092, 0.116, 0.158];

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
  /** How much more the night side is exposed than the frame is, while the day still stands in it (1 once it is night). */
  lift: number;
  /** How much of the fire is kept over the last dark (1 until the picture begins to go). */
  keep: number;
}

/** The end of the day at a second of the place: a pure function of the time, and the day itself (dusk 0) up to DUSK_FROM. */
export function dusk(seconds: number): Dusk {
  const aged = seconds - LIVE_FROM;
  if (!(aged > 0)) return { dusk: 0, sun: [...SUN], round: 0, moon: 0, gain: 1, strikes: 1, glintSlide: 0, glint: 1, working: 1, ember: 0, lift: 1, keep: 1 };
  const length = Math.hypot(...SUN);
  const height0 = Math.asin(SUN[1] / length);
  const turn0 = Math.atan2(SUN[0], -SUN[2]);
  // The sun's height: it starts from rest, falls fastest as it sets (about 5.4 s in) and comes to rest well under the horizon.
  const u = Math.max(0, (seconds - DUSK_FROM) / SET_SLOW);
  const fallen = 1 - Math.exp(-((u / SET_TAU) * (u / SET_TAU)));
  // (And through the hold before it the day already ages: the sun comes down a few degrees from rest, so the dusk is no switch.)
  const older = 1 - Math.exp(-((aged / AGE_TAU) * (aged / AGE_TAU)));
  const height = height0 - AGE_DROP * older - SET_DROP * fallen;
  // And it sets to the left of where it stood: the planet turns under it.
  const turn = turn0 - AGE_SWING * older - SET_SWING * fallen;
  const flat = Math.cos(height);
  const sun: [number, number, number] = [Math.sin(turn) * flat, Math.sin(height), -Math.cos(turn) * flat];
  const degrees = (height * 180) / Math.PI;
  // The night: come when the sun stands 15 degrees under the horizon of the middle of the body.
  const night = ease(6, -13, degrees);
  const since = BEAT === null ? -10 : seconds - BEAT;
  // After the beat the night thins: the camera's eye closes a little, and the fire sinks back.
  const thin = ease(1.2, 6.8, since);
  // And over the last seconds the dark comes over the whole picture, the ember the last thing to go.
  const last = ease(4.4, 6.82, since);
  const dark = 1 - 0.31 * last;
  const gain = Math.pow(NIGHT_GAIN, ease(23, -11, degrees)) * (1 - 0.05 * thin) * dark;
  return {
    dusk: Math.max(1e-4, ease(0, 7, u)),
    sun,
    round: ease(0, 1.6, u),
    moon: ease(0.5, 3.0, u) * (1 - 0.25 * thin),
    // (The exposure opens by stops, and begins before the sun is down: the eye follows the body, not the bright edge of the planet.)
    gain,
    strikes: 1 - ease(1.5, 5.2, u),
    glintSlide: 1900 * ease(0.3, 5.2, u),
    glint: 1 - ease(2.6, 4.9, u),
    working: 1 - 0.85 * ease(2, 6.5, u),
    ember: night * (1 - 0.42 * thin),
    lift: (NIGHT_GAIN * (1 - 0.05 * thin) * dark) / gain,
    keep: (1 - 0.31 * last) / dark,
  };
}
const SET_TAU = 5.5;
/** The whole of the dusk is this much slower than it was first timed: the night is come at about film frame 11300. */
const SET_SLOW = 1.3;
const SET_DROP = (68 * Math.PI) / 180;
const SET_SWING = (24 * Math.PI) / 180;
const AGE_TAU = 11;
const AGE_DROP = (8 * Math.PI) / 180;
const AGE_SWING = (6 * Math.PI) / 180;
const NIGHT_GAIN = 12;

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
    // The seconds the planet has lived while the frame is held: exactly 0 up to LIVE_FROM (film frame 10027).
    uLive: { value: 0 },
    // x: the fire of the Heart as the night sees it (0 by day, 1 at night, less as the film ends). y: seconds since the beat (negative before it).
    uEmber: { value: new THREE.Vector4(0, -1, 1, 1) },
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
      if (d.dusk > 0) {
        // (The edge of the planet goes most of the way with the drifting camera.)
        const [driftX, driftZ] = driftAt(RISE_FIRST + seconds * FPS);
        const limb = (uniforms.uLimb as THREE.IUniform<THREE.Vector4>).value;
        limb.x = X(LIMB.cx) + LIMB_FOLLOW * driftX;
        limb.y = Z(LIMB.cy) + LIMB_FOLLOW * driftZ;
      } else {
        const limb = (uniforms.uLimb as THREE.IUniform<THREE.Vector4>).value;
        limb.x = X(LIMB.cx);
        limb.y = Z(LIMB.cy);
      }
      if (d.dusk > 0) (uniforms.uSunDir as THREE.IUniform<THREE.Vector3>).value.set(...d.sun);
      else (uniforms.uSunDir as THREE.IUniform<THREE.Vector3>).value.copy(sunDay);
      (uniforms.uTerm as THREE.IUniform<THREE.Vector4>).value.w = d.round;
      (uniforms.uMoonColour as THREE.IUniform<THREE.Color>).value.setRGB(MOON_COLOUR[0] * d.moon, MOON_COLOUR[1] * d.moon, MOON_COLOUR[2] * d.moon);
      (uniforms.uGain as THREE.IUniform<number>).value = d.gain;
      (uniforms.uCalm as THREE.IUniform<THREE.Vector4>).value.set(d.strikes, d.glintSlide, d.glint, d.working);
      (uniforms.uEmber as THREE.IUniform<THREE.Vector4>).value.set(d.ember, BEAT === null ? -1 : seconds - BEAT, d.lift, d.keep);
      (uniforms.uTime as THREE.IUniform<number>).value = seconds;
      (uniforms.uLive as THREE.IUniform<number>).value = liveAt(seconds);
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
