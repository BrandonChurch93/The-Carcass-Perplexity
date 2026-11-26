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
  /** Builds what the span shows, one place after another, then plays. `onStep` is told how many places are built. */
  start(onEnd: () => void, onStep?: (done: number, total: number) => void): void;
}

/** Lets the browser draw once before the next piece of work blocks it. */
const breathe = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

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
    start(onEnd, onStep) {
      engine ??= new Engine(canvas, format);
      const e = engine;
      let origin = -1;
      let heard = false;
      const offset = range.first / FPS;
      // Every place the span shows is built and drawn once before the first frame plays, so that no cut
      // of the film waits for a place: a cut that lands late is off its accent in the music.
      const prepare = async (): Promise<void> => {
        if (range.loop) {
          await film.readyLoop();
          return;
        }
        const firsts = info.places.filter((p) => p.last >= range.first && p.first <= range.last).map((p) => Math.max(p.first, range.first));
        for (let i = 0; i < firsts.length; i += 1) {
          onStep?.(i, firsts.length);
          await breathe();
          const frame = firsts[i] as number;
          await film.ready(frame);
          e.render(film.stageAt(frame), frame, frame, 'draft');
        }
        onStep?.(firsts.length, firsts.length);
        await breathe();
      };
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
        if (range.loop) e.render(film.loopStage(), frame, frame, 'draft', film.loopEarlier(frame));
        else e.render(film.stageAt(frame), frame, frame, 'draft');
        requestAnimationFrame(tick);
      };
      void prepare().then(() => requestAnimationFrame(tick));
    },
  };
}
