// The sea from orbit and what stands in it beside the body: the sea bed (basins, banks, shelves, the cold water by the ice, bloom
// along the currents), the other land (an island arc, low islands, a far coast under the planet's edge) and the pack ice. All of it
// is read from two maps baked by assets-src/reveal/land/ocean/make_ocean.py and is compiled only into the programs of the sheet
// that draw from orbit; below 640 km of half height every term here is exactly nothing, so the rise is as it was.
import * as THREE from 'three';
import { KM, X, Z } from '../shared/anchors';
import type { Context } from '../shared/context';

// The rectangle of the two maps in the master picture, px (make_ocean.py holds the same numbers).
const RECT = { x: -1800, y: -800, w: 9216, h: 5634 };
// How strongly the shelves and banks of the open sea take their paler colour: 1 as approved, lower is quieter.
export const SHELF_STRENGTH = 1.0;

export function oceanUniforms(ctx: Context): Record<string, THREE.IUniform> {
  return {
    uOceanBed: { value: ctx.assets.texture('land/ocean-bed.jpg', { kind: 'data', repeat: false }) },
    uOceanLand: { value: ctx.assets.texture('land/ocean-land.jpg', { kind: 'data', repeat: false }) },
    uOceanRect: { value: new THREE.Vector4(X(RECT.x), Z(RECT.y), 1 / (RECT.w * KM), 1 / (RECT.h * KM)) },
  };
}

// Needs DEEP, groundLevel, vnoise and the rig's uniforms declared before it. Rule 12 holds: both maps are read with textureLod at
// the footprint taken at the top of main.
export const OCEAN_GLSL = /* glsl */ `
#ifdef ORBIT
uniform sampler2D uOceanBed;
uniform sampler2D uOceanLand;
uniform vec4 uOceanRect;
float oceanSeen(float viewKm) {
  return smoothstep(640.0, 1150.0, viewKm);
}
// red: the bed, 0 the deepest basin and 1 a shoal; green: bloom; blue: under 0.45 the cold of the water, over 0.5 ice.
vec3 oceanBedAt(vec2 xz) {
  vec2 uv = clamp((xz - uOceanRect.xy) * uOceanRect.zw, 0.0, 1.0);
  return textureLod(uOceanBed, uv, groundLevel + log2(uOceanRect.z * float(textureSize(uOceanBed, 0).x))).rgb;
}
// red, green: the slope of the other land; blue: its height (over 0.3 land, under it how shallow the water by it is).
vec3 oceanLandAt(vec2 xz) {
  vec2 uv = clamp((xz - uOceanRect.xy) * uOceanRect.zw, 0.0, 1.0);
  return textureLod(uOceanLand, uv, groundLevel + log2(uOceanRect.z * float(textureSize(uOceanLand, 0).x))).rgb;
}
// What comes back from the water by its depth, as a reflectance: near black navy over the basins, the sea's own navy over the
// plains, a lighter blue over banks and rises, teal over the shoals; grey green where it is cold; and the bloom, a thin green.
vec3 oceanDeep(vec3 bedAt, float seen) {
  float depth = bedAt.r;
  vec3 c = mix(vec3(0.0004, 0.0016, 0.0048), DEEP, smoothstep(0.1, 0.32, depth));
  c = mix(c, vec3(0.003, 0.014, 0.027), ${(0.85 * SHELF_STRENGTH).toFixed(3)} * smoothstep(0.35, 0.62, depth));
  c = mix(c, vec3(0.014, 0.07, 0.078), ${(0.9 * SHELF_STRENGTH).toFixed(3)} * smoothstep(0.68, 1.0, depth));
  float cold = min(bedAt.b / 0.45, 1.0);
  c = mix(c, vec3(0.0058, 0.014, 0.0155), 0.7 * cold * cold);
  c += vec3(0.003, 0.02, 0.015) * bedAt.g * (1.0 - 0.6 * cold);
  return mix(DEEP, c, seen);
}
// (The blue of the air over the sea stands for the water's own scatter too: over a basin less of it comes back.)
float oceanAir(vec3 bedAt, float seen) {
  return 1.0 - 0.85 * seen * (1.0 - smoothstep(0.1, 0.32, bedAt.r));
}
// The other land and the ice, laid into the water after the sky and the sun are on it: neither takes the sun's image, so an island
// in the glint is dark in the light. Lit by the light of the sheet (sun, sky, cloud shadow, moon) and by its own slope.
vec3 oceanOther(vec3 water, vec3 landAt, vec3 bedAt, vec3 light, vec2 xz, float seen) {
  float height = clamp((landAt.b - 0.3) / 0.7, 0.0, 1.0);
  float isle = smoothstep(0.292, 0.312, landAt.b) * seen;
  vec2 slope = (landAt.rg - 0.5) * 3.2;
  float facing = (uSunDir.y - 1.6 * dot(slope, uSunDir.xz)) / sqrt(1.0 + 2.56 * dot(slope, slope));
  float lit = mix(1.0, clamp(facing / max(uSunDir.y, 0.2), 0.0, 2.2), 0.92);
  // (The body's own lowland colours, muted: dun plain by the shore, olive where it holds water, dark rock on the high ground.)
  float mottle = vnoise(xz / 46.0 + 5.0);
  vec3 ground = mix(mix(vec3(0.13, 0.1, 0.07), vec3(0.07, 0.076, 0.05), smoothstep(0.35, 0.7, mottle)), vec3(0.056, 0.05, 0.046), smoothstep(0.12, 0.62, height));
  // (Surf where the open sea meets it, on some reaches and not on others.)
  float surf = smoothstep(0.262, 0.296, landAt.b) * (1.0 - isle) * smoothstep(0.3, 0.62, vnoise(xz / 19.0 + 31.0)) * seen;
  water = mix(water, vec3(0.6, 0.65, 0.68) * light / 3.14159, 0.5 * surf * surf);
  // (By night the land is a shade on the sea, no more: no light stands on it.)
  vec3 groundLit = ground * light * lit / 3.14159;
  water = mix(water, mix(groundLit, 0.6 * water + 2.2 * groundLit, uEmber.x), isle);
  // (The pack: blue grey where it is thin and in its leads, blue white where it is thick. Never the bone's ivory.)
  float ice = smoothstep(0.52, 0.8, bedAt.b) * (1.0 - isle) * seen;
  vec3 pack = mix(vec3(0.2, 0.3, 0.37), vec3(0.5, 0.57, 0.62), smoothstep(0.7, 0.98, bedAt.b)) * (0.9 + 0.2 * vnoise(xz / 31.0 + 9.0));
  // (Under the moon it is a grey no brighter than the cloud.)
  return mix(water, pack * light * (1.0 - 0.6 * uEmber.x) / 3.14159, ice);
}
#endif
`;
