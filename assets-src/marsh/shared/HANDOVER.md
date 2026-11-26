# Blood Marsh, ground and weather: hand-over from marsh_ground_owner_3 (the last owner)

Branch `agent/marsh-ground-3`. Folders: `src/places/marsh/shared/`, root `index.ts`, `land/`, `brine/`, `air/`. Written at minute MINUTE of 240 of wave 3. The notes of owners 1 and 2 are in the history of this file.

## How each part is drawn

- **land**, **crust** (`land/field.ts`, `land/index.ts`, `land/shaders.ts`). One field of metres to the shore; one fragment shader. Plates from the Builder's pictures with their reliefs; rock from `mat/ledge`, darker now, red in its fractures, salt on what stands proud. Round the wallowers of marsh-3 (`churn`) the bank is wet brown mud in broad clods with brown-red brine standing in the prints and a sheen from a smoothed normal. On the thin crust and the bare mud the same sheen. Round the stuck one the film is grey-brown slurry. Far shores carry a wider dark wet band (`farBand`).
- **brine** (`brine/shaders.ts`, `shared/brine-glsl.ts`). Colour by depth: pale bed (0.27, 0.085, 0.07), body (0.07, 0.0125, 0.0095), pit almost black red. Silt drawn out in streaks down the current (two layers, 0.021 and 0.034 units a second). The sky lies on it in long wandering lanes that move with the wind (`gust`); mirror share 0.02 + 0.21 (1 - nv)^5, tinted (1, 0.7, 0.66). Froth is pink and only at lips and boils. `brineSlurry` turns it grey-brown within 1.8 to 4.2 m of the stuck one.
- **domes**, **burst**. Dome: wet film, a wide soft window broken by runs, darker when seen across a pool. Burst: tear and crown are one event (0.256 s); the crown is a thrown sheet in fingers of two sizes, dark at the foot, with a rolled lip; drops fly ballistic arcs.
- **sky**, **air**, **rain**, **steam** (`air/`): air density 0.00007 (half of what I received) and warm (0.51, 0.475, 0.48); far bank 0.00014 from 230 m plus 0.0005 past 700 m so the last of the land has no clean line; low sheets 0.05; seep steam 0.28; pool mist 0.05.
- **cameras** (`index.ts`): K1 focus 3.8 aperture 0.0045; K2 focus 3.2 aperture 0.006; K3 aperture 0.007; K4 focus 5.7 aperture 0.011.

## Tried and dropped (do not try twice)

