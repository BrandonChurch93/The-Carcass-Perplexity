# Recipes of the Ribs: air

The air folder loads two pictures of its own, both made from one generated take of a storm sky, and the far strait `public/assets/ribs/mat/far.jpg` (recipe in `assets-src/ribs/mat/RECIPE.md`). The sky is laid on the dome by heading and height in `skyCloud` (`src/places/ribs/shared/glsl.ts`), mirrored where it repeats, turning with the wind. `public/assets/ribs/mat/sky.jpg` is no longer read by the air folder.

## `public/assets/ribs/air/storm.jpg`
Made by: `assets-src/ribs/air/sheet.py` (Python 3.14.8, Pillow 13.0.0, numpy 2.5.5), from a picture made by `generate_image`, default model, aspect 4:3
From: `assets-src/ribs/air/src/storm-1.png` (the generated take, 1536 by 1024); the take itself was made with `references/approved/1-ribs/ribs-0-establishing.jpg` passed as reference
Prompt or command: `python3 assets-src/ribs/air/sheet.py` from the repo's root (the grain of the dark bases smoothed by 0.9 px, thin lit rims held to 1.15 times their surroundings of 5 px, enlarged to 3072 by 2048 with Lanczos, no sharpening, JPEG quality 92). The prompt of the take: "A photograph of the sky only, taken with a wide lens over the open sea in the hour before sunset as a violent storm breaks up. Almost the whole frame is heavy storm cloud: blue-black and dark slate cumulonimbus bases with real structure, hanging ragged scud, torn shelves and deep folds, darkest toward the top of the frame, with thin paler grey lower down. Right of the middle, about a third of the way up, there is ONE break in the cloud: a ragged tear with burning edges where low warm sunlight comes through from behind the cloud, pale gold and silver-white at its core, the cloud edges round it lit amber and cream, faint rays fanning from it into the dark cloud. The sun itself is hidden behind cloud: no sun disc anywhere. Everything else stays dark and cold, slate and black with a little silver. The bottom edge of the frame lies just above the horizon and the top edge is high overhead: only sky and cloud, no horizon line, no land, no sea, no rocks, no birds. The reference image is the place this sky belongs to: take the weight and colour of its cloud from it, but darker and with the single warm break. A real photograph as a camera records a real storm sky: real soft gradients, fine real cloud detail, no painted or stylised look. One wide landscape image, three units wide and two tall. No text, no logo, no people."
Takes: 1 made, 1 kept (`storm-1.png`)
Why this one: dark slate cloud with real structure and one burning break, the sky of the approved establishing picture, with no horizon and no sun disc in it
Date: 2026-11-26

## `public/assets/ribs/air/storm-fine.jpg`
Made by: `assets-src/ribs/air/fine.py` (Python 3.14.8, Pillow 13.0.0, numpy 2.5.5); computed, no model
From: `assets-src/ribs/air/src/storm-1.png`
Prompt or command: `python3 assets-src/ribs/air/fine.py` from the repo's root (the take's brightness over its own local mean of 14 px, smoothed by 1.6 px, flat where the local mean is bright, one grey picture, JPEG quality 95)
Takes: computed, no take
Why this one: the sheet has a sixth of a texel for a pixel of the widest lens at 3840 wide; this map, laid in four times smaller, gives the cloud structure at that size without the break's edges, which read as veins
Date: 2026-11-26
