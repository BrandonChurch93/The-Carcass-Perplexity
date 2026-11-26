# The Breath: sea, gill-plumes, waders, dead-wader. Hand-over after version 3

Owner until 01:17 UTC, 26 November 2026: breath_life_owner, branch `agent/breath-life`. Folders under `src/places/breath/`:
`water/`, `plumes/`, `waders/`, `dead/`. Round 8 judged version 2 (commit 80f99e9) and failed it: match 2, filmed 4, motion 4 to 6.

## How each part is drawn
- waders (`waders/animal.ts`, `herd.ts`, `material.ts`, `skin.ts`, `index.ts`, `mirror.ts`, `ripples.ts`, `drips.ts`): tubes swept
  on bones (trunk, neck, four legs, 190 mop strands; the far flock has 6), posed each frame by `pose(seconds)`, feet planted a stride on.
  Hide is a shader colour times `mat/skin.jpg` read at 0.6 m and 0.19 m as a ratio to its mean; ribs, spine and cords are shader relief.
- dead-wader (`dead/index.ts`, `dead/ground.ts`): the same skin and material with `uDead` 1 (parchment, grime, rot, salt, damp underside);
  trunk from `flank()` with six uneven ribs, legs from a list of bones, a mop of 150 strands flat on the rock, a stain and 300 grit stones.
- gill-plumes (`plumes/bush.ts`, `ribbons.ts`, `vanes.ts`, `shaders.ts`, `index.ts`): a lump holdfast, arching stems as ribbons, and on
  each stem a vane (one strip) whose barbs are cut in the fragment shader (`VANE_TEST`, with `discard`). Sway is in the vertex shader. No picture.
- sea (`water/index.ts`, `maps.ts`, `shaders.ts`): one sheet at SEA_LEVEL; depth from the rig's land map; three wave bands, a ripple map
  near the lens, rings and a mirror image of the waders from two small targets, a four step march for the land's mirror, sun glitter.

## Round 8, note by note
- Closed, by my own eye only: the trunk was drawn inside out (fixed); haunches so the thigh grows from the body; trunk tapers; hide from
  the new skin picture, pinker; no rain dashes (drops now fall 0.55 s at most, beads only close up); plumes lower, wider, darker, wetter,
  twice the wind; near waders out of step (UP spans in `herd.ts`); a crown of drops where a foot lands; dead wader lower, legs thicker.
- Tried, not closed: barb speckle (lengths now smooth along the stem and locks drawn whole below 6 pixels a barb: fewer dots, but the
  fringe is still a cut-out, see next steps); the middle wader's lifted foot (`AHEAD` in `herd.ts` puts it at the end of a stride with a hind leg far back; the foot
  does not leave the water in any setting from 0.07 to 0.28, the step lift in `pose()` is too low to see: raise `stepH` there);
  the dead one as dead (still a pale model on top of the ground; 46 flies in `dead/flies.ts` circle it but are
  hard to see at 6 mm, try 10 mm and more of them); mops paler (still wine, not pink).
