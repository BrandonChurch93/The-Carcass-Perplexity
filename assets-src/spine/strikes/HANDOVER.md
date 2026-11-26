# Handover: the storm side of the Spine (strikes, kites, runners)

Owner: spine_storm_owner, branch `agent/spine-storm`. Folders: `src/places/spine/strikes/`, `kites/`, `runners/`.
No picture of mine is under `public/assets`; the runners read `mat/shag.jpg` and `mat/shag-nh.png` from main.
All looks were at the draft tier, 3840 x 2160, one sample. The final tier was never rendered by me.

## How each part is drawn

- strike-N (`strikes/index.ts`, `bolt.ts`, `where.ts`): a channel grown by a seeded walk from the cloud to 5.5 m under `tipOf()`, drawn as
  camera-facing ribbons: violet-white core, violet skirt, tapering branches; a hot spot and 800 sparks (drag, gravity, gale); two rig emitters.
- Strike timing (`bolt.ts`): a leader, then 2 or 3 strokes 30 to 60 ms apart, each on a way of its own (`moved` in the vertex shader,
  `strokeAt`), nothing left of the channel a frame after each. Steam is pushed to `ctx.sources.steam`. No picture used.
- tether-kites (`kites/index.ts`): colonies of membranes on sinew cords from holdfasts in the lee of each tip, flown by `uWind`;
  near ones welted, veined, holed; beyond 200 to 450 m they stand on edge with dark hems and cords at least 1.7 px. No picture used.
- ridge-runners (`runners/shape.ts`, `material.ts`, `index.ts`): a hide of tubes on six rigid bones, 5,000 to 110,000 instanced locks rooted
  on it, a beard of tendril tubes; hide colour and slope from the shag picture at 0.8 m and 0.29 m; walk, stand, lie and dead poses.
- Scorch (`runners/scorch.ts`): one decal 11 m square under the dead one: burned rock, a refrozen melt ring with its own shine, at `LIES_AT`.

## Tried and did not work

- Blended or additive materials for bolt, glow, kites: they vanish under the air pass, which composites by depth. Everything of mine is
  solid with pixels left out by a moving pattern (`ditherAt`, `glowOut`). At draft this shows as a screen door; samples average it.
- Hide drawn single-sided: it was inside out all session and showed as bare grey patches. It is `DoubleSide` with the normal turned.
- Dead one rolled 1.3 (belly to the lens, reads as two heaps) and rolled negative (back to the lens, wound hidden). 0.45 is right.
- Legs thrown straight at the lens as rigid bones: the soles show as discs. Fixed by a bend at the hock in the vertex shader (`hockAt`).
- Leg locks twice as long (hay bale). Long straight locks with coat scale above 1 on the herd (haystacks).
- Lying forelegs made by shearing and squashing the leg (a flat broom). They are now rotated forward about the hip.
- Leaving out three locks in four where seen square on: at native size the hide shows as smooth plaster. It is now two in five.
- A wide soft halo round the hot spot: the lead asked for a small core, and the wide one read as a ball.

## Still wrong beside the approved pictures, worst first

- spine-1: the body is a tall mound, not long and low; legs are thick stumps and the paws and claws are in the ground haze; no head reads;
  the coat is fine even plush, not long clumped locks with rime; tendrils lie flat like roots, they do not arch and curl.
- spine-1: the wet dark rock and refrozen ice of the scorch are under the lead's ground haze in the lower third and hardly show.
- spine-4: lying ones are mounds with one foreleg out and a dark sole at its end; no heads or beards read on them; none lies curled against
  another; a thin frost on the backs, not packed snow; the standing one's legs are straight posts (no elbows or hocks).
- spine-3: one broad kite ribbon, not 2 to 4 of different lengths; no lit steam at the tip (the air must draw it from `ctx.sources`);
  the flash lights cloud and ridge evenly violet, the picture has it fall off down the rock.
- spine-0: the crossing runners are about 25 px wide on the trail and barely read; far cords read as dark dashes.
- spine-2: kites are paler and flatter than the glassy violet films of the picture; no light comes through them.
- Everywhere: screen-door grain on kites and bolt at draft; legs are one rigid bone each.

## Round 9 (judged on version 2): closed, tried, not reached

- Closed, I think: bolt locked on one path and pulsing for 12 frames (now 2 or 3 short strokes, each moved, gone in about 7 frames);
  "lights nothing" (`CAST` 520 to 2600: cloud, ridge and snow flash violet); second white bolt at spine-3 (the fork is now a faint thread);
  sparks hanging over a second (life 0.25 to 0.8 s, more gale); eye-like mark in the canal (it was the dark sole of a lying foreleg,
  now the paw lies flat); hole in the dead one's body (the inside-out hide); frozen herd (breath, neck and weight shifts 2 to 3 times larger).
- Tried, partly there: clumped frosted coat (dark roots, guard locks one in seven with rime ends, frost on backs); the dead one's weight
  and pose (hock bend, legs apart). Both still read as a model beside the pictures.
- Not reached: kites (even lilac, dotted edges, even tassels, too soft at spine-2 on measure M3, no change of shape downwind);
  the herd's place in the canal (standing one left of the mouth and backlit, resting ones staggered back); feet wet in the water;
  dotted pattern on sparks; fur sharpness on M3 at spine-4; the dead one reframed to the right edge.

## Staged by shot

- The canal huddle is drawn only when `stagedSeconds() > INSIDE_FROM`; the crossing runners only before it.
- Huddle index 0 stands in the mouth at key spine-4 and walks off after `CANAL_KEY_AT`.
- `timingOf` moves the nearest stroke onto any key frame inside a strike's flicker, so keys 7234 and 7668 show a return stroke.
- By lens, not by shot: far kites stand on edge and darken with distance from the camera; locks shorten where seen square on.

## Cost, seconds a sample at 3840 x 2160

`npm run -s cost -- --key spine-0 --format uhd --tier draft --parts tether-kites ridge-runners strike-2`, above the empty frame (1.80 s):
ridge-runners 0.49, tether-kites 0.20, strike-2 0.00 (under the noise). Mine together 0.69 of an aim of 2. The whole frame is 10.08 s,
over the 7 s gate; the rest is the ground and the air. Not measured: the dead one close up at spine-1 (110,000 locks).

## What I would do next, in order

1. Give legs a second bone (knee and hock) in `shape.ts` and `BONES_GLSL`; then pose the dead one long and low with paws flat.
2. A head: a low skull shape on the neck bone with the beard rooted round a mouth, so the lying ones read as animals.
3. Clump the locks: root several locks on one seed and lean them together; rime as beads on the clump ends.
4. Ask the air for a clear floor at spine-1, so the scorch and paws show, and for violet cloud light and steam from `ctx.sources`.
5. Kites at spine-3: split the one sheet into three ribbons of different length; let the rig's light through the film.
6. Tendrils of the dead one: root them in an arc that rises from the face and curls down, thicker at the root.
7. Check the final tier: whether the left-out pixels average to clean edges at the film's sample count.
