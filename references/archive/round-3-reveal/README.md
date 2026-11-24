# Round 3: the first reveal (rejected)

This is the reveal from orbit that was delivered with the round 3 full set and rejected. It was moved here from `references/drafts/step-2-full-set/7-reveal/` when the reveal was redone. Nothing in this folder was used as an input for the new reveal; only the idea (the continent is the titan) is carried over.

Why it was rejected, in the user's words: "The current reveal reads as a fish with arms growing out of its head. The skull and one hand are bunched together at one end and nothing else says human."

- `reveal-from-orbit.jpg`: the rejected reveal (take `reveal-est-t3`).
- `reveal-contact-sheet.jpg`: its contact sheet, with the marked copy.
- `takes/`: the three takes that were made for it.
- `reveal-est.txt`: the prompt.
- `real/`: the two real astronaut photographs that were passed to the generator for it as a rendering standard, with their credits.

The notes entry as it stood at hand-over:

### The Reveal

- The shot: the camera rises straight up out of The Eye until the whole continent is in frame. An astronaut's view from about four hundred kilometres, oblique toward the horizon. The continent, about three thousand kilometres long, is the titan lying on its side.
- What reads as the body: the skull massif with the round lake where the eye was, a hooked jaw peninsula, the spine as a snow range running the length of the land, the ribs as curved ridges that end in capes, the caldera with its fume plume (The Heart), the steaming pale shelf beside it (The Breath), the red river system and its delta (The Blood Marsh), and an arm ending in five spits.
- What makes it read at real scale: the curved limb and the thin line of atmosphere, sunglint on the sea, fields of small cumulus with their own shadows, lee-wave cloud off the range, a frontal band across the ribs, one cyclone over the open sea.
- Contact sheet: `reveal-contact-sheet.jpg`. Its lower half marks where the six places sit on the body; those positions were read off the picture and are approximate.

#### The Reveal: the continent from orbit

- Kept image: `reveal-from-orbit.jpg` (take `reveal-est-t3`, generated 02:07 UTC, 34 s, 1672x941)
- Model: `gpt_image_2_6_sunburst`
- Prompt: `reveal-est.txt`, full text below
- References passed to the generator, in order:
  1. `real/plate-orbit-2.jpg`: real photograph, "ISS-40 Panoramic Image of South Africa.jpg" by NASA, Public domain, https://commons.wikimedia.org/wiki/File:ISS-40_Panoramic_Image_of_South_Africa.jpg . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.
- Why kept: Reads as an astronaut photograph at real scale: limb, cloud fields with shadows, a cyclone, sunglint; skull with the eye lake, spine range, ribs as curved ridges and capes, the red delta, the caldera plume, the arm.
- Known faults: Skull and hand are very literal; ribs partly lost under cloud on the right; pelvis and legs fade into haze and barely read.
- Critics: Not blind-tested. Chosen by my own eye from the full-size takes.

Prompt `reveal-est`:

```text
One reference image is supplied: a real photograph taken by an astronaut from low orbit. Use it only as the standard for how the new picture is rendered: how a real camera in orbit records a planet: the thin blue line of atmosphere on the curved horizon, the black of space, haze that thickens toward the horizon, the scale and texture of real cloud fields and their shadows, sunglint on the sea. Do not copy its landmass, its coastline, its layout or anything in it.

Make a new 16:9 photograph: a real astronaut photograph of an alien ocean world, taken from four hundred kilometres up with a wide lens, looking obliquely toward the horizon. It must be indistinguishable from a real photograph taken from orbit, and the land in it must read at its true scale: thousands of kilometres.

THE SUBJECT. One island continent, three thousand kilometres long, lies in a dark blue-black ocean and runs away from the viewer from the lower left toward the horizon at the upper right. Its landforms are the skeleton of a single gigantic creature lying on its side, half sunk in the sea and worn down by ages of weather, so that it reads first as real geology and a moment later, unmistakably, as a body. Nearest the viewer, at the lower left, is the skull: a broad rounded massif of pale rock with one perfectly round dark lake in a ring of pale cliffs where the eye was, a hooked peninsula for the lower jaw, and pale shallows around its shores. From the skull a long pale mountain range, the spine, runs the whole length of the continent in a slow curve: a knife-edged chain of evenly jointed peaks, snow on the highest, each throwing a long shadow. From the middle of the spine a series of about twelve long narrow curved ridges sweeps out and round to one side and runs into the sea as a row of curving capes with deep dark bays between them: the ribs. The outer ends of the capes break up into chains of pale islands and sea stacks with white surf lines. Inside the curve of the ribs lies a dark lowland basin; in it one volcanic caldera gives off a brown plume of fume that trails downwind for two hundred kilometres, with a small ember-orange glow at its source. Beside it a pale flat shelf steams with thin white vapour. Between the ribs and the spine a low flat country of white salt and rust-red is drained by a branching dark red river system whose delta stains the sea red-brown. Beyond the ribs the spine passes through a ring-shaped basin of highlands, the pelvis, and two long thin peninsulas, the legs, trail away into the haze near the horizon. One long peninsula jointed like an arm reaches out from below the skull and ends in five thin spits. The bare rock is ivory and pale grey; the lowlands are dark; nothing is green.

SCALE AND WEATHER. Real weather lies over all of it and proves its size: a field of small cumulus clouds casting tiny separate shadows on the lowlands; a long band of frontal cloud lying across the ribs and hiding parts of three of them; lee-wave cloud streaming off the spine; fog filling some of the bays; one large comma-shaped storm system over the open ocean to the right. On the left the sea is silver with sunglint, with wind streaks and island wakes showing in it. Shallow water round the coast is paler; rivers push fans of sediment into the sea. The coast is ragged with thousands of small bays and islets. Every bone is a mountain range with valleys, ridges, scree, rivers and snow, slightly irregular, eroded and broken, with parts under water or under cloud. Nothing is outlined and nothing is drawn like a diagram.

LIGHT. Low sun from the left, late afternoon on the ground: long relief shadows from the spine and the rib ridges, warm light on the cloud tops. Toward the upper right the land goes blue and pale with haze and dissolves into the bright curved horizon. Above the horizon a thin band of blue atmosphere, then black space with no stars visible. Natural exposure, soft contrast, fine grain, the slight softness of a photograph taken through a spacecraft window.

No spacecraft parts in frame, no text, no labels, no grid, no border, no watermark.
```
