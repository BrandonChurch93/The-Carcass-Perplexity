#!/usr/bin/env python3
"""Final hand-over files for round 3: out/kept/step-2-full-set/, out/NOTES.md, out/README.md."""
import json, os, re, shutil
from collections import Counter
from PIL import Image
R = '/home/user/workspace/r3'; L = json.load(open(f'{R}/log.json')); P = json.load(open(f'{R}/tools/places.json'))
K = f'{R}/out/kept/step-2-full-set'
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
CRED = {}
for line in open(f'{R}/real/CREDITS.md', encoding='utf-8'):
    m = re.match(r'^- `([^`]+)`: (.*?) \. Use: (.*)$', line.strip())
    if m: CRED[m.group(1)] = m.group(2)

TXT = {
 'ribs': dict(
  place="A tidal strait between two rows of rib blades that stand out of the sea and lean in overhead. Low tide, sea wind, the sky clearing after a storm. Black weed covers every rib up to the tide line, about thirty metres up; above it the rock is pale and streaked white by the colony.",
  life="Kite-wings: pale, long-legged fliers with a tuft of tendrils for a head, wading the pools at low tide and nesting on the ledges above the weed line. Small pale crabs. Worms in the pools.",
  kills="The tide comes back through the cage as one wall of water. The weed line shows how high it reaches, and below that line nothing that cannot fly is alive when it arrives.",
  route="From the strait floor to the drowned animal hanging in the weed on the near rib (1), across the floor to the tide-pool feeders (2), up to the colony ledges (3), then a turn seaward as the bore comes through between the ribs (4).",
  moves="Surf and spray, water running off the weed, runnels draining across the sand, kite-wings feeding, landing and lifting off, cloud moving, the bore.",
  layout="Scale bar 200 m. The strait floor is about 600 m wide between the two rows."),
 'heart': dict(
  place="A caldera lake of lava about a kilometre across under walls three hundred metres high, at nightfall. The lake is covered by a grey-black crust broken into plates, with glowing seams between them. A vessel mouth in the far wall pours a lava fall into the lake. On the near side a bench of old solid lava runs along the shore, with one steaming sulphur crack in it.",
  life="Crust-walkers: tall animals on thin legs that walk the plates and feed at the seams through a trunk that frays into tendrils.",
  kills="The crust looks like ground. A plate founders and the lake takes whatever stood on it. One walker is half under the folded skin of the lava with two legs still arched out of it.",
  route="From the bench to the line where solid rock ends and the crust begins (1), out to the one that sank (2), on to the walkers feeding at a bright seam (3), then up to the vessel mouth and its lava fall (4).",
  moves="Seams opening and closing, plates drifting and foundering, spatter, the lava fall, fume, heat shimmer, sulphur steam, walkers stepping.",
  layout="Scale bar 200 m. The lake is about 1 km across."),
 'breath': dict(
  place="A tidal shelf of pale bone-rock planed flat by the sea, at a cold dawn with sea fog and a low sun. Shafts open in the shelf: the airways. The largest is ringed inside with ruined cartilage hoops and has one collapsed side. A tide channel crosses the shelf. A sea cliff with a cave stands three kilometres on, with fog pouring out of it down the scree.",
  life="Waders: tall, pale, four-legged animals with plumed tendrils for a head, feeding in the tide channel. Gill-plumes: crimson feathered growths rooted on the lip of the shaft, where the vapour leaves it.",
  kills="The air that slides out of the shafts is heavy and has nothing in it to breathe. It lies low over the rock and pools at the rim. One wader lies dead at the rim and another stands over the drop.",
  route="From the channel bank to the waders feeding in the channel (1), across the shelf to the rim (2), round the lip to the gill-plumes (3), then over the edge and down the shaft (4).",
  moves="Vapour sliding out of the shaft and pooling, the fog bank, water moving in the channel, waders feeding, plumes swaying and dripping.",
  layout="Scale bar 50 m. The main shaft is about 60 m across."),
 'marsh': dict(
  place="Salt flats under a white overcast, with no wind and rain hanging far off. The old blood still seeps up: pools and branching channels of red brine with white salt rims. The main channel, the vein, is about ten metres wide. The largest seep pool steams and bubbles. An escarpment stands six kilometres on.",
  life="Stalk colonies: salt-crusted stalks with crimson fans, growing round the seep pools, with small winged insects round them. Mud-wallowers: heavy eyeless animals with tusk-like feelers, rooting in the channels.",
  kills="Between the channels a thin salt crust lies over deep mud, and the mud holds what steps on it. The dead are still there, crusted with salt, and one is still alive. The wallowers keep to the channels.",
  route="From a low rock rise to the bubbling seep pool (1), round it to the stalk colony (2), along the bank to the mud-wallowers (3), out onto the thin crust to the one that is stuck (4), then away along the vein.",
  moves="Gas domes rising and bursting, rings spreading on the pools, steam, insects, wallowers rooting, fans dripping, the rain curtain far off.",
  layout="Scale bar 50 m."),
 'spine': dict(
  place="A knife ridge of vertebrae above a sea of cloud, at dusk, with a storm standing against one side of it and a gale blowing across. Each vertebra is a mountain with a leaning spire, and the tip of every spire is burned black. A canal runs through the whole ridge from one vertebra to the next. The cloud sea lies about two thousand metres below.",
  life="Tether-kites: translucent ribbons that stream downwind from stalks anchored on the lee face of each spire. Ridge-runners: shaggy animals with tendrils for a face, which cross the snow saddles and shelter inside the canal.",
  kills="The lightning walks the ridge from spire to spire. Whatever is on the crest when it comes is where it comes to ground.",
  route="From the snow saddle to the scorched ridge-runner where a bolt came to ground (1), up to the tether-kites on the first spire (2), a long-lens look from there at the strike on the third spire (3), then down and into the canal through the ridge, where the herd is sheltering (4).",
  moves="Storm cloud pouring over the low saddles, lightning, spindrift and hail, kites streaming, the cloud sea drifting, the herd shifting.",
  layout="Scale bar 500 m. The spires stand about 800 m apart."),
 'eye': dict(
  place="A round lake two kilometres across in a socket of cliffs two hundred metres high, on a clear, still evening. A ring of amber shallows, knee-deep and clear, surrounds a centre that goes all the way down: a shaft with sheer walls and no bottom in sight. On one side a brow of cliff overhangs the water. A stream leaves through a gap in the rim.",
  life="Drinkers: pale, eyeless, long-necked animals that come down to the shore in a herd and never go deeper than their ankles. Amber filament mats on the floor of the shallows, all combed toward the centre. Pale forms hanging in the deep.",
  kills="The shallows are safe to the ankle. The floor stops without warning at the edge of the deep, and something lives in the centre.",
  route="From the gap to the drinkers at the shore (1), out over the amber mats (2), to the edge where the floor stops (3), on to the centre as something rises (4), then straight up into the pull-back to orbit.",
  moves="Rings spreading on the water, filaments swaying toward the centre, threads of bubbles, mist at the foot of the cliffs, drinkers, the water doming at the centre.",
  layout="Scale bar 500 m. The lake is about 2 km across."),
}
CRIT = {
 'B-est-t60': "Blind packet 11 (this image): Sol 9 FILM, Opus 8 FILM, Carbon 5 PAINTING. Blind packet 10 (the same image): 8 FILM, 8 FILM, 9 FILM. Same-location test 3: all six details of step 1 placed in the correct wide view.",
 'B-d1-t42': "Not blind-tested. Its parent `B-d1-t32` scored FILM 7 / FILM 6 / FILM 5 in blind packet 12 (Sol / Opus / Carbon) and was placed in the correct wide view by all three critics in same-location test 3.",
 'B-d2-t42': "Not blind-tested. Its parent `B-d2-t20` scored FILM 7 / FILM 5 / AMATEUR 4 in blind packet 13 (Sol / Opus / Carbon) and was placed in the correct wide view by all three critics in same-location test 3.",
}
PARENT = {'B-d1-t42': 'B-d1-t32', 'B-d2-t42': 'B-d2-t20', 'ribs-d3c-t1': 'ribs-d3-t2', 'eye-d2c-t2': 'eye-d2b-t2', 'eye-d4c-t2': 'eye-d4-t1'}
STEP1_PARENTS = ('B-d1-t32', 'B-d2-t20')

