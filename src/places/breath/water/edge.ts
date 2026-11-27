// Where the water meets the rock: the swash that laps up the bank and falls back, the froth it leaves, and the rock it keeps wet and glossy
// a hand above the line. The level sheet cannot draw any of it, since the bank stands above the sheet: this is a second, thin skin laid on
// the land itself, only along the water's edge, and drawn over it. It darkens and glosses what is under it and paints nothing of its own
// but froth, so the rock's own detail stays. The dark band in the land's own shader is the ground folder's and is under this.
//
// The skin is a ribbon that follows the water's line, not a patch of a grid: a grid's cells straddle a ledge any way they fall and the skin
// showed as a saw along every step of the rock. The line is found on a quarter metre grid, and at each place on it a row of points is laid
// across the bank, from half a metre out in the water to half a metre up the rock, each on the land.
import * as THREE from 'three';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const AREA = { minX: -150, maxX: 0, minZ: -180, maxZ: 112 };
const COARSE = 0.5;
const FINE = 0.25;
/** Metres the skin stands off the land: the land's own mesh has cells of 24 cm and this one's corners do not fall on them. */
export const LIFT = 0.03;
/** Metres along the ground from the water's line, toward the rock, at which a row has its points. */
const ROW = [-0.5, -0.16, -0.04, 0.03, 0.09, 0.18, 0.32, 0.5];

