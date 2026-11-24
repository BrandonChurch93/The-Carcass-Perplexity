# 10 · Kickoff

For Brandon. The Builder does not act on this file.

The reference runs are done, and you approved the 34 pictures, the script, the voice and the music on 2026-11-24. This is the build. It runs start to finish with one stop: when the Heart is finished it shows it to you in motion with the voice, the music and the sound. You can send notes as many times as you like. When you approve, it builds the other five places and the rise to orbit the same way and delivers.

## Before you start

1. In ElevenLabs, open My Voices and copy the name of the narrator voice exactly as it is written there.
2. In Computer, check that the GitHub connector is connected and that the ElevenLabs credential is still saved.
3. Use Fable on Ultra Code at the highest effort, with Multiagent on.
4. Have the music file ready to attach: `The-Carcass-Audio.mp3`.

## Start the build

Paste this prompt, put the voice name on its line, and attach the music file to the same message.

```
BUILD MODE.

Repo: https://github.com/BrandonChurch93/The-Carcass-Perplexity
Narrator voice: <the name of the voice, exactly as it appears under My Voices in ElevenLabs>

The music track is attached to this message.

Clone the repo. Read AGENTS.md, then kit/00-README.md, then the kit in its reading order. Build the whole film from the kit: work every phase in kit/08-BUILD-ORDER.md in order, close every gate by passing it or by reaching its limit, run the critic rounds inside their limits and the clock, and log everything in kit/PROGRESS.md.

Run this as one continuous task. Do not ask me questions. Decide, log the decision and continue. Stop only at the review stop, the budget report, BUILD COMPLETE or a blocker as AGENTS.md defines one.

The picture comes first. The kit sets the bar, the limits and what is fixed. Every other call is yours, and the right call is the one that makes the film look better.

Show your work as you go, as AGENTS.md says: statuses with pictures displayed inline in this thread at the rhythm it sets. If I write in this thread, apply it and carry on.

Use supporting agents wherever they help. Do not lower the bar to finish sooner.
```

## What you will see, in order

1. A first status showing your approved pictures, proving that pictures show up inline. It also says whether the music and the voice were found.
2. A review page at the build's address under `review.html`. Everything that plays is there.
3. A status with pictures at least every half hour, and one at the end of every round and every finished place.
4. The voice: all eight narration clips, and an animatic of the whole film made from your approved pictures with the voice and the music. The build does not wait for you here, but this is the first time you can hear the narrator. If he is wrong, say so in the thread.
5. The blockout: the whole film playing with placeholder shapes.
6. The Heart, finished. Then `REVIEW`, the one stop.
7. After you approve: the Ribs, the Breath, the Blood Marsh, the Spine, the Eye and the rise to orbit, built side by side.
8. The whole film, polished, then the 4K render, the card loop and the card still, and `BUILD COMPLETE`.

If the time you allowed runs out first, you get `BUDGET REPORT`, with what is done and what is left.

## Steering while it runs

- If a status shows something going the wrong way, say so in the Computer thread in plain words. The Builder applies it and carries on.
- For anything bigger, bring it to the planning chat. It goes into the repo as a numbered addendum, and the build picks it up at its next phase or its next push.
- If you want the film to differ from one of your approved pictures on purpose, bring that to the planning chat too. It is added as a settled line, so the critics stop asking for the picture on that point.

## The review stop

When the Heart is finished the task ends with a block headed `REVIEW`.

1. Open the review page and watch the first video with the sound on. It is the Heart as it will be in the film.
2. Listen to the eight narration clips under Listen.
3. Watch the animatic for the pacing of the whole film.

### If you want changes

Send this as many times as you like. Each one is a bounded piece of work that ends with the `REVIEW` block.

```
BUILD MODE.

Review notes.

Pull https://github.com/BrandonChurch93/The-Carcass-Perplexity and continue from kit/PROGRESS.md. Read AGENTS.md and kit/addenda/ first. Same rules.

What to change:
<your notes, in plain words. For the voice or a sound, name the clip or the line and say what is wrong with it>
```

### When the Heart is right

```
BUILD MODE.

The Heart is approved.

Pull https://github.com/BrandonChurch93/The-Carcass-Perplexity and continue from kit/PROGRESS.md. Read AGENTS.md and kit/addenda/ first. Same rules.

Anything to change as you go:
<your notes, or "Nothing">
```

- The repo is private, so the voice, the sounds and the music are saved in it. Nothing has to be attached to this prompt or to any later one.
- There is no second stop. Anything in your notes that cannot be done inside the limits is listed at the end.

## The limits you have

