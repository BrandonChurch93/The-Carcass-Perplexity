# The Spine: ground, light and air. Hand-over at version 3, wave 3 (last owner)

Owner: spine_ground_owner_3. Folders: `src/places/spine/` root, `shared/`, `land/`, `air/`. Partner folders (strikes, kites, runners) are not described here.

## How each part is drawn

- **land** (`ridge.ts`, `land/height.ts`, `land/meshes.ts`, `land/shaders.ts`, `land/index.ts`). One layout in `ridge.ts`; a baked height field; crest strip, flanks, one blade mesh a spire, a tube for the canal, a floor mesh, icicles, stones, and a crag (spine-04 only). One shader source compiled by `KIND` (0 ground, 1 spire, 2 canal), drawn after a depth pass of its own.
  Spire: relief in the mesh (`spireMesh`): the sheet's relief, upright plates of unequal breadth (64 by 21 m), beds across them (52 by 14 m), blocks (23 by 8 m); the windward edge is broken by `rag`, the lee edge and the tip keep their line for the kites. Colour is the sheet from `mat/` far off and true-size tiles close to, on three planes by world position, finer near the lens. Rime is the frost picture at 3 m: whole to windward, in cracks (`pit`) and on ledges in the lee.
  Ground: wind crust from the crust photograph on three planes, rock ribs down the fall, thin snow by the dead one; the burn under the dead one (`SCORCH`) is compiled in for spine-03 only.
  Canal: rock on three planes at 7 m with slabs at 19 m, rime round each mouth, icicle meshes, a floor mesh (`ICE_FRAGMENT`) that is broken, mirrors the far mouth and banks into snow; light is the two mouths (`WINDOW_GLSL`) with falloff.
- **sky** (`air/sky.ts`). A dome from `mat/far.jpg`, `stormwall.jpg`, `stormwall-lit.jpg`, flowing (two copies half a period apart); six far spires drawn on the dome toward the dusk; for spine-04 the plate `mat/strikesky.jpg` (`plateAt`, `plateCloud`) with three dark fins.
- **air, cloud, cloud-sea, spindrift** (`air/volume.ts`, `air/index.ts`). One pass at half size over the land's depth: sea of cloud (billows from a height function, tone by number, the plate's own sea behind the long lens), storm air, spindrift on the ground, plumes off crests, veil in bands, scud, flecks, steam and breath.
- **light** (`shared/glsl.ts`, `shared/rig.ts`). Sky irradiance by normal (computed once in `rigShade`), a warm key from the dusk, up to 8 emitters with a soft ceiling. `strikeGlow` sums small lights (radius under 20) apart as a tip bloom: violet white, ceiling 0.6, within about 25 m. `cloudLit` is by metres from the light, not by angle.

## Tried, and not worth trying again

- The two lists before this one stand (see the history of this file).
- A noise map in place of `vnoise` in the ground shader: dearer (land 11.42 against 10.0 s alone).
- Taking `landHollow` out, or compiling the plate out of the air: no gain; branches not taken do skip.
- An aperture of 0.013 on `keyCarcass`: the red measure of spine-1 falls to 0.30. It is 0.004.
- The air's glow at its full ceiling behind the long lens: the frame washes to pale violet. It is a fifth there.
- Upright plates alone on a spire, all of one breadth: a curtain. Beds cross them now.
- Crest plumes at 1.7 times the sky and 0.9 thick: flat white lenses beside the spires. They are 0.95 and 0.32 now.
- A sea of cloud free to heap beside the ridge: a head rolls over the crest and hides a spire for a quarter of a second.

## Round 15, each issue on these folders in the critics' words, and what was done

- spine-0. "smeared, wobbly procedural skin ... melted clay ... combed fur", "stretched and smeared vertically": three planes by world position, tiles finer near the lens, relief in the mesh as plates and beds, snow from the crust photograph; sastrugi not reached. "warm low sidelight ... missing": rock is tan under a warm key, but no dark face against a lit one. "smooth curved horns ... hazy grey slope of terrain", "flat, uniform grey-purple silhouette cutouts", "flat, sharp-edged 2D layered cards": six far spires on the dome as leaning shaded blades; the sea rebuilt as a billowed deck toned by number; plumes thinned. "no spindrift ... the storm feels static": spindrift, plumes and veil are there; the veils of snow at left are not. "flat blue-black cutout ... no depth or rock lip; the line of footprints", "near-black void with a soft fuzzy border": not reached. "uniform lavender-grey", "smooth, featureless horizontal streaks": storm masses pressed dark, dusk band kept; the left sky is still soft.
- spine-1. "smooth, glossy grey-blue sheet like plastic", "sharp, straight horizontal seam ... waxy": crust on three planes, seam gone, burn under the body (reads near water). "pale, ghostly ... ice sculpture": lens aperture 0.004 on the body; the spire is still rimed white. "faint reddish patch": sky gain +1.3 there; the band is small. "no blowing snow ... no shallow depth of field": veil, scud, flecks, aperture. "the line of tracks": not made.
- spine-2. "comb-like stripe artifacts and no relief", "rectangular mesh/texel grid": relief in the mesh, finer tiles by level, rime in cracks and on ledges; no hoarfrost feathers. "far jagged peaks, the cloud sea and the violet lightning are all gone": the sea shows low right; far spires are small at the horizon. "no rain, drips, mist": not reached.
- spine-3. "the blizzard is gone": plate sky and sea, veil 0.2; driven snow still thin. "the strike lights nothing": wet dark spire, tip bloom in `strikeGlow`. "sharp curved horn ... rounded snow humps ... row of similar cones": crag out of focus at left, three dark fins where the picture has them; the ridge falling right is not made. "flat, even lilac-blue wash": the plate. "smooth CG shell with tiled noise", "smooth clay-like silhouette": plates, beds, broken windward edge. "sharp, ragged cutout edges": the half-size air's edge remains.
- spine-4. "flatly and evenly lit ... no wet sheen", "lifts a broad area of the interior at once": light and flash enter by the two mouths with falloff. "the outside lacks the storm ... low jagged range": flecks and veil beyond the mouth; the landform is unchanged. "fuzzy brushed texture like fur ... clean tube", "smooth tubular cave surface": rock on three planes with slabs, irregular mouth; still fibrous, not ribbed. "flat, smooth blue plane ... straight edge", "ruler-straight horizontal line": a broken floor mesh banked into snow. "uniform, semi-opaque blue-grey cones": not reached. "generic warm reflection streak ... too little intervening air": veil 4 outside; the streak remains.
- Motion. "the cloud banks barely change shape or position": the dome flows on eddies and the sea rolls at 38 to 74 m a second; 94% of spine-0 moves by the measure, slowly.

