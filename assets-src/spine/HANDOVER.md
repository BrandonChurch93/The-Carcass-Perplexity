# The Spine: hand-over of the wide polish, wave 2 (spine_lead_w2)

Unit `spine`, film frames 7015 to 8304. Branch `agent/p7-spine-polish`, begun at 4e84d7b (the picture of 1718ba08, the end of wave 1). Written by the lead of the wave; the lead wrote no picture code. Older notes of single folders stand beside this file: `shared/HANDOVER.md`, `strikes/HANDOVER.md`. The hand-over of wave 1 is in this file's history (733a68c).

Frames used to judge: 7015 (first frame), 7234 (spine-0), 7579 (spine-1), 7418 (spine-2), 7668 (spine-3), 8090 (spine-4), and 7120, 7200, 7330, 7450, 7632, 7800, 8250 between them; strikes at 7015, 7231, 7450, 7665, 7874, 8091. Judged at draft tier in the preview format, the keys also at review tier in hd. Nothing here was judged at the final tier, by a critic, by a jury, or through the film's encoder: every "nearer" below is the lead's eye on a before and after beside the approved picture.

## 1. Done, part by part, with the commit of each merge

Sky, light, grade (`air/` but the sea files, `shared/`, the `look` line of `index.ts`):
- 9d98763 (sky d936159): the thirteen masses give way to one flowing panorama of sky that turns over; a fall wall at the left of the strike lens; `strikeIrradiance` wraps 0.45.
- bfffb0c (sky 257f672): driven snow as veils at three depths, plumes off the crests, banked mist among the far spires; no implicit texture reads inside branches.
- b25efe3 (sky beed9bb): a colder grade and rig (`tint` 0.985, 1, 1.03); haze behind the dead one so the first spire sits back; the sky in the canal's mouth violet with a lit core; spindrift parts round the body; the band as a glow.
- 31356e4 (sky b2b7300): a stroke lights the cloud about the bolt and the far storm stays dark; the ridge flares and decays over 7015 to 7030; the struck spire's flanks keep shadow; veils lie flat on the gale; the band cut into lengths.
- 6fcb624 (sky 8118b59): the far ground and far spires by the dead one set back in a low drift layer; the clear side of the sky takes little of a stroke; the left mist stands in heads.

Kites and runners (`kites/`, `runners/`):
- 52b3bb4 (life d4bf844, `runners/` only): the dead one slumped on its side, belly run out, limbs on the ice, rimed, a dark split with no red window.
- 7c2ee51 (life 27ef642): the dead one's muzzle on the snow and a fan of arched rimed tendrils (in frame at 7632); each of the herd breathes at its own rate, the lying ones ease a shoulder at staggered times, the standing one's trunk sinks onto the carrying side; kites as clear skins without rainbow banding that thin and grey with distance.
- 8f849cf (life d1b04b2): coats as fine locks drawn out to points; contact shade under the dead one and the standing one; husks as frosted cones; cords rimed pale; the black shoulder seam gone.
- 1e0e7dd (life be3bf3e): the resting herd's coats hang by their own weight; one long broad ribbon at the struck spire; no alpha cut left, edges blended over a pixel or two, cords never finer than a pixel at 1920.

