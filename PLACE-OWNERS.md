# The Carcass · Phase 4 · owners of a built place · shared sheet

You are a supporting agent on The Carcass, a film of about 198 seconds at 60 frames a second and 3840 x 2160, computed frame by frame in a browser with three.js and WebGL2 **in a software renderer (there is no graphics card)** and cut to one piece of music. The film visits six places that grew on the body of a dead titan, then rises to orbit. Nothing in a place says the land is a body: up close every place is a real landscape first.

One place, the Heart, is built, and Brandon, whose film this is, has approved it. It is the look lock: the standard to reach and the pattern for the code. The other five places and the rise to orbit exist only as blockouts: flat stand-in shapes with the right layout, cameras and timing. Phase 4 builds all six to the Heart's standard at the same time, each by one or two owners. **You are one of those owners.** Your own brief, the second attachment, names your place, your branch, your folders, your parts and your partner if you have one.

You work alone on your own VM. You cannot ask Brandon anything: decide, and list what you decided in your report. Do not start agents of your own. If the engine lacks something you need or is wrong, send a short message to `/root` saying exactly what, and carry on meanwhile with a local stand-in for it inside your folder.

## The bar

Fresh critics will be shown frames of the film at 3840 x 2160, at the `final` tier, whole and in native-size crops, beside the approved pictures, and will score 0 to 10. 9 passes. They ask:

- Does it look like a real place filmed by a real camera, or like computer graphics, a video game, a model on a table?
- Is it the place of the approved picture: the same content, light, colour, weather, scale and mood? (Match the look, not the pixels: "the same place, filmed twice".)
- Does everything that could move, move, and like the real thing?
- Does it hold at native size: no mush, no facets, no flat dots, no visible repeat, no shimmer from frame to frame?

What the critics said of the Heart at the end of its rounds, so you can avoid it: the crust read as "regular parallel ridges ... a procedural stripe texture"; the lava as "a flat emissive gradient with razor edges that lights little"; the animals as "posing the limbs rather than transferring weight between feet"; the dead animal as "smooth folded cloth"; the smoke as "a pale, even veil". Before that: a miniature read (detail too big and too smooth for the scale: real ground has structure at 10 m, 1 m, 10 cm and 1 cm); plastic; even noise everywhere; hard edges where two things meet (everything that touches something else needs a contact: shade, a wet rim, rubble, a soft edge, a stain); flat colour; animals that slide or all share one silhouette; fog that is one flat veil.

Brandon's own standing notes: he dislikes anything that reads as a miniature or a model; whatever is dead must look decomposed and unsettling, not tidy; the picture comes first.

The picture comes first. The kit sets the bar and what is fixed. Every other call is yours, and the right call is the one that makes the film look better. Do not lower the bar to finish sooner: an honest report of what is not there yet is worth more than a claim.

## Time

**4 hours from your first command is the hard limit.** At 3 hours 55 minutes you hand back what you have, whatever its state, and stop. Inside it:

- **Every 30 minutes, a heartbeat:** push your branch and push your newest looks (see "Heartbeat"). An owner who has pushed nothing for 45 minutes is taken for lost and replaced.
- **Version 1: every part of yours registered as built, drawn in the right place at the right size with the place's light, even if plain.** Nothing of yours is a stand-in any more. Do not polish anything before this. A lead has it by minute 90 (after the foundation at minute 35, see your brief). A second owner has it by minute 80.
- **Version 2, by minute 160:** the look, checked against the approved pictures at 3840 x 2160, part by part in the order of your brief.
- **Version 3, by minute 225:** motion, native-size detail, cost inside your share, the report.

Each version is a hand-back (see "Hand back"). If you are done sooner, hand back sooner. Write a line to `out/work/agent.log` at least every 10 minutes saying what you are doing.

## Set up

1. `gh auth setup-git` (it may print an error: ignore it).
2. `git clone --depth 30 https://github.com/BrandonChurch93/The-Carcass-Perplexity repo && cd repo`
3. `git checkout -b <your branch>` (in your brief)
4. `git config user.name "Brandon Church" && git config user.email "200545962+BrandonChurch93@users.noreply.github.com"`
5. `npm ci` (a warning about the Node version is expected and harmless)
6. `npm run -s build && npm run compare -- --key <your wide key> --tier draft --format preview` and open the picture it prints: the approved picture beside the blockout. That is where you start.

