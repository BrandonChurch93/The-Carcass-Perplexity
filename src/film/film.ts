import { config, FPS } from '../config';
import type { CameraState, Stage } from '../core/stage';
import { createSpike } from '../spike/stage';

export interface Shot {
  id: string;
  unit: string | null;
  first: number;
  last: number;
  key: string | null;
}

export interface FilmInfo {
  fps: number;
  frameCount: number;
  shots: Shot[];
  keyFrames: Record<string, number>;
  events: { id: string; frame: number }[];
  titanFrame: number | null;
  loop: { frameCount: number; unit: string };
}

export interface FilmState {
  frame: number;
  shot: string;
  unit: string | null;
  camera: CameraState;
}

export interface Film {
  info(): FilmInfo;
  shotAt(frame: number): Shot;
  stageAt(frame: number): Stage;
  loopStage(): Stage;
  state(frame: number): FilmState;
}

const SPIKE_SECONDS = 10;

export function createFilm(): Film {
  const spike = createSpike();
  const shots: Shot[] = [{ id: 'spike', unit: null, first: 0, last: SPIKE_SECONDS * FPS - 1, key: null }];
  const frameCount = SPIKE_SECONDS * FPS;
  const loop = { frameCount: config.deliver.cardLoop.seconds * FPS, unit: config.deliver.cardLoop.unit };

  const shotAt = (frame: number): Shot => {
    if (!Number.isInteger(frame) || frame < 0 || frame >= frameCount) throw new Error(`No such film frame: ${frame}`);
    return shots.find((s) => frame >= s.first && frame <= s.last) as Shot;
  };

  return {
    info: () => ({ fps: FPS, frameCount, shots, keyFrames: {}, events: [], titanFrame: null, loop }),
    shotAt,
    stageAt: (frame) => {
      shotAt(frame);
      return spike;
    },
    loopStage: () => spike,
    state: (frame) => {
      const shot = shotAt(frame);
      return { frame, shot: shot.id, unit: shot.unit, camera: spike.cameraAt(frame / FPS) };
    },
  };
}
