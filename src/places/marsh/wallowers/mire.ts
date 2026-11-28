// The wallow the ones by the lens of the wallowers stand in: churned mud with red brine standing in every pit of it. One height field
// (the churn sheet, laid twice at two sizes, the second turned) says where a clod stands out of the brine and where the brine lies: the
// mesh is lifted by it, so clods hide one another and stand against the legs, and the fragment shades the two as what they are. A clod is
// wet mud, dark at the line of the brine and paler on its crumbs. The brine is level, dark, and mirrors what stands in it (the brine's own
// mirror picture, read a little lower because the wallow lies above the brine's level) by Fresnel's law; a ring leaves each leg and the lip
// that works it. Its edge is no outline: it thins out over the bed clod by clod. A pure function of the seconds.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** How many legs one sheet answers to. */
export const MIRE_LEGS = 8;

/** Metres one churn sheet covers, the broad lay and the fine one, and how high a clod stands at most. */
const TILE_A = 1.7;
const TILE_B = 0.53;
const CLOD = 0.07;
/** The level of the churn sheet the clods of the mesh are read at: a clod is a hand and more across. */
const CLOD_LOD = 5.6;

// The height the brine stands at in the sheet's own measure (0 the deepest pit, 1 the highest crumb): high in the middle of the wallow,
// where only islands of mud stand out, and low at the rim, where it lies in the deepest pits alone.
const CHURN_GLSL = /* glsl */ `
// x, z: where the leg stands in the sheet. z: how hard it works, 0 to 1. w: its half thickness at the sheet, metres.
uniform vec4 uLegs[${MIRE_LEGS}];
float churnCut(vec2 p, float edge, float depth) {
  float broad = vnoise(p * 0.9 + 3.3);
  float inside = smoothstep(0.0, 0.07, depth) * smoothstep(0.2, 0.5, edge + 0.14 * (broad - 0.5));
  return mix(0.14, 0.56, inside) + 0.24 * (broad - 0.5);
}
// The mud a leg has pushed aside stands round it as a collar: so much is added to the height of the mud at p.
float churnCollar(vec2 p) {
  float up = 0.0;
  for (int i = 0; i < ${MIRE_LEGS}; i++) {
    float off = (length(p - uLegs[i].xy) - uLegs[i].w - 0.035) / 0.05;
    up = max(up, exp(-off * off));
  }
  return 0.3 * up;
}
vec2 churnTurn(vec2 p) {
  return vec2(p.x * 0.8253 - p.y * 0.5646, p.x * 0.5646 + p.y * 0.8253) / ${TILE_B.toFixed(3)} + vec2(0.37, 0.61);
}`;

