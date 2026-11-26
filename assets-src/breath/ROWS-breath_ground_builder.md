# Rows of breath_ground_builder

Every file of the ground builder that is not computed by the place's own code.

| File | What it is | Tool or model | Prompt or command | Take | Date |
| --- | --- | --- | --- | --- | --- |
| `assets-src/breath/land/src/crust.jpg` | The generated sheet of travertine crust seen from straight above, 1672 x 941, kept as a JPEG of quality 95 | `generate_image` (default model), with `references/approved/3-breath/breath-2-the-rim.jpg` passed as the place | Prompt 1 below | 1 of 1 | 2026-11-26 |
| `public/assets/breath/land/crust.jpg`, `public/assets/breath/land/crust-nh.png` | The crust as a repeating tile of 1024 px: colour, and slope with height | `assets-src/breath/land/make-ground.py` (numpy, pillow) | `/home/user/bpyenv/bin/python assets-src/breath/land/make-ground.py` | 1 | 2026-11-26 |
| `assets-src/breath/land/src/gravel.jpg` | The generated sheet of loose scree and gravel seen from straight above, 1536 x 1024, kept as a JPEG of quality 95 | `generate_image` (default model), with `references/approved/3-breath/breath-2-the-rim.jpg` passed as the place | Prompt 2 below | 1 of 1 | 2026-11-26 |
| `public/assets/breath/land/gravel.jpg`, `public/assets/breath/land/gravel-nh.png` | The gravel as a repeating tile of 1024 px: colour, and slope with height | `assets-src/breath/land/make-ground.py` (numpy, pillow) | `/home/user/bpyenv/bin/python assets-src/breath/land/make-ground.py` | 1 | 2026-11-26 |

## Prompt 1

```
A material texture photographed straight down from directly above, orthographic: a flat patch about 2 metres across of pale fractured travertine crust at the rim of a hot spring vent. Cream, bone-white and pale grey mineral crust broken into irregular thin plates and layered flakes with chipped edges, narrow dark cracks between the plates filled with coarse grit, small rounded pebbles and sharp gravel scattered across it, a few low rimstone lips and pitted pores, faint rust-brown and dull red mineral stain in some cracks. Dry on the high plates, damp and darker in the lows. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale rocky ground from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

## Prompt 2

```
A material texture photographed straight down from directly above, orthographic: a patch about 1.2 metres across of loose scree and gravel lying on pale travertine rock: angular broken chips of cream and grey limestone from thumb-nail to fist size, a few larger flat shards, coarse sand and grit between them, pale mineral dust, some pieces stained rust-brown. Packed densely, every stone distinct with crisp edges. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale rocky ground from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

V2: `public/assets/breath/land/crust-nh.png` and `gravel-nh.png` were computed again by `assets-src/breath/land/make-ground.py` with the height taken from the broad forms of the picture (crust fine 4.0, gravel 1.6), because pixel scale height under the low sun read as dark grain.
