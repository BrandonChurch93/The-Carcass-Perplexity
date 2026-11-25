# The pictures of the land

Every picture in `public/assets/reveal/land/` is made by code in this folder. Nothing is painted and nothing is copied from a picture.

Run from the root of the repo:

```
python3 assets-src/reveal/land/make_land.py a b c d
```

It needs python 3 with numpy, scipy and opencv, and gcc (it compiles `erode.c` to `out/work/gen/erode` on its first run). A level is made from its parent, so make them in order. The whole run takes about ten minutes on four cores.

## `public/assets/reveal/land/ground-{a,b,c,d}.jpg` and `public/assets/reveal/land/shape-{a,b,c,d}.jpg`

Four nested rectangles of the world, each 4096 x 2304: `a` the whole body, `b` the head and shoulders, `c` the skull, `d` the lake. For each:

- `ground-<level>.jpg`: the ground's own colour, sRGB. On water it is the colour that comes back from under the surface.
- `shape-<level>.jpg`: data. Red and green are the slope of the ground on x and z (0.5 is level). Blue is a code: above 0.56 it is land and its height, below 0.44 it is water and its depth, and the coast lies at 0.5.

### What is read as data

- `src/places/reveal/continent.json`: the traced outline of the bone ranges.
- `references/approved/7-reveal/reveal-master.jpg`: only inside that outline, blurred to grey, as a guide to which ground stands high. The master is never drawn.

### How

1. The bone ranges are raised from the outline and the guide. Around them a foreland is grown with noise, so the body stands in a continent with bays, capes, islands and bars.
2. `erode.c` cuts the drainage: a priority flood, a flow down the steepest of eight neighbours, the stream power law solved implicitly, a cap on the steepest slope, and a little diffusion. It gives the branching valleys, the ridges between them, and the area drained through each point, from which the rivers are drawn.
3. Each closer level takes the heights of its parent, adds finer ground, and is eroded again at its own scale.
4. The colour is chosen by height, slope, hollows and wetness: dark lowland, tan foothills, pale rock, bone white only on the highest crests. The chest is a black crust, the throat red rock, the hips a salt pan with red brine in its channels.
5. The water is coloured by its depth over the shelf, by the silt of the rivers, by the stains that leave the salt pan, and by the lake of the Eye, which is black blue inside an amber shelf.
