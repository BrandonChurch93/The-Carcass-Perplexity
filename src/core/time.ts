import { config, FPS } from '../config';

export const SHUTTER = config.film.shutterDegrees / 360;

export function frameTime(frame: number): number {
  return frame / FPS;
}

export function sampleTime(frame: number, shutter: number): number {
  return (frame + shutter * SHUTTER) / FPS;
}
