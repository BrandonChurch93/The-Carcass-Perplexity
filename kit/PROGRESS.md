# Progress

The Builder's memory. Read it at the start of every task and after every compaction. Keep every section. Write `none` where there is nothing.

## Status

- Build: in progress
- Phase: 2 · Engine and blockout, in progress since 2026-11-25 00:15 UTC
- Review: not reached
- Review round: none
- Review round step: none
- Review rounds: 0
- Budget: running
- Continuations: 0
- Extensions: 0
- Extension step: none
- Published address: https://www.perplexity.ai/computer/a/the-carcass-xp_kROepRIapoVuOG1cmNw (the workspace's app hosting, behind Brandon's sign-in, first published 2026-11-24 22:19 UTC)
- Review page: the "Review page" link at the foot of the published address, which opens `review.html` beside it
- Repo is private: treated as private from 2026-11-24 20:44 UTC on Brandon's word (note 3): he sets it to private later and the sound files go in now. The last measurement, at 20:41 UTC, read public. It is measured once at the start of each task for the record (`npm run private`), and nothing waits on it
- Sound files: committed to the repo. The music went in on 2026-11-24 at 20:47 UTC on Brandon's word (note 3). Kept narration clips, kept sounds and the newest mix are committed like any other built asset, each inside `repo.maxFileMb`. No archive of sounds is attached anywhere
- Large files reach Brandon by: an attachment in the thread. MEASURED 2026-11-24: 20 MB, 100 MB and 400 MB test files were all accepted by the share call. The review page carries the same films while the site stays under the hosting limit

## Latest pictures

The pictures of the newest status, with their captions and the time. Files are in `out/stills/status/`.

Status 14, 2026-11-25 01:10 UTC:

- `01-reveal-4.jpg`: The reveal, titan frame: the approved picture on the left, the blockout's flat continent on the right, with two close crops below. The framing matches. The land is two plain colours on purpose
- `02-reveal-2.jpg`: The reveal, the skull massif on the way up: approved on the left, blockout on the right
- `03-marsh-0.jpg`: The Blood Marsh, establishing frame: approved on the left, the blockout on the right. Pool, vein, crust with the dead, rain and flock are in place. The rock rise in the foreground is too wide and will be cut back
- `04-marsh-3.jpg`: The Blood Marsh, the wallowers: approved on the left, plain shapes standing in for the animals on the right

Status 13, 2026-11-25 00:52 UTC, showed: The reveal as a blockout: six frames of the one rising shot, from the lake's dark water to the whole body with the planet's edge; How the...
Status 12, 2026-11-25 00:36 UTC, showed: First frames from the film's own engine, one from each place, at the frames the cut list names.
Status 11, 2026-11-25 00:14 UTC, showed: Animatic, 100.0 s, the Blood Marsh. The line is printed where it will be spoken, because this clip is not made yet.

## Clock

Copied from the last tick of `npm run clock`.

```
2026-11-25T01:10:44Z
phase 2: 0.93 h used of 6.00 h
build: 4.68 h used of 72.00 h
extra rounds: yes
minutes since the last status: 18
```

## Phases

| Phase | State | Started | Ended | Gate evidence |
| --- | --- | --- | --- | --- |
| 0 · Ground truth | done | 2026-11-24 20:30 UTC | 2026-11-24 22:36 UTC | Gate closed by passing. A push has succeeded: ten pushes, the first `f361749` at 20:33 UTC. G1, G2, G3, G4, G8, G9 and G10: 7 of 7 pass at 22:35 UTC (`out/work/gate/phase-0.json`). The workspace record, the tool record with the sound tools, the voice, the audio map skill (`user:beat-sync`), the terms, the platform's limits, the pinned versions and the render budget table are in this file. Inline display: proven 20:36 UTC and used for every status. Repo: read public at 20:41 UTC and treated as private on Brandon's note 3; a large file reaches Brandon as an attachment in the thread (400 MB measured), and the hosting carried 497 MB. Polling: measured 20:40 UTC, agents answer by message while the Builder works. PSNR between VMs: infinite, the frames are byte equal on three VMs. Clock: 15 ticks; statuses 1 to 7 posted since step 4. Published 22:19 UTC, flows replayed 7 of 7 |
| 1 · The voice, the map and the animatic | done | 2026-11-24 22:36 UTC | 2026-11-25 00:14 UTC | Gate closed by passing at 00:08 UTC (out/work/gate/phase-1.json): 17 of 18 checks pass, none failed, one sound check open. D1 is met: the animatic is 5931 frames, 197.70 s, 960 x 540 at 30 fps with the mix as its one sound stream, kept as deliver/film/animatic.mp4 and on the review page. cut/MAP.json was made from the audio by npm run audiomap (see Sound). Narration: n8 has a kept take, n1 to n7 are open items. G11 pass (the cut follows the music), G16 pass (the words of the narration in the cut list), G7 and G15 pass on the cut list. A2 to A6 pass. A1 is open: the transcriber hears never land as Neverland in n8, a sound-alike pair listed in its record. Status 11 posted |
| 2 · Engine and blockout | in progress | 2026-11-25 00:15 UTC |  |  |
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
- Speech model and settings: `eleven_v4`, stability 0.5, similarity 0.75, seed 20261124, `mp3_44100_192`, the delivery tag `[slowly, gravely]` before the passage, the four lines of a clip sent as four paragraphs in one request, through `/with-timestamps` so each line can be cut out by its character times. The model test across the speech models could not be run: the account ran out of characters (see "The account's characters" under "The sound tools"). `eleven_v4` is STATED as the model for narration and it measured well on the one take made
- The target: the voice's own preview sample (the one the account plays under My Voices), 23.48 s, median pitch 92.5 Hz, 157 words a minute while speaking, 115 with its pauses. Saved as `out/work/voice/preview.mp3`
- Clips kept: `n8` (the Reveal), take 1 of 1, kept at 23:20 UTC by `npm run voice`. 11.36 s, median pitch 87.1 Hz, 125 words a minute while speaking, -19.3 LUFS as made. Words: `sound-alike` on the two listed pairs, no fault. Its four lines are `audio/kept/lines/n8-1.wav` to `n8-4.wav` (2.01, 1.85, 1.24 and 4.50 s, 48 kHz mono, brought to -16 LUFS together), the whole clip is `audio/kept/narration/n8.mp3`, and the records are `audio/records/n8.md` and `n8-1.md` to `n8-4.md`. Clips `n1` to `n7`: not made, see "Open items"

## Sound

- The map: made from the audio by `npm run audiomap` on 2026-11-24 at 22:41 UTC, on try 2 of 3, and nothing in it was taken from the config. `cut/MAP.json`: 67.02 beats a minute, 4 beats to a bar, a bar of 3.5809 s, 65 bar lines, 261 beats, 85 hits, 13 sections. How it compares with `music.landmarks` (map, config): preludeEnd 16.3, 16.5; firstHit 17.368, 17.4; swellPeak 39, 40; bigPeak 64.2 to 68.2, 64 to 68.5; midHit 102.626, 102.55; quiet 153.3 to 163.7, 153 to 163.5; revealHit 167.12, 167; tailFadeStart 218.4, 218.5; finalHit 224.724, 224.65; end 233, 233.5. Every landmark is within 1 s of the config and the hits within 0.1 s. Refined at 22:53 UTC: the tempo is a line through 22 attacks that have a click above 2 kHz, 66.999 beats a minute, 2.66 ms RMS and 6.86 ms worst, a bar of 3.58212 s. The grid is steady from 61.393 s to the end and agrees with the workspace's skill within 1.3 ms (the skill: 66.999, 2.44 ms RMS). Before 61.4 s the clicks sit 76 to 179 ms off the line, so bar lines there are good to about 50 ms and cuts in the first minute go on measured hits. Each of the 85 hits says whether it is sharp: 18 are. Of the four strikes only `midHit` is sharp
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
- WebGL, MEASURED 2026-11-24 21:46 UTC with `npm run caps` (`config/webgl-caps.json`): WebGL 2.0 in software through SwiftShader, renderer string `WebKit WebGL`, largest 2D texture 8192, largest 3D texture 2048, at most 4 samples in a multisampled buffer, 6 colour attachments, 30 extensions. The 4 extensions in `config/portable.json` are marked portable and all 4 are present here: `EXT_color_buffer_float`, `EXT_color_buffer_half_float`, `EXT_texture_filter_anisotropic`, `OES_texture_float_linear`.

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
- A detached process outlives the step that started it. MEASURED 20:50 to 20:57 UTC: a loop started with `setsid nohup` wrote a line a second to a log for its full 400 seconds, through six later steps, after the step that started it had returned at once. Long renders run detached with a log that is polled.
- Every agent brief runs `gh auth setup-git` before the clone as well, so the clone keeps working when the repo turns private. The first sandbox agent that starts after a private reading confirms it, as addendum 001 asks, and the result is written here.
- The idle agent answered at 20:42:59 UTC, two minutes after it started, and its message arrived in the Builder's turn while the Builder was working. MEASURED.

