// The insects of the stalk colony as the lens of the colony sees them: a body told in segments, six legs, two tails, and two pairs of veined
// wings that beat about it. All of it is mesh, lit by the rig; nothing is a picture. Far off, and in the other shots, they stay the cards
// of shaders.ts.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

/** Where an insect is and how it is turned: the same lines as the cards use, and a way round the trunk it lives by. */
const INSECT_PLACE = /* glsl */ `
attribute vec4 aHome;
attribute vec4 aRate;
attribute vec4 aPhase;
attribute vec4 aPerch;
attribute vec4 aPerch2;
attribute vec4 aLean;
uniform float uSeconds;
vec3 clearOf(vec3 q, vec4 perch, vec2 lean) {
  // Under the top of a trunk its line leans away; within the trunk's girth of that line the path is pushed out to the bark and round it.
  float below = perch.z - q.y;
  vec2 axis = perch.xy - lean * below;
  vec2 d = q.xz - axis;
  float l = length(d);
  float r = perch.w * smoothstep(-0.1, 0.06, below);
  q.xz = axis + d / max(l, 1e-4) * max(l, r);
  return q;
}
vec3 pathAt(float t) {
  // It hangs and drifts about its plume on one unbroken path: slow loops, each with its own three rates, and a small quick tremble over them.
  vec3 w = vec3(0.9 + 0.5 * fract(aPhase.x * 0.37), 0.7 + 0.5 * fract(aPhase.y * 0.61), 0.8 + 0.5 * fract(aPhase.z * 0.43));
  vec3 p = vec3(
    sin(t * w.x + aPhase.x) + 0.35 * sin(t * w.x * 2.3 + aPhase.y),
    0.5 * sin(t * w.y + aPhase.y) + 0.2 * sin(t * w.y * 1.9 + aPhase.z),
    sin(t * w.z + aPhase.z) + 0.35 * cos(t * w.z * 2.1 + aPhase.x));
  vec3 q = aHome.xyz + aHome.w * 0.8 * p + 0.008 * vec3(sin(t * 7.3 + aPhase.z), sin(t * 9.1 + aPhase.x), cos(t * 6.7 + aPhase.y));
  // None flies through a trunk: its path goes round the two that stand nearest its home.
  return clearOf(clearOf(q, aPerch, aLean.xy), aPerch2, aLean.zw);
}
`;