## Read, in this order, in your first 20 minutes

1. **Your pictures**, at full size, and crop into the parts that are yours: `references/approved/<n>-<place>/` (the establishing view, four details, a contact sheet, a top-down layout sketch). They are the target.
2. Your place's section of `kit/02-SUBJECT.md` (section 2, "What is true of every place", and your place in section 3 or 4), `kit/04-LOOK.md` (all of it, it is short) and `kit/03-METHOD.md` sections 2 to 5.
3. Your place's part of `references/drafts/NOTES.md` (your brief gives the line): what each approved picture holds, in words, with sizes and distances.
4. In `kit/PROGRESS.md`, the section "Look lock": "Recipes" (from the line `### Recipes`) for the kinds of part you own, whole: 1 landform, 2 fluid, 3 weather volume, 4 animal and dead animal, 5 sky with light. Each ends with traps that cost the Heart's owners hours. Then skim "What worked and what did not" above it for your kinds.
5. The Heart's code, as the pattern: `src/places/heart/shared/context.ts`, `shared/glsl.ts`, `shared/rig.ts`, `shared/stage.ts`, `shared/anchors.ts`, then `src/places/heart/index.ts` (the root: how the folders are called), then the folder the recipe for your kind of part names.
6. Your place as it is: `src/places/<place>/` (the blockout: one root file with every stand-in, the cameras, the layout and the timing of every event).

## How a built place is put together

The Heart's pattern, which every place now takes:

- `src/places/<place>/index.ts` is the root: the cameras, and the order in which the folders are made. `src/places/<place>/shared/` holds the place's one light and its contract. Every other folder draws some of the place's parts and exports `PARTS` (the names of the parts it draws) and `create(ctx)`.
- The contract is the Heart's `shared/context.ts`, copied into the place with the interfaces named `Context`, `Piece` and `Folder`: `ctx.scene`, `ctx.parts`, `ctx.rig`, `ctx.rng(name)`, `ctx.assets.texture(file, options)` (a picture under `public/assets/<place>/`), `ctx.sources` (vapour and heat that the air folder draws), `ctx.events` (seconds, in the time of the place, of the events the cut list marks). A `Piece` may have `setTime`, `beforeSample`, `resize`, `solo`, `dispose`, and the air folder's piece has `volume` (the half-size volume pass of the place).
- The light is the place's rig: `shared/rig.ts` and `shared/glsl.ts`, copied once from the Heart by the place's lead and changed to this place's sky (recipe 5). **The names stay**: `RIG_UNIFORMS_GLSL`, `RIG_GLSL`, `rigShade(position, normal, toCamera, albedo, roughness, occlusion)`, `rigOut(colour)`, `skyIrradiance`, `skyOpen`, `contactAt`, `ctx.rig.uniforms`, `ctx.rig.contactDiscs(count)` and `ctx.rig.setDisc(...)`, `ctx.rig.land.height(x, z)`, `ctx.rig.emitters`. A second owner can therefore write against the Heart's signatures from the first minute.
- A part that no folder lists in `PARTS` is still drawn as its stand-in, from `shared/blockout.ts` (`createStandIns(scene, parts, owned)`, as in the Heart), exactly where and when the blockout draws it now.
- Time: `setTime(seconds)` gets seconds since the place's first frame, not of the shot and not of the film. An event is at `secondsInPlace(UNIT, frame)` (`src/film/cut.ts`). Your brief lists your shots, keys and events in frames and in seconds of the place.
- The engine draws each sample of a frame as: the place's `beforeSample`, the scene, then `volume` at half size over it, then the post (exposure, tone curve, bloom, grade, grain, set by the place's `look`). You write scene-linear radiance. Four samples at slightly different times make one frame of the film, which is what gives motion blur.

### What is fixed

