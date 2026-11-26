// Thrown water: soft cards that face the lens, each placed anew from the time alone.
import * as THREE from 'three';
import { hash2 } from '../../../core/rng';
import { SPRAY_FRAGMENT, SPRAY_VERTEX } from './shaders';

export const rand = (a: number, b: number): number => hash2(a, b) / 4294967296;

export class Spray {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private used = 0;

  constructor(readonly count: number, uniforms: Record<string, THREE.IUniform>, fragment: string = SPRAY_FRAGMENT) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.at = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.at.setUsage(THREE.DynamicDrawUsage);
    this.look.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAt', this.at);
    g.setAttribute('aLook', this.look);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: SPRAY_VERTEX,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  begin(): void {
    this.used = 0;
  }

  put(x: number, y: number, z: number, size: number, alpha: number, seed: number, turn = 0, stretch = 1): void {
    if (this.used >= this.count || alpha <= 0.003) return;
    this.at.setXYZW(this.used, x, y, z, size);
    this.look.setXYZW(this.used, alpha, seed, turn, stretch);
    this.used++;
  }

  end(): void {
    this.geometry.instanceCount = this.used;
    this.at.needsUpdate = true;
    this.look.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