### Handing over a large file

Measured 2026-11-24 21:19 UTC with three test videos of moving noise with no sound, made with ffmpeg: 20, 100 and 400 megabytes (the sizes in `deliver.attachTestMb`). What they are was said in status 4.

- An attachment in the thread. MEASURED: the share call accepted all three, 20 MB, 100 MB and 400 MB, each in a few seconds, and each is listed in the thread as a video. UNKNOWN from this side: how each plays or downloads for Brandon, which only he sees.
- App hosting. MEASURED 2026-11-24 22:25 UTC: a site of 497 MB was accepted in 60 seconds, with the 20, 100 and 400 MB test files in it. Through the workspace's preview address each file answered whole and in byte ranges (`accept-ranges: bytes`, `video/mp4`), and the 400 MB file was read end to end in 7 seconds. The test files were taken out again with the next publish. STATED in `AGENTS.md`: about 500 MB a site, behind a sign-in. UNKNOWN: a site larger than 497 MB, and how the published address behaves for Brandon, which cannot be opened from a VM because it needs his sign-in.
- A download the workspace offers: the same share call. No other download route was found in the tool list.
- So a film file reaches Brandon as an attachment in the thread, and it also plays on the review page while the site stays under the hosting limit.

### The image limit

Measured 2026-11-24 20:58 to 21:08 UTC with test charts: five four-digit numbers in each of eight rows, the rows shrinking from A to F, row G at the bottom edge, and patches of one-pixel lines and a one-pixel checker. One sandbox agent of each model family was sent the charts as attachments, told not to open or enlarge them, and told to write `?` for a digit it could not read. The answers were scored against the truth (`out/work/imgtest/score.py`, not committed). The table is the picture of status 3, `out/stills/status/01-image-limit.jpg`.

- The Builder, Claude Fable. MEASURED: 1400 x 788 (1.10 megapixels) arrived untouched, rows A to E and G read without an error and 17 of 20 digits of row F. 1568 x 882 arrived scaled to 1430 wide, about 1.15 megapixels.
- The seven families at 1400 x 788. MEASURED: all seven read rows A to C2 in full. In rows D, E and G together, of 60 digits: Sonnet 59, Opus 60, Neon 60, Astra 60, Sol 59, Fable as an agent 54, Carbon 49. Nobody wrote a wrong digit in rows A to E or G. What was not read was marked `?`.
- At 1568 x 882. MEASURED: the unread digits grow (Fable 41 of 60 in D, E and G, Carbon 34) and the first wrong digits appear (Sol, four in rows E and G).
- Square pictures, three families. MEASURED: at 1048 x 1048 (1.10 megapixels) Carbon, Neon and Opus each read rows A to E and G in full. At 1200 x 1200 (1.44 megapixels) all three saw it scaled, Opus put its width at about 1072, and row F fell to between 2 and 11 of 20.
- So a picture arrives untouched up to about 1.15 megapixels whatever its shape, as `AGENTS.md` says. `critics.maxImageLongEdgePx` and `critics.maxImageMegapixels` stand as the config has them. Nothing was lowered.
- Carbon was the weakest reader of the wide 1400 x 788 chart and read the square 1048 chart in full, so a pack for that family is cut to at most 1048 px on the long edge. That is inside the limits.
- Model families that can see images: all seven. `claude_fable_5_2`, `claude_sonnet_5_5`, `claude_opus_5_5`, `gemini_4_carbon`, `gemini_neon`, `gpt_6_2_astra`, `gpt_6_2_sol`. Which model wrote which answer is taken from the order the agents were started in. Four of the ten named themselves and matched.

### What can be called

Recorded 2026-11-24 from the tool list of this workspace. STATED means read in the tool's own description. Nothing here was changed by a test.

- Image models, through `generate_image`. STATED: `gpt_image_2_6_sunburst` and `gpt_image_2_6_flare` (up to 5 reference images), `nano_banana_2_1` and `nano_banana_pro` (up to 14 reference images, the second returns up to 2K), `seedream_5` (up to 10 reference images, up to 2K). MEASURED in the reference runs: `gpt_image_2_6_sunburst` returned 3840 x 2160 for the orbit key and about two minutes a call. The largest size of the others: UNKNOWN until one is used, and then it is written in that asset's recipe.
- A video model. STATED: `generate_video` can be called. It is used only to study motion, never for a frame.
- An image-to-3D model. MEASURED: none in the tool list.
- App hosting. MEASURED: `deploy_website` publishes a static folder to one address that later publishes update, and a site of 497 MB was accepted (see "Handing over a large file"). STATED: `publish_website` exists beside it and makes a permanent public address, which this build does not use.
- The listener. STATED: `evaluate_audio` takes a sound file of up to 20 MB and a question. MEASURED: two calls answered in 8 and 14 seconds.
- Speech and sound effects: ElevenLabs through the saved credential, see "The sound tools". The workspace's own `text_to_speech` is not used, because the voice is Brandon's account voice.
- Supporting agents. MEASURED: seven model families can be started and all seven see images: `claude_fable_5_2`, `claude_sonnet_5_5`, `claude_opus_5_5`, `gemini_4_carbon`, `gemini_neon`, `gpt_6_2_astra`, `gpt_6_2_sol`. See "The image limit". No model hears sound directly.

### The sound tools

Each fact is marked MEASURED (seen in this test), STATED (read in `audio/records/API-REFERENCE.md`) or UNKNOWN. All test files are in `out/work/soundtest/`.

#### The account's characters

- MEASURED 2026-11-24 22:39 UTC: `GET /v1/user/subscription` read 130,529 of 131,000 characters used. At 22:45 UTC it read 130,947. At 22:52 UTC, after this build's one speech call of 49, it read 130,996: 4 characters are left.
- MEASURED: `can_extend_character_limit` is false and `max_character_limit_extension` is 0. The count resets on 2026-12-23 at 20:08 UTC.
- MEASURED 22:46 UTC, `GET /v1/usage/character-stats` by product, from 18:00 UTC today: Music 54,973 (45,153 of it in the hour from 22:00), Music stems 8,666, Sound Effects 18,775 (12,581 in the hour from 22:00), TTS 33. By model: `music_v2_5` 54,973, `six_stems_v1` 8,666, `eleven_text_to_sound_v2` 10,511, `eleven_text_to_sound_v3` 8,264, `eleven_v4` 33.
- MEASURED: this build has made three generation calls in all: the Phase 0 speech test (33), the Phase 0 sound effect test (66, on `eleven_text_to_sound_v3`) and one take of the Reveal's clip at 22:47 UTC (49). It has never called the music endpoint or `eleven_text_to_sound_v2`. So the music and nearly all of the sound effects were made by other work on the same account.
- What the film needs, as an estimate: the whole script is 1,131 characters, about 500 a pass on `eleven_v4` at the measured 0.44 a character, so about 3,000 for six takes of every clip. The sound effects cost 66 for 6 s in the test, so 21 cues of 20 s at three takes would be about 14,000. Around 17,000 characters in all, and more if takes are repeated.
- What follows: seven of the eight narration clips and every sound effect wait for characters on the account. Nothing else in the build waits for them.

#### The listener cannot judge a voice

- MEASURED 2026-11-24 22:50 to 22:51 UTC: four calls of `evaluate_audio` on the Reveal's take, with open questions. Three of the four answers say in their own words that they cannot hear the file and are working from a transcript ("Because I am a text-based AI, I cannot hear the actual audio file", "Based on the transcript you provided"). All four wrote the words down as "This was Neverland".
- MEASURED 22:51 UTC, a test with a known answer: the same take raised by a factor of 1.9 and played 1.9 times as fast (median pitch 166 Hz, 20 words in 6.0 s) was described as "a very low pitch" and "a slow, deliberate pace". A plain 440 Hz tone was described correctly as a steady tone.
- So the listener hears that there is a tone or a voice and writes the words down, but what it says about how a voice sounds follows the words, not the sound. Its Phase 0 description of the test line ("deep, rich") is not evidence either.
- What follows: a voice take is judged by the transcriber and by measures (pitch, pace, pauses, loudness, peak, clipping, gaps inside words, noise between lines). The two listener calls are still made and saved for their transcript. Nothing that can hear has judged the voice: Brandon's ears on the review page are the first.

