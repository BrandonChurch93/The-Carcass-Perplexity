# Progress

The Builder's memory. Read it at the start of every task and after every compaction. Keep every section. Write `none` where there is nothing.

## Status

- Build: in progress
- Phase: 0 · Ground truth, in progress since 2026-11-24 20:30 UTC
- Review: not reached
- Review round: none
- Review round step: none
- Review rounds: 0
- Budget: running
- Continuations: 0
- Extensions: 0
- Extension step: none
- Published address: none
- Review page: none
- Repo is private: treated as private from 2026-11-24 20:44 UTC on Brandon's word (note 3): he sets it to private later and the sound files go in now. The last measurement, at 20:41 UTC, read public. It is measured once at the start of each task for the record (`npm run private`), and nothing waits on it
- Sound files: committed to the repo. The music went in on 2026-11-24 at 20:47 UTC on Brandon's word (note 3). Kept narration clips, kept sounds and the newest mix are committed like any other built asset, each inside `repo.maxFileMb`. No archive of sounds is attached anywhere
- Large files reach Brandon by: not measured

## Latest pictures

The pictures of the newest status, with their captions and the time. Files are in `out/stills/status/`.

Status 1, 2026-11-24 20:36 UTC:

- `01-approved-contact-sheet.jpg`: the approved pictures, the six establishing views and the titan from orbit

## Clock

Copied from the last tick of `npm run clock`.

```
2026-11-24T20:45:55Z
phase 0: 0.27 h used of 3.00 h
build: 0.27 h used of 72.00 h
extra rounds: yes
minutes since the last status: 10
```

## Phases

| Phase | State | Started | Ended | Gate evidence |
| --- | --- | --- | --- | --- |
| 0 · Ground truth | in progress | 2026-11-24 20:30 UTC | | |
| 1 · The voice, the map and the animatic | not started | | | |
| 2 · Engine and blockout | not started | | | |
| 3 · The look lock: the Heart | not started | | | |
| 4 · The other places and the rise | not started | | | |
| 5 · The whole film | not started | | | |
| 6 · Polish and deliver | not started | | | |

## Units

State is `not started`, `in progress` or `finished`. A finished unit names what ended its loop: `passed`, or the limit that was reached.

| Unit | Phase | State | Rounds run | Best round | Commit | What ended its loop |
| --- | --- | --- | --- | --- | --- | --- |
| `heart` | 3 | not started | 0 | | | |
| `ribs` | 4 | not started | 0 | | | |
| `breath` | 4 | not started | 0 | | | |
| `marsh` | 4 | not started | 0 | | | |
| `spine` | 4 | not started | 0 | | | |
| `eye` | 4 | not started | 0 | | | |
| `reveal` | 4 | not started | 0 | | | |
| `film` | 5 | not started | 0 | | | |

### Parts

The register is `parts/PARTS.json`. Summarise it here after every change of state: how many parts each unit has, and how many are `stand-in`, `built` and `fallback`.

none

## Voice

- Name from the kickoff prompt: none. The line arrived as the unfilled placeholder `<the name of the voice, exactly as it appears under My Voices in ElevenLabs>`
- Voice used, and its id on the account: `Carcass Narrator`, id `GSUpY5pPm1gN8Crb8gqz`, category generated (voice design), created 2026-11-23 20:35 UTC
- Chosen by: the Builder, 2026-11-24. The account lists three voices that are not stock: `Worst-Job-Application-Ever` (2026-11-24 03:37 UTC, an Australian wildlife-documentary voice made for another project), `Carcass Narrator` (2026-11-23 20:35 UTC) and `Carcass Narrator v1` (2026-11-23 20:29 UTC, described as an old man). The rule in `kit/01-FILM.md` is the most recently created voice that is not stock. Read to the letter that is the other project's voice, so the rule was read as the most recently created voice made for this film. Its description matches the kit: he lived in this ruined world and warns you. Said in status 1
- Speech model and settings: none
- Clips kept: none

## Sound

- The map: not made
- The audio map skill: found on the first try in the skills list, `user:beat-sync`. Loaded in Phase 1
- Music file: found. Attached to Brandon's second message at 20:34 UTC, saved as `audio/supplied/The-Carcass-Audio.mp3` (7,472,274 bytes, mp3, 44.1 kHz stereo, 233.51 s)
- Music hash matches `music.sha256`: yes, `eefe8765…afc56b1f`
- Sounds kept, by place: none
- The newest archive handed to Brandon: none

