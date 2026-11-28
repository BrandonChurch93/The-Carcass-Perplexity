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
// red: the bed, 0 the deepest basin and 1 a shoal; green: under a half bloom, over it silt; blue: under 0.45 the cold of the
// water, over 0.5 ice.
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
  c = mix(c, vec3(0.0036, 0.019, 0.036), ${(0.9 * SHELF_STRENGTH).toFixed(3)} * smoothstep(0.32, 0.6, depth));
  c = mix(c, vec3(0.014, 0.07, 0.078), ${(0.9 * SHELF_STRENGTH).toFixed(3)} * smoothstep(0.68, 1.0, depth));
  float cold = min(bedAt.b / 0.45, 1.0);
  c = mix(c, vec3(0.0058, 0.014, 0.0155), 0.7 * cold * cold);
  c += vec3(0.003, 0.02, 0.015) * max(1.0 - 2.0 * bedAt.g, 0.0) * (1.0 - 0.6 * cold);
  return mix(DEEP, c, seen);
}
// The silt of three rivers, carried by the current: pale tan where it is thick at the mouth, a grey green veil where it has thinned.
vec3 oceanSilt(vec3 bed, vec3 bedAt, float seen) {
  float silt = max(2.0 * bedAt.g - 1.0, 0.0);
  return mix(bed, mix(vec3(0.05, 0.08, 0.055), vec3(0.2, 0.15, 0.075), smoothstep(0.08, 0.6, silt)), 0.85 * smoothstep(0.0, 0.32, silt) * seen);
}
// (The blue of the air over the sea stands for the water's own scatter too: over a basin less of it comes back.)
float oceanAir(vec3 bedAt, float seen) {
  return 1.0 - 0.85 * seen * (1.0 - smoothstep(0.1, 0.32, bedAt.r));
}
// The other land and the ice, laid into the water after the sky and the sun are on it: neither takes the sun's image, so an island
// in the glint is darker than the sea round it. Lit by the light of the sheet (sun, sky, cloud shadow, moon) and by its own slope.
vec3 oceanOther(vec3 water, vec3 landAt, vec3 bedAt, vec3 light, vec3 glare, vec2 xz, float mu, float seen) {
  float height = clamp((landAt.b - 0.3) / 0.7, 0.0, 1.0);
  float isle = smoothstep(0.292, 0.312, landAt.b) * seen;
  vec2 slope = (landAt.rg - 0.5) * 3.2;
  float facing = (uSunDir.y - 1.6 * dot(slope, uSunDir.xz)) / sqrt(1.0 + 2.56 * dot(slope, slope));
  float lit = mix(1.0, clamp(facing / max(uSunDir.y, 0.2), 0.0, 2.2), 0.92);
  // (One geology with the body but another country: paler dun by the shore, green where it holds water, grey rock on the high
  // ground, a shade greener than the body's lowlands so that no piece of it is taken for a part of the body.)
  float mottle = vnoise(xz / 46.0 + 5.0);
  vec3 ground = mix(mix(vec3(0.165, 0.138, 0.084), vec3(0.074, 0.094, 0.054), smoothstep(0.35, 0.7, mottle)), vec3(0.07, 0.072, 0.058), smoothstep(0.12, 0.62, height));
  // (A strand of sand where the land comes down to the water: by day the coast is a lit line, under the bone's ivory.)
  ground = mix(ground, vec3(0.23, 0.185, 0.125), 0.7 * (1.0 - smoothstep(0.0, 0.07, height)));
  // (Surf where the open sea meets it, on some reaches and not on others.)
  float surf = smoothstep(0.262, 0.296, landAt.b) * (1.0 - isle) * smoothstep(0.3, 0.62, 1.0 - mottle) * seen;
  water = mix(water, vec3(0.6, 0.65, 0.68) * light / 3.14159, 0.5 * surf * surf);
  // (Under the moon the shelf is only a hint by the shore. The land is found by its own ground, grey and a little over the
  // sea's value, lighter on its heights: a glow of one colour over land and shelf alike read as a blot. No light stands on it.)
  float nightShelf = smoothstep(0.12, 0.29, landAt.b);
  water += vec3(0.008, 0.03, 0.036) * light / 3.14159 * nightShelf * nightShelf * uEmber.x * seen;
  // (The air over the sun's image is bright: land that stands in it is seen through that light, as the body is.)
  vec3 groundLit = ground * light * lit / 3.14159 + 0.4 * glare;
  vec3 groundMoon = ground * light / 3.14159 * (0.7 + 0.9 * height) * (0.75 + 0.5 * mottle);
  water = mix(water, mix(groundLit, 0.6 * water + 0.55 * groundMoon, uEmber.x), isle);
  // (The pack and the sheet on the far land: blue grey where it is thin and in its leads, blue white where it is thick, blue in
  // the shade of its own relief. Never the bone's ivory. Into the air of the planet's edge it goes bluer and dimmer.)
  float ice = smoothstep(0.52, 0.8, bedAt.b) * seen;
  vec3 pack = mix(vec3(0.155, 0.235, 0.3), vec3(0.28, 0.36, 0.45), smoothstep(0.7, 0.98, bedAt.b));
  pack *= mix(vec3(1.0), mix(vec3(0.5, 0.64, 0.84), vec3(1.0), clamp(lit, 0.0, 1.0)) * min(lit, 1.25), isle);
  pack *= mix(vec3(0.42, 0.56, 0.74), vec3(1.0), smoothstep(0.04, 0.3, mu));
  // (Under the moon it is a grey a little over the sea's and well under the cloud's.)
  return mix(water, pack * light * (1.0 - 0.93 * uEmber.x) / 3.14159 + 0.7 * uEmber.x * water, ice);
}
#endif
`;
