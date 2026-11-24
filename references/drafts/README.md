# The Carcass: reference images, round 3

Round 3 is images and layout sketches only. No 3D was built. Rounds 1 and 2 were rejected and sit untouched in `../archive/`. Nothing from them is reused as a generation input here; round 2 frames were shown to blind critics as negative controls only.

The full set is in direction B, Titan-fall. The user approved B for all six places and rejected only the reveal ("reads as a fish with arms growing out of its head"). The six places are unchanged since that approval. The reveal was started again from nothing and is now four key frames of one continuous pull-back from the lake in The Eye to orbit. The rejected reveal is in `../archive/round-3-reveal/`.

- `step-2-full-set/`: the deliverable. One folder per place in film order (`1-ribs`, `2-heart`, `3-breath`, `4-marsh`, `5-spine`, `6-eye`). Each holds the establishing view (`-0-establishing`), four detail views numbered in the order the camera reaches them, the top-down layout sketch with the detail positions and the camera route, and the contact sheet. `7-reveal/` holds the redone reveal: the four key frames of the pull-back (`reveal-1-above-the-lake`, `reveal-2-skull-massif`, `reveal-3-head-and-shoulders`, `reveal-4-titan-from-orbit`, the last also at 3840 x 2160), the master picture that all four are views of (`reveal-master.jpg`, 5952 x 3348), the contact sheet, the marked copy that shows where the six places sit on the body (`reveal-marked.jpg`), and `pullback.json` with the window of each frame in the master for the build.
- `NOTES.md`: model, prompt and references for every kept image, with why it was kept and its known faults. Part one is the full set, part two is step 1.
- `ART-DIRECTIONS.md`: step 1. The three art directions for the hardest place, The Breath; which I would choose and why; what the blind critics said; build approach; and what happened between step 1 and step 2.
- `step-1-kept/`: the nine step 1 images at full size and one sheet per direction.
- `working/`: the working files.
  - `takes/`: every take of the round as JPEG (494 takes). Step 1 names are `<direction>-<view>-t<nn>`; step 2 names are `<place>-<view>-t<n>`, with `est` for the establishing view and `d1` to `d4` for details. The takes of the reveal redo are named by batch (`rv4`, `pb1` to `pb3`, `tile`, `bl`, `cx`, `cx9`, `cx-e`, `e2`, `e3`, `pb1c` to `pb1f`, `pb2g` and a few more); NOTES.md says which of them are in the kept frames.
  - `prompts/`: the exact prompt text of every take (the take-to-prompt mapping is in `log.json`).
  - `critics/`: the briefs given to the blind critics, the answer key of each packet and every critic reply, unedited. The six places of step 2 were not blind-tested.
  - `critics/fresh/`: the fresh-viewer tests of the reveal redo: the protocol with its pass rules (`PROTOCOL.md`), the briefs, every reply unedited (`replies/`, one file per viewer, and `replies.json`) and the exact image each viewer was given (`seen/`).
  - `pull/`: the pull-back: the master, the plates of frames 1 and 2, every window that was passed back to the generator as Image 1, the frame windows of each tested set, the nesting measurements, the head warp report and the fallback set with the larger head.
  - `guides/`: the layout maps of the reveal redo, drawn or painted by script, including `cx-e-guide.png`, the layout of the kept body.
  - `real/`: real photographs, with credits in `CREDITS.md`. Some were shown to the critics as controls only. Others were passed to the image generator as a rendering reference (how a camera records light, a surface or an animal), never for their content.
  - `layouts/`: the small blurred layout images supplied to the generator for positions only in step 1.
  - `sheets/`: triage sheets.
  - `tools/`, `jobs/`: the scripts and batch definitions used in the run, including `layouts.py`, which draws the layout sketches, `places.json`, which names the kept take for every view of the six places, and the scripts that built the reveal (`master.py`, `inset.py`, `grade_plate.py`, `heart_x2.py`, `headwarp.py`, `f2_merge.py`, `cut_frames3.py`, `reveal_sheet.py`).
  - `log.json`: the running log: decisions, takes, my notes on each take, critic results, statuses.
