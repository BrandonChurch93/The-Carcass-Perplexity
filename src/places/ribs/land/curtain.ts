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

const SEGMENTS = 8;

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
  const tones = new Float32Array(options.count * rows * 3 * 4);
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
      hank = { phi, top: 3 + (top - 3) * Math.sqrt(options.next()), length: 1.5 + 4.5 * options.next() ** 1.5, layer: options.next(), tone: options.next(), amber: options.next() < 0.42 ? 0.5 + 0.5 * options.next() : 0 };
    }
    const phi0 = hank.phi + (0.9 * (options.next() - 0.5)) / reach;
    const yTop = hank.top - 0.9 * options.next();
    const length = hank.length * (0.55 + 0.45 * options.next());
    // Where a lens comes near, a frond is a hand or two broad; far off they are broader, so that the wall keeps its hem.
    const arc = (phi0 - options.focus[0]) * reach;
    const far = Math.abs(arc) > 34;
    const breadth = far ? 0.12 + 0.3 * options.next() : 0.07 + 0.2 * options.next();
    const layer = Math.min(1, hank.layer * 0.8 + 0.25 * options.next());
    const twist = 0.7 * (options.next() - 0.5);
    const drift = 0.6 * (options.next() - 0.5);
    const wave = options.next() * 6.283;
    const tone = Math.min(1, Math.max(0, hank.tone + 0.3 * (options.next() - 0.5)));
    const amber = Math.max(hank.amber * options.next(), 0.07 * options.next());
    const yEnd = Math.max(0.5, yTop - length);
    // Behind the one who hangs there they lie flat on the wall, in its shade.
    const behind = Math.abs(arc) < 2.6 && yTop > options.focus[1] - 7 && yEnd < options.focus[1] + 2.5;
    const v0 = made * rows * 3;
    for (let k = 0; k < rows; k++) {
      const f = k / SEGMENTS;
      const y = yTop + (yEnd - yTop) * f;
      const phi = phi0 + (drift * f + 0.14 * Math.sin(wave + 4.4 * f) + 0.05 * Math.sin(wave * 2.3 + 11 * f)) / reach;
      const out = behind ? 0.05 + 0.2 * layer : 0.15 + 0.6 * layer + 0.12 * Math.sin(Math.PI * f) * (0.3 + layer);
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
        const o = (v0 + k * 3 + s) * 4;
        tones[o] = tone;
        tones[o + 1] = amber;
        tones[o + 2] = behind ? 0.3 + 0.3 * layer : 0.35 + 0.65 * layer;
        tones[o + 3] = yTop - yEnd;
      }
    }
    // Away from the one who hangs there no lens comes near: a frond is one strip of half as many lengths.
    const own: number[] = [];
    if (far) {
      for (let k = 0; k < SEGMENTS; k += 2) {
        const a = v0 + k * 3;
        own.push(a, a + 6, a + 2, a + 2, a + 6, a + 8);
      }
    } else {
      for (let k = 0; k < SEGMENTS; k++) {
        for (let s = 0; s < 2; s++) {
          const a = v0 + k * 3 + s;
          own.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
        }
      }
    }
    for (const i of own) index.push(i);
    made += 1;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, made * rows * 9), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs.subarray(0, made * rows * 6), 2));
  g.setAttribute('aTone', new THREE.BufferAttribute(tones.subarray(0, made * rows * 12), 4));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export const CURTAIN_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vTone;
attribute vec4 aTone;
uniform float uTime;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  // Limp and wet, it only stirs: each frond in its own time, its end more than its hold, the long ones most.
  float own = aTone.x * 53.0 + aTone.w * 7.0;
  float gust = sin(uTime * 1.1 + w.x * 0.05 + w.z * 0.08);
  float sway = sin(uTime * 1.7 + own + 1.3 * gust) + 0.4 * sin(uTime * 3.1 + own * 1.7 + uv.y * 3.0);
  vec3 along = normalize(cross(vNormal, vec3(0.0, 1.0, 0.0)) + vec3(1e-5, 0.0, 0.0));
  w.xyz += (along * sway + vNormal * (0.3 * sin(uTime * 2.3 + own * 0.7))) * (uv.y * uv.y * (0.015 + 0.012 * aTone.w));
  vWorld = w.xyz;
  vUv = uv;
  vTone = aTone;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Wet weed: olive brown, beads of wet on what turns to the sky, amber where a thin frond stands between the lens and the day.
