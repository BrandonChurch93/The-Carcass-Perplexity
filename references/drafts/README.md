# The Carcass: reference images, round 3

Round 3 in progress. Rounds 1 and 2 were rejected and sit untouched in `../archive/`. Nothing from them is reused as a generation input here; three round 2 images were shown to blind critics as negative controls only.

- `step-1-art-directions/`: the working files for Step 1 (three art directions for the hardest place, The Breath).
  - `takes/`: every take as JPEG. Names are `<direction>-<view>-t<nn>`, with `est` for the establishing view and `d1`, `d2` for detail views.
  - `prompts/`: the exact prompt text of every take (the take-to-prompt mapping is in `log.json`).
  - `critics/`: the brief given to the blind critics, the answer key of each packet and every critic reply, unedited.
  - `real/`: real photographs used as positive anchors for the critics, with credits. They were never passed to an image generator.
  - `sheets/`: triage sheets.
  - `log.json`: the running log: decisions, takes, my notes on each take, critic results, statuses.
- `ART-DIRECTIONS.md` and `NOTES.md` are added when Step 1 is ready for the pick.
