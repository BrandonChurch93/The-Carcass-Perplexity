# 06 · Assets

## The approved pictures

Brandon approved these on 2026-11-24. They are round 3 of the reference run, direction B, with the reveal as it was redone the same day. They are pinned by hash in `references/approved/MANIFEST.sha256`. The paths in that file are relative to `references/approved/`, so it is checked from inside that folder.

| Folder | What it holds |
| --- | --- |
| `1-ribs/` to `6-eye/` | For each place: the establishing view, `<id>-0-establishing.jpg`; four details, `<id>-1-…` to `<id>-4-…`; the layout sketch, `<id>-layout.png`; and a contact sheet of the five |
| `7-reveal/` | The four keys of the rise, `reveal-1-…` to `reveal-4-…`; the widest key at a larger size, `reveal-4-titan-from-orbit-4k.jpg`; the master all four are views of, `reveal-master.jpg`; `reveal-marked.jpg` and `pullback.json`, which place the keys in the master and the six places on the body; and a contact sheet |
| `contact-sheet.jpg` | The six establishing views and the titan on one sheet. Used for the first status. Not a target |

The 34 keys are listed in `keys` in the config with the path of each. The layout sketches, the marked picture and the contact sheets are aids. They are not targets and are never judged against.

What each kind of picture fixes:

- An establishing view fixes its place: the landform, the scale, the colour, the weather, the time of day and what lives there.
- A detail fixes what the camera pushes in on: the subject, how close it is, the depth of field and the light.
- A key of the rise fixes what is in frame at that height and how the body reads there.

Rules:

- They are never regenerated, replaced, retouched or toned down. Stop condition 1 checks the hashes in every task.
- An approved picture may feed the build: as the reference passed to an image model, and as a source of colour, height or sky for something you build. The reveal's master is the map of the continent and is meant to be used that way.
- An approved picture is drawn whole only in three cases: in the animatic, in steps 2 and 3 of the fallback chain in `kit/03-METHOD.md`, and in the reveal's floor in section 6 of that file.
- `references/drafts/` and `references/archive/` are the record of how the look was found. Read them, never change them. Rounds 1 and 2 were rejected: the first as barren grey rock, the second as flat postcards. Do not drift back toward either.

### Settled differences

The reference run named the weak points of its own pictures, and `kit/02-SUBJECT.md` lists them place by place. The build may improve on them and must not copy them.

- `settled` in the config holds, for some keys, lines that each name one point where the build may differ from the approved picture on purpose. `settledAll` holds lines that apply to every key.
- On such a point the match critic is told not to count the difference. Everywhere else the picture wins.
- Only Brandon adds a settled line, through an addendum or a note in the thread, with one exception. When an animal detail is restaged under `kit/03-METHOD.md` section 4, you add the sentence in `settledWhenRestaged` to that key's lines, word for word, log it as an open item under "Animals kept at a distance" in `kit/PROGRESS.md`, and name the key in the next report block. That is the only line you may add.
- If you find a real conflict the kit did not foresee, take the reading closest to the approved picture, log it under "Decisions made by the Builder", and list it in the next report block.

## Generated pictures

The approved pictures show each place from five views. Building it needs more: materials close up, other sides, height, sky.

- Generate what a part needs: material sheets, height pictures, skies, far backplates, extra views.
- Pass the approved picture of the view as the place, and a real photograph as the standard for how a camera records it. `references/drafts/NOTES.md` describes how the reference run did this, and `references/drafts/working/real/CREDITS.md` lists the photographs it used.
- At most `assets.maxTakesPerAsset` takes of one asset. Pick the best, show it inline with a status, and move on.
- These are working pictures, not targets. The approved picture stays the target for whatever they feed.
- Keep each kept picture and its prompt under `assets-src/<part>/`.
- No picture you generate shows a person, a hand, a human face, text or a logo, and no animal in it has eyes or ears.

## Terms of the tools

