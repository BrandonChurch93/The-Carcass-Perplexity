# The Spine: hand-over of the wide polish (wave of spine_lead)

Unit `spine`, film frames 7015 to 8304. Branch `agent/p6-spine-polish`. Written by the lead of the wave; the lead wrote no picture code. Older notes of single folders stand beside this file: `shared/HANDOVER.md`, `strikes/HANDOVER.md`.

Frames used to judge: 7015 (first frame), 7234 (spine-0), 7579 (spine-1), 7418 (spine-2), 7668 (spine-3), 8090 (spine-4); strikes at 7015, 7231, 7450, 7665, 7874, 8091; the walker's feet 8293 to 8304.

## 1. Done, part by part, with the commit of each merge

Kites and runners (`kites/`, `runners/`):
- 4177b65: the branch `agent/spine-kites` at 8c698001 taken in first.
- 389570c: kites as bodies, sagging rimed cords with icicles, holdfast knots.
- 4a65619: the walker (8042 to 8304) treads: footfalls fixed in the world, two-bone legs solved onto them, weight on the carrying forefoot, a dark contact, prints, the ice's dim showing of legs. It reads the canal floor from `floorRise` of `land/meshes.ts`.
- d03609d: walker back at its old distance (1.9 m/s), coat as strands that part to their ends, herd breathes and shifts, the dead one (7579) flat on its side and sunk.
- 845e93f: the kites take main's glassy veil again on narrow torn blades with lengthwise folds; husks dark frosted brown; five kites on the first spire. `mat/kiteskin.jpg` deleted.
- 02b85fb: a faint body in the wide's kites, prints as a shallow pad and four toes, the dead one's legs re-posed (life cc97ba4).

Storm (`strikes/`, `air/heaps.ts`, `air/sea.ts`):
- 4f1e652: the cloud sea's GLSL and uniforms moved from `air/volume.ts` to `air/sea.ts`, no pixel changed, so two builders never share a file.
- 622bbf0: the bolt as a channel with lit cloud at its root, restrike, decay of the flash.
- 77ec5c5: mist over the sea's tops, softer far banks.
- 2fc8193: the deck falls 360 m away from the ridge and is shaded by its depth under the crest; warm only on crowns the dusk reaches; strike 5 shows no white bar on 7874.
- 262640e: the cloud's glow comes up over the frames before a stroke; more of the first strike's light on the snow; recipe of `mat/litcloud.jpg`.
- 2e0867f: the storm side's far deck stays in the air's haze: no specks, no stepped heads at the horizon.
- 02b85fb: strike 2 casts from the lit cloud 1100 m over the tip; the snow under the first spire takes a little more of the flash (storm 2b11d79).

Sky, light, grade (`air/` but the sea, `shared/`, the `look` line of `index.ts`):
- 13793b8: rig without sheen on snow and rough rock, warm dusk rim, snow light thrown up onto rock; haze beyond the first spire; the sky's foot reads the far sea so the horizon dissolves; grade (exposure 1.7, contrast 1.1, warm tint). The marched storm of this builder is switched off (`STORM_MARCHED` in `air/index.ts`).
- 6f9a140: 13 storm masses from four generated pictures on two rings (3.5 and 8 km) over the old dome, each drifting, with parallax under the dolly (`air/masses.ts`).
- 86ad58d: inside the canal the rig's sky light comes from the two mouths; the sky in the mouth is the brightest thing; recipes of the four masses.
- 28c75e2: the thin bright band of orange low at the horizon is back; mass edges fade as vapour.
- 7dddc36: the band is cut into lengths by far cloud bars and runs behind the far ridge in the canal; far spires keep more of their shade in a flash (sky adef2a5).

Ground (`land/`, `ridge.ts`):
- 9058dd5: wind-packed snow on the ridge from generated sheets at two sizes, dark bedrock breaking through. Spires as they were.
- c77588b: recipes of the land's four sheets; `tiles.json` deleted.
- edc1ee4: the cave mouth has an ice lip with icicles and one dimly lit inner wall.
- 7dddc36: the ice on the mouth's lip stands in lengths with bare rock between; snow deeper, fewer bare patches (ground 5eca32e).

## 2. Still wrong, worst first