export const INSECT_BODY_VERTEX = /* glsl */ `
${INSECT_PLACE}
attribute float aPiece;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vPiece;
void main() {
  vec3 at = pathAt(uSeconds);
  // It heads the way it goes, and hangs tail down, the way a mayfly does.
  vec3 heading = pathAt(uSeconds + 0.06) - pathAt(uSeconds - 0.06);
  vec3 fwd = normalize(vec3(heading.x, 0.0, heading.z) + vec3(1e-4, 0.0, 0.0));
  fwd = normalize(fwd + vec3(0.0, 0.35, 0.0));
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, fwd);
  float perched = aRate.w;
  if (perched > 0.5) {
    // Settled on the bark: it does not travel, its back is to the air, and it has turned a little off the line of the trunk.
    at = aHome.xyz;
    up = normalize(aRate.xyz);
    vec3 climb = normalize(vec3(0.0, 1.0, 0.0) - up * up.y);
    vec3 across = cross(climb, up);
    float turn = 0.7 * sin(aPhase.x);
    fwd = climb * cos(turn) + across * sin(turn);
    right = cross(fwd, up);
  }
  vec3 local = position;
  vec3 nl = normal;
  float wing = step(0.5, abs(aPiece)) * step(abs(aPiece), 2.5);
  if (wing > 0.5) {
    // A wing: position.x is how far along it from its hinge, position.y where along the body, and it turns about the body's line.
    float side = sign(aPiece);
    float hind = step(1.5, abs(aPiece));
    float turn = uSeconds * (38.0 + 14.0 * fract(aPhase.x)) + aPhase.y - 0.7 * hind;
    float beat = sin(turn);
    float ang = 0.3 + 0.85 * beat - 0.15 * hind;
    // At rest the wings lie out flat to either side and lift a little now and then, slowly, each insect in its own time.
    float fan = smoothstep(0.6, 1.0, sin(uSeconds * (0.9 + 0.6 * fract(aPhase.z)) + aPhase.y));
    if (perched > 0.5) ang = 0.1 + 0.35 * fan - 0.12 * hind;
    float span = abs(position.x);
    // It is not a board: it bends along its length as it beats, the tip after the root, and its hind edge trails its fore edge.
    float cup = ang + (0.7 * span * span * beat - 0.45 * uv.y * cos(turn)) * (1.0 - perched);
    local = vec3(side * (0.035 + span * cos(cup)), position.y, 0.05 + span * sin(cup));
    nl = vec3(-side * sin(cup), 0.0, cos(cup));
  }
  float size = 0.03 * aPhase.w;
  vWorld = at + (right * local.x + fwd * local.y + up * local.z) * size;
  vNormal = normalize(right * nl.x + fwd * nl.y + up * nl.z);
  vUv = uv;
  vPiece = aPiece;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

/** What of a wing is there: its veins, and some of the panes of skin between them; most of the panes are clear and let the lens through. */
const INSECT_PANES = /* glsl */ `
  float isWing = step(0.5, abs(vPiece)) * step(abs(vPiece), 2.5);
  // Veins run out from the root and fork; short ones cross between them, each row set off from the next.
  float lanes = 6.0 + 3.0 * smoothstep(0.35, 0.8, vUv.x);
  float lane = vUv.y * lanes + 0.12 * sin(vUv.x * 9.0);
  float along = abs(fract(lane) - 0.5);
  float rung = vUv.x * 11.0 + 0.37 * floor(lane) + 0.15 * sin(floor(lane) * 3.1);
  float across = abs(fract(rung) - 0.5);
  float vein = max(smoothstep(0.36, 0.46, along), 0.8 * smoothstep(0.39, 0.47, across));
  vein = max(vein, 1.0 - smoothstep(0.03, 0.07, vUv.y));
  float cell = fract(sin(dot(vec2(floor(lane), floor(rung)), vec2(127.1, 311.7))) * 43758.5453);
  float clear = step(cell, 0.72) * (1.0 - step(0.5, vein)) * isWing;
  if (clear > 0.5) discard;
`;

export const INSECT_BODY_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vPiece;
${RIG_GLSL}
void main() {
${INSECT_PANES}
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  vec3 c;
  if (isWing > 0.5) {
    // A clear amber skin on dark veins: the sky comes through it, so it is lit from both sides, and it glints where it turns to the sky.
    vec3 skin = mix(vec3(0.15, 0.12, 0.08), vec3(0.22, 0.16, 0.09), cell) * (0.7 + 0.3 * smoothstep(0.0, 0.5, vUv.x));
    vec3 rib = vec3(0.1, 0.06, 0.035);
    vec3 albedo = mix(skin, rib, vein);
    c = rigShade(vWorld, n, v, albedo, 0.92, 1.0);
    c += (1.0 - 0.6 * vein) * 0.4 * rigShade(vWorld, -n, v, skin * vec3(1.0, 0.9, 0.75), 0.9, 1.0);
    vec3 r = reflect(-v, n);
    c += (1.0 - vein) * skyRadiance(vec3(r.x, abs(r.y), r.z)) * (0.015 + 0.05 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 4.0));
  } else {
    // Amber and brown, darker on the back than beneath, with a dark seam where one segment meets the next; legs and tails are darker still.
    float seam = smoothstep(0.66, 0.94, abs(fract(vUv.x) - 0.5) * 2.0);
    float back = smoothstep(-0.3, 0.6, vUv.y);
    vec3 albedo = mix(vec3(0.3, 0.17, 0.06), vec3(0.11, 0.05, 0.02), back);
    albedo = mix(albedo, vec3(0.2, 0.09, 0.03), 0.5 * step(8.5, vUv.x));
    albedo *= 1.0 - 0.55 * seam;
    float thin = step(2.5, abs(vPiece));
    albedo = mix(albedo, vec3(0.07, 0.04, 0.02), thin);
    c = rigShade(vWorld, n, v, albedo, mix(0.42, 0.7, thin), 1.0);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const INSECT_BODY_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vPiece;
void main() {
${INSECT_PANES}
  gl_FragColor = vec4(0.0);
}`;