## Workspace record

Measured 2026-11-24 20:37 to 20:44 UTC on the Builder's VM.

- Machine: Ubuntu 26.04.1 LTS, kernel 6.1.155, 2 cores, 7957 MB RAM, a 20 GB disk with 7.9 GB free at the start.
- Node v20.20.2, npm 10.8.2. Python 3.14.8 with numpy 2.5.5, scipy 1.18.1, opencv-python-headless 5.1.0.95 and pillow 13.0.0.
- `ffmpeg` and `ffprobe` 8.0.1-3ubuntu2, both present.
- Browser: Chrome for Testing 147.0.7727.15, already on the machine as Playwright build 1217 under `~/.cache/ms-playwright/` (`chromium-1217` and `chromium_headless_shell-1217`). No global Playwright package. The harness drives this browser through `playwright-core` 1.59.1, the release whose own browser is build 1217, so nothing is downloaded and every VM renders with the same browser.
- A sandbox agent's VM, measured the same hour: 4 cores, 7 GB RAM, a 25 GB disk with 18 GB free, and the same system, Node, Python, `ffmpeg` and browser.

## Tool record

### Inline display

- Method, proven 2026-11-24 20:36 UTC with `references/approved/contact-sheet.jpg`: the pictures are written into one JSON file as JPEG data URLs with captions (`out/work/status/status.json`, long edge at most `status.pictureLongEdgePx`), and shown with the inline visualization tool through `tools/status/widget.html`, which makes one image for each entry and prints the status lines above them. The JSON goes in as a `sources` file, the lines as `data.note`.
- Text written between tool calls may not reach Brandon, so the lines of every status are inside the widget, and links are written as plain text there.

### Polling, detached processes, sandbox agents

- Starting an agent returns at once. MEASURED 2026-11-24 20:40 UTC: five agents were started in one step and each call came back immediately with the note to carry on. While they worked the Builder ran commands, ticked the clock, committed and pushed. Their answers arrive as messages in the Builder's turn without being polled for. So the short agent rule in "Waits" is not needed.
- A sandbox agent, MEASURED 20:40 to 20:43 UTC: its own VM with 4 cores, 7 GB RAM, a 25 GB disk with 18 GB free, the same Ubuntu 26.04.1, Node v20.20.2, npm 10.8.2, Python 3.14.8 with PIL, numpy, scipy and cv2, ffmpeg and ffprobe 8.0.1, and the same browser, Chrome for Testing 147.0.7727.15 (Playwright build 1217), already in `~/.cache/ms-playwright`.
- Clone: worked in 12 s while the repo read public. The working tree with `.git` is about 1 GB.
- Push: a plain `git push` failed with "could not read Username". After `gh auth setup-git` the push worked, and the branch `agent/phase0-test-looks` is on the remote (checked by the Builder with `git ls-remote`, commit `2634947`, author Brandon, trailer present). Every agent brief therefore says: run `gh auth setup-git` once before the first push.
- Attachments: the agent returned two video files with no sound stream as attachments to its message, 0.76 MB and 50.8 MB. Both arrived whole under `~/.perplexity/attachments/` (checked with `ffprobe`). So render chunks come back as attachments, and a branch under `out/chunks/` is the second way.
- Every agent brief runs `gh auth setup-git` before the clone as well, so the clone keeps working when the repo turns private. The first sandbox agent that starts after a private reading confirms it, as addendum 001 asks, and the result is written here.
- The idle agent answered at 20:42:59 UTC, two minutes after it started, and its message arrived in the Builder's turn while the Builder was working. MEASURED.

### Handing over a large file

none

### The image limit

none

### What can be called

none

### The sound tools

none

### The terms that were read

Read 2026-11-24 by lookup agents. Each line is marked STATED (read in the terms, quoted), MEASURED or UNKNOWN. The full record is in `ASSETS.md`. By addendum 001 this is a record and not a list of questions.

The sound tool, ElevenLabs, Creator plan (Terms of Use, ElevenCreative Terms with Exhibit 4 on sound effects, Prohibited Use Policy, all "Last Updated: 09 October 2026"):

