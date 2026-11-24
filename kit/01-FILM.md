# 01 · The film

## What it is

A man who has walked a dead land tells you what is there. He does not sell it and he does not explain it. He names a place, says what it is, and moves on. The pictures do the rest: six places that should not exist, each one alive and each one wrong, and then the camera leaves the last of them, rises without a cut, and the land turns out to be a body.

It is for X, played on a phone as often as on a screen. It has to stop a scroll in its first `film.hookSeconds` seconds with the sound off, and it has to be worth the sound when it is on.

The whole film is cut to one piece of music. Picture, voice and sound land on that music so that it plays as one composed piece, not as a demo with a track under it.

## The shape

The order is `film.order`. Times are positions in the music and come from `music.landmarks`. They were measured by the kit's author from the same file and are a starting point. Your own map of the track wins over them.

| Part | Where it sits on the music | What happens |
| --- | --- | --- |
| The opening | From 0 to `preludeEnd`. The music is a quiet swell | The approach. The viewer arrives at the land from the sea and the first rib blades come out of the weather. Clip `n1` plays here. The opening is the first part of the Ribs: one place, not a title sequence |
| The Ribs | Begins on `firstHit`, the first strike of the track | The strait, its animals, the weed line. It ends as the bore comes through the cage, and the bore belongs on `swellPeak` |
| The Heart | After `swellPeak` | The lava lake at nightfall. The Heart owns the biggest moment of the first half of the track, `bigPeakStart` to `bigPeakEnd`: the vessel mouth and its lava fall, or whatever in the Heart is most worth it |
| The Breath | After `bigPeakEnd` | The shelf at dawn, the shafts, the heavy air |
| The Blood Marsh | Around `midHit`, the single strongest accent in the middle of the track | The red flats. Something bursts or gives way on `midHit` |
| The Spine | The driving stretch that follows | The ridge in the storm. The strikes land on accents |
| The Eye | Runs up to `quietStart`, where the music falls away, and a few seconds into the quiet | The still lake. The last line of clip `n7` is spoken into the quiet, over the centre of the lake |
| The Reveal | From that line to `revealHit` | The camera leaves the centre of the lake and rises, without a cut, through the rest of the quiet. The music returns from `quietEnd` and strikes on `revealHit`. The whole titan is in frame on that strike. Clip `n8` follows |
| The ending | After `revealHit` | The camera holds on the body. The film ends on the music's own ending: `tailFadeStart` to `finalHit` and the decay to `end` |

- Every place gets at least `film.minPlaceSeconds`. Beyond that, how long each place runs is yours, set by the music and the words.
- Inside a place the film opens on the establishing view, travels, and pushes in on details. Brandon's words: it shows the landscape, then zooms in on various parts, some of it the wildlife, some of it the swamp bubbling, and so on, and then it switches to a different location. The four details of each place are in `keys`. Their order inside a place is yours to change where the words or the music ask for it.
- How one place gives way to the next is yours: a hard cut on an accent, a move that carries through weather, a match of shape or light. It is never a dissolve between two stills.
- The reveal is one shot. From the moment the camera leaves the lake until the titan is whole in frame there is no cut, no dissolve and no jump.

## The length and the one cut in the music

- The track is `music.seconds` long and the film is not. The film uses the track from its first sample without a cut through `revealHit`.
- After the reveal the music is cut once, at bar lines, so that the film ends on the track's real ending and not on a fade in the middle of a phrase. `music.barSeconds` and `music.bpm` are the measured bar and tempo.
- The film is between `film.minSeconds` and `film.maxSeconds` long. `film.targetSeconds` is the aim.
- Nothing else is done to the music: no pitch change, no time stretch, no added instruments. It is ducked under the voice by at most `audio.duckMaxDb`.

## The ending

Clip `n8` ends on "This one is not finished." The music then falls to almost nothing and strikes once more on `finalHit`. That last strike wants one last picture. One idea, which you may use or beat: from orbit, the Heart's glow beats once on the body, and the picture goes dark over the decay. Whatever you choose, the last frame is black or nearly so, with no text on it.

## The words

Brandon approved these word for word. They are `narration.clips` in the config, and the config is the source. They are printed here to be read.

`n1` · the opening

```
Listen.

There is a land the maps leave empty.

I have walked it. End to end.

I will tell you what is there.
```

`n2` · the Ribs

```
The strait.

Stone ribs. Taller than any wall men have built.

At low tide, the winged things come down to feed.

Look up. The drowned hang in the weed. That is how high the sea returns.
```

`n3` · the Heart

```
The fire.

A lake of it, under a black skin.

The tall ones walk the skin, and drink from the cracks.

It burned before there were men. It will burn after.
```

`n4` · the Breath

```
The pits.

The land breathes here. Slow. From far below.

Nothing grows near them but the red weed.

The pale herds feed, and keep their distance. They are wiser than men.
```

`n5` · the Blood Marsh

```
The red flats.

It was blood once. It still seeps.

The great beasts wallow in it, and grow fat.

The salt keeps what it catches. Forever.
```

`n6` · the Spine

```
The ridge.

Above the clouds. Above the storm.

Lightning walks it every night. Spire to spire.

The beasts sleep inside the bone, and wait for morning.
```

`n7` · the Eye

```
The lake.

Still. Gold at the edge. Black at the center.

The herds drink there. They do not look down.

The center has no bottom. I did not find one.
```

`n8` · the Reveal

```
Now you see it.

This was never land.

It was a god.

Gods die slow. This one is not finished.
```

How they are used:

- Never change, add, drop or reorder a word. Punctuation may be changed in what is sent to the voice tool, only to steer a pause.
- A blank line is a pause of at least `narration.linePauseMinSeconds`. The harsh tone lives in the pauses. He is never in a hurry.
- A clip may be made line by line, so that each line can be placed on its own.
- A line belongs with what it names. "Look up." is spoken as the camera looks up at the drowned. "The tall ones walk the skin" is spoken over the walkers. "The salt keeps what it catches" is spoken over the one on the thin crust. "The center has no bottom. I did not find one." is spoken over the centre of the lake, in the quiet, and is the last thing said before the camera rises.
- No line of `n8` begins before a viewer could recognise the body. He says "Now you see it." after you do. "It was a god." sits on or just after `revealHit`, never before it.
- The voice never talks over the two or three biggest strikes of the music. Words go in the gaps and the music answers them.
- The words of one place are finished before the cut to the next, except where a line is meant to carry across.

## The voice

- Brandon made the voice himself with ElevenLabs voice design and saved it to his account. It is deep, slow, rough and cold: someone who has lived in this world, not an old man reading a story.
- Its name is on the `Narrator voice:` line of the kickoff prompt. Write it under "Voice" in `kit/PROGRESS.md` in Phase 0. `narration.voiceName` in the config is empty on purpose. If that line is missing or the name is not on the account, list the account's voices, use the most recently created voice that is not a stock voice, log that the choice was yours, and say so in the first status and in the `REVIEW` block.
- Every clip is made with that one voice and the same settings, so the narrator is one man from first line to last.
- Never clone or imitate the voice of a real person, and never name a real person or a character in anything sent to the voice tool.
- `kit/03-METHOD.md` section 7 says how takes are made and chosen. Each clip gets at most `narration.maxTakesPerClip` takes.
- If no narration can be made, the film is built as if each clip were `narration.placeholderClipSeconds` long, and Brandon records the voice himself.

## The music

- The file is `music.file`, `music.seconds` long, SHA-256 `music.sha256`. It is dark and slow, with choir, drums and strings. Brandon chose it.
- Make the map in Phase 1: tempo, beats, bar lines, every strong hit and the sections, written to `cut/MAP.json`. Use the workspace's audio map skill if it is there, and your own analysis if it is not. If the hash of the file you were given is not `music.sha256`, say so in the first status and trust your own map.
- What the kit's author measured, for comparison with your map:

| Key in `music.landmarks` | What it is |
| --- | --- |
| `preludeEnd` | The end of the quiet opening swell, a breath of near silence |
| `firstHit` | The first strike of the track |
| `swellPeak` | The top of the first build |
| `bigPeakStart`, `bigPeakEnd` | The loudest passage of the first half |
| `midHit` | The strongest single accent in the middle of the track |
| `quietStart`, `quietEnd` | The long quiet before the reveal, with a few soft pulses in it |
| `revealHit` | The strongest low strike of the whole track, where the music comes back |
| `tailFadeStart` | Where the last section starts to fall away |
| `finalHit` | The last strike, after a few seconds of silence |
| `end` | The end of the decay |

- The cut list, `cut/CUTLIST.json`, is made from the map. Every cut, every strike of lightning, the bore, the lava fall and the reveal sit within `film.cutToleranceFrames` frames of a mapped accent or bar line.

## The sound

- Each place has its own bed and a few spot sounds, made with the sound effect tool: the surf and the wind in the strait, the lake's low churn and hiss, vapour and dripping on the shelf, bubbles and insects on the flats, gale and thunder on the ridge, almost nothing at the lake.
- At most `audio.maxCuesPerPlace` cues for a place, bed included. They sit under the voice and under the music, quiet enough to be felt more than heard. The track is already full.
- A spot sound belongs to something seen: the bore, a plate foundering, a dome bursting, a strike. It lands on the frame it belongs to.
- The reveal is close to silent on purpose. Let the quiet be quiet.
- The mix measures `audio.loudnessLufs` integrated with peaks at or under `audio.truePeakDb`, at `audio.sampleRate`.

## The deliverables

All three are named in `export.files`. The film and the full-size loop are large, so they are written under `deliver/film/`, which git ignores, and handed to Brandon. The loop's web copy and the card still are written to `deliver/` and committed.

1. The film, `export.files.master`: `formats.master` at `film.fps`, encoded as `export.master` says, with the final mix. `kit/05-ARCHITECTURE.md` and Phase 6 of `kit/08-BUILD-ORDER.md` say how and where it is rendered, and what happens if it cannot be finished here. A copy at `formats.hd` goes with it as `export.files.hd`.
2. The card loop, `export.files.cardLoop`, with a small web copy, `export.files.cardLoopWeb`: one shot, `deliver.cardLoop.seconds` long, that repeats forever without a visible seam. It is not a cut-down of the film. It is its own shot of the single best-looking thing in the film, in which every motion closes on itself. By default it comes from the unit in `deliver.cardLoop.unit`. It has no sound.
3. The card still, `export.files.cardStill`: frame 0 of the loop, in the same format and at the same tier as the loop itself, so that the still and the first frame of the loop are the same picture.

## What is not in the film

- No text, title, caption, logo, credit or end card, in any frame.
- No typed prompt or interface at the start. Brandon decided this film opens straight on the picture.
- No people.
- No frame made by a video generation model.
- No interface of any kind.

## What you may tune

Everything about timing inside the map: where each place begins and ends, how long each shot holds, the order of the details inside a place, the camera's route and speed, where each line of the voice falls, where the one cut in the music goes, `film.targetSeconds` inside its limits and `deliver.cardLoop.seconds` inside its limits. Change the config when you change one of these and log the decision.
