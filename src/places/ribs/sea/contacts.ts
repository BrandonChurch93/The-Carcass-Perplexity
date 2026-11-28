// The water's answer to what stands in it: round every foot and tuft the wings folder reports (wings/contacts.ts) the flat is thrown into
// rings. They are drawn after the animals' mirror image, so the image is broken where the water is broken: a leg does not stand on glass.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import { CONTACTS, type Contact } from '../wings/contacts';
import { FLAT_RIPPLE_GLSL } from './ripples';

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

/** As many animals as have their image on the water broken, and how near two contacts are to be one animal's, metres. */
const VEILED = 12;
const ONE_ANIMAL = 5.5;
/** Half the breadth of the stretch of water an animal's image lies on, and how high the animal stands, metres. */
const VEIL_HALF = 4.0;
const VEIL_TALL = 4.2;

// The stretch of water between an animal and the lens, where its image lies: a strip from its feet toward the eye, as long as the image.
const VEIL_VERTEX = /* glsl */ `
attribute vec4 aSpot;
uniform float uPoolLevel;
varying vec3 vWorld;
varying vec3 vStrip;
void main() {
  vec2 to = cameraPosition.xz - aSpot.xy;
  float far = max(length(to), 1e-3);
  vec2 dir = to / far;
  float eye = max(cameraPosition.y - uPoolLevel, 0.05);
  float reach = min(far * aSpot.w / (aSpot.w + eye) + 1.0, far - 0.3);
  float along = mix(-aSpot.z, reach, position.z * 0.5 + 0.5);
  vec2 at = aSpot.xy + dir * along + vec2(-dir.y, dir.x) * (position.x * aSpot.z);
  vStrip = vec3(position.x, position.z, along);
  vWorld = vec3(at.x, uPoolLevel + 0.004, at.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

// The image the wings folder draws on the flat is a whole one, as on glass. This is drawn after it: the flat's own ripples (ripples.ts),
// and wherever a flank of one throws the eye's line off the animal, the water as it is there without the image. The image is left
// whole at the feet and goes to pieces away from them, as the line thrown back has farther to go.
const VEIL_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${FLAT_RIPPLE_GLSL}
uniform float uPoolLevel;
uniform sampler2D tChop;
uniform vec2 uWind;
varying vec3 vWorld;
varying vec3 vStrip;
void main() {
  vec2 footX = dFdx(vWorld.xz);
  vec2 footY = dFdy(vWorld.xz);
  vec3 rip = flatRipple(vWorld.xz, uTime, footX, footY);
  // The same gusts as the sheet's (shaders.ts, WET_EDGE): in the slack between them an image stands nearly whole.
  float texels = float(textureSize(tChop, 0).x) * max(length(footX), length(footY));
  vec4 gusts = textureLod(tChop, (vWorld.xz - uTime * uWind * 2.4) / 57.0 + 0.31, log2(max(texels / 57.0, 1.0)));
  float paw = smoothstep(0.3, 0.7, 0.5 * gusts.a + 0.3 * textureLod(tChop, vWorld.xz / 29.0, log2(max(texels / 29.0, 1.0))).a
    + 0.2 * textureLod(tChop, vWorld.xz / 7.3, log2(max(texels / 7.3, 1.0))).a + 0.3 * (gusts.b - 0.5));
  vec4 land = textureLod(tLand, (vWorld.xz - uLandRect.xy) * uLandRect.zw, 0.0);
  float depth = uPoolLevel - land.r;
  float worked = (0.34 + 0.9 * paw) * smoothstep(0.0, 0.03, depth);
  vec2 slope = rip.xy * worked;
  vec3 v = normalize(cameraPosition - vWorld);
  // The eye's line thrown back off the water climbs as it came down: so high over the water it meets the animal.
  float back = max(vStrip.z, 0.0);
  float high = back * v.y / max(length(v.xz), 1e-3);
  float cut = flatBreak(slope, v, high);
  // Ripples too small for the pixel smear the image where they cannot break it.
  cut = max(cut, 0.2 * smoothstep(0.3, 1.2, sqrt(rip.z) * worked * 2.0 * (0.15 + back)));
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float fres = 0.02 + 0.98 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
  vec3 r = reflect(-v, n);
  float under0 = smoothstep(0.02, -0.05, r.y);
  r.y = abs(r.y) + 0.01;
  r = normalize(r);
  // The flat's own water (shaders.ts, POOL_SHEET).
  vec3 refl = skyMirror(r, 1.0) * mix(1.0, 0.3, under0);
  float piece = dot(refl, vec3(0.3333)) / max(dot(skyIrradiance(vec3(0.0, 1.0, 0.0)), vec3(0.3333)) / 3.14159, 1e-4);
  float glint = smoothstep(1.25, 2.4, piece);
  refl = mix(refl, vec3(dot(refl, vec3(0.3333))), 0.6 * glint) * (0.55 + 0.35 * smoothstep(0.3, 1.0, piece) + 1.7 * glint) * mix(1.0, land.g, 0.5) * vec3(0.86, 0.82, 0.78) * 0.8;
  fres *= mix(0.55, 1.0, smoothstep(8.0, 34.0, distance(cameraPosition, vWorld)));
  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * land.g + uSunColour * (uSunDir.y * land.b);
  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);
  vec3 col = fres * refl + (1.0 - fres) * mix(vec3(0.075, 0.07, 0.06), vec3(0.125, 0.11, 0.085), murk) * e / 3.14159;
  cut *= (1.0 - smoothstep(0.6, 1.0, abs(vStrip.x))) * (1.0 - smoothstep(0.85, 1.0, abs(vStrip.y))) * smoothstep(0.0, 0.05, depth) * (1.0 - uSolo);
  cut *= 0.8;
  gl_FragColor = vec4(rigOut(col) * cut, cut);
}`;

