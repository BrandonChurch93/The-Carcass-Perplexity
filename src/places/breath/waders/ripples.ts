// What the waders do to the water: rings that leave each leg and each tuft that is in it, and the small rings of the drops that fall from a lifted tuft.
// They are drawn before each sample into a picture of the water's slope as the camera sees it, which the water folder reads and adds to its own waves.
import * as THREE from 'three';

export const RIPPLES: { texture: THREE.IUniform<THREE.Texture | null> } = { texture: { value: null } };

const VERTEX = /* glsl */ `
attribute vec4 aSource;
attribute vec4 aWhen;
uniform float uSea;
varying vec2 vAt;
varying vec4 vSource;
varying vec4 vWhen;
void main() {
  vec3 p = vec3(aSource.x + position.x * aSource.z, uSea, aSource.y + position.z * aSource.z);
  vAt = p.xz;
  vSource = aSource;
  vWhen = aWhen;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform float uSeconds;
uniform float uSolo;
varying vec2 vAt;
varying vec4 vSource;
varying vec4 vWhen;
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
  float slope = cos(k * d * (1.0 - 0.12 * d / reach) - k * speed * uSeconds + vWhen.z) * amount * fade;
  gl_FragColor = vec4(dir * slope, abs(slope), 1.0) * (1.0 - uSolo);
}`;

export interface Ripples {
  /** The picture's scene: drawn by the waders folder with the frame's camera. */
  scene: THREE.Scene;
  material: THREE.ShaderMaterial;
  begin(): void;
  /** A source: where, how far its rings reach in metres, how strong (0 to 1), seconds since it last struck the water, its phase, and the rings' wave number and speed. */
  add(x: number, z: number, reach: number, strength: number, since: number, phase: number, k?: number, speed?: number): void;
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
  aSource.setUsage(THREE.DynamicDrawUsage);
  aWhen.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aSource', aSource);
  geometry.setAttribute('aWhen', aWhen);
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
  return {
    scene,
    material,
    begin: () => {
      count = 0;
    },
    add: (x, z, reach, strength, since, phase, k = 26, speed = 0.36) => {
      if (count >= max || strength <= 0) return;
      source.set([x, z, reach, strength], count * 4);
      when.set([since, k, phase, speed], count * 4);
      count++;
    },
    end: (t) => {
      seconds.value = t;
      geometry.instanceCount = count;
      aSource.needsUpdate = true;
      aWhen.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      plane.dispose();
      material.dispose();
    },
  };
}
