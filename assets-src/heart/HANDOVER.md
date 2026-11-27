# The Heart, hand-over after the second wave of the wide polish

Unit `heart`, film frames 2507 to 4220, branch `agent/p7-heart-polish`.
Written by the unit's lead at the end of the four hours. Every hash below is a merge on that branch unless it says otherwise. The last merge of picture code is `bc36ea1`.

## 1. Done, part by part

The lake and its channel (`src/places/heart/lake/`), fluid builder
- `bb51576` (its `cd6b9a1`): crust in slabs of several sizes; `PAD_DENTS` exported for the walkers' feet.
- `130cf5d` (its `77dd513`): ropes on the slabs, the channel wider.
- `63c7e5a` (its `410b94b`): grit on the crust, a wide bent channel at the line (`lineBend`, `LINE_BEND_GLSL` in `lake/net.ts`; `SEAMS.line` in `shared/anchors.ts` was not moved), the crust lifted to grey under the sky's light only (`fireTone` in `lake/skin.ts`), the channel gives the rig's glow map 0.4 of its radiance (`onLine` in `GLOW_FRAGMENT`, `lake/index.ts`).
- `a96af2f` (its `32ab2db`): the tube's roof and ribs take the river's light (third light in `riverLight`, `fall/look.ts`); the fall's bed on the slope 1.7 times as wide (`HALF`, `fall/path.ts`) with more strands and floes between; the mound at 4006 one broken crest below the frame edge; `onLine` 0.28; harder ropes at 3685.

The ground (`src/places/heart/land/`), ground builder
- `7c32a83` (its `1d5aa85`): first pass of bank, crag and rubble at the line.
- `975291b` (its `5af4655`): the row of teeth at 3477 and 3560 broken up.
- `4369dd2` (its `116cade`, with `2eeedb5`, `19cf3af`, `d5de7d5`): the bank at the line drawn back for the bent channel, a gravel bed, 22 angular clinker blocks along the shore, the boulder walked off the crust, the mesa ledged, the sulphur small and dull. At 3477 the channel now bends from behind the bank to the lower right as in the picture.

The air (`src/places/heart/air/`, `shared/`, the `look` line of `index.ts`), sky builder
- `f329d83`: first pass of fume and plume.
- `6bb7202` (its `aab6d7e`): the lava's own light in the rig: it lights the bank and the fume and is gone 2.2 m over the lake; thin steam at the vent; less haze in the east; the plume behind the mesa's shoulder.
- `0599ce7` (its `eadec50`): fall smoke at 4006 in fewer, rounder billows; the plume climbs; steam reads as lit by the lake only over the lake.
- `bc36ea1` (its `93ebd1f`): the plume denser with a harder edge, the fall smoke in harder billows, some cost won back.

The walkers and the sunk one (`src/places/heart/walkers/`, `sunk/`), life builder
- `37ce7fb` (walkers of its `66f247b`): feet with soles, `PAD_DENTS` filled, weight in the stride, dust at the pads, the crown's bulb.
- `1d19a1a` (its `bb0c218`): the sunk one's fold ropes without the pale disc at 2722.
- `6bb8687` (its `fd1d4c5`), `5da8aeb` (its `7f6dcc8`): second and third pass of trunk, roots and crown.
- `fb8773a` (its `3b66d4a`): trunk relief from its own sheet, finer crown cords, tan roots with dark edges, the sunk one's ash field with a broken outline from afar.
- Lens, by my ruling (focus and camera path unchanged): `0767e30` KEY2 (3685) aperture 0.075 to 0.03; `33e3ff3` KEY3 (3156) aperture 0.15 to 0.09.

Measure M3, final tier, uhd, floor 0.75 (round 29 in brackets)
- 3477 (0.48): 1.11, measured on `4369dd2`, that is before the last fluid and sky merges. Not measured on the head.
- 3685 (0.60): 0.93, measured on `0767e30`. Not measured on the head.
- 3156 (0.38): 0.70, measured on `33e3ff3`, before life's last version. Still under the floor. Not measured on the head.
- 2722 (0.92) and 4006 (1.00): not measured in this wave. Both pictures changed (plume, fall, cave), so measure them first.

Cost, uhd draft, best of two, seconds, before and now
- 2507: 30.80 before, 32.01 now.
- 4010: 32.25 before, 32.96 now.
- 2722: 27.59 before, 27.48 now.
The Heart ends over its before numbers at 2507 and 4010 and under at 2722. The rule of the wave (no more than before) is not held. At report 2 (`6bb8687`) the three stood at 30.69, 32.14 and 27.05; the lava's light in the rig, life's third version, the ground's shore blocks and the wider fall came after. Which of the last three merges added the last half second at 2507 was not measured.

Guards 1241, 4409 and 7234: byte equal to the before set at every report and at the end. G8 passes.

## 2. Still wrong, worst first

