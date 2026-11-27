/**
 * How every sheet of the ground is read. The software renderer shades four pixels together, and a screen derivative taken under a branch
 * (or a sheet read there without a level given) takes stale memory from the pixels that did not go that way: no frame then renders the
 * same twice. A read with explicit gradients cures that and is dear: at the wide key the land cost 3.2 s a sample with plain reads,
 * 6.3 s with textureGrad and no anisotropy (far more with it), and 3.5 s read this way.
 * So one level is taken from the lie of the surface across the screen, first thing in main and before any branch, and every sheet is
 * read at that level plus its own scale: `textureLod(t, uv, AT(texels across the sheet, metres across the sheet))`.
 * The level sits between the long and the short axis of the pixel's footprint, a little sharp along the line of sight: the samples of a
 * frame average what that lets through.
 */
export const LOD_GLSL = /* glsl */ `
float gLod;
void takeLod(vec3 dx, vec3 dy) {
  float major = max(max(dot(dx, dx), dot(dy, dy)), 1e-12);
  vec3 c = cross(dx, dy);
  float longAxis = 0.5 * log2(major);
  float shortAxis = 0.5 * log2(max(dot(c, c), 1e-24)) - longAxis;
  gLod = longAxis - min(1.3, 0.5 * (longAxis - shortAxis));
}
#define AT(texels, metres) (gLod + log2((texels) / (metres)))
`;
