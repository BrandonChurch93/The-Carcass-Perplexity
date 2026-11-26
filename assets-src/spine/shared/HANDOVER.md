# The Spine: ground, light and air. Hand-over at version 3 of Phase 4, wave 2

Owner: spine_ground_owner_2. Folders: `src/places/spine/` root, `shared/`, `land/`, `air/`. Partner folders (strikes, kites, runners) are not described here.

## How each part is drawn

- **land** (`ridge.ts`, `land/height.ts`, `land/meshes.ts`, `land/shaders.ts`, `land/index.ts`). One layout in `ridge.ts`; a baked height field; crest strip, flanks, one blade mesh a spire, a tube for the canal, a floor, icicles, stones. One shader source compiled three times by the define `KIND` (0 ground, 1 spire, 2 canal).
  A spire is its sheet from `mat/` (tower, stump, horn) projected by world position: far off the sheet is the picture (`massed`); close to (`near`, by texels a pixel) the rock is the true-size tiles (`ledge` at 40 m for beds and ledge snow, spire at 30 m, rubble at 5 m), toned by the sheet (`crag`). Every lay is one read on the dominant plane at a computed level (`lodOf`, `lay`), inside a real branch.
  Ground: snow picture, rock ribs through it on gentler ground, thin snow with wet stones within 30 m of the dead one, 90 stone meshes with drift tails and two drift banks there (`stones()` in `land/meshes.ts`).
  Canal: walls of rock with the rime picture, icicle meshes at the far lip, floor (`ICE_FRAGMENT`) from `mat/icefloor` laid once across with a melt water run down the middle that mirrors the far mouth and snow banked at both walls. Light inside is the two mouths (`WINDOW_GLSL`), the far one a little warm.
  Beyond the far mouth (`ground()` in `ridge.ts`, past `EXIT + 6`) the floor breaks into a gully to the lee and a snow shoulder to windward.
- **sky** (`air/sky.ts`). A dome from `mat/far.jpg`, `stormwall.jpg` and `stormwall-lit.jpg`; the storm masses are lit from inside by each emitter (`cloudLit`, saturating) and by `uFlash`.
- **air, cloud, cloud-sea, spindrift** (`air/volume.ts`, `air/index.ts`). One pass at half size over the land's depth: sea of cloud, storm air, spindrift on the ground hit (broad streaks, and snakes a pace wide within 90 m of the lens), plumes off crests, a veil in bands, scud, flecks before the lens at six depths, steam and breath from `ctx.sources.steam` (first eight; radius under 1 m is breath).
- **light** (`shared/glsl.ts`, `shared/rig.ts`). Sky irradiance by normal, a warm key from the dusk band, the partner's emitters (four a strike) with a soft ceiling `e / (1 + lum / 0.8)`; `uFlash` is summed from the emitters each frame, so it has their tail.

## Tried, and not worth trying again

- The first owner's list stands: jittered marched storm volume; fixed-size glow pool; storm wall following the ridge bend; lee wall steeper than 61 degrees; broad roots under a knife crest; Heart cliff maps; drawn ripples and cracks; canal picture round or along the canal at 4 m.
- The relief pictures (`-h.png`) at full strength on a spire: a clay model. They are at 0.2 far off and the tiles' own normals close to.
- One unconditional lay in place of three gated ones: dearer (5.18 against 4.80 s at hd). A ternary with a texture read on each side pays both.
- Emitter light without a ceiling: with four emitters a strike the struck spire is white plaster.
- A soft edge on the sea of cloud against the sky, by looking a little further down the ray: it cures the stepped edge in the long lens and opens holes in the sea in the wide. Taken out.
- Scud as small pale blotches over everything past 120 m: a dirty screen. It is long bands past 350 m now.
- A warm share of 0.6 in the far mouth's light: the whole canal goes brown. It is 0.2.
- A snow shoulder 17 m high beyond the far mouth: it fills the mouth. It is 5 m, and the far spire's head shows over it.

## Round 9, the order given, each issue in the critics' words, and what was done

