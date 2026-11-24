# 03 · Method

## 1 · What this file is

It does not tell you how to build the film. You choose the techniques. This file says what has to be true of whatever you choose, what earlier builds learned the hard way, and what a part falls back to when its time runs out. If you know a better way than anything named here, use it and log it.

## 2 · What has to be true of any technique

- It is real 3D. When the camera moves, near things pass far things, surfaces catch the light from a new angle, and what was hidden comes into view. A flat picture that slides is not a place.
- It moves. Fluids flow, weather drifts, light changes, animals act. In every judged view, with the camera frozen, a visible share of the frame is still changing. `kit/07-QUALITY-BAR.md` measures this as M2.
- It is a pure function of the frame number. The same frame gives the same pixels on any machine, in any order, on any day. `kit/05-ARCHITECTURE.md` section 2.
- It holds at delivery size. The film is watched at `formats.master`. A critic looks at native-size crops. Texture that turns to mush, geometry that shows its facets and particles that are flat dots all fail there.
- It is stable in motion. No shimmer, crawl or flicker in fine detail from one frame to the next at the `final` tier.
- It gives the same picture in software rendering here and on a graphics card on Brandon's Mac. WebGL2 core and the extensions Phase 0 marks portable, nothing else.
- It matches the approved pictures of its place in colour, light, weather, landform, scale and mood. Match the look, not the pixels: a viewer shown the approved picture and your frame should say it is the same place, filmed twice.

## 3 · What earlier builds learned

- Matching approved pictures got close fast. Building toward a description did not. Work every view against its key, side by side, from the first hour.
- A solar system film was built by turning approved pictures into surfaces. It looked real and Brandon found it dead: nothing moved, so it did not feel like a world. Pictures may feed this build as textures, height, colour and sky. They may never be the place itself, except as the last step of the fallback chain.
- Heavy is fine. Frames are computed one at a time and nothing has to keep up. Spend the frame on what the eye lands on: the fluid in the foreground, the animal in the push-in, the air between the camera and the far wall.
- Depth sells scale: haze that thickens with distance, cloud and vapour at several heights, small things near and large things far, a familiar-sized motion such as a bird or a wave to measure by.
- Light sells reality: one clear key light, soft fill from the sky, shadows that are never pure black, glow that lights what is near it. The lava lights the walkers from below. The lightning lights the whole ridge for two frames.
- Software rendering here is slow and exact. Measure the cost of every technique on a sandbox VM before you spread it across six places. A technique that makes the master impossible to render here is still allowed, because the master can be rendered on Brandon's Mac, but know which side of that line you are on. `kit/05-ARCHITECTURE.md` section 7.
- Anything simulated, such as a fluid surface, a particle system or a herd, is either a closed-form function of time or is stepped at a fixed rate from a seeded start and cached, so that any frame can be rendered without playing the film up to it.
- Noise that changes every frame must be a function of the frame number and the sample index, never of a clock. In the card loop it is a function of the frame number counted round the loop, so that the loop closes.

## 4 · Animals

Animals are the hardest thing in this film and the easiest place to lose the viewer. A bad animal up close does more harm than no animal.

- Build each animal as well as you can for the distance at which it is seen. The thin, bony ones, the walkers, the waders and the kite-wings, suit hard surfaces and simple rigs. The heavy and the shaggy ones, the wallowers and the ridge-runners, are much harder.
- They move like animals: weight shifts before a step, a herd is never in step, something always pauses, turns or looks up. Each kind has a cycle and each animal is offset in it.
- Brandon's rule for when an animal will not reach the bar: keep it at a distance and say so. Restage the detail so the animal is further off, in silhouette, behind vapour, steam, rain or spindrift, or partly out of frame, and let the detail be carried by the place: the seam it feeds at, the mud around it, the snow on its back. Log it as an open item with the detail's key, and add the settled line for that key as `kit/06-ASSETS.md` says. Never ship a close animal that reads as a model.
- That restaging is allowed for any animal detail once its unit has had its first round and the animal still draws a severe issue, or once the clock prints `box end: reached`.
- The dead ones do not move, which makes them easier. They are still the place's proof, so they get real care: `ribs-1`, `heart-2`, `breath-2`, `marsh-4`, `spine-1`, `eye-3`.

