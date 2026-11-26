# Blood Marsh, ground and weather: hand-over from marsh_ground_owner_2

Branch `agent/marsh-ground-2`. Folders: `src/places/marsh/shared/`, root `index.ts`, `land/`, `brine/`, `air/`. Written at minute 175 of 240 of wave 2. The first owner's note is in the history of this file.

## How each part is drawn

- **land**, **crust** (`land/field.ts`, `land/index.ts`, `land/shaders.ts`). One field of metres to the shore, made on the processor; one fragment shader. The ground is the Builder's pictures laid as plates with their reliefs (slopes from a blurred read, the sharp read as how closed a spot is): `mat/thincrust` in two lays with a gap of mud between (`thinLay`), `mat/shore` along every waterline, `mat/ledge` on the rock rise with the rock tile from the side on steep faces, crust tile as knobs on rims and on the bank of marsh-1, bedded section on sheer faces, a salt rim round every pool, bare mud patches and seams back from the rims. What lies under the brine's level is a red film with the mirror in it. Fine patches: crust round the stuck one (cell 4 cm, wallow hollow and tipped slabs in the mesh and in `vPaint`), bank (2 cm), rock (5 cm).
- **brine** (`brine/index.ts`, `brine/shaders.ts`, `shared/brine-glsl.ts`). A level surface over a turbid body coloured by metres from the shore (pink shelf, maroon, brown black). It mirrors a picture of the scene drawn small from under its level before every sample (`tMirror`, half float, quarter size; three taps swung by the ripples; plain sky past 95 m). A ripple is drawn by its tilt to the lens: more sky on the far slope, more body on the near one. Rings from seeps, domes, drops and from whatever stands in it (contact map). Froth from `mat/froth` in a narrow line at the shore.
- **domes**, **burst**. Clear blended film (premultiplied, no depth write): one window highlight, dark rim, pushed ring at the foot. It swells, sags, tears from one side; the crown is a thrown sheet with a rolled lip; drops fly ballistic arcs and ring the brine where they land.
- **sky** (`air/sky.ts`): an overcast shaped by `mat/sky.jpg`, darker toward the top, rain cloud at bearing 61 degrees. **air**, **rain**, **steam** (`air/volume.ts`): one pass after the scene. Low steam in six drifting sheets met exactly by the view, shown over mist discs and cleared round two points (`uClear`); steam columns through `ctx.sources`; rain as slanting veils with no side; a far bank from 230 m and three standing banks (`uBanks`) at 78, 128 and 195 m.
- **cameras** (`index.ts`): K2 focus 3.2 m, aperture 0.0035; K1 focus 4.6 m; K3 lowered to 1.5 m so the horizon is in frame.

## Tried and dropped (do not try twice)