const VERTEX = /* glsl */ `
attribute float aEdge;
attribute float aDepth;
attribute vec2 aLay;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLay;
varying float vEdge;
varying float vDepth;
uniform float uMirror;
uniform float uRelief;
uniform sampler2D tChurnNh;
${NOISE_GLSL}
${CHURN_GLSL}
float lift(vec2 lay, vec2 p, float cut) {
  float h = textureLod(tChurnNh, lay / ${TILE_A.toFixed(3)}, ${CLOD_LOD.toFixed(1)}).b + churnCollar(p);
  // A clod is no peak: it stands up from the brine with a short bank, is round on top and has slumped.
  float over = max(h - cut, 0.0);
  return (1.0 - exp(-7.0 * over) + 0.2 * over) * ${CLOD.toFixed(3)};
}
void main() {
  vEdge = aEdge;
  vDepth = aDepth;
  vLay = aLay;
  // The clods: what stands over the brine's line is lifted, the brine itself lies level.
  float cut = churnCut(position.xz, aEdge, aDepth);
  float rimmed = smoothstep(0.0, 0.12, aEdge);
  float e = 0.03;
  float h0 = lift(aLay, position.xz, cut);
  float hx = lift(aLay + vec2(e, 0.0), position.xz + vec2(e, 0.0), cut);
  float hz = lift(aLay + vec2(0.0, e), position.xz + vec2(0.0, e), cut);
  vNormal = normalize(normal * sign(normal.y + 1e-5) + rimmed * uRelief * vec3(h0 - hx, 0.0, h0 - hz) / e);
  vWorld = position + vec3(0.0, h0 * rimmed * uRelief, 0.0);
  // It is not drawn into the mirror: there it would read the picture it is being drawn into, and what comes back is not a number.
  gl_Position = mix(projectionMatrix * viewMatrix * vec4(vWorld, 1.0), vec4(2.0, 2.0, 2.0, 1.0), step(0.5, uMirror));
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLay;
varying float vEdge;
varying float vDepth;
// x, z: where a muzzle works the sheet. z: how hard, 0 to 1. w: its half width.
uniform vec4 uSnouts[2];
uniform float uSeconds;
uniform float uShown;
uniform float uLevel;
uniform sampler2D tChurn;
uniform sampler2D tChurnNh;
${NOISE_GLSL}
${RIG_GLSL}
${CHURN_GLSL}
const vec3 CHURN_MEAN = vec3(0.136, 0.053, 0.041);
const vec3 LUMA = vec3(0.3, 0.5, 0.2);
const vec3 SKY_SIDE = vec3(-0.45, 0.72, -0.53);
void main() {
  vec2 p = vWorld.xz;
  // One footprint, taken before anything is decided: every read below names its own level from it. (It is taken on the lay of the sheet
  // and not on the ground plan: where the sheet falls to the bed the lay runs down the fall, so the mud is not drawn out into streaks.)
  vec2 gx = dFdx(vLay);
  vec2 gy = dFdy(vLay);
  // (The lens skims the sheet: a pixel is five times as long as it is wide on it. The level is taken nearer the short side, or the
  // whole sheet is soft; the samples of the final tier take up what that leaves.)
  float foot = mix(min(length(gx), length(gy)), max(length(gx), length(gy)), 0.3);
  float lodA = max(log2(foot * 1024.0 / ${TILE_A.toFixed(3)}), 0.0);
  float lodB = max(log2(foot * 1024.0 / ${TILE_B.toFixed(3)}), 0.0);
  vec2 ua = vLay / ${TILE_A.toFixed(3)};
  vec2 ub = churnTurn(vLay);
  vec3 nhA = textureLod(tChurnNh, ua, lodA).rgb;
  vec3 nhB = textureLod(tChurnNh, ub, lodB).rgb;
  vec3 colA = textureLod(tChurn, ua, lodA).rgb;
  vec3 colB = textureLod(tChurn, ub, lodB).rgb;
  vec3 v = normalize(cameraPosition - vWorld);
  float away = length(cameraPosition - vWorld);
  float broad = vnoise(p * 0.9 + 3.3);
  float mid = vnoise(p * 4.7 + 1.9);

  // The height of the mud here against the line of the brine.
  // (The brine lies where the mesh is not lifted: the line is taken from the height the mesh read, with the fine height laid on it.)
  float hMesh = textureLod(tChurnNh, ua, max(lodA, ${CLOD_LOD.toFixed(1)})).b;
  float h = mix(hMesh, nhA.b, 0.4) + 0.12 * (nhB.b - 0.5) + churnCollar(p);
  float cut = churnCut(p, vEdge, vDepth);
  float over = h - cut;
  float liquid = 1.0 - smoothstep(-0.012, 0.012 + 2.0 * foot, over);

  // What the legs and the lips do to the brine: a ring leaves each, slow, and is gone within two hands; it stands dark against the leg.
  vec2 lean = vec2(0.0);
  float sleeve = 0.0;
  float churn = 0.0;
  // What stands over the sheet: the belly between the four legs of each. The brine under it shows the belly and not the sky.
  float shade = 0.0;
  for (int i = 0; i < ${MIRE_LEGS}; i++) {
    vec4 leg = uLegs[i];
    vec2 d = p - leg.xy;
    float r = length(d);
    vec2 out2 = d / max(r, 1e-4);
    float off = max(r - leg.w, 0.0);
    float climb = exp(-off / 0.04);
    lean -= out2 * 0.5 * climb;
    sleeve = max(sleeve, climb);
    float ring = cos(off * 30.0 - uSeconds * 3.1 + float(i) * 1.9) * exp(-off / 0.3) * smoothstep(0.0, 0.04, off);
    lean += out2 * (0.12 + 0.14 * leg.z) * ring;
    churn = max(churn, (0.3 + 0.7 * leg.z) * exp(-off / 0.35));
    shade += exp(-r * r / (22.0 * leg.w * leg.w));
  }
  shade = min(shade, 1.0);
  for (int i = 0; i < 2; i++) {
    vec4 snout = uSnouts[i];
    vec2 d = p - snout.xy;
    float r = length(d);
    vec2 out2 = d / max(r, 1e-4);
    float off = max(r - snout.w, 0.0);
    lean += out2 * 0.13 * snout.z * cos(off * 24.0 - uSeconds * 2.7 + float(i) * 2.3) * exp(-off / 0.35) * smoothstep(0.0, 0.05, off);
    churn = max(churn, snout.z * exp(-off / 0.4));
  }

  // The mud: the sheet's own colour, the fine lay over the broad one, dark and wet at the line of the brine and paler up on the crumbs.
  vec3 tone = colB / CHURN_MEAN;
  vec3 mud = colA * mix(vec3(1.0), min(mix(vec3(dot(tone, LUMA)), tone, 0.5), vec3(1.7)), 0.6) * 0.27;
  mud = max(mix(vec3(dot(mud, LUMA)), mud, 1.25), vec3(0.0));
  float wetLine = 1.0 - smoothstep(0.0, 0.16, over);
  // (Down the fall it is wet from the brine it falls to: the brine stands at the world's 0.)
  float foot2 = 1.0 - smoothstep(0.03, 0.3, vWorld.y + 0.1 * (broad - 0.5));
  mud *= mix(1.0, 0.5, max(wetLine, 0.8 * foot2));
  vec2 sa = (nhA.rg - 0.5) * 2.2;
  vec2 sb = (nhB.rg - 0.5) * 1.3;
  // (The fine lay is turned: its slope is turned back.)
  vec2 slope = vec2(sa.x, -sa.y) + vec2(sb.x * 0.8253 + sb.y * 0.5646, -(-sb.x * 0.5646 + sb.y * 0.8253));
  vec3 nMud = normalize(normalize(vNormal) + vec3(-slope.x, 0.0, -slope.y));
  float pit = smoothstep(-0.05, 0.3, over);
  // Wet mud is no mirror: it is lit as a rough thing, and what shines on it is the sky caught on the few faces turned to it.
  vec3 cMud = rigShade(vWorld, nMud, v, mud, 1.0, (0.4 + 0.6 * pit) * (1.0 - 0.35 * shade));
  vec3 rMud = reflect(-v, nMud);
  float wetMud = max(mix(1.0, 0.3, smoothstep(0.05, 0.35, over) * smoothstep(0.4, 0.7, nhB.b)), foot2);
  float catchSky = pow(clamp(dot(rMud, SKY_SIDE), 0.0, 1.0), 60.0);
  float open = skyOpen(vWorld);
  vec3 above = skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159);
  cMud += above * (0.16 * catchSky * wetMud);

  // The brine: level, dark with the mud stirred into it where a leg works, the bed showing through its first finger of depth.
  float depth = max(-over, 0.0);
  vec3 body = mix(vec3(0.03, 0.006, 0.005), vec3(0.045, 0.02, 0.015), 0.7 * churn + 0.3 * smoothstep(0.4, 0.7, broad));
  vec3 bed = mud * 0.55;
  vec3 under = mix(bed, body, 1.0 - exp(-depth * 14.0));
  float e = 0.04;
  float l0 = vnoise(p * 9.0 + 5.0);
  vec2 ruffle = vec2(vnoise(p * 9.0 + 5.0 + vec2(e * 9.0, 0.0)) - l0, vnoise(p * 9.0 + 5.0 + vec2(0.0, e * 9.0)) - l0) / e * 0.006;
  vec2 tilt = lean + ruffle;
  vec3 nWet = normalize(vec3(-tilt.x, 1.0, -tilt.y));
  vec3 cWet = under * above;
  // The mirror. The wallow lies uLevel above the brine the picture was drawn for: a ray it throws up is the ray the brine would throw
  // from the same place that far under its level again.
  float nv = clamp(dot(nWet, v), 0.0, 1.0);
  // (Thick with mud, it gives back less of the sky than the open brine does: a pale sheen, never a white sheet between the legs.)
  float share = min(0.02 + 0.4 * pow(1.0 - nv, 5.0), 0.07);
  vec2 swing = nWet.xz * 2.0 * clamp(away * 0.22, 0.2, 6.0);
  vec4 q = uMirrorMatrix * vec4(p.x + swing.x, -uLevel, p.y + swing.y, 1.0);
  float soft = max(log2(float(textureSize(tMirror, 0).x) / 420.0), 0.0);
  vec3 seen = clamp(textureLod(tMirror, clamp(q.xy / max(q.w, 1e-3), 0.003, 0.997), soft).rgb, vec3(0.0), vec3(8.0)) * vec3(0.93, 0.72, 0.66);
  seen = mix(seen, vec3(0.05, 0.036, 0.03) * above, 0.85 * shade);
  cWet = cWet * (1.0 - share) + share * seen * (1.0 - uMirror);
  // The dark wet line where it stands against a leg.
  cWet *= 1.0 - 0.4 * sleeve;

  vec3 c = mix(cMud, cWet, liquid);
  // Its edge thins out over the bed clod by clod: no line anywhere.
  // (It is whole down the fall to the bed, so the fall is its own mud, and breaks up over the last hand.)
  float reach = vEdge + 0.03 * (broad - 0.5) + 0.02 * (mid - 0.5) + 0.07 * (nhA.b - 0.5);
  float a = smoothstep(0.0, 0.035, reach - 0.02) * smoothstep(0.0, 0.02, vEdge);
  c = clamp(c, 0.0, 8.0);
  gl_FragColor = vec4(rigOut(c), a * uShown * (1.0 - uMirror));
}`;

