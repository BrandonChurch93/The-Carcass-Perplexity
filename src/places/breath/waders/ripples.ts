// What the waders do to the water: rings that leave each leg and each tuft that is in it, and the small rings of the drops that fall from a lifted tuft.
// They are drawn before each sample into a picture of the water's slope as the camera sees it, which the water folder reads and adds to its own waves.
import * as THREE from 'three';

export const RIPPLES: { texture: THREE.IUniform<THREE.Texture | null> } = { texture: { value: null } };

/** Sources that can be in the water at once and are told to the water by place: sixty-four legs and sixteen mops, and room. */
export const CONTACT_MAX = 96;
/** Where a leg or a mop stands in the water, for the water folder, two ways.
 *  1. The alpha of the ripple picture (`RIPPLES.texture`, read at the pixel as the rings are): 1 inside the leg or the mop where it crosses
 *     the water's level, falling to 0 over three more of its radii (at least 5 cm). It is added up where two meet: clamp it.
 *  2. `points`: one vec4 a source (x, z, the radius of the thing at the water line in metres, how much it is in the water, 0 to 1), `count` of
 *     them, the rest zero. A leg's radius is about 3 cm; a mop's is that of the bunch, 15 to 30 cm.
 *  A foot carried clear of the water has no contact; one that has just come down has it at once. */
export const CONTACT: { points: THREE.IUniform<Float32Array>; count: THREE.IUniform<number> } = { points: { value: new Float32Array(CONTACT_MAX * 4) }, count: { value: 0 } };
/** For a water shader: `uniform vec4 uContact[CONTACT_MAX]; uniform int uContactCount;` set from `CONTACT.points` and `CONTACT.count`. */
export const CONTACT_GLSL = /* glsl */ `
// How much a wader's leg or mop touches the water here, 0 to 1, from the alpha of the ripple picture.
float waderContact(vec4 rings) { return clamp(rings.a, 0.0, 1.0); }
`;

const VERTEX = /* glsl */ `
attribute vec4 aSource;
attribute vec4 aWhen;
attribute vec2 aTouch;
varying vec2 vTouch;
uniform float uSea;
varying vec2 vAt;
varying vec4 vSource;
varying vec4 vWhen;
void main() {
  vec3 p = vec3(aSource.x + position.x * aSource.z, uSea, aSource.y + position.z * aSource.z);
  vAt = p.xz;
  vSource = aSource;
  vWhen = aWhen;
  vTouch = aTouch;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform float uSeconds;
uniform float uSolo;
varying vec2 vAt;
varying vec4 vSource;
varying vec4 vWhen;
varying vec2 vTouch;
void main() {
  vec2 away = vAt - vSource.xy;
  float d = length(away);
  vec2 dir = away / max(d, 0.001);
  float reach = vSource.z;
  // Rings on shallow water: a hand's breadth apart, a third of a metre a second, the outer ones longer than the inner.
  float speed = vWhen.w;
  float k = vWhen.y;
  // A ring that is at d now left the source d / speed seconds ago: what the source was doing then is what it carries.
  float left = vWhen.x - d / speed;
  float burst = left > 0.0 ? exp(-left / 1.4) * smoothstep(0.0, 0.12, left) : 0.0;
  float amount = vSource.w * (0.5 + burst);
  float fade = smoothstep(reach, 0.3 * reach, d) * smoothstep(0.015, 0.07, d) / (1.0 + 2.5 * d);
  // No two sources ring alike: each has its own spacing, and its rings leave it in packets of two or three with still water between,
  // so the rings round one leg are of unlike age and strength. A ring is not whole either: it is strong on one side and gone on another.
  float own = fract(vWhen.z * 3.71);
  k *= 0.72 + 0.6 * own;
  float packet = 0.2 + 0.8 * smoothstep(0.25, 0.75, 0.5 + 0.5 * sin((d / speed - uSeconds) * (1.1 + 0.9 * own) + vWhen.z * 2.7));
  float round_ = atan(away.y, away.x);
  float broken = 0.5 + 0.5 * sin(round_ * 2.0 + vWhen.z * 5.0 + d * 3.0) * sin(round_ * 5.0 - vWhen.z * 3.0 - d * 7.0 + 0.6 * uSeconds);
  float slope = cos(k * d * (1.0 - 0.12 * d / reach) - k * speed * uSeconds + vWhen.z) * amount * fade * packet * (0.35 + 1.0 * broken);
  // The alpha is the contact: the thing itself where it crosses the water's level, and a soft margin round it.
  float touch = vTouch.y * smoothstep(vTouch.x + max(3.0 * vTouch.x, 0.05), vTouch.x, d);
  gl_FragColor = vec4(dir * slope, abs(slope), touch) * (1.0 - uSolo);
}`;

export interface Ripples {
  /** The picture's scene: drawn by the waders folder with the frame's camera. */
  scene: THREE.Scene;
  material: THREE.ShaderMaterial;
  begin(): void;
  /** A source: where, how far its rings reach in metres, how strong (0 to 1), seconds since it last struck the water, its phase, and the rings' wave number and speed. */
  add(x: number, z: number, reach: number, strength: number, since: number, phase: number, k?: number, speed?: number, radius?: number, contact?: number): void;
  end(seconds: number): void;
  dispose(): void;
}

export function makeRipples(max: number, sea: number, solo: THREE.IUniform): Ripples {
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setIndex(plane.getIndex());
  const source = new Float32Array(max * 4);
  const when = new Float32Array(max * 4);
  const aSource = new THREE.InstancedBufferAttribute(source, 4);
  const aWhen = new THREE.InstancedBufferAttribute(when, 4);
  const touch = new Float32Array(max * 2);
  const aTouch = new THREE.InstancedBufferAttribute(touch, 2);
  aTouch.setUsage(THREE.DynamicDrawUsage);
  aSource.setUsage(THREE.DynamicDrawUsage);
  aWhen.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aSource', aSource);
  geometry.setAttribute('aWhen', aWhen);
  geometry.setAttribute('aTouch', aTouch);
  const seconds = { value: 0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uSeconds: seconds, uSea: { value: sea }, uSolo: solo },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  let count = 0;
  let touching = 0;
  return {
    scene,
    material,
    begin: () => {
      count = 0;
      touching = 0;
      CONTACT.points.value.fill(0);
    },
    add: (x, z, reach, strength, since, phase, k = 26, speed = 0.36, radius = 0, contact = 0) => {
      if (count >= max || strength <= 0) return;
      source.set([x, z, reach, strength], count * 4);
      when.set([since, k, phase, speed], count * 4);
      touch.set([radius, contact], count * 2);
      if (contact > 0 && touching < CONTACT_MAX) CONTACT.points.value.set([x, z, radius, contact], touching++ * 4);
      count++;
    },
    end: (t) => {
      seconds.value = t;
      geometry.instanceCount = count;
      aSource.needsUpdate = true;
      aWhen.needsUpdate = true;
      aTouch.needsUpdate = true;
      CONTACT.count.value = touching;
    },
    dispose: () => {
      geometry.dispose();
      plane.dispose();
      material.dispose();
    },
  };
}