- In Phase 0, read the output terms of each image model you will use, and of the sound tool for the plan this account is on. Write what they say into `ASSETS.md`: the tool, the source of the terms, the date, and whether they clearly allow outputs in a published video. Mark each line as stated by the terms, measured, or unknown.
- Prefer a model whose terms clearly allow it for everything new you generate that appears in a frame.
- Do not swap, regenerate or drop anything already approved because of what you find. Build with it.
- For the sound tool three points matter and each gets its own line: whether generated speech and sound effects may be published inside a film; whether they may be kept as separate files in a public repository; and whether a voice made with voice design may be used commercially. An earlier reading, on November 23, was that sound effects may be used inside a film and may not be made available as isolated files. `AGENTS.md` under "Sound" is written to that reading.
- Anything the terms leave unclear goes under "For Brandon to decide" in `kit/PROGRESS.md` and into the next report block. Nothing in the build is held for it.

## The music

- The music was supplied by Brandon. It is not generated, and you do not know its licence. `ASSETS.md` carries one row for it: supplied by Brandon, source and licence to be confirmed by him. "For Brandon to decide" carries the same line until he answers.
- It is never committed while the repo is public.

## Records of sounds

Every kept narration clip and every kept sound has a text record under `audio/records/`, which is always committed:

```
## <clip or cue id>
Made by: <the tool, the endpoint and the model>
Voice: <for narration, the voice name>
Text or description: <exact>
Settings: <every setting sent, and the seed>
Takes: <how many were made, and which was kept>
Measured: <length, loudness, peak; for narration also pace and median pitch>
Transcript: <for narration, what the transcription returned>
The listener: <its answers, word for word, for the kept take>
Date: <the day it was made>
```

## Built assets

- Geometry: binary glTF, with mesh compression where it helps.
- Textures: a compressed GPU format where it holds up, with a fallback every target browser reads. Colour pictures are stored in sRGB. Height, normal, roughness and every data picture are stored linear.
- Frames are computed, so file size is not a reason to hold detail back. The limits are `repo.maxFileMb` for one file and the largest texture the renderer accepts.
- Everything a page loads is committed, so that a fresh clone can render the film on another machine with no tool but Node, a browser and `ffmpeg`. No such file is over `repo.maxFileMb`: split a larger one into tiles or parts.

### Recipes

Every generated or built asset that a page loads has a recipe in `assets-src/<part>/RECIPE.md`, text only:

```
## <file or group of files>
Made by: <the tool or script, and its version>
From: <every input file, with paths>
Prompt or command: <exact>
Takes: <how many were made, and which was kept>
Why this one: <one line>
Date: <the day it was made>
```

The scripts and the committed inputs must be enough to make every loaded file a second time.

## Third-party files

Nothing in this build has to come from outside. If something does:

- List it in `ASSETS.md` with its source URL and licence before it is used.
- Allowed: public domain, CC0, or a licence that clearly permits commercial use in a published video.
- Nothing extracted from a game, a film or a paid pack. No real brand or logo.
- Look at each one once before it is used.

## What is committed

| Kind | Committed |
| --- | --- |
| Scripts, configs, recipes, prompts, records, scorecards, logs | Yes |
| Files the pages load, under `public/assets/` | Yes, once per round after the best is chosen, inside `repo.maxFileMb` |
| Kept stills, comparison images, sheets, short silent clips | Yes, through `npm run keep` |
| The card loop's web copy and the card still | Yes, through `npm run keep -- --deliver` |
| The full-size card loop | No. It is large. It goes with the films |
| Narration clips, sounds, mixes, the music | Only while the repo is private, as "Sound" in `AGENTS.md` says. On no branch while it is public |
| The animatic, the review clip and the films | No. They carry sound and they are large. They go on the review page and into the thread |
| Takes not kept, caches, checkpoints, frames, chunks | No. They live under `out/work/` |
| Photographs from the web | Never. They live in `references/cache/` |
