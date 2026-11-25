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

const DRIFT_SECONDS = 0.05;

export function createPlayer(span: (frameCount: number, loopCount: number, shots: { unit: string | null; first: number; last: number }[]) => Span, sound: string | null = null): Player {
  const canvas = document.createElement('canvas');
  const audio = sound ? new Audio(sound) : null;
  if (audio) audio.preload = 'auto';
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
      let heard = false;
      const offset = range.first / FPS;
      const prepared = range.loop ? film.readyLoop() : film.readyAll();
      const tick = (ms: number): void => {
        if (origin < 0) {
          origin = ms;
          if (audio) {
            audio.currentTime = offset;
            audio.play().then(
              () => {
                heard = true;
              },
              () => {
                heard = false;
              },
            );
          }
        }
        let seconds = (ms - origin) / 1000;
        if (heard && audio && !audio.paused && !audio.ended) {
          const at = audio.currentTime - offset;
          if (Math.abs(at - seconds) > DRIFT_SECONDS) {
            origin = ms - at * 1000;
            seconds = at;
          }
        }
        let step = Math.floor(seconds * FPS);
        if (step >= length) {
          if (!range.repeat) {
            audio?.pause();
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
