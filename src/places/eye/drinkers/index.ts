// The drinkers: the herd that comes to the lake in the evening. Pale, long-necked, eyeless. Most stand at the water and drink, a few walk down
// to it, a few lie on the gravel. Each is one instance of one body; the vertex shader bends the neck and the legs.
import * as THREE from 'three';
import { DEG, shoreOf } from '../layout';
import { landHeight } from '../land/height';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SCALE, herd } from './herd';
import { BODY, drinkerGeometry } from './shape';

export const PARTS: readonly string[] = ['drinkers'];

const STRIDE = 0.78;
const STANCE = 0.72;

const VERTEX = /* glsl */ `
attribute vec4 aBone;
// x: the neck, radians from straight up. y: 0 stands, 1 lies. z: where it is in its walk, in cycles. w: 0 stands still, 1 walks.
attribute vec4 aPose;
// x: its own number. y: its breath.
attribute vec4 aLife;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying float vPart;
varying float vSeed;

void turn(inout vec3 p, inout vec3 n, vec3 pivot, float a) {
  float c = cos(a);
  float s = sin(a);
  vec3 d = p - pivot;
  p = pivot + vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
  n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
}

void lean(inout vec3 p, inout vec3 n, vec3 pivot, float a) {
  float c = cos(a);
  float s = sin(a);
  vec3 d = p - pivot;
  p = pivot + vec3(d.x * c - d.y * s, d.x * s + d.y * c, d.z);
  n = vec3(n.x * c - n.y * s, n.x * s + n.y * c, n.z);
}

void main() {
  vec3 p = position;
  vec3 n = normal;
  float part = aBone.x;
  float lie = aPose.y;
  if (part < 0.5) {
    // The chest fills and empties.
    float chest = smoothstep(0.35, 0.75, aBone.y) * (1.0 - smoothstep(0.85, 1.0, aBone.y));
    p.x *= 1.0 + 0.05 * chest * aLife.y;
    p.y += 0.02 * chest * aLife.y * step(1.4, p.y);
  } else if (part < 2.5) {
    vec3 pivot = vec3(${BODY.neckPivot.map((v) => v.toFixed(3)).join(', ')});
    if (part > 1.5) {
      // The head hangs from the end of the neck: level when the neck is up, turned down to the water when it is down.
      turn(p, n, pivot + vec3(0.0, ${BODY.neckLength.toFixed(3)}, 0.0), -0.3 - 0.9 * smoothstep(0.5, 2.4, aPose.x));
    }
    float along = clamp((p.y - pivot.y) / ${BODY.neckLength.toFixed(3)}, 0.0, 1.0);
    // It looks about, or moves its mouth along the water: the neck bends to one side, most at the head.
    lean(p, n, pivot, aLife.z * mix(along, 1.0, step(1.5, part)));
    turn(p, n, pivot, aPose.x * mix(smoothstep(-0.12, 0.34, along), 1.0, step(1.5, part)));
  } else if (part < 3.5) {
    float id = aBone.z;
    bool front = id < 1.5;
    vec3 hip = vec3(sign(p.x) * (front ? ${BODY.hipFront[0].toFixed(3)} : ${BODY.hipRear[0].toFixed(3)}), front ? ${BODY.hipFront[1].toFixed(3)} : ${BODY.hipRear[1].toFixed(3)}, front ? ${BODY.hipFront[2].toFixed(3)} : ${BODY.hipRear[2].toFixed(3)});
    vec3 knee = hip - vec3(0.0, ${BODY.knee.toFixed(3)}, 0.0);
    // The walk: each foot stands while the body passes over it, then lifts and swings. Left hind, left fore, right hind, right fore.
    float off = id < 0.5 ? 0.25 : id < 1.5 ? 0.75 : id < 2.5 ? 0.0 : 0.5;
    float ph = fract(aPose.z + off);
    float swing = clamp((ph - ${STANCE.toFixed(2)}) / ${(1 - STANCE).toFixed(2)}, 0.0, 1.0);
    float ahead = ph < ${STANCE.toFixed(2)} ? mix(0.5, -0.5, ph / ${STANCE.toFixed(2)}) : mix(-0.5, 0.5, swing * swing * (3.0 - 2.0 * swing));
    float lift = sin(3.14159 * swing);
    float walk = aPose.w * (1.0 - lie);
    float hipTurn = -asin(clamp(ahead * ${STRIDE.toFixed(2)} / ${BODY.leg.toFixed(2)}, -1.0, 1.0)) * walk;
    float kneeTurn = lift * 0.85 * walk * (front ? 1.0 : 0.8);
    // Lying: the legs fold under the body.
    hipTurn = mix(hipTurn, front ? -1.38 : -1.25, lie);
    kneeTurn = mix(kneeTurn, front ? 2.62 : 2.5, lie);
    if (aBone.w > 0.5) turn(p, n, knee, kneeTurn * smoothstep(0.5, 0.56, aBone.y));
    turn(p, n, hip, hipTurn * smoothstep(-0.1, 0.12, aBone.y));
    p.x += sign(p.x) * 0.1 * lie * smoothstep(0.1, 0.5, aBone.y);
  } else {
    turn(p, n, vec3(0.0, 1.5, -0.82), 0.25 * aBone.y * sin(uTime * 1.9 + aLife.x * 40.0) * smoothstep(-0.5, 0.4, sin(uTime * 0.37 + aLife.x * 17.0)));
  }
  vRest = position;
  vRestNormal = normal;
  vPart = part;
  vSeed = aLife.x;
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying float vPart;
varying float vSeed;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // The skin: pale, creased, thin over the ribs and the joints. Mapped in the body's own rest shape, so that it moves with the body.
  vec3 w = pow(abs(normalize(vRestNormal)), vec3(3.0));
  w /= w.x + w.y + w.z;
  vec3 q = vRest * 1.67 + vSeed * 9.0;
  vec3 col = texture2D(tHide, q.zy).rgb * w.x + texture2D(tHide, q.xz).rgb * w.y + texture2D(tHide, q.xy).rgb * w.z;
  vec3 nh = texture2D(tHideNh, q.zy).rgb * w.x + texture2D(tHideNh, q.xz).rgb * w.y + texture2D(tHideNh, q.xy).rgb * w.z;
  float lum = dot(col, vec3(0.33));
  float ribs = smoothstep(-0.18, 0.55, vRest.z) * (1.0 - smoothstep(0.55, 0.7, vRest.z)) * step(vPart, 0.5) * smoothstep(1.75, 1.35, vRest.y);
  float rib = sin(vRest.z * 46.0 + vRest.y * 9.0);
  vec3 albedo = mix(vec3(0.42, 0.33, 0.27), vec3(0.8, 0.7, 0.6), smoothstep(0.16, 0.48, lum)) * (0.92 + 0.16 * vnoise(vRest.zy * 3.0 + vSeed * 20.0));
  albedo *= 1.0 - 0.07 * ribs * smoothstep(0.2, 0.9, rib);
  // Old skin: stained in patches, darker along the back, grey with dust on the legs.
  float stain = 0.6 * vnoise(vRest.zy * 2.1 + vSeed * 13.0) + 0.4 * vnoise(vRest.zy * 7.0 + vRest.x * 3.0 + vSeed * 3.0);
  albedo *= mix(vec3(0.4, 0.42, 0.45), vec3(1.08), smoothstep(0.32, 0.6, stain));
  float dirt = 0.6 * vnoise(vRest.zy * 0.9 + vSeed * 41.0) + 0.4 * vnoise(vRest.zy * 4.3 + vSeed * 7.0);
  albedo *= mix(vec3(0.5, 0.47, 0.45), vec3(1.0), smoothstep(0.3, 0.55, dirt + 0.25 * smoothstep(0.7, 1.5, vRest.y)));
  albedo *= mix(vec3(0.78, 0.74, 0.72), vec3(1.0), smoothstep(0.25, 0.9, vRest.y));
  // Dark and wet to the knee where it has stood in the lake; grey with dust above that.
  vec4 land = landAt(vWorld.xz);
  float wet = smoothstep(0.55, 0.1, vWorld.y) * smoothstep(1.5, -1.5, land.b);
  albedo *= mix(1.0, 0.5, wet);
  // The hooves: dark horn.
  albedo = mix(albedo, vec3(0.06, 0.05, 0.045), (1.0 - smoothstep(0.08, 0.12, vRest.y)) * step(1.5, vPart));
  vec2 d = nh.xy * 2.0 - 1.0;
  vec3 t = normalize(cross(n, vec3(0.2, 0.9, 0.35)));
  vec3 b = cross(n, t);
  // The neck is creased across, deepest at its root and under the jaw; the skin hangs in folds at the elbow and the stifle.
  float onNeck = step(0.5, vPart) * step(vPart, 1.5);
  float crease = onNeck * cos(vRest.y * 38.0 + 3.0 * vnoise(vRest.xz * 9.0 + vSeed * 5.0)) * (0.5 + 0.5 * vnoise(vec2(vRest.y * 2.3, vSeed * 31.0)));
  albedo *= 1.0 - 0.1 * onNeck * smoothstep(0.3, 1.0, -crease);
  // A short pale coat: fine, lying one way, a little rough.
  float coat = vnoise(vec2(vRest.z * 420.0 + vRest.x * 90.0, vRest.y * 60.0)) - 0.5;
  albedo *= 1.0 + 0.22 * coat;
  n = normalize(n + (t * d.x + b * d.y) * 0.65 + b * (0.12 * ribs * cos(vRest.z * 46.0 + vRest.y * 9.0) + 0.3 * crease) + t * (0.14 * coat));
  float under = smoothstep(0.2, -0.7, normalize(vNormal).y);
  float occ = (0.55 + 0.45 * smoothstep(0.05, 0.55, nh.b)) * mix(1.0, 0.45, under);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.72, 0.3, wet), occ);
  // Thin skin: the low sun comes through the ears, the edges of the neck and the legs.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  c += vec3(0.75, 0.3, 0.16) * uSunColour * (0.05 * rim * sunAt(vWorld) * max(dot(-v, uSunDir) + 0.3, 0.0));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function create(ctx: Context): Piece {
  const animals = herd(ctx.rng('drinkers'), ctx.events.rise - 1.7);
  const count = animals.length;
  const geometry = drinkerGeometry();
  const pose = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  pose.setUsage(THREE.DynamicDrawUsage);
  life.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aPose', pose);
  geometry.setAttribute('aLife', life);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...ctx.rig.uniforms,
      tHide: { value: ctx.assets.texture('mat/hide.jpg', { anisotropy: 4 }) },
      tHideNh: { value: ctx.assets.texture('mat/hide-nh.png', { kind: 'data', anisotropy: 4 }) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('drinkers', mesh));
  const shade = ctx.rig.contactDiscs(count);
  for (let i = 0; i < 22; i++) ctx.laps.push({ x: 0, z: 0, strength: 0, offset: i * 0.37 });

  const dummy = new THREE.Object3D();
  const NECK_UP = 30 * DEG;
  const NECK_DOWN = 139 * DEG;
  const sun = ctx.rig.sun;

  return {
    setTime: (t) => {
      let lap = 0;
      animals.forEach((d, i) => {
        const size = d.size * SCALE;
        let x = d.x;
        let z = d.z;
        let walking = 0;
        let cycle = 0;
        if (d.walk > 0) {
          // It walks down to the water and stops with its fore feet in it. The feet are placed by the distance walked, so none slides.
          const r0 = Math.hypot(x, z);
          const stop = shoreOf(x, z) - 1.2 * size;
          const speed = d.walk * size;
          const reach = r0 - stop;
          const ease = 1.6 * speed;
          const gone = Math.max(0, t + 3);
          const walked = gone * speed < reach - ease ? gone * speed : reach - ease * Math.exp(-(gone * speed - (reach - ease)) / ease);
          const r = r0 - walked;
          x *= r / r0;
          z *= r / r0;
          cycle = (walked / (STRIDE * size)) * STANCE;
          walking = Math.min(1, (reach - walked) / (0.5 * size));
        }
        const ground = Math.max(-0.45, landHeight(x, z));
        const lie = d.lies ? 1 : 0;
        const facing = d.walk > 0 ? Math.atan2(-x, z) / DEG : d.facing;
        const sway = 0.006 * size * Math.sin(t * 0.6 + i * 1.7);
        dummy.position.set(x + sway * Math.cos(facing * DEG), ground - 0.02 * size - lie * 0.86 * size + walking * 0.018 * size * Math.sin(cycle * Math.PI * 4), z + sway * Math.sin(facing * DEG));
        // Its weight goes from one side to the other over feet that stay where they are.
        const shift = (1 - lie) * (0.024 * Math.sin(t * 0.83 + i * 1.7) + 0.012 * Math.sin(t * 0.31 + i * 0.9));
        dummy.rotation.set((1 - lie) * 0.012 * Math.sin(t * 0.47 + i * 2.9), Math.PI - facing * DEG, lie * 0.1 + shift);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const down = Math.min(1, Math.max(0, d.down(t)));
        const neck = NECK_UP + (NECK_DOWN - NECK_UP) * down + 0.03 * Math.sin(t * 0.7 + i * 2.3) * (1 - down);
        pose.setXYZW(i, neck, lie, cycle, walking);
        const look = (0.05 + 0.3 * (1 - down)) * (Math.sin(t * 0.43 + i * 2.1) + 0.5 * Math.sin(t * 1.1 + i * 0.7)) / 1.5;
        life.setXYZW(i, (i * 0.618034) % 1, Math.sin(t * (1.25 + 0.3 * ((i * 0.37) % 1)) + i * 1.3), look, 0);
        // The shade under it, laid along the ground away from the sun.
        const long = 2.6;
        const off = size * 0.9 * (long - 1) * 0.5;
        ctx.rig.setDisc(shade, i, x - sun.direction.x * off, z - sun.direction.z * off, size * (d.lies ? 1.25 : 0.95), d.lies ? 0.85 : 0.7, long, sun.shadowYaw);
        // Where its mouth is in the water, rings.
        const reach = (BODY.neckPivot[2] + (BODY.neckLength + 0.5) * Math.sin(neck)) * size;
        const mx = x + Math.sin(facing * DEG) * reach;
        const mz = z - Math.cos(facing * DEG) * reach;
        const drinks = Math.hypot(mx, mz) < shoreOf(mx, mz) - 0.2 ? Math.min(1, Math.max(0, (down - 0.82) / 0.12)) : 0;
        if (lap < ctx.laps.length && (drinks > 0 || i < 9)) {
          const slot = ctx.laps[lap++];
          if (slot) {
            slot.x = mx;
            slot.z = mz;
            slot.strength = drinks;
          }
        }
      });
      // Rings from the legs of the ones the close shots are about, where they stand in the water.
      animals.forEach((d, i) => {
        if (i >= 9 || lap >= ctx.laps.length) return;
        const size = d.size * SCALE;
        const fx = d.x + Math.sin(d.facing * DEG) * 0.75 * size;
        const fz = d.z - Math.cos(d.facing * DEG) * 0.75 * size;
        if (landHeight(fx, fz) > -0.03) return;
        const slot = ctx.laps[lap++];
        if (slot) {
          slot.x = fx;
          slot.z = fz;
          slot.strength = 0.3 + 0.2 * Math.sin(t * 0.83 + i * 1.7);
        }
      });
      for (; lap < ctx.laps.length; lap++) {
        const slot = ctx.laps[lap];
        if (slot) slot.strength = 0;
      }
      mesh.instanceMatrix.needsUpdate = true;
      pose.needsUpdate = true;
      life.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
