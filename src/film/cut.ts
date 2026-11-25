import raw from '../../cut/CUTLIST.json';
import { FPS } from '../config';

export interface CutShot {
  id: string;
  unit: string;
  first: number;
  last: number;
  key: string | null;
  picture: string;
  move: string;
  label: string;
}

export interface CutPlace {
  unit: string;
  first: number;
  last: number;
}

export interface CutEvent {
  id: string;
  unit: string;
  frame: number;
  what: string;
}

export interface CutList {
  fps: number;
  frameCount: number;
  places: CutPlace[];
  shots: CutShot[];
  keyFrames: Record<string, number>;
  events: CutEvent[];
  titanFrame: number;
}

export const cut = raw as unknown as CutList;

if (cut.fps !== FPS) throw new Error(`cut/CUTLIST.json runs at ${cut.fps} frames a second and film.fps is ${FPS}`);

export function placeOf(unit: string): CutPlace {
  const place = cut.places.find((p) => p.unit === unit);
  if (!place) throw new Error(`The cut list has no place named ${unit}`);
  return place;
}

export const shotsOf = (unit: string): CutShot[] => cut.shots.filter((s) => s.unit === unit);

export function shotById(id: string): CutShot {
  const shot = cut.shots.find((s) => s.id === id);
  if (!shot) throw new Error(`The cut list has no shot named ${id}`);
  return shot;
}

export const shotLength = (shot: CutShot): number => shot.last + 1 - shot.first;

export function partOfFrame(shot: CutShot, frame: number): number {
  return (frame - shot.first) / shotLength(shot);
}

export function keyPart(shot: CutShot): number {
  const frame = shot.key === null ? undefined : cut.keyFrames[shot.key];
  return frame === undefined ? 0.5 : partOfFrame(shot, frame);
}

export function secondsInPlace(unit: string, frame: number): number {
  return (frame - placeOf(unit).first) / FPS;
}

export function eventSeconds(unit: string, id: string): number | null {
  const event = cut.events.find((e) => e.unit === unit && e.id === id);
  return event ? secondsInPlace(unit, event.frame) : null;
}

export function eventsOf(unit: string): { id: string; seconds: number }[] {
  return cut.events.filter((e) => e.unit === unit).map((e) => ({ id: e.id, seconds: secondsInPlace(unit, e.frame) }));
}
