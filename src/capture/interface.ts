import * as THREE from 'three';
import register from '../../parts/PARTS.json';
import { FPS } from '../config';
import { Engine } from '../core/engine';
import { createFilm, type FilmInfo, type FilmState } from '../film/film';

declare const __ENGINE_HASH__: string;
declare const __UNIT_HASHES__: Record<string, string>;

interface Part {
  id: string;
  unit: string;
  state: 'stand-in' | 'built' | 'fallback';
}

export interface Carcass {
  ready: Promise<void>;
  info(): Record<string, unknown>;
  setFormat(id: string): void;
  setDiagnostic(view: string | null): void;
  film(): FilmInfo;
  filmState(frame: number): FilmState;
  renderFilmFrame(frame: number, tier: string): Promise<void>;
  loop(): FilmInfo['loop'];
  renderLoopFrame(frame: number, tier: string): Promise<void>;
  grab(url: string): Promise<{ width: number; height: number }>;
}

declare global {
  interface Window {
    __carcass: Carcass;
  }
}

export function install(canvas: HTMLCanvasElement, formatId = 'hd'): { engine: Engine; api: Carcass } {
  const engine = new Engine(canvas, formatId);
  const film = createFilm();
  let tier = 'review';
  const parts = (register as { parts: Part[] }).parts;

  const api: Carcass = {
    ready: Promise.resolve(),
    info: () => ({
      fps: FPS,
      format: engine.format.id,
      tier,
      engine: __ENGINE_HASH__,
      units: __UNIT_HASHES__,
      versions: { three: THREE.REVISION, browser: navigator.userAgent },
      standIns: parts.filter((p) => p.state === 'stand-in').map((p) => ({ part: p.id, unit: p.unit })),
      gl: {
        renderer: engine.gl.getParameter(engine.gl.RENDERER) as string,
        vendor: engine.gl.getParameter(engine.gl.VENDOR) as string,
        extensions: [...engine.extensions].sort(),
      },
    }),
    setFormat: (id) => {
      if (id !== engine.format.id) engine.setFormat(id);
    },
    setDiagnostic: (view) => engine.setDiagnostic(view),
    film: () => film.info(),
    filmState: (frame) => film.state(frame),
    renderFilmFrame: async (frame, t) => {
      tier = t;
      engine.render(film.stageAt(frame), frame, frame, t);
    },
    loop: () => film.info().loop,
    renderLoopFrame: async (frame, t) => {
      const count = film.info().loop.frameCount;
      if (!Number.isInteger(frame) || frame < 0 || frame > count) throw new Error(`No such loop frame: ${frame}`);
      tier = t;
      engine.render(film.loopStage(), frame, frame % count, t);
    },
    grab: async (url) => {
      const { width, height } = engine.format;
      const body = engine.pixels();
      const res = await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/octet-stream' } });
      if (!res.ok) throw new Error(`The harness refused the frame: ${res.status}`);
      return { width, height };
    },
  };
  window.__carcass = api;
  return { engine, api };
}
