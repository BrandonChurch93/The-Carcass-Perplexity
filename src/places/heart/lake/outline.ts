/** The outline of a plate that founders: its radius toward angle a, as a part of its size. The slab and the hole the lake cuts for it share it. */
export const OUTLINE_GLSL = /* glsl */ `
float founderOutline(float a, float seed) {
  return 0.86 + 0.1 * sin(a * 3.0 + seed) + 0.07 * sin(a * 5.0 + seed * 2.3) + 0.04 * sin(a * 9.0 + seed * 4.1);
}`;
export const outline = (a: number, seed: number): number => 0.86 + 0.1 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 5 + seed * 2.3) + 0.04 * Math.sin(a * 9 + seed * 4.1);
