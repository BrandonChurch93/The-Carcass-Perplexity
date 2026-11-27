// The water's answer to what stands in it: round every foot and tuft the wings folder reports (wings/contacts.ts) the flat is thrown into
// rings. They are drawn after the animals' mirror image, so the image is broken where the water is broken: a leg does not stand on glass.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import { CONTACTS, type Contact } from '../wings/contacts';

/** As many contacts as are answered, nearest the feeding lens first. */
const ANSWERED = 36;
/** How far from a foot its rings are drawn, metres; a tuft works a wider stretch. */
const REACH_FOOT = 2.2;
const REACH_TUFT = 3.0;

const VERTEX = /* glsl */ `
attribute vec4 aAt;
attribute vec4 aLife;
uniform float uPoolLevel;
varying vec3 vWorld;
varying vec4 vAt;
varying vec4 vLife;
void main() {
  vAt = aAt;
  vLife = aLife;
  vWorld = vec3(aAt.x + position.x * aAt.z, uPoolLevel + 0.003, aAt.y + position.z * aAt.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform float uPoolLevel;
varying vec3 vWorld;
varying vec4 vAt;
varying vec4 vLife;
// One packet of rings that left the place so many seconds ago: a few crests behind a front that runs out and dies.
float packetAt(float l, float ago, float from) {
  float front = from + 0.55 * ago;
  float behind = (l - front + 0.2) / 0.36;
  return sin((l - front) * 15.0) * exp(-behind * behind) / (1.0 + 1.2 * l);
}
void main() {
  vec2 d = vWorld.xz - vAt.xy;
  float l0 = length(d) + 1e-4;
  // No ruled circles: the rings are pushed about by the water they cross, and stronger to one side than the other.
  float seed = vLife.w;
  float l = l0 + 0.07 * sin(d.x * 5.3 + seed * 17.0) * sin(d.y * 4.1 + seed * 29.0) + 0.03 * sin(d.x * 13.0 - d.y * 9.0 + seed * 7.0);
  float lee = 0.6 + 0.4 * sin(atan(d.y, d.x) * 2.0 + seed * 11.0) * sin(atan(d.y, d.x) + seed * 3.0);
  float wide = vAt.w;
  float since = vLife.x;
  float lifted = vLife.y;
  float inWater = step(0.0, since);
  // It came down through the surface: one packet goes out from it. It was lifted out: a weaker one.
  float wave = inWater * (1.0 - smoothstep(0.8, 1.5, since)) * packetAt(l, since, 0.5 * wide);
  wave += 0.7 * step(0.0, lifted) * (1.0 - smoothstep(0.7, 1.5, lifted)) * packetAt(l, lifted, 0.5 * wide);
  // While it stands the animal's weight shifts on it, and what works through the pool drags a train of them.
  float work = inWater * (0.5 + 0.5 * min(vLife.z / 0.5, 1.0));
  wave += work * sin(l * 15.0 - uTime * 7.0 + seed * 6.2832) * exp(-l * 1.3) * (0.65 + 0.35 * sin(l * 3.1 - uTime * 1.7 + seed * 40.0));
  wave *= lee;
  vec2 slope = (d / l0) * wave * 0.3;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.01;
  r = normalize(r);
  vec4 land = textureLod(tLand, (vWorld.xz - uLandRect.xy) * uLandRect.zw, 0.0);
  float depth = uPoolLevel - land.r;
  // The flat's own water, word for word (shaders.ts, POOL_SHEET): the sky's piece each flank throws, silver where it is the break.
  vec3 refl = skyMirror(r, 1.0);
  float piece = dot(refl, vec3(0.3333)) / max(dot(skyIrradiance(vec3(0.0, 1.0, 0.0)), vec3(0.3333)) / 3.14159, 1e-4);
  float glint = smoothstep(1.25, 2.4, piece);
  refl = mix(refl, vec3(dot(refl, vec3(0.3333))), 0.6 * glint) * (0.55 + 0.35 * smoothstep(0.3, 1.0, piece) + 1.7 * glint) * mix(1.0, land.g, 0.5) * vec3(0.86, 0.82, 0.78);
  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * land.g + uSunColour * (uSunDir.y * land.b);
  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);
  vec3 col = fres * refl + (1.0 - fres) * mix(vec3(0.075, 0.07, 0.06), vec3(0.125, 0.11, 0.085), murk) * e / 3.14159;
  // The meniscus: the water climbs what stands in it and turns up to the sky there, a bright thread round it.
  float thread = inWater * (1.0 - smoothstep(0.5 * wide + 0.012, 0.5 * wide + 0.05, l0));
  col = mix(col, 0.75 * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159, 0.7 * thread);
  // A flank steep enough throws the eye's line off the animal: there its image is gone and the sky stands in its place.
  float cut = clamp(0.9 * smoothstep(0.004, 0.022, abs(wave) * 0.3) + 0.85 * thread, 0.0, 1.0);
  cut *= (1.0 - smoothstep(0.45, 1.0, l0 / vAt.z)) * smoothstep(0.0, 0.05, depth) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col) * cut, cut);
}`;

export interface ContactRings {
  mesh: THREE.Mesh;
  /** Places the rings from the time of the place alone; `on` false draws none. */
  setTime: (seconds: number, on: boolean) => void;
  dispose: () => void;
}

export function contactRings(uniforms: Record<string, THREE.IUniform>): ContactRings {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  const at = new THREE.InstancedBufferAttribute(new Float32Array(ANSWERED * 4), 4);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(ANSWERED * 4), 4);
  geometry.setAttribute('aAt', at);
  geometry.setAttribute('aLife', life);
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const list: Contact[] = Array.from({ length: ANSWERED }, () => ({ x: 0, z: 0, kind: 0 as const, wide: 0, since: -1, out: -1, speed: 0 }));
  return {
    mesh,
    setTime: (seconds, on) => {
      const n = on && CONTACTS.at ? Math.min(CONTACTS.at(seconds, list), ANSWERED) : 0;
      let used = 0;
      for (let i = 0; i < n; i++) {
        const c = list[i] as Contact;
        if (c.since < 0 && c.out < 0) continue;
        at.setXYZW(used, c.x, c.z, c.kind === 1 ? REACH_TUFT : REACH_FOOT, c.wide);
        life.setXYZW(used, c.since, c.out, c.speed, (i * 0.618034) % 1);
        used++;
      }
      geometry.instanceCount = used;
      at.needsUpdate = true;
      life.needsUpdate = true;
      mesh.visible = used > 0;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
