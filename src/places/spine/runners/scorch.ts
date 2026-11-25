// Where lightning came to ground: the snow is gone in a ragged patch round the carcass, the rock under it is burned black and wet, the bolt's
// ways are fused into it as branching channels of glass, and the meltwater has frozen again clear in the hollows and in a ring at the edge.
// One sheet draped on the land, raised into stones where the rock stands through, drawn over the snow and fading into it.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { CARCASS, carcassAxis, carcassBody, carcassView, step } from '../shared/anchors';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Half the side of the sheet, metres, and the spans along a side. */
const HALF = 7.5;
const SPANS = 176;

const FIELD_GLSL = /* glsl */ `
uniform vec4 uSpot;
uniform vec4 uHit;
// How far out of the patch a point is: under 0.8 bare rock, 1 and over the snow. Tongues of snow reach in and tongues of rock reach out.
float patchAt(vec2 q) {
  float edge = 0.6 + 0.55 * vnoise(q * 0.42 + 3.0) + 0.2 * vnoise(q * 1.5 + 11.0);
  return length(q * vec2(1.0, 1.25)) / (uSpot.z * edge);
}
// The rock's relief, 0 to 1: slabs, their broken edges, grit.
float rockAt(vec2 q) {
  float slabs = vnoise(q * 1.1 + 7.0);
  float broken = vnoise(q * 3.3 + 19.0);
  return 0.62 * slabs + 0.3 * broken + 0.08 * vnoise(q * 12.0);
}
// How high the rock stands over the land at q, metres.
float standAt(vec2 q) {
  float inside = 1.0 - smoothstep(0.45, 0.95, patchAt(q));
  return inside * (0.01 + 0.05 * smoothstep(0.4, 0.75, rockAt(q)));
}`;

