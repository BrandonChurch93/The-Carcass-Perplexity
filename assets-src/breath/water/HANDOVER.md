# The Breath: sea, gill-plumes, waders, dead-wader. Hand-over after version 3 (wave 3)

Owner until 08:46 UTC, 26 November 2026: breath_life_owner_3, branch `agent/breath-life-3`. Folders under `src/places/breath/`:
`water/`, `plumes/`, `waders/`, `dead/`. Pictures: `public/assets/breath/{plumes,dead,mat}/`, recipes under `assets-src/breath/`.

## What is drawn, part by part
- sea (`water/index.ts`, `shaders.ts`): one sheet at the sea level, now a graded grid of 200 by 200 (fine at the shaft). The body of the
  shader is `water()`, called only where the rig's land says there is water. Mirror of the sky times `drawn` (the tilt of each face to the
  lens), discrete hard sun glints (`hard`) and spark cells that live a fifth of a second, land mirrored in two steps, the waders' image
  (`tMirror`) and rings (`tRings`). `high` (staged, shot breath-01: green body from 8 cm of depth, no warm tint), `glint` (in that shot, eye over 5 to 9 m:
  a broad field of glints) and `low` (eye under 3 to 7 m: softer `drawn`, stronger image of the animals).
- gill-plumes (`plumes/fronds.ts`, `shaders.ts`, `index.ts`): grown fronds (22 mains on a close bush, side sprays, `mound`, `weep`,
  `tidy`), ragged ribbons cut by `tFrondBA` with threads from `tFrondA`, pale holdfast lumps. Far bushes are lifted by pixel size
  (`farLift`: lighter albedo, more through-light, a shallower heart).
- waders (`waders/*`): one skin over the bones; per animal tone, veins, creases; rings in packets with their own wave numbers
  (`ripples.ts`). The one at the rim is a build of its own (`stocky` in `herd.ts`): shorter, deeper, back arched, tuft on the rock.
- dead-wader (`dead/*`): unchanged in kind: the picture `mat/carcass-low.jpg` set on rays from the breath-05 key lens. Wavy fan strands.

## Honest comparison, worst first, by key
1. breath-2: the plumes are red now but each frond is still a fir branch with a hard edge; the picture has soft heaps of fine thread.
   The dead wader is a picture on rays from one lens: it has no bulk and cannot be given any without a new model. Not done.
2. breath-4: fronds hang from the top left now, but thin and sparse, no drops, a stray one near the middle of the top edge.
3. breath-0: the channel is green-grey where deep and pale where thin; the sun's path at the upper left is still weak.
4. breath-1: reads as a mirror with the animals' images; glints sparser than the picture; no splash crowns; left edge under the sun dim.
5. breath-3: holds (red share 0.238 against 0.276).

## Round 14, severe and major, word for word, and what was done
- S1 "reflections and ripples drop out for single frames 5249, 5344 (breath-04)": found with the ground owner's help. The sheet was one
  quad 16 km wide; at some lens places its depth came out a hand too deep and the bed stood through it. Now a grid; frame 4357 has water.
- S2 "rim wader frozen in breath-05 and held breath-0; tendrils, bushes, water motionless": the rim wader lifts its neck 0.9 s after the
  key (staged), habit sway, weight shift; M2 green on all keys (22 to 57 percent of the picture moves).
- S3 "centre neck vertical not low forward arch; left animal inset not cropped; right dips to bank; brush ends not splayed": not done.
- S4 "left glare then dark placid grey; wants warm broken reflections, drips, splash crowns, ripples at contact": the glare was a
  continuous `rs^256` lobe, replaced by discrete glints; images of the animals stronger. Splash crowns not done.
- S5 "tufts replace the dominant heavy right-sweeping clump with thick roots and long strands": grown fronds, 22 mains, holdfast.
- S6 "overhanging red growth with dangling tips at left gone" (breath-4): two weeping bushes staged for breath-02 (`HANG`).
- S7 "grey-brown pool; wants blue-green channel through shelves": `uHigh` for breath-01, green body from 8 cm of depth.
- M1, M2 "flat brown tint, sparkles stamped, no reflection of rock, no wet margin" / "flat muddy grey": mirror 1.35, land mirror, scum.
- M3 "pulsing specular dots; wants continuous directional ripples": two cell sizes blended by distance, softer `drawn` for a low eye.
- M4, M5 "bright halo fringe; smooth; no wet darkening" / "continuous bright outlines, uniform legs": veins, creases, per animal tone.
- M6 "herd too large, bright, same poses": far flock 0.68 to 1.14 in size. M7 "blunt fringe; wants contact": tuft now on the rock.
- M8 "skeletal with ribs and coarse strands; wants fuller folded skin, dark stain": wavy fan only. Bulk not done (see above).
- M9, M10 "clumps far behind standing animal" / "isolated compact mound": nine bushes staged round the rim wader (`RIM_GROWTH`).
- M11 "matte copper, stippled speckles; wants luminous red transmission": through-light 1.5, `blood` colour, `farLift`.
- M12 "no sway in fronds": sway is in the vertex shader; M2 green. M13, M14, M15: not done.

## Measures and cost
MEASURES
COST

## Staged (by shot, never by clock)
- breath-05: `RIM_GROWTH`, nine bushes round the rim wader (plumes); rim wader's neck down at the key, up 0.9 s after it (`RIM_LIFTS`).
- breath-02: `HANG`, two tall weeping bushes left of the lens (plumes); rim wader away on the flats (waders).
- breath-03: rim wader stands at `MIST_WADER`. Bush 5 is rooted at (-13.5, 33.5), clear of the breath-02 lens.
- breath-01: `uHigh` is 1 (sea: green body, no warm tint of the mirror, and the broad field of glints, through the whole shot).
  The mirror's `low` gate goes by the eye's height over the sea, not by shot.

## Do not try twice
- A continuous sun lobe on perturbed normals (a white hammered sheet). `drawn` at contrast 0.5 with no glints (sand).
- Wide offsets of the waders' image (dark speckle trails). The sea as one large quad (depth error by lens position).
- Plume albedo (0.58, 0.44, 0.46) with squared through-light (near black). A soft mask for plume cover. A solid heart.
- Dead or `back` fronds on a bush by a lens (a black rod across the frame): use `tidy`.
- Ribs as a sinusoid; skin relief over 0.004; mop strands thicker than 1; drops falling longer than 0.6 s.
- `standH` cut without the mesh's legs: the knees fold (the rim wader stoops; it reads, but go no further than 0.8).

## Next, in order
1. Plumes as heaps of thread: many more, finer ribbons with no drawn midrib, edges that dissolve (try `mat/tassel.jpg`).
2. Dead wader as a model with a barrel and folded legs, bedded in grit.
3. breath-4: denser hanging mass, drops from the tips (the drop geometry reads `grown` only; give it `hangGrown`).
4. breath-0: sun path at the upper left (`high` term with `rsun`); breath-1: splash crowns at the feeding heads.
5. Near wader cut by the left edge in breath-04; centre wader's neck as a low forward arch (`NECK_UP`).
