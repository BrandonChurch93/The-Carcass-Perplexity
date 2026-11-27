# The dead wader's form

Both files are made by `python3 assets-src/breath/dead/make_low.py` (numpy, scipy, Pillow; run from the root of the repository) from
the working picture of the dead wader as the lens at the rim sees it, `public/assets/breath/mat/carcass-low.jpg` with its relief
`carcass-low-h.png`. No model was called.

## public/assets/breath/dead/carcass-low-lift.png

836 x 470, the picture halved. Red: how high the skin stands off the rock, 0 to 0.5 m, a guess from the outline (a limb is as high as
it is wide, the trunk rises to the arch of the ribs). Green: the cover of the body. Blue: how open a place is to the sky.

## public/assets/breath/dead/carcass-low-slope.png

836 x 470. Red and green: the slope of that height across the picture and up it, metres a metre, -3 to 3 (128 is level).

## `public/assets/breath/dead/hide.jpg` and `public/assets/breath/dead/hide-h.png`

The hide of the dead one: dried slack skin, colour (sRGB), 1536 by 1024, and its height in one channel (the crest of a fold is high, a crease is low). It is laid along every part of the dead one's own model (`src/places/breath/dead/body.ts`), 0.95 m a repeat, mirrored at each repeat. The model is the animal; the sheet is only its skin.

Made by: the image model behind `generate_image` (its default model, through Perplexity), then `assets-src/breath/dead/make-hide.py` on the system Python 3 with numpy, pillow and scipy.
From: `assets-src/breath/dead/src/deadhide.jpg`, the generated sheet, kept as a JPEG of quality 95. Picture passed to the model with the prompt: `references/approved/3-breath/breath-2-the-rim.jpg`.
Prompt or command: the prompt below, then `python3 assets-src/breath/dead/make-hide.py` from the repository root.

```
A material texture photographed straight down from directly above, orthographic: a flat patch about 80 centimetres across of the dried, slack hide of an animal some days dead: pale parchment, bone-white and dirty cream skin, thin and leathery, fallen into many long soft wrinkles and folds that run mostly from left to right and never straight, with deeper creases between them; the skin is split open in a few short ragged tears with dark dried red-brown edges; sparse short pale bristles lie flat on it; blotches of yellow-grey and faint pink-brown stain, a few dark specks of dried matter, a dusting of pale grit and salt in the creases. Flat, even, shadowless overcast light so that no side is brighter than another, no cast shadows. The surface fills the whole frame edge to edge at one uniform scale as a seamless tileable texture. The reference image is the place this material belongs to: take the colour and character of the pale dead animal's skin from it and nothing of its composition or its shape. Photographic, real grain and micro detail, sharp from edge to edge, no depth of field blur, no vignette, no horizon, no sky, no text, no logo, no people, no faces, no eyes, no whole animal, no limbs.
```

Takes: 1 made, take 1 kept.
Why this one: the dead one was one picture of a carcass pushed onto the rays of one lens; as a model of its own it needs a skin that is only skin, with folds and splits at the scale of a hand.
Date: 2026-11-27
