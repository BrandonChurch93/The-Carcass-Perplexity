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
- Large files reach Brandon by: an attachment in the thread. MEASURED 2026-11-24: 20 MB, 100 MB and 400 MB test files were all accepted by the share call. The review page carries the same films while the site stays under the hosting limit

## Latest pictures

The pictures of the newest status, with their captions and the time. Files are in `out/stills/status/`.

Status 5, 2026-11-24 21:57 UTC:

- `01-frame-300-hd-review.jpg`: The first computed frame. This is a test scene made to measure what a place will cost, not a place of the film: a displaced, lit, glowing surface under a volume of fume, with 6,000 moving embers. 1920 x 1080, two samples, 21 seconds on this machine
- `02-frame-300-1.jpg`: The same frame through the crops tool, at native size. The tools now run on real frames

Status 4, 2026-11-24 21:30 UTC, showed: The comparison tool, built by an agent: the approved picture on the left, the frame on the right, matching crops under them.
Status 3, 2026-11-24 21:09 UTC, showed: how many digits of a test chart each model family read, at the size the critics will be sent and at a size over the limit.
Status 2, 2026-11-24 20:48 UTC, showed the test chart itself.

## Clock

Copied from the last tick of `npm run clock`.

```
2026-11-24T21:57:04Z
phase 0: 1.45 h used of 3.00 h
build: 1.45 h used of 72.00 h
extra rounds: yes
minutes since the last status: 27
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
- Speech model and settings: tested in Phase 0 with `eleven_v4`, stability 0.5, similarity 0.75, `mp3_44100_192`. The settings for the film are chosen in Phase 1
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
- A detached process outlives the step that started it. MEASURED 20:50 to 20:57 UTC: a loop started with `setsid nohup` wrote a line a second to a log for its full 400 seconds, through six later steps, after the step that started it had returned at once. Long renders run detached with a log that is polled.
- Every agent brief runs `gh auth setup-git` before the clone as well, so the clone keeps working when the repo turns private. The first sandbox agent that starts after a private reading confirms it, as addendum 001 asks, and the result is written here.
- The idle agent answered at 20:42:59 UTC, two minutes after it started, and its message arrived in the Builder's turn while the Builder was working. MEASURED.

### Handing over a large file

Measured 2026-11-24 21:19 UTC with three test videos of moving noise with no sound, made with ffmpeg: 20, 100 and 400 megabytes (the sizes in `deliver.attachTestMb`). What they are was said in status 4.

- An attachment in the thread. MEASURED: the share call accepted all three, 20 MB, 100 MB and 400 MB, each in a few seconds, and each is listed in the thread as a video. UNKNOWN from this side: how each plays or downloads for Brandon, which only he sees.
- App hosting. STATED in `AGENTS.md`: about 500 MB a site, behind a sign-in. To be measured with the first publish in step 18, where the 400 MB test file rides along once.
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
- App hosting. STATED: `deploy_website` publishes a static folder and `publish_website` exists beside it. The largest site: about 500 MB as `AGENTS.md` states, measured in step 18.
- The listener. STATED: `evaluate_audio` takes a sound file of up to 20 MB and a question. MEASURED: two calls answered in 8 and 14 seconds.
- Speech and sound effects: ElevenLabs through the saved credential, see "The sound tools". The workspace's own `text_to_speech` is not used, because the voice is Brandon's account voice.
- Supporting agents. MEASURED: seven model families can be started and all seven see images: `claude_fable_5_2`, `claude_sonnet_5_5`, `claude_opus_5_5`, `gemini_4_carbon`, `gemini_neon`, `gpt_6_2_astra`, `gpt_6_2_sol`. See "The image limit". No model hears sound directly.

### The sound tools

Each fact is marked MEASURED (seen in this test), STATED (read in `audio/records/API-REFERENCE.md`) or UNKNOWN. All test files are in `out/work/soundtest/`.

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
- 2026-11-24. Critic packs for the gemini_4_carbon family are cut to at most 1048 px on the long edge, inside the config limits: it left 11 of 60 small digits unread at 1400 x 788 and none at 1048 x 1048. Every other family gets 1400 x 788.
- 2026-11-24. Megabytes and gigabytes are decimal in every check (45 MB is 45,000,000 bytes), the stricter reading.
- 2026-11-24. Every render target is half float, in every mode and on every machine, so the half float path of G10 is the only path. Accumulating four samples in half float keeps about 11 bits, well under one step of the 8 bit output, and the output is dithered.
- 2026-11-24. The page is given only the WebGL extensions listed in `config/portable.json`, on every machine: every other extension is answered as missing before three.js sees it. So G10 holds by construction and a frame cannot come to depend on an extension only one machine has.
- 2026-11-24. The harness builds its own copy of the site under `out/work/site/` when the source hash changes, so a render never empties `dist/` with the review page in it.

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

Each reports by message to the Builder.

| Agent | Kind | Job | Branch | Started | Limit |
| --- | --- | --- | --- | --- | --- |
| `gate_budget_builder` | build, sandbox | `gate` and `budget`, with tests, against the renderer contract | `agent/tools-gate` | 21:19 UTC | 45 min |

Sandbox agents and the push: `gh auth setup-git` fails in most sandbox VMs ("not logged into any GitHub hosts"), and a plain `git push` then works in most of them and fails in some. Every brief says: push, and if it fails attach a `git bundle` to the report. Both routes have been used and both work.

Ended and merged into `main`: `repo_checks_builder` (`c695a6f`), `picture_tools_builder` (`6bcae8f`), `review_page_builder` (`b1d2a4f`, from a bundle), `status_tool_builder` (`04275dc`, answered 21:27 UTC). Ended with a record: `sound_tools_tester` (answered 21:26 UTC, see "The sound tools"); `idle_tester`, `sandbox_tester`, `image_terms_reader`, `sound_terms_reader`, `platform_reader` (20:42 to 20:46 UTC); `reviewer_01` to `reviewer_10`, the image limit (20:59 to 21:08 UTC); `sound_api_reader` (21:03 UTC). The branch `agent/phase0-test-looks` held only the push test and may be deleted.

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

## Session log

- 2026-11-24 20:30 UTC. Task 1 starts on the BUILD MODE prompt. Repo at `418cade`. Stop condition 1 checked: `MANIFEST.sha256` exists, 52 of 52 hashes match, all 34 keys exist and are in the manifest. Kit read in its reading order. No addenda.
- 2026-11-24 20:39 UTC. Addendum 001 arrived on `main` as `7da7398` and was merged at 20:36 UTC. Applied: the repo was measured again (still PUBLIC, so nothing sound is committed yet and the one-time steps wait for the first private reading); the music line was taken out of "For Brandon to decide"; the music row in `ASSETS.md` now reads supplied by Brandon, royalty-free, cleared by Brandon for this project. Status 1 was posted at 20:36 UTC with the approved contact sheet shown inline.
- 2026-11-24 20:45 UTC. Brandon's note 3 applied: the sound folders left `.gitignore` and the music was committed. The five Phase 0 agents all answered between 20:42 and 20:46 UTC: the idle test, the sandbox test (clone, push after `gh auth setup-git`, two attachments), the image terms, the sound terms and X's limits. Their findings are under "Tool record", "The terms that were read" and "Platform", and in `ASSETS.md`.
- 2026-11-24 21:09 UTC. Status 3 posted at 21:09 UTC with the image limit table. The image limit is recorded: 1400 x 788 arrives untouched, about 1.15 megapixels is the limit, nothing lowered. Ten reviewer agents and the sound API reader have answered. Three build agents are working on harness tools.
- 2026-11-24 21:12 UTC. The three build agents finished inside 14 minutes. Their branches were merged, one from a bundle. A fault in the clock found by the new tests was fixed: continuation boxes are whole seconds and a repeated `--continue N` is ignored.
- 2026-11-24 21:32 UTC. Status 4 posted at 21:30 UTC with the tools' own pictures, since no frame exists yet. The status command is merged and made this status. Step 8: three test files of 20, 100 and 400 MB were attached and all were accepted. Step 10 and step 11 are recorded. The sound test found the voice deep and male, and not yet grim or slow (about 188 words a minute on a neutral line with the stored settings): Phase 1 steers it with the delivery tags and measures the pace of every take. The engine scaffold and the spike scene are in work.
