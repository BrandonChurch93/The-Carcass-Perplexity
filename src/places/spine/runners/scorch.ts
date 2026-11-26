// Where lightning came to ground: the snow is gone in a ragged patch round the carcass, the rock under it is burned black and wet, the bolt's
// ways are fused into it as branching channels of glass, and the meltwater has frozen again clear in the hollows and in a ring at the edge.
// One sheet draped on the land, raised into stones where the rock stands through, drawn over the snow and fading into it.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { CARCASS, carcassAxis, carcassBody, carcassView, step } from '../shared/anchors';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Half the side of the sheet, metres, and the spans along a side. */
const HALF = 5.5;
/** Where the dead one lies: a little along its own line from the anchor, so its head and the wet rock before it are well inside the frame. */
export const LIES_AT = step(carcassBody, carcassAxis, 0.55);
const SPANS = 176;

const FIELD_GLSL = /* glsl */ `
uniform vec4 uSpot;
uniform vec4 uLie;
uniform vec4 uHit;
// A place on the sheet as the lens has it: x toward the lens, y across.
vec2 lieOf(vec2 q) {
  return vec2(dot(q, uLie.xy), q.x * uLie.y - q.y * uLie.x);
}
// How far out of the patch a point is: under 0.8 bare rock, 1 and over the snow. The patch runs out toward the lens, the way the melt ran, and
// tongues of snow reach into it.
float patchAt(vec2 q) {
  vec2 l = lieOf(q);
  float edge = 0.62 + 0.5 * vnoise(q * 0.9 + 3.0) + 0.24 * vnoise(q * 2.6 + 11.0);
  l.x *= l.x > 0.0 ? 0.6 : 1.15;
  return length(l * vec2(1.0, 1.2)) / (uSpot.z * edge);
}
// The rock's relief, 0 to 1. It is bedded: its slabs and the breaks between them run toward the lens.
float rockAt(vec2 q) {
  vec2 l = lieOf(q);
  float beds = vnoise(vec2(l.x * 0.5, l.y * 2.7) + 7.0);
  float broken = vnoise(vec2(l.x * 1.7, l.y * 6.5) + 19.0);
  return 0.55 * beds + 0.3 * broken + 0.15 * vnoise(q * 12.0);
}
// How high the rock stands over the land at q, metres.
float standAt(vec2 q) {
  float inside = 1.0 - smoothstep(0.45, 0.95, patchAt(q));
  return inside * (0.008 + 0.045 * smoothstep(0.38, 0.75, rockAt(q)));
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
    float width = 0.035 * (1.0 - 0.28 * float(k)) * smoothstep(to, from, rho) * smoothstep(from - 0.25, from + 0.15, rho);
    if (across - width < best.x - best.y) best = vec2(across, max(width, 0.0005));
    arms *= 2.0;
  }
  return best;
}
void main() {
  vec2 q = vWorld.xz - uSpot.xy;
  vec2 l = lieOf(q);
  float m = patchAt(q);
  float grit = vnoise(q * 37.0);
  float fine = vnoise(q * 150.0);
  float cover = 1.0 - smoothstep(0.86, 1.0, m + 0.12 * (vnoise(q * 7.0) - 0.5) + 0.06 * (grit - 0.5));
  if (cover < 0.004) discard;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // The lie of the rock: the slope of the slabs, the breaks, the grain on them.
  float e = 0.025;
  float h0 = standAt(q);
  vec3 n = normalize(vec3(h0 - standAt(q + vec2(e, 0.0)), e, h0 - standAt(q + vec2(0.0, e))));
  n = normalize(n + 0.55 * vec3(fbm(q * 9.0) - 0.5, 0.0, fbm(q * 9.0 + 31.0) - 0.5) + 0.3 * vec3(vnoise(q * 70.0) - 0.5, 0.0, vnoise(q * 70.0 + 13.0) - 0.5));
  float relief = rockAt(q);
  // Burned rock: black where the bolt went in, slate away from it, rust bleeding along the beds, wet all over.
  vec2 d = vWorld.xz - uHit.xy;
  float near = exp(-dot(d, d) / 3.0);
  vec3 albedo = mix(vec3(0.03, 0.03, 0.034), vec3(0.1, 0.092, 0.088), vnoise(vec2(l.x * 1.6, l.y * 10.0) + 2.0)) * (0.55 + 0.9 * grit);
  float rust = smoothstep(0.48, 0.72, vnoise(vec2(l.x * 0.7, l.y * 3.2) + 40.0)) * (0.35 + 0.65 * smoothstep(0.3, 0.6, vnoise(q * 1.3 + 8.0)));
  albedo = mix(albedo, vec3(0.2, 0.082, 0.032) * (0.6 + 0.8 * grit), 0.7 * rust);
  albedo = mix(albedo, vec3(0.012, 0.011, 0.012), 0.75 * near);
  float rough = mix(0.5, 0.34, near) + 0.3 * (grit - 0.5) + 0.2 * (fine - 0.5);
  float occ = 0.5 + 0.5 * smoothstep(0.25, 0.7, relief);
  // The channels: grooves of black glass with a pale fused lip.
  vec2 ch = channelAt(d);
  float groove = 1.0 - smoothstep(0.55 * ch.y, ch.y, ch.x);
  float lip = (1.0 - smoothstep(ch.y, 2.1 * ch.y, ch.x)) * (1.0 - groove);
  albedo = mix(albedo, vec3(0.26, 0.23, 0.19) * (0.6 + 0.8 * grit), 0.6 * lip);
  albedo = mix(albedo, vec3(0.006, 0.006, 0.008), groove);
  rough = mix(rough, 0.08, groove);
  occ *= 1.0 - 0.5 * groove;
  // Meltwater lies in the breaks between the slabs, in threads and small pools, still and dark.
  float water = (1.0 - smoothstep(0.27, 0.33, relief)) * (1.0 - groove);
  albedo = mix(albedo, albedo * 0.5, water);
  rough = mix(rough, 0.05, water);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0) + 0.05 * vec3(vnoise(q * 23.0) - 0.5, 0.0, vnoise(q * 23.0 + 7.0) - 0.5), water));
  // Toward the edge the melt froze again as it ran: plates of glaze over the rock, clear in the middle, white and broken at their rims,
  // with air in them.
  float ring = smoothstep(0.38, 0.7, m);
  float plate = vnoise(q * 2.3 + 60.0) + 0.35 * vnoise(q * 6.1 + 4.0) + 0.75 * ring - 0.6 * near;
  float glaze = smoothstep(0.82, 0.9, plate) * (1.0 - groove);
  float rim = glaze * (1.0 - smoothstep(0.9, 1.0, plate));
  float crack = 1.0 - smoothstep(0.0, 0.03, abs(vnoise(q * 5.5 + 60.0) - 0.5));
  crack = max(crack, 0.7 * (1.0 - smoothstep(0.0, 0.04, abs(vnoise(q * 13.0 + 80.0) - 0.5))));
  float air = smoothstep(0.6, 0.8, vnoise(q * 48.0 + 5.0));
  float white = clamp(0.75 * rim + 0.55 * crack + 0.3 * air + 0.35 * smoothstep(0.75, 1.0, m), 0.0, 1.0);
  vec3 ice = mix(mix(albedo * 0.7, vec3(0.2, 0.25, 0.3), 0.3), vec3(0.62, 0.66, 0.7), white);
  albedo = mix(albedo, ice, glaze);
  rough = mix(rough, 0.14 + 0.5 * white + 0.25 * (grit - 0.5), glaze);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0) + 0.16 * vec3(vnoise(q * 6.0) - 0.5, 0.0, vnoise(q * 6.0 + 7.0) - 0.5) + 0.1 * vec3(grit - 0.5, 0.0, fine - 0.5), 0.85 * glaze));
  occ = mix(occ, 1.0, glaze);
  // Slush that froze where it lay, in lumps, and spindrift caught on the upper sides of the stones and thick at the patch's edge.
  float lumps = smoothstep(0.56, 0.66, 0.6 * vnoise(q * 3.4 + 25.0) + 0.4 * vnoise(q * 11.0 + 4.0) + 0.45 * (m - 0.55) - 0.5 * near) * (1.0 - groove) * (1.0 - water);
  float dust = smoothstep(0.55, 0.92, m + 0.35 * (vnoise(q * 3.1 + 50.0) - 0.5)) * smoothstep(0.3, 0.6, n.y * 0.6 + 0.5 * vnoise(q * 15.0));
  dust = max(dust, 0.75 * smoothstep(0.6, 0.72, fine * (0.55 + 0.5 * relief + 0.4 * m)) * (1.0 - groove) * (1.0 - water) * (1.0 - 0.8 * near));
  float snow = max(0.9 * lumps, dust);
  albedo = mix(albedo, vec3(0.74, 0.77, 0.81) * (0.75 + 0.4 * vnoise(q * 30.0)), snow);
  rough = mix(rough, 0.85, snow);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, clamp(rough, 0.04, 1.0), occ);
  gl_FragColor = vec4(rigOut(c), cover * (1.0 - uSolo));
}`;

export interface Scorch {
  mesh: THREE.Mesh;
  /** Lays the sheet on the land as it now is. */
  drape(): void;
}

export function scorch(ctx: Context): Scorch {
  // The patch lies under the animal and reaches out toward the lens and past its head.
  const head = step(LIES_AT, carcassAxis + 180, 1.1);
  const centre = step(head, carcassView + 180, 0.9);
  const toLens = step(centre, carcassView + 180, 1);
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
        uSpot: { value: new THREE.Vector4(centre[0], centre[2], 2.1, 0) },
        uLie: { value: new THREE.Vector4(toLens[0] - centre[0], toLens[2] - centre[2], 0, 0) },
        uHit: { value: new THREE.Vector4(LIES_AT[0], LIES_AT[2], 0, 0) },
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