#### When and where

- MEASURED: the test ran on 2026-11-24 from 21:22:06 to 21:25 UTC, on the Builder's machine, through the credential proxy for `api.elevenlabs.io`.
- MEASURED: `GET /v1/user/subscription` returned HTTP 200, tier `creator`, 68,854 of 131,000 characters used before the two generation calls.
- MEASURED: `GET /v1/models` returned HTTP 200 and lists `eleven_v4` for speech with 100,000 characters a request, cost multiplier 1.0, `can_use_style` false and `can_use_speaker_boost` false.

#### The voice

- MEASURED: `GET /v1/voices/GSUpY5pPm1gN8Crb8gqz` returned HTTP 200 in 0.56 s at 21:22:18 UTC. The voice is found.
- MEASURED: name `Carcass Narrator`, id `GSUpY5pPm1gN8Crb8gqz`, category `generated`, label language `en`.
- MEASURED: stored settings are stability 0.5, similarity_boost 0.75, style 0.0, speed 1.0, use_speaker_boost true.
- MEASURED: `high_quality_base_model_ids` is an empty list, `fine_tuning.state` is empty and `verified_languages` is empty. The API does not say which model the voice was designed for.
- MEASURED: the stored description asks for a voice far deeper than human, guttural, with a dry rasp, speaking extremely slowly, dark and menacing.

#### The speech call

- MEASURED: endpoint `POST /v1/text-to-speech/GSUpY5pPm1gN8Crb8gqz?output_format=mp3_44100_192`, sent at 21:22:36 UTC, one try, HTTP 200.
- STATED: `eleven_v4` is the flagship model recommended for narration and takes stability and similarity only.
- MEASURED: model sent `eleven_v4`. Settings sent: `voice_settings` stability 0.5 and similarity_boost 0.75 (the stored values), `seed` 20261124. No style, speed or speaker boost was sent.
- MEASURED: text sent, 75 characters: "This is a test of the narrator's voice, recorded at the start of the build."
- MEASURED: the call took 2.03 s in all. The header `tts-latency-ms` reported 773.
- MEASURED: 116,653 bytes of `audio/mpeg`, saved as `voice-test.mp3`. The Creator plan allowed `mp3_44100_192`.
- MEASURED: response headers `character-cost: 33`, `request-id: u4TOLjSv5rVDuquBL1US`, `history-item-id: fGY9Cp5y74ut1EZyVQxk`, `current-concurrent-requests: 1`, `maximum-concurrent-requests: 5`.
- MEASURED: the cost reported, 33, is less than the 75 characters sent. STATED: the price of `eleven_v4` is 1x. Why the header is lower: UNKNOWN.
- MEASURED: the request with `seed` on `eleven_v4` was accepted. UNKNOWN: whether the seed makes a second take the same, since only one take was made.
- MEASURED: the header shows a limit of 5 requests at once for this call. STATED: the v4 limit on Creator was UNKNOWN in the reference.

#### The sound effect call

- MEASURED: endpoint `POST /v1/sound-generation?output_format=mp3_44100_192`, sent at 21:22:47 UTC, one try, HTTP 200.
- STATED: `eleven_text_to_sound_v3` is the model to name. The default, `eleven_text_to_sound_v2`, is deprecated.
- MEASURED: model sent `eleven_text_to_sound_v3`. Settings sent: `duration_seconds` 6. `prompt_influence` and `loop` were not sent. STATED: their defaults are 0.3 and false.
- MEASURED: text sent: "Slow heavy lava bubbling and hissing in a vast volcanic crater, deep rumble, no music, no voices"
- MEASURED: the call took 1.62 s in all.
- MEASURED: 145,492 bytes of `audio/mpeg`, saved as `sfx-test.mp3`.
- MEASURED: response header `character-cost: 66`. No `request-id` header came back on this endpoint.
- STATED: 40 credits a second when the duration is given, which would be 240 for 6 s. The header says 66. Which is charged: UNKNOWN.
- MEASURED: the account's used count rose from 68,854 to 69,105 (by 251) between a read before the two calls and a read about three minutes after. Another process shares the account, so the rise cannot be pinned on these two calls.

#### Levels as returned

- MEASURED: `voice-test.mp3` is MP3, 44,100 Hz, 1 channel, 192 kb/s, 4.800 s. Integrated loudness -18.48 LUFS, true peak -2.76 dBTP, loudness range 2.4 LU.
- MEASURED: `sfx-test.mp3` is MP3, 44,100 Hz, 2 channels, 192 kb/s, 6.000 s. Integrated loudness -22.35 LUFS, true peak -5.02 dBTP, loudness range 4.2 LU.
- MEASURED: the measures come from `ffprobe` and from the first pass of the `ffmpeg` filter `loudnorm`. The `ebur128` filter agreed on the peaks (-2.8 and -5.0 dBFS).

#### Levels after levelling

- MEASURED: the level chain used is `aresample=192000, volume=<gain>dB, alimiter=limit=0.8:level=false:attack=5:release=80, aresample=48000`, written as 16-bit PCM WAV at 48,000 Hz. The gain was set by measuring and correcting up to four times.
- MEASURED: `voice-test-level.wav`, gain +2.66 dB: 48,000 Hz, 1 channel, 4.800 s, 460,878 bytes. Integrated loudness -16.01 LUFS, true peak -1.94 dBTP, loudness range 2.3 LU.
- MEASURED: `sfx-test-level.wav`, gain +6.89 dB: 48,000 Hz, 2 channels, 6.000 s, 1,152,078 bytes. Integrated loudness -15.94 LUFS, true peak -1.94 dBTP, loudness range 4.1 LU.
- MEASURED: both levelled files meet the target of about -16 LUFS with a true peak no higher than -1.5 dB.

#### Other measures of the speech

- MEASURED: 15 words in 4.800 s, which is about 188 words a minute. One pause of 0.28 s at the comma, at 2.45 s.
- MEASURED: median pitch about 105 Hz, with the 10th to 90th percentile at 78 to 165 Hz, by a simple autocorrelation over 117 voiced frames (search range 40 to 300 Hz). This is a rough figure, not a checked pitch tracker.

#### What the listener said

- MEASURED: the listener is the `evaluate_audio` tool, called once for each levelled file with the default model and the one question "Describe what you hear in this recording." No answer was suggested.
- UNKNOWN: which model the listener uses by default.
- MEASURED: the call on `voice-test-level.wav` took 13.6 s. The call on `sfx-test-level.wav` took 8.3 s. Both succeeded on the first try.
- MEASURED: the tool wrote its two report files to `/home/user/workspace/`, outside the repo. They were moved into `out/work/soundtest/` as `voice-test-level_evaluation.txt` and `sfx-test-level_evaluation.txt`.

MEASURED: the listener's answer about `voice-test-level.wav`, word for word:

```text
Based on the audio clip provided, here is a description of what is heard:

**Transcript:**
A single sentence is spoken: *"This is a test of the narrator's voice, recorded at the start of the build."*

**Vocal Characteristics:**
*   **Tone & Pitch:** The speaker has a deep, rich, and highly resonant male voice. 
*   **Delivery:** The delivery is deliberate, measured, and highly articulate. Every syllable is pronounced clearly. 
*   **Style:** It sounds like a professional voiceover artist. The style is authoritative yet smooth, reminiscent of a documentary narrator, an audiobook reader, or a classic movie trailer voice. 
*   **Accent:** The speaker uses a neutral, standard North American broadcast accent.

**Audio Quality:**
*   **Fidelity:** The recording is high-fidelity and studio-quality. 
*   **Environment:** The audio is "dry," meaning there is no noticeable room echo, reverberation, or background noise (hissing or humming). It sounds as though it was recorded in a sound-treated booth.
*   **Mic Technique:** There is a noticeable "proximity effect" (the enhancement of low-frequency bass sounds that occurs when a person speaks very close to a high-quality microphone), which contributes to the warmth and depth of the voice.

**Overall Context:**
As the words suggest, this is a technical audio test. It sounds like a placeholder or calibration file used by developers during the early stages (the "start of the build") of creating a video game, software application, or media project to ensure the voiceover systems are functioning correctly.
```

