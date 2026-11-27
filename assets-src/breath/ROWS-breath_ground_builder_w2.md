# Rows of breath_ground_builder_w2

Every file of the ground builder of the second wave that is not computed by the place's own code.

| File | What it is | Tool or model | Prompt or command | Take | Date |
| --- | --- | --- | --- | --- | --- |
| `assets-src/breath/land/src/travface.jpg` | The generated sheet of the broken bedded face of a travertine bank, 1536 x 1024, kept as a JPEG of quality 95 | `generate_image` (default model), with `references/approved/3-breath/breath-4-down-the-shaft.jpg` passed as the place | Prompt 1 below | 1 of 1 | 2026-11-27 |
| `public/assets/breath/land/travface.jpg`, `public/assets/breath/land/travface-h.png` | The face of a hoop: colour, and height in one channel | `assets-src/breath/land/make-hoop.py` (numpy, pillow, scipy) | `python3 assets-src/breath/land/make-hoop.py` | 1 | 2026-11-27 |
| `assets-src/breath/land/src/travskin.jpg` | The generated sheet of the outer skin of a travertine bank seen from straight above, 1536 x 1024, kept as a JPEG of quality 95 | `generate_image` (default model), with `references/approved/3-breath/breath-4-down-the-shaft.jpg` passed as the place | Prompt 2 below | 1 of 1 | 2026-11-27 |
| `public/assets/breath/land/travskin.jpg`, `public/assets/breath/land/travskin-h.png` | The top and belly of a hoop: colour, and height in one channel | `assets-src/breath/land/make-hoop.py` (numpy, pillow, scipy) | `python3 assets-src/breath/land/make-hoop.py` | 1 | 2026-11-27 |
| `assets-src/breath/dead/src/deadhide.jpg` | The generated sheet of dried slack hide seen from straight above, 1536 x 1024, kept as a JPEG of quality 95 | `generate_image` (default model), with `references/approved/3-breath/breath-2-the-rim.jpg` passed as the place | Prompt 3 below | 1 of 1 | 2026-11-27 |
| `public/assets/breath/dead/hide.jpg`, `public/assets/breath/dead/hide-h.png` | The hide of the dead one's model: colour, and height in one channel | `assets-src/breath/dead/make-hide.py` (numpy, pillow, scipy) | `python3 assets-src/breath/dead/make-hide.py` | 1 | 2026-11-27 |

## Prompt 1

```
A material texture photographed square on, orthographic: the broken vertical face of a thick bank of travertine, a patch about 2 metres wide: many thin horizontal beds of cream, ivory and bone-white flowstone stacked one on another, each two to eight centimetres thick and none the same, running level from the left edge to the right edge, their edges chipped and snapped so that some beds stand out as small ledges and others are eaten back into dark shadowless recesses; porous pitted layers full of small holes and vugs between denser smooth layers; rust-orange and brown iron stain seeping along some seams and running a little down from them; a trace of grey-green algae in a few damp hollows. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale mineral arches from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

## Prompt 2

```
A material texture photographed straight down from directly above, orthographic: a patch about 2.5 metres across of the outer skin of a massive old travertine flowstone bank: smooth pale ivory and cream mineral with a dull wet sheen, laid down in thin overlapping skins whose edges show as fine wandering contour lines and low rimstone lips, pitted with clusters of small solution holes, crossed by a few hairline cracks, here and there a shallow scar where a flake of the outer skin has come off and rougher chalky layers show under it; marbled with rust-orange and brown iron stain in broad soft patches with darker hearts and thin veins. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of its pale mineral arches from it and nothing of its composition. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no animals, no plants.
```

## Prompt 3

```
A material texture photographed straight down from directly above, orthographic: a flat patch about 80 centimetres across of the dried, slack hide of an animal some days dead: pale parchment, bone-white and dirty cream skin, thin and leathery, fallen into many long soft wrinkles and folds that run mostly from left to right and never straight, with deeper creases between them; the skin is split open in a few short ragged tears with dark dried red-brown edges; sparse short pale bristles lie flat on it; blotches of yellow-grey and faint pink-brown stain, a few dark specks of dried matter, a dusting of pale grit and salt in the creases. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of the pale dead animal's skin from it and nothing of its composition or its shape. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no faces, no eyes, no whole animal, no limbs.
```
