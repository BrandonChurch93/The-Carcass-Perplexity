# The music, cleaned: two spots of laughter taken out

Asked by Brandon in review round 1 (note 9 in `kit/PROGRESS.md`). Made on 2026-11-25. No ElevenLabs credits were spent on it.

| | |
| --- | --- |
| Supplied track | `audio/supplied/The-Carcass-Audio.mp3`, sha256 `eefe8765b73f35622be8410f063f327902dd0ce5b564688fade5b732afc56b1f`. Untouched. |
| Cleaned track | `audio/cleaned/The-Carcass-Audio-cleaned.flac`, 24 bit, 44.1 kHz, stereo, 10,297,728 samples, 233.5086 s, sha256 `80dc10a09c645fc94b91d021050fa0d0520ea2a506d8f0dc2d16a9dd832f7b16` |
| What was taken out | `audio/cleaned/removed/spot-1.flac` and `spot-2.flac`. Adding them back to the cleaned track gives the supplied track again. |
| Tool | `python3 pipeline/music/clean.py` makes it. `python3 pipeline/music/clean.py --check` decodes the supplied track again and proves the cleaned file against it. |
| Report | `audio/cleaned/cleaned.json` |
| In the config | `music.cleaned` holds the file and its hash. The cut, the mix and every film play the cleaned track. The map of the music was made from the supplied track and does not move, because the length and the timing are the same. |

## What is the same

MEASURED by the tool's check. The cleaned track has the same 10,297,728 samples as the supplied track decoded. Outside the two spots, 9,939,229 samples a channel, no sample differs by more than 5.96e-08, which is half a step of 24 bit depth: the rounding of the file, nothing else. Inside the spots the cleaned track is the supplied track less the removed signal, to the same half step.

## Spot 1: 1:14.163 to 1:16.642, the laugh that sounds like a witch

The first choice: only the laugh is taken out.

- Way: a free separation model (the second of the three below) splits the music into a voice and everything else. The voice it finds here, between two stretches where it finds none (1:12.722 to 1:14.163 and 1:16.642 to 1:17.122), holds the laugh and nothing else. That signal alone is subtracted, samples 3,270,584 to 3,379,918. Nothing is muted, faded or replaced.
- MEASURED: the removed signal is at -26.3 dB. The spot is at -13.25 dB before and -13.52 dB after, 0.27 dB lower.
- Listener, asked whether it hears laughing: before, yes in 5 of 9 answers. After, yes in 3 of 18. On untouched music beside the spot, yes in 0 of 8. The listener invents things and agrees with what it is asked, so this is a hint and not a proof.
- Second pass, MEASURED by a supporting agent: the same model run again over the cleaned track finds a voice at -101.4 dB in the spot, 75.1 dB lower than the first pass, with a loudest sample of 2.2 steps of 16 bit depth.

## Spot 2: 2:34.350 to 2:40.000, the child laughing

The second way, because the first choice was not clean.

- First choice, tried and set aside: only the lead voice signal of the third model taken out. The listener still called what was left giggling in 6 of 8 answers. That lighter cut keeps the music's breathing and is kept for the ear as `audio/cleaned/proof/spot-2-after-first-choice.wav`.
- Way used: the first model's whole voice signal is subtracted from 2:34.350 to 2:39.780, faded in over its first 50 milliseconds. From 2:39.780 to 2:39.860, in a gap between two bursts of the laugh, it crosses to the third model's lead voice signal, which holds only the last burst and stops at 2:40.000. The music's own voice comes in at 2:39.88 and is in neither. The music is not faded anywhere: only the signal that is taken out is.
- The cost, MEASURED: the music has breathing of its own in this spot, and it goes with the laugh for 5.4 s. Two held notes drop by 1.6 and 1.9 dB. The spot is at -24.93 dB before and -27.07 dB after.
- Listener, asked whether it hears laughing: after, yes in 0 of 10 answers on the spot.
- Second pass, MEASURED by a supporting agent: from 2:34.35 to 2:39.75 the model finds a voice at -105.6 dB (first pass -29.3 dB). From 2:39.80 it finds a held tone near 270 Hz and a fainter one near 350 Hz, 26 to 29 dB under the music and running past 2:42. That is the music's own hum. It is left in.

## What this proves and what it does not

- Proven by measure: the length, the timing, and that nothing outside the two spots changed.
- Shown by the second pass: the model finds no voice left in either spot. The model writes its signals in steps of 16 bit depth, so "none" means under about -90 dB at the peak.
- Not proven: that an ear hears no laugh. The Builder cannot hear. The before and after clips of both spots are on the Listen part of the review page for Brandon's ear.

## The models

STATED by their packages. All three are free, were run on this machine's processor and call no paid service.

- First: Demucs 4.1.0, `htdemucs_ft`.
- Second: `model_bs_roformer_ep_317_sdr_12.9755.ckpt`, through audio-separator 0.48.0. Also the model of the second pass, which took 18 min 33 s.
- Third: `mel_band_roformer_karaoke_aufr33_viperx_sdr_10.1956.ckpt`, through audio-separator 0.48.0.

## Files for the ear and the eye

- `audio/cleaned/proof/spot-1-before.wav`, `spot-1-after.wav`: 6 s around spot 1.
- `audio/cleaned/proof/spot-2-before.wav`, `spot-2-after.wav`, `spot-2-after-first-choice.wav`: 9 s around spot 2.
- `out/stills/music/spot-1.png`, `spot-2.png`: each spot before and after, as a picture of the sound.
- `out/stills/music/spot-1-second-pass.png`, `spot-2-second-pass.png`: the voice the model finds, first pass above and second pass below.
- `audio/cleaned/proof/second-pass-levels.txt`: the levels of the second pass, window by window.