- Everything in owner 2's list still holds: implicit-lod reads after a `discard` break G10; branches save no cost; rafts of froth speckle; rain at 0.95 hatches; marched columns for low mist are a grey screen.
- Rings stamped round waders and on open brine (`WADER_RINGS = 0`, `RAFTS = 0`): the jury called them a graphic. No ring is drawn unless something moves there (the life owner's rings are its own).
- Anisotropy 16 on the ground's colour pictures: cost, and a sharper far speckle. Now 1, `tFlat` 4.
- A sheen on wet mud taken from the bumpy normal (0.2): salt-and-pepper glitter. It must come from the smoothed normal (0.11).
- Sky lanes with a wander of 22 m: marbled paint in the pools. Straight lanes: ruled stripes. 9 m and strength 0.075 is the middle.
- Wide lens openings to hide the ground (K1 0.011): measure M3 went red (0.60). Blur is the strongest lever on M3.
- The silt picture's hue on the trodden mud: it turned the clods red and the film grey. Only its grain is used.

## Round 17, each severe and major issue on my parts, and what I did

- severe, marsh-0 "Uniform cool white fog nearly erases the mountain rim and distant salt flats": air halved and warmed, far bank only past 230 m, ridge and rain curtain read. The last line of the flats is softened, not layered: open.
- severe, marsh-0 "The broad dark channel and bare central spit ... the water is too smooth and its uniform thin white edges look drawn on": colour by depth, current streaks, sky lanes, wet band at the shores, white edge cut. The channel's plan (narrow, winding, terraced) is unchanged: open.
- severe, marsh-0 "A dense speckled white spray wall obscures the pool, with small regular ring marks": steam cut to a low veil, stamped rings off. Blister domes are few: open.
- severe, marsh-1 "Broad dark mirror reflections and flat red water replace choppy overlapping waves. The splash looks like isolated solid pink prongs, and the bubble has a hard dark foot": chop to the lens, mirror share by angle, crown as a sheet with fingers, dome foot softened with lip froth. Waves are still lower than the picture's: open.
- severe, marsh-1 "A broad chalk slope consumes the near water and the left trunk stays heavily defined": bank stained and lowered in tone, small bubble clusters at the lip. The Builder's last word: still "a blurred brown slope" with no white crusted rim: open, the worst of marsh-1.
- severe, marsh-2 "A bright grainy steam mass takes over the center": pool mist 0.05, no grain. The centre is still 16 levels paler than approved.
- severe, marsh-3 "The opaque pink-red sheet and broad, pale concentric rings": dark rust brine, rings off, mirror. severe, marsh-3 left shore "Open water runs under the adult's raised muzzle": mud bank under the animals (`churn`), wet.
- severe, marsh-4 "a continuous reddish pool with broad, flat patches of white crust" and "one bright white plume": grey-brown slurry pocket, mud between slabs, white only on high edges, plume cut. Plates have no thickness: open.
- severe, R3 "the crown is a ring of flat pink cards ... the drops are opaque dark beads hanging in a neat arc" and "a perfect glass hemisphere with one round specular dot": sheet with fingers and a lip, dark liquid colour; dome with a broken wide window. No film colour, no wall thickness: open.
- severe, R4 "the second bubble vanishes leaving a flat surface ring ... before a tall crown splash erupts late", "hang almost frozen", "uniformly fades out": tear and crown are one event, crown lasts 0.256 s, drops fall. "the red water shows no current": current streaks and moving lanes; held marsh-0 changes over 14 percent of the picture.
- major, marsh-0 rock "smooth, marbled folds": darker, red fractures, salt on tops; still soft close to: open. major, "repetitive sprayed-on white pattern": far flats by number, anisotropy cut. major, marsh-1 air "even white background" and "field of discrete grey and pink dots": warm thin air, no grain.
- major, crust "flat decal patches ... no thickness, no wet dark edge": wet band and mud between slabs; thickness open. major, marsh-4 rocks "one grey material": the pale mound in the corner is the life owner's. major, burst "papery fin-like peaks": partly (see crown).
- Jury: stamped rings (off), faceted crown and glass dome (above), jagged edge where ground meets water (wet lip, froth, soaked band; the mesh edge still shows close to at marsh-1).

## Still wrong beside the approved pictures, worst first

- marsh-1: near bank blurred and brown with no white crusted salt rim; water in front about 15 levels too pale; crown a thin sheet; dome without film colour.
- marsh-0: channel plan and terraces; flats pinker and less white than approved; far band soft but not layered; near rock still soft.
- marsh-2: centre pool pale and misty; marsh-3: far flats pale, distance empty of wet flats; marsh-4: plates without thickness or undercut.
- No rain rings on the brine (a stamped ring was judged worse than none).

## Staged, by shot

Nothing reads `stagedSeconds()`. The burst at frame 6158 and the small burst 0.15 s before key marsh-1 are fixed times. Lens openings are the same through a shot.

## Cost at 3840 x 2160, key marsh-0, draft

COSTLINE

## Checks at hand-over

CHECKLINE

## What I would do next, in order

1. marsh-1 near bank: a real salt rim (instanced crust caps along the waterline, white above, red wet under), and less blur on it.
2. Rain rings as relief: two layers of cells, one crest each, ages differing, read at cell centres with `textureLod`, within 25 m, dying in 0.7 s.
3. Crown and dome: thickness by view angle and a thin-film tint; the crown's sheet needs a second, inner wall.
4. marsh-0: cut the channel narrower with terraces in the field; plates with seams at mid distance.
5. Cost: the land shader is still most of the frame.
