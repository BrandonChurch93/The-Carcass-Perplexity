import * as THREE from 'three';
import register from '../../parts/PARTS.json';
import { FPS } from '../config';
import { Engine } from '../core/engine';
import type { Stage } from '../core/stage';
import { createFilm, type FilmInfo, type FilmState, type PartInfo } from '../film/film';

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
  setDiagnostic(view: string | null, part?: string | null): void;
  setLens(aperture: number | null, focus: number | null): void;
  film(): FilmInfo;
  filmState(frame: number): FilmState;
  partsOf(unit: string): Promise<PartInfo[]>;
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
  const live = new Map<string, { part: string; unit: string }>();
  const note = (stage: Stage): void => {
    for (const p of stage.parts?.all() ?? []) if (p.state === 'stand-in') live.set(p.id, { part: p.id, unit: p.unit });
  };
  const standIns = (): { part: string; unit: string }[] => {
    const all = new Map(live);
    for (const p of parts) if (p.state === 'stand-in' && !all.has(p.id)) all.set(p.id, { part: p.id, unit: p.unit });
    return [...all.values()].sort((a, b) => (a.part < b.part ? -1 : a.part > b.part ? 1 : 0));
  };

  const api: Carcass = {
    ready: Promise.resolve(),
    info: () => ({
      fps: FPS,
      format: engine.format.id,
      tier,
      engine: __ENGINE_HASH__,
      units: __UNIT_HASHES__,
      versions: { three: THREE.REVISION, browser: navigator.userAgent },
      standIns: standIns(),
      gl: {
        renderer: engine.gl.getParameter(engine.gl.RENDERER) as string,
        vendor: engine.gl.getParameter(engine.gl.VENDOR) as string,
        extensions: [...engine.extensions].sort(),
      },
    }),
    setFormat: (id) => {
      if (id !== engine.format.id) engine.setFormat(id);
    },
    setDiagnostic: (view, part = null) => engine.setDiagnostic(view, part),
    setLens: (aperture, focus) => engine.setLens(aperture, focus),
    film: () => film.info(),
    filmState: (frame) => film.state(frame),
    partsOf: (unit) => film.partsOf(unit),
    renderFilmFrame: async (frame, t) => {
      tier = t;
      await film.ready(frame);
      const stage = film.stageAt(frame);
      note(stage);
      engine.render(stage, frame, frame, t);
    },
    loop: () => film.info().loop,
    renderLoopFrame: async (frame, t) => {
      const count = film.info().loop.frameCount;
      if (!Number.isInteger(frame) || frame < 0 || frame > count) throw new Error(`No such loop frame: ${frame}`);
      tier = t;
      await film.readyLoop();
      const stage = film.loopStage();
      note(stage);
      engine.render(stage, frame, frame % count, t);
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