1. The first spire (7015, 7234, 7418). It shows a leaning cone with rock texture smeared down it, and at 7418 soft rounded lumps with dark blotches. spine-0 and spine-2 ask a blade of split, slabbed rock with a dark lee and a rimed windward face, sharp at one texel a pixel. Tried: bevelled hero relief (800597a: rust lumps, snow lost), joints cut by the shader (d9b4210: black strokes curved like wood grain, dotted where rime meets), planar slabs in the mesh (eb3ce4c, 1d774c6: roof shingles at 7234, flat tan boards with black gaps at 7418). None beat the rock as it stood.
2. Far spires and the cloud sea (7015, 7234, 7668). The far spires are pale flat cut-outs, in a flash a lilac fill; the sea is soft heaps without torn tops, the storm side a featureless hazed level, the dusk side has no drop (the land's lee flank is a broad massif 100 m under the crest, so banks stand at ridge height). spine-0 asks spires that stand in weather with their own light and shade, and a sea with depth. Tried: haze by distance (in), shading by depth under the crest (in); a marched storm volume was a wavy grey noise field (322a3a9) and is off.
3. The sky (all ridge frames). Masses drift and lean but do not turn over; the band is one ruled even line; no snow in the air on the ridge (streaks read as grey dashes at 2ae0492 and were switched off). spine-0 and spine-3 ask driven snow and cloud that boils.
4. Kites in the wide (7015, 7234): thin scribbles of white line. Close (7418, 7450) they are glass again but fewer and plainer than spine-2.
5. The canal (8090, 8250): walls are streaky fibre, not ribbed water-worn rock; the walker's prints are round holes; coat strands blunt close.
6. The dead one (7579): legs stubby; the burn under it reads as dark water.
7. Strike light: the near spire and the snow under it take little of the flash (7231).
8. Encode at 7450: proven only on a stand-in (x264 at 625 kb/s at preview size, 7438 to 7461: worst frame 21.7 dB and flipping before, 22.9 and flat after). Not run with the film's encoder at 10 Mb/s.

## 3. Held versions

Ground, branch `agent/p6-spine-ground`:
- 800597a (V1): bevelled hero relief. Rust lumpy rock, snow lost on the spire, outcrops lost.
- e528ecf (early look): tone right, but at 7418 soft sandstone lumps, sooty blotches, blue-grey rime; the spire still a cone.
- d9b4210 (V2, shader joints 61d4988): joints are black strokes curved like wood grain, dotted where rime meets them; the rimed block a lattice.
- eb3ce4c, 1d774c6 (planar slabs, the `heroSlabs` mesh and its bake): roof shingles at 7234, flat tan boards with black gaps at 7418. A layered mesh drawn double sided cost 3.4 s more.
- 66ca369 (far blades, TABLE rows and `shear` in `ridge.ts`): tips and edges of spires 6 and 8 to 15 move; the lines kites and strikes read were not checked. Never judged in a merge.

Sky, branch `agent/p6-spine-sky` (its history was rewritten once by the builder, early, to add trailers; the hashes below are as they were sent):
- 0d49ccf (V1, marched storm): smooth smears, a peach band, teal dusk; further from spine-0 than main.
- 322a3a9 (early look): a wavy grey noise field, pale and flat, kites lost in it. The march stays in the tree, off.
- 2ae0492, 63016f9, 214ebda (V2 and two fixes): snow as grey dashes, a milky haze patch on the near spire, husks orange; then haze lost beyond the canal mouth at 8090 and a ruled horizon at 7015. All mended in f3783f1, which was merged. The snow streaks stay off.

Kites and runners, branch `agent/p6-spine-life`:
- 54bb65e (V1): opaque mauve kites that vanish in the wide, holdfasts removed.
- The builder's own film skin and rose-violet patches (in 1f8232c, merged, then taken out again in 7410d74 at the Builder's guard: flat opaque strips against the subject sheet's "translucent ribbons").
- Not drawn, kept in code: crossing walkers (`WALKERS = false`), prints fading with age, larger herd breath.

Storm, branch `agent/p6-spine-storm`: every version sent was merged. Held by the builder itself: a second cast point a strike; far heads on the storm side.

## 4. What to try next, for each of the worst three

1. First spire: model it as a mesh hero outside the shader (a sculpt with real fracture planes, baked normal and occlusion), then lay today's rock sheets on it; judge at 7418 first, since every version failed there, and only then at 7234. Keep `tipOf`, `finEdge`, the lee edge and tip lines of `ridge.ts`: strikes, kites and the camera read them.
2. Far spires and sea: draw the far spires as lit geometry with their own rime and shade, then lay the haze over; lower the lee massif under the dusk side in `land/height.ts` so the sea can fall there; give the far deck large slow forms (an encoder holds those), not fine noise.
3. Sky: let masses turn over (two pictures of one mass cross-faded with a slow warp), break the band with cloud along its length, and bring driven snow back as soft streaked veils at three depths, never as single dashes.

## 5. What a newcomer would trip over

- Guard frames 1241 and 4409 (other units) must stay byte for byte; render them draft, preview, and `cmp` with files made on `origin/main`.
- Never two builders in one file. `air/sea.ts` and `air/heaps.ts` are the storm's; the rest of `air/` and all `shared/` are the sky's; `src/places/spine/index.ts` belongs to nobody but its `look` line, which is the sky's.
- The runners import `floorRise` from `land/meshes.ts` (read only): `ctx.rig.land` has no canal floor. Do not rename it.
- The rig feeds every part. A change of exposure or of the warm rim in `shared/` turns the husks rust orange and hides the band; look at 7418, 7450 and 8090 after any change there.
- `STORM_MARCHED` in `air/index.ts` is false: the marched storm is compiled out.
- Gate G8: every file under `public/assets/spine/` needs a `## ` heading with its full path in a `RECIPE.md` under `assets-src/spine/`. Green at the last commit.
- Cost is measured with `npm run -s cost -- --frame N --format uhd --tier draft --parts spine/sky`; the tool varies by about 0.4 s a sample. Before: 7015 19.97, 8090 24.68. Now: 7015 21.97 (10 percent over), 8090 28.39 (15 percent over). Shares of the rise: the masses and the canal light (sky), strands of the coat (runners at 7579 are 3.33 s a sample), the land's sheets (land alone 12.24 to 12.7 at 7234).
- Every commit, merges too, ends with the trailer `Co-authored-by: Perplexity <noreply@perplexity.ai>` once. Some early merge commits of this wave lack it (4177b65 and before the note); they were not rewritten, by order.
- Pushing failed on some machines in this wave; the sky's last three versions came as bundles, and the lead's last commits went to the Builder as a bundle.
- The mouth of the first spire is lit by a term of the land's own in `land/shaders.ts`, since no sky stands over the canal in the rig; a mouth light in `shared/` would be the real mend.
- The near spire takes almost none of a flash: `strikeIrradiance` in `shared/glsl.ts` wraps 6 percent onto faces turned from the channel. The storm cannot mend that in its files.
- The dead one at 7579 does not reach the bar close. The camera was kept, by rule; if a critic names it, keep the animal at a distance.