MEASURED: the listener's answer about `sfx-test-level.wav`, word for word:

```text
The audio features a deep, gurgling sound of rushing water.
```

#### The tester's reading, kept apart from the listener's words

- Speech, deep and male: yes. The listener calls it a deep, rich, resonant male voice, close to the microphone, with no noise and no fault named. It also wrote the sentence down correctly.
- Speech, grim: not shown. The listener's words are authoritative, smooth and warm, like a documentary or trailer voice. Nothing in its answer says grim, dark, menacing, guttural or rasping. The test sentence is neutral, so this one take cannot settle it.
- Speech, slow: not shown by the numbers. About 188 words a minute is a brisk pace, and a median near 105 Hz is an ordinary low male pitch, not the "far deeper than human" of the stored description. The listener did call the delivery deliberate and measured.
- Sound effect: a part match. The listener heard something deep and gurgling, which fits bubbling, but named it rushing water, not lava, and did not mention hissing, a rumble or a large space. It named no music and no voice.
- Both readings rest on one listener call each. The method in `kit/03-METHOD.md` section 7 asks for two calls a take, so these are a first look, not a pass.

#### Failures and tries

- MEASURED: no API call failed. Voice lookup, speech, sound effect, models and subscription each returned HTTP 200 on the first try.
- MEASURED: no listener call failed. Each succeeded on the first try.
- MEASURED: one levelling method was dropped. A two-pass `loudnorm` with `linear=true` fell back to dynamic mode on both files and gave -16.72 LUFS (speech) and -16.67 LUFS (sound effect) at -1.50 dBTP when measured again. It was replaced by the gain and limiter chain above, which landed within 0.1 LU of the target.
- MEASURED: the `file` command is not installed on this machine. `ffprobe` was used instead.
- MEASURED: nothing outside `out/work/soundtest/` was edited in the repo. No git, npm or render was run.

### Frames across VMs

Measured 2026-11-24 22:00 to 22:17 UTC, step 17, at commit `59873c3`, frame 300 of the spike scene.

- `formats.hd` at the `review` tier: the PNG is byte for byte the same file on the Builder's VM and on both sandbox VMs (sha256 `f56edccb…b622cd`). MEASURED.
- `formats.master` at the `final` tier: byte for byte the same on the two sandbox VMs (sha256 `3f684872…6201fe`). MEASURED. It was not rendered a third time on the Builder's VM, which has half the cores.
- So the PSNR of every pair is infinite, above `quality.crossMachineMinPsnr` (45 dB), and G10 holds with the widest margin there is. Frames rendered on different VMs can be joined in one film without a seam.
- `npm run caps` gave the same WebGL record on all three machines, and `npm run determinism` passed on each.
- A frame of the master at the `final` tier took 63 seconds on a sandbox VM, so one frame fits well inside the 10 minute step and the samples of a frame never have to be split across steps.

### The hosted build

Measured 2026-11-24 22:19 to 22:32 UTC, step 18.

- Published with `deploy_website` from `dist/` under the name `The Carcass`. The same call updates the same address. First publish: 12 files, 0.9 MB.
- `npm run flows` replays the visitor's flows of `FLOWS.md` in a fresh browser against the hosted copy: 7 of 7 pass. The start page answers and shows the play control and the "Review page" link; the film plays on the click; the review page shows its pictures; its two play links lead to the film and to the card loop; the card loop renders; no console error and no failed request.
- MEASURED there: a page `fetch()` of a JSON file and of a JPEG both answered 200 with their bytes. UNKNOWN: other binary kinds at the published address. The website guide of this workspace STATES that binary files may fail to load by `fetch()` on the hosting, so the engine loads pictures as images and data as text and nothing else.
- MEASURED: on a VM the player draws a frame in about 3 seconds in software, so the ten second test shot plays as three or four frames there. It is a real-time player for a machine with a graphics card. Films are always made by `capture`.
- The address is behind Brandon's sign-in and cannot be opened from a VM, so the flows run on the preview address the publish call returns for the same files.

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

Pinned 2026-11-24 in `package.json` as exact versions, with `package-lock.json` committed. Install with `npm ci`. `.npmrc` sets `legacy-peer-deps=true`, because npm 10.8.2 fails on the optional peers of the test runner with an internal error otherwise (three tries, logged).

| What | Version | Why this one |
| --- | --- | --- |
| three | 0.187.0 (r187) | The newest stable on npm, published 2026-10-30. Migration notes that matter here: `Timer` in place of `Clock`, `PCFSoftShadowMap` deprecated, `setViewport` no longer scales by the pixel ratio when a render target is bound |
| gsap | 3.15.1 | Easing |
| vite | 8.3.8 | Build |
| typescript | 7.0.2 | Strict type check |
| vitest | 5.1.1 | Unit tests |
| playwright-core | 1.59.1 | The release whose own browser is build 1217, the one already on every VM. It downloads nothing |
| sharp | 0.35.5 | Every picture the harness reads or writes |
| @types/three, @types/node | 0.187.0, 22.20.5 | Types |
| Browser | Chrome for Testing 147.0.7727.15, headless shell, Playwright build 1217 | Already on the Builder's VM and on every sandbox VM, so all of them render with one browser |
| Node, npm | v20.20.2, 10.8.2 | As found |
| ffmpeg, ffprobe | 8.0.1-3ubuntu2 | As found |

## Render budget

Seconds for one sample and for one frame at each format and tier, on this VM and on a sandbox VM, with the scene they were measured on and the date. Then the wall-clock time of each long job as `npm run budget` estimates it. Add a row for every new kind of job when it ends.

Measured 2026-11-24 on the scene "spike: displaced lava ground, fume volume, 6000 embers", frame 300. The jobs are estimated on space-sandbox, the fastest merged machine with 4 or more cores.

| Machine | Cores | Format | Seconds for one sample | Seconds for a draft frame | Seconds for a review frame | Seconds for a final frame | Start cost in seconds |
| --- | --- | --- | --- | --- | --- | --- | --- |
| space-sandbox | 2 | uhd | 32.207 | 35.38 | 67.58 | 132.00 | 5.6 |
| space-sandbox | 2 | hd | 9.440 | 10.04 | 19.48 | 38.36 | 5.6 |
| space-sandbox | 2 | preview | 3.077 | 3.26 | 6.34 | 12.49 | 5.6 |
| space-sandbox | 4 | uhd | 15.433 | 16.68 | 32.11 | 62.98 | 3.7 |
| space-sandbox | 4 | hd | 4.614 | 5.02 | 9.63 | 18.86 | 3.7 |
| space-sandbox | 4 | preview | 1.576 | 1.58 | 3.16 | 6.31 | 3.7 |

