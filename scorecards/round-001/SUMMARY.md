# Round 1 · `film` · the blockout round of Phase 2

A floor round. It judges commit `3431598`. Started 2026-11-25 01:41 UTC, the critics answered by 01:48 UTC.

## Scores

| Pack | What it held | Family | Score | Issues |
| --- | --- | --- | --- | --- |
| `R4b-1` | The whole film sheets, the rise, the Ribs | gpt | 6 | 3 severe, 1 major |
| `R4b-2` | The Heart, the Breath, the Blood Marsh | gemini | 10 | none |
| `R4b-3` | The Spine, the Eye, the reveal | claude | 4 | 3 severe, 4 major, 2 minor |

Merged score: 4, the lowest. The bar is 7 with no severe issue open. The round fails.

## Top issues

Two critics found the same two things, each from a different pack.

1. Severe, both critics. The handoff from the Eye to the rise. Frames 9428 to 9600 are plain navy, so the one move reads as a fade to black and a new shot.
2. Severe, both critics. After the titan frame, 10027, the camera locks off and about 28 s play as a still.
3. Severe. The Spine, frames 7601 and 8070: a pale stand-in fills half the frame or more and plays as a wipe.
4. Severe. The Ribs: the film opens offshore on the blades, and the bank and channel of the approved picture arrive only at about 0:19.
5. Major. The Spine reads as a chain of separate views: `spine-02` and `spine-04` look static. In the canal the camera backs away from the mouth, and a near spire shows through it.
6. Major. The Eye's establishing frame, 8412: the camera sits higher and further back than the picture, the lake spans 65 percent of the width, the herd is too small.
7. Major. The Eye, frames 8417 to 8754: a fast drop, and what the critic read as a tilted horizon at 8754.
8. Major. The settled view from orbit does not leave clear space around the body.
9. Minor. `eye-04` hardly moves.

## What changes next

- The handoff is rebuilt on both sides of the cut. `eye-05` flies out over the water with the lake's centre held in the middle of the frame, tilts down as it climbs, and ends straight above the centre on deep water and nine rings. The rise starts on the same water and the same rings at the same size on screen, climbing at the same rate, so a landmark is in frame on every frame. The numbers both places must agree on sit in one file with a copy in each place, and a test compares the copies.
- The hold is kept at its length and made to move: the camera keeps pulling back slowly and drifts to centre the body, so the body ends with clear space around it, and the clouds, the cyclone, the storm and the Heart's glow all move.
- The Spine: the carcass gets the picture's shape and the camera stops short of it; the animal at the mouth no longer crosses the lens; `spine-05` becomes a push forward along the canal toward the far mouth; `spine-02` and `spine-04` get travel that shows.
- The Eye: the establishing camera goes lower and nearer the shore; `eye-01` becomes a level glide; `eye-04` gets a slow lateral track.
- The Ribs: the approach from the sea stays, and it is steered along the axis of the establishing picture so the bank and the channel are in frame from the start, and it hands over to `ribs-02` as one move.

## Declined, with the reason

- "Give the whole-body composition a short readable hold, then fade sooner" and "Trim so the whole film comes in near 3:00". The length of the ending is set by the words and the music, which are Brandon's: clip `n8` ends at about 181 s, the heartbeat sits on the music's last strike at 188.9 s, and `kit/01-FILM.md` says the film ends on the music's own ending. 197.68 s is inside `film.minSeconds` and `film.maxSeconds`. The cause the critics saw, a locked camera, is fixed.
- "Start on a wide that includes the left bank". `kit/01-FILM.md`, "The shape", fixes the opening as the approach from the sea, the first part of the Ribs, with clip `n1` over it. The cause is taken: the approach now frames the bank and the channel.
- "Keep the horizon level" at frame 8754. The line the critic read as a horizon is the edge of the deep water, which runs on the same diagonal in the approved picture `eye-3`. The far horizon is level.
- "Remove it", of the carcass at frame 7601. The approved picture `spine-1` has the carcass across the middle and right of the frame. The cause is taken: the stand-in gets the picture's shape and the camera stops short.
- "Pull farther back and center the whole body" at the titan frame. Frame 10027 shows the window of the approved picture `reveal-4`, which G15 checks. The clear space comes after it, in the hold.

## Carried

Nothing is carried yet. Round 2 is the last blockout round (`quality.blockoutMaxRounds` is 2).
