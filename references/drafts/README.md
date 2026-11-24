# The Carcass: reference images, round 3

Round 3 is images and layout sketches only. No 3D was built. Rounds 1 and 2 were rejected and sit untouched in `../archive/`. Nothing from them is reused as a generation input here; round 2 frames were shown to blind critics as negative controls only.

The full set is ready in direction B, Titan-fall. No pick of a direction was given: after step 1 the user asked for speed and for the work not to stop, so step 2 ran in the direction I had recommended. A (Overgrowth) or C (Corpse-light) can still be picked from the step 1 material, and the set would be remade in it.

- `step-2-full-set/`: the deliverable. One folder per place in film order (`1-ribs`, `2-heart`, `3-breath`, `4-marsh`, `5-spine`, `6-eye`). Each holds the establishing view (`-0-establishing`), four detail views numbered in the order the camera reaches them, the top-down layout sketch with the detail positions and the camera route, and the contact sheet. `7-reveal/` holds the reveal from orbit and its sheet, which also marks where the six places sit on the body.
- `NOTES.md`: model, prompt and references for every kept image, with why it was kept and its known faults. Part one is the full set, part two is step 1.
- `ART-DIRECTIONS.md`: step 1. The three art directions for the hardest place, The Breath; which I would choose and why; what the blind critics said; build approach; and what happened between step 1 and step 2.
- `step-1-kept/`: the nine step 1 images at full size and one sheet per direction.
- `working/`: the working files.
  - `takes/`: every take of the round as JPEG (312 takes). Step 1 names are `<direction>-<view>-t<nn>`; step 2 names are `<place>-<view>-t<n>`, with `est` for the establishing view and `d1` to `d4` for details.
  - `prompts/`: the exact prompt text of every take (the take-to-prompt mapping is in `log.json`).
  - `critics/`: the briefs given to the blind critics, the answer key of each packet and every critic reply, unedited. Step 2 was not blind-tested.
  - `real/`: real photographs, with credits in `CREDITS.md`. Some were shown to the critics as controls only. Others were passed to the image generator as a rendering reference (how a camera records light, a surface or an animal), never for their content.
  - `layouts/`: the small blurred layout images supplied to the generator for positions only in step 1.
  - `sheets/`: triage sheets.
  - `tools/`, `jobs/`: the scripts and batch definitions used in the run, including `layouts.py`, which draws the layout sketches, and `places.json`, which names the kept take for every view.
  - `log.json`: the running log: decisions, takes, my notes on each take, critic results, statuses.
