# The lake of the Eye, generated pictures

## `public/assets/eye/lake/matcomb.jpg`

Made by: the image model of Perplexity Computer (`generate_image`), then `assets-src/eye/fluid/make_matcomb.py` on Python 3 with Pillow 13.0.0.
From: `assets-src/eye/fluid/mats-aerial-take1.png`, the generated picture. The record of the take in `assets-src/eye/ROWS-eye_fluid_builder.md` names no picture passed to the model with the prompt.
Prompt or command: asked at 1:1, came 1536x1024: "Seamless texture, seen exactly straight down from directly above (orthographic top-down aerial view), filling the whole frame edge to edge with uniform density: a shallow, clear mineral lake bed covered in microbial filament mats in amber, ochre, gold and rust. Thousands of hair-fine branching strands, all combed and streaming in one direction from the bottom of the frame to the top, gathered in separate long bunches and tresses of different widths, gold in the heart of a bunch, dark rust at its torn edges, a little olive. Between the bunches: narrow dark clear-water channels and a few small irregular pools over dark brown silt, and here and there a small pale cream slab of travertine. Flat even overcast light, no shadows, no sun glints, no reflections, no horizon, no sky, no shore, no animals, no text. Photographic, sharp, very fine detail." Then `python3 assets-src/eye/fluid/make_matcomb.py`, which saves the picture as JPEG at quality 90 with no other change.
Takes: 6 made, take 1 kept. The other five are not committed.
Why this one: the strands run one way across the whole frame with dark channels between, so `src/places/eye/lake/bed.ts` can comb them toward the centre of the lake as seen from the rim.
Date: 2026-11-26

## `public/assets/eye/lake/matcomb-round.jpg`

Made by: `assets-src/eye/fluid/make_matcomb_round.py` on Python 3 with Pillow 13.0.0 and NumPy 2.5.5.
From: `assets-src/eye/fluid/mats-aerial-take1.png`, the generated picture that `public/assets/eye/lake/matcomb.jpg` is made from (see the heading above for its prompt and takes).
Prompt or command: `python3 assets-src/eye/fluid/make_matcomb_round.py`. No model is asked: the left and right three tenths of the picture are passed over into its own middle, shifted by half its width, with the contrast of the two layers kept.
Takes: computed, one.
Why this one: the picture is laid round the lake under the mats seen from the rim and from over the centre. Turned over at each repeat it was its own mirror image along every line where it turned (round 29, R3-1: a seam of symmetry under the waders at frame 8412). Made to meet itself, it is laid without being turned over: `src/places/eye/lake/bed.ts`, `tComb`.
Date: 2026-11-27