def ref_lines(tid, n_indent='  '):
    t = L['takes'][tid]; out = []
    est_ids = {P[p]['est'] for p in P['order']}
    for i, r in enumerate(t['refs'], 1):
        b = os.path.basename(r)
        if '/real/' in r:
            out.append(f"{n_indent}{i}. `working/real/{b}`: real photograph, {CRED.get(b, 'see working/real/CREDITS.md')} . Supplied only as a rendering standard (how a real camera records this kind of light, surface or animal); the prompt tells the model to copy nothing in it.")
        elif '/gen/' in r:
            rid = b[:-4]
            if PARENT.get(tid) == rid: role = "the frame being revised (\"re-shoot the same frame, change only these things\")"
            elif rid in est_ids: role = "the establishing view of this place, supplied as the place itself (\"the same place, at the same moment\")"
            elif rid == 'eye-d1-t1': role = "detail 1 of this place, supplied only to show what the animals of this lake look like"
            else: role = "a round 3 take of my own"
            out.append(f"{n_indent}{i}. `working/takes/{rid}.jpg`: take `{rid}`, {role}")
        elif '/layout/' in r:
            out.append(f"{n_indent}{i}. `working/layouts/{b}`: a 768 x 432 blurred copy of an earlier round 3 take of my own (B-est-t38), supplied for positions only")
        else: out.append(f"{n_indent}{i}. `{r}`")
    return out