| Job | Format | Tier | Frames | Hours on one machine | Hours across 16 agents | Limit in hours | Fits |
| --- | --- | --- | --- | --- | --- | --- | --- |
| preview film | preview | draft | 5850 | 2.67 | 0.19 | 1 | fits |
| film in hd | hd | final | 11700 | 61.39 | 4.41 | 3 | does not fit |
| master | uhd | final | 11700 | 204.78 | 14.70 | 8 | does not fit |
| card loop | uhd | final | 480 | 8.40 | 2.10 | 1 | does not fit |

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
- 2026-11-24. Critic packs for the gemini_4_carbon family are cut to at most 1048 px on the long edge, inside the config limits: it left 11 of 60 small digits unread at 1400 x 788 and none at 1048 x 1048. Every other family gets 1400 x 788.
- 2026-11-24. Megabytes and gigabytes are decimal in every check (45 MB is 45,000,000 bytes), the stricter reading.
- 2026-11-24. Every render target is half float, in every mode and on every machine, so the half float path of G10 is the only path. Accumulating four samples in half float keeps about 11 bits, well under one step of the 8 bit output, and the output is dithered.
- 2026-11-24. The page is given only the WebGL extensions listed in `config/portable.json`, on every machine: every other extension is answered as missing before three.js sees it. So G10 holds by construction and a frame cannot come to depend on an extension only one machine has.
- 2026-11-24. The harness builds its own copy of the site under `out/work/site/` when the source hash changes, so a render never empties `dist/` with the review page in it.
- 2026-11-24. Engine rule, from the first G3 run. MEASURED: the first run of `npm run determinism` differed in 7 to 42 pixels by one level. The scene target itself changed from run to run on one page, about 60 to 120 texels by one half float step, also with the volume and the embers off, while the depth view stayed identical. Pinning the browser to one core and moving the near plane changed nothing. Fixed by changes made together in `src/spike/shaders.ts`: every texture read inside a branch or a loop names its level (`textureLod`) or takes gradients computed before any branch (`textureGrad`), and the sky's cloud reads moved out of a branch. After that every stage hash (scene, volume, accumulation, bloom, final) repeats and G3 passes. Which single read was the cause was not isolated. The rule for every later shader: no texture read with implicit derivatives inside a branch or a loop.
- 2026-11-24. The engine hash covers every file under `src/` outside `src/places/`, every file under `config/` except `webgl-caps.json`, every file under `public/` outside `public/assets/`, `package-lock.json`, `cut/CUTLIST.json`, `index.html` and `vite.config.ts`. A unit's hash covers `src/places/<unit>/` and `public/assets/<unit>/`. The spike lives in `src/spike/` and so is part of the engine hash until Phase 2 replaces it.
- 2026-11-24. The tone curve is the AgX curve as the pinned three.js ships it, applied once after accumulation in `src/core/post.ts`, with exposure, grade, bloom, grain and dither around it. The look lock in Phase 3 decides whether it stays.
- 2026-11-24. Left to Phase 2 and the look lock on purpose: multisampling inside one sample (the tiers already average jittered samples) and a depth-aware upsample of the half-size volume pass. The spike measures cost and is not tuned further.
- 2026-11-24. `info().gl.extensions` lists the extensions the page actually obtained, which by the portable filter is a subset of `config/portable.json`. `npm run caps` records the machine's whole list with a portable flag on each.
- 2026-11-24. The spike is a cost test, not a place: a ground of 512 x 512 vertices displaced by a baked 1024 x 1024 height and heat map, cracks that glow, one 2048 shadow map, a fume volume marched at half the frame's size in 32 steps, 6,000 embers on closed-form paths, bloom, grain and dither. It has one shot of 600 frames and a loop of 480 frames.
- 2026-11-24. Node here is v20.20.2 on every VM. One pinned package states Node 22.12 or later in its `engines` field and runs correctly on 20.20.2 in every command used. The default reporter of the test runner crashes on Node 20 when a test fails (`Map.groupBy is not a function`), so failures are read with `npx vitest run --reporter=json --outputFile=FILE`. Node is not upgraded, so that all VMs stay alike.
- 2026-11-24. The player (`autopilot` and `loop`) renders at the `draft` tier, in `formats.hd` when the viewport's long edge is over 1400 device pixels and in `formats.preview` otherwise. It is for looking, never for recording.
- 2026-11-24. Config validation reads the names and types of every key with a fixed name from `src/config.shape.json`, which `npm run shape` writes from `config/showcase.json` (195 keys). The open maps `settled`, `motion.byUnit`, `budget.phaseHours` and `budget.reserveHours` are checked by their own rules. Found by the tests an agent wrote: 72 nested keys could be deleted with no error before this.
- 2026-11-24. The build is published with `deploy_website`, which gives one address behind Brandon's sign-in that every later publish updates. No permanent public address is made unless Brandon asks for one.
- 2026-11-24. The start page carries one quiet "Review page" link under the play control, because the hosted address cannot be edited by hand to reach `review.html`. It is page furniture and never part of a frame.
- 2026-11-24. Every asset a page loads is a picture or a text file (JSON), because the workspace's website guide states that other binary files may fail to load by `fetch()` on the hosting. Measured on the hosted copy: JSON and a JPEG both load.
- 2026-11-24. Frames are byte for byte equal across the Builder's VM and the sandbox VMs, so shots are split across render agents freely and joined without a seam check beyond G10.
- 2026-11-24. The Phase 1 tool builders were started at 22:22 UTC, while the last Phase 0 steps ran, to use the wait. They touch no Phase 0 file, and nothing of theirs is merged before the Phase 0 gate is closed.
- 2026-11-24. Render cost. The test scene at the `final` tier does not fit the limits for the master (14.7 h against 8), the film in HD (4.4 h against 3) and the card loop (2.1 h against 1) on 16 agents. So each place is built to cost no more than the test scene, costs are measured again in Phase 2 on the blockout, and a long job runs at the highest tier that fits its limit, as `AGENTS.md` says. The picture comes first: where cost must fall, the samples of far and soft things fall before anything near the camera.
- 2026-11-24. The mix is kept as `audio/mix/mix.flac`, 16 bit, 48 kHz, stereo, with seeded dither, and its report as `audio/mix/mix.json`. A 24 bit WAV of the whole film would be about 56 MB, over `repo.maxFileMb`. FLAC loses nothing.
- 2026-11-24. Sound folders: `audio/kept/narration/<clip>.mp3` holds each whole clip as the review page plays it, `audio/kept/lines/<clip>-<line>.wav` the same take split into its lines for the cut, `audio/kept/sounds/<unit>/<id>.wav` the sounds, `audio/records/<id>.md` how each was made. The schemas of `cut/MAP.json`, `cut/CUTLIST.json` and `audio/mix/mix.json` are fixed in `tools/README.md`.
- 2026-11-24. `npm run audiomap` does its own analysis of the track, so the build does not depend on a skill being present. The audio map skill of this workspace, `user:beat-sync`, is run beside it as the cross-check, and its proposal is used for the one cut in the music.
- 2026-11-24. `npm run flows` replays the visitor's flows of `FLOWS.md` against the hosted copy after every publish. It counts drawn frames inside the page, because a VM draws a frame in seconds and a screenshot can miss the picture.
- 2026-11-24. The voice and the account's characters. The ElevenLabs account has 4 of 131,000 characters left (measured 22:52 UTC) and cannot be extended through the API. Music and sound effects made by other work on the account used about 73,700 today. The build goes on: the Reveal's clip was made with the last characters, the other seven clips and every sound effect are open items, the cut gives each unmade line a length from the measured pace, and `npm run voice` makes the rest in one run once the account has characters. Said in status 8.
- 2026-11-24. No stand-in voice. A voice from another tool is not put in the animatic or the film in place of the narrator. An unmade line is silent and the animatic shows its words on the picture, so the timing can still be read. A stand-in would be heard as the film's voice and judged as it.
- 2026-11-24. The words of a take are checked by a transcriber that runs on the Builder's machine (`faster-whisper`, model `small.en`), because the price of the account's own transcriber is unknown and the account has no characters. Two sounds that are spelled two ways are not a wrong word: `never land` heard as `Neverland`, `gods` heard as `guards`. Such a pair is listed in the take's record and passes only when every other word matches and the pair sounds alike.
- 2026-11-24. The listener's description of a voice is not used as evidence (see "The listener cannot judge a voice"). The faults step of the method is done with measures instead: clipping, the level between the lines, a gap inside a word, a line far longer or shorter than its characters allow, a word the transcriber is unsure of. The two listener calls are still made and their transcript is kept.
- 2026-11-24. The delivery tag `[slowly, gravely]` goes before each clip on `eleven_v4`. Measured on the Reveal's clip: median pitch 87 Hz and 125 words a minute while speaking, against 104 Hz and 188 for the untagged Phase 0 line and 92.5 Hz and 157 for the voice's own preview sample. The model test across models could not be run for lack of characters.
- 2026-11-24. The animatic's builder kept each plate of the pull back over the wider picture until the view has left it, instead of blending to the next picture before the view leaves it as its brief said. Accepted: the key frames of the first two reveal pictures are then drawn wholly from their own plates and nothing pops (largest change between neighbouring frames 14 percent, at the ease to a stop).
- 2026-11-24. The one cut in the music runs from bar 48 (174.24 s) to bar 58 (210.06 s), so 35.82 s of the track are left out and the film is 197.68 s (`film.targetSeconds` is 195, the limits are 170 and 215). The music is unbroken through the reveal strike and for 7 s after it, the second piece opens on a hit at its own bar line, and the film ends on the track's real ending: the fall from 218.4 s, the last strike at 224.72 s and the decay. The cut was proposed by the audio map skill and passed its own check, where the joined audio is mapped again and the beat grid has to run on across the join.
- 2026-11-24. Until a clip exists, each of its lines gets a length worked out from the measured pace of `n8`: 0.105 s a character, 0.5 s for a full stop inside a line, 0.2 s for a comma, at least 0.9 s. On the four lines of `n8` that gives 9.74 s against 9.60 s measured. Every line of `n1` to `n7` in `cut/CUTLIST.json` is such an estimate, so the cut is timed again when the clips are made.
- 2026-11-24. The script is dense: about 126 s of speech in a film of 198 s. So each place is as long as its words need and no longer (Ribs 41.8 s with the opening, Heart 28.6, Breath 23.3, Blood Marsh 23.3, Spine 21.5, Eye 20.6, Reveal with the ending 38.7), and the details of a place come in the order the words name them, not in the order of `keys`.
- 2026-11-24. The opening is one shot of 17.4 s with no cut before the first strike. The approach has no approved picture of its own, so the animatic shows the Ribs establishing picture under it.
- 2026-11-24. The voice never sounds from 0.15 s before to 0.5 s after the first strike, the middle strike, the reveal strike and the last strike, and no line is placed on the loudest passage of the first half (63.2 to 70.4 s), which belongs to the lava fall alone.
- 2026-11-24. The rise. The camera leaves the lake on a beat at 159.01 s, in the quiet, and reaches the whole titan on the reveal strike at 167.12 s in one shot: 250 km wide at 159.91 s, the skull massif at 161.3 s, head and shoulders at 163.49 s as the music comes back, the whole body on the strike. It leaves fast and slows into the strike. `Now you see it.` starts at 162.35 s, one second after the skull is whole in frame. `This was never land.` ends 0.27 s before the strike. `It was a god.` starts 0.8 s after it.
- 2026-11-24. The last line, `Gods die slow. This one is not finished.`, starts at 177.0 s of the film and ends 1 s before the music begins to fall. After it come the fall, about four seconds of near silence, and the last strike at 188.90 s, where the Heart's glow beats once on the body. Night crosses the body during the hold, so the glow is seen on the dark side. The picture is black from 195.73 s.
- 2026-11-24. The cut list marks eleven events on accents of the map, so the places are built to them: the bore (40.03 s), a surge of the lava fall at the top of the big peak (66.84 s), the shaft breathing out (77.54 s), the seep pool bursting on the middle strike (102.63 s), six lightning strikes on the hits of the driving stretch (116.92 to 134.85 s) and the heartbeat on the last strike. In the Spine the strikes fall inside shots, not on cuts, so a bolt is seen and not hidden by a cut.
- 2026-11-24. In the mix the voice is raised by 1.5 dB (`mix.voiceGainDb`). At 0 dB the line `This was never land.`, which sits on the build before the reveal strike, came out 4.8 dB above the music in the speech band at the largest duck allowed, short of the 6 dB asked. At 1.5 dB all four lines that exist measure 6.0 dB or more.
- 2026-11-24. The voice tool, as its builder made it and the Builder accepted: the edges of each line are moved to where the sound really starts and ends, the lines of a clip are brought to -16 LUFS together and the gain is repeated until they measure that after the limiter, the limiter runs in Node with no outside tool, and every line file has its own record under `audio/records/`.
- 2026-11-24. The rise, corrected after the first animatic was looked at frame by frame. The skull massif is reached at 161.0 s and head and shoulders at 162.6 s (the entry above says 161.3 and 163.49; those are replaced). So skull, shoulders and the first rib ranges are in frame before `Now you see it.` starts at 162.35 s, and the body then opens slowly over 4.5 s and is whole on the strike at 167.12 s. `kit/03-METHOD.md` section 6 asks for a rise that is slow at the lake, fastest in the middle and settling. This one keeps that shape but front-loads it: 0.9 s of slow lift off the lake, the fastest part from 159.9 to 161.0 s, then a long settling. Reasons: the two lines before the strike need 4.5 s of a body that can be read, the fast early part is where the handoff from the place to the continent is hidden, and the slow part is where the viewer works out what the land is.
- 2026-11-24. Each line was checked against the picture it falls on, on sheets with one frame of every shot and its lines under it (Phase 1 step 6). Kept on purpose: `They are wiser than men.` falls on the dead wader at the rim, the one that did not keep its distance. `Gold at the edge.` falls on the amber mats and `Black at the center.` on the edge where the floor stops. `It was blood once.` falls on the stalk colony standing in the red brine and `It still seeps.` on the seep pool as it bursts on the middle strike. Changed: the key frame of `eye-4` sits early in its shot (15 percent in), so the approved framing is seen while `The center has no bottom.` is said and the camera then travels out over the centre, where the rise starts. The shot of `breath-3` is labelled the red weed at the rim, since the gill-plumes are the red weed of the narration.
- 2026-11-24. The animatic prints each silent line on the picture for its span, centred above the shot label. Clips n1 to n7 are open items, so their words are read on the picture where they will be spoken. This makes the earlier decision on silent lines true in the file.
- 2026-11-24. The rise is retimed a second time (key 1 at 160.45 s, key 2 at 161.25 s, key 3 at 162.6 s, the strike on frame 10027). This replaces 159.91 s and 161.0 s. The real camera has to climb off the lake inside the reveal shot: 0.5 s of ease off the water, a peak of about 5.9 e-folds of view width a second, then a decay to 0.3 at key 3 and about 0.1 at the strike. The words force the front loading: line n8-1 must start by 162.5 s and the body must read before it.
- 2026-11-24. Shot eye-05 stays a slow push on the approved shore view. The reveal shot starts on the cut at 159.01 s directly above the lake's black centre, looking down, so the handoff needs no horizon and the climb is one shot from the lake to orbit.
- 2026-11-25. For G12 and the handoff frames, the last frame at the lake is the first frame of the reveal shot, frame 9541, where the camera hangs just above the lake's black centre and has not begun to climb. The three handoff frames sit at the quarter points between it and the key frame of reveal-1: frames 9563, 9584 and 9606.
- 2026-11-25. The gate's build check (G1) writes its build under out/work/gate/dist, so closing a gate never empties dist/ with the review page in it. Found at the Phase 1 gate: the check had emptied dist/ after the publish. The published copy was not touched.
- 2026-11-25. The transcript check A1 reads the words inside the quotes of a record's Transcript line and not the note after them. On n8 it still reports the sound-alike pair (never land heard as Neverland), which stays an open sound item and does not fail the gate.
- 2026-11-25. The review page carries one small inline script that opens a sound or a film once more after the storage host fails on it. MEASURED from the VM: the host answered 502 to one large sound or film request in two of five page loads, a different file each time. UNKNOWN on Brandon's tablet. The tests allow exactly that one script and nothing else inline.
- 2026-11-25. The continent of the blockout is traced by a command, not drawn by hand: tools/trace.mjs reads the approved master, takes warm and light pixels as land, drops the cyclone and the cloud, and writes the outline as points in master pixels. 50 pieces of land, 90 seas, 7062 points. Hand tracing would not repeat and a generated outline would not match the keys. The red plume east of the hips is traced as land and the fingers and toes are not traced; both are stand-in faults that the built continent of Phase 4 replaces.
- 2026-11-25. The rise is one curve in the logarithm of the view's width, through the four windows of pullback.json at their key frames, with zero speed at the lake and on the titan frame. Its speeds at the keys come from one rule (each stretch's mean speed is the mean of the speeds at its ends, worked back from the titan frame), which gives a rise that starts still, is fastest at the first key and slows all the way to the whole body. After the titan frame the camera creeps out 3 percent to the cut to black so the hold is not a frozen frame.
- 2026-11-25. G12 is measured as: the rise is every frame from the first frame of the last place to the titan frame; it must be one shot of the cut list; the camera's height may never fall; and its climb from one frame to the next may not change by more than a quarter of itself (0.002 where it is nearly still). The kit says 'one move with no cut'; this is the number the Builder put on it.
- 2026-11-25. Every part's reference picture for G13 is taken by one rule: the part is drawn alone in the stand-in view at each key frame and event frame of its unit, the frame that flags the most pixels wins, and the solo view of that frame is the picture. The rule is in npm run parts. Picking the frames by eye would not repeat.
- 2026-11-25. The film on the page plays to a web copy of the mix made by the build (dist/mix.m4a, AAC), and the picture follows the sound's clock: when the two drift apart by more than 0.05 s the picture is set to the sound. If the browser refuses to play sound, the film plays silent on its own clock and does not stop. The FLAC stays the master for every render.
- 2026-11-25. The Blood Marsh blockout takes its sizes from the approved pictures and not from the 50 m bar of the layout sketch: the vein is about 11 m wide near the rise, the pool about 19 m across, a wallower about 4.2 m long, the stalks 1.8 to 4.3 m. Where two pictures disagree, each key follows its own picture. The dead on the crust are six, not four, so the crust reads in both the wide and the close view.

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