## 5 · Parts, stand-ins and the fallback chain

- In Phase 2 you list every part of every unit in `parts/PARTS.json`: each landform, fluid, weather system, sky, animal kind and effect, with its unit, its state and the hash of the file that draws it.
- A part is `stand-in`, `built` or `fallback`. A stand-in is a plain placeholder that reports itself to the frame interface, so the harness can tell. It is plain shapes in flat, unlit colour. It never draws an approved picture or a generated one, so nothing finished can be mistaken for it. `kit/05-ARCHITECTURE.md` section 3 gives the four tests that find one.
- A part that is still a stand-in when the clock prints `box end: reached` for its phase is finished by this chain. Each step gets three tries. The last step can always be made.
  1. A simpler real technique for the same thing: plain geometry with generated or painted maps for colour, relief and glow, lit by the place's rig, with simple motion in the shader.
  2. Projection: the approved picture of that view, projected onto rough geometry of the right shape so that it holds under the camera's move, with at least one truly moving layer in front of or on it, such as vapour, spray, glow or drifting particles.
  3. A plate: the approved picture as a backdrop for that part of the frame, with moving atmosphere in front of it. For an animal, the last step is a still silhouette at a distance.
- The parts of `film` have plain fallbacks of their own, each of which can always be made: the opening falls back to the Ribs' establishing view with a slow push, a transition to a plain cut on an accent, which takes that part out of the film and out of the register, with an open item that says so, the ending to the titan frame held and faded to black, and the card loop to one shot of its place with every motion cross-faded over the seam.
- A part finished this way is marked `fallback` with the step that ended it, and is logged as an open item. It is a finished part, not a stand-in, and it is judged like any other.
- One part never holds a unit. A unit goes to its round with its parts as they are.

## 6 · The reveal

- It has to be one continuous move across a change of scale of several thousand times, and every frame of it has to look like a real view of one world.
- `references/approved/7-reveal/pullback.json` gives everything needed to build it as a zoom through nested pictures: the master, the finer plates of the first two keys, and the window of each in the next. That is the floor, and it is step 2 of the fallback chain for this unit.
- The bar is higher than a zoom through pictures. From orbit a real planet has relief that catches the light, cloud that sits above the ground and moves across it, shadows of that cloud on the sea, haze toward the edge, and an edge of atmosphere. Build as much of that in 3D as holds up: terrain with height from the master, cloud layers as separate moving layers, the storm lit from inside, the glow of the Heart, the sea with sunglint.
- The start of the move is the hard part: the Eye as a place gives way to the Eye as a mark on a continent. `kit/02-SUBJECT.md` section 4 explains the mismatch of scale. Hide the handoff in the first seconds of the rise.
- The speed of the rise is eased so that it feels like one pull, slow at the lake, fastest in the middle and settling as the body fills the frame. The height should feel logarithmic: each second multiplies the view.

## 7 · Sound

You cannot hear. Everything here is built so that sound can be made, placed and checked without ears, and so that Brandon can judge it quickly at the review stop.

### The voice

- Phase 0 reads the current ElevenLabs API reference for speech, records the endpoint, the models and the settings it offers, finds the voice by the name under "Voice" in `kit/PROGRESS.md`, and makes one short test line.
- Use the model the voice was designed for if the API says which that is. Otherwise make the same test line on each speech model on offer, at most `narration.maxTakesPerClip` in all, and keep the model whose result measures lowest in pitch and slowest in pace without faults.
- Use a fixed seed for every take and record it, so a lost clip can be made again as nearly the same as the tool allows.
- Never speed the voice up. Slowing it is allowed if it stays natural.
- Each clip, or each line of a clip, gets at most `narration.maxTakesPerClip` takes. A take is checked, in this order:
  1. Words. Transcribe it and compare it with the script. A take with a wrong, missing or extra word is rejected.
  2. Faults. Ask the listener, twice, in open words, to describe the voice and to name anything wrong with the recording. A fault that both calls report rejects the take.
  3. Numbers. Length, pace in words a minute, median pitch, loudness and peak. Among takes with no fault, keep the one that is slowest and lowest, and close in pitch and loudness to the clips already kept.