export interface ContactRings {
  mesh: THREE.Mesh;
  /** The broken water over the animals' images: drawn after them. */
  veil: THREE.Mesh;
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
  const veilGeometry = new THREE.InstancedBufferGeometry();
  veilGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3));
  veilGeometry.setIndex([0, 2, 1, 0, 3, 2]);
  const spot = new THREE.InstancedBufferAttribute(new Float32Array(VEILED * 4), 4);
  veilGeometry.setAttribute('aSpot', spot);
  veilGeometry.instanceCount = 0;
  const veilMaterial = new THREE.ShaderMaterial({
    vertexShader: VEIL_VERTEX,
    fragmentShader: VEIL_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const veil = new THREE.Mesh(veilGeometry, veilMaterial);
  veil.frustumCulled = false;
  veil.visible = false;
  const herd = Array.from({ length: VEILED }, () => ({ x: 0, z: 0, n: 0 }));
  const list: Contact[] = Array.from({ length: ANSWERED }, () => ({ x: 0, z: 0, kind: 0 as const, wide: 0, since: -1, out: -1, speed: 0 }));
  return {
    mesh,
    veil,
    setTime: (seconds, on) => {
      const n = on && CONTACTS.at ? Math.min(CONTACTS.at(seconds, list), ANSWERED) : 0;
      let used = 0;
      // One veil for each animal: contacts that lie within an animal's length of one another are its feet and its tuft.
      let animals = 0;
      for (let i = 0; i < n; i++) {
        const c = list[i] as Contact;
        let mine = -1;
        for (let a = 0; a < animals && mine < 0; a++) {
          const h = herd[a] as { x: number; z: number; n: number };
          if (Math.hypot(h.x / h.n - c.x, h.z / h.n - c.z) < ONE_ANIMAL) mine = a;
        }
        if (mine < 0 && animals < VEILED) {
          mine = animals++;
          const h = herd[mine] as { x: number; z: number; n: number };
          h.x = 0;
          h.z = 0;
          h.n = 0;
        }
        if (mine < 0) continue;
        const h = herd[mine] as { x: number; z: number; n: number };
        h.x += c.x;
        h.z += c.z;
        h.n++;
      }
      for (let a = 0; a < animals; a++) {
        const h = herd[a] as { x: number; z: number; n: number };
        spot.setXYZW(a, h.x / h.n, h.z / h.n, VEIL_HALF, VEIL_TALL);
      }
      veilGeometry.instanceCount = animals;
      spot.needsUpdate = true;
      veil.visible = animals > 0;
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
      veilGeometry.dispose();
      veilMaterial.dispose();
    },
  };
}