/** One insect, in lengths of its own body: x to its right, y the way it heads, z up from its back. */
function insectGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const piece: number[] = [];
  const index: number[] = [];
  const push = (p: [number, number, number], n: [number, number, number], u: number, v: number, k: number): number => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    uvs.push(u, v);
    piece.push(k);
    return pos.length / 3 - 1;
  };
  // The body, tail to head: seven segments of abdomen that curve up toward the tails, a thick thorax, a small plain head. No eyes.
  const SIDES = 6;
  const rings: [number, number, number, number][] = [];
  for (let s = 0; s < 7; s++) {
    for (const f of [0.08, 0.5, 0.92]) {
      const t = (s + f) / 7;
      const y = -0.57 + 0.55 * t;
      const girth = (0.024 + 0.06 * Math.pow(t, 0.8)) * (0.78 + 0.22 * Math.sin(Math.PI * f));
      rings.push([y, 0.2 * Math.pow(1 - t, 2), girth, s + f]);
    }
  }
  for (const [y, r, u] of [[0.0, 0.065, 7.1], [0.07, 0.105, 7.5], [0.17, 0.11, 7.5], [0.26, 0.075, 7.9], [0.29, 0.045, 8.0]] as [number, number, number][]) rings.push([y, 0.012, r, u]);
  for (const [y, r, u] of [[0.31, 0.048, 9.1], [0.36, 0.066, 9.5], [0.41, 0.05, 9.5], [0.44, 0.014, 9.9]] as [number, number, number][]) rings.push([y, 0.0, r, u]);
  rings.forEach((ring, i) => {
    for (let k = 0; k < SIDES; k++) {
      const a = (k / SIDES) * Math.PI * 2;
      const cx = Math.cos(a);
      const cz = Math.sin(a);
      push([cx * ring[2] * 0.9, ring[0], ring[1] + cz * ring[2]], [cx, 0, cz], ring[3], cz, 0);
    }
    if (i > 0) {
      for (let k = 0; k < SIDES; k++) {
        const a = (i - 1) * SIDES + k;
        const b = (i - 1) * SIDES + ((k + 1) % SIDES);
        index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
      }
    }
  });
  // Something thin, a leg or a tail or a feeler: two ribbons crossed along its line, so that it is seen from every side.
  const thin = (a: [number, number, number], b: [number, number, number], wa: number, wb: number): void => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0] as number, d[1] as number, d[2] as number) || 1;
    const t = [(d[0] as number) / l, (d[1] as number) / l, (d[2] as number) / l];
    const ref: [number, number, number] = Math.abs(t[1] as number) < 0.8 ? [0, 1, 0] : [1, 0, 0];
    const s1 = [(t[1] as number) * ref[2] - (t[2] as number) * ref[1], (t[2] as number) * ref[0] - (t[0] as number) * ref[2], (t[0] as number) * ref[1] - (t[1] as number) * ref[0]];
    const l1 = Math.hypot(s1[0] as number, s1[1] as number, s1[2] as number) || 1;
    const u1: [number, number, number] = [(s1[0] as number) / l1, (s1[1] as number) / l1, (s1[2] as number) / l1];
    const u2: [number, number, number] = [(t[1] as number) * u1[2] - (t[2] as number) * u1[1], (t[2] as number) * u1[0] - (t[0] as number) * u1[2], (t[0] as number) * u1[1] - (t[1] as number) * u1[0]];
    for (const [side, face] of [[u1, u2], [u2, u1]] as [[number, number, number], [number, number, number]][]) {
      const i0 = push([a[0] - side[0] * wa, a[1] - side[1] * wa, a[2] - side[2] * wa], face, 0.5, 0, 3);
      push([a[0] + side[0] * wa, a[1] + side[1] * wa, a[2] + side[2] * wa], face, 0.5, 0, 3);
      push([b[0] - side[0] * wb, b[1] - side[1] * wb, b[2] - side[2] * wb], face, 0.5, 0, 3);
      push([b[0] + side[0] * wb, b[1] + side[1] * wb, b[2] + side[2] * wb], face, 0.5, 0, 3);
      index.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  };
  // Six legs from under the thorax: out and down to a knee, then down and back to a foot. The front pair reaches forward.
  for (const side of [-1, 1]) {
    ([[0.24, 0.3, 0.34], [0.15, 0.1, 0.02], [0.06, -0.06, -0.2]] as [number, number, number][]).forEach(([root, knee, foot], which) => {
      const reach = 0.16 + 0.03 * which;
      const k: [number, number, number] = [side * reach, knee, -0.07 - 0.02 * which];
      thin([side * 0.045, root, -0.045], k, 0.008, 0.006);
      thin(k, [side * (reach + 0.07), foot, -0.24 - 0.02 * which], 0.006, 0.003);
    });
    // Two long tails that part from each other, and two short feelers.
    const t0: [number, number, number] = [side * 0.008, -0.56, 0.2];
    const t1: [number, number, number] = [side * 0.07, -0.86, 0.27];
    const t2: [number, number, number] = [side * 0.17, -1.18, 0.29];
    const t3: [number, number, number] = [side * 0.3, -1.5, 0.25];
    thin(t0, t1, 0.006, 0.0045);
    thin(t1, t2, 0.0045, 0.003);
    thin(t2, t3, 0.003, 0.0012);
    thin([side * 0.025, 0.43, 0.015], [side * 0.075, 0.56, 0.05], 0.004, 0.0015);
  }
  // Two pairs of wings, long and narrow: the fore pair longer than the body, the hind pair shorter behind it. x is the distance from the hinge.
  const S = [0, 0.1, 0.25, 0.42, 0.6, 0.78, 0.92, 1];
  const LEAD = [0.015, 0.06, 0.1, 0.115, 0.11, 0.085, 0.045, 0.0];
  const TRAIL = [-0.015, -0.1, -0.22, -0.275, -0.25, -0.17, -0.08, 0.0];
  for (const [kind, long, wide, hinge] of [[1, 1.2, 0.5, 0.15], [2, 0.8, 0.5, 0.02]] as [number, number, number, number][]) {
    for (const side of [-1, 1]) {
      const start = pos.length / 3;
      S.forEach((s, i) => {
        push([s * long, hinge + (LEAD[i] as number) * wide * long * 1.2, 0], [0, 0, 1], s, 0, side * kind);
        push([s * long, hinge + (TRAIL[i] as number) * wide * long * 1.2, 0], [0, 0, 1], s, 1, side * kind);
        if (i > 0) {
          const a = start + (i - 1) * 2;
          index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('aPiece', new THREE.Float32BufferAttribute(piece, 1));
  g.setIndex(index);
  return g;
}

/** The insects the lens of the colony is among, `count` of them, each given where it lives, how it moves and the trunk it keeps clear of. */
export function insectMesh(ctx: Context, uSeconds: { value: number }, count: number, home: Float32Array, rate: Float32Array, phase: Float32Array, perch: Float32Array, perch2: Float32Array, lean: Float32Array): THREE.Mesh {
  const base = insectGeometry();
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of ['position', 'normal', 'uv', 'aPiece']) g.setAttribute(name, base.getAttribute(name));
  g.setAttribute('aHome', new THREE.InstancedBufferAttribute(home, 4));
  g.setAttribute('aRate', new THREE.InstancedBufferAttribute(rate, 4));
  g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 4));
  g.setAttribute('aPerch', new THREE.InstancedBufferAttribute(perch, 4));
  g.setAttribute('aPerch2', new THREE.InstancedBufferAttribute(perch2, 4));
  g.setAttribute('aLean', new THREE.InstancedBufferAttribute(lean, 4));
  g.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds },
    vertexShader: INSECT_BODY_VERTEX,
    fragmentShader: INSECT_BODY_FRAGMENT,
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = INSECT_BODY_DEPTH;
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  return mesh;
}
