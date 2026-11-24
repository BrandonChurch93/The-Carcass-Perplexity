# 001 · The repo is private, and the music is settled

From Brandon, 2026-11-24. This addendum beats `AGENTS.md` and every kit file on these two topics.

## 1 · The repo is private, so the sound lives in it

Brandon is making the repo private so that the voice, the sound effects and the music can be saved with the build.

- When you first read this, and at the start of every task after that, measure whether `repo.url` is private. Write the result and the time under "Repo is private" in `kit/PROGRESS.md`. The newest measurement decides, whatever an earlier one found.
- While a measurement finds it public, the public rules of "Sound" in `AGENTS.md` still hold. Never commit a sound file while the repo measures public.
- The first time a measurement finds it private, do this once:
  1. Take `audio/supplied/`, `audio/kept/` and `audio/mix/` out of `.gitignore`.
  2. Commit the music file, every kept narration clip, every kept sound and the newest mix, each inside `repo.maxFileMb`, and push.
  3. Write under "Sound files" in `kit/PROGRESS.md` that they are committed to the repo.
  4. Test once that a sandbox agent can still clone the repo and push a branch, and record the result under "Tool record". If it cannot, say so in one line in the next status, and from then on hand each agent the files it needs as attachments and take its work back the same way.
  5. Say in the next status, in one line, that the sound files are now in the repo.
- From then on, for the rest of the build:
  - Sound files are committed like any other built asset, as the private rule in "Sound" in `AGENTS.md` says. An agent may push sound files on its own branch.
  - A task that starts takes the music and the sound files from the repo. Nothing has to be attached to a prompt, and nothing is made again from its record unless the file is truly gone from the repo.
  - No archive of sounds is attached to a status or to the `REVIEW` block, and the `REVIEW` and `BUILD COMPLETE` blocks say `committed to the repo` on their "Sound files" line.
  - The archive in Phase 6 step 10 of `kit/08-BUILD-ORDER.md` is not needed: the final mix is in the repo under `audio/mix/`, where the local render looks for it. QA item 21 is met by the sound files and the final mix being in the repo.
  - The animatic, the review clip and the films are still never committed. They are large. They stay on the review page and are handed over as before.

## 2 · The music is settled

- The music is royalty-free, and this film is a personal project of Brandon's. Nothing is sold. Its use is cleared. It is not a question.
- Take the line about the music out of "For Brandon to decide" in `kit/PROGRESS.md`. Never list the music's source or licence there, in a status, or in a report block.
- In `ASSETS.md` the music's row reads: source, supplied by Brandon; licence, royalty-free, cleared by Brandon for this project.
- This replaces "The music" in `kit/06-ASSETS.md`.
- Phase 0 still records what the terms of the image tools and the sound tool say, in `ASSETS.md`, as a record. Do not turn that record into questions for Brandon. A point goes under "For Brandon to decide" only if the terms plainly forbid using the output in a video at all.