- Not reached: a wader in the upper left of breath-3 and small far silhouettes in breath-4 (anchors are the lead's, I asked for none);
  the far flock milling and turning in the held wide key; three different trunks (all builds are one shape, jittered a few percent).

## What did not work (do not try twice)
- Ribs as a sinusoid, or anisotropic noise on the trunk: both read as stripes. The ribs today still read as bands at breath-1.
- Strong relief from the skin picture's fine scale: moire on the dead neck. Keep it at or under 0.004.
- Fog fill cut to 0.3 on the waders: near black silhouettes. The base wave map scaled up near the lens: a lattice (the ripple map fixed it).
- Teal body colour of the sea driven by the perturbed normal: noisy patches. Drive it by the view's `v.y`.
- Flat blade locks on the plumes; a pleated drape on the dead trunk (a scallop shell); the leg narrowed to 0.4 at the hip (table legs);
  mop strands thicker than 1 (sausages; 0.26 to 1.0 now); drops that fall longer than 0.6 s (rain).

## Still wrong beside the approved pictures, worst first
1. breath-2, dead wader: a tidy pale model. The picture has hide draped and sunk over bone, wrinkled, jointed legs with hooves, a scaly
   neck, pale fanned tendrils, stained dust and rubble round it. The neck still stretches into parallel ridges where it leaves the chest.
2. breath-1, waders: trunks are ovals with banded ribs, thighs still heavy, knees are swellings and not bone under skin, no gold rim on
   the backs, mop a tidy wine tassel (picture: pale pink, ragged, with green weed). Water is even grey where the picture is warm with heavy
   glare, splash and sparkle; reflections are faint smears.
3. breath-3, plumes: fronds read as palm leaves, the fringe is a cut-out with dots at native size, no gold backlight in the barbs, the
   holdfast is hidden, the bush sits left where the picture centres it; no wader in the mist behind.
4. breath-0: far mops are red dots, the channel has no glare path like the picture's, plumes stand up instead of hugging the rim.
5. breath-4: one large wader at the rim where the picture has small far ones.

## Staged by shot
- Rim wader: neck up until `RIM_WADER_DOWN_FROM - 1.5` s, then down. Near waders: neck-up spans in `UP` (`herd.ts`).
- Middle near wader: `AHEAD` = 0.14 m ahead of its plan, so that it is at the end of a stride at 17.0 s. Far flock: 14 percent neck up.
- Dead wader: laid 0.9 m along its own axis from its anchor (`SHIFT`), so that the mop is in the frame of breath-2.
- Plume bushes 0, 1 and 5 are at full detail with drips; the others are thinner.

## Cost, seconds a sample at 3840 x 2160, draft tier, key breath-0 (`npm run -s cost`)
Measured at minute 188 of 240, one sample: whole frame 10.24 s; an empty frame 1.92 s. Above the empty frame: sea 0.52,
gill-plumes 0.27, dead-wader 0.09, waders 0.00 (the cheapest part is taken as empty, so the waders are not told apart from it).
At version 2 (minute 131): whole 7.90, sea 0.41, gill-plumes 0.18, dead-wader 0.05. The rise of the whole frame is not in my parts.
There is no cheaper variant behind a constant: the parts are inside their share. The costly things to add (below) will need one.

## Checks at hand-back, as they are
- `npx tsc --noEmit -p .` clean, build passes.
- `npm run -s determinism` FAILS after the merge of main: film frame 1241 (shot ribs-02, the Ribs, not this place) differs in 509 pixels.
  The tool tests no frame of the Breath. My own test (the same still twice, HD): breath-2 identical; breath-1 differs in 7 to 25 pixels
  by one level of 255, and with only `breath/sea` drawn it still does (waders alone are identical). Not found; look at the two small
  targets the sea reads (`waders/mirror.ts`, `waders/ripples.ts`) and at the blend of the sheet over the land first.
- `npm run -s gate -- --phase 1 --only G10` FAILS: frame 5930 (after the Breath, not this place) differs in 4 pixels by one level.

## What I would do next, in order
1. Dead wader: rebuild the trunk as hide over a rib cage (ribs as real tubes under a sunk sheet), sink it 3 to 5 cm into grit that is
   heaped against it, real hooves, wrinkles from `mat/skin-nh` at 0.3 m; let wind lift a few loose strands of its mop.
2. Waders: three trunk builds (deep chest, sway back, pot belly); knees and hocks as bone ends with a tendon line; a gold rim term that
   uses the sun's side only; mop strands thinner, 300 of them, pale pink with olive weed; stage each of the three near ones differently.
3. Plumes: replace the cut-out vanes with real strands (ribbons 1 to 2 pixels wide, alpha by coverage, no `discard`), gold through-light
   on the sun side, and grow them low along the rim. Ask the lead for a wader anchor behind bush 0 for breath-3.
4. Sea: glare path as in breath-1 (the rig's sun is now warmer), sharper rings at the legs, the reflection broken by the ripple normal.
5. Far flock: let a quarter of them walk and turn in the held wide key.