- A texture read with implicit lod after an early `discard`, or inside an `if` that differs between neighbours: two fresh pages differ and G10 fails. Read first, discard last. Anisotropy on a picture read that way does the same (the life owner's stalks).
- An early `return` or an `if` round the thin crust to save cost: saves nothing on the software renderer and broke G10.
- A mirror share that rises early (0.4 at power 4): the whole brine turns milky pink. Froth rafts on open brine: a white speckle. Rain at strength 0.95: straight diagonal hatching in the sky.
- Steam as marched columns for the low mist (even grey screen): `SHEETS = false` keeps it.

## Round 11, each severe and major issue in my folders, and what I did

- severe, marsh-0 "smooth, dimpled, melted-looking mesh with a blurry procedural texture": rock from `mat/ledge` with its relief, fractures dark with dried red. Still soft near the lens: open.
- severe, marsh-0 "flat, matte maroon-brown with uniform ripples, harsh white-painted shorelines, and tiny pale dots": mirror brine by depth, shore plate, clear domes. Translucent shallows: only by colour.
- severe, marsh-0 "uniform tile-like crack pattern ... smooth white snow": thin crust picture in two turned lays, mud patches, salt rims. Islands still read as pads: open.
- severe, marsh-1 "opaque matte grey-lavender hemisphere with a plastic specular spot, and the foreground foam and small bubbles are missing": new technique, clear film. Foam only as the shore plate's froth; small bubbles missing: open.
- severe, marsh-1 "smooth, glossy procedural shader with smeared reflections, no micro-ripples ... clunky flat splash crown": ripples by tilt, wavelets within 22 m, crown as thin film, smaller drops.
- severe, marsh-1 "the crusty white-and-rust salt shoreline ... is missing, and the shallow photographic depth of field is absent": knobbed bank, lens opening. The bank is still paler than approved (154,136,132 against 136,103,96): open.
- severe, marsh-1 and marsh-2 "rising steam" and "lacks steam", "flat geometric trapezoid", "lacks shallow depth": vent column, sheets, lens openings. The hummock behind marsh-2 is unchanged: open.
- major, marsh-0 "sharp flat-topped geometric mesas and overly straight diagonal streaks in a flat grey sky ... uniform airbrushed": sky picture, veils, mist banks. Flat-topped hummocks still stand: open.
- severe, marsh-3 "flat, matte pink-red procedural pattern with no sky reflections, ripples, or wet sheen" and "flat unreflective pink-brown pattern": mirror, tilt ripples; the big one stands ankle deep.
- severe, marsh-3 "uniformly sharp with a hard horizon line": lower lens, opening 0.011, far bank. severe, "flatly lit and chalky pink-grey ... chunky salt-crusted mud banks": colours moved to the approved numbers; banks are not chunky: open.
- severe, marsh-4 "smooth, matte, uniform grey-brown surface with no red brine or reflections": level plates on wet mud with red film and mirror between. severe, "tiny uniform geometric spikes" and major "similarly shaped conical spikes": no cones anywhere; knobs come from the crust picture.
- severe, marsh-4 "all in crisp focus with too little mist": opening 0.007, banks. severe, "blurry, featureless CG shading with low-poly bumps": pictures on a 4 cm patch; a fine white stipple was cut back at the end, check it at full size.
- severe, marsh-4 "an opaque gray sheet: the body cuts straight into it without a meniscus, wake or wet edge": wallow hollow of wet mud with tipped slabs; rings from the contact map. No meniscus: open.
- severe, "polished solid half-sphere cut off at the waterline ... rigid triangular spikes": film, pushed ring, sheet crown.
- major, "broad, soft, two-tone reflections that look painted on" and "flat, two-tone ripple shapes": true mirror of what stands there, colour by depth, wavelets.
- major, "the rock is smeared into parallel grooves ... a thin white outline": rock picture; bank split into salt rim, wet margin, paler shallows.
- major, "an even screen of gray grain": sheets torn into wisps, no grain, clear before each lens.
- major, "moves like a sliding texture" and "like a scrolling noise texture, and does not react to the burst": the mottle is gone; the surface moves by rings and wavelets, and the burst's rings cross the foreground.
- severe, "the full dome vanishes in a single frame" and major "gone within about a third of a second": swell, sag, tear, crown, drops, rings, over about a second.
- major, "the ring set holds the same spacing and position": rings travel out and fade. major, "hang in the air like floating particles": ballistic arcs and landing rings.
- severe, held marsh-0 "almost nothing changes": sheets drift, veils fall, seeps ring, banks drift; the Builder measured 15.6 percent of the picture moving (floor 8).
- The life owner's: creatures, hide, bristles, fronds, insects, the finned one.

## Still wrong beside the approved pictures, worst first

- marsh-0: islands are pads with a rim, no plates with seams at that distance, no small things by the hundred; flats darker than approved (147,130,127 against 159,137,134).
- marsh-1: bank too pale and even; no scum, no small bubbles; water has less ripple contrast than approved.
- marsh-4: plate edges not curled or undercut (a height field cannot), no drag marks; marsh-3: no hoof pits, bank smooth.
- Sky paler than approved at marsh-3 and marsh-4; near rock soft; hummocks flat-topped; `mat/far.jpg` unused.

## Staged, by shot

Nothing reads `stagedSeconds()`. The burst at 9.00 s (frame 6158) and the small burst 0.22 s before key marsh-1 are fixed times. Lens openings are the same through a shot.

## Cost at 3840 x 2160, key marsh-0, draft

COST_LINES

## Checks at hand-over

CHECK_LINE

## What I would do next, in order

1. Cost: the land shader is most of it. Halve its reads far off (the three crust sizes and the two thin lays past 60 m), then the mirror pass.
2. marsh-0 islands: cut plates into the land's mesh on a mid-distance patch, with seams of mud, and scatter stubs and salt pebbles as instances.
3. marsh-1 bank: instanced froth caps and small bubbles at the waterline; darker, redder clefts.
4. marsh-3 and marsh-4: hoof pits and drag marks painted into `vPaint` on a patch under the animals; undercut plate edges need real slabs in the mesh.
5. Hummocks as salt mounds from a picture; the far backplate.
