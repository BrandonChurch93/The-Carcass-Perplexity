import { FPS } from '../config';
import { Engine } from '../core/engine';
import { createFilm } from '../film/film';

export interface Span {
  first: number;
  last: number;
  repeat: boolean;
  loop: boolean;
}

export interface Player {
  canvas: HTMLCanvasElement;
  start(onEnd: () => void): void;
}

export function createPlayer(span: (frameCount: number, loopCount: number, shots: { unit: string | null; first: number; last: number }[]) => Span): Player {
  const canvas = document.createElement('canvas');
  const format = Math.max(window.innerWidth, window.innerHeight) * window.devicePixelRatio > 1400 ? 'hd' : 'preview';
  let engine: Engine | null = null;
  const film = createFilm();
  const info = film.info();
  const range = span(info.frameCount, info.loop.frameCount, info.shots);
  const length = range.last - range.first + 1;

  return {
    canvas,
    start(onEnd) {
      engine ??= new Engine(canvas, format);
      const e = engine;
      let origin = -1;
      const prepared = range.loop ? film.readyLoop() : film.readyAll();
      const tick = (ms: number): void => {
        if (origin < 0) origin = ms;
        let step = Math.floor(((ms - origin) / 1000) * FPS);
        if (step >= length) {
          if (!range.repeat) {
            onEnd();
            return;
          }
          step %= length;
        }
        const frame = range.first + step;
        if (range.loop) e.render(film.loopStage(), frame, frame, 'draft');
        else e.render(film.stageAt(frame), frame, frame, 'draft');
        requestAnimationFrame(tick);
      };
      void prepared.then(() => requestAnimationFrame(tick));
    },
  };
}
