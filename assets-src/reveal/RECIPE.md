# Recipes of the reveal

## `src/places/reveal/continent.json`

Made by: `tools/trace.mjs` with `tools/lib/trace-core.mjs`, run as `npm run trace`, on Node with the `sharp` of `package-lock.json`.
From: `references/approved/7-reveal/reveal-master.jpg`
Prompt or command: `npm run trace`

What the command does, with the numbers it holds in `RECIPE` at the top of `tools/trace.mjs` and writes into the file it makes:

1. The master is reduced to 1488 px wide.
2. Two measures are taken for every pixel and smoothed by 1.2 px: its light, and how warm it is, as red less blue over the sum of red, green and blue.
3. A pixel is land where it is warmer than -0.03 and lighter than 38 of 255. Inside the sunglint, an ellipse about 99 percent across and 36 percent down the master, it is land where it is 0.02 warmer than its surroundings within 30 px and lighter than 60.
4. The cyclone at the lower right is left out with one hand drawn outline, `skip`.
5. The land is grown by 12 px and only the patches that hold one of fourteen named points on the body are kept, `seeds`. This drops cloud that passed step 3.
6. The edge between land and sea is followed between pixel centres, thinned to within 0.3 px, and nested: every piece of land with the seas inside it. Land under 40 px and seas under 8 px are dropped.
7. The edge of the planet is found down each fourth column of the left 36 percent of the master, as the first pixel lighter than 10, and a circle is fitted to those points.

Takes: 3 runs with different numbers, the third kept.
Why this one: it follows the body and leaves out the cyclone and the cloud at the right, which the first two did not.
Date: 2026-11-25

The command also writes `out/work/trace/overlay.jpg`, the outline laid over the master, to look at. That file is not kept.

The file is a stand-in for the blockout. It is the outline only: no picture of the master is drawn from it.
