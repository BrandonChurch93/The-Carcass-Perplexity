import * as THREE from 'three';
import { createBlockout, herd, setFigure, terrain } from '../core/blockout';
import { through, type CameraPath, type Pose } from '../core/cameras';
import { Parts, type Place, type PlaceModule } from '../core/place';
import { neutralLook } from '../core/stage';
import { keyPart, shotsOf } from '../film/cut';

export interface DefaultColours {
  land: number;
  band: number;
  fluid: number;
  fluidDark: number;
  skyTop: number;
  skyHorizon: number;
  air: number;
  figure: number;
}

const SIZE = 6000;
const FIGURES = 28;

const ground = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  const basin = Math.min(1, Math.max(0, (r - 380) / 900));
  return -8 + 260 * basin * basin + 34 * Math.sin(x * 0.004 + 1.3) * Math.cos(z * 0.0035) * basin;
};

function cameras(unit: string): Record<string, CameraPath> {
  const out: Record<string, CameraPath> = {};
  shotsOf(unit).forEach((shot, i) => {
    const angle = 0.6 + i * 1.3;
    const radius = i === 0 ? 900 : 420 - (i % 3) * 90;
    const height = i === 0 ? 150 : 40 + (i % 2) * 30;
    const key: Pose = { position: [Math.sin(angle) * radius, height, Math.cos(angle) * radius], aim: [0, 30, 0], fov: i === 0 ? 46 : 36 };
    const at = keyPart(shot);
    if (shot.move === 'in') out[shot.id] = through(key, at, { forward: -160, up: 14 }, { forward: 120, up: -6 });
    else if (shot.move === 'out') out[shot.id] = through(key, at, { forward: 120, up: -6 }, { forward: -160, up: 14 });
    else if (shot.move === 'left') out[shot.id] = through(key, at, { right: 70 }, { right: -70 });
    else if (shot.move === 'right') out[shot.id] = through(key, at, { right: -70 }, { right: 70 });
    else out[shot.id] = through(key, at, { forward: -20 }, { forward: 20 });
  });
  return out;
}

export function defaultPlace(unit: string, c: DefaultColours): PlaceModule {
  const shots = cameras(unit);
  const first = Object.values(shots)[0] as CameraPath;
  return {
    unit,
    shots,
    loop: { path: first, timeOffset: 0 },
    create: (): Place => {
      const parts = new Parts(unit);
      const kit = createBlockout(parts);
      const scene = new THREE.Scene();
      scene.add(parts.standIn('sky', kit.sky(c.skyTop, c.skyHorizon)));
      scene.add(parts.standIn('land', new THREE.Mesh(terrain(SIZE, SIZE, 160, 160, ground), kit.flat(c.land, { band: c.band, step: 24 }))));
      const fluid = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), kit.flow(c.fluid, c.fluidDark, { scale: 60, speed: 9, direction: [0.8, 0.6] }));
      scene.add(parts.standIn('fluid', fluid));
      const blocks = new THREE.Group();
      const stone = kit.flat(c.band, { band: c.land, step: 40 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const r = 700 + (i % 3) * 260;
        const h = 240 + (i % 4) * 150;
        const block = new THREE.Mesh(new THREE.BoxGeometry(150, h, 110), stone);
        block.position.set(Math.sin(a) * r, h / 2 - 10, Math.cos(a) * r);
        block.rotation.y = a * 1.7;
        blocks.add(block);
      }
      scene.add(parts.standIn('forms', blocks));
      const figures = herd(new THREE.CapsuleGeometry(2.2, 7, 2, 8), kit.flat(c.figure), FIGURES);
      scene.add(parts.standIn('animals', figures));
      kit.air(c.air, 0.00055);
      const camera = new THREE.PerspectiveCamera(40, 16 / 9, 1, 40000);
      return {
        unit,
        scene,
        camera,
        look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
        volume: null,
        parts,
        setTime: (seconds) => {
          kit.setTime(seconds);
          for (let i = 0; i < FIGURES; i++) {
            const a = i * 2.399 + seconds * (0.02 + (i % 5) * 0.006);
            const r = 150 + (i % 7) * 26;
            setFigure(figures, i, Math.sin(a) * r, 5.5 + 0.6 * Math.sin(seconds * 2.1 + i), Math.cos(a) * r, a + Math.PI / 2, 1 + (i % 3) * 0.35);
          }
        },
        solo: (part) => kit.solo(part),
      };
    },
  };
}
