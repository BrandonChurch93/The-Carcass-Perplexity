# The Heart, hand-over after the third wave of the wide polish

Unit `heart`, film frames 2507 to 4220, branch `agent/p8-heart-polish`, cut from `origin/main` at `967bb1c`.
Written by the unit's lead near the end of the four hours. Every hash below is a merge on that branch unless it says otherwise. The last merge is `a6e958f`; the commit that carries this file sits on top of it.

## 1. Done, part by part

The lake, the channel and the fall (`src/places/heart/lake/`, `fall/`), fluid builder
- `946f1a3` (its `1e6b3b4`): the crust under the walkers at 3156 as rough dark basalt from a baked sheet (`public/assets/heart/mat/rough-nt.jpg`, recipe in `assets-src/heart/fluid/RECIPE.md`). This one merge took M3 at 3156 over its floor.
- `38faa9d` (its `c6e8edc`): a cooling skin on the channel at 3477 whose thickness drives the glow; the cave's hood dark and lit only at the lip; 44 drifting fume veils at the fall; one crust wave that dims mouth, body, foot lights and fume as packs pass; the surge slower; the stream behind the walkers at 3156 doubled, its fan a pool. Falls and `onLine` not moved.
- `e95092e` (its `f94a75b`): the surge head domed and the melt cut from steep faces beside the bed (the striped upright wall at 4100 is gone); the channel's lip at 3477 a rim line over a broken, scalloped face; the hood's light patched; the puff at the lip thinned.
- `3060175` (its `9fec2ee`, last version, merged on a draft look, not measured): the melt at 3477 carries a thin film drawn in flow lines, so the pale flat patch at the lower right is gone; the plates there are fragments with torn glowing rims; rafts on the surge at 4100; stronger grain on the floor at 3156. The puff at the lip stays.

The ground (`src/places/heart/land/`), ground builder
- `13adf77` (its `18dc38a`): sulphur at the vent of 3477 in small broken patches on sooted rock.
- `971f669` (its `a6fb570` and `5d57c84`): the far wall broken by a third joint set with dark creases and pale edges, rows levelled across ribs (the comb of upright lines right of the arch at 4006 is gone); sulphur as crumbs; the bench slopes read a built bed of basalt fragments (`public/assets/heart/mat/aa-nh.jpg`, recipe in `assets-src/heart/RECIPE.md`).
- `a1c98f4` (its `2e4283f`): the scree under the long lens of 4006 reads the built bed (7 m a tile; it switches on only near uhd); the buttress broken along the face joints; the crag of the line view takes the bed; wide-slope blocks toned dark (the builder found the dark tone smooths 2722 by about 0.005 of M3 and takes it out again in its last version).
- `e0be995` (its `434edf6`, last version, merged on a draft look, not measured): the mesa brow and the ledge lips pale; the lattice at 3477 thinned to two stones; the dark tone on the wide-slope blocks taken out again. The gain is small at preview size.

The air and the rig (`src/places/heart/air/`, `shared/`), sky builder
- `4c32205` (its `d3a641d`): the cost cut of this wave (see cost below); vapours whose foot is on the lake lie along the crust as low warm trails carried downwind (the white columns at 3156 are gone); the plume thinner; a smoke deck on the dome that hardly shows yet.
- `3e5bf46` (its `c3bff5a`, which is its version 3 `5e10480` and one commit more): the fall's bank in larger billows that take the round lights on their undersides only; fluid's west fume crosses the fall; a knee on round lights stops the pale lump at the mouth; the plume in billows, the deck in separate banks; the lake trails thinner, shorter, in gusts with clear crust between.
- `a6e958f` (its `d791f97`, last version, merged on a draft look, not measured by the lead): lake vapour as short low trails in gusts, thinner, with clear crust between; the fall bank sparser (repeat 165, was 120), cliff shows between billows, dark top, lit foot.

The walkers and the sunk one (`src/places/heart/walkers/`, `sunk/`), life builder
- `0ae02a7` (its `fb972dd`): charred brown hide with a fire rim, ash on the shins, the hock shred in the joint.
- `717634d` (its `04d3355`): the gait from planted feet (the trunk leans off a pad before it lifts, drops and springs, yaws); grit crumbs dark under a lifted pad; the hero stands 0.5 m taller at 3156 by pose alone, no anchor moved.
- `4d7db8c` (its `df87814`, which is its version 3 `ddfded0` and the first commit of its last version): the sunk one's hull on a new charred sheet (`public/assets/heart/mat/char.jpg`, `char-nh.jpg`, made by `assets-src/heart/make-char.py`), dark blocks and deep splits, no pale plates; the zigzag ember now runs as a crack and warms the skin beside it; the hero's crouch at 3244 to 3309 eased; limbs charred grey.
- Its last version is `df87814` itself, already in `4d7db8c`; nothing came after it.

