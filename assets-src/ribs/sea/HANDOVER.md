# Hand-over: the sea side of the Ribs

Owner until 2026-11-26 08:46 UTC: `ribs_sea_owner_3` (wave 3, the last owner). Branch `agent/ribs-sea-3`. Folders `src/places/ribs/sea/`, `wings/`, `drowned/`. Partner and lead: `agent/ribs-ground-3` (land, air, cameras, `shared/`). Every height, time and place is read from `shared/anchors.ts`. The water split: the lead keeps the bed, bars, stones, weed and the blade mirrors; this side keeps the film at `LEVELS.pool` (`runnels`), the open sea, the bore and every animal.

## How each part is drawn

- `sea`, `surf` (`sea/index.ts`, `sea/shaders.ts`, `sea/spray.ts`): one displaced sheet of swell at `LEVELS.sea`, calm only in the last 4.5 m of depth (`calm`), whitecaps from the foam picture (`fresh`), streaks down the wind, `rigShade`.
- `runnels` (`POOL_FRAGMENT`): one film over the lead's bed. Every picture read stands outside any `if`, the discard is at the end. Ripples from two pictures, strong only in the wind's paws (`paw`, `ruffle`), which also read dark; near the lens the fresnel is cut so the bed shows; sparkle and glare path; bars of wet sand; rings (ribs-04 only); the bore's wall stands in the mirror. Before the bore (one branch, no picture read in it) the ripples are pulled toward it and the level falls (`drawn`); under the wall the flat is a wet film in bands (`under`, `film`) with a bright path down the gate axis (`lane`).
- `bore` (`sea/bore.ts`): a moving front that carries `mat/borewall-c.jpg` as a wall with a face (`WALL_B`: foot, crest; its height varies along the wall, low on the left, rearing toward the right stack). Top and thrown sheet are torn by the foam picture (`torn`, `lumps`), no outline. A swell 15 m ahead lifts the water (`SWELL`, `swellAt`). Veil, plume, lip, foot and burst cards; `gust(x)` makes stretches that explode and stretches already spent; `lee()` and `thrown()` hide any card that would stand inside or before a near stack's rock. Burst sites come from `STATIONS.posts`.
- `kite-wings` (`wings/figure.ts`, `wings/index.ts`): every animal is a jointed picture sheet (`Figures`) cut from `mat/feeder-a/b/c`, `mat/perched`, `mat/fliers` (colour, `-h` relief, `-a` cover). Joints turn neck, sails and legs. Amber skin passes the light (lost with distance, `far`); legs are wet where they stand; each has a mirror in the film and (colony) a shade drawn on the rock behind it with `GreaterDepth`, the body drawn after it. Feeders: own feeding cycle each, a tuft that enters the water, drops stretched along their flight that leave a ring (`Spray` with a negative stretch: under 0 a drop, under -50 its ring). Colony: forty, single or in pairs, four large with sails part open, own head turn and time each. Fliers: flock, six that cross the colony lens, six staged from the ribs-06 lens (`gatePose`) plus three far.
- `drowned` (`drowned/index.ts`): a relief plate from `mat/carcass-hung.jpg` turned to the ribs-05 lens, pale, stained toward the bottom, threads of water down it, loose ends that sway, weed strands, drips, 16 crabs that walk.

No approved picture is drawn. Pictures are the Builder's under `public/assets/ribs/mat/`; none was added by me. Off, behind constants: `DEBUG_NO_CARDS` (bore.ts, false). Dead code left: the old tube body in `drowned/index.ts` (not drawn).

## Tried, did not work (this wave; the wave 2 list is in the git history of this file)

- Bursts pushed sideways out of a stack's lee: one white column. Hiding them works. A shade copy with the normal depth test fell on the birds themselves.
- Colony at 120 and at 60: a heap. Tone 0.5 and shade 0.75: near-black birds. Bore darks lifted to grey: a bank of spray.
- Bars' breathing at 0.011: blotches that came and went (1078 to 1150); now 0.004. The lane taken from `uSkyBreak`: no path in the frame.
- Picture reads inside an `if` in the film: waterlines differ between page loads (determinism fails). `float round` in GLSL is refused.
- `(set -m; cmd &)` for renders on this machine exits silently: render in the foreground.

## Still wrong beside the approved pictures, worst first, by key