- Speech and sound effects inside a published film: allowed. STATED, Terms of Use 1(c): a paid user "may use the Services for commercial purposes". STATED, Exhibit 4 s.2: output may be used "by incorporating it into films, trailers, advertising, video, games".
- Kept as separate files in a public repository: sound effects, not allowed. STATED, Exhibit 4 s.2: "you may not ... make Output available as isolated audio files or samples, or as part of any sound, sample, effects, or music library". Speech clips: UNKNOWN, no wording found either way. Brandon's note 3 decides: the sound files are committed and he sets the repo to private. The line was said to him once, in status 2.
- A voice made with Voice Design used commercially: allowed under the general licence of a paid plan (STATED, help centre: "All paid plans include a commercial license, provided you're not using Beta Services"). UNKNOWN: whether the help centre's note "Voice Design is still experimental" makes it a Beta Service. The Beta Services Addendum would not load. Nothing that was read calls Voice Design beta.

The image models (the table with the quotes is in `ASSETS.md`):

- OpenAI GPT Image: clearly allowed. STATED: the customer "owns all Output".
- Google Gemini image: allowed, no bar found. STATED: "Google won't claim ownership over that content." UNKNOWN: an explicit commercial grant.
- ByteDance Seedream through BytePlus: allowed with conditions. STATED: "you own the Output". STATED: the labels the service adds may not be removed.
- Perplexity, through which all of them are reached: allowed in a video. STATED, consumer terms in force until 2027-01-01: "personal, non-commercial use only", and output may not be published "without clearly citing the Services". STATED, Enterprise terms: the customer "owns all Output". UNKNOWN: which of the two this account is under. The film is a personal project and nothing is sold, so nothing forbids the pictures in the film and nothing is listed for Brandon.
- For everything new that appears in a frame the GPT Image models come first, since their terms are the clearest.

## Platform

What X accepts for an uploaded video, as read in Phase 0, with the source and the date.

Read 2026-11-24 by a lookup agent. One page was read a second time by the Builder: the three length and size sentences and the web upload limits of page A were found word for word in the page. X's own pages disagree with each other. STATED means read on an official X page.

- Length and size, account with no subscription. STATED, help.x.com/en/using-x/x-videos (A): "upload videos up to 140 seconds long with a maximum file size of 512MB".
- Length and size, subscriber. STATED (A): "upload videos shorter than 4 hours at 1080p with a maximum file size of 16GB", on the web and iOS. help.x.com/en/using-x/premium-longer-videos says the same and "up to 10 minutes long on Android". help.x.com/en/using-x/x-premium and the Media Studio FAQ say "up to ~3 hours long and up to 8GB file size (1080p)".
- Frame size. STATED (A, web upload): "Maximum resolution: 1920 x 1200 (and 1200 x 1900)", aspect ratios 1:2.39 to 2.39:1. STATED, Media Studio FAQ: "Maximum resolution (landscape, up to 2 hrs): 1920x1080". STATED, docs.x.com media best practices (API): between 32x32 and 1280x1024.
- 4K. No help or developer page that was read mentions it. The only official word is a post by the X Engineering account of 2025-05-15, read as a search excerpt only: "4k video is here! Uploading now available for @Premium subscribers, watching available globally on web and iOS." Its limits on length, size, frame rate and bitrate: UNKNOWN.
- Frame rate. STATED (A, web): "Maximum frame rate: 40 fps". STATED, Media Studio FAQ and API page: 60 fps or less. The conflict is not resolved by any page.
- Bitrate. STATED (A, web): "Maximum bitrate: 25 Mbps". Media Studio recommends 5 to 8 Mbps.
- Container and codec. STATED, Media Studio FAQ and API page: MP4 or MOV, H.264 High Profile, AAC LC, 4:2:0, progressive, closed groups of pictures.
- Playback. STATED (API page): 720p for an account with no subscription, 1080p for a subscriber.

What it means for this film, with nothing in the kit changed: the master as specified, 3840 x 2160 at 60 frames a second, is longer than an account with no subscription may post, and from a subscriber's account it rests on the 2025 post alone, since the written web limits are 1920 x 1200, 40 fps and 25 Mbps. The copy in `formats.hd` fits every written limit for a subscriber except, on one page, the frame rate, and its bitrate has to be measured against the 25 Mbps line once it exists. Listed under "For Brandon to decide".

## Pinned versions

none

## Render budget

Seconds for one sample and for one frame at each format and tier, on this VM and on a sandbox VM, with the scene they were measured on and the date. Then the wall-clock time of each long job as `npm run budget` estimates it. Add a row for every new kind of job when it ends.

none

## Judged frames

The list, by the rule in `kit/07-QUALITY-BAR.md`, with the unit and the current frame number of each entry.

none

## Look lock