Measure M3, final tier, uhd, floor 0.75, by `npm run -s measure -- --unit heart --only N` (round 30 in brackets)
- 3156 (0.7272): 0.9694 on `0ae02a7`, 0.8512 on `38faa9d`, 0.9662 on `3e5bf46`. The dip was the sky's low trails of version 2 lying over the rough floor; version 3's thinner trails in gusts won it back. On the sky builder's machine its last version read 0.9730.
- 2722 (0.92 in round 29, not measured at the start of this wave): 0.7709 on `38faa9d`. The measure on `3e5bf46` was stopped at minute 215 to free the one render slot for the last looks. The sky builder read 0.7783 on its last version. It stands thin over the floor.
- 4006: 1.1321 on `38faa9d`.
- M1 and M2 green each time. Nothing was measured by the lead after `3e5bf46`: the three last versions are in on a draft look only.

Cost, uhd draft, best of two, seconds (`npm run -s cost -- --frame N --format uhd --tier draft --parts none --runs 2`)
- The cap, the lead's before on `origin/main`: 2507 22.88, 4010 25.34, 2722 22.85.
- On `38faa9d`: 22.53, 25.03, 22.46. On `3e5bf46`: 22.55, 25.11, 22.45.
- Last measured, on `a6e958f` with all three last versions in: 22.68, 25.04, 22.63. Inside the cap at each frame.
- The sky builder timed its last version 0.28 s over its own before at 4010 (the larger fall bank, repeat 165); on the lead's machine, with fluid's last version beside it, the unit stays inside. The room left at 2722 and 2507 is about 0.2 s, less than the machine's swing.

Size: the unit's two asset folders grew by 4.50 MB of the 12 allowed.

Guards 1241, 4409 and 7234: byte equal to the before set at reports 1, 2 and 3. Three draws of 3156 byte equal each time. Invalid count at 2722, uhd final: 0 each time. G8 passes.

