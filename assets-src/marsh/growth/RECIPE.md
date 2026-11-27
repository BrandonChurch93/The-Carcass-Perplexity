# The growth's own pictures

The sheets the plants of the Blood Marsh are drawn with, made in the second wave of the wide polish by `marsh_growth_builder_w2`. The colour picture is sRGB. In the data picture red and green are the lean of the surface along x and y (0.5 is level) and blue is its height.

## `public/assets/marsh/growth/stalk.jpg` and `public/assets/marsh/growth/stalk-nh.jpg`

Made by: the image model of the `generate_image` tool at its default setting (through Perplexity), then `assets-src/marsh/growth/make-stalk.py` on Python 3 with numpy, Pillow and scipy.
From: `assets-src/marsh/growth/src/stalk-salt.png`, the generated picture (1245 x 1263). Picture passed to the model with the prompt: the trunk of `references/approved/4-marsh/marsh-2-the-stalk-colony.jpg`, cut out at (230, 330) to (560, 941).
Prompt or command: the prompt below, then `python3 assets-src/marsh/growth/make-stalk.py`. The script crops the square, closes both edges by fading into a copy moved by half the size, levels the broad light, and takes the height from the lightness with the colour taken off.

```
A seamless tiling material texture sheet, photographed flat and straight on, evenly lit with soft diffuse light, no shadows, no horizon, no perspective, no objects, no text. The surface is the unrolled bark of an alien salt-marsh stalk, exactly the material of the trunk in the reference photo: a thick white granular salt crust like dried icing over an ivory-cream fibrous tube. Irregular horizontal growth rings run across the sheet at uneven spacing (about seven of them, some close together, some far apart, none straight); each ring is a ragged raised lip carrying knobbly lumps and popcorn-like clusters of white salt crystals. Between the rings the crust is finely pitted and grainy, with faint vertical fibre lines. In scattered irregular patches the crust has flaked away and shows bare rust-orange, ochre and dark brown stained fibre underneath, with orange stain running down below some rings. Pale pinkish-white overall with warm rust accents. Macro photograph, extremely sharp fine detail everywhere, natural, the left edge matches the right edge and the top edge matches the bottom edge.
```

Takes: 1 made, take 1 kept.
Why this one: the trunk of the approved picture is a pink white salt crust with lumps of crystal on the lips of uneven rings and rust where the crust has flaked; the bark sheet before it (`mat/bark.jpg`) was an even tan weave with level ledges, which read as a striped pole. It wraps once round a trunk and repeats every 3.4 widths up it; `stalks/grown.ts` stretches it unevenly along the trunk so no two rings stand the same distance apart.
Date: 2026-11-27
