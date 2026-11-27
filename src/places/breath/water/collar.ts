// The water where a wader touches it. The sheet is one level plane and cannot rise: round every leg and every mop that the waders folder
// names in `CONTACT.points` a disc of the surface is laid over the sheet and lifted. It climbs the leg in a meniscus, its rings have real
// height, and under a mop it is stirred. The disc is shaded by the sheet's own function (shaders.ts, `COLLAR`), which takes the slope of
// the height below, so every glint and every mirrored thing follows the lifted surface. At its rim the disc fades into the sheet.
//
// The height is one function of the place and the time, read by the vertex stage for the lift and by the fragment stage for the slope.
import * as THREE from 'three';
import { CONTACT_MAX } from '../waders/ripples';

/** Rows out from the middle and spokes round it. The rows crowd toward the leg, where the meniscus is a finger wide. */
const ROWS = 40;
const SPOKES = 48;

export function collarGeometry(): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  // x: 0 at the inner end to 1 at the rim, y: the angle round the source.
  const at = new Float32Array((ROWS + 1) * SPOKES * 3);
  for (let i = 0; i <= ROWS; i++) {
    for (let j = 0; j < SPOKES; j++) {
      const o = (i * SPOKES + j) * 3;
      at[o] = i / ROWS;
      at[o + 1] = (j / SPOKES) * Math.PI * 2;
      at[o + 2] = 0;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < SPOKES; j++) {
      const a = i * SPOKES + j;
      const b = i * SPOKES + ((j + 1) % SPOKES);
      // Wound to face up.
      index.push(a, b, a + SPOKES, b, b + SPOKES, a + SPOKES);
    }
  }
  const slot = new Float32Array(CONTACT_MAX);
  for (let i = 0; i < CONTACT_MAX; i++) slot[i] = i;
  g.setAttribute('position', new THREE.BufferAttribute(at, 3));
  g.setAttribute('aSlot', new THREE.InstancedBufferAttribute(slot, 1));
  g.setIndex(index);
  g.instanceCount = CONTACT_MAX;
  return g;
}

/** For both stages. `src` is the radius of the thing at the water line, how much it is in the water, how far the disc reaches and the
 *  source's own phase; `drift` is the way the water goes past it, at most 1 long. The height is never under the still level, so the disc
 *  never dips under the sheet it lies on. */
export const COLLAR_GLSL = /* glsl */ `
float collarHeight(vec2 away, vec4 src, vec2 drift, float t) {
  float r0 = src.x;
  float reach = src.z;
  float d = length(away);
  vec2 dir = away / max(d, 1e-4);
  // A leg is a thumb thick, a mop a bunch a forearm across: no water climbs a mop, it is worked into a chop.
  float leg = 1.0 - smoothstep(0.07, 0.12, r0);
  float lee = dot(dir, drift);
  // The meniscus: a finger high on the side the stream comes from, half that in the lee, gone a hand out.
  float out0 = max(d - r0, 0.0);
  float climb = leg * (0.02 + 0.2 * r0) * (1.0 - 0.5 * lee) * exp(-out0 / (0.016 + 0.6 * r0));
  // The rings. The older a ring the further the stream and the wind have carried its middle, so the rings are not round the leg but
  // crowd upstream of it and open out in the lee. The long ones outrun the short ones.
  vec2 from = away - drift * (0.22 * d);
  float e = length(from);
  float out1 = max(e - mix(0.3 * r0, r0, leg), 0.0);
  float fade = (1.0 - smoothstep(0.5 * reach, 0.94 * reach, d)) / (1.0 + 0.8 * out1);
  float turn = 31.0 * out1 - 5.5 * out1 * out1 / reach - 11.0 * t + src.w;
  // They leave in packets of two or three with nearly still water between, and no ring is whole.
  float packet = 0.22 + 0.78 * smoothstep(0.2, 0.8, 0.5 + 0.5 * sin(5.0 * out1 - 2.2 * t + 1.7 * src.w));
  float round_ = atan(from.y, from.x);
  float part = 0.55 + 0.45 * sin(2.0 * round_ + 2.3 * src.w + 5.0 * out1) * sin(3.0 * round_ - 1.1 * src.w + 0.5 * t);
  float ring = 0.014 * fade * packet * part * (1.0 + cos(turn));
  // Under a mop and close round it the strands work the water: a short steep chop that goes nowhere.
  float chop = (1.0 - leg) * (1.0 - smoothstep(0.7 * r0, 1.7 * r0, d)) * 0.0028 * (2.0 + sin(47.0 * away.x + 9.0 * t + src.w) * sin(41.0 * away.y - 7.5 * t) + sin(29.0 * (away.x + away.y) - 11.0 * t + 2.0 * src.w));
  return src.y * (climb + ring + chop);
}`;

export const COLLAR_VERTEX = /* glsl */ `
attribute float aSlot;
uniform vec4 uContact[${CONTACT_MAX}];
uniform float uSea;
uniform float uTime;
uniform vec2 uWind;
uniform sampler2D tLines;
uniform vec4 uFlowRect;
varying vec3 vWorld;
varying vec2 vAway;
varying vec4 vSrc;
varying vec2 vDrift;
varying float vFade;
${COLLAR_GLSL}
void main() {
  vec4 c = uContact[int(aSlot + 0.5)];
  float far = distance(cameraPosition, vec3(c.x, uSea, c.y));
  // A disc far off is a few pixels of what the ring picture already draws there.
  float near = 1.0 - smoothstep(38.0, 55.0, far);
  if (c.w <= 0.002 || near <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vWorld = vec3(0.0);
    vAway = vec2(0.0);
    vSrc = vec4(0.0);
    vDrift = vec2(0.0);
    vFade = 0.0;
    return;
  }
  float r0 = c.z;
  float leg = 1.0 - smoothstep(0.07, 0.12, r0);
  float reach = mix(2.4, 2.0, leg);
  // The disc begins inside the leg, where the leg hides it; under a mop it is whole.
  float inner = 0.5 * r0 * leg;
  float d = inner + (reach - inner) * pow(position.x, 1.6);
  vec2 away = d * vec2(cos(position.y), sin(position.y));
  vec2 vel = textureLod(tLines, (c.xy - uFlowRect.xy) * uFlowRect.zw, 0.0).gb + 0.1 * uWind;
  vDrift = vel / max(length(vel), 0.22);
  vSrc = vec4(r0, c.w * near, reach, 17.0 * c.x + 11.0 * c.y);
  vAway = away;
  vFade = (1.0 - smoothstep(0.6 * reach, 0.97 * reach, d)) * near;
  vWorld = vec3(c.x + away.x, uSea + collarHeight(away, vSrc, vDrift, uTime), c.y + away.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;