1. 4006: the fall is wider now and in strands, but still thinner than the picture's and still a glowing texture on ledges: no thick body, no crust thrown. The lake at the frame's lower edge shows hard orange contour bands in straight lengths. Of the three areas the compression critic R7 names at 3980 to 4039: the shadow under the arch now has ribs that take the light (a step, its back is still one dark tone); the dark out-of-focus foreground mound is out of frame (the lower edge is now sharper than the picture's blurred foreground); the brown vapour right of the cliff has harder billows but is still a soft veil over a large part of the frame. None of the three was tested against an encode. `/root` measured that grain and dither are not the cause; these areas must not be left flatter than now.
2. Lava everywhere: the wide channel at 3477 is a flat orange sheet with pale streaks. No dark skin wrinkles and splits over it (film critic R4, minor, at 3533 and 4037), and the contour bands in the glow are still there. The lava's light now reaches bank and fume, but the bank blocks at 3477 take it as an even rust red.
3. 3156 is still under the M3 floor. The hero walker's trunk is soft and modelled at uhd, the tuft is flat ribbons where the picture has a lattice, the herd at 2722 is too alike.
4. 2722: the plume is a soft funnel with no hard billow, the mesa has no lit rim.
5. The crag at 3477 reads as one slab behind the steam.
6. Open for the next wave by `/root`'s word, not declined: issue lines 51 (the falls moved left), 24 and 32 (the cave reshaped), 28 (the herd regrouped).

## 3. Held back

- Nothing of the last versions is held back: the head carries every builder's last commit (fluid `32ab2db`, ground `116cade`, sky `93ebd1f`, life `3b66d4a`).
- Superseded on the way and never merged alone: ground `2eeedb5` (pale popcorn sulphur mound, later made small and dull), sky `69b939f` and `a371a76` (thick vent steam, east wall washed, then a red foreground at 4006), fluid `e369b1a` (under the rig's bank light the wide channel flooded 3400 to 3560 red and pink; fixed in `410b94b`), the sunk part of life `66f247b` (a pale disc at 2722; fixed in `bb0c218`).
- Tried and not adopted: a smaller aperture at KEY1 (3477, 0.008 gave M3 0.71): the picture's near rocks are blurred.
- Lost on the way: the sulphur by the vent at 3477, which the picture has, is nearly hidden since the bank was drawn back.

## 4. What to try next for the worst three

1. The fall and the cave (fluid, `fall/`): build the fall as a body with thickness, two or three times as wide at the lip, with dark rafts of crust that ride it, split and tumble at the ledges; give the tube's inside ribs and benches (`fall/shape.ts` is the tube's skin) that take the fall's light from below, so the arch's shadow has form. The foreground mound at 4006 is the lake's crust, not land: shape it as a ridge with a lit edge or take it out of frame. The fume right of the cliff is the air's: two or three large billows with a lit under side and a dark top.
2. Lava skin (fluid, `lake/`): a cooling skin as its own layer over the core, dark, creased across the flow, torn at the bends, moving slower than the core; break the contour bands by driving the glow from the skin's thickness and not from the distance to the bank. Lower `onLine` until the bank blocks keep their own grey with red only on the faces turned to the channel.
3. The hero walker (life, `walkers/`): a baked body for the hero at uhd (relief with real displacement on trunk and joints), the tuft as a lattice of crossing cords. For M3 at 3156 measure with `node out/work/m3.mjs 3156` after each step; the lens went as far as the picture allows (0.08 gave 0.726).

Cost, to be done before any of the three: the Heart ends over its before numbers (see above). The sky builder found the cause at 2722: the bank light's reads on all crust cost 0.4 s (bank light off 26.82 s, plume off 27.15 s, against 27.24 s). Its cut, written down but not measured: read the thrown shade only where the bank light is strong. Then bake the lumps by fixed taps, one read a pace, paces 11 and 14. The ground builder found no saving at 4006 in the land.

## 5. What a newcomer would trip over

- `npm run measure` measures all five keys and takes more than 35 minutes. Measure one key at the final tier with a small script of your own around the still tool (uhd, final, look off) and `assets-src/heart/tools/m3map.cjs`, about 4 minutes a key.
- M3 at 3477 falls when the crust is smooth, however right its large forms are: fluid's first slabs took it from 0.48 to 0.29. It turned green with grit and ropes on the slabs, not with grain.
- M3 at 3685 and 3156 was mostly the lens: the frames were more blurred than the pictures. Lens numbers of KEY2 and KEY3 sit in `index.ts`; life alone edits them, sky alone edits the `look` line.
- No part carries its own light. The reach of the lava's light is the rig's (sky, `LAKE_BANK` in `shared/glsl`); the amount the channel gives is fluid's `onLine`. A wide bright channel under the rig's bank light floods 3400 to 3560 red and pink: check that range whenever either number moves.
- The ground's bank and the fluid's channel share the shore at the line. A version of one must be looked at with the current version of the other.
- Repeat tests are to be trusted only on browser 147 (`chromium_headless_shell-1217`); this machine has `chromium-1255`. Frames that do not repeat come from `dFdx`, `dFdy`, `fwidth` or implicit-lod `texture2D` of mipmapped textures inside per-pixel branches.
- One render at a time, and never build or change the tree while one runs. A stray second render spoils a cost number.
- The three-dot diff lists other parts' files when a builder has merged the polish branch into its own: check names with `git log lead..HASH --no-merges --name-only`.
- Pushes sometimes fail with "could not read Username": run `gh auth setup-git` and push again. A builder whose push fails sends a `git bundle`.
- The grain of the place's look (`grain: 0.006`) is `/root`'s to test; leave it.