1. ribs-4: the flat before the wall is a grey wet film, not the picture's bright mirror with the fliers' images in it; the wall has no spray blown back off its top and does not fade into mist toward the blades; after frame 2430 the wall passes through the right stack; fliers share two side poses.
2. ribs-1: the body lies diagonal on the rock; the picture's hangs with limbs and tendrils free. It needs a new picture or a jointed plate.
3. ribs-0: animals are small and few in the middle ground; a few whitecap chips read as chips at native size.
4. ribs-3: pairs still repeat the one `perched` sheet (three cells); nests are the lead's rock.
5. ribs-2: the far feeders are plain against the water; the splash is small beside the picture's.

## Staged by shot (`stagedSeconds()` or the lens of the shot)

- ribs-04: three near feeders stand nearer the lens than their stations; the third runs off, in the place for that shot alone; rings only in that span.
- ribs-02: eight wide feeders stand off their stations; a second hero feeds 47 m out; the far right runner is in that shot alone.
- ribs-03: sitters are chosen and turned from that lens; six fliers cross it at its key. ribs-05: the plate is turned to that lens.
- ribs-06: feeders leave before the bore; six fliers are placed from that lens (33 to 52 m), three far; burst sites at the two gate stacks.

## Cost, seconds a sample at 3840 x 2160, key `ribs-0`, draft tier, `npm run cost` (noise 0.15)

- Alone: `runnels` 2.85 (received 3.11), `sea` 2.53, `bore` 2.45, `kite-wings` 2.39, `drowned` 1.88, `surf` 1.71 (the empty frame). The whole frame 11.21 (11.77 at version 2).
- Most of `runnels` is its picture reads over the whole flat; the bore terms sit in one branch that reads no picture.

## Measures at hand-back (`npm run measure -- --unit ribs --tier draft`, uhd), keys ribs-0 to ribs-4

- M1 0 invalid pixels on all five. M2 23.7, 54.5, 58.1, 15.9, 76.8 percent. M3 0.98, 1.10, 1.34, 0.83, 0.86 (floor 0.75). `determinism: pass`, G10 pass, tsc clean, build passes.
- M3 on ribs-3 and ribs-4 is near the floor: any more blur or mist in those two lenses turns it red.

## Next, in order

1. ribs-06: reflections of the six fliers in the film (`Figures` mirror pass exists for feeders: give the fliers one), spray blown back off the crest, mist between wall and blades.
2. ribs-05: a hanging body (new picture from the Builder), then joints for its limbs.
3. A third and fourth `perched` cell so no pair repeats; more feeders in the middle ground of ribs-02.

## The critics of round 16 (full text in the round's mail), each quoted with what was done

- C1 "dark muddy brown and flattened diagonally": plate paler (albedo 1.12, stain 0.4), threads, pale crabs that walk; still diagonal. C11 "holds one pose": water threads, sway, drips, crabs.
- C2 "dark, matte, and wood-like ... no prey or splash": picture sheets with amber sails that pass light, fine tuft, drops and rings. C20 "same dry material even at the waterline": wet legs. C28 "keeps its head down in one pose": own cycle each, third runs off.
- C3 "flat glassy mirror with uniform concentric ripples", C4 "empty floating specks instead of a dynamic splash", C7 "very even concentric rings", C21 "pale translucent outlines": cats' paws, bed shows near the lens, rings only under a tuft and uneven, broken mirrors.
- C5 "uniform flat pale-beige shapes ... contact shadows", C8 "copies of one sculpt", C23 "without a clear grip or contact shadow", C27 "almost no movement between frames", C29 "keeps nearly the same pose for all 6 s": forty sitters from three cells, pairs, tone 0.74 to 1.1, shade on rock, head turns and shuffles in own time.
- C6 "smooth grey plastic sheet", C9 "straight, calm gray plane", C16 "even parallel ripples", C25 "evenly spaced horizontal bands": bent ripple trains, level falls before the bore, wet film in uneven bands, lane.
- C10 "never comes in as a wall of water with weight": `borewall-c` wall with a face, swell ahead, wall engulfs the stacks; C24 "uniform pale veil", C30 "hardly changes over 12 frames": torn top, lumps, `gust`, cards born and left behind each 0.7 to 3 s.
- C12 "swell turns into a flat, mirror-like sheet ... blotches": `calm` only in the last 4.5 m, breathing 0.004. C14 "reads as a still picture": paws drift, foam lanes, M2 23%. C19 "hard, clean outlines": meniscus thread and wet band.
- C13 "white spray shows up inside the rock's silhouette", minor "hard ghosted edge": `lee()` hides thrown water in and before near rock.
- C15 "darker, stiffer, and lined up", C18 "scatter of stamps": feeders off stations, runner, four flier cells with own beat. C17 "flat grey cutouts": six staged fliers, amber against the white. C22 "stepped translucent ghosts", C26 "seem to hang": checked at final tier, soft along travel; fliers beat and travel.