| What | Value | Config key |
| --- | --- | --- |
| The most the build may run before it must stop and report | 72 hours | `budget.runHours` |
| The most each round of review notes may run | 4 hours | `budget.reviewRoundHours` |
| Extra time each time you say continue | 24 hours | `budget.continueHours` |
| The most the polish in one extension may run | 12 hours | `budget.extendHours` |
| Longest gap between statuses | 30 minutes | `budget.statusMaxGapMinutes` |
| Pictures in one status | up to 4 | `status.maxPictures` |
| Rounds on the Heart | up to 5 | `quality.lookLockMaxRounds` |
| Rounds on each other place and on the rise | up to 3 | `quality.maxRoundsPerUnit` |
| Rounds on the whole film | up to 3 | `quality.wholeFilmMaxRounds` |
| Polish rounds at the end | up to 3 | `quality.polishMaxRounds` |
| The score a place needs to pass | 9 out of 10 | `quality.passScore` |
| Takes of one narration clip | up to 6 | `narration.maxTakesPerClip` |
| Takes of one sound | up to 3 | `audio.maxTakesPerCue` |
| Sounds in one place | up to 4 | `audio.maxCuesPerPlace` |
| The longest the 4K render may be estimated to take in Computer before it is sent to your Mac | 8 hours | `sandbox.masterMaxHours` |
| Whether Computer tries the 4K render at all | yes | `deliver.sandboxMaster` |

- The time counted is working time. Time when no task is running, and the time the build sits at the review stop, is not counted.
- These are caps, not forecasts.

## If the build reports at the budget

`BUDGET REPORT` lists what is done, what is left and what it looks like now. To carry on, start a new task with this prompt:

```
BUILD MODE.

Continue past the budget.

Pull https://github.com/BrandonChurch93/The-Carcass-Perplexity and continue from kit/PROGRESS.md. Read AGENTS.md and kit/addenda/ first. Same rules.
```

## If a task ends early for any other reason

If the last thing you sent was the approval prompt or a review notes prompt, send that same prompt once more. Otherwise send the prompt below.

```
BUILD MODE.

Pull https://github.com/BrandonChurch93/The-Carcass-Perplexity and continue from kit/PROGRESS.md. Read AGENTS.md and kit/addenda/ first. Same rules.
```

## To ask for a status at any time

```
Post a status now: the phase, the unit and the round, what changed, what is next, the time used, and the current pictures shown inline. Do not stop working.
```

## After BUILD COMPLETE

The first line of the block says where the 4K film is.

- If Computer rendered it: the file, or its parts with the one command that joins them, is in the thread. Nothing else has to be rendered.
- If it says the 4K master is to be rendered on your Mac: bring it to the planning chat, or give Claude Code on your Mac the prompt below. The film is the same film. Your Mac computes the same frames with its graphics card, one at a time, so it is just as smooth.

```
Render The Carcass to a 4K video file frame by frame, so it is perfectly smooth. Do not screen record.

Setup
- Clone BrandonChurch93/The-Carcass-Perplexity, branch main, into ~/showcase-recording/the-carcass. The repo is private, so use my GitHub sign-in. Do not touch any other copy of the repo. Do not push anything.
- Read README.md in the clone. It gives the exact commands. The final mix and the music are in the repo.

Render
- Run npm install.
- Run npm run render:local -- --what film --test. It renders one frame and compares it with the kept still, then renders the first ten seconds with sound and opens the result. Stop there for my go.
- On my go, run npm run render:local -- --what film --go, then npm run render:local -- --what loop --go.

Check
- The film's frame count equals its length in seconds times 60.
- Open the folder with the finished files in Finder.
```

Either way, the card still and the small web copy of the loop are in `deliver/` in the repo, ready for the portfolio card. The full-size loop comes with the film.

## If you want more polish after it completes

Each of these buys one more bounded polish pass on the open items. Add notes under the last line if you have any.

```
BUILD MODE.

Extension.

Pull https://github.com/BrandonChurch93/The-Carcass-Perplexity. Read AGENTS.md, kit/PROGRESS.md and kit/addenda/. Run one extension as AGENTS.md and kit/08-BUILD-ORDER.md define it, and end with the BUILD COMPLETE block.
```

## Two things that are yours

- Keep the repo private. The voice clips, the sound effects and the music are saved in it, so they are in its history. Addendum 001 in `kit/addenda/` tells the build to do this as soon as it finds the repo private.
- Where the 4K render happens. The build tries it in Computer and falls back to your Mac if its scenes are too heavy to finish there in the time allowed. To skip the attempt and always render on your Mac, set `deliver.sandboxMaster` to `false` in `config/showcase.json`.
