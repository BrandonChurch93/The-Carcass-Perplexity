# Handover: the storm side of the Spine (strikes, kites, runners), second owner

Owner: spine_storm_owner_2, branch `agent/spine-storm-2`, looks on `agent/spine-storm-2-looks`. Folders: `src/places/spine/strikes/`, `kites/`, `runners/`.
No picture of mine is under `public/assets`; I read `mat/bolt.jpg`, `membrane.jpg`, `membrane-h.png`, `shag.jpg`, `shag-nh.png`, `lock.jpg`, `burn.jpg` from main.
All looks were at the draft tier, 3840 x 2160, one sample. The final tier was never rendered by me.

## How each part is drawn

- strike-N (`strikes/index.ts`, `bolt.ts`, `where.ts`): the stroke is `mat/bolt.jpg` on a quad stood between cloud and tip, turned to the lens, alpha tested (core and near branches kept, the picture's glow left out), flipped and bent per return stroke; three strokes in nine frames, gone after; a hot spot of 15 m and 140 sparks at the tip; four rig emitters (channel, cloud top, two along the stroke) with a tail of half a second; one steam source per tip.
- tether-kites (`kites/index.ts`): each a strip of 80 by 4 flown by `uWind`, cut by alpha test from `mat/membrane.jpg`: a cord for the stalk, widest a third of the way out, drawn down to a thread, torn tail of threads. Colour is the sky behind it, taken to lilac-grey, plus the light it holds; drawn veins; darker on the side away from the sky and where it is edge on; a wet line on the leading edge; at a strike it glows along its edges. Holdfasts: nine noise-bulged knobs per cord.
- ridge-runners (`runners/skin.ts`, `material.ts`, `index.ts`): one skin per pose (surface nets over a field of the pose's shapes, 12 bones), a coat of clumps of four lock cards from `mat/lock.jpg` rooted on it, horn claws, a beard of tendril tubes. Coat `hang` makes resting ones' locks fall to the floor. Inside the canal the light is the lead's window form from both mouths, warmed, with a rim against the far mouth. The dead one: 1700 clumps, burn from `mat/burn.jpg` taken to char, a torn hollow with rib ends in the skin shader, singed spikes and a ring of rime round it.

## Round 9 issues on these folders, and what was done (quoted, severe first)

- strikes, severe: "The bolt is a large near-white graphic from high in frame with a bright impact spark"; "Two large nearly white bolts, one across the middle of the image"; "a pure white bolt that lights nothing". Done: new technique, the photograph of a stroke, thin, one per strike, the fork a faint thread; emitters light spire, snow and kites. Builder: "The bolt is right."
- strikes, severe: "lightning bolts stay locked on the same jagged path for 12 or more consecutive frames and pulse brighter on a mechanical 4-to-5-frame cycle"; "the bolts pulse mechanically every three to five frames along the same pinned paths". Done: three return strokes within nine frames (7665 to 7671 at spine-3), each mirrored and bent another way, dark between them.
- strikes, severe: "lightning strikes emit only a local halo around the bolt and do not illuminate the surrounding ridge, clouds, or cave interior"; major: "bright bolt and spark burst light nothing around them". Done for rock, snow, kites and herd (flash through the far mouth). Cloud glow is the lead's from `ctx.rig.emitters`: not there yet.
- strikes, severe: "A sharply visible branching bolt and angular gray cloud bands take the place of the purple glow behind cloud". Bolt thinner; the cloud is the lead's. Open.
- strikes, major: "particles show a regular dotted pattern in the sky"; "sparks from the strike hang around the spire tip for over a second". Done: no dither anywhere, sparks solid, short lived, carried off by the gale.
- kites, severe: "the plumes read as flat glossy ribbons with banded lines and holes, like extruded plastic". New technique (picture cut, sky seen through). Builder at 03:57 read the near ones as "crumpled grey paper"; since then creases and stains are weaker and the near ones narrower. Not judged yet.
- kites, major: "Dense, parallel nearly uniform lilac ribbon stacks"; "The membranes are crowded, evenly lavender and visibly grid-like with regular tears"; "opaque, pale, outlined tangles repeated on multiple peaks". Done: few colonies, lengths 70 to 260 m, each its own cut of the picture; far peaks one or none.
- kites, major: "a flat, semi-transparent lilac ribbon whose edges break into a regular dotted halftone or screen-door pattern". Done: alpha test, no dither.
- kites, major: "identical tassels hang at a perfectly even spacing along every cord"; "thin black lines and stair-step dark bands read as geometry seams and wire meshes". Done: tassels removed; cords are dark sinew with uneven rime beads.
- kites, major: "Most lines disappear behind the wall edge, with only small rounded bumps visible". Done: on the first spire the holdfasts sit on the lens side of the edge (8 m clumps of dark knobs), stalks short, so cord and film are in frame at spine-2.
- kites, major: "the vapour plumes hold a rigid horizontal envelope and ripple like flat textured ribbons"; "the wisps undulate in place over six seconds without detaching". Partly: one slow travelling wave, a roll that travels, gusts. Nothing detaches. Open.
- herd, severe: "The standing animal sits farther right and lower and lacks the bright backlit silhouette at the threshold; the group reads as a few low, overlapping forms crowded into the near left". Done: six against the left wall from 4.4 to 9.7 m past the key, two heads up, one standing 10 m on at the mouth, legs seen.
- herd, severe: "they look like smooth models wrapped in stiff fur cards ... the near ones float over the water"; major: "The coats are uniformly dark, dry and finely brushed". New technique: skin per pose, clumped locks hanging to the floor, cream, rime on backs. Builder at 03:57: "four pale mounds". Partly.
- herd, severe: "the three herd animals on the left remain completely motionless"; "the animals are completely frozen". Done: breath in chest and flank, neck and head swing, weight shifts, a flinch and a turn of the head at each flash, coat stirred.
- herd, major: "a round dark eye-like shape with a dotted pattern shows on the animal". Done: no sole or disc faces the lens; no dither.
- dead one, severe: "The body sits wholly in frame as rounded dry-looking tufts, with little sense of weight or frozen buildup"; "the fur is stiff straight cards and spikes all combed the same way, so it reads as a model ... a hollow grey hole in the body where the fur cards stop on a hard edge". Done: on its side, legs to the lens, lying on the land's slope, rime and snow on coat and paws, burn charred with a torn hollow and rib ends. Builder: "It reads as a carcass."
- dead one, major: "flat opaque spike and plaque-like shapes interrupt the coat"; "the logs sit on it as flat strips with no contact or shadow"; "without stirring its fur". Done: spikes only round the burn; tendrils a third as thick and flat on the snow; the coat is blown.

## Tried and did not work

- Additive or blended glow (bolt halo, cloud halo): gone under the air pass. Left in the code hidden; delete it.
- A solid halo round the stroke (the picture blurred by `textureLod`, drawn where brighter than `skyRadiance`): the drawn cloud is not `skyRadiance`, so the cut shows as an outline, a tube or a slug. Reverted. It needs the air pass, or the true sky behind.
- Kite blade five times its width at the root (version 2): read as sheets and laundry. Colour paler than the sky by more than 0.6 of held light: chalk.
- Singed spikes over more than 1.55 of the burn's reach: a hedgehog. A saturated red burn: read as paint.
- Rib ends laid out by the body's up axis: the lens sees the belly, so they ran the whole hollow as stripes. They are laid round the body now (`q`).
- Fill light on the herd at the spine-4 key: the key is a flash frame and the flash swamps it; judge the herd on frames 8000 to 8080 as well.

## Still wrong beside the approved pictures, worst first

- spine-3: no glow in the cloud round the stroke and the sky is one wash (lead's cloud); my bolt has no bloom of its own.
- spine-2: the film is still a cut of one picture, not lit from behind as the approved one is; nothing tears off.
- spine-4: resting ones read as mounds, heads small and dark; the standing one is whole but stands against rock, not sky. Breath: three sources of 0.2 m, drawn by the air since the lead's aa5610c.
- spine-1: no prints lead in to the dead one (asked at 04:27, not begun); the motion measure was 10.22% on version 2; the coat is blown harder since (`dead.coat` 0.75), not measured again. Wet rock and drifts are the lead's (aa5610c).

## Staged by shot

- The huddle is drawn only when `stagedSeconds() > INSIDE_FROM` (shot spine-05); the four crossing runners only before it.
- Huddle 0 stands at the mouth and walks on after `CANAL_KEY_AT`. Breath sources carry strength only inside spine-05.
- `timingOf` puts a stroke on a key frame that falls inside a strike. Kite holdfasts of the first spire sit on the side of key spine-2's lens.
- By lens, not by shot: far kites stand on edge; outline locks of the dead one stand clear of the rime.

## Cost, seconds a sample at 3840 x 2160, above the empty frame

`npm run -s cost -- --key KEY --format uhd --tier draft --parts tether-kites ridge-runners strike-2`, one sample, draft tier, at 04:26.
- spine-0 (7234): strike 0.08, kites 0.07, runners 0.00. spine-2 (7418): kites 0.74, runners 0.02.
- spine-1 (7579): runners 2.34 (the dead one, 1700 clumps), kites 0.04. spine-4 (8090): runners 1.93, kites 0.08.
- My share is 2 of the place's 7: spine-1 is 0.38 over it. Cut the dead one to 1400 clumps if the total is short.
Checks at the last commit: tsc clean, build, `determinism: pass`, gate G10 pass.

## What I would do next, in order

1. With the lead: cloud glow round the stroke from the four emitters (he has them; the look of 04:17 shows none yet).
2. Kites: a second, narrower cut of the membrane for the near ones; let pieces tear off and travel downwind.
3. Herd: a real head shape with the beard hung from it, raised on two more; hooves on the standing one.
4. Holdfasts on the other spires: seat them from the rock's own surface (ask the lead for a point and normal on the fin face).
5. Remove the hidden channel, arc and halo meshes and `ditherAt` from `strikes/index.ts`.
