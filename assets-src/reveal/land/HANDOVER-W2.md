# The Reveal, the land: hand-over of the second wave (reveal_land_builder_w2)

Branch `agent/p7-reveal-land`. Code in `src/places/reveal/land/index.ts`. Pictures drawn again and laid into the maps: `assets-src/reveal/land/make_country.py` (recipes in `RECIPE.md`, rows in `../ROWS-reveal_land_builder_w2.md`). Whole pipeline: `make_country.py`, `make_relief.py`, `make_bake.py`, about 4.5 minutes.

## First, for whoever comes next

- New relief maps with detail at the native uhd size were not baked. Two more levels of the maps are wanted (a at 8192 px and b at 8192 px, or a fifth level between a and b). The helper can bake but not draw: the drawing is the image model's work by region, as `make_country.py` does it for the chest, the hip and the lake district. About three hours, about 14 MB.
- One flute form still stands on most ranges (the jury's "comb"). `worn` and `upland` give smooth uplands below 900 km of view only: carried to orbit they cost 0.5 s a sample and turn on the detail tiles. The cure is in the maps, by province, not in the shader.

## What was changed, and where

- One land at every height, nothing switches with the camera: `RIB_BURIAL` stays 0.
- Chest (`chest/`): the first map's parallel ranges on the western three fifths, the image model's take 3 on the east (`chest/blend_first.py`), laid into maps a and b. With take 3 laid whole the ranges splayed from the neck and no ribcage was read at 400 px. `pick` (shader) lets pale rock stand on some ranges and on part of their length, so the ribs are unequal.
- Lake district (`lakes/`), hip massif and thigh range (`hip/`) drawn again by the image model and laid into maps a, b, c.
- `great` and `lesser`: the height of the country drawn together over 30 km decides which ranges carry pale rock. `chestAt` lets more of the chest's ranges be great, so each side holds five or six unlike ranges.
- Provinces (`provinceRed`, `provinceWet`, `provinceSand`) tint the low country; palette tan, rust, dark teal.
- Map reads use `textureLod` with levels taken from derivatives at the top of `main`: no derivative is taken inside a branch.
- Lake of the Eye: shelf by depth, wisps, threads along the shore, two eddies, a delta at the stream's mouth, a wet margin, map islets outside the shader's shore drowned.
- `upper`: the crater lake north of the lake of the Eye, small, its shore broken, a bar of rock across it (`bar`), so it is two unlike tarns and no twin of the lake. Pools as real water on the pitted red plain (`pittedAt`). The bay east of the lake is shoal far out (`inBay`), so it does not pair with the lake.
- Pelvis: pan wider, brine channels thicker. Sea silt (`siltAt`): ochre plumes in the sea below pelvis and legs, a domain warped twice and its ridges taken, each with a dense core and a thin skirt, strength varied along its length (`along`), shown above 680 km of view only.
- Vents: `pulse` wanders between beats, each lesser vent on its own time. The beat itself is `beat(seconds)` in `shared/rig.ts`, not changed.
- The western sea's limit (`westSea` in `shared/weather.ts`) is a straight line north of the skull: in the land it is bent (`ragged`) and let go north of master y 900.
- From orbit the wide maps are read 0.6 of a level coarser (`orbitBias`) and the baked horizon (`uLightWide`) 1.2 levels coarser: the thrown shadows keep a soft edge and the rock its grain. Land median difference pixel to pixel at 10027, hd review: 5.0 across and 7.1 down before, 3.9 and 5.5 after; uhd draft 3.6 and 4.9.
- By night the pale rock is taken down by a third and the low country shows a little more.

## Tried, and not worth trying again

- `textureGrad` for the map reads: 15.2 s a sample at 10027 against 12.8 s with `textureLod`.
- Chest takes 1, 2, 4 and 5: the ribs were lost or the figure broken at 10027 (see `RECIPE.md`). The image model does not keep the direction of ranges: it turns them along the valley. One take of six is left.
- Ochre lines in the sea drawn from ridged noise with a hard threshold: brush strokes of one width, and thin closed rings like contours. Soft cores with skirts read as silt.
- A wider soft edge on the thrown shadow (`softEdge`) from orbit: no change, the hard edge is in the baked horizon, texel to texel.
- A shallow floor in the upper crater lake: it turned amber all over.

## Still wrong beside the approved pictures, worst first

- 9700 to 9760: the lake of the Eye and the teal bay still stand side by side in the pale massif; the approved picture holds them so, and some will still read a face.
- The chest's ribs are again of one spacing and one flute (the first map's): unequal in length and in pale rock only. From 9700 to 9800 they read as a ribcage early, as in reveal-3.
- The same flute on most ranges.
- 9627: the silt band is still broad on the south west; approved is thinner.
- 10027: the ochre plumes lie in the bay between the legs only; approved carries them all round the pelvis and both legs, thinner and longer.
- 10027: what speckle remains is the grain of map a itself at one texel; a finer map with a true mip chain is the cure, not a coarser read.
- Rivers: not seated in the relief, one width.