export class Mire {
  /** The sheet by the lens, every clod in its mesh. */
  readonly mesh: THREE.Mesh;
  /** The same sheet for a lens that stands far off: a twentieth of the mesh, and level. Only one of the two is ever drawn. */
  readonly far: THREE.Mesh;
  readonly level: number;
  private readonly centre: THREE.Vector3;
  private readonly legs: THREE.Vector4[] = Array.from({ length: MIRE_LEGS }, () => new THREE.Vector4(0, 0, 0, 0.1));
  private readonly snouts: THREE.Vector4[] = [new THREE.Vector4(0, 0, 0, 0.1), new THREE.Vector4(0, 0, 0, 0.1)];
  private readonly uSeconds = { value: 0 };
  private readonly uShown = { value: 1 };
  private readonly uRelief = { value: 1 };

  /** A sheet about (x, z), `long` metres each way along `dir` and `wide` each way across it, its top at `level` in the world. */
  constructor(ctx: Context, x: number, z: number, dir: [number, number], long: number, wide: number, level: number) {
    const rng = ctx.rng('wallowers-mire');
    this.level = level;
    this.centre = new THREE.Vector3(x, level, z);
    const wobble = Array.from({ length: 9 }, () => [rng.range(0.03, 0.1), rng.range(0, Math.PI * 2)] as [number, number]);
    const place = (u: number, a: number): [number, number] => {
      let reach = 1;
      wobble.forEach((w, n) => {
        reach += w[0] * Math.sin(a * (n + 2) + w[1]);
      });
      const along = Math.cos(a) * long * reach * u;
      const across = Math.sin(a) * wide * reach * u;
      return [x + dir[0] * along - dir[1] * across, z + dir[1] * along + dir[0] * across];
    };
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        uLegs: { value: this.legs },
        uSnouts: { value: this.snouts },
        uSeconds: this.uSeconds,
        uShown: this.uShown,
        uRelief: this.uRelief,
        uLevel: { value: level },
        tChurn: {
          value: ctx.assets.texture('wallowers/churn.jpg', {
            kind: 'colour',
            anisotropy: 4,
          }),
        },
        tChurnNh: {
          value: ctx.assets.texture('wallowers/churn-nh.jpg', {
            kind: 'data',
            anisotropy: 4,
          }),
        },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true,
    });
    // The bed is asked for at every CI th ring and CJ th side and laid between them: the land answers slowly.
    const sheet = (RINGS: number, SIDES: number, CI: number, CJ: number): THREE.Mesh => {
      const position: number[] = [];
      const edge: number[] = [];
      const depth: number[] = [];
      const lay: number[] = [];
      const index: number[] = [];
      const spoke: [number, number, number][] = Array.from({ length: SIDES + 1 }, () => [0, 0, level]);
      const NI = RINGS / CI;
      const NJ = SIDES / CJ;
      const bed = new Float32Array((NI + 1) * (NJ + 1) * 2);
      for (let i = 0; i <= NI; i++) {
        for (let j = 0; j <= NJ; j++) {
          const [px, pz] = place((i * CI) / RINGS, ((j * CJ) / SIDES) * Math.PI * 2);
          bed[(i * (NJ + 1) + j) * 2] = ctx.rig.land.height(px, pz);
          bed[(i * (NJ + 1) + j) * 2 + 1] = ctx.rig.land.shore(px, pz);
        }
      }
      const laid = (i: number, j: number, c: number): number => {
        const fi = Math.min(NI - 1, Math.floor(i / CI));
        const fj = Math.min(NJ - 1, Math.floor(j / CJ));
        const ti = i / CI - fi;
        const tj = j / CJ - fj;
        const at = (a: number, b: number): number => bed[(a * (NJ + 1) + b) * 2 + c] as number;
        return (at(fi, fj) * (1 - tj) + at(fi, fj + 1) * tj) * (1 - ti) + (at(fi + 1, fj) * (1 - tj) + at(fi + 1, fj + 1) * tj) * ti;
      };
      for (let i = 0; i <= RINGS; i++) {
        const u = i / RINGS;
        for (let j = 0; j <= SIDES; j++) {
          const a = (j / SIDES) * Math.PI * 2;
          const [px, pz] = place(u, a);
          const land = laid(i, j, 0);
          const over = level - land;
          // It does not run out over the brine: its rim stands on the bank before the shore.
          const e = Math.min(1 - u, Math.max(0, (laid(i, j, 1) - 0.05) / 0.8));
          // Level inside the rim; the rim is mud pushed up a little over the sheet, and falls from there to the bed it lies on.
          const w = Math.min(1, e / 0.3);
          const fall = w * w * (3 - 2 * w);
          const rim = 0.035 * Math.exp(-(((e - 0.27) / 0.07) ** 2)) * (0.6 + 0.4 * Math.sin(a * 5 + (wobble[0] as [number, number])[1]));
          const py = Math.max(land + 0.02 + (level - land - 0.02) * fall + rim, land + 0.025);
          position.push(px, py, pz);
          // (Each spoke is measured along the surface, and the mud is laid by that measure.)
          const plan = Math.hypot(px - x, pz - z);
          const was = spoke[j] as [number, number, number];
          const run = was[0] + Math.hypot(plan - was[1], py - was[2]);
          spoke[j] = [run, plan, py];
          const stretch = plan > 1e-6 ? run / plan : 1;
          lay.push(x + (px - x) * stretch, z + (pz - z) * stretch);
          edge.push(e);
          depth.push(Math.max(-0.2, Math.min(0.4, over)));
        }
      }
      for (let i = 0; i < RINGS; i++) {
        for (let j = 0; j < SIDES; j++) {
          const a = i * (SIDES + 1) + j;
          index.push(a, a + SIDES + 1, a + 1, a + 1, a + SIDES + 1, a + SIDES + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
      geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
      geometry.setAttribute('aLay', new THREE.Float32BufferAttribute(lay, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      // Nothing of it is drawn where no lens sees it: the clods stand at most a hand over the sheet, and the sphere is that much wider.
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.3;
      mesh.renderOrder = 2;
      return mesh;
    };
    // Fine enough for a clod a hand across to stand in the mesh.
    this.mesh = sheet(150, 400, 3, 4);
    this.far = sheet(30, 80, 1, 1);
    this.far.visible = false;
  }

  /** Which of the two is drawn for a lens at `eye`. The clods sink into the sheet before the meshes change, so nothing jumps where they do. */
  seenFrom(eye: THREE.Vector3): void {
    const away = eye.distanceTo(this.centre);
    const t = Math.min(1, Math.max(0, (away - 16) / 8));
    this.uRelief.value = 1 - t * t * (3 - 2 * t);
    this.mesh.visible = away < 24;
    this.far.visible = !this.mesh.visible;
  }

  /** Leg `i` stands at (x, z), `half` metres thick, and works the mud `work` hard (0 to 1). */
  leg(i: number, x: number, z: number, work: number, half: number): void {
    (this.legs[i] as THREE.Vector4).set(x, z, Math.min(1, Math.max(0, work)), half);
  }

  /** Muzzle `i` works the sheet at (x, z). */
  snout(i: number, x: number, z: number, work: number, half: number): void {
    (this.snouts[i] as THREE.Vector4).set(x, z, Math.min(1, Math.max(0, work)), half);
  }

  set(seconds: number, shown: number): void {
    this.uSeconds.value = seconds;
    this.uShown.value = shown;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.far.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
