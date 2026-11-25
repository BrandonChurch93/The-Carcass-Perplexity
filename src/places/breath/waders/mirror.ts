// The waders as the water mirrors them: a picture the waders folder draws before each sample and the water folder reads.
// It is the herd drawn upside down under the level of the water, seen by the same camera, at half the size of the frame.
import type * as THREE from 'three';

export const MIRROR: { texture: THREE.IUniform<THREE.Texture | null> } = { texture: { value: null } };