def entry(title, kept_path, tid, keepkey):
    t = L['takes'][tid]; k = L['kept'][keepkey]; o = []
    o.append(f"#### {title}\n")
    o.append(f"- Kept image: `{kept_path}` (take `{tid}`, generated {t['t']} UTC, {t['secs']} s, {t.get('size', '1672x941')})")
    o.append(f"- Model: `{t['model']}`")
    o.append(f"- Prompt: `working/prompts/{t['prompt']}.txt`, full text below")
    o.append("- References passed to the generator, in order:"); o += ref_lines(tid)
    if tid in PARENT:
        p = L['takes'][PARENT[tid]]; where = 'full text in part two of this file' if PARENT[tid] in STEP1_PARENTS else 'full text below, after the revision prompt'
        o.append(f"- Lineage: a single-step revision of `{PARENT[tid]}`, which was generated by `{p['model']}` from prompt `working/prompts/{p['prompt']}.txt` ({where}) with these references:"); o += ref_lines(PARENT[tid])
    o.append(f"- Why kept: {k['reason']}"); o.append(f"- Known faults: {k['faults']}")
    o.append(f"- Critics: {CRIT.get(tid, 'Not blind-tested. Chosen by my own eye from the full-size takes.')}")
    o.append(f"\nPrompt `{t['prompt']}`:\n\n```text\n{open(f'{R}/prompts/' + t['prompt'] + '.txt', encoding='utf-8').read().strip()}\n```\n")
    if tid in PARENT and PARENT[tid] not in STEP1_PARENTS:
        pp = L['takes'][PARENT[tid]]['prompt']
        o.append(f"Prompt `{pp}` (the parent take `{PARENT[tid]}`):\n\n```text\n{open(f'{R}/prompts/' + pp + '.txt', encoding='utf-8').read().strip()}\n```\n")
    return o

def save(tid, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True); Image.open(f'{R}/gen/{tid}.png').convert('RGB').save(dst, quality=93, optimize=True)

