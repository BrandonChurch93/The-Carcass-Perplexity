# The pictures of the sky

Every picture in `public/assets/reveal/sky/` is made by code in this folder. Nothing is painted and nothing is copied from a picture.

Run from the root of the repo:

```
python3 assets-src/reveal/sky/make_sky.py
```

It needs python 3 with numpy, scipy and opencv. It takes under a minute.

## `public/assets/reveal/sky/cloud-tile.jpg`, `public/assets/reveal/sky/cloud-cover.jpg`, `public/assets/reveal/sky/cyclone.jpg` and `public/assets/reveal/sky/storm.jpg`

- `cloud-tile.jpg`, 1024 x 1024, repeats. Red is the field the low cloud is cut from, made so every value is equally common: a threshold on it is a share of the sky. Green is how much each point of that field faces the sun (0.5 is level). Blue is the streaks the high cloud, the vapour and the wind on the sea are cut from.
- `cloud-cover.jpg`, 2048 x 1152, the whole world. Red is the share of low cloud, green the share of high cloud, blue the cloud banked against the ranges. It is thin over the body and clear over the head, where the rise begins.
- `cyclone.jpg`, 1024 x 1024, and `storm.jpg`, 1024 x 384. Red is how thick the cloud is, green how much it faces the sun, blue how high it stands.
  Since version 3 the place no longer reads these two: the cyclone and the storm are drawn from `public/assets/reveal/mat/cyclone.jpg` and `storm.jpg`. They are kept so this recipe still makes what it names.

### What is read as data

- `src/places/reveal/continent.json`: the traced outline of the body, to thin the cloud over it.

### How

All of it is noise shaped in the frequency plane (so the tile repeats without a seam), with the power put where cloud has it: cells a few kilometres across, drawn into streets along the wind, gathered into clumps. On the cover a few fronts are laid by hand as bent lines thousands of kilometres long, blurred and broken by the same noise: above a share of two thirds the place draws a closed deck. The cyclone is the same noise laid in a turning frame, so its bands wind into the eye. The place draws the build of the cyclone (shield, arms, eye) itself and takes only the fibres from the picture. The storm is an anvil sheet with towers along it.
