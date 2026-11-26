# The Breath: sea, gill-plumes, waders, dead-wader. Hand-over after version 3 (wave 2)

Owner until 05:05 UTC, 26 November 2026: breath_life_owner_2, branch `agent/breath-life-2`. Folders under `src/places/breath/`:
`water/`, `plumes/`, `waders/`, `dead/`. Pictures of mine: `public/assets/breath/{plumes,dead}/`, recipes under `assets-src/breath/`.

## What is drawn, part by part
- waders (`waders/body.ts`, `animal.ts`, `herd.ts`, `material.ts`, `index.ts`): one skin, a distance field over the bones meshed once, so
  hips, haunches and knees grow out of the trunk. `mat/wader.jpg` is laid on the skin (`aPic`, `aLimb`; boxes `PIC_TRUNK`, `PIC_LEGS`,
  `PIC_NECK`). Slim S neck (`neckR`, `NECK_DOWN`), warm rim light, mop of 260 strands in 12 pointed locks, hidden beyond 60 m.
- dead-wader (`dead/index.ts`, `ground.ts`, `flies.ts`): `mat/carcass-low.jpg`, each pixel set on its ray from the breath-05 key lens
  (`LENS`) and lifted by `dead/carcass-low-lift.png`; stain, salt line, grit, 46 flies; the loose ends of its tendrils stir (`uStir`).
- gill-plumes (`plumes/cards.ts`, `shaders.ts`, `index.ts`): each bush 3 to 5 crossed sheets of a spray cut from `mat/plume.jpg`
  (`plumes/spray.jpg` colour bled outward, `plumes/spray-a.png` a distance to the thread's edge, cut at 0.5: smooth at any size). Sprays
  of unlike length all leaning one way, one dead and brown; backlight through the thin ends; drips from tips; 16 low fills along the rim.
- sea (`water/shaders.ts`, `maps.ts`, `index.ts`): one sheet; glass between gusts that cross it at wind pace and darken it; mirror of the
  sky greyed, land mirrored by a four step march, waders mirrored from a small target, rings only where a leg or tendril enters, gold glare.

## Honest comparison, worst first
1. breath-3 plume: still a feather duster beside the picture's long drooping fronds on dark stems; vapour stands in front of bush 0, not
   behind (the lead's volume). Mean of the threads by number: picture 95 54 44, mine 98 54 42; the shape is what is wrong.
   The low fills (up to 30) along the rim are hidden behind the lip's plates from the wide key: raise them or move them out (`plumes/index.ts`).
2. breath-1: hero stands whole, the picture cuts it by the left edge; no foot lifted with water streaming; tassel does not fan on the water.
3. breath-0: near herd reads pale and small; upper channel warmer and darker than the picture (130 113 101 against 146 137 125).
4. breath-2: plumes and rim wader stand further back than in the picture (anchors); the pad under the dead one is dark tiled rock.

## Round 8, severe and major, word for word, and what was done
- "smooth bulbous brown-mottled oval torsos on rigid pipe-like legs with coarse reddish-brown tube tendrils": closed by my eye: one
  skin with the wader picture on it, ribs, hips, swollen knees, pale locks. "stands on all four legs instead of lifting one foot": open.
- "the stream is overcrowded with stiff reddish-brown models bearing clumpy dark-red matted head tendrils": herd scattered in ones and
  twos by the lead's new NEAR_WADERS; pale skin; mops pale. Water highlights softened.
- "bright airborne splash droplets and wet glistening leg ripples ... completely missing ... jagged aliasing": rings and a crown of drops
  at each entering leg, leg mirrored; strands narrowed and filtered. Splash is small beside the picture: tried, not closed.
- "a stiff inflated lumpy sack ... straight rigid stick legs": closed: the dead one is the picture `carcass-low` itself, on rays.
- "smooth dark-mottled oval body on overly long straight pipe-like legs ... over the black pit" (rim wader): same new skin; closed in part.
- "dry, opaque palm-like fronds shifted to the upper-left, plus two extra silhouetted bushes": sprays from the plume picture, backlit,
  drops; tried, not closed (see 1). "the tall, pale, long-necked stilt creature ... completely absent": MIST_WADER stands there, too large.
- "a single large, stiff, unnaturally smooth pale grey creature stands right beside the rim" (breath-4): rim wader staged away in
  breath-02 (to -58, -98) and to MIST_WADER in breath-03; small far ones on the flats. "sharp, dry red palm-like shrub": new sprays.
- "sparse, bright-red spiky fronds sticking straight up" and "tall, bright-red palm-like bush": darker, lower fills along the rim; partly.
- "heavy speckled, dithered alpha-clipping noise" and "harsh pale speckles and clipped-looking edges": closed: distance cover, no dither.
- "scattered short white vertical rain streaks": closed: drops hang at tips and fall under 0.6 s.
- "copies of one rigid model; the closest legs end abruptly in the surface": builds differ in size and pose; legs mirrored and ringed.
- "cylindrical legs appear to slot into the body beneath an abrupt overhanging shell": closed: one skin.
- "skin detail stretches into parallel ridges along the bend" (dead neck): closed: the picture's own neck.
- "all three are locked in the same head-down feeding pose": `UP` spans in `herd.ts` stagger them; far herd still slow: partly.
- "it stays perfectly rigid ... nothing around it ... tells us so": stain, salt, grit, flies, stirring tendrils; reads dead.
- "small figures hardly change position or pose across 6 s": not closed; speeds are the lead's anchors, lowered so they keep their ground.
- "fronds are almost static": sway in travelling gusts, never in step, plus the rise of warm air past the lip.

## Measures and cost
- M2 (share of pixels moving over 4 of 255 in one second, from `--diag motion` at hd, my own count): frame 4409 28.8%, frame 5510
  28.7%, with the lead's cloud shade and vapour merged. My parts alone gave 9.8% and 6.6% before that merge (water 7.4 at 4409).
- Cost at uhd, one sample, above the empty frame (`npm run -s cost`, key breath-0): sea 0.74, gill-plumes 0.23, waders 0.20,
  dead-wader 0.00: 1.17 s of an aim of 2. Looks used of 40 a part: plumes 27, sea 21, waders 18, dead 11.

## Staged (by shot, never by clock)
`WADE` 0.14 and `AHEAD` 0.14 (stride), `UP` spans in `herd.ts`; the rim wader by shot (`waders/index.ts`: breath-02 away, breath-03 at
MIST_WADER, else the rim); dead `LENS` (a copy of the breath-05 key lens: if that camera moves, move it); `WIDE` 5.5, `TALL` 3.096.

## Do not try twice
- Ribs as sinusoid or anisotropic noise (stripes); skin relief over 0.004 (moire); fog fill under 0.3 (black silhouettes); mop strands
  thicker than 1 (sausages); drops falling longer than 0.6 s (rain); sea colour from the perturbed normal (noise); base wave map scaled up
  near the lens (lattice); a soft mask for the plume cover (steps at uhd); filling the plume's heart solid (a ball); body colour of the
  water in teal (a lagoon): it is a warm grey silt, `vec3(0.3, 0.29, 0.255)`.
- AgX washes pale gold to white; the reliefs of the working pictures lie on black: use them for form, not for slopes.

## Next, in order
1. Plume: fewer, longer sprays on visible dark stems (cut single fronds from the picture, not the whole spray); vapour behind bush 0.
2. Lifted foot with a stream (the lift is lost in the leg solve of `pose()`); tassel that fans on the surface.
3. Far herd milling; hero of breath-1 cut by the frame edge (camera is the lead's).