Written in Phase 3: what the study showed, every locked setting, what worked and what did not, and the six recipes.

none

## The pick

none

## Decisions made by the Builder

One line each: the date, the decision and the reason.

- 2026-11-24. The start of the clock was set to 20:30 UTC, the minute the task began, with `--start --at`, so the reading done before the clock existed is counted.
- 2026-11-24. Voice: `Carcass Narrator` chosen by the Builder because the kickoff line was a placeholder. See "Voice".
- 2026-11-24. Harness scripts are plain Node ES modules under `tools/` and the film's code is TypeScript under `src/`. A small command, `npm run progress`, edits sections of this file so that logging is cheap.
- 2026-11-24. For everything new that appears in a frame the GPT Image models come first, because their terms are the clearest of the image models; another model is used where it makes the better picture. See `ASSETS.md`.
- 2026-11-24. The harness drives the browser that is already on every VM (Chrome for Testing 147.0.7727.15) through `playwright-core` 1.59.1, so the Builder's VM and every sandbox VM render with one browser and nothing is downloaded.

## Notes from Brandon

His words, numbered, with the date and how each was applied.

1. 2026-11-24 20:34 UTC, in the thread: "Sorry, I forgot to share with you the attached audio. It's here in this message." Applied: the file was saved under `audio/supplied/` and its hash matches `music.sha256`.
2. 2026-11-24 20:40 UTC, in the thread: "The repo is private now. A new addendum is on main: kit/addenda/001-private-repo-and-music.md. Fetch, merge, read it and apply it now, then carry on." Applied: fetched and merged (the addendum was already in at `a218a33`), read, and applied as the session log says. The repo was measured four ways at 20:41 UTC and still read public, so by the addendum's own rule no sound file was committed then. Answered in the thread. Note 3 replaced the waiting.
3. 2026-11-24 20:44 UTC, in the thread: "Forget about the repo being public, I'll set it to private later. Just continue working make sure the audio is in there. It's totally fine." Applied: this note beats the public rule of addendum 001. The three sound folders came out of `.gitignore`, the music was committed and pushed, "Sound files" reads committed to the repo, and from here the private rules of addendum 001 hold whatever a measurement reads. The measuring before every commit has stopped. One fact was said to him once, in status 2: ElevenLabs allows its sound effects inside a film and not as separate files in a public place, so the generated sounds are the reason for the switch to private.

## Review items

| No. | From | His words | When it is worked | State |
| --- | --- | --- | --- | --- |

## Review items not done

none

## Declined issues

none

## Open items

Each with its unit, its frame, the critic's words, what was tried and what to try next.

none

## Parts finished with a fallback

none

## Animals kept at a distance

none

## For Brandon to decide

- X. The 4K 60 fps master may not upload as it is: X's written web limits are 1920 x 1200, 40 fps and 25 Mbps, and 4K upload for subscribers rests on one 2025 post by X Engineering. The 1080p copy is the safe file to post. Nothing in the build changes for this. See "Platform".

## Running jobs

none

## Running agents

none

## Rounds

One line for each round: its number, the unit, the commit it judges, the parts ticked off, the scores and what ended it.

none

## Final scores

none

## QA results

none

## Failed QA items

none

## Last report block

none

## Push log

none

## Session log

- 2026-11-24 20:30 UTC. Task 1 starts on the BUILD MODE prompt. Repo at `418cade`. Stop condition 1 checked: `MANIFEST.sha256` exists, 52 of 52 hashes match, all 34 keys exist and are in the manifest. Kit read in its reading order. No addenda.
- 2026-11-24 20:39 UTC. Addendum 001 arrived on `main` as `7da7398` and was merged at 20:36 UTC. Applied: the repo was measured again (still PUBLIC, so nothing sound is committed yet and the one-time steps wait for the first private reading); the music line was taken out of "For Brandon to decide"; the music row in `ASSETS.md` now reads supplied by Brandon, royalty-free, cleared by Brandon for this project. Status 1 was posted at 20:36 UTC with the approved contact sheet shown inline.
- 2026-11-24 20:45 UTC. Brandon's note 3 applied: the sound folders left `.gitignore` and the music was committed. The five Phase 0 agents all answered between 20:42 and 20:46 UTC: the idle test, the sandbox test (clone, push after `gh auth setup-git`, two attachments), the image terms, the sound terms and X's limits. Their findings are under "Tool record", "The terms that were read" and "Platform", and in `ASSETS.md`.