export const CURTAIN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vTone;
${RIG_GLSL}
${NOISE_GLSL}
void main() {
  vec3 n0 = normalize(vNormal);
  if (!gl_FrontFacing) n0 = -n0;
  vec3 toLens = cameraPosition - vWorld;
  vec3 v = normalize(toLens);
  float edge = abs(vUv.x * 2.0 - 1.0);
  // The frond's own wrinkles, across it and along. Every fragment of the curtain that is seen is paid for: from 70 m they are not seen, nor asked.
  float wr = 0.5;
  float wr2 = 0.5;
  float close = 1.0 - smoothstep(2500.0, 4900.0, dot(toLens, toLens));
  if (close > 0.0) {
    vec2 at = vec2(vUv.x * 2.3 + vTone.x * 37.0, vUv.y * 11.0 + vTone.x * 91.0);
    wr = mix(0.5, vnoise(at), close);
    wr2 = mix(0.5, vnoise(at * vec2(2.7, 0.6) + 7.0), close);
  }
  // A frond is no flat strap: it is ruffled at its edges and troughed along its midrib, so the wet light on it is a line and not a face.
  vec3 du = dFdx(vWorld) * dFdy(vUv.y) - dFdy(vWorld) * dFdx(vUv.y);
  vec3 across = normalize(du - n0 * dot(du, n0) + vec3(1e-7, 0.0, 0.0)) * sign(dFdx(vUv.x) * dFdy(vUv.y) - dFdy(vUv.x) * dFdx(vUv.y) + 1e-12);
  float ruffle = sin(vUv.y * 60.0 + vTone.x * 40.0 + 3.0 * wr) * smoothstep(0.3, 0.9, edge);
  vec3 n = normalize(n0 + across * ((vUv.x * 2.0 - 1.0) * 0.28) + 0.5 * vec3(wr - 0.5, 0.35 * (wr2 - 0.5) + 0.6 * ruffle, wr2 - 0.5));
  // Olive brown where it is thick, amber toward its thin end and its edges, where the day comes through it.
  vec3 olive = mix(vec3(0.03, 0.021, 0.006), vec3(0.075, 0.052, 0.014), vTone.x);
  vec3 amber = vec3(0.21, 0.12, 0.02);
  float thin = smoothstep(0.1, 0.9, vUv.y) * (0.4 + 0.6 * smoothstep(0.2, 0.9, edge + 0.5 * (wr - 0.5)));
  float gold = (0.22 + 0.78 * vTone.y) * thin;
  // From far off the curtain is one dark mass: each frond stands in the shade of the rest, and no day comes through it.
  vec3 albedo = mix(olive, amber, gold) * (0.7 + 0.6 * wr2) * mix(0.34, 1.0, close);
  // What lies under other fronds is in their shade; the gap by the midrib is dark.
  float occ = vTone.z * (0.55 + 0.45 * smoothstep(0.0, 0.5, edge + wr - 0.5));
  // Wet through, but no hose and no mirror: the film on it stands in beads, so the sky on it is a scatter of points and not a sheen.
  float bead = close * smoothstep(0.86, 0.93, vnoise(vec2(vUv.x * 9.0 + vTone.x * 17.0, vUv.y * vTone.w * 45.0 + vTone.x * 131.0)));
  float rough = 0.74 + 0.2 * wr - 0.45 * bead;
  // A frond seen along itself is no mirror of the sky: its skin is ruffled finer than the lens sees, so it is lit as if it stood half toward the lens.
  n = normalize(n + v * max(0.0, 0.55 - dot(n, v)));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  vec3 above = skyIrradiance(vec3(0.0, 1.0, 0.0));
  c += above * (0.35 * bead * occ * pow(max(dot(n, normalize(v + vec3(0.0, 1.0, 0.0))), 0.0), 6.0));
  // The day through a frond that hangs free of the wall.
  c += amber * above * (0.07 * close * thin * smoothstep(0.45, 0.95, vTone.z) * occ);
  // The low sun through a thin wet frond.
  float thru = (max(dot(-n0, uSunDir), 0.0) + 0.12 * max(dot(n0, uSunDir), 0.0)) * (0.08 + 0.92 * vTone.y) * occ;
  // The sun's reach is read at named levels: a picture read by the pixel's own level inside a branch is not defined at its edge.
  if (thru > 0.06) c += amber * uSunColour * (0.3 * thru * sunBaked(vWorld, textureLod(tLand, (vWorld.xz - uLandRect.xy) * uLandRect.zw, 0.0)) * cloudShadeMarched(vWorld));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