- `film` · narration clips `n1` to `n7` are not made. The ElevenLabs account had 4 characters left of 131,000 at 22:52 UTC and resets on 2026-12-23 at 20:08 UTC. Tried: reading the account for a way to extend it (`can_extend_character_limit` is false). Until they exist the cut list gives each of their lines a length worked out from the pace of `n8` (see "Decisions made by the Builder"), the mix leaves them silent and the animatic prints their words. Next: when the account has characters, `npm run voice -- n1 n2 n3 n4 n5 n6 n7`, then `npm run cut`, `npm run mix` and the animatic again. If Brandon records the voice himself, the same lines go under `audio/kept/lines/`.
- `reveal` · clip `n8` is kept from its only take. The method asks for a test line on each speech model and allows six takes a clip. Neither could be paid for. Next: with characters, the model test and the other takes, and keep the best by the method's order.
- `film` · no sound effect is made. Sound effects are paid from the same characters. Next: with characters, the beds and spot sounds of each place inside `audio.maxTakesPerCue` and `audio.maxCuesPerPlace`. Until then the mix is music and voice.
- `film` · nothing that can hear has judged the voice or the mix. The listener tool described a tone correctly and a voice wrongly (see "The listener cannot judge a voice"). The words are checked by a transcriber and the rest by measures. Brandon is the first to hear it, on the review page.
`marsh` · blockout, carried to Phase 4 where the place is built: in the establishing frame (5725) the rock rise in the foreground reaches 0.62 of the width where the picture has 0.5, and the left cluster of stalks is too short and thin; at key marsh-1 (6102) the salt rim is too thick; at key marsh-3 (6424) the young is too large and overlaps the adult; at key marsh-4 (6800) the stuck one sits in the centre where the picture has it right of centre. Steam, rain and fans are plain opaque shapes, as stand-ins are.

