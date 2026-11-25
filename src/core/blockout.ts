import * as THREE from 'three';
import type { Parts } from './place';

type Colour = number | string;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
varying float vDist;
void main() {
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vec4 v = viewMatrix * w;
  vDist = length(v.xyz);
  gl_Position = projectionMatrix * v;
}`;

const AIR_GLSL = /* glsl */ `
uniform vec3 uFogColour;
uniform float uFogDensity;
uniform float uSolo;
varying vec3 vWorld;
varying float vDist;
vec3 air(vec3 c) {
  c = mix(c, vec3(0.0), uSolo);
  return mix(c, uFogColour, 1.0 - exp(-vDist * uFogDensity));
}`;

const FLAT_FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform vec3 uBand;
uniform float uBandStep;
uniform float uBandAmount;
${AIR_GLSL}
void main() {
  vec3 c = uColour;
  if (uBandStep > 0.0) c = mix(c, uBand, step(0.5, fract(vWorld.y / uBandStep)) * uBandAmount);
  gl_FragColor = vec4(air(c), 1.0);
}`;

const FLOW_FRAGMENT = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform vec2 uDir;
uniform float uSpeed;
uniform float uScale;
uniform float uTime;
${AIR_GLSL}
float cells(vec2 p) {
  return sin(p.x + 1.7 * sin(p.y * 0.9 + 0.6 * sin(p.x * 0.7))) + sin(p.y * 1.3 + 1.1 * sin(p.x * 1.1));
}
void main() {
  vec2 p = vWorld.xz / uScale;
  vec2 d = uDir * uSpeed * uTime / uScale;
  float v = cells(p - d) + 0.6 * cells(p * 2.3 - d * 1.6 + vec2(3.1, 1.7));
  gl_FragColor = vec4(air(mix(uA, uB, step(0.0, v))), 1.0);
}`;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBelow;
uniform float uSolo;
varying vec3 vDir;
void main() {
  float y = normalize(vDir).y;
  vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(y, 0.5)) : mix(uHorizon, uBelow, pow(-y, 0.4));
  gl_FragColor = vec4(mix(c, vec3(0.0), uSolo), 1.0);
}`;

const FLAG_FRAGMENT = /* glsl */ `
uniform vec3 uFlag;
void main() {
  gl_FragColor = vec4(uFlag, 1.0);
}`;

export type FlagMaker = (colour: THREE.Color) => THREE.Material;

function flagTwin(vertexShader: string, source: THREE.Material): FlagMaker {
  const made = new Map<string, THREE.Material>();
  return (colour) => {
    const key = colour.getHexString();
    let twin = made.get(key);
    if (!twin) {
      twin = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: FLAG_FRAGMENT,
        uniforms: { uFlag: { value: colour.clone() } },
        side: source.side,
        depthTest: source.depthTest,
        depthWrite: source.depthWrite,
        toneMapped: false,
      });
      made.set(key, twin);
    }
    return twin;
  };
}

export interface FlatOptions {
  band?: Colour;
  step?: number;
  amount?: number;
  side?: THREE.Side;
}

export interface FlowOptions {
  direction?: [number, number];
  speed?: number;
  scale?: number;
  side?: THREE.Side;
}

export interface Blockout {
  readonly time: THREE.IUniform<number>;
  flat(colour: Colour, options?: FlatOptions): THREE.ShaderMaterial;
  flow(a: Colour, b: Colour, options?: FlowOptions): THREE.ShaderMaterial;
  sky(top: Colour, horizon: Colour, below?: Colour): THREE.Mesh;
  air(colour: Colour, density: number): void;
  setAir(colour: Colour, density: number): void;
  setTime(seconds: number): void;
  solo(part: string | null): void;
}

export function createBlockout(parts: Parts): Blockout {
  const time: THREE.IUniform<number> = { value: 0 };
  const fogColour = { value: new THREE.Color(0, 0, 0) };
  const fogDensity = { value: 0 };
  const solo = { value: 0 };
  const shared = { uFogColour: fogColour, uFogDensity: fogDensity, uSolo: solo };

  const setAir = (colour: Colour, density: number): void => {
    fogColour.value.set(colour);
    fogDensity.value = density;
  };

  return {
    time,
    flat: (colour, options = {}) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FLAT_FRAGMENT,
        uniforms: {
          ...shared,
          uColour: { value: new THREE.Color(colour) },
          uBand: { value: new THREE.Color(options.band ?? colour) },
          uBandStep: { value: options.band === undefined ? 0 : (options.step ?? 20) },
          uBandAmount: { value: options.amount ?? 1 },
        },
        side: options.side ?? THREE.FrontSide,
        toneMapped: false,
      });
      m.userData.flag = flagTwin(VERTEX, m);
      return m;
    },
    flow: (a, b, options = {}) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FLOW_FRAGMENT,
        uniforms: {
          ...shared,
          uA: { value: new THREE.Color(a) },
          uB: { value: new THREE.Color(b) },
          uDir: { value: new THREE.Vector2(...(options.direction ?? [1, 0])) },
          uSpeed: { value: options.speed ?? 2 },
          uScale: { value: options.scale ?? 30 },
          uTime: time,
        },
        side: options.side ?? THREE.FrontSide,
        toneMapped: false,
      });
      m.userData.flag = flagTwin(VERTEX, m);
      return m;
    },
    sky: (top, horizon, below) => {
      const m = new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBelow: { value: new THREE.Color(below ?? horizon) },
          uSolo: solo,
        },
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      m.userData.flag = flagTwin(SKY_VERTEX, m);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), m);
      dome.frustumCulled = false;
      dome.renderOrder = -10;
      return dome;
    },
    air: (colour, density) => {
      parts.effect('air', 'stand-in');
      setAir(colour, density);
    },
    setAir,
    setTime: (seconds) => {
      time.value = seconds;
    },
    solo: (part) => {
      solo.value = part !== null && parts.byId(part)?.kind === 'effect' ? 1 : 0;
    },
  };
}

export function terrain(width: number, depth: number, columns: number, rows: number, height: (x: number, z: number) => number, centre: [number, number] = [0, 0]): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, depth, columns, rows);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + centre[0];
    const z = p.getZ(i) + centre[1];
    p.setXYZ(i, x, height(x, z), z);
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

const dummy = new THREE.Object3D();

export function herd(geometry: THREE.BufferGeometry, material: THREE.Material, count: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  return mesh;
}

export function setFigure(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, yaw = 0, size: number | [number, number, number] = 1): void {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, yaw, 0);
  if (typeof size === 'number') dummy.scale.setScalar(size);
  else dummy.scale.set(...size);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
}