if os.path.isdir(K): shutil.rmtree(K)
N = []; files = 0
models = Counter(L['takes'][k]['model'] for k in L['order'])
N.append("# The Carcass, round 3: notes on the kept images\n")
N.append("This file lists the model, the prompt and the references for every kept image of round 3. Part one is the full set of step 2: six places and the reveal from orbit, 31 pictures, in direction B (Titan-fall). Part two is step 1: the nine pictures of the three art directions for The Breath. Nothing from rounds 1 or 2 was used as an input anywhere.\n")
N.append("## How the set was made\n")
N.append(f"- Takes generated in round 3: {len(L['order'])} ({', '.join(f'`{m}` {n}' for m, n in models.most_common())}). Step 1 used 226. Batch 23, one revision of each step 1 detail, used 16. Step 2 used 70: 18 for the establishing views and the reveal, 44 for the details, 2 for one redo, 6 for three single-step fixes. Every kept image is from `gpt_image_2_6_sunburst`. Every take is in `working/takes/`; the take-to-prompt mapping, my notes and the critic replies are in `working/log.json`.")
N.append("- Direction. No pick of an art direction was given. After step 1 was shown, the user asked for speed and for the work not to stop, so step 2 ran in B, Titan-fall, which was my recommendation. A (Overgrowth) or C (Corpse-light) can still be picked; the full set would then be remade in that direction.")
N.append("- Establishing views of step 2: a fresh generation from text plus one real public-domain photograph (two for The Spine), supplied only as the standard for how a camera records that kind of light and weather. Two or three takes per subject, one kept.")
N.append("- Details of step 2: a fresh generation with two references that have separate jobs. Image 1 is the establishing view of the place, supplied as the place itself (\"the same place, at the same moment\"). Image 2 is a real photograph, supplied only as a rendering standard: lava, surf, snow, bare hide, a wading bird. Two takes per detail, one kept. One detail was redone with a changed approach (The Eye, detail 2).")
N.append("- Three single-step fixes at the end (batch 30, two takes each), each a \"re-shoot the same frame, change only this\" revision: the near kite-wing in The Ribs detail 2 had an eye, the drinker in The Eye detail 2 read as a horse, and the two drinkers in The Eye detail 4 had ears and wool. The rule they broke is my own: nothing living in the film has eyes or ears; the only eye is the dead one.")
N.append("- The Breath carries its establishing view over from step 1 unchanged. Its details 1 and 2 are the one-step revisions of the step 1 details made in batch 23; details 3 and 4 are new.")
N.append("- How the step 2 pictures were chosen: by my own eye, from full-size views, with the faults written down as found. They were not blind-tested. The blind scores of step 1 are quoted only where they apply to the picture or to its parent.")
N.append("- Layout sketches: drawn by a script (`working/tools/layouts.py`), not generated. Positions follow the pictures; distances and scale bars are design intent for the build and were not measured from the pictures.")
N.append("- Real photographs: all from Wikimedia Commons, public domain or CC0 for every one passed to the generator. Each is credited under the image it was used for and in `working/real/CREDITS.md`.")
N.append("- Detail numbers are the order in which the camera reaches them, which is not always the order in which they were generated; the take names keep the generation order (for example `ribs-d2-t1` is detail 1 of The Ribs).\n")
N.append("## Part one: the full set, direction B (Titan-fall)\n")
N.append("The rule of the direction: the body is the land, bare as geology. Life gathers only where the body still leaks something. Each place has its own colour, weather and animals. The killer is the place itself, and it is in the frame as a line you should not cross.\n")
for n, pl in enumerate(P['order'], 1):
    p = P[pl]; T = TXT[pl]; d = f"{n}-{pl}"; rel = f"step-2-full-set/{d}"
    N.append(f"### {p['title']} (place {n} of 6)\n")
    N.append(f"- The place: {T['place']}"); N.append(f"- What lives there: {T['life']}"); N.append(f"- How it kills you: {T['kills']}")
    N.append(f"- The camera route: {T['route']}"); N.append(f"- What moves, for the build: {T['moves']}")
    N.append(f"- Layout sketch: `{rel}/{pl}-layout.png`. {T['layout']}"); N.append(f"- Contact sheet: `{rel}/{pl}-contact-sheet.jpg`\n")
    f = f"{pl}-0-establishing.jpg"; save(p['est'], f"{K}/{d}/{f}"); files += 1
    N += entry(f"{p['title']}: establishing view", f"{rel}/{f}", p['est'], f"{pl}-establishing")
    for i, (name, tid) in enumerate(p['details'], 1):
        f = f"{pl}-{i}-{slug(name)}.jpg"; save(tid, f"{K}/{d}/{f}"); files += 1
        N += entry(f"{p['title']}: detail {i}, {name[0].lower() + name[1:]}", f"{rel}/{f}", tid, f"{pl}-detail-{i}")
    shutil.copy(f"{R}/layout2/{pl}-layout.png", f"{K}/{d}/{pl}-layout.png"); shutil.copy(f"{R}/out/contact/{pl}-contact-sheet.jpg", f"{K}/{d}/{pl}-contact-sheet.jpg")
