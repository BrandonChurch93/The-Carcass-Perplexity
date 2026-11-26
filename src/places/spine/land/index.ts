// The land of the Spine: the knife ridge and its flanks, the spires, and the canal through the first of them.
// height.ts is its shape, meshes.ts what is built on that shape, shaders.ts its rock and snow.
import * as THREE from 'three';
import { FIRST, finAxes, first, sheetMap, spires, type Spire } from '../ridge';
import { SHEETS, type SheetData } from '../shared/sheets';
import type { Context, Piece } from '../shared/context';
import { CARCASS, RAD, WIND, carcassAxis, carcassBody, carcassView, step } from '../shared/anchors';
import { canalFloor, canalShell, crestStrip, flanks, hollow, icicles, reliefDepth, spireMesh, stones } from './meshes';
import { height } from './height';
import { ICE_FRAGMENT, ICE_VERTEX, ICICLE_FRAGMENT, ICICLE_VERTEX, LAND_DEPTH_FRAGMENT, LAND_FRAGMENT, LAND_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['land'];

/** Draw the land's depth first and its colour only where it shows. Off, every fragment of every triangle is shaded, hidden or not. */
const DEPTH_FIRST = true;
/** How many taps the rock pictures take along a grazing face. 4 is the better picture on ground seen at a low angle; 1 is the cheap one. */
const ANISOTROPY = 1;

export function create(ctx: Context): Piece {
  ctx.rig.setLand(height, hollow);
  // The burned rock lies under the dead one, a little toward the lens of its shot.
  const scorchAt = step(carcassBody, carcassView + 180, 0.2);

  const picture = (name: string): { value: THREE.Texture } => ({ value: ctx.assets.texture(`mat/${name}.jpg`, { anisotropy: ANISOTROPY }) });
  const data = (name: string): { value: THREE.Texture } => ({ value: ctx.assets.texture(`mat/${name}-nh.png`, { kind: 'data', anisotropy: ANISOTROPY }) });
  // The height of the frame being drawn, in pixels: read from the renderer as each mesh is drawn.
  const tall = { value: 1080 };
  const size = new THREE.Vector2();
  const pictures = {
    tSpire: picture('spire'),
    tSpireNh: data('spire'),
    tLedge: picture('ledge'),
    tLedgeNh: data('ledge'),
    tRubble: picture('rubble'),
    tRubbleNh: data('rubble'),
    tSnow: picture('snow'),
    tSnowNh: data('snow'),
    tCanal: picture('canal'),
    tCanalNh: data('canal'),
    tRime: picture('rime'),
    // The dome's own pictures, for what is seen of the sky from inside the canal: in the ice of the floor, in the glaze on the rock.
    tSkyDusk: { value: ctx.assets.texture('mat/sky.jpg', { repeat: false }) },
    tStormWall: { value: ctx.assets.texture('mat/stormwall.jpg', { repeat: false }) },
    tScorch: { value: ctx.assets.texture('mat/scorchfield.jpg', { anisotropy: ANISOTROPY, repeat: false }) },
    tScorchH: { value: ctx.assets.texture('mat/scorchfield-h.png', { kind: 'data', anisotropy: ANISOTROPY, repeat: false }) },
    uTall: tall,
    uScorch: { value: new THREE.Vector4(scorchAt[0], scorchAt[2], 0, 0) },
    uScorchAxes: { value: new THREE.Vector4(Math.cos(carcassAxis * RAD), Math.sin(carcassAxis * RAD), Math.cos(carcassView * RAD), Math.sin(carcassView * RAD)) },
  };
  // The feature sheet a spire is cut from, and where the spire stands on it. The ground has the first spire's: the rock over the mouth is that spire's foot.
  const sheetOf = (sp: Spire): Record<string, THREE.IUniform> => {
    const name = (SHEETS[sp.sheet] as SheetData).name;
    const axes = finAxes(sp);
    return {
      tSheet: { value: ctx.assets.texture(`mat/${name}.jpg`, { anisotropy: ANISOTROPY, repeat: false }) },
      tSheetH: { value: ctx.assets.texture(`mat/${name}-h.png`, { kind: 'data', anisotropy: ANISOTROPY, repeat: false }) },
      uSheet: { value: new THREE.Vector4(sp.x, sp.z, axes.ax, axes.az) },
      uSheetMap: { value: new THREE.Vector4(...sheetMap(sp)) },
      uSheetDepth: { value: reliefDepth(sp) },
      uSheetShear: { value: sp.shear },
    };
  };
  const material = (kind: number, side: THREE.Side = THREE.FrontSide, sp: Spire = first): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_FRAGMENT,
      defines: { KIND: kind },
      uniforms: { ...ctx.rig.uniforms, ...pictures, ...sheetOf(sp) },
      side,
      toneMapped: false,
      // The depth is already there (see LAND_DEPTH_FRAGMENT): colour is shaded only where this is the nearest surface.
      depthFunc: DEPTH_FIRST ? THREE.EqualDepth : THREE.LessEqualDepth,
      depthWrite: !DEPTH_FIRST,
    });
  const depthMaterial = (kind: number, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_DEPTH_FRAGMENT,
      defines: { KIND: kind },
      uniforms: { ...ctx.rig.uniforms, ...pictures },
      side,
      toneMapped: false,
      colorWrite: false,
    });
  const depthOf = new Map<THREE.Material, THREE.ShaderMaterial>();
  const groundMaterial = material(0);
  const spireDepth = depthMaterial(1, THREE.DoubleSide);
  const spireMaterials = spires.map((sp) => material(1, THREE.DoubleSide, sp));
  const wallMaterial = material(2, THREE.DoubleSide);
  const iceMaterial = new THREE.ShaderMaterial({
    vertexShader: ICE_VERTEX,
    fragmentShader: ICE_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tIce: { value: ctx.assets.texture('mat/icefloor.jpg', { anisotropy: 4, repeat: false }) },
      tIceH: { value: ctx.assets.texture('mat/icefloor-h.png', { kind: 'data', repeat: false }) },
      tSkyDusk: pictures.tSkyDusk,
      tStormWall: pictures.tStormWall,
    },
    toneMapped: false,
  });

  const icicleMaterial = new THREE.ShaderMaterial({
    vertexShader: ICICLE_VERTEX,
    fragmentShader: ICICLE_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tSkyDusk: pictures.tSkyDusk, tStormWall: pictures.tStormWall },
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const land = new THREE.Group();
  const made: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry, m: THREE.Material): void => {
    made.push(geometry);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.frustumCulled = false;
    mesh.onBeforeRender = (renderer): void => {
      const target = renderer.getRenderTarget();
      tall.value = target ? target.height : renderer.getDrawingBufferSize(size).y;
    };
    land.add(mesh);
    const first = depthOf.get(m);
    if (first) {
      const depth = new THREE.Mesh(geometry, first);
      depth.frustumCulled = false;
      depth.renderOrder = -10;
      land.add(depth);
    }
  };
  if (DEPTH_FIRST) {
    depthOf.set(groundMaterial, depthMaterial(0));
    for (const m of spireMaterials) depthOf.set(m, spireDepth);
    depthOf.set(wallMaterial, depthMaterial(2, THREE.DoubleSide));
  }
  add(crestStrip(), groundMaterial);
  add(flanks(), groundMaterial);
  spires.forEach((sp, i) => add(spireMesh(sp, ctx.rng(`land/spire-${i}`), i === FIRST ? 2 : i >= FIRST - 1 && i <= FIRST + 3 ? 1 : 0), spireMaterials[i] as THREE.ShaderMaterial));
  // The stones about the dead one, each with its tail of drift; the body lies in a bank drifted against its windward side, with a
  // longer tail in its lee. The lens of that shot and the body itself are kept clear.
  const lens = step(carcassBody, carcassView + 180, 3.1);
  const gale: [number, number] = [WIND[0] / Math.hypot(WIND[0], WIND[2]), WIND[2] / Math.hypot(WIND[0], WIND[2])];
  add(
    stones(
      ctx.rng('land/stones'),
      [CARCASS[0], CARCASS[2]],
      [
        [carcassBody[0], carcassBody[2], 1.5],
        [lens[0], lens[2], 2.2],
      ],
      gale,
      [
        { at: [carcassBody[0] - gale[0] * 0.3, carcassBody[2] - gale[1] * 0.3], along: [-gale[0], -gale[1]], long: 2.2, wide: 0.9, high: 0.13 },
        { at: [carcassBody[0] + gale[0] * 0.25, carcassBody[2] + gale[1] * 0.25], along: gale, long: 4.5, wide: 0.95, high: 0.2 },
      ],
    ),
    groundMaterial,
  );
  add(canalShell(ctx.rng('land/canal-wall'), 0), wallMaterial);
  add(canalFloor(), iceMaterial);
  add(icicles(ctx.rng('land/icicles')), icicleMaterial);
  ctx.scene.add(ctx.parts.built('land', land));

  return {
    dispose: () => {
      for (const g of made) g.dispose();
      groundMaterial.dispose();
      for (const m of spireMaterials) m.dispose();
      wallMaterial.dispose();
      for (const m of new Set(depthOf.values())) m.dispose();
      iceMaterial.dispose();
      icicleMaterial.dispose();
    },
  };
}