1. "no texture pulled long over any face of rock, snow, cave wall or floor, and no two spires alike". Spires: sheets by world position, three sheets, tiles at true size close to ("one dark copper-mottled plane", "stretched and smeared along the slope", "soft, blurred, low-resolution pattern of brown blotches": spine-2 is now a jointed crag with snow in the cracks). "Exposed rock is broadly pale and tan": far rock let down to dark, snow kept. "faceted low-poly geometry with one stretched mottled texture": ribs of rock through the snow on the mounds. "every spire on the ridge is the same model": three sheets, flips and shears; still alike in the long lens. Not reached: "a near rock wall into the left foreground" of spine-3; "a heavier broken profile and benching" of the first summit.
2. "the storm lit from within by each strike, with the ridge, the snow and the cave taking the flash". "a pure white bolt that lights nothing", "do not illuminate the surrounding ridge, clouds, or cave interior": cloud glow per emitter, emitter light on rock and snow with a ceiling, `uFlash` on the sky seen from the canal and in its floor. "the lightning outside casts no flash onto the cave walls": walls take `uFlash` through the mouths' light only weakly; not judged in motion.
3. "the storm cloud and the cloud sea moving, with air between the far peaks". "completely frozen across multi-second shots": storm masses and the sea drift; veil bands drift; scud is staged in spine-03 only. "no air between it and the camera": the veil thickens with distance. "the scene goes still" (spine-03): snakes of snow along the ground and scud; the motion look counts 21% (was 10%).
4. "the canal: slabs, ice, icicles and a floor that is not a ringed sheet". "A smooth oval tunnel with continuous warm puckered texture": rime and icicles, cold light; no slabs as geometry. "A uniform dark rippled surface with repeated orange ring highlights", "the reflection reads as a tiled pattern": one plate, melt water run, banks. "a level dark expanse with thin horns and a smooth horizon": gully and shoulder. "flat, pure black shapes" (the mouths from outside): not reached.
5. "the snow as wind-packed drift with prints, not smooth blankets". "smooth, blobby, repeated lumps", "A nearly level sheet with horizontal bands": thin snow, wet stones, drift banks and stone tails by the dead one. Prints near the dead one and "deep distinct steps": not reached.

## Still wrong beside the approved pictures, worst first

- **spine-3**: the struck spire is still paler than the dark fractured rock of the picture; no near crag at the left edge; the sea of cloud has a stepped edge behind the spires (half-size pass).
- **spine-4**: walls are mottled rock with rime specks, not rime in fibres; the shoulder outside is a rocky ridge more than a snow slope and hides the foot of the far spire; no boulder on the floor.
- **spine-1**: no trail of prints leading in; the snakes of snow cross the near paw.
- **spine-2**: no far spires standing out of the cloud beyond the face.
- **spine-0**: grooves down the hero face; the mouth is a dark arch.

## Staged by shot (all by `stagedSeconds()`)

- spine-05: spindrift and lens flecks off; `uUnder` 40 and the far canal end open; warm key 0.08; veil 0.6.
- spine-04: storm wall turned 0.77 rad; veil 0.36.
- spine-03: warm key 0.3; sky light and dome gain 2.3 (dome 1.3 stops); spindrift held 3.5 m off the body (snakes 2 m); scud on.
- Elsewhere: warm key 0.75, veil 1, no scud.

## Cost at 3840 x 2160, seconds a sample (cost tool, draft, frame 7234, one sample)

- Version 2: whole 21.65, land 14.37, sky 1.84. Version 3: whole 15.15, land 7.46, sky 1.90 (15.63, 7.37, 1.81 on the run before; the tool varies by about 0.5). The aim of 7 is not met.
- Where the land's time went: texture reads (about 0.2 microseconds each a pixel on this machine). What is left at hd: about 1.1 s in vertices and the depth pass, 0.6 s in `rigShade`, the rest in reads.

## What I would do next, in order

1. Canal walls as slabs: displaced geometry within 30 m of the lens, rime as fibres from `mat/rime` along the hang.
2. A crag mesh at the left edge of spine-3 and the struck spire's rock held dark away from the strike.
3. Prints as dents in the ground mesh by the dead one and along the trail.
4. Far spires in the gap of spine-2: raise spires 6 to 9 or move the lens.
5. Land cost: halve the hero spire's mesh (400 x 280) and read the rig's sky once a vertex.

## Checks at hand-over

- `tsc` and the build are clean; `npm run -s determinism` prints `determinism: pass`; gate G10 of phase 1 passes; no `ERROR` in the five keys at 3840 x 2160 draft.