rel = "step-2-full-set/7-reveal"; save('reveal-est-t3', f"{K}/7-reveal/reveal-from-orbit.jpg"); files += 1
shutil.copy(f"{R}/out/contact/reveal-contact-sheet.jpg", f"{K}/7-reveal/reveal-contact-sheet.jpg")
N.append("### The Reveal\n")
N.append("- The shot: the camera rises straight up out of The Eye until the whole continent is in frame. An astronaut's view from about four hundred kilometres, oblique toward the horizon. The continent, about three thousand kilometres long, is the titan lying on its side.")
N.append("- What reads as the body: the skull massif with the round lake where the eye was, a hooked jaw peninsula, the spine as a snow range running the length of the land, the ribs as curved ridges that end in capes, the caldera with its fume plume (The Heart), the steaming pale shelf beside it (The Breath), the red river system and its delta (The Blood Marsh), and an arm ending in five spits.")
N.append("- What makes it read at real scale: the curved limb and the thin line of atmosphere, sunglint on the sea, fields of small cumulus with their own shadows, lee-wave cloud off the range, a frontal band across the ribs, one cyclone over the open sea.")
N.append(f"- Contact sheet: `{rel}/reveal-contact-sheet.jpg`. Its lower half marks where the six places sit on the body; those positions were read off the picture and are approximate.\n")
N += entry("The Reveal: the continent from orbit", f"{rel}/reveal-from-orbit.jpg", 'reveal-est-t3', 'reveal')

old = open(f'{R}/out/NOTES-step1.md', encoding='utf-8').read() if os.path.exists(f'{R}/out/NOTES-step1.md') else None
if old is None:
    old = open(f'{R}/out/NOTES.md', encoding='utf-8').read(); open(f'{R}/out/NOTES-step1.md', 'w', encoding='utf-8').write(old)
body = old[old.index('## A. Overgrowth: establishing view'):]
body = body.replace('step-1-art-directions/', 'working/')
body = re.sub(r'^## ', '### ', body, flags=re.M)
N.append("## Part two: step 1, three art directions for The Breath\n")
N.append("Nine pictures: three art directions for The Breath, each one establishing view and two detail views of the same location, as shown at the end of step 1. The establishing view of B is the one used in the full set. The two B details shown here are the step 1 versions (`B-d1-t32`, `B-d2-t20`); the full set uses their one-step revisions.\n")
N.append("- Method for the kept establishing views: a fresh generation with two references that have separate jobs. Image 1 is a public-domain real photograph, supplied only as the standard for how a camera records light. Image 2, where used, is a small blurred copy of an earlier take of my own, supplied only for where things are.")
N.append("- Method for the kept details: a fresh generation from the establishing view (\"the same place, at the same moment\"), with the same real photograph again as the rendering standard.")
N.append("- Two establishing views (A and C) were then revised once with a \"re-shoot the same frame, change only these things\" prompt. Earlier in the round, chains of such revisions grew a repeating texture, so revisions are limited to a single step.\n")
extra = ("- Blind packets 12 and 13 (`cal12`, `cal13`), run after the step 1 hand-over: the six detail views scored for realism for the first time, each packet with three real animal photographs and two round 2 frames. REAL 0 to 10 and the critic's guess at the source, Sol / Opus / Carbon: A detail 1 FILM 8 / FILM 6 / PAINTING 4; A detail 2 FILM 8 / FILM 6 / AMATEUR 5; B detail 1 FILM 7 / FILM 6 / FILM 5; B detail 2 FILM 7 / FILM 5 / AMATEUR 4; C detail 1 FILM 7 / FILM 5 / FILM 6; C detail 2 FILM 7 / FILM 6 / AMATEUR 6. The real animal photographs scored 10 from every critic; the round 2 frames 1 to 6. By the rule fixed before the results were seen, the two A details pass, the four B and C details are borderline and none fails.\n"
         "- Batch 23: one revision of each of the six details (16 takes), with a real photograph of bare hide, a wading bird or soft tissue as the standard and the faults the critics named as the only changes. The two B revisions (`B-d1-t42`, `B-d2-t42`) were adopted by eye for the full set. They were not re-tested blind. The A and C revisions were not judged, because A and C are not carried forward unless one of them is picked.\n")