const VERTEX = /* glsl */ `
${NOISE_GLSL}
${FIELD_GLSL}
varying vec3 vWorld;
void main() {
  vec3 p = position;
  vec2 q = p.xz - uSpot.xy;
  // Clear of the snow it lies on, by more the farther the lens is, so the two never fight for a pixel.
  p.y += standAt(q) + 0.008 + 0.0012 * distance(cameraPosition, p);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${FIELD_GLSL}
varying vec3 vWorld;
// The bolt's ways through the rock: arms that leave the place it struck, wander, and fork as they go, each thinner than the last. Returns the
// distance in metres from the nearest, and its width there.
vec2 channelAt(vec2 d) {
  float rho = length(d);
  float theta = atan(d.y, d.x);
  vec2 best = vec2(9.0, 0.001);
  float arms = 5.0;
  for (int k = 0; k < 3; k++) {
    float from = 0.25 + 0.9 * float(k);
    float to = 2.6 + 1.5 * float(k);
    float wander = 1.1 * (vnoise(vec2(rho * 1.3 + float(k) * 9.0, floor(theta * arms / 6.2832 + 0.5) * 3.7)) - 0.5) + 0.35 * (vnoise(vec2(rho * 6.0, float(k) * 5.0)) - 0.5);
    float a = theta * arms / 6.2832 + wander * (0.25 + 0.12 * rho);
    float across = abs(fract(a) - 0.5) * 6.2832 * rho / arms;
    float width = 0.05 * (1.0 - 0.28 * float(k)) * smoothstep(to, from, rho) * smoothstep(from - 0.25, from + 0.15, rho);
    if (across - width < best.x - best.y) best = vec2(across, max(width, 0.0005));
    arms *= 2.0;
  }
  return best;
}
void main() {
  vec2 q = vWorld.xz - uSpot.xy;
  float m = patchAt(q);
  float grit = vnoise(q * 37.0);
  float cover = 1.0 - smoothstep(0.82, 1.0, m + 0.1 * (vnoise(q * 7.0) - 0.5) + 0.05 * (grit - 0.5));
  if (cover < 0.004) discard;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // The lie of the rock: the slope of the stones, and the grain on them.
  float e = 0.03;
  float h0 = standAt(q);
  vec3 n = normalize(vec3(h0 - standAt(q + vec2(e, 0.0)), e, h0 - standAt(q + vec2(0.0, e))));
  n = normalize(n + 0.5 * vec3(fbm(q * 9.0) - 0.5, 0.0, fbm(q * 9.0 + 31.0) - 0.5) + 0.25 * vec3(vnoise(q * 70.0) - 0.5, 0.0, vnoise(q * 70.0 + 13.0) - 0.5));
  float relief = rockAt(q);
  // Burned rock: black where the bolt went in, slate with rust away from it, wet all over.
  vec2 d = vWorld.xz - uHit.xy;
  float near = exp(-dot(d, d) / 5.0);
  vec3 albedo = mix(vec3(0.05, 0.048, 0.05), vec3(0.11, 0.095, 0.085), vnoise(q * 5.0 + 2.0)) * (0.65 + 0.7 * grit);
  albedo = mix(albedo, vec3(0.16, 0.075, 0.035), 0.55 * smoothstep(0.5, 0.8, vnoise(q * 2.3 + 40.0)) * (0.4 + 0.6 * near));
  albedo = mix(albedo, vec3(0.012, 0.011, 0.012), 0.8 * near);
  float rough = mix(0.72, 0.4, near) + 0.25 * (grit - 0.5);
  float occ = 0.55 + 0.45 * smoothstep(0.3, 0.75, relief);
  // The channels: grooves of black glass with a pale fused lip.
  vec2 ch = channelAt(d);
  float groove = 1.0 - smoothstep(0.55 * ch.y, ch.y, ch.x);
  float lip = (1.0 - smoothstep(ch.y, 2.1 * ch.y, ch.x)) * (1.0 - groove);
  albedo = mix(albedo, vec3(0.3, 0.27, 0.22) * (0.6 + 0.8 * grit), 0.7 * lip);
  albedo = mix(albedo, vec3(0.006, 0.006, 0.008), groove);
  rough = mix(rough, 0.06, groove);
  occ *= 1.0 - 0.5 * groove;
  // Refrozen meltwater: clear ice lying level in the hollows between the stones, thickest in a ring toward the edge, cracked white, with air in it.
  float ring = smoothstep(0.2, 0.55, m) * (1.0 - smoothstep(0.85, 1.0, m));
  float pool = (1.0 - smoothstep(0.34, 0.42, relief + 0.1 * (1.0 - ring))) * (0.35 + 0.65 * ring);
  float crack = 1.0 - smoothstep(0.0, 0.025, abs(vnoise(q * 4.5 + 60.0) - 0.5));
  crack = max(crack, 0.7 * (1.0 - smoothstep(0.0, 0.03, abs(vnoise(q * 11.0 + 80.0) - 0.5))));
  float air = smoothstep(0.72, 0.8, vnoise(q * 55.0 + 5.0));
  vec3 ice = mix(albedo * 0.55, vec3(0.3, 0.36, 0.42), 0.22) + vec3(0.5, 0.54, 0.58) * (0.5 * crack + 0.25 * air);
  albedo = mix(albedo, ice, pool);
  rough = mix(rough, 0.07 + 0.3 * crack + 0.25 * vnoise(q * 2.7 + 9.0), pool);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0) + 0.02 * vec3(vnoise(q * 9.0) - 0.5, 0.0, vnoise(q * 9.0 + 7.0) - 0.5), pool));
  occ = mix(occ, 1.0, pool);
  // Spindrift caught on the stones and in the lee of them, and rime at the patch's edge.
  float dust = smoothstep(0.5, 0.9, m + 0.35 * (vnoise(q * 3.1 + 50.0) - 0.5)) * smoothstep(0.35, 0.6, n.y * 0.6 + 0.5 * vnoise(q * 15.0)) * (1.0 - pool);
  // Slush that froze where it lay: grey-white crusts over the rock between the pools, more of them away from the strike.
  float crust = smoothstep(0.42, 0.56, 0.7 * fbm(q * 2.4 + 25.0) + 0.3 * vnoise(q * 9.0 + 4.0) - 0.4 * near + 0.3 * (m - 0.5)) * (1.0 - pool) * (1.0 - groove);
  albedo = mix(albedo, vec3(0.55, 0.58, 0.63) * (0.7 + 0.5 * vnoise(q * 30.0)), 0.85 * crust);
  rough = mix(rough, 0.75, crust);
  dust = max(dust, 0.7 * smoothstep(0.62, 0.7, vnoise(q * 140.0) * (0.6 + 0.6 * crust)) * (1.0 - groove) * (1.0 - 0.8 * near));
  albedo = mix(albedo, vec3(0.78, 0.8, 0.84), dust);
  rough = mix(rough, 0.9, dust);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, clamp(rough, 0.03, 1.0), occ);
  gl_FragColor = vec4(rigOut(c), cover * (1.0 - uSolo));
}`;

export interface Scorch {
  mesh: THREE.Mesh;
  /** Lays the sheet on the land as it now is. */
  drape(): void;
}

export function scorch(ctx: Context): Scorch {
  // The patch lies under the animal and reaches out toward the lens and past its head.
  const head = step(carcassBody, carcassAxis + 180, 1.1);
  const centre = step(head, carcassView + 180, 0.9);
  const side = SPANS + 1;
  const position = new Float32Array(side * side * 3);
  const index: number[] = [];
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      position.set([centre[0] + (i / SPANS - 0.5) * 2 * HALF, 0, centre[2] + (j / SPANS - 0.5) * 2 * HALF], (j * side + i) * 3);
      if (i < SPANS && j < SPANS) {
        const a = j * side + i;
        index.push(a, a + side, a + 1, a + 1, a + side, a + side + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setIndex(index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(centre[0], CARCASS[1], centre[2]), HALF * 1.6);
  const mesh = new THREE.Mesh(
    g,
    new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        ...ctx.rig.uniforms,
        uSpot: { value: new THREE.Vector4(centre[0], centre[2], 3.1, 0) },
        uHit: { value: new THREE.Vector4(carcassBody[0], carcassBody[2], 0, 0) },
      },
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = -1;
  return {
    mesh,
    drape: () => {
      for (let k = 0; k < side * side; k++) position[k * 3 + 1] = ctx.rig.land.height(position[k * 3] as number, position[k * 3 + 2] as number);
      (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    },
  };
}
