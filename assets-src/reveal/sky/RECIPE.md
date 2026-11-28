# The pictures of the sky

Every picture in `public/assets/reveal/sky/` is made by code in this folder. Nothing is painted and nothing is copied from a picture.
The cloud itself is photographs: the tiles and plates of `public/assets/reveal/mat/` (recipe in `assets-src/reveal/mat/RECIPE.md`).

Run from the root of the repo:

```
python3 assets-src/reveal/sky/make_sky.py
python3 assets-src/reveal/sky/make_cover.py
python3 assets-src/reveal/sky/make_banks.py
```

They need python 3 with numpy, scipy, opencv and Pillow. Each takes under a minute.

## `public/assets/reveal/sky/cloud-tile.jpg`

Made by `make_sky.py`. 1024 x 1024, repeats. Noise shaped in the frequency plane, so the tile has no seam. The place reads blue (slow clumps: where a
field of cloud has grown, how the sea is ruffled, how a trail of vapour bends) and red and green (a slow bend for the tops of the storm).

## `public/assets/reveal/sky/cover.png`

Made by `make_cover.py`. 2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts` (px of the master: x -900 to 7600,
y -820 to 3961.25). Where the weather stands:

- red: the cloud that other land and the ice hold, set by `make_weather.py` after `make_cover.py` has run (see `weather.png` below):
  a deck over the ice edge, banks on the coast that faces the wind, streets off the far coast in its lee, cumulus against the
  islands and a wake behind each; none over the land itself, none within 1150 px of the cyclone's eye and none in the glare of
  the sun's image (1300 px round master 5875, 703). Read by `lowAmount` of `src/places/reveal/shared/weather.ts`. (Before 2026-11-28 it held two
  fronts from the plate `mat/front.jpg`, which the place had stopped reading.)
- green: how much of the low field of small cloud has grown at a point: full over the open sea, thin over the land, clumped, cleared round the cyclone.
- blue: the cyclone and the storm on the spine (`mat/cyclone.jpg`, `mat/storm.jpg` laid on the rectangles where `sky/index.ts` draws their sheets:
  the storm's is 512 x 160 px of the master, 40 px west of its mark), which do not drift. It is the shade they throw, read soft.

### What is read as data

- `public/assets/reveal/maps/map-a-h.png`: the height of the land, to thin the low cloud over it.
- `public/assets/reveal/mat/front.jpg`, `cyclone.jpg`, `storm.jpg`: the plates, for their shade.

## `public/assets/reveal/sky/weather.png`

Made by: `assets-src/reveal/sky/make_weather.py` (Python 3 with numpy, scipy and Pillow), committed here
From: seeded noise and the place of the far low; the body's outline from `public/assets/reveal/land/relief-a.png` (blue over 0.28, read only) and the ocean builder's mask of other land and ice, `assets-src/reveal/land/ocean/ocean-mask.png`, read and never copied, as it stands at commit 0581336 of the unit branch (the same mask sets the red of `cover.png`)
Prompt or command: `python3 assets-src/reveal/sky/make_weather.py [mask]`, from the root of the repo, after `make_cover.py` (the mask is the repo's own unless one is named; what is committed was made with the repo's own, as at 0581336); `STORMS=1` or `2` before it sets how many storms the sea holds (2 is what is committed); no model and no prompt; the only noise is of fixed seeds
Takes: 12 made (an even field of small cumulus; clusters with lanes; the comma of the far low with its dry slot and open cells; decks kept away from the body; then, after the lead's word that small marks read as an even speckle at 960 x 540, large patches with clear sea between; fewer of them; a third small storm; its arms left whole; the banks of the far coast thinner; then, after the ruling that only a crisp storm reads as weather, the painted front and the third storm taken out, the far low moved to open sea and the map cleared over the body's outline and the other land; then the far low moved again, to open sea south of the ribs, the map's border left clear and the sun's glare cleared; then, after the lead's word that the open sea stood barer than the approved picture of the titan, more patches and smaller, and the water of the other land kept clear less widely than the body's); the twelfth is kept
Why this one: at 960 x 540 the open sea holds white banks on every side of the body, in the channels and off the coasts, with two storms and clear water between, and nothing of the map is over the body's outline or the other land
Date: 2026-11-28

1024 x 576, on the rectangle `WEATHER_RECT` of `src/places/reveal/shared/weather.ts` (px of the master: x -2600 to 8200, y -1400 to 4675).
The weather systems as they stand at the titan frame; they travel slowly down the wind and the cloud streams through them faster.
The map is read from orbit only: below it, through the rise, the low field is the start's own (`weatherNow` of `shared/weather.ts`).
Used by: `src/places/reveal/shared/weather.ts` (`lowDepth`), read by the part `reveal/cloud` and by the shade on the land.

- red: how much low cloud a system holds: 0 clear sea, about 0.5 broken cumulus at the edge of a patch, 1 the heart of a patch.
- green: how much thin veil the wind draws out there.
- blue: the kind: 0.5 cumulus in chains, 1 a patch with a body (closed cells).

The systems: patches over the open sea, none over the body's outline nor over the other land (clear wherever land will be
under the map as it travels, 95 px at the most, and a little wider round the body than round the other land); clear water round the far low (`LOW2`, px 1750, 2800), which is drawn by its own
sheet (`OTHER_STORMS` of `shared/weather.ts`, the cyclone's fragment in `sky/index.ts`); clear water 1150 to 1750 px round the cyclone; clear sea at the map's border and in the sun's glare (1300 to 2000 px round px 5875, 703).

The same script sets the red of `cover.png` (above); its green and blue are unchanged to the last bit.

### What is read as data

- `assets-src/reveal/land/ocean/ocean-mask.png` (the ocean builder's): red other land, green ice.

## `public/assets/reveal/sky/banks.png`

Made by: `assets-src/reveal/sky/make_banks.py` (Python 3 with numpy, scipy and Pillow), committed here
From: `public/assets/reveal/land/relief-a.png` (blue: the height of the land on its widest map)
Prompt or command: `python3 assets-src/reveal/sky/make_banks.py`, from the root of the repo (it keeps the red and the green of the file that is there and writes the blue; `ALL=1` before it computes all three again); no model and no prompt; the only noise is of a fixed seed
Takes: 12 made (the twelfth keeps the red and the green of the eleventh to the last bit and writes the crests of the ranges in the blue; the eleventh is the tenth's script run again on the land's relief of its second version in this wave, nothing else changed; three in the first wave; in the second: the deck and the pools as lines, which read as white sausages; the pools as patches filled to a level; the ice in wide swaths; the ice in narrow swaths; no pools on the coasts and a deck broken finer, which left almost no deck; two more for how full the deck stands); the twelfth is kept
Why this one: the deck stands at the level where the place draws scattered cells, closing to clumps in its middle, so no patch ends on its outline; the stratus is pooled inland only; the blue lets the place keep a bank off the pale crests from orbit, so no white puff sits on a white bone
Date: 2026-11-28

2048 x 1152, on the rectangle `COVER_RECT` of `src/places/reveal/shared/weather.ts`, the same as `cover.png`.
Where the land holds cloud: computed from the relief, with a few patches placed by the map of the land (px of the master, listed in the script).
Used by: `src/places/reveal/shared/weather.ts` (`bankDepth`, `fogDepth`), read by the part `reveal/cloud` and by the shade on the land.

- red: banks. The rise of the ground along the wind of the low field, read at the size of a whole range (60 km): cloud piles on the
  flank that faces the wind. With it a broken middle deck in six patches: across the second lake of the skull massif, along the jaw
  coast, across a few of the upper and of the lower ribs, and two on the far body. A patch is never full: it stands at the level
  at which the place draws scattered cells, and closes into clumps only in its middle.
- green: stratus. The floors that lie under the ground round them (15 km), and pools well inland broken by a swell. The place
  fills each pool to a low level against the land's own relief (`land/relief-a.png`, read only), so only the valley floors
  fill and the edge of the stratus is the branching of the valley it lies in.
- blue: crests. The pale bone of each range, where it stands over the ground round it (40 km). From orbit `bankDepth` keeps a
  bank off them; below orbit the channel is not used.
  (Up to the third wave this channel held swaths of ice, and before that a pooled haze, that nothing read.)

### What is read as data

- `public/assets/reveal/land/relief-a.png`, blue: the height of the land on its widest map.

## `public/assets/reveal/mat/cyclone-wide.jpg`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a plate, 1254 by 1254 px, 2,500 km across: a cyclone seen straight down, many thin beaded arms round a small eye, on black sea.
Used by: `src/places/reveal/sky/index.ts`, the part `reveal/cyclone`.
Date: 2026-11-26

## `public/assets/reveal/mat/specks.jpg` and `public/assets/reveal/mat/specks-nh.png`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a tile, 1,500 km a repeat: fields of very small cumulus in beaded streets on black sea, and its relief.
Used by: `src/places/reveal/shared/weather.ts`, the low cloud seen from orbit.
Date: 2026-11-26

## `public/assets/reveal/mat/seacloud.jpg`

Made by: the Builder, with the image model, on the request of `reveal_owner_3` (wave 3). Sent as `reveal-mats-w3.tgz` and unpacked here unchanged.
What it is: a plate, 1672 by 941 px, 6,000 km wide: a deck of sea cloud, thin on the left and dense on the right, on black sea.
Date: 2026-11-26
