# Handover: the storm side of the Spine (strikes, kites, runners), third and last owner

Owner: spine_storm_owner_3, branch `agent/spine-storm-3`, looks on `agent/spine-storm-3-looks`. Folders: `src/places/spine/strikes/`, `kites/`, `runners/`.
No picture of mine is under `public/assets`; I read from `public/assets/spine/mat/`: `bolt.jpg`, `bolt-b.jpg`, `bolt-c.jpg`, `kitefilm-a/-b` (with `-a` cut and `-h` relief), `holdfast.jpg/-h`, `lock.jpg`, `lock-b.jpg` + `lock-b-a.png`, `shag.jpg`, `burn.jpg`.
Sky, cloud sea, far spires, the glow inside the cloud and the struck spire's rock are the ground owner's. The bolt, its hot spot and bloom card, embers, emitters, flash timing and the puff source are here.

## How each part is drawn

- strike-N (`strikes/index.ts`, `bolt.ts`): one of three photographs of a stroke (`WHICH`) on a quad between cloud and tip, alpha tested. Far off: the picture's channel, thin. In a long lens (`vNear`): the channel worn down from its edges by `ringOf` to a white core inside a violet sheath, less worn over its last 16 m so it is broad at the foot (`worn`). Return strokes are uneven (`bolt.ts`: first share 1.3, later 0.45 to 0.7, gaps on whole frames, one wait). At the foot: a hot spot, a bloom card (additive, no depth write, pulled 40 m to the lens, `BLOOM_PIXELS` 380 px, `BLOOM_GLARE`), 260 orange embers that fly, fall and cool (streaks at the final tier), five rig emitters (one at the tip, `TIP_RADIUS` 8 m), and a steam source per struck tip (radius 12 m, rise 260 m; 4 m and 34 m in the long lens) that bursts in 0.04 s and thins over 6 s.
- tether-kites (`kites/index.ts`): strips flown by `uWind`, cut and coloured from two photographs of wet film (`kitefilm-a/-b`), sky seen through, oil colours by `film.z`, tails that shed wisps. Holdfasts: instanced cards of `holdfast.jpg` (husk clusters), the picture's own stalks cut off at half its width. `KNOBS_ON = false`: the second owner's modelled knobs.
- ridge-runners (`runners/`): skin per pose, coat of clumps of four lock cards. The herd inside (`uLockKind` 1) takes `lock-b.jpg`, cut by `lock-b-a.png` at 0.5 and by strand brightness, cards 0.62 as wide; the standing one pale (tone 1.75, frost 0.2), lying ones cream (tone 1.05, frost 0.02); contact discs by `ctx.rig.setDisc`; idle sway, head turn, breath, flinch at the flash. The dead one: as received, with the wound a scorch from `burn.jpg` (no hollow, no ribs), rime on paws and tendrils. `WALKERS = false`: the crossing runners (the "small upright figure" of round 15).

## Round 15 issues on these folders, and what was done (quoted, severe first)