marker = '- Same-location tests 2 and 3'
body = body.replace(marker, extra + marker, 1) if marker in body else body + '\n' + extra
N.append(body.rstrip() + '\n')
open(f'{R}/out/NOTES.md', 'w', encoding='utf-8').write('\n'.join(N))

README = f"""# The Carcass: reference images, round 3

Round 3 is images and layout sketches only. No 3D was built. Rounds 1 and 2 were rejected and sit untouched in `../archive/`. Nothing from them is reused as a generation input here; round 2 frames were shown to blind critics as negative controls only.

The full set is ready in direction B, Titan-fall. No pick of a direction was given: after step 1 the user asked for speed and for the work not to stop, so step 2 ran in the direction I had recommended. A (Overgrowth) or C (Corpse-light) can still be picked from the step 1 material, and the set would be remade in it.

- `step-2-full-set/`: the deliverable. One folder per place in film order (`1-ribs`, `2-heart`, `3-breath`, `4-marsh`, `5-spine`, `6-eye`). Each holds the establishing view (`-0-establishing`), four detail views numbered in the order the camera reaches them, the top-down layout sketch with the detail positions and the camera route, and the contact sheet. `7-reveal/` holds the reveal from orbit and its sheet, which also marks where the six places sit on the body.
- `NOTES.md`: model, prompt and references for every kept image, with why it was kept and its known faults. Part one is the full set, part two is step 1.
- `ART-DIRECTIONS.md`: step 1. The three art directions for the hardest place, The Breath; which I would choose and why; what the blind critics said; build approach; and what happened between step 1 and step 2.
- `step-1-kept/`: the nine step 1 images at full size and one sheet per direction.
- `working/`: the working files.
  - `takes/`: every take of the round as JPEG ({len(L['order'])} takes). Step 1 names are `<direction>-<view>-t<nn>`; step 2 names are `<place>-<view>-t<n>`, with `est` for the establishing view and `d1` to `d4` for details.
  - `prompts/`: the exact prompt text of every take (the take-to-prompt mapping is in `log.json`).
  - `critics/`: the briefs given to the blind critics, the answer key of each packet and every critic reply, unedited. Step 2 was not blind-tested.
  - `real/`: real photographs, with credits in `CREDITS.md`. Some were shown to the critics as controls only. Others were passed to the image generator as a rendering reference (how a camera records light, a surface or an animal), never for their content.
  - `layouts/`: the small blurred layout images supplied to the generator for positions only in step 1.
  - `sheets/`: triage sheets.
  - `tools/`, `jobs/`: the scripts and batch definitions used in the run, including `layouts.py`, which draws the layout sketches, and `places.json`, which names the kept take for every view.
  - `log.json`: the running log: decisions, takes, my notes on each take, critic results, statuses.
"""
open(f'{R}/out/README.md', 'w', encoding='utf-8').write(README)
print('kept images', files, '| NOTES.md', os.path.getsize(f'{R}/out/NOTES.md'), 'bytes |', sum(len(fs) for _, _, fs in os.walk(K)), 'files in', K)