export function edgeGeometry(height: (x: number, z: number) => number, sea: number): THREE.BufferGeometry {
  const w = Math.round((AREA.maxX - AREA.minX) / COARSE);
  const h = Math.round((AREA.maxZ - AREA.minZ) / COARSE);
  // Which half metre cells have the line in them or beside them: one that is wet next to one that is dry.
  const wet = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) wet[j * w + i] = height(AREA.minX + (i + 0.5) * COARSE, AREA.minZ + (j + 0.5) * COARSE) < sea ? 1 : 0;
  }
  const per = COARSE / FINE;
  const across = w * per + 1;
  const level = new Map<number, number>();
  const above = (i: number, j: number): number => {
    const key = j * across + i;
    let v = level.get(key);
    if (v === undefined) {
      v = height(AREA.minX + i * FINE, AREA.minZ + j * FINE) - sea;
      level.set(key, v);
    }
    return v;
  };
  const places: number[] = [];
  const outward: number[] = [];
  const index: number[] = [];
  const rows = new Map<number, number>();
  const reach: number[] = [];
  // A row of points across the bank at the place where the line crosses the edge of a cell between corner a and corner b.
  const row = (key: number, ax: number, az: number, va: number, bx: number, bz: number, vb: number): number => {
    const known = rows.get(key);
    if (known !== undefined) return known;
    let t0 = 0;
    let t1 = 1;
    let v0 = va;
    let v1 = vb;
    let t = va / (va - vb);
    for (let n = 0; n < 3; n++) {
      const v = height(ax + (bx - ax) * t, az + (bz - az) * t) - sea;
      if (v < 0 === v0 < 0) {
        t0 = t;
        v0 = v;
      } else {
        t1 = t;
        v1 = v;
      }
      t = t0 + ((t1 - t0) * v0) / (v0 - v1);
    }
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    // Up the bank: against the fall of the ground at the line, or, on ground too level to say, from the wet corner to the dry one.
    const e = 0.08;
    let gx = height(x + e, z) - height(x - e, z);
    let gz = height(x, z + e) - height(x, z - e);
    let g = Math.hypot(gx, gz);
    if (g < 1e-4) {
      gx = (bx - ax) * (vb > va ? 1 : -1);
      gz = (bz - az) * (vb > va ? 1 : -1);
      g = Math.hypot(gx, gz);
    }
    const first = places.length / 3;
    // A row stops where the bank goes up steeper than a stair: the face of a ledge is the land's, drawn by a mesh whose cells do not
    // fall where these points do, and a skin hung on it stood off it in flaps.
    let whole = ROW.length;
    let last = sea;
    for (let k = 0; k < ROW.length; k++) {
      const s = ROW[k] as number;
      const px = x + (gx / g) * s;
      const pz = z + (gz / g) * s;
      // On the water's side the skin lies level a hair over the sheet whatever stands there: a stone a step out is not this bank.
      const y = s < 0 ? sea - LIFT + 0.004 : Math.max(height(px, pz), sea - LIFT + 0.004);
      if (k > 0 && whole === ROW.length && Math.abs(y - last) > 1.1 * (s - (ROW[k - 1] as number)) + 0.02) whole = k;
      last = y;
      places.push(px, y + LIFT, pz);
      outward.push(-gx / g, -gz / g, s);
    }
    reach.push(whole);
    rows.set(key, first);
    return first;
  };
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const o = j * w + i;
      let some = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) some += wet[o + b * w + a] as number;
      if (some === 0 || some === 9) continue;
      for (let b = 0; b < per; b++) {
        for (let a = 0; a < per; a++) {
          const ci = i * per + a;
          const cj = j * per + b;
          const x0 = AREA.minX + ci * FINE;
          const z0 = AREA.minZ + cj * FINE;
          const v00 = above(ci, cj);
          const v10 = above(ci + 1, cj);
          const v01 = above(ci, cj + 1);
          const v11 = above(ci + 1, cj + 1);
          // The four sides of the cell that the line may cross: south, north, west, east. A key names a side once for both cells that share it.
          const cut: number[] = [];
          if (v00 < 0 !== v10 < 0) cut.push(row((cj * across + ci) * 2, x0, z0, v00, x0 + FINE, z0, v10));
          if (v00 < 0 !== v01 < 0) cut.push(row((cj * across + ci) * 2 + 1, x0, z0, v00, x0, z0 + FINE, v01));
          if (v10 < 0 !== v11 < 0) cut.push(row((cj * across + ci + 1) * 2 + 1, x0 + FINE, z0, v10, x0 + FINE, z0 + FINE, v11));
          if (v01 < 0 !== v11 < 0) cut.push(row(((cj + 1) * across + ci) * 2, x0, z0 + FINE, v01, x0 + FINE, z0 + FINE, v11));
          for (let c = 0; c + 1 < cut.length; c += 2) {
            const p = cut[c] as number;
            const q = cut[c + 1] as number;
            const far = Math.min(reach[p / ROW.length] as number, reach[q / ROW.length] as number);
            for (let k = 0; k + 1 < far; k++) {
              // Two rows a step apart along the bank that stand at different heights have a ledge between them: no skin across it.
              if (Math.abs((places[(p + k + 1) * 3 + 1] as number) - (places[(q + k + 1) * 3 + 1] as number)) > 0.1) break;
              index.push(p + k, q + k, p + k + 1, p + k + 1, q + k, q + k + 1);
            }
          }
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(places), 3));
  g.setAttribute('aOut', new THREE.BufferAttribute(new Float32Array(outward), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
  g.computeVertexNormals();
  return g;
}

export const EDGE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vFace;
attribute vec3 aOut;
varying vec3 vOut;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vFace = normal;
  vOut = aOut;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Premultiplied: the alpha is how much of the rock's own light the wet takes away, the colour is what the wet mirrors and the froth.
export const EDGE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vFace;
varying vec3 vOut;
uniform float uSea;
uniform sampler2D tCarried;
uniform vec4 uFlowRect;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  // Metres above the still water: the skin's own height, which follows a ledge where the land map (a third of a metre a cell) cannot.
  float up = vWorld.y - uSea - ${LIFT.toFixed(3)};
  if (up > 0.32 || far > 170.0) discard;
  vec4 land = texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
  // Where the sheet is drawn (shaders.ts: the same ragged line). The sheet stops short of the rock by as much as its map is coarse: below
  // the water's level this skin is the water that reaches the rock, and under the sheet it is nothing.
  float depth = uSea - land.r;
  float ragged = depth < 0.2 ? vnoise(xz * 1.7) * 0.05 + vnoise(xz * 9.0) * 0.015 + 0.008 * sin(uTime * 1.7 + 9.0 * vnoise(xz * 0.9)) : 0.0;
  float sheet = smoothstep(0.0, 0.012, depth - 0.6 * ragged) * (1.0 - smoothstep(0.0, 0.012, up));
  // Most of the skin lies under the sheet or past its own inland end: nothing more is worked out there.
  if (sheet > 0.995 || vOut.z > 0.46) discard;

  vec3 face = normalize(vFace);
  face = face.y < 0.0 ? -face : face;
  // Which way the bank faces: out over the water.
  vec2 out2 = vOut.xy / max(length(vOut.xy), 1e-3);
  // Metres in from the waterline across the bank. The skin ends half a metre in, and what is on it ends before that.
  float inland = 1.0 - smoothstep(0.26, 0.46, vOut.z);

  // The swash: each stretch of bank on its own beat, quick up and slow back, a finger to a hand high. No two stretches lap together.
  float beat = uTime * 1.25 + 14.0 * vnoise(xz * 0.31) + 5.0 * vnoise(xz * 0.07 + 4.0);
  float lap = 0.5 + 0.5 * sin(beat + 0.7 * sin(beat));
  float rising = smoothstep(-0.2, 0.6, cos(beat + 0.7 * sin(beat)));
  float run = 0.003 + (0.008 + 0.022 * vnoise(xz * 0.8 + 3.0)) * lap;
  float film = 1.0 - smoothstep(run - 0.004, run, up);
  // Its front carries a line of froth up the rock and leaves it there in bits as it falls back.
  float bits = smoothstep(0.38, 0.62, vnoise(xz * 27.0) * 0.6 + vnoise(xz * 9.0 + 1.0) * 0.4);
  float front = smoothstep(run - 0.009, run - 0.003, up) * (1.0 - smoothstep(run, run + 0.003, up));
  // Froth gathers where the stream lays it against the bank: thick in the lee of a stone or a bar, none on a clean reach.
  vec2 fu = (xz + out2 * 0.7 - uFlowRect.xy) * uFlowRect.zw;
  float lee = min(textureLod(tCarried, fu, 0.0).g * 2.0, 1.0);
  float left = smoothstep(-0.02, -0.004, up) * (1.0 - smoothstep(0.004, 0.02 + 0.016 * lee, up))
    * smoothstep(0.62 - 0.35 * lee, 0.8, vnoise(xz * 1.3 + 2.0) * 0.45 + vnoise(xz * 6.0) * 0.3 + vnoise(xz * 31.0) * 0.25);
  float froth = clamp(front * bits * (0.25 + 0.75 * rising) + left * (0.3 + 0.7 * lee), 0.0, 1.0);

  // The rock the swash has been over stays wet a hand above the line, raggedly, and dries upward.
  float reach = 0.05 + 0.13 * vnoise(xz * 0.6 + 9.0) + 0.03 * vnoise(xz * 4.7);
  float wet = 1.0 - smoothstep(0.45 * reach, reach, up);

  vec3 v = toEye / far;
  // A wet face is the rock's own face smoothed by the film on it; the film itself lies level.
  vec2 grain = vec2(vnoise(xz * 13.0), vnoise(xz * 13.0 + 17.0)) - 0.5;
  vec3 n = normalize(mix(face + vec3(0.3 * grain.x, 0.0, 0.3 * grain.y), vec3(0.0, 1.0, 0.0), 0.8 * film));
  float nv = clamp(dot(n, v), 0.03, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02;
  r = normalize(r);
  float open = land.g * (1.0 - contactDrawn(vWorld));
  float sun = sunSeen(land, vWorld.y) * sunCloud(xz);
  vec3 skyUp = skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159;
  float rough = mix(0.3, 0.07, film);
  vec3 mirrored = mix(skyRadiance(r), skyUp, rough * rough) * open;
  // What is mirrored at the foot of a bank that faces the lens is the bank, not the sky: dark rock.
  float bank = smoothstep(0.1, -0.5, dot(r.xz / max(length(r.xz), 1e-3), out2)) * (1.0 - smoothstep(0.3, 0.9, r.y));
  mirrored = mix(mirrored, vec3(0.16, 0.14, 0.12) * skyUp * open, 0.85 * bank);
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 gloss = fresnel * mirrored + uSunColour * vec3(1.0, 0.8, 0.55) * (fresnel * min(sunLobe(n, v, rough), 14.0) * nl * sun);

  float skin = max(wet, film);
  vec3 colour = gloss * skin;
  float alpha = max(0.45 * wet, film * (0.3 + 0.7 * fresnel));
  // The film ends on the rock as the sheet does: it climbs it a hair and turns the sky away, a thin dark line.
  alpha = max(alpha, 0.55 * front);
  colour *= 1.0 - 0.7 * front;
  vec3 pale = vec3(0.62, 0.59, 0.52) * (skyUp * open + uSunColour * (0.22 * sun));
  colour = mix(colour, pale, 0.8 * froth);
  alpha = mix(alpha, 1.0, 0.8 * froth);
  // Above the wet the water has left its salts as it dried: a pale crust, a broken line a finger wide along the top of the wet.
  float crust = smoothstep(reach - 0.012, reach + 0.004, up) * (1.0 - smoothstep(reach + 0.012, reach + 0.045, up))
    * smoothstep(0.4, 0.6, vnoise(xz * 2.1 + 7.0) * 0.4 + vnoise(xz * 11.0) * 0.35 + vnoise(xz * 37.0) * 0.25)
    * (1.0 - smoothstep(0.1, 0.3, vOut.z));
  colour = mix(colour, pale, 0.55 * crust);
  alpha = mix(alpha, 1.0, 0.55 * crust);
  // Gone far off, where a hand of wet rock is less than a pixel.
  float keep = (1.0 - sheet) * inland * (1.0 - smoothstep(110.0, 170.0, far)) * (1.0 - uSolo);
  gl_FragColor = vec4(colour * keep, alpha * keep);
}`;
