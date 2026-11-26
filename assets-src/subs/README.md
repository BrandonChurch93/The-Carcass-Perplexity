# The caption layer

The narration's words on screen: warm off-white words that come in as each is spoken, on a soft moving haze with no box. The layer is laid over finished frames by `subs.py`. The page never draws it and no picture code knows of it.

Adapted from the caption layer of the Solar System Fly-Through (`assets-src/subs/subs.py` in `https://github.com/BrandonChurch93/Solar-System-Perplexity`): its word by word timing, its haze under the words, its fades, its row breaking and its type are kept. The colours, the embers and the dither are this film's.

## Files

- `subs.py`: the tool. Python 3 with numpy, OpenCV and Pillow, and ffmpeg for `burn` and `layer`.
- `Lato-Medium.ttf`, `OFL.txt`: the type and its licence (row in `ASSETS.md`).
- `alignment-kept.json`: for each of the eight clips, the number of the kept take and the voice maker's letter times of that take.
- `cut/CAPTIONS.json`: the cue list and the look. `subs.py cues` writes it and every other command only reads it.

## Commands

```
npm run subs -- cues [--check]            write cut/CAPTIONS.json, or say whether the file is what cues would write
npm run subs -- still T OUT [FRAME.png]   one frame at T seconds over a film frame, or over black, grey and white bars
npm run subs -- burn FILM AUDIO OUT       the film with the layer burned in and AUDIO as its sound
npm run subs -- layer OUT W H FPS         the layer alone with alpha: OUT.mov, or PNG files when OUT holds %05d
npm run subs -- prove [-v]                every word's time against where its line's own sound rises
npm run subs -- contrast T FRAME.png      the text against what lies round the letters in that frame
npm run subs -- step T0 T1 W H FPS        the layer's mean change from frame to frame over mid grey
```

Frames are 960 by 540, 1920 by 1080 or 3840 by 2160. `burn` takes the size and the rate from the film, 30 or 60 frames a second. `burn` and `layer` take a start in seconds and a length after their arguments, for a part of the film.

## To change the look

Edit `look` in `cut/CAPTIONS.json`. `cues` keeps it as it finds it. Nothing in `subs.py` has to change.

- `text`: the colour of the words, sRGB.
- `units.<place>.dark`, `body`, `bright`: the haze of that place from its darkest to its brightest. `sparks`: whether it carries embers. `family` is a note for the reader.
- `sparkFrom`, `sparkTo`, `sparksPerSquareEm`: the embers' colours and how many.
- `crossfadeSeconds`: how long two places' colours cross, centred on the cut between them.
- `em`: the type size as a share of the frame height. `baseline`: the last row's baseline as a share of the height.
- `cover`: the most the haze hides of the picture, 0 to 1.
- `breaks`: `{ "n3-3": 6 }` starts the second row of that line at its word 6 (counted from 0), where the rule's own break is not wanted. Run `cues` after.

The colours are a list for each place, picked by film time from `places` in the cut list. Nothing is read from the picture, so nothing can shimmer with it.

## Where the times come from

A word's film time is `first / fps` of its line in the cut list, plus the word's time in the take, less the second of the take the line was cut from (its record under `audio/records/` says "Take N from A s"). The first word of a line is the exception: the kept line was cut 0.03 s before the first 0.01 s window that holds sound, so the first word begins at the end of that window, wherever the alignment put it. A word shows 0.04 s before its time.

A line leaves 0.80 s after its last word and fades over 0.55 s. Where the next line is nearer than that, it holds less and fades faster, and is gone when the next one's haze begins.

## What is the same at every size and rate

Everything is a function of the film time and the frame size. The haze is computed on a grid of 13.5 cells to the em and the rows are broken once, at 1920 by 1080. The dither is one pattern for each frame size, fixed in place, so two frames of the same time are the same bytes and a frame at 30 frames a second is the frame of that time at 60.