- Bring every kept clip to the same loudness before it is placed.
- If no take of a clip survives, keep the best one, log an open item, and name the clip in the `REVIEW` block.

### The sound effects

- The sound effect tool makes a sound from a description and a length. Describe the source and the space plainly: slow surf breaking inside a huge stone arch, distant. Thick lava folding and hissing, close. A single flat crack of thunder with no rain.
- Each cue gets at most `audio.maxTakesPerCue` takes. A take is put through the level chain first, because a quiet take makes the listener invent things. Then the listener is asked, twice, what it hears. Keep the take that both calls describe as the thing you asked for, with no voice and no music in it.
- A bed that has to run longer than one take is looped with a crossfade at a point where it measures alike on both sides.

### The mix

- `npm run mix` builds the soundtrack from the cut list: the music from its first sample, cut once as `kit/01-FILM.md` says, the narration lines at their frames, the beds and the spot sounds.
- The music drops under every line by up to `audio.duckMaxDb` and comes back in the pauses. The beds sit well under the music. Nothing is ever louder than the voice while the voice is speaking.
- The mix is measured, not heard: integrated loudness at `audio.loudnessLufs`, peaks at or under `audio.truePeakDb`, and for every line the level of the voice above everything else in the band where speech lives.
- A mix made twice from the same inputs is byte for byte the same.
- `cut/CUES.md` lists every sound with its frame, its length and its level, so Brandon can rebuild or change the mix in his own editor from the separate files.

## 8 · The audio map

- Look for the workspace's audio map skill in Phase 0, three tries. Use it if it is there.
- With or without it, `npm run audiomap` must exist and work on its own: tempo and bar lines from the onsets, the strong hits in the low band and across the whole band, the sections from the loudness curve, and the long quiet. It writes `cut/MAP.json`. Three tries at a map that agrees with `music.landmarks` to within a bar at the first strike, the quiet and the reveal strike. If it still disagrees after three, use `music.landmarks` for those three points, log it, and go on.
- If there is no music file at all, write the map from `music.landmarks`, with bar lines every `music.barSeconds` counted from the first strike and the tempo from `music.bpm`, mark it as made from the landmarks, and say in the opening status of every task that the music file is missing.

## 9 · The card loop

- The loop is one shot of `deliver.cardLoop.seconds` in which everything closes on itself: the camera's path, the fluid, the glow, the particles, the animals' cycles, the weather. Every period divides the loop's length. Frame 0 follows the last frame exactly as it follows itself.
- It is rendered through its own mode, with time running round the loop. It is not cut out of the film.
- A motion that cannot be made to repeat is cross-faded with itself one loop length earlier over the last part of the loop, so that it still closes exactly.
- By default it is the Heart: the lake breathing, a walker feeding, the lava fall behind. At the start of Phase 5 the pick in `kit/07-QUALITY-BAR.md` decides, once, whether another place makes the better card.
- Choose the frame that would make someone click before you choose the motion. Frame 0 is the card still.

## 10 · Tools you may reach for

- Image generation, for textures, height and colour maps, skies and far backplates. Pass the approved picture of the view as the place and a real photograph as the standard for how a camera records it, as the reference run did. At most `assets.maxTakesPerAsset` takes of any one asset.
- Real photographs and footage, to study how a thing looks and moves: surf in a sea arch, a lava lake's crust, fog pouring over a rim, a salt flat, lightning on a ridge, a herd at water. At most `assets.maxStudySources` before the look lock. They are never shipped.
- A video model, only to study motion. Never for a frame.
- Blender, headless, or an image-to-3D tool, if you can reach one, for geometry and baking. One try at an image-to-3D model for any one object, and three failures in all end the idea.
- While tuning any one part you may render at most `assets.maxTuningLooksPerPart` low-tier looks in a round. Then the part goes forward as it is.
