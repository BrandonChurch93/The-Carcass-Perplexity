// Ash in the near air: a few hundred flakes that fall and drift within 40 m of the lens, ahead of it, wherever it looks.
// Each flake is a pure function of time: it starts somewhere in a box, moves at its own speed, and the box wraps round a point ahead of the camera.
// The engine spreads its samples over the shutter, so a flake that moves is blurred by the frame like everything else.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { RIG_GLSL } from '../shared/glsl';

/** Flakes in the box. About half of them are above the ground at any time, all within 40 m of the lens. */
export const ASH_COUNT = 1400;
/** The box that wraps round the camera, metres. */
const BOX = [36, 24, 36] as const;

const VERTEX = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uAshView;
attribute vec4 aStart;
attribute vec4 aMove;
attribute vec4 aTurn;
varying vec2 vDisc;
varying vec3 vWorld;
varying float vFade;
varying float vWarm;
const vec3 BOX = vec3(${BOX[0].toFixed(1)}, ${BOX[1].toFixed(1)}, ${BOX[2].toFixed(1)});

void main() {
  // Where the flake is: its start, its fall and drift, and a slow weave from side to side.
  vec3 world = aStart.xyz * BOX + aMove.xyz * uTime
    + vec3(sin(uTime * 0.61 + aTurn.x), 0.25 * sin(uTime * 0.83 + aTurn.y), cos(uTime * 0.47 + aTurn.x * 1.7)) * aMove.w;
  // The box sits ahead of the lens, so that what there is of the ash is in the picture.
  vec3 middle = cameraPosition - 16.0 * vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]);
  vec3 rel = mod(world - middle + 0.5 * BOX, BOX) - 0.5 * BOX;
  vec3 centre = middle + rel;
  float dist = length(centre - cameraPosition);
  vec3 edge = abs(rel) / (0.5 * BOX);
  // It tumbles: a flat flake seen at a changing tilt, turning in the plane of the picture.
  float tilt = 0.2 + 0.8 * abs(cos(aTurn.y + uTime * aTurn.z));
  float turn = aTurn.x + uTime * aTurn.w;
  vec2 corner = position.xy * vec2(1.0, tilt);
  corner = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  vec4 view = viewMatrix * vec4(centre, 1.0);
  // Never thinner than a pixel and a half: a flake smaller than that is drawn that wide and fainter in proportion.
  float size = aStart.w;
  float pixel = 1.5 * (-view.z) * 2.0 / (projectionMatrix[1][1] * uAshView.y);
  float drawn = max(size, pixel);
  view.xy += corner * drawn;
  gl_Position = projectionMatrix * view;
  vDisc = position.xy * 2.0;
  vWorld = centre;
  vFade = (size / drawn) * (1.0 - smoothstep(0.75, 1.0, max(edge.x, max(edge.y, edge.z)))) * smoothstep(0.25, 0.9, dist);
  vWarm = aMove.w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform vec3 uAshSky;
varying vec2 vDisc;
varying vec3 vWorld;
varying float vFade;
varying float vWarm;

void main() {
  float r = dot(vDisc, vDisc);
  float alpha = (1.0 - smoothstep(0.55, 1.0, r)) * vFade;
  if (alpha < 0.004) discard;
  float y = max(vWorld.y, 0.0);
  // Pale grey ash, lit by the sky from above and by the lake from below; close over open lava it is hot enough to glow with it.
  vec3 light = uAshSky * uFill + 0.3 * lakeGlow(vWorld.xz, max(2.0 * y, 12.0)) * exp(-y / 60.0);
  vec3 colour = vec3(0.6, 0.58, 0.56) * light + 0.35 * lakeGlow(vWorld.xz, 5.0) * exp(-y / 3.5);
  gl_FragColor = vec4(colour, alpha);
}`;

export function createAsh(rng: Rng, rigUniforms: Record<string, THREE.IUniform>, sky: THREE.Vector3): { mesh: THREE.Mesh; resize(width: number, height: number): void; dispose(): void } {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const start = new Float32Array(ASH_COUNT * 4);
  const move = new Float32Array(ASH_COUNT * 4);
  const turn = new Float32Array(ASH_COUNT * 4);
  for (let i = 0; i < ASH_COUNT; i++) {
    start[i * 4] = rng.next();
    start[i * 4 + 1] = rng.next();
    start[i * 4 + 2] = rng.next();
    // 2 to 10 mm across, most of them small.
    start[i * 4 + 3] = 0.002 + 0.008 * rng.next() ** 2;
    // A low wind from the east of 1 to 2 m/s, a fall of 0.3 to 1 m/s.
    const wind = 1 + rng.next();
    const bearing = 2.9 + 0.5 * (rng.next() - 0.5);
    move[i * 4] = Math.cos(bearing) * wind;
    move[i * 4 + 1] = -(0.3 + 0.7 * rng.next());
    move[i * 4 + 2] = Math.sin(bearing) * wind;
    move[i * 4 + 3] = 0.15 + 0.35 * rng.next();
    turn[i * 4] = rng.next() * 6.283;
    turn[i * 4 + 1] = rng.next() * 6.283;
    turn[i * 4 + 2] = 0.6 + 1.8 * rng.next();
    turn[i * 4 + 3] = (rng.next() - 0.5) * 3;
  }
  geometry.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 4));
  geometry.setAttribute('aMove', new THREE.InstancedBufferAttribute(move, 4));
  geometry.setAttribute('aTurn', new THREE.InstancedBufferAttribute(turn, 4));
  geometry.instanceCount = ASH_COUNT;

  const uniforms: Record<string, THREE.IUniform> = {
    ...rigUniforms,
    uAshView: { value: new THREE.Vector2(1920, 1080) },
    uAshSky: { value: sky },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  mesh.name = 'ash';
  return {
    mesh,
    resize: (width, height) => {
      ((uniforms.uAshView as THREE.IUniform<THREE.Vector2>).value as THREE.Vector2).set(width, height);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
