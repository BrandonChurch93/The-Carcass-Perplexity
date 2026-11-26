// A kite-wing in the air as a picture: the animal seen from ahead with its sails spread, cut at the shoulders so each sail strokes about its
// own root. In the air it is only ever a shape against the sky or the white water, and the picture is that shape with the skin and the finger
// bones in it. The sheet lies across the animal's heading and turns no nearer edge-on to the lens than a quarter.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';
import type { Pose } from './animal';

// The picture, in its own pixels: the middle of the body, the two shoulders, how far a sail reaches, and pixels to one unit of the pose.
const PX = { w: 1243, h: 1266, midX: 625, midY: 390, left: 560, right: 690, shoulder: 320, reach: 400, free: 100, unit: 223 };

const VERTEX = /* glsl */ `
attribute float aPart;
attribute vec4 aPlace;
attribute vec4 aBody;
attribute vec3 aLook;
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vFace;
varying vec3 vLook;
void main() {
  vec2 px = position.xy;
  vec2 p = px;
  if (aPart > 0.5) {
    float sg = aPart < 1.5 ? -1.0 : 1.0;
    // Each sail turns about a point a little out from its shoulder, more toward the tip, and the tip trails the stroke.
    vec2 hinge = vec2((aPart < 1.5 ? ${PX.left.toFixed(1)} : ${PX.right.toFixed(1)}) + sg * ${PX.free.toFixed(1)}, ${PX.shoulder.toFixed(1)});
    vec2 r = px - hinge;
    float u = clamp(sg * r.x / ${PX.reach.toFixed(1)}, 0.0, 1.0);
    float ang = sg * ((aBody.y + 0.3) * (0.5 * smoothstep(0.0, 0.25, u) + 0.5 * u) + aBody.z * u * u);
    float c = cos(ang);
    float s = sin(ang);
    p = hinge + vec2(c * r.x + s * r.y, -s * r.x + c * r.y);
  }
  vec2 q = vec2(p.x - ${PX.midX.toFixed(1)}, ${PX.midY.toFixed(1)} - p.y) / ${PX.unit.toFixed(1)};
  float cr = cos(aBody.w);
  float sr = sin(aBody.w);
  q = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  vec3 hip = aPlace.xyz;
  vec2 across = vec2(cos(aPlace.w), -sin(aPlace.w));
  vec2 away = normalize(hip.xz - cameraPosition.xz);
  vec2 right = vec2(-away.y, away.x);
  float k = dot(across, right);
  float sgn = k < 0.0 ? -1.0 : 1.0;
  vec2 f = normalize(right * sgn * max(abs(k), 0.75) + away * dot(across, away));
  vec3 w = hip + aBody.x * vec3(f.x * q.x, q.y, f.y * q.x);
  vWorld = w;
  vPx = px;
  vPart = aPart;
  vFace = vec3(-f.y, 0.0, f.x) * sgn;
  vLook = aLook;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tFront;
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vFace;
varying vec3 vLook;
const float PI = 3.14159265;
void main() {
  vec3 pic = texture2D(tFront, vec2(vPx.x / ${PX.w.toFixed(1)}, 1.0 - vPx.y / ${PX.h.toFixed(1)}), -1.0).rgb;
  float cover = max(pic.r, max(pic.g, pic.b));
  // Each part keeps to its own side of the cuts, and the legs trail behind where the lens does not see them.
  float mine = 1.0;
  if (vPart > 2.5) mine = vLook.z;
  else if (vPart < 0.5) mine = vPx.y < 505.0 ? 1.0 : 0.0;
  else if (vPart < 1.5) mine = vPx.x > 465.0 && vPx.y > 445.0 ? 0.0 : 1.0;
  else mine = vPx.x < 775.0 && vPx.y > 445.0 ? 0.0 : 1.0;
  cover *= mine;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 face = dot(vFace, v) < 0.0 ? -vFace : vFace;
  // The round of it, from the picture's own light and dark read soft; leather, grey brown, darker underneath.
  vec2 e = vec2(8.0 / ${PX.w.toFixed(1)}, 8.0 / ${PX.h.toFixed(1)});
  vec2 uv = vec2(vPx.x / ${PX.w.toFixed(1)}, 1.0 - vPx.y / ${PX.h.toFixed(1)});
  float gx = texture2D(tFront, uv + vec2(e.x, 0.0), 2.5).g - texture2D(tFront, uv - vec2(e.x, 0.0), 2.5).g;
  float gy = texture2D(tFront, uv + vec2(0.0, e.y), 2.5).g - texture2D(tFront, uv - vec2(0.0, e.y), 2.5).g;
  vec3 across = vec3(vFace.z, 0.0, -vFace.x);
  vec3 n = normalize(face + vec3(0.0, 0.35, 0.0) + (across * -gx + vec3(0.0, 1.0, 0.0) * -gy) * 2.5);
  vec3 albedo = mix(pic, vec3(dot(pic, vec3(0.3333))) * vec3(1.0, 0.9, 0.8), 0.6) * mix(0.8, 1.05, vLook.y);
  // The colony's are pale: cream hide, the picture's own light and dark kept as its folds.
  albedo = mix(albedo, vec3(0.68, 0.61, 0.5) * (0.6 + 1.0 * dot(pic, vec3(0.3333))), clamp(-vLook.x, 0.0, 1.0));
  vec3 col = rigShade(vWorld, n, v, albedo, 0.5, mix(0.55, 1.0, smoothstep(-0.5, 0.5, n.y)));
  // The sky comes through the stretched skin of a sail; the bones and the body stay dark against it.
  float skin = step(0.5, vPart) * step(vPart, 2.5) * smoothstep(0.08, 0.3, cover);
  col += mix(albedo, vec3(dot(albedo, vec3(0.3333))), 0.6) * vec3(1.0, 0.94, 0.86) * skin * (uSunColour * max(dot(-n, uSunDir), 0.0) * sunAt(vWorld, landAt(vWorld.xz)) * 0.6 + skyIrradiance(-n) * 0.8) / PI;
  col *= mix(1.0, 0.3, clamp(vLook.x, 0.0, 1.0));
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (cover < 0.03) discard;
}`;

function cardGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const parts: number[] = [];
  const index: number[] = [];
  const grid = (part: number, x0: number, y0: number, x1: number, y1: number, nx: number): void => {
    const base = positions.length / 3;
    for (let j = 0; j <= 1; j++) {
      for (let i = 0; i <= nx; i++) {
        positions.push(x0 + ((x1 - x0) * i) / nx, j === 0 ? y0 : y1, 0);
        parts.push(part);
      }
    }
    for (let i = 0; i < nx; i++) {
      const k = base + i;
      index.push(k, k + 1, k + nx + 1, k + 1, k + nx + 2, k + nx + 1);
    }
  };
  grid(0, PX.left, 40, PX.right, 520, 1);
  grid(1, PX.left, 40, 50, 700, 6);
  grid(2, PX.right, 40, 1190, 700, 6);
  grid(3, 430, 445, 820, 1262, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  g.setIndex(index);
  return g;
}

export function kiteMaterial(ctx: Context): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tFront: { value: ctx.assets.texture('mat/kitewing-front.jpg', { kind: 'colour', repeat: false }) } },
    side: THREE.DoubleSide,
  });
}

/** Many animals in the air, each placed by the flying pose of the built animal. */
export class Kites {
  readonly mesh: THREE.Mesh;
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly body: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;

  constructor(material: THREE.ShaderMaterial, readonly count: number) {
    const shape = cardGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', shape.getAttribute('position'));
    geometry.setAttribute('aPart', shape.getAttribute('aPart'));
    geometry.setIndex(shape.getIndex());
    geometry.instanceCount = count;
    const attribute = (name: string, size: number): THREE.InstancedBufferAttribute => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(count * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.place = attribute('aPlace', 4);
    this.body = attribute('aBody', 4);
    this.look = attribute('aLook', 3);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  /** dark: 0 lit as it flies, 1 a shape against bright water, under 0 the cream of the colony. legs: it stands, and the picture keeps its legs. */
  put(i: number, p: Pose, dark = 0, legs = false): void {
    this.place.setXYZW(i, p.x, p.y, p.z, p.yaw);
    this.body.setXYZW(i, p.size, p.flap, p.lag, p.roll);
    this.look.setXYZ(i, dark, p.seed, legs ? 1 : 0);
  }

  hide(i: number): void {
    this.place.setXYZW(i, 0, -500, 0, 0);
    this.body.setXYZW(i, 0, 0, 0, 0);
  }

  commit(): void {
    this.place.needsUpdate = true;
    this.body.needsUpdate = true;
    this.look.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
