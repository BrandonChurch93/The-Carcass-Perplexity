# 09 · QA gauntlet

The final acceptance list. Run every item on the frozen build in Phase 6 and write its evidence under "QA results" in `kit/PROGRESS.md`: a command and its output, a file, or a frame.

The gauntlet runs at most `quality.gauntletMaxPasses` times. An item that still fails after the last pass is listed under "Failed QA items" with what was tried, and the build completes. `kit/08-BUILD-ORDER.md` Phase 6 steps 11 and 12 say what a fix may change.

## The film

1. The film exists as check D5 defines it: the master in `formats.master` at `film.fps`, or the film in `formats.hd` at `film.fps` with the open item that sends the master to Brandon's Mac. Evidence: `ffprobe`, and the frame count beside the cut list's.
2. Its copy in `formats.hd` and the preview film exist, named from `export.files`, from the frozen build, with the final mix. Evidence: `ffprobe`.
3. The film is between `film.minSeconds` and `film.maxSeconds`. Every place has at least `film.minPlaceSeconds`. The places come in the order of `film.order`. Evidence: G7.
4. Every frame of the film was computed through `capture` mode. No frame was recorded from a playing page, and no frame came from a video model. Evidence: the records of the chunks.
5. The rise is one shot from the lake to orbit. Evidence: G12 on the frozen build, and one sheet across the rise under `out/stills/`.
6. The titan frame is on the reveal strike, and every cut and event is on an accent. Evidence: G11.
7. The first frame and the frame at `film.hookSeconds` are kept under `out/stills/`, with what R6 said of them in the record round.
8. The last frame is black or nearly so. Evidence: the frame.
9. No text, logo, label, interface or person appears in any frame. Evidence: G5, one look at the whole film sheets, and the R3 answers of the record round.
10. No living animal in any judged frame has an eye or an ear. Evidence: one look at every judged frame that shows an animal, with the frames named.

## The picture

11. Every key has a comparison image under `out/stills/`, rendered from the frozen build at the `final` tier.
12. Every frame on the judged list in `kit/PROGRESS.md` exists with a record that matches the frozen build.
13. Measures M1 to M3 were run on the frozen build and their numbers are in the record round's scorecard.
14. Every place moves. Evidence: M2 for every judged frame of the six places, and one sheet of each place with the camera held still.
15. No stand-in is drawn in any frame of the film or the loop. Evidence: G13 is green with every part covered, `info().standIns` is empty, and the `standins` view of every judged frame shows no flagged pixel.
16. Every part marked `fallback` in `parts/PARTS.json` is listed under "Parts finished with a fallback", and every restaged animal under "Animals kept at a distance".

## The sound

17. Every kept narration clip matches its lines word for word, and the lines are in order in the cut list. Evidence: A1 and G16. A clip with no usable take is listed as an open item.
18. The final mix measures as A3 asks, and made twice it is byte equal. Evidence: A3 and A4.
19. The music runs unbroken to the titan frame and is cut once after it, at bar lines. `cut/CUES.md` lists every line, sound, cut, event and the titan frame by time and by frame. Evidence: G11 and the file.
20. Every kept clip and sound has its record and its row in `ASSETS.md`, and nothing went over a take limit. A take that made a lost file once more from its record is not counted. Evidence: A2 and A5.
21. While the repo is public, no sound file and no file with a sound stream is tracked on any branch. The archive with the final mix and every kept clip and sound was handed over. Evidence: G9 and the message.

## The card

22. The card exists: the full-size loop with the films, and its web copy and the card still in `deliver/`. Evidence: D6.
23. The loop closes. Evidence: G14 on the frozen build, and one sheet across the seam, last frames then first frames, under `out/stills/`.
24. The loop is between `deliver.cardLoop.minSeconds` and `deliver.cardLoop.maxSeconds` long, is one shot, and has no sound stream. Evidence: `ffprobe` and the loop's sheet.
25. The card still is frame 0 of the loop, in the loop's own format and tier. Evidence: its record, and the PSNR of the still against the first frame decoded from the full-size loop, which is at least `deliver.cardLoop.stillMinPsnr`.

## The machine and the repo

26. `npm run determinism` passes on the frozen build. Evidence: G3.
27. `npm run render:local -- --proof` ran on the frozen build and both of its files pass `ffprobe`. Evidence: D7.
28. The pages need only what `config/webgl-caps.json` marks portable. Evidence: G10.
29. A clean clone installs and builds with nothing but the repo's packages. Evidence: the commands and their output.
30. `README.md` holds everything Phase 6 step 9 lists.
31. `ASSETS.md` lists every third-party file with its source and licence, the terms that were read, a row for every kept clip and sound, and the row for the music.
32. No tracked file is over `repo.maxFileMb`, no secret is tracked, and `references/approved/` still matches its manifest. Evidence: G9.
33. The files were handed to Brandon, or the open item says which were not and where they are. Evidence: the message.
34. Every phase is marked `done`, every unit `finished` with what ended its loop, and "Open items", "Declined issues", "Review items", "Animals kept at a distance" and "For Brandon to decide" are up to date in `kit/PROGRESS.md`.
