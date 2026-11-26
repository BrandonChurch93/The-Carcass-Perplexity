# Hand-over of the marsh's life (wallowers, stalks, insects, dead, fliers)

Branch `agent/marsh-life-2`, second owner, written at version 3. Folders: `src/places/marsh/{wallowers,stalks,dead,fliers}/`. Pictures used are the Builder's, under `public/assets/marsh/mat/`.

## How each part is drawn

- `wallowers`: one skin for each animal, class `Beast` in `wallowers/body.ts`. `field.ts` is the body as a distance field on 17 bones (trunk, neck, head, four legs of three bones); `nets.ts` takes its surface once on a grid (`cell` 0.024 m near, 0.05 far); the vertex shader carries it on the bones. `animal.ts` keeps only the gait: `walk(plan, build, seconds, drive)` is a pure function of the seconds (stride, weight shift, breath, head up every 8 s). The old `Animal` class and `skin.ts` are still in that file and drawn by nothing.
- Hide: `mat/wallower.jpg` (the heavy one from the side) laid on both flanks, `mat/hide.jpg` and its relief on three axes for the folds, tinted to a warm tan, then by look: `wet` (a ragged dark red waterline with a lighter damp band above it, both scaled by the animal's size), `mudded` (drying mud in cracked plates, the head wet and dark, used by the stuck one), `crust` (grey salt clumps over dried hide, used by the fallen dead one), mud daubs on the lower third of the feeders. Feelers: 14 tubes round the mouth, held to the mud or the top of the brine under the head.
- `wet.ts`: drops from chin and belly, rings round each wading foot and round a lying body, and a brown cloud of lifted mud at each wading foot, as cards on the brine.
- `dead/mud.ts` (`mudWallow`): the churned mud mesh pushed up round a bank animal and round the stuck one. Not under one that stands in shallows (the hero): there it hid the brine and the rings.
- `stalks`: `stalks/index.ts`. Near stems (within 14 m of a lens) are instanced tubes (`STEM_*` in `shaders.ts`: rings, `mat/bark.jpg`, salt, palm scales with a pale lip, worn in patches to bare fibre, red stain at the foot). Far stems are cards of `mat/stalk.jpg` (`palms.ts`). Plumes are cards of `mat/lock.jpg` bent and gusted in the vertex shader (`locks.ts`).
- `insects` (same folder): instanced cards of `mat/insect.jpg` with beating wings; 12 keep to the plumes nearest the colony's lens, the rest round the stuck one, small and low.
- `dead`: five heaps, each a 40 by 24 grid raised by `mat/deadone-h.png`, coloured by `mat/deadone.jpg` and `mat/rime.jpg`, cut to one of three outlines (`KINDS`, `uShape`), with bare dark hide through the crust, on a salt apron card with a pink foot. The sixth is a `Beast` lying on its side (`crust`). The stuck one is a live `Beast` (`mudded`), head up, heaving.
- `fliers`: 16 small four-winged insects, each at the top of one stalk.

## Tried and dropped, so nobody tries it twice

- Legs as separate tubes on a trunk (the first owner's `Animal`): seams and cuffs whatever the shading. One field, one surface cured it.
- Fur locks on the young one and on the lying one: a bear cub and a hedgehog. Hide only.
- Plumes as instanced ribbons or tubes (800 a plume): worms, and 1 s a sample. Cards of the Builder's lock picture read as strands and cost 0.1 s.
- Albedo above 0.15 on a smooth body: it is white under this sky. Hide sits at 0.02 to 0.15; roughness under 0.95 gives a pale veil. A hide greyed to taupe (my version 2) read as elephant hide: the picture's is a warm tan with pink in it.
- The dead as one outline at six sizes: snow drifts. As a dry heap with no dark: rocks.
- Reading a picture after a `discard`, or with anisotropy on a cut-out card: gate G10 fails (two loads of one frame differ). Every read goes before the one discard, outside any `if`.
- Fliers as birds in the sky at 0.3 m: they read as debris at 4K. They are insects at the stalk tops now.
- A wader for the colony's lens standing on the bed of the pool: a hump with no legs. It stands on a shoal (`plan.ground = -0.06`).

## Still wrong beside the approved pictures, worst first

- marsh-3: no coarse hair in wet clumps on back and flanks (asked by the Builder at 04:12 UTC, not reached); rings round the hero's legs show at 4K but the lifted mud is a faint cloud, and the legs have no reflection in the lead's filmed shallows; legs have no claws that read; the lying one in front is a smooth lump with toes; the young one is softer than the hero and has few folds.
- marsh-4: the stuck one's plates are now faint and its back reads smooth again; where it meets the ground there is my grey mud but no broken salt plates (the ground is the lead's); the heaps are darker and have three outlines now but none shows a jaw or a row of feelers; the fallen one is the only dead that reads as the animal.
- marsh-2: the trunks are pale and fibrous with worn scales, still procedural; the broken stem has no split flap; the wader in the mist is small.
- marsh-0: animals are the right size and stand in the brine, but at that size they are humps with legs and no wet lower third that reads; no fliers visible.
- marsh-1: not worked on by me beyond what the stalks and insects give it.
- Motion: breath, weight shift, the head lift and the stuck one's heave are there; skin does not slide and the brine does not part round a moving leg.

## Staged by shot

- `LOOKS = [10.4, 13.1, 11.3]`: when the three by the lens of marsh-3 have their heads up in shot marsh-04.
- The lying one (herd index 2) rests a forefoot on the brine and paddles, head at the surface.
- TEMPORARY: animals nearer than 26 m to the marsh-0 lens at 0.6 size, and the two nearest turned across that view.
- Four stalks by the hero moved behind and left of its head; the inherited clumping of stalks; close plumes at the colony's lens combed to its right; 12 insects at the plumes in its view.
- One wader on a shoal in the far shallows for the colony's lens (marsh-2).
- The dead nearest the stuck one sunk lower; the fallen dead one moved 1.7 m into the frame of marsh-4.
- Fliers re-homed to stalk tops.

## Cost, seconds a sample at 3840 x 2160, key marsh-0, draft, above the empty frame

- wallowers 1.10, dead 0.76, stalks 0.34, insects 0.11, fliers 0.00: 2.31 s in all (aim 2.5). Whole frame 12.51 s, empty frame 2.71 s (2.08 s at 04:02 on nearly the same tree: the tool moves by 0.1 to 0.2 s a run). Measured at 04:23 UTC with `npm run -s cost -- --key marsh-0 --format uhd --tier draft --parts wallowers stalks dead insects fliers`, one sample, on the tree as handed back. The dearest thing is the surface of each near animal at 0.024 m: `CELL_NEAR` and `CELL_FAR` in `wallowers/index.ts` are the levers.

## What I would do next, in order

1. marsh-3: hair in wet clumps along the back and flanks (as geometry it failed twice; try it in the hide picture), a darker torn mud cloud, and ask the ground owner for clear brine without film round the hero so its legs reflect.
2. The lying one: fold its hide like the hero's, lower it, keep only the back and the head above the brine.
3. The heaps: one end open to a jaw or a row of feelers (a second picture from the Builder, or a `Beast` head at the heap's end).
4. The stuck one: plates of unequal size, salt broken round it (ask the ground owner for a ring of tilted plates at `STUCK`).
5. Trunk scales from a picture; a split flap on the broken stem.
6. Remove what is unused: `Animal` and `skin.ts`, `PLUME_*` and `BEAD_*` in `stalks/shaders.ts`.

## Round 11, each severe or major issue on these parts and what was done

- "the wading animals look like smooth, blobby segmented lumps and the right-bank creatures look like low-poly pale sculptures with stick legs" (severe): new one-skin animal with the side picture; bank animals sink to the ankle in pushed-up mud. Partly closed: humps at that size.
- "rigid straight sticks with sparse dark tufts and an oversized thick foreground stalk" (severe): stems lean and curve, plumes are full lock cards, clumps. Partly closed.
- "a dark, blocky, indistinct grey silhouette", "a featureless dark grey lump" (severe, marsh-1 and marsh-2): a staged wader on a shoal, side on, legs clear. Closed at marsh-2; marsh-1 not checked.
- "flat dark-maroon clumps with hard polygonal cutout edges, no clinging water droplets" (severe): plumes from the lock picture, sharp at the lens. Closed, bar the droplets.
- "smooth segmented cylinders with a blurry repeating grid-like texture, paper-thin jagged collars, smooth shiny acorn-like buds, and a crude low-poly V-notched tip" (severe): bark and salt on the tube, overlapping scales, a ragged collar with thickness, buds matt. The broken tip is still plain.
- "pale grey spiky or bristled blobs and odd floating shapes" (major), "small dark points hang in the air at fixed heights" (major): insects from the insect picture, beating, perched and circling. Closed at marsh-2.
- "the legs meet the torso along sharp, dark intersecting seams like separate cylinders, lack wet mud staining and hanging drips, and enter the water with no displacement or ripples" (severe), "hard dark cuffs where the cylindrical legs join the bodies" (severe): one surface, wet line, mud daubs, drops, rings and a mud cloud at each wading foot. Closed for the rings; no reflection of the legs.
- "smooth low-contrast noise with sparse black spikes instead of deep wet leathery wrinkles" (severe), "coarse spiky fur tufts" (major), "long, straight blade-like bristles" (major): the Builder's hide and its relief, no hair anywhere. Closed on the hero; the lying one is too smooth.
- "a harsh dark Voronoi crack pattern with stiff flat polygon hair strips and sits on the mud along a hard floating edge" (severe), "large dark polygons look painted onto soft, stretched hide" (major), "rectangular brown hair cards" (severe): cake as plates with relief and fine cracks, no hair, hollow and grey mud at the foot. Plate edges now show only in places.
- "tiny uniform geometric spikes rather than granular salt", "blocky grey-white rocks with smooth cylinders protruding" (severe): heaps from the dead-one picture and its relief, three outlines, dark hide through the crust. Partly closed.
- "a sharp, rigid wall of straight poles with spiky tufts, and the background animal on the right shows blocky hard-edged legs" (major): clumps, card stalks far off, new animal. Closed.
- "The fronds have multiple translucent outlines" (severe): plumes are opaque cut-outs, one outline. Closed.
- "flattened, near-identical splayed silhouettes and a dry, uniform crust right to the feet" (major): each has its own stride, phase and wet line. Partly closed.
- "The stalk ends in a visible rounded bottom above the red water" (major): the foot of each stem spreads into the crust. No meniscus: open.
- "the body cuts straight into it without a meniscus, wake or wet edge" (severe): wet band, mud mesh and the lead's hollow. Partly closed.
- "across 10 seconds nothing on the animals moves" (severe), "The body is rigid, with no secondary motion in the skin or fringe" (severe), "the push in ends on a creature that stays still" (major): breath in the flanks, weight shift, heads lift at `LOOKS`, feelers work, the stuck one heaves. No skin slide: partly closed.
- "with the camera held, almost nothing changes" (severe, marsh-0): animals walk and plumes gust; the rest of that frame is the lead's.
- "the finned creature surfacing behind the burst" (major): not one of these parts; it is the lead's brine event.

Looks used this round: wallowers 36, dead 29, stalks 22, insects 10, fliers 2 (limit 40 each).
