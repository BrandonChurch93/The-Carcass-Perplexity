# 00 · Read this first

This kit is for one reader: the Builder, working alone in a Perplexity Computer task with no memory of how the film was planned. `AGENTS.md` at the repo root holds the rules. This folder holds the film.

The kit is written to give you the bar and an understanding of what is being made, not a recipe. Where it is silent, the call is yours. Make the one that gives the better picture, and log it.

## Reading order

1. `AGENTS.md`
2. This file
3. `kit/01-FILM.md`: the film from first frame to last, the words, the music and the deliverables
4. `kit/02-SUBJECT.md`: the world, the six places and the reveal
5. `kit/04-LOOK.md`: the bar, in Brandon's words
6. `kit/03-METHOD.md`: what has to be true of how the pictures and sounds are made, and the fallbacks
7. `kit/05-ARCHITECTURE.md`: determinism, the harness, the clock, rendering and delivery
8. `kit/06-ASSETS.md`: the approved pictures, generated assets, licences
9. `kit/07-QUALITY-BAR.md`: checks, critics, the pass bar and every limit
10. `kit/08-BUILD-ORDER.md`: the phases, their gates, the review stop and the report blocks
11. `kit/09-QA-GAUNTLET.md`: the acceptance list
12. `kit/PROGRESS.md`: your memory. A template until you fill it
13. `kit/addenda/`: changes made after the kit was written. Read every one at the start of every task

`kit/10-KICKOFF.md` is for Brandon. You do not need it.

## Which file wins

| Topic | The file that wins |
| --- | --- |
| Any number | `config/showcase.json` |
| Rules of work: memory, limits, the clock, waits, stops, statuses, git | `AGENTS.md` |
| The order of shots, the words, the music, the deliverables | `kit/01-FILM.md` |
| What a place is, what lives there, what moves | `kit/02-SUBJECT.md` |
| What the picture has to look like | The approved picture, then `kit/04-LOOK.md` |
| How a round runs, what passes, every limit | `kit/07-QUALITY-BAR.md` |
| What happens in which phase | `kit/08-BUILD-ORDER.md` |
| Anything, when an addendum covers it | The newest addendum in `kit/addenda/` |
| Anything, when Brandon says it in the thread | Brandon's note |

When words and an approved picture disagree, the picture wins.

## Working protocol

1. Check the stop conditions in `AGENTS.md`.
2. Fetch and merge. Read `kit/PROGRESS.md` and every addendum.
3. Post the status that opens the task.
4. Work the current phase of `kit/08-BUILD-ORDER.md`: its "Read first" list, its steps, its gate.
5. Tick the clock and post a status at the rhythm `AGENTS.md` sets, whatever step you are in.
6. At a gate: log the evidence for every line, commit, push, publish, post the status, start the next phase.

## Vocabulary

| Word | Meaning |
| --- | --- |
| Place | One of the six environments in `film.order`: `ribs`, `heart`, `breath`, `marsh`, `spine`, `eye` |
| The reveal | The seventh entry of `film.order`: one unbroken camera move from the surface of the lake in the Eye to orbit |
| Unit | A piece of the film that gets its own critic rounds. The list is `units` in the config: the six places, `reveal`, and `film` for the whole |
| Part | One thing in the picture that a unit is made of and that can be built on its own: a landform, a fluid, a weather system, an animal, a sky, an effect. You define the parts in Phase 2 in `parts/PARTS.json`. A transition is a part only when it draws something of its own. A plain cut is not a part, and a sound is never one |
| Stand-in | A part in its placeholder form. It reports itself as one. It is never shipped |
| Fallback | The simpler finished technique a part is given when its box ends. `kit/03-METHOD.md` |
| Key | One of the 34 approved pictures in `keys` in the config, and the judged frame that answers it |
| Establishing view | Key 0 of a place: the wide view the place opens on |
| Detail | Keys 1 to 4 of a place: what the camera pushes in on, in the order it reaches them |
| Judged frame | A frame on the fixed list the critics score. `kit/07-QUALITY-BAR.md` |
| Look | Any still, sheet, crop or comparison rendered in order to be looked at. The harness logs every one |
| Sheet | A contact sheet: consecutive frames of one move, or frames across the whole film |
| Tier | A sample count from `tiers`: `draft`, `review`, `final` |
| Format | A frame size from `formats`: `master`, `hd`, `preview` |
| Round | One pass of build, checks, measures, critics and fixes on one unit |
| Floor round | A round that must happen. Every other round is an extra round |
| The map | The audio map of the music: tempo, bar lines, hits and sections. `cut/MAP.json` |
| The cut list | Every shot with its first and last frame, cut to the map. `cut/CUTLIST.json` |
| Accent | A beat, a bar line or a hit in the map |
| Event | A moment in the picture meant to land on an accent: the bore, the lava fall, a strike of lightning |
| Key frame | The frame of the film that answers a key: the frame where the camera is closest to that key's view |
| The titan frame | The first frame of the rise in which the whole body is in view. It lands on the reveal strike of the music |
| Settled line | One sentence naming a point where the build may differ from an approved picture on purpose. `kit/06-ASSETS.md` |
| The listener | The audio evaluation tool, asked fixed questions about a sound |
| Open item | Something still wrong when a limit ended its loop. Logged, reported, never called a pass |
| Brandon | The person this film is for. He watches the thread |