- "the bolt is bright white, thin and branching like a stock overlay ... lights neither the cloud around it nor the spire"; "casts almost no illumination ... lacks realistic bloom"; "a stark, thin white jagged line with no bloom": violet sheath and white core, bloom card, tip emitter; the cloud glow is the ground's `strikeGlow`. Partly: the bloom is smaller than the approved one.
- "terminates in a neat white circle with straight, spiky starburst sparks ... casts no bright light onto the spire rock, snow, or streamers"; "no violet bloom on the peak, no glowing ember sparks scattering ... no fume": disc and rays removed; embers, bloom, tip light, puff. Done.
- "a small upright human figure stands at the end of a trail of footprints": walkers off. Done.
- "the interior cavity is crushed pure black with smooth, uniform cone-like ribs and disconnected fur cards": hollow and ribs removed, the wound is the photographed scorch. "rigid, glossy CG cylinders ... faceted plastic-looking cap": tendrils rimed and dulled; still tubes. Partly.
- "lack believable contact shadows and snow displacement ... no frost, wet snow, or ice crust": contact discs, frost on coats. No snow displacement (the floor is the ground's). Partly.
- Motion, "holds nearly the same head and body silhouette ... placed model": weight shift, head turn, breath, flinch. "kite ribbons retain almost the same outline": gust terms added in the long lens, tails shed wisps. "long summit streamers retain essentially the same silhouettes": gusts only; nothing tears off whole. Partly.
- Kites, "thin, flat white wisps"; "opaque white sheets with drawn veins"; "zero-thickness flat CG planes with jagged aliased edges"; "glossy plastic-wrap ribbon meshes": new technique, photographed wet film, see-through. "no violet glow or crackling arcs ... extra ribbons on the left horn and distant spires": in spine-04 only the struck spire flies; no arcs. "move as stiff sheets": the whip wave is off in the long lens, amplitude and gusts up. Partly.
- Pods, "smooth dark lumps with no frost"; "glossy bump-mapped CG blobs": replaced by photographed frosted husks. They are not animals gripping the rock. Partly.
- Dead one, "flat cards with hard jagged alpha edges, and the dark flank is a black void"; "paws look smooth and clay-like": flank is the scorch picture; cards and paws as received with more rime. Open.
- Herd, "fewer animals and they lie as flat fur mounds out in the open"; "clumpy, matted flat cards ... abrupt synthetic seam"; "poses and silhouettes barely change through the flash": new lock picture, pale coats, flinch at the flash. The staging is the received one. Partly.
- Strike rhythm, "repeats the same short on-off cadence": uneven return strokes. Done.

## Tried and did not work

- A glow card that writes depth: under open sky the air pass lays nothing over it and it shows a dark disc. Additive without depth write works.
- A solid halo round the stroke: an outline. `lock-b` with its soft cut alone: dark drawn outlines round every lock.
- Kite amplitude 0.046 of length in the long lens: serpentine with corners. Wide lens ribbons 2.8 times as broad: a clump of torn cloth. A blade five times its root: laundry. Film paler than the sky by more than 0.6: chalk.
- Close shot ribbons at 1.3 length with the rope share at 1.2: all film leaves the frame. Rope share 0.3 keeps it in.
- Halving the vertex light calls on the dead one: no saving. Runner cost is the fill of the lock cards.
- From the owner before: singed spikes over 1.55 of the burn's reach, a saturated red burn, fill light on the herd at a flash frame.

## Still wrong beside the approved pictures, worst first, by key

- spine-2: no bodies gripping the rock (husk clusters stand for them); the ribbons fill only the right 40% because the wall fills the rest of this lens; less violet than approved.
- spine-4: coats read as rows of locks close up; no claws seen; the standing one is a shaggy mound on legs.
- spine-3: bloom smaller than approved; kites pale bands, not lit violet from within; no arcs on them.
- spine-1: fur card edges and paws as received.
- spine-0: the near spire's ribbons are still many fine tails rather than a few broad ones.

## Staged by shot (`stagedSeconds()`)

- spine-04: `stage(0.17, 0.32, 2.6, 3)`: only the struck spire flies, one long veil and short ones, 55% of bare threads hidden, husks at 0.3 size, rim softened (`uVeil`), tip puff small.
- spine-02: `stage(1.0, 0.62, 0.3, 1)`: first spire's ribbons full length on short ropes, climb 0.16, 85% of bare threads hidden, `film.z` 0.42.
- spine-01: `stage(1, 1.6, 1, 1)`: bare threads hidden, 70% of ribbons under 180 m hidden.
- spine-05: the huddle is drawn and breathes only here; the standing one walks on after the key. As received: `timingOf` puts a stroke on a key frame inside a strike.

## Cost, seconds a sample at 3840 x 2160, above the empty frame

`npm run -s cost -- --key KEY --format uhd --tier draft --parts tether-kites ridge-runners strike-N`, one sample.
- spine-0 (7234): kites 0.49, strike 0.27, runners 0.00. spine-2 (7418): kites 1.93 (2.45 received), runners 0.10.
- spine-3 (7668): strike 1.03 (bloom card and the worn channel), kites 0.19. spine-4 (8090): runners 2.53 (4.75 at my version 2), kites 0.12.
- spine-1 (7579): runners SPINE1, kites 0.06.
- Saved in runners: locks facing away from the lens not drawn, one light call per lock vertex inside, 420 clumps for 520 in the herd and 1400 for 1700 on the dead one, one laying of the hide picture inside, no second light call for a dry coat.
- My share is 2 of the place's 7: spine-4 and spine-1 are over it.
Checks at the last commit: tsc clean, build, `determinism: pass`, gate G10 pass, measures green at draft.

## What I would do next, in order

1. Bodies at the holdfasts in spine-2: a dark many-legged body per cord, seated from the rock's surface.
2. Lock cards: draw the herd's coat in two passes (depth first) or sort clumps front to back; the fill is the cost.
3. Kites lit violet from within near the bolt (`struck` already carries spire and power), and arcs along the cords.
4. The dead one's paws and coat edge from a photograph, as the herd's coat was.
