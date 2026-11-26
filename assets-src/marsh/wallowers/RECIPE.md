# Recipes of the marsh's animals and stalks

The material pictures of the wallowers, the dead and the stalks. Each began as one generated picture, 1254 px square, of a flat surface seen straight on under even light. The script takes the slow drift of tone out of it, makes it tile and writes a colour picture and a data picture (slope in red and green, height in blue) from it.

Removed at version 3: `hide.jpg` and `hide-nh.png` of this folder are deleted, the hide now reads `public/assets/marsh/mat/hide.jpg` and `public/assets/marsh/mat/rime.jpg` of the Builder. Their recipe stays here for the record, the source picture is still `assets-src/marsh/wallowers/hide-source.jpg`:

Made by: the image tool `generate_image` of Perplexity Computer with its default model (the tool did not report the model's name), aspect 1:1, then `assets-src/marsh/wallowers/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/wallowers/hide-source.jpg`, the generated picture, 1254 px square. Picture passed to the model with the prompt, for colour and character only: `references/approved/4-marsh/marsh-3-mud-wallowers.jpg`. No approved picture and no photograph is drawn into the place.
Prompt or command: the prompt below, then `node assets-src/marsh/wallowers/make-materials.mjs`.

```
A material texture, seen square on in an orthographic view: the bare hide of a huge hairless mud-wallowing animal, a patch about 1.2 metres across. Thick grey-brown skin like that of a walrus or an old elephant, deeply creased in long irregular folds that mostly run one way (top to bottom), crossed by finer wrinkles in a net, with old scars, pits, small warty lumps, dried mud in the creases and a few thin flakes of dried white salt. Dull, matte, dirty, uneven in colour, never smooth, waxy or rubbery. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there. Photographic, with real grain and real micro detail, no painted or stylised look. Output one square image. Sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no whole animals, no objects lying on top.
```

Takes: 1 made, take 1 kept.
Why this one: creased bare hide with a net of fine wrinkles and salt flakes, evenly lit, in the grey-brown of the wallowers of the approved picture. It is read fine and low in contrast under folds that are in the animal's shape.
Date: 2026-11-25

## `public/assets/marsh/wallowers/salt.jpg` and `public/assets/marsh/wallowers/salt-nh.png`

Made by: the image tool `generate_image` of Perplexity Computer with its default model (the tool did not report the model's name), aspect 1:1, then `assets-src/marsh/wallowers/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/wallowers/salt-source.jpg`, the generated picture, 1254 px square. Picture passed to the model with the prompt, for colour and character only: `references/approved/4-marsh/marsh-4-the-one-on-the-thin-crust.jpg`. No approved picture and no photograph is drawn into the place.
Prompt or command: the prompt below, then `node assets-src/marsh/wallowers/make-materials.mjs`.

```
A material texture, seen straight down from above in an orthographic view: a thick crust of dried salt crystals caked on a dead thing, a patch about 1 metre across. Dirty white and grey-white salt in knobs, frills, coarse sugar-like crystals and curling flakes, with pits and cracks where the crust has broken, and faint pink and rust stains in the hollows. Matte and dry, like hoar frost mixed with dried mud. Flat, even, shadowless overcast light so that no side is brighter than another. The surface fills the whole frame edge to edge at one uniform scale, as a seamless tileable texture. The first reference image is the place this material belongs to: take its colours, its age and its character from there. Photographic, with real grain and real micro detail, no painted or stylised look. Output one square image. Sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no whole animals, no objects lying on top.
```

Takes: 1 made, take 1 kept.
Why this one: knobs, frills and flakes of dirty white salt with rust in the hollows, the crust on the dead and on the stalks of the approved pictures. It serves the cake on the wallowers' backs, the dead and the tubes of the stalks.
Date: 2026-11-25

## `public/assets/marsh/wallowers/materials.json`

Made by: `assets-src/marsh/wallowers/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.
From: `assets-src/marsh/wallowers/hide-source.jpg` and `assets-src/marsh/wallowers/salt-source.jpg`.
Prompt or command: `node assets-src/marsh/wallowers/make-materials.mjs`

```
node assets-src/marsh/wallowers/make-materials.mjs
```

Takes: 1 made, take 1 kept.
Why this one: it records the recipe of the script and the linear mean colour of each picture, which the shaders divide by.
Date: 2026-11-25
