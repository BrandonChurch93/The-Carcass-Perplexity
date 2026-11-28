// The channel of a stroke as it is drawn: every span of the strike's figure (bolt.ts) is a capsule turned to the lens. Two layers read
// the same spans. The core is drawn with the brighter of what is there and itself, so that where two spans meet or cross there is one
// channel and no joint. The glow is the light of each span summed along its length, which adds up over a crooked path without a seam.
// Nothing is a picture: a lens close to the channel sees the same thing finer.
import * as THREE from 'three';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';
import type { Line } from './bolt';

/** Radius of the main channel's white heart, metres, and the least it is drawn at, in pixels of a 4K frame. */
export const HEART_RADIUS = 0.2;
const HEART_PIXELS = 1.25;
/** The radius the glow is laid out from, metres, and its least in pixels of a 4K frame: it is the air's, not the heart's. */
const AIR_RADIUS = 0.8;
const AIR_PIXELS = 2.1;
/** How far the violet sheath about the heart reaches, in radii of the heart, and the glow about that, in the same. */
const SHEATH_REACH = 4.5;
const GLOW_WIDE = 7;
const GLOW_REACH = 6;

const VERTEX = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
// x, y: the radius of the heart at each end, as shares of the main channel's; z, w: how bright each end is, as shares of it.
attribute vec4 aShape;
// x, y: how far down the leader's way each end is (0 in the cloud, 1 at the tip); z: 1 on a branch, 0 on the main channel.
attribute vec3 aWay;
uniform float uLens;
uniform vec4 uEnv;
uniform vec3 uReach;
uniform vec2 uSize;
varying vec2 vAt;
varying vec4 vSpan;
varying vec4 vEnds;
varying vec3 vMore;
void main() {
  vec3 a = (viewMatrix * vec4(aFrom, 1.0)).xyz;
  vec3 b = (viewMatrix * vec4(aTo, 1.0)).xyz;
  float lit = mix(uEnv.x, uEnv.y, aWay.z);
  if (lit <= 0.0005 || a.z > -2.0 || b.z > -2.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // Everything is laid out on the plane one metre before the lens, where a straight line stays straight and a pixel is uLens wide.
  vec2 qa = a.xy / -a.z;
  vec2 qb = b.xy / -b.z;
  // A weak stroke is a thinner channel. No span is thinner than the lens can hold: under about a pixel it would crawl.
  float thin = 0.55 + 0.45 * min(lit, 1.0);
  float ra = max(uSize.x * aShape.x / -a.z, uSize.y * uLens * sqrt(aShape.x)) * thin * uReach.y;
  float rb = max(uSize.x * aShape.y / -b.z, uSize.y * uLens * sqrt(aShape.y)) * thin * uReach.y;
  vec2 along = qb - qa;
  float span = length(along);
  vec2 dir = span > 1e-9 ? along / span : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  float end = position.x < 0.0 ? 0.0 : 1.0;
  float r = mix(ra, rb, end) * uReach.x;
  vec2 q = mix(qa, qb, end) + dir * (position.x * r) + side * (position.y * r);
  // The whole span stands at one depth, so that what the corners carry is laid straight across the frame.
  float deep = 0.5 * (a.z + b.z);
  vAt = q;
  vSpan = vec4(qa, qb);
  vEnds = vec4(ra, rb, aShape.z * lit, aShape.w * lit);
  vMore = vec3(aWay.xy, aWay.z);
  gl_Position = projectionMatrix * vec4(q * -deep, deep, 1.0);
}`;

const HEAD = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec3 uHeart;
uniform vec3 uSheath;
uniform vec4 uGain;
varying vec2 vAt;
varying vec4 vSpan;
varying vec4 vEnds;
varying vec3 vMore;
`;

// The core: white where the channel burns, over white so that the lens blooms about it; violet air close about it.
const CORE_FRAGMENT = /* glsl */ `
${HEAD}
void main() {
  vec2 pa = vAt - vSpan.xy;
  vec2 ba = vSpan.zw - vSpan.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-14), 0.0, 1.0);
  float d = length(pa - ba * h);
  float r = mix(vEnds.x, vEnds.y, h);
  float gain = mix(vEnds.z, vEnds.w, h);
  // Where the channel is still inside the cloud its heart is hidden and only the cloud's light is seen.
  float way = mix(vMore.x, vMore.y, h);
  float out_ = smoothstep(0.0, uGain.w, way);
  float x = d / max(r, 1e-9);
  float heart = 1.0 - smoothstep(0.3, 1.15, x);
  // The air close about the heart burns nearly as bright and falls away fast: no ruled edge between the white and the violet.
  // A weak current does not burn white: it is a violet thread.
  float hot = smoothstep(0.25, 0.8, gain);
  float air = (exp(-0.4 * x * x) + 5.0 * hot * exp(-1.6 * x * x)) * (1.0 - smoothstep(0.6 * ${SHEATH_REACH.toFixed(1)}, ${SHEATH_REACH.toFixed(1)}, x));
  vec3 c = uHeart * (uGain.x * heart * hot * hot * out_) + uSheath * (uGain.y * air * gain * (0.25 + 0.75 * out_));
  if (max(c.r, max(c.g, c.b)) < 0.003) discard;
  gl_FragColor = vec4(c * (1.0 - uSolo), 0.0);
}`;

// The glow: the air about the channel lit by it. Each span gives what a line of light of its length gives a point beside it.
const GLOW_FRAGMENT = /* glsl */ `
${HEAD}
void main() {
  vec2 pa = vAt - vSpan.xy;
  vec2 ba = vSpan.zw - vSpan.xy;
  float span = max(length(ba), 1e-9);
  vec2 dir = ba / span;
  float s = dot(pa, dir);
  float off = abs(dot(pa, vec2(-dir.y, dir.x)));
  float h = clamp(s / span, 0.0, 1.0);
  float r = mix(vEnds.x, vEnds.y, h);
  float gain = mix(vEnds.z, vEnds.w, h);
  float wide = r * ${GLOW_WIDE.toFixed(1)};
  float D = sqrt(off * off + wide * wide);
  float line = (atan((span - s) / D) + atan(s / D)) * wide / (3.14159 * D);
  // It ends inside the span's own card, smoothly: the next span's card takes it on.
  float d = length(pa - ba * h) / (wide * ${GLOW_REACH.toFixed(1)});
  float edge = max(1.0 - d * d, 0.0);
  float way = mix(vMore.x, vMore.y, h);
  // Inside the cloud the light spreads into it: the glow is wider and fuller there (the cloud about the root is drawn apart).
  vec3 c = uSheath * (uGain.z * line * edge * edge * gain * (1.0 + 1.5 * (1.0 - smoothstep(0.0, 2.0 * uGain.w, way))));
  gl_FragColor = vec4(c * (1.0 - uSolo), 0.0);
}`;

export interface Channel {
  group: THREE.Group;
  /** x: the main channel's light, y: the branches', both 0 to about 1. */
  env: THREE.Vector4;
}

/** The spans of a figure as the two layers read them. `lens` is what one pixel of a 4K frame is wide at one metre. */
export function createChannel(lines: Line[], rigUniforms: Record<string, THREE.IUniform>, lens: { value: number }, heart: THREE.Vector3, core: number, coarse = 1): Channel {
  const quad = new THREE.PlaneGeometry(2, 2);
  // The spans of every line, taking each `every`-th point of it. The heart reads them all; the glow, which is metres wide and is paid
  // for by the pixel, reads a line that keeps only the kinks it could show.
  const spans = (every: number): THREE.InstancedBufferGeometry => {
    const from: number[] = [];
    const to: number[] = [];
    const shape: number[] = [];
    const way: number[] = [];
    lines.forEach((l, which) => {
      const n = l.points.length - 1;
      const stride = Math.max(1, Math.min(every, n >> 2));
      // The channel is not one breadth all the way: it swells and thins by a third over tens of spans, each line by its own measure.
      const bead = (k: number): number => 1 + 0.2 * Math.sin(k * 0.37 + which * 2.1) + 0.14 * Math.sin(k * 1.31 + which * 0.7);
      for (let k = 0; k < n; k += stride) {
        const k2 = Math.min(n, k + stride);
        from.push(...(l.points[k] as [number, number, number]));
        to.push(...(l.points[k2] as [number, number, number]));
        const ka = k / n;
        const kb = k2 / n;
        // A branch thins to a hair and dims toward its end; the main channel keeps its breadth and is a little broader where it lands.
        const taper = (t: number): number => (l.branch ? 1 - 0.75 * t : 1 + 0.5 * Math.max(0, (t - 0.96) / 0.04));
        const dim = (t: number): number => (l.branch ? 1 - 0.8 * t * t : 1);
        shape.push(l.width * taper(ka) * bead(k), l.width * taper(kb) * bead(k2), l.gain * dim(ka), l.gain * dim(kb));
        way.push(l.from + (l.to - l.from) * ka, l.from + (l.to - l.from) * kb, l.branch);
      }
    });
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('aFrom', new THREE.InstancedBufferAttribute(new Float32Array(from), 3));
    g.setAttribute('aTo', new THREE.InstancedBufferAttribute(new Float32Array(to), 3));
    g.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(shape), 4));
    g.setAttribute('aWay', new THREE.InstancedBufferAttribute(new Float32Array(way), 3));
    g.instanceCount = from.length / 3;
    return g;
  };
  const geometry = spans(1);
  const wide = coarse > 1 ? spans(coarse) : geometry;

  const env = new THREE.Vector4(0, 0, 0, 0);
  const sheath = new THREE.Vector3(0.56, 0.3, 1.0);
  // uGain: the heart's radiance, the sheath's, the glow's, and the share of the way down over which the channel comes out of the cloud.
  const gain = new THREE.Vector4(core, 9, 1.3, 0.1);
  const shared = { ...rigUniforms, uLens: lens, uEnv: { value: env }, uHeart: { value: heart }, uSheath: { value: sheath }, uGain: { value: gain } };
  const group = new THREE.Group();
  const glow = new THREE.Mesh(
    wide,
    new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: { ...shared, uReach: { value: new THREE.Vector3(GLOW_WIDE * GLOW_REACH, 1, 0) }, uSize: { value: new THREE.Vector2(AIR_RADIUS, AIR_PIXELS) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      side: THREE.DoubleSide,
    }),
  );
  glow.renderOrder = 12;
  glow.frustumCulled = false;
  const coreMesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: CORE_FRAGMENT,
      uniforms: { ...shared, uReach: { value: new THREE.Vector3(SHEATH_REACH, 1, 0) }, uSize: { value: new THREE.Vector2(HEART_RADIUS, HEART_PIXELS) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      side: THREE.DoubleSide,
    }),
  );
  coreMesh.renderOrder = 13;
  coreMesh.frustumCulled = false;
  group.add(glow, coreMesh);
  return { group, env };
}