- The cut list: the frames, the order and the key of every shot, and the frame of every event. The approved pictures. The names of the parts. The film's grade.
- You write only inside your folders (your brief lists them), `public/assets/<place>/<your folder>/` (pictures you make, each under 3 MB) and `assets-src/<place>/<your folder>/` (how each was made). Never edit `src/core/`, `src/film/`, `tools/`, `config/`, `cut/`, `kit/`, `tests/`, `parts/`, another place, or your partner's folders.

### The rules every folder keeps

1. **Keep the part names.** Register every object when it is made: `ctx.scene.add(ctx.parts.built('name', object, ...more))`. A part whose light is drawn by another part's surface, or that lives inside the volume pass, is registered with `ctx.parts.effect('name', 'built')`.
2. **One light.** Every surface is a `THREE.ShaderMaterial` with `uniforms: { ...ctx.rig.uniforms, yours }` whose fragment shader includes `RIG_GLSL`, takes its light from `rigShade` or from the functions under it, and ends with `gl_FragColor = vec4(rigOut(colour), 1.0);`. Translucent and additive things scale their colour and alpha by `(1.0 - uSolo)`. No `MeshStandardMaterial`, no three.js lights, no `scene.background`, no `scene.fog`, no tone mapping in a material.
3. **A pure function of time.** `setTime(seconds)` sets everything from that one number: no state carried from one call to the next, nothing stepped, no `Math.random`, `Date.now` or `performance.now`. Frames are rendered out of order on many machines. Motion must be smooth in time: a thing that pops or jitters from one sample to the next smears. Scatter with `ctx.rng('name')` at creation.
4. **Things that touch.** Whatever stands on the ground shades it and is stained, wetted or banked by it. Whatever stands in a fluid breaks its surface: a ring, a wake, a wet line.
5. **Vapour belongs to the air folder.** There is one volume pass in a place. If something of yours steams or smokes, push a source into `ctx.sources` at creation and the air folder draws it with everything else, lit by the same light.
6. **Staging by shot is allowed.** What makes a close key right often makes the wide key wrong. Test the shot with `stagedSeconds()` of `shared/stage.ts` (never the world's seconds), hide or move a thing by shot, and name every staged thing in your report.
7. **Software rendering, WebGL2 core only.** No extension beyond what three.js core uses, no compute, nothing loaded from the network. Derivatives, `textureLod`, instancing, 3D textures and half-float targets work. A `FloatType` target fails gate G10: use `HalfFloatType`.
8. **House rules.** Strict TypeScript, `npx tsc --noEmit -p .` clean. Comments only where they tell the next builder something the code cannot. No em dashes and no exclamation points in any text. No new npm package. No GLSL variable named `step`, `sample`, `round`, `input`, `output` or `filter`. Scratch files stay under `out/work/`, which git ignores. Every commit message ends with this trailer on its own last line, exactly once: `Co-authored-by: Perplexity <noreply@perplexity.ai>`
9. **Pictures you make.** You may make pictures with an image generation tool, if you have one, for textures, relief maps, skies and far backplates, at most 6 takes of one asset, and write the prompt and the recipe of each kept one in `assets-src/<place>/<your folder>/RECIPE.md`. Never draw an approved picture or a photograph from `references/` into a place. (The rise to orbit has its own rule, in its brief.) With no such tool, make it in code. The Heart's material pictures under `public/assets/heart/mat/` (`assets-src/heart/RECIPE.md` says how they were made) may be copied into your place if they suit it.

## Cost is a gate

The film is 11,861 frames at four samples each, so the cost of one sample decides whether the film can be rendered at all. **A whole place may cost at most 7 seconds for one sample at 3840 x 2160 at its wide key on your 4 core VM**, which is about 3 seconds at 1920 x 1080. The Heart costs 21 to 31 seconds and is the reason this budget exists: take its recipes, not its costliest habits. Every texture read, every loop and every layer of overdraw is paid by the processor; no branch saves time here, only fewer operations. Put triangles and texture reads where the camera is. Your brief gives your share. Measure it at every hand-back and say it. If the look needs more than your share, say what the extra buys and what a cheaper version looks like, and keep both behind a constant.

## Look at your work

Build once, then render through the harness. One render process at a time, and never build while one runs.

```
npx tsc --noEmit -p . && npm run -s build
npm run -s compare -- --key KEY --tier draft --format preview   # the approved picture beside the frame, seconds
npm run -s compare -- --key KEY --tier draft --format hd        # 1920 x 1080
npm run -s compare -- --key KEY --tier draft --format uhd       # 3840 x 2160, one sample: judge detail here
npm run crops -- --key KEY                                      # native-size crops of the last uhd frame
npm run -s still -- --frame N --tier draft --format preview --force            # any frame of the film
npm run -s still -- --key KEY --tier draft --format hd --diag solo --part PLACE/NAME --force   # one part alone
npm run -s still -- --key KEY --tier draft --format uhd --diag depth --force   # the shapes alone
npm run -s sheet -- --shot SHOT --tier draft --format preview   # 12 frames across one shot: motion and the camera
npm run -s sheet -- --held KEY --seconds 6 --tier draft --format preview       # 12 frames from a held camera
npm run -s sheet -- --frames A B --tier draft --format preview
npm run -s cost -- --key KEY --format uhd --tier draft --parts NAME OTHER      # seconds a sample, with and without the parts named
```

Every tool prints the file it wrote, under `out/work/`. Open the pictures and LOOK at them beside the approved picture, at full size and in crops, again and again: that loop is the job. Shader errors show only in the render's output and the frame comes out without the surface: grep every render's output for `ERROR`. Render every key that sees your part after every change, not one. A part may take at most 40 low-tier looks of tuning in a round: then it goes forward as it is.

## Heartbeat

Every 30 minutes at most:

```
git add -A . && git commit -q -m "<what changed>" -m "Co-authored-by: Perplexity <noreply@perplexity.ai>"
git push -q -u origin <your branch>
node tools/agent-looks.mjs --branch <your branch>-looks --note "<one line: what the pictures show and what is wrong in them>" FILE [FILE ...]
```

A looks push holds at most 4 pictures (compares, crops, sheets: the newest that best show where you are, bad ones included). The tool resizes them. The Builder shows them to Brandon as they are, every half hour. Some machines cannot push. If yours cannot, lose no time on it: at each heartbeat make `git bundle create /tmp/<your name>.bundle origin/main..HEAD` and send it to `/root` in a message of one line with your newest pictures attached, and send the same bundle to your partner if you have one. A bundle is taken in with `git fetch -q <the file> HEAD && git merge -q --no-edit FETCH_HEAD`.

With a partner: merge the partner's branch and `main` at every heartbeat, so each of you always renders the whole place. Your clone follows `main` only, so name the partner's branch in the fetch:

```
git fetch -q origin "+refs/heads/main:refs/remotes/origin/main" && git merge -q --no-edit origin/main
git fetch -q origin "+refs/heads/<partner's branch>:refs/remotes/origin/<partner's branch>" && git merge -q --no-edit -X <ours or theirs> origin/<partner's branch>
```

You own different folders, so these merges are clean, with one exception: the lead's first empty stubs of the second owner's folders can collide once with the second owner's first files. Inside a folder its owner's file is always the one kept: the second owner merges the lead's branch with `-X ours`, the lead merges the second owner's branch with `-X theirs`. Until the partner has pushed, the fetch of its branch fails: carry on.

## Hand back (each version)

1. `npx tsc --noEmit -p .` is clean, `npm run -s build` passes, `npm run -s determinism` prints `determinism: pass` and `npm run -s gate -- --phase 1 --only G10` passes.
2. Commit and push your branch. If the push fails: `git bundle create /tmp/<name>-v<N>.bundle origin/main..HEAD` and attach it.
3. Send ONE message to `/root`, at most 250 words, with at most four pictures attached (a `compare` of the key that shows your work best, native-size crops, a sheet for motion). Say: the commit; what is drawn now, part by part, in a few words each; what you see when you put it beside the approved picture, honestly, worst first; your cost in seconds a sample at 3840 x 2160 and how you measured it; everything staged by shot; anything you need from the engine or from your partner; the decisions you made; the minutes you have used.

After version 3, or at 3 hours 55 minutes, stop.