Ground (`land/`, `ridge.ts`):
- 158648c (ground d4f1455): the first spire on a thin outline of its own with a snowed shoulder (the other spires keep main's mesh); a cliff quad takes its own triangle's normal, so rock lies on its own plane and no snow streaks down walls; the struck spire keeps snow on more ledges.
- 5b6620f (ground bba4a89, from a bundle): the crest under the wide lens is a mesh five times finer with sharp rock through the snow and sastrugi (`land/drift.ts`); the first blade thins over its whole height; the pale runs that read as rain on the rock are gone.
- 06fc604 (ground 1c32100, from a bundle): the kite cliff's rock read a level coarser, small tilts halved, rime in cold masses on the gale side.

Storm (`strikes/`, `air/sea.ts`, `air/heaps.ts`):
- eb3e853 (storm 3021aec): the storm side climbs into a dark wall, so no ruled level stands left of the spire; the far deck takes the real deck picture's forms at the sky's slate tone; the deck flares with each strike; strikes build over three frames and die over eight; a far violet strike behind the dead one. The near heaps are main's, untouched.

Last merges of the wave:
- d498e75 (sky 30109ca): the sky's flow period shorter, the plate's horizon broken by cloud tops, the left mist in heads. A trial after it was reverted by its builder.
- 7c3600e (life 591499c): the standing one's coat hangs by its weight, so the walker's rump at 8250 is under locks and no bare hide shows; the dead one's claws are grey horn.
- 9d356a7 (storm efe98a1): the deck beyond the ridge takes the dusk's haze where the lens looks into the dusk, so the blue notch right of the first spire at 7579 is gone (the mist now hides half of the dusk gap); a white core and a violet glare where the stroke meets the tip at 7668.

## 2. Still wrong, worst first

Each line: where, what it shows, what its approved picture shows.

1. Rock, everywhere but the crest. Canal walls at 8090 and 8250: streaky stretched fibre; spine-4 shows ribbed, water-worn rock with a glossy meltwater floor. Hills through the mouth: flat grey facets; spine-4 shows snowed ridges in haze. Icicles: dark cones; spine-4 shows clear ice. Kite cliff at 7418: orange-brown with long pale stripes along the slab sides; spine-2 shows pale tan slabbed rock under heavy rime. In tone this rock is further from spine-2 than at the wave's start (4e84d7b had pale tan faces, flat and faceted; now it is browner and darker, with snow on its ledges): the one place where a key moved away, and the first thing to mend. Third spire at 7668: pale grey and crumpled in the flash, the near left rock a brown blur with no snow; spine-3 shows dark wet strata with snow on every ledge. Far spires: main's mesh, little done.
2. The dead one at 7579. The ground is a grey rippled sheet; spine-1 shows glazed wet rock, slush and sparkling ice. Everything is in focus (the look has haze, no focus blur); spine-1 has a soft far field. No snow flies near the lens. The forelimb is a furry lump and the claws are flat blades. No print trail. The camera stands higher and the spire nearer than in spine-1: open, not declined; a lower camera only as a proposal to the Builder. The mist hides half of the dusk gap since 9d356a7.
3. The cloud sea. Near heaps at 7234 and 7015 are main's: soft lumps with no torn crowns and no fog spilling round the lower spires; spine-0 shows a torn deck with the ridge stepping down into it. The far deck's top at 7668 and 7800 is a ruled edge (the foot of the sky's plate against the deck's tone); spine-3 shows a broken horizon. The left mist at 7200 and 7234 is soft, not cloud.
4. Coats. They are still cards: by the life builder's measure the herd at 8090 carries 8.16 of fine detail where spine-4 carries 2.74. The walker from behind is mottled, with a tan fringe at the lifted foot. The standing one's trunk moves little; the cave animals read as nearly still at 8075.
5. Strikes and kites. No fume and only dash sparks at the tip at 7668; a gap at the bolt's foot at 7234 behind vapour. Husks and far loops are plain at 7668. The sky is one warped picture, so wisps come and go rather than travel.
6. Foreground snow at 7015 and 7234: the crest gained; fine wind detail is still thin.
7. Not measured by anyone: the encode at 7420 to 7479 after the changes (the compression critic gave 5 before them), M3, repeat tests on browser 147, the final tier. `dFdx(frostL)` still sits inside an `if` in the spire rime (`land/shaders.ts`, near line 767).
8. Of the round 29 issues (`issues-spine.md`) the wave closed none by a critic's word. Not closed and not declined: strand fur, real displacement, canal walls, hills through the mouth, icicles, focus blur, print trail. Declined: ear movements only (nothing living has ears).

## 3. Versions held back

Ground, `agent/p7-spine-ground`:
- 6c23841: the 7418 plate hero read as a flat tan plane with a stitched trench.
- 3258510: a clapboard wall and tape rungs at 7418.
- de881c7: the third spire lost its ledge snow, a white rectangle and a slit at 7668 and 7800 (mended in d4f1455, merged).
- 811e6eb: `scorchBed` drew a black band of flowing tar at 7579 (merged without it as bba4a89).
- 0ebfabc, the builder's last: the bed at 7579 as parted dark slabs reads as rounded pads, stepping stones on snow, and its lift hides the tendrils and the foot of the ribs. The builder judged it the same way. The cause it found is worth keeping: the earlier beds lay under the crest's half metre mesh.

Life, `agent/p7-spine-life`:
- d60dd93: the corpse propped on stiff legs with a red window wound.
- 6d380b4: a bald pale hind paw read as a small standing animal.
- the kites of d4bf844: opaque lavender bands at 7234 (mended in 27ef642, merged).

Storm, `agent/p7-spine-storm`:
- e70f124: the dusk deck read as snow slopes.
- c51fa78: snow dunes and swell at 7120 and 7330.
- bbd969c: flat pale fog, glassy wedges at the spire's foot, a dark wedge at 7450, scribble sparks at 7668.
- bd3e910: the far deck pale like open water at 7668 and 7800 (mended in 3021aec, merged).

Sky, `agent/p7-spine-sky`: every version sent was merged.

## 4. What to try next, for the worst three

1. Rock. Lay the rock textures by face normal (three planes) and give the canal walls and the hills through the mouth real displacement, not a shaded plane; start at 8090, where the walls fill the frame. At 7418 the albedo is already pale: the orange-brown comes from the warm low rig on small normals, so change the light on that cliff or its normals, not its colour; break the long pale stripes by laying rime in masses across slab sides, with plumes off the edges.
2. 7579. Build the bed as one broken sheet, not pads: the mesh `scorchBed` exists; lay it on the highest ground within a cell as 0ebfabc does, keep its joints open through the crest snow, glaze the tops, and keep it below the tendrils and the ribs. Add a depth blur to the look for the shots 7499 to 7659 only (the sky's line of `index.ts`), and snow flying near the lens. A lower camera goes to the Builder as a before and after, not into a merge.
3. Cloud sea. Opacity taken from the depth walked under the deck's top, with torn crowns, worked for the far left fall and made glassy panes where it met rock: keep it off the rock by a margin and try it on the near heaps. Match the tone of the plate's foot to the deck's (a job across the sky's and the storm's files, to be given to one of them) so the ruled edge at 7668 and 7800 goes.

## 5. What a newcomer would trip over

- Guard frames 1241 and 4409 (other units) must stay byte for byte: render them at draft, preview, and `cmp` with files made on the branch's start. Equal at every report of this wave, and at 9d356a7.
- Never two builders in one file. `air/sea.ts` and `air/heaps.ts` are the storm's; the rest of `air/` and all `shared/` are the sky's; `src/places/spine/index.ts` belongs to nobody but its `look` line, which is the sky's.
- Who holds what was settled in this wave: the ground under the dead one (the scorch, `SCORCH_BLOCK` in `land/shaders.ts`) is the ground's, the body and its prints are the life's, the spindrift over it and all haze are the sky's; the light inside the canal is the sky's (`shared/glsl.ts`), not the land's mouths; the straight top edge of the far deck at 7668 and 7800 is the horizon of the sky's plate, which the deck cannot break from `air/sea.ts`.
- The lee side already falls 2000 m by 1.3 km out (measured by the ground builder): there is no massif to lower in `land/height.ts`, against what wave 1's hand-over said. The level of the deck is the storm's own.
- Frames that do not repeat between runs come from screen derivatives (`dFdx`, `dFdy`, `fwidth`) or implicit-level `texture2D` reads of mipmapped textures inside branches or loops. Take derivatives at the top of `main` and read with `textureGrad` or `textureLod`. Mended in this wave in the sky, the kites, the runners, the scorch and `open.ts`; one is known to remain: `dFdx(frostL)` in the spire rime of `land/shaders.ts`. Repeat tests are to be trusted only on browser 147.0.7727.15; the lead's machine carried another build and ran none.
- `kit/06-ASSETS.md` allows an approved picture as a source of sky: the sky's panorama comes from that, on the conditions that no bolt, kite or spire is baked in and that a nearer layer keeps parallax.
- The runners import `floorRise` from `land/meshes.ts` (read only). Do not rename it. `tipOf`, `finEdge` and the lee edge and tip lines of `ridge.ts` are read by the kites and the strikes.
- The rig feeds every part. The cold grade of b25efe3 changed how rock, snow and coats sit; look at 7418, 7450 and 8090 after any change in `shared/`.
- `WALKERS = false` in `runners/index.ts` is on purpose since wave 1 (a far walker read as a person in the wide; spine-1 has none). The Builder has that answer.
- `scorchBed` in `land/meshes.ts` is kept and not drawn (see held versions).
- The encode: the Builder measured that at 7450 the 10 Mb/s encode loses the picture where it carries contrast from one pixel to the next, and that the shared grain is not the cause. The rule that follows: nothing finer than a pixel at 1920 wide, soft edges on lines and cards, detail at several pixels and up. The coats, the cords and the kite cliff were taken a step that way; nobody measured the result.
- Gate G8 passes at 9d356a7, the last commit of picture code. Every commit, merges too, ends with the trailer `Co-authored-by: Perplexity <noreply@perplexity.ai>` once.
- Pushing failed on the builders' machines for about twenty minutes near minute 170; two ground versions came as bundles cut against the unit branch's head.
- Cost, `npm run -s cost -- --frame N --format uhd --tier draft --parts none --runs 2` on the lead's machine, seconds a sample: 7234 22.33 before, 23.71 at 9d356a7 (plus 6.2 percent); 7579 30.25 before, 33.58 (plus 11.0 percent); 8090 28.79 before, 29.32 (plus 1.8 percent). The cap was 16 percent. 7015 was 22.23 before and was not measured again by the lead; the storm builder had 22.61 against its own 21.38 on its machine.
- The after set of this wave is `out/work/after/` on the lead's machine (not in the repository): draft, preview, frames 1241, 4409, 7015, 7120, 7234, 7330, 7418, 7450, 7579, 7668, 7800, 7950, 8090, 8250, with 7234 and 7579 at review tier in hd; the before set of the same frames from 4e84d7b is `out/work/before/`.
