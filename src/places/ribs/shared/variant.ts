// The software renderer the film is drawn with works out both sides of every branch, for every pixel, and the body of a loop once
// even where it is never entered: a test on a uniform saves nothing. What a frame has no use for is left out of the program itself,
// by a name the shader text asks for with #ifdef. Each name is told from the same uniforms the shader's own test reads, so a frame
// is the same frame with the name or without; a program is made once for each set of names and kept by the renderer.
import * as THREE from 'three';

export function variant(material: THREE.ShaderMaterial, names: Record<string, boolean>): void {
  const wanted = Object.keys(names).filter((name) => names[name]);
  const have = material.defines as Record<string, number>;
  if (wanted.length === Object.keys(have).length && wanted.every((name) => have[name] === 1)) return;
  material.defines = Object.fromEntries(wanted.map((name) => [name, 1]));
  material.needsUpdate = true;
}