Decisions of the lead in this wave
- The falls are not moved left: moved, the mouth is cut at 4006 and the fall leaves 3156.
- The cave reshaped: taken as the dark hood lit at the lip (fluid's version 2). Its outline is unchanged.
- The herd regrouped: not made. The anchors in `shared/anchors.ts` feed the lake's pools, `BANK` and key 3. It stays open, not declined.
- Contested and left as they were, for `/root`: the orange on the walkers' tendrils at 3156; the thickness of the vent steam at 3477.
- The lenses of 3156 and 3477 were not touched. Nothing living has eyes or ears.

## 2. Still wrong, worst first

1. The channel at 3477 (fluid). The cooled skin with bright cracks is a clear gain. The pale flat patch at the lower right with plates like cut-outs (`/root`'s look at the hd pair of report 2) is mended in the last version as far as a draft preview shows; it was not looked at in hd. The melt is less white than the approved picture and a thin orange bar lies left of the lip. The channel's side band is flat. The sulphur is flecks on one boulder face, thinner than the picture's crust. The vent steam is as it was (contested, left for `/root`).
2. The air (sky). At 2722 a patch of clean blue sky stays at the upper left and the lake trails read as pale smears on the crust; the smoke deck hardly shows. At 3156 the trail is a soft wisp without curl; laid thick over the rough floor it costs M3 there (0.8512 with version 2, 0.9662 with version 3, 1.0560 with no lake vapour at all). At 4006 the fall's bank is one soft dark mass, not billows, and hides cliff.
3. The fall and the cave (fluid). At 4006 a pale puff sits at the lip and the hood is flat maroon; at 4100 a pale slab lies on the first tread of the surge. At 3156 the fall stays in the left fifth of the frame, where the picture has a broad bright flow behind the hero: by cells M3 is short exactly there.
4. The ground. The slope boulders at 2722 and 2507 are rounded and soft in shape (shapes are shared by every frame and were not touched); the mesa has no lit rim; the crag is one slab in outline; the scree's contrast is 6.6 against the picture's 7.8.
5. The walkers. The sunk one's hull is a heap of jagged slabs, not a body (mesh not rebuilt); its seam is one width; limb plates read as bark close up; joints are faceted; the herd at 2722 is too alike; grit is sparse beside the picture.
6. Far seams of the lake are stair-stepped squares at 3685 and 2722 (mask resolution), untouched in this wave.
7. Open for the next wave, not declined: the herd regrouped; the cave's outline. Contested, for `/root`: tendril orange at 3156, vent steam at 3477.

## 3. Held back

Nothing is held back and nothing came late. Every version a builder sent is on the branch except the sky's version 1 (`7b340fe` on `agent/p8-heart-sky`), which was over the cost cap and was replaced by its version 2, not held as a plainly better version.
The three last versions (`e0be995`, `3060175`, `a6e958f`) are merged on a draft look, not measured: one preview frame each (2722, 3477, 3156), tsc and build clean, cost inside. The guards, the three draws, the invalid count and G8 were last proved on `3e5bf46` and were not run again on `a6e958f`. Run them first.

## 4. What to try next for the worst three

1. The channel at 3477 (fluid, `lake/skin.ts`, `lake/lava.ts`): the last version draws the film in flow lines and the plates as torn fragments. First look at it in the hd review still (90 s; the fault of the plates did not show at preview). Then: the open melt nearer the white of the approved picture where the film is thinnest, the side band given the same film, the thin orange bar left of the lip taken out.
2. The air (sky, `air/smoke.ts`, `air/sky.ts`): break the trails into lumps with clear crust between, measured at 3156 after each step (1.056 without any lake vapour is the mark); bring the deck down over the upper left of 2722 until no blue is left; split the fall's bank into three billows with gaps that show cliff. 2722 stands thin over the M3 floor: measure it after every change of plume, deck or trail.
3. The fall (fluid, `fall/`): a body with thickness, wider at the lip, with rafts; the pale slab at 4100 and the puff at the lip first. The broad flow behind the hero at 3156 needs staging (the fall or the camera), which this wave did not have leave to change: ask `/root`.

Cost, the next cut: at 4010 the rig's round lights (`emitterIrradiance`) cost 2.7 to 3.0 s. A list inside that function timed worse than the head and was dropped; the frustum list in `createRig` is what is in. Try fewer, wider lights for what is far from the view.

## 5. What a newcomer would trip over

- Cost numbers swing by about half a second between sessions on one machine: `origin/main` read 22.88, 25.34, 22.85 at minute 50 and 23.39, 25.26, 22.78 at minute 105 (2507, 4010, 2722). Time A and B back to back, and do not chase a difference under 0.5 s.
- The cut the last hand-over wrote down (read the thrown shade only where the bank light is strong) wins nothing: the sky builder timed it in and out. Its reading: the software renderer pays for both sides of every `if`, so a read behind an `if`, a `continue` or an early `return` is still paid; only loop turns that no pixel needs are skipped. What did win: lights, vapours and bodies that cannot reach the view never go to the shaders (the frustum list in `createRig`, `shared/rig.ts`, and the list at the head of the smoke march, `air/smoke.ts`). At 4010 the rig's round lights (`emitterIrradiance`) cost 2.7 to 3.0 s, the smoke march 1.0 to 1.4 s, the lake taps 0.5 to 0.8 s: the next cut is there.
- M3 at 3156 was the floor, not the walkers: the frame's lower half was smoother than the picture's. It also falls when anything smooth is laid over that floor (see the measures above).
- By cells, M3 at 3156 is short at x 25 to 50 percent, y 20 to 40, where the picture has the hero's body and the fall and the frame has far wall behind haze. The air leaves that wall 21 grey levels; rock detail there drowns. That is staging or air, not rock.
- One key by `npm run -s measure -- --unit heart --only N` takes about 10 minutes at 3156 and 2722. A review tier hd still of 3156 or 3477 takes 90 s; of 4006 it took 1189 s on the lead's machine. Do not plan an hd review of 4006 inside a report's deadline.
- The file of `--diag invalid` is `out/work/stills/frame-N-uhd-final-invalid.png`; a `.json` lies beside it, so do not pick the newest file by a wildcard.
- The render tool rebuilds the site when sources change. Never switch branches or build while a render, a cost or a measure runs. To move the polish branch while a look renders on `look`, move the ref (`git branch -f`) after `git merge-base --is-ancestor`.
- A look merges the hash the builder mailed, not the head of its branch: twice in this wave a fetch took one commit more than the mail named (`out/work/stack.sh` now takes `name:frames:hash`).
- Looks can be stacked: take the versions one after another on `look`, mark each stage with a branch, render between, and fast-forward to the last stage that is better. It saves a build and a wait for each builder.
- No part carries its own light. The reach of the lava's light is the rig's (`LAKE_BANK`, the sky builder's); the amount the channel gives is fluid's `onLine`. Neither moved in this wave. Whenever one moves, look at 3400 to 3560 for a red or pink flood.
- A source's place, strength and kind belong to who pushes it (fluid for the fall's smoke sources); how each kind is drawn, lit and drifts is the sky builder's.
- `index.ts` and `layout.ts` belong to nobody. The `BANK` line of `shared/rig.ts` is the sky builder's alone. The walker's light shares (`LEG_RIM`, `LAKE_UNDER`, `FAR_FIRE` in `walkers/material.ts`) are life's.
- The scree of the ground's version 3 switches on only near uhd: previews and hd understate it.
- Pushes failed with EXIT 128 for the first 50 minutes and then worked; a builder whose push fails sends a `git bundle`.