## Still wrong beside the approved pictures, worst first

- **spine-0**: the first spire is still a leaning cone more than a blade with one dark and one lit face; the mouth is a dark arch without a rock lip; no line of prints; the ridge snow is crust, not sharp sastrugi; the sea at right is paler than the picture (about 120 against 88).
- **spine-4**: walls are fibrous rock, not ribbed, water-worn bone-rock; the floor mirrors too little; outside is not one tall spire over a snowfield.
- **spine-2**: rime is in cracks and on ledges but reads mottled, not as hoarfrost feathers; no far spires or strike behind the face from this lens.
- **spine-3**: the windward edge of the spire is scalloped in soft lobes; the crag is a dark blur with dim snow; the sea is the plate's and nearly flat.
- **spine-1**: the burn reads close to water; no trail of prints; the spire is rimed white where the picture has tan rock in shallow focus.
- Motion: between flashes the cloud flows slowly; the sea rolls but does not pour.

## Staged by shot (all by `stagedSeconds()`)

- spine-05: `uUnder` 40, far canal end open, warm key 0.08, flecks only beyond the mouth, veil 4, flash by the mouths.
- spine-04: the crag on set; strike plate sky with three far fins (plate compiled in for this shot only); bloom 0.085; wall turn 0.572; veil 0.2; air glow a fifth; plumes a quarter; wet dark spire (`uWet`: rime off, snow on lee ledges only, rock albedo 0.3, rough 0.3).
- spine-03: veil 0.22, neutral sky light, warm key 0.3, sky gain +1.3, scud, snow held 3.5 m off the dead one, lens aperture 0.004 focused on `carcassBody`, burn compiled in.
- Elsewhere: warm key 0.75, veil 1, no scud.

## Cost at 3840 x 2160, seconds a sample (cost tool, draft, frame 7234, one sample)

- Received: whole 15.2 (15.74 by my first run), land 7.46 above the empty frame. Left: whole 16.94, land 9.95 alone and 6.17 above the empty frame, sky alone 3.78. The place is 1.7 s over what it received; the land itself is under.
- Land's colour is about 7 s of the frame: lays 1.9, snow, sheet and rime 3.2, `rigShade` 2.2 (emitter loop 0.55). Land with a flat colour is 2.9; sky alone (dome and all air) about 4.0.
- What is neither land alone nor sky alone is about 7 s of the whole frame: the air over the land and the partner's parts together; the tool does not take those part names, so it is not split here.
- Runs before it on the same hour: 17.04, 17.50. The tool varies by about 0.4.

## What I would do next, in order

1. Cost: the ground's side lays only where `top < 0.85`; cull emitters of no radiance on the CPU in `shared/rig.ts`; skip `domeAir` where no storm air or veil uses it; then measure the air over the land by hiding it.
2. spine-0: the first spire as a blade (a thinner section in `fin`, told to the kites' owner), a rock lip at the mouth, prints as dents in the ground mesh.
3. spine-4: ribs in the canal shell's mesh within 30 m of the lens; a wetter floor.
4. spine-2: hoarfrost as small meshes along the windward edges.

## Checks at hand-over

- `tsc` and the build are clean; `npm run -s determinism` prints `determinism: pass`; gate G10 of phase 1 passes; M1, M2, M3 green at draft (M3 1.24, 1.27, 2.24, 0.94, 1.15); five keys rendered at the final tier in hd and all five shots watched as sheets, no `ERROR`.
- The sheet of spine-03 showed a billow of the sea standing over the crest at frames 7540 to 7546 as a dark hill before the spire: `seaTop` is capped beside the ridge now. Watch every sheet again after any change to the sea.