## Parts finished with a fallback

none

## Animals kept at a distance

none

## For Brandon to decide

- X. The 4K 60 fps master may not upload as it is: X's written web limits are 1920 x 1200, 40 fps and 25 Mbps, and 4K upload for subscribers rests on one 2025 post by X Engineering. The 1080p copy is the safe file to post. Nothing in the build changes for this. See "Platform".

## Running jobs

none

## Running agents

Each reports by message to the Builder.

| Agent | Kind | Job | Branch | Started | Limit |
| --- | --- | --- | --- | --- | --- |
| `place_ribs_builder` | sandbox | The blockout of `ribs`: layout, parts, cameras fitted to its five keys | `agent/place-ribs` | 2026-11-25 00:36 UTC | 75 min |
| `place_heart_builder` | sandbox | The blockout of `heart`: layout, parts, cameras fitted to its five keys | `agent/place-heart` | 2026-11-25 00:36 UTC | 75 min |
| `place_breath_builder` | sandbox | The blockout of `breath`: layout, parts, cameras fitted to its five keys | `agent/place-breath` | 2026-11-25 00:36 UTC | 75 min |
| `place_spine_builder` | sandbox | The blockout of `spine`: layout, parts, cameras fitted to its five keys | `agent/place-spine` | 2026-11-25 00:36 UTC | 75 min |
| `place_eye_builder` | sandbox | The blockout of `eye`: layout, parts, cameras fitted to its five keys | `agent/place-eye` | 2026-11-25 00:36 UTC | 75 min |

Their briefs are in `out/work/briefs/` and share one sheet with the schemas of `cut/MAP.json`, `cut/CUTLIST.json` and `audio/mix/mix.json`, which is copied into `tools/README.md`. Each reports with a `git bundle` attached.

Sandbox agents and the push: `gh auth setup-git` fails in most sandbox VMs ("not logged into any GitHub hosts"), and a plain `git push` then works in most of them and fails in some. Every brief says: push, and if it fails attach a `git bundle` to the report. Both routes have been used and both work.

Ended with a record: `render_meter_01` and `render_meter_02` (both answered by 22:15 UTC: every step ran, G3 passed on each VM, their stills and budget files are under "Frames across VMs" and "Render budget").

Ended and merged into `main` in Phase 2: `place_marsh_builder` (answered 01:08 UTC after 33 minutes, the blockout of the Blood Marsh in `src/places/marsh/index.ts`: 14 parts and five shot cameras, merged from a bundle as `6a6a358`. Checked by the Builder after the merge: all five keys against their approved pictures in `npm run compare`, the sheets of marsh-01 and marsh-03, and each of the 14 parts alone in the `standins` view. What does not match yet is under "Open items"); `film_render_builder` (answered 01:00 UTC after 37 minutes, `npm run film`, `npm run loop`, `npm run render:local` and checks G5, D2 and D7, merged from a bundle at 01:02 UTC, 64 tests; MEASURED on its VM on the test scene: a stopped render carries on from its kept chunks, a share of the chunks renders alone and joins later, 1.88 s a frame at preview draft with the encode; not run: the whole film, a render across a cut, `--go` on a machine with a graphics card); `sound_stress_builder` (answered before 00:52 UTC, `npm run sound` and `npm run stress`, merged from a bundle as `6bdb100`, 42 tests; no call to the account was made, so the shape of a quota refusal in its code is UNKNOWN, and the stress test ran only at the `draft` tier on the test scene); `measure_pack_builder` (answered before 00:53 UTC, `npm run measure`, `npm run pack` and check G6, merged from a bundle as `b34d8ae`, 70 tests; its page had no `motion` view, so M2 and M3 first ran for real after the merge).

Ended and merged into `main` in Phase 1: `cut_compiler_builder` (answered 23:11 UTC after 10 minutes, `npm run cut`, 37 tests) and `voice_tool_builder` (answered 23:13 UTC after 12 minutes, `npm run voice`, 29 tests; its calls to the account were tested against a stand-in only, its check, keep and sheet steps ran for real on the saved take), both from bundles, merged at 23:20 UTC with 516 tests passing; `cut_sound_checks_builder` (answered 22:33 UTC, G7, G11, G15, G16, D1 and A1 to A6), `mix_builder` (22:34 UTC, `npm run mix` and the loudness measures), `audio_map_builder` (22:41 UTC, `npm run audiomap` and the map, merged as `76f358e`), `animatic_builder` (22:47 UTC after 24 minutes, `npm run animatic`, merged as `c157999`; 446 tests pass); the follow-up of `audio_map_builder` (22:53 UTC after 8 minutes, merged as `d35f84a`; 450 tests pass).

Ended and merged into `main` in Phase 0: `repo_checks_builder` (`c695a6f`), `picture_tools_builder` (`6bcae8f`), `review_page_builder` (`b1d2a4f`, from a bundle), `status_tool_builder` (`04275dc`, answered 21:27 UTC), `gate_budget_builder` (`840ca75`, from its commit `44afd3d`, answered 21:36 UTC), `core_tests_writer` (`d2f5ae2`, from its commit `ced3c52`, answered 21:43 UTC after 6 minutes: 118 tests for the config, the seeded random and the sampler, which found the faults in the config validation and the sampler that are now fixed). Ended with a record: `sound_tools_tester` (answered 21:26 UTC, see "The sound tools"); `idle_tester`, `sandbox_tester`, `image_terms_reader`, `sound_terms_reader`, `platform_reader` (20:42 to 20:46 UTC); `reviewer_01` to `reviewer_10`, the image limit (20:59 to 21:08 UTC); `sound_api_reader` (21:03 UTC). The branch `agent/phase0-test-looks` held only the push test and may be deleted.

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

