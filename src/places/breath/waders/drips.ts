// The drops that fall from a tuft lifted out of the water: many at first, then few. Each is a short bright streak, where the time alone puts it.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
attribute vec4 aDrop;
uniform float uPixel;
varying vec2 vAt;
varying vec3 vWorld;
void main() {
  vec3 c = aDrop.xyz;
  vec3 toEye = cameraPosition - c;
  float far = length(toEye);
  vec3 across = normalize(cross(vec3(0.0, 1.0, 0.0), toEye));
  // A drop is a few millimetres: it is drawn no narrower than a pixel and dimmed by as much as it was widened.
  float wide = max(0.0035, 0.75 * uPixel * far);
  vec3 p = c + across * position.x * wide + vec3(0.0, position.y * max(aDrop.w, wide), 0.0);
  vAt = vec2(position.x, position.y);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
uniform float uPixel;
${RIG_GLSL}
void main() {
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float bead = max(0.0, 1.0 - dot(vAt, vAt));
  float thin = min(1.0, 0.0035 / (0.75 * uPixel * far));
  // Water against the light: it gathers the low sun and the bright fog behind it.
  float against = max(dot(-v, uSunDir), 0.0);
  vec3 lit = uSunColour * (0.5 + 5.0 * pow(against, 6.0)) * sunAt(vWorld) + 0.8 * skyRadiance(vec3(-v.x, 0.3, -v.z));
  float alpha = bead * thin * 0.85 * (1.0 - uSolo);
  gl_FragColor = vec4(lit * alpha, alpha);
}`;

export interface Drips {
  mesh: THREE.Mesh;
  begin(): void;
  add(x: number, y: number, z: number, length: number): void;
  end(): void;
  dispose(): void;
}

export function makeDrips(max: number, uniforms: Record<string, THREE.IUniform>): Drips {
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(2, 2);
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setIndex(plane.getIndex());
  const drop = new Float32Array(max * 4);
  const aDrop = new THREE.InstancedBufferAttribute(drop, 4);
  aDrop.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aDrop', aDrop);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  let count = 0;
  return {
    mesh,
    begin: () => {
      count = 0;
    },
    add: (x, y, z, length) => {
      if (count >= max) return;
      drop.set([x, y, z, length], count * 4);
      count++;
    },
    end: () => {
      geometry.instanceCount = count;
      aDrop.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      plane.dispose();
      material.dispose();
    },
  };
}
