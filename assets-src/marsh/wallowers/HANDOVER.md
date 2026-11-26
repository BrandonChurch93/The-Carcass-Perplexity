# Hand-over of the marsh's life (wallowers, stalks, insects, dead, fliers)

Branch `agent/marsh-life`. Written at version 3, before the last checks. Folders: `src/places/marsh/{wallowers,stalks,dead,fliers}/`.

## How each part is drawn

- `wallowers` (11 animals): `wallowers/animal.ts` builds one skinned trunk (120 rings by 48 sides, shape from the `KNOTS` table, folds in the `lumps` table) and four legs, and poses them on the CPU from a `Drive` that `walk()` writes as a pure function of the seconds. `material.ts` shades it with `mat/hide.jpg` and `mat/rime.jpg` (the Builder's tiles) plus procedural creases, a ragged wet line and salt cake.
- Feelers: 14 thin tubes of unequal length round the mouth, in `animal.ts`, clamped to the mud under the head (`Drive.floor`). Hair: `hair.ts`, instanced locks that follow the trunk. Wet: `wet.ts`, drops from belly and chin, rings round wading feet. Mud pushed up round bank animals: `dead/mud.ts` (`mudWallow`).
- `stalks`: `stalks/index.ts` and `shaders.ts`. Instanced tube stems (nodes, sheaths, scars, broken dead ones, forks), plumes of instanced ribbons bent in the vertex shader, drops only on the filaments that carry one. Uses `wallowers/salt.jpg` for the crust on the tube.
- `insects`: same folder, instanced bodies and translucent wings round the close plumes, a pure function of the seconds.
- `dead` (6 and the stuck one): the same animal with `salt > 1` (ribs, crystal knobs, legs folded), frost as hair locks (2400 within 9 m of the marsh-4 lens, 600 further), a dark `mudWallow` stain under each. The stuck one is a live animal with `mudded` hide, a heave and the grey mud mesh.
- `fliers`: 16 instanced four-winged fliers, unchanged since version 1.

## Tried and dropped, so nobody tries it twice

- A back that sags between a shoulder hump and the hip (knots 1.33 and 1.0): it read as two balls with a saddle. One arch, highest in the middle, reads as an animal.
- A trunk whose belly reaches the brine: the legs vanish and it is a loaf. The belly must clear the ground by about a third of the height.
- Dark slits for eyes: they are eyeless. All marks removed.
- A net of black cracks over the whole stuck one (slabs at 6.5 by 5.5 a metre): it read as a pine cone. Cracks now only in flexed patches. Deep neck creases at 2.3 times depth read as zebra stripes.
- Thick quills, then thatch, on the stuck one: the approved hide is bare and mud-caked. Sparse ropes only.
- Four ivory tusks: the picture has a dozen thin feelers.
- A plume combed to one side with long filaments (length 0.5): a smooth sheet of worms that covered the lens. Now spread all round, shorter (0.43), thinner, 800 filaments.
- My own generated hide tile (fine vertical fibres): it made the animal a hairy sack. The Builder's `mat/hide.jpg` has the folds.
- Low roughness on wet mud under the overcast sky gives a pale veil, not a shine. Keep it at 0.6 or more.
- Drawing filaments in buds and on broken stalks cost 0.9 s a sample and nothing showed.

## Still wrong beside the approved pictures, worst first

- marsh-3: legs are ringed barrels with no elbow and no clawed foot; the head is a blunt end with no brow or mouth that reads; the mud under the animal is a grey smear, not dark wet mud with red pools; the young stands in the brine, not on the bank; the half-sunk one in front is too large and too hairy.
- marsh-4: the dead are grey furred drapes with black hollows under them, where the picture has white crystal mounds; the stuck one has no raised wrinkled muzzle with an open mouth; no red mud wells up at broken slabs (the slabs are the lead's).
- marsh-2: filaments are round worms without the pale strap base; stems are too fat and too clean; no second ring of dead brown fronds; insects are few and plain.
- marsh-0: wallowers read as brown humps without legs at that size; stalks are sparse beside the picture; the dead want whiter crusts.
- marsh-1: not worked on by me beyond what the stalks give it.
- Motion: the walk is slow and small; the folds move with breath, head turn and a lifted leg, but I have not judged it in a held sheet; brine runs off the chin only as four drops.
- Gate G10 fails on the place: two fresh loads of frame 5930 differ in 40 to 130 pixels. I showed it is not in these folders (it still differs with only land, brine and air built). Told the lead.

## Staged by shot

Nothing. No call to `stagedSeconds()`. Everything is one continuous function of the place's seconds.

TEMPORARY constants (marked in the code): stalk clumping and the four stalks moved for marsh-3 in `stalks/index.ts`; animals nearer than 26 m at 0.6 size in `wallowers/index.ts`; the marsh-4 lens position for frost density in `dead/index.ts`.

## Cost, seconds a sample at 3840 x 2160, key marsh-0, draft, above the empty frame

- stalks 1.30, wallowers 0.84, dead 0.82, insects 0.17, fliers 0.00: 3.13 s in all at version 3 (aim 2.5). Whole frame 9.56 s, empty frame 1.80 s.
- The same tool gave 1.11, 0.63, 0.57, 0.04, 0.00 (2.35 s) forty minutes before, with 520 close filaments and my own hide tile. The tool's numbers move by 0.1 to 0.2 s between runs on this machine.
- Measured with `npm run -s cost -- --key marsh-0 --format uhd --tier draft --parts wallowers stalks dead insects fliers`, one sample.

Dearer and cheaper sets kept behind constants: `PLUME_CLOSE / PLUME_NEAR / PLUME_FAR` in `stalks/index.ts` (800 / 130 / 30 now; 800 / 200 / 44 looks fuller in marsh-0 and costs about 0.5 s more); `FROST_NEAR / FROST_FAR` in `dead/index.ts` (2400 / 600 now; all at 2600 costs about 0.3 s more).

## What I would do next, in order

1. Legs: an elbow and a wrist, a spread foot with claws, and weight transfer that shows (the shoulder drops over the planted leg).
2. Head: a brow, a slack mouth that opens, the feelers working one by one in the mud.
3. Dead: drop the fur, grow the crust as displaced crystal knobs with `mat/rime.jpg` at two scales, whiter, with bone-like legs.
4. Mud round the animals: `mat/mud.jpg`, dark and glossy only in the pools, red brine in the footprints.
5. Plume filaments as flat straps with a pale base, in locks that cling, a ring of dead ones.
6. Stems: `mat/bark.jpg` laid with the collars on my nodes, thinner tubes.
7. Fliers and insects: more of them, wing beat that reads at 60 frames a second.