- 2026-11-24 20:33 UTC `f361749` pushed. Build starts
- 2026-11-24 20:37 UTC `a559db9` pushed. Clock, look log, first status
- 2026-11-24 20:39 UTC `a218a33` pushed. Addendum 001 applied
- 2026-11-24 20:46 UTC `0c59181` pushed. The music, the lookups
- 2026-11-24 20:52 UTC `5a12389` pushed. Packages pinned, harness contract
- 2026-11-24 21:09 UTC `1837d86` pushed. Status 3, the image limit, the sound API reference
- 2026-11-24 21:12 UTC `b1d2a4f` pushed. The checks, the picture tools and the review page merged
- 2026-11-24 21:32 UTC `9053446` pushed. Status 4, the status tool, the engine scaffold
- 2026-11-24 22:00 UTC `59873c3` pushed. Status 5, the spike scene, the renderer, `still`, `caps`, `determinism`, the gate and the budget tools, the core tests
- 2026-11-24 22:22 UTC `746cd43` pushed. Status 6, the render budget on three VMs, the review link on the start page, the play links on the review page
- 2026-11-24 22:36 UTC `1523c93` pushed. Phase 0 closed, status 7, the hosted build checked
- 2026-11-24 22:43 UTC `76f358e` pushed. The cut and sound checks, the mix tool, the audio map tool and `cut/MAP.json`
- 2026-11-24 22:54 UTC `f5b52e5` pushed. Status 8, the map and the state of the voice
- 2026-11-24 22:56 UTC `d35f84a` pushed. The refined map: tempo from the clicks, sharp hits marked
- 2026-11-24 23:25 UTC `6f6a57c` pushed. Status 9, the cut compiler, the voice tool, clip n8 kept
- 2026-11-24 23:45 UTC `3501aeb` pushed. The first cut: `cut/PLAN.json`, `cut/CUTLIST.json`, `cut/CUES.md` and the first mix
- 2026-11-24 23:56 UTC `e784b81` pushed. Status 10, the animatic, the first cut and the first mix

## Session log

- 2026-11-24 20:30 UTC. Task 1 starts on the BUILD MODE prompt. Repo at `418cade`. Stop condition 1 checked: `MANIFEST.sha256` exists, 52 of 52 hashes match, all 34 keys exist and are in the manifest. Kit read in its reading order. No addenda.
- 2026-11-24 20:39 UTC. Addendum 001 arrived on `main` as `7da7398` and was merged at 20:36 UTC. Applied: the repo was measured again (still PUBLIC, so nothing sound is committed yet and the one-time steps wait for the first private reading); the music line was taken out of "For Brandon to decide"; the music row in `ASSETS.md` now reads supplied by Brandon, royalty-free, cleared by Brandon for this project. Status 1 was posted at 20:36 UTC with the approved contact sheet shown inline.
- 2026-11-24 20:45 UTC. Brandon's note 3 applied: the sound folders left `.gitignore` and the music was committed. The five Phase 0 agents all answered between 20:42 and 20:46 UTC: the idle test, the sandbox test (clone, push after `gh auth setup-git`, two attachments), the image terms, the sound terms and X's limits. Their findings are under "Tool record", "The terms that were read" and "Platform", and in `ASSETS.md`.
- 2026-11-24 21:09 UTC. Status 3 posted at 21:09 UTC with the image limit table. The image limit is recorded: 1400 x 788 arrives untouched, about 1.15 megapixels is the limit, nothing lowered. Ten reviewer agents and the sound API reader have answered. Three build agents are working on harness tools.
- 2026-11-24 21:12 UTC. The three build agents finished inside 14 minutes. Their branches were merged, one from a bundle. A fault in the clock found by the new tests was fixed: continuation boxes are whole seconds and a repeated `--continue N` is ignored.
- 2026-11-24 21:32 UTC. Status 4 posted at 21:30 UTC with the tools' own pictures, since no frame exists yet. The status command is merged and made this status. Step 8: three test files of 20, 100 and 400 MB were attached and all were accepted. Step 10 and step 11 are recorded. The sound test found the voice deep and male, and not yet grim or slow (about 188 words a minute on a neutral line with the stored settings): Phase 1 steers it with the delivery tags and measures the pace of every take. The engine scaffold and the spike scene are in work.
- 2026-11-24 22:05 UTC. Status 5 posted at 21:57 UTC with the first computed frame. Steps 15 and 16: the engine scaffold renders the spike scene through `capture` mode, and `still`, `caps`, `determinism`, `gate`, `budget`, `crops`, `compare`, `sheet`, `keep`, `status` and `review` exist. G3 failed on its first run, the cause was found in the scene pass and fixed, and it passes (see the decisions). The core tests an agent wrote were merged and the six faults they showed were fixed: 332 tests pass. Pushed as `59873c3` at 22:00 UTC. Step 17 is running: the budget on this VM, and two sandbox agents that render the same stills and measure the budget on their own VMs.
- 2026-11-24 22:35 UTC. Status 6 posted at 22:20 UTC with the test scene in 4K at the final tier and twelve frames in a row. Step 17: the budget was measured on the Builder's VM and on two sandbox VMs, and the same frame came out byte for byte equal on all of them. The master and the film in HD do not fit their limits at the `final` tier on the test scene, so the places must cost less than it or render at the highest tier that fits (see "Render budget" and the decisions). Step 18: the build is published with its review page, the hosting carried 497 MB in a test, and `npm run flows` passes 7 of 7 on the hosted copy. Four agents started at 22:22 UTC on the Phase 1 tools while the last Phase 0 checks ran.
- 2026-11-24 22:53 UTC. Status 8 posted at 22:54 UTC with the map of the music and a frame from the animatic tool. Phase 1: the map is made from the audio and agrees with the kit's landmarks; the checks, the mix, the audio map and the animatic tools are merged and 446 tests pass. The ElevenLabs account has 4 characters left, used up by music and sound effects from other work on the account; one take of the Reveal's clip was made with the last of them; the other seven clips and the sound effects are open items and the build goes on. The listener was found unable to judge a voice.
- 2026-11-24 23:23 UTC. Status 9 posted at 23:24 UTC with the waveform sheet of clip n8. The cut compiler and the voice tool came back in 10 and 12 minutes, were merged from bundles (516 tests pass) and are npm run cut and npm run voice. Clip n8 was checked, kept and split into its four lines by the voice tool, committed, and plays on the review page (published 23:23 UTC). Four open items written: clips n1 to n7, the single take of n8, the sound effects, and that nothing that can hear has judged the voice.
- 2026-11-24 23:54 UTC. Status 10 posted at 23:55 UTC with three frames of the animatic and the review page link (its header reads 11 because a draft of it was counted; the records say 10). Phase 1 steps 3 to 8: the plan, the cut list with no fault, the cue sheet, the first mix, the animatic (5931 frames, 197.70 s, 73.1 MB), each line checked against its picture, published at 23:54 UTC, visitor flows pass. The animatic does not yet print the silent lines, against the decision logged at 22:5x; that is being added and the animatic made again.
- 2026-11-25 00:15 UTC. Status 11 posted at 00:16 UTC with a frame of the animatic that prints a silent line and the sheet of the retimed rise. Phase 1 is closed: its gate passed at 00:08 UTC with 17 of 18 checks and one sound check open (A1, the sound-alike pair in n8). The animatic was made again with the silent lines printed and the rise retimed (5931 frames, 197.70 s, 73.2 MB), kept, put on the review page and published at 00:05 UTC. Visitor flows on the published copy: 5 of 7 by the test as it stood. Looked into: all three pictures load (the test read a lazy picture before it was scrolled into view), and the storage host answered 502 to one large sound or film request in two of five page loads from the VM, a different file each time, while every file answers whole when asked again. UNKNOWN whether Brandon's tablet ever sees that. The test is being corrected to scroll the pictures into view and to tell such a 502 from a real fault. Phase 2 starts.
- 2026-11-25 00:23 UTC. 00:17 UTC: published again, visitor flows 7 of 7 on that deploy.
- 2026-11-25 00:23 UTC. 00:18 UTC: `fbfb93d` pushed. Phase 1 closed, status 11.
- 2026-11-25 00:23 UTC. 00:24 UTC: Phase 2 harness additions: renderRaw (raw frames for the film tools), filmStates, the part option for the solo and standins views. 516 tests pass.
- 2026-11-25 00:36 UTC. 00:37 UTC: status 12 posted. Engine core pushed as `590f414`. Nine agents running: six place blockouts, three harness builders.
- 2026-11-25 00:52 UTC. Status 13 posted: the reveal blockout (six frames of the rise) and the outline traced from the master. The sound and stress tools are merged from the first agent, 42 tests pass here.
- 2026-11-25 01:11 UTC. Status 14 posted at 01:11 UTC: the reveal and the Blood Marsh blockouts against their approved pictures. The Blood Marsh place merged (6a6a358) and checked through the harness. The parts register, the shots file and the sound of the film on the page committed (2ec76a8).
