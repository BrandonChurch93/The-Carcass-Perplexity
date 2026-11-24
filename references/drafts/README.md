# The Carcass: reference images, round 3

Round 3, step 1 is ready for the pick of an art direction. Rounds 1 and 2 were rejected and sit untouched in `../archive/`. Nothing from them is reused as a generation input here; round 2 frames were shown to blind critics as negative controls only.

- `ART-DIRECTIONS.md`: the three art directions for the hardest place, The Breath; what each would do to the other five places and the reveal; which I would choose and why; what the blind critics said; build approach.
- `NOTES.md`: model, prompt and references for each of the nine kept images.
- `step-1-kept/`: the nine kept images at full size and one sheet per direction.
- `step-1-art-directions/`: the working files.
  - `takes/`: every take as JPEG. Names are `<direction>-<view>-t<nn>`, with `est` for the establishing view and `d1`, `d2` for detail views.
  - `prompts/`: the exact prompt text of every take (the take-to-prompt mapping is in `log.json`).
  - `critics/`: the briefs given to the blind critics, the answer key of each packet and every critic reply, unedited.
  - `real/`: real photographs, with credits in `CREDITS.md`. Some were shown to the critics as controls only. Others were passed to the image generator as a rendering reference (how a camera records light), never for their content; three of those were used for the kept images and are named in `NOTES.md`.
  - `layouts/`: the small blurred layout images supplied to the generator for positions only.
  - `sheets/`: triage sheets.
  - `log.json`: the running log: decisions, takes, my notes on each take, critic results, statuses.
