// The curtain of the near cliff: limp wet fronds of weed, each a ribbon with its own breadth and curl, hung in layers off the weed's
// face so that one lies over another and the gaps between them are dark. The sheet of the skirt behind them is only the mass they hang on.
import * as THREE from 'three';
import { partAtHeight, radii, skirtPad, surface, type Rib } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { noise2, smooth } from './noise';
import { weedLump, weedTier, weedTop } from './shapes';

export interface CurtainOptions {
  count: number;
  /** The angles round the blade between which the fronds hang. */
  from: number;
  to: number;
  /** Where they hang thickest, and where they keep clear of the one who hangs in the weed: (angle, height). */
  focus: [number, number];
  /** Numbers in [0, 1), the same every time. */
  next: () => number;
}

const SEGMENTS = 11;

export function curtainShape(rib: Rib, options: CurtainOptions): THREE.BufferGeometry {
  const tTide = partAtHeight(rib, 30);
  const [at, bt] = radii(rib, tTide);
  const foot = new THREE.Vector3();
  const reach = (at + bt) / 2 + 10;
  // The weed's own face, as the skirt has it, and `out` metres off it.
  const face = (phi: number, y: number, out: number, p: THREE.Vector3): void => {
    foot.copy(surface(rib, tTide, phi, at, bt));
    const yy = Math.max(0, y);
    const t = partAtHeight(rib, yy);
    const [a, b] = radii(rib, t);
    const calm = smooth(3, 9, Math.hypot((phi - options.focus[0]) * (a + 10), y - options.focus[1]));
    const plinth = 2.5 * smooth(5, 0, y) * (0.4 + 1.2 * noise2(foot.x / 11 + 5, foot.z / 11)) * calm;
    const pad = skirtPad(yy) + (0.6 * weedLump(foot.x, y, foot.z) + 0.3 * weedTier(foot.x, y, foot.z)[0]) * calm + plinth + out;
    p.copy(surface(rib, t, phi, a + pad, b + pad));
  };
  const rows = SEGMENTS + 1;
  const positions = new Float32Array(options.count * rows * 3 * 3);
  const uvs = new Float32Array(options.count * rows * 3 * 2);
  const tones = new Float32Array(options.count * rows * 3 * 3);
  const index: number[] = [];
  const c = new THREE.Vector3();
  const c2 = new THREE.Vector3();
  const side = new THREE.Vector3();
  const outward = new THREE.Vector3();
  const down = new THREE.Vector3();
  let made = 0;
  // The weed hangs in hanks: half a dozen fronds from one hold, fanned a little, of one length and one colour, more or less.
  let hank = { phi: 0, top: 0, length: 0, layer: 0, tone: 0, amber: 0 };
  for (let i = 0; i < options.count; i++) {
    if (i % 6 === 0) {
      const near = options.next() < 0.4;
      const phi = near ? options.focus[0] + 0.22 * (options.next() + options.next() - 1) : options.from + (options.to - options.from) * options.next();
      foot.copy(surface(rib, tTide, phi, at, bt));
      const top = weedTop(foot.x, foot.z) - 1.5;
      hank = { phi, top: 3 + (top - 3) * Math.sqrt(options.next()), length: 4 + 7 * options.next() ** 1.5, layer: options.next(), tone: options.next(), amber: options.next() < 0.14 ? 0.5 + 0.5 * options.next() : 0 };
    }
    const phi0 = hank.phi + (1.1 * (options.next() - 0.5)) / reach;
    const yTop = hank.top - 0.9 * options.next();
    const length = hank.length * (0.55 + 0.45 * options.next());
    const breadth = 0.26 + 0.46 * options.next();
    const layer = Math.min(1, hank.layer * 0.8 + 0.25 * options.next());
    const twist = 0.7 * (options.next() - 0.5);
    const drift = 1.2 * (options.next() - 0.5);
    const wave = options.next() * 6.283;
    const tone = Math.min(1, Math.max(0, hank.tone + 0.3 * (options.next() - 0.5)));
    const amber = Math.max(hank.amber * options.next(), 0.12 * options.next());
    const yEnd = Math.max(0.5, yTop - length);
    // Not across the one who hangs there.
    const arc = (phi0 - options.focus[0]) * reach;
    if (Math.abs(arc) < 2.6 && yTop > options.focus[1] - 7 && yEnd < options.focus[1] + 2.5) continue;
    const v0 = made * rows * 3;
    for (let k = 0; k < rows; k++) {
      const f = k / SEGMENTS;
      const y = yTop + (yEnd - yTop) * f;
      const phi = phi0 + (drift * f + 0.3 * Math.sin(wave + 4.4 * f) + 0.12 * Math.sin(wave * 2.3 + 11 * f)) / reach;
      const out = 0.3 + 0.9 * layer + 0.25 * Math.sin(Math.PI * f) * (0.3 + layer);
      face(phi, y, out, c);
      face(phi + 0.01, y, out, c2);
      side.copy(c2).sub(c).normalize();
      face(phi, y, out + 1, c2);
      outward.copy(c2).sub(c).normalize();
      const turn = twist + 0.35 * Math.sin(wave * 1.7 + 4.3 * f);
      side.multiplyScalar(Math.cos(turn)).addScaledVector(outward, Math.sin(turn)).normalize();
      // Narrow where it holds, broad a third of the way down, drawn to a point.
      const w = 0.5 * breadth * (0.2 + 0.8 * smooth(0, 0.22, f)) * (1 - 0.6 * smooth(0.7, 1, f)) * (1 + 0.25 * Math.sin(wave + 7 * f));
      down.crossVectors(side, outward);
      for (let s = 0; s < 3; s++) {
        const q = (v0 + k * 3 + s) * 3;
        const e = s - 1;
        // The middle stands a little proud of the edges, and the edges ruffle.
        const proud = s === 1 ? 0.22 * w : 0.1 * w * Math.sin(wave + 9 * f + 2 * s);
        positions[q] = c.x + side.x * w * e + outward.x * proud;
        positions[q + 1] = c.y + side.y * w * e + outward.y * proud;
        positions[q + 2] = c.z + side.z * w * e + outward.z * proud;
        const u = (v0 + k * 3 + s) * 2;
        uvs[u] = s / 2;
        uvs[u + 1] = f;
        tones[q] = tone;
        tones[q + 1] = amber;
        tones[q + 2] = 0.35 + 0.65 * layer;
      }
      if (k < SEGMENTS) {
        for (let s = 0; s < 2; s++) {
          const a = v0 + k * 3 + s;
          index.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
        }
      }
    }
    made += 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, made * rows * 9), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs.subarray(0, made * rows * 6), 2));
  g.setAttribute('aTone', new THREE.BufferAttribute(tones.subarray(0, made * rows * 9), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export const CURTAIN_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vTone;
attribute vec3 aTone;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vTone = aTone;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Wet weed: near black olive, a broad wet light on what turns to the sky, amber where a thin frond stands between the lens and the sun.
export const CURTAIN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vTone;
${RIG_GLSL}
${NOISE_GLSL}
void main() {
  vec3 n0 = normalize(vNormal);
  if (!gl_FrontFacing) n0 = -n0;
  vec3 v = normalize(cameraPosition - vWorld);
  float edge = abs(vUv.x * 2.0 - 1.0);
  // The frond's own wrinkles, across it and along.
  vec2 at = vec2(vUv.x * 2.3 + vTone.x * 37.0, vUv.y * 11.0 + vTone.x * 91.0);
  float wr = vnoise(at);
  float wr2 = vnoise(at * vec2(2.7, 0.6) + 7.0);
  // A frond is no flat strap: it is ruffled at its edges and troughed along its midrib, so the wet light on it is a line and not a face.
  float ragged = 0.62 + 0.38 * vnoise(vec2(vUv.y * 23.0 + vTone.x * 53.0, vUv.x < 0.5 ? 1.5 : 8.5));
  if (edge > ragged) discard;
  vec3 du = dFdx(vWorld) * dFdy(vUv.y) - dFdy(vWorld) * dFdx(vUv.y);
  vec3 across = normalize(du - n0 * dot(du, n0) + vec3(1e-7, 0.0, 0.0)) * sign(dFdx(vUv.x) * dFdy(vUv.y) - dFdy(vUv.x) * dFdx(vUv.y) + 1e-12);
  float ruffle = sin(vUv.y * 60.0 + vTone.x * 40.0 + 3.0 * wr) * smoothstep(0.3, 0.9, edge);
  vec3 n = normalize(n0 + across * ((vUv.x * 2.0 - 1.0) * 0.9) + 0.5 * vec3(wr - 0.5, 0.35 * (wr2 - 0.5) + 0.6 * ruffle, wr2 - 0.5));
  vec3 olive = mix(vec3(0.006, 0.0056, 0.0036), vec3(0.017, 0.0135, 0.0055), vTone.x);
  vec3 amber = vec3(0.075, 0.034, 0.006);
  float gold = vTone.y * (0.35 + 0.65 * smoothstep(0.2, 0.9, edge + 0.5 * (wr - 0.5)));
  vec3 albedo = mix(olive, amber, gold) * (0.7 + 0.6 * wr2);
  // What lies under other fronds is in their shade; the gap by the midrib is dark.
  float occ = vTone.z * (0.55 + 0.45 * smoothstep(0.0, 0.5, edge + wr - 0.5));
  float rough = 0.3 + 0.25 * wr;
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // The low sun through a thin wet frond.
  float thru = max(dot(-n0, uSunDir), 0.0) * sunAt(vWorld, landAt(vWorld.xz));
  c += amber * uSunColour * (0.2 * thru * vTone.y * occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
