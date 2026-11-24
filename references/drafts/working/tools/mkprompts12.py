#!/usr/bin/env python3
"""Windows, prompts and jobs for the fine plates of the second wide carcass frame (parent gen/cx-e-t2.png).
16 grid windows + 5 windows centred on the head, the storm and hips, both lower legs and the lower hand.
Every window is 660 px of the 1982 px wide frame (557 x 313 px of the 1672 px parent), enlarged 3.0x.
usage: mkprompts12.py <batch e.g. b56>"""
import sys, json, cv2, numpy as np
R = '/home/user/workspace/r3/'; batch = sys.argv[1]
PARENT = 'gen/cx-e-t2.png'
k = 1982 / 1672
HEAD = """Image 1 is a soft, low-resolution enlargement of one part of a photograph taken from very high orbit. It shows part of a continent on an alien ocean world. The continent is the carcass of a titan of human shape that died ages ago and weathered into land: its bare bones are pale mountain belts, what is left of its dried hide is dark plateau, and a dark stained sea lies in and around it. Make the same view again as a sharp photograph taken from a lower orbit, looking straight down. This is the same camera at a lower height; nothing on the ground has moved.

Keep everything exactly where it is in Image 1 and exactly the shape it is: every coastline, bay, cape and island, every ridge, basin and pit, every patch, band and bank of cloud and haze, every change of colour in the sea, the edges of the frame. Keep the colours and the light. Do not move, add or remove any landform or any large cloud. Add only what a sharper, lower photograph would show.

The other images are real photographs taken from orbit. Use them only as the standard for how real land, shallows, deep water and cloud look at this height: flat, fine-grained, slightly hazy. Do not copy what they show.

The frame is about sixteen hundred kilometres wide. At this scale no single hill, cliff, wave or cloud puff can be picked out.
- Pale land is bare limestone mountain country: belts of fine wrinkled ridges cut by hair-thin branching valleys, a dusting of snow on the highest crests, grey scree and pale fans at their feet, salt and sand in the basins. Where Image 1 shows smooth, waxy, carved, scalloped, terraced, cracked or honeycombed surfaces, that is only the softness of the enlargement: replace it with this fine real terrain, keeping the same outlines. Up close nothing looks like bone: no smooth bone surface, no knuckle, no polished knob; each is a mountain range made of thousands of small ridges and valleys.
- Dark red-brown land is low plateau, the dried hide: charcoal brown, rust and dull oxblood, finely dissected by branching dry valleys and thin washes, with dark screes, its edges breaking down into the sea in cliffs, stacks and reefs. No bold cracks and no polygon pattern.
- Relief is flat to the eye, as it is from orbit. Nothing is embossed, carved, sculpted, polished or shiny, and nothing stands up like a model. The land shows by its colour, not by shading: a ridge is a hair of light on its sunward side and a hair of soft blue-grey shade on the other, no darker than the sea. A thin blue-grey haze of air lies over everything and lowers the contrast of the land.
- Coasts are ragged and real, with coves, spits, lagoons, reefs and small islands, fringed with pale jade-grey shallows of uneven width that fall away into deep water that is nearly black, a cold slate blue. Stained water keeps its milky green, ochre and rust swirls, with fine filaments and eddies inside them.
- All cloud is seen from above and lies flat: very fine white stipple, thin streets, soft bands, fog in bays, each puff tiny with a pin-prick shadow. No cloud looks like smoke, steam or a blast. The sun is low, to the right. Where the sea shines with the sun's glint, the shine is one smooth, even, soft silver-grey sheen with no ripples, bands or texture.

What is in this frame:
"""
TAIL = """
A real photograph through the window of a spacecraft: natural colour, cold, slightly muted by haze, sharp from edge to edge. No people, no text, no labels, no borders. Not a sculpture, not a relief model, not an anatomy chart, not an illustration."""
STORM = ("a storm, seen from straight above. In Image 1 it looks like a puff of smoke; that is only the softness of the enlargement. Make it a real line of thunderstorms caught on the ridge, in the same place and the same size: "
         "several storm cells side by side along the crest, their flat white anvil tops merged into one bright sheet with soft fibrous edges, a few small bubbling domes pushing up through the middle, "
         "a faint violet-white flicker of lightning inside the cloud in two places. The grey streak that trails from it toward the lower left is its thin anvil veil blowing downwind and its soft shadow lying on the sea. "
         "It is weather: no column, no ash, no fire, no blast")
LAKE = "a perfectly round lake: a narrow shelf of amber shallows inside a rim of ivory cliffs, falling to a black-blue centre. Keep the lake perfectly round and exactly where it is"
SKULL = ("a pale massif in the shape of a skull seen from above, face up, crown to the left: a domed crown crossed by one long black fault canyon; two round eye-socket basins, one above the other. "
         "The upper basin is dry and sunk, with a shallow dark pool. The lower basin holds " + LAKE + ". Right of them two dark nose pits, then the upper jaw, a line of blunt uneven sea stacks, some missing; "
         "the open mouth is a dark bay, and the lower jaw curves round its far side as a thin pale range set with its own small uneven stacks")
THROAT = "the throat: low dark red-brown plateau pocked with a dozen round black sinkholes of different sizes, the airways, with thin white vapour drifting flat from several of them toward the upper left"
SALT = "a round white salt flat in its middle, veined with branching channels of dark oxblood-red water, and one small round dark lake on its upper right rim"
HAND = "a hand of five long thin finger ranges, spread, each finger a broken chain of narrow capes and islets in pale jade shallows"
FOOT = "ending in five small toe capes"
PLUME = "stained water: a long plume of rust red and ochre streaming to the right, milky green at its edges"
GLINT = "the sea shines with the sun's glint: one smooth soft silver-grey sheen, no ripples"
OCEAN = "open dark ocean under fields and thin streets of very fine cloud"
ST1, ST2, ST3 = 'real/orb-iss23-musandam.jpg', 'real/orb-gemini11-india-crop.jpg', 'real/orb-modis-barents-bloom.jpg'
TS1, TS2 = 'real/orb-modis-tstorm-phil-crop.jpg', 'real/orb-modis-tstorm-hainan.jpg'
XS = [0, 372, 743, 1115]; YS = [0, 209, 418, 628]
W = {}
def win(name, x0, y0, items, refs, note=''):
    W[name] = dict(x0=x0, y0=y0, items=items, refs=refs, note=note)
win('W00', XS[0], YS[0], [
    "The top left of the frame is black space. The curved edge of the planet crosses the frame as one smooth arc from the left edge up to the top right corner, with a thin bright blue line of atmosphere along it. Keep that edge exactly as it is.",
    "Below it, dim " + OCEAN + ".",
    "At the bottom right corner a sliver of pale land, the shoulder of the carcass, just enters the frame. Keep it where it is."], [ST1, ST2])
win('W10', XS[1], YS[0], [
    "The top left corner is black space and the curved edge of the planet with its thin bright blue line of atmosphere. Keep that edge exactly as it is.",
    "Below it, " + OCEAN + ".",
    "One arm of the carcass, flung up: a pale range rises from the shoulder at the bottom edge, left of centre, to an elbow knot near the middle of the frame; then the forearm, two thin unequal ranges with a slot of water between them, runs to the right to a wrist; then " + HAND + ", reaching to the right. Pale jade shallows lie inside the bend of the arm.",
    "Along the bottom edge, right of the shoulder: the top of the rib cage, the tips of thin curved rib capes, and the upper edge of a matte black lava field."], [ST1, ST2])
win('W20', XS[2], YS[0], [
    OCEAN[0].upper() + OCEAN[1:] + ".",
    "At the left edge, about the middle, the tips of the finger ranges of a hand just enter the frame: thin pale capes and islets in jade shallows. Keep them where they are."], [ST1, ST2])
win('W30', XS[3], YS[0], [
    OCEAN[0].upper() + OCEAN[1:] + ". Toward the right " + GLINT + ".",
    "At the bottom of the frame, right of centre, one foot of the carcass stands up into the frame from the bottom edge: a short pale range " + FOOT + ", pointing up. At the bottom edge, left of centre, a pale knee knot just enters.",
    "A thin rust and ochre stain in the water along the bottom edge."], [ST1, ST2])
win('W01', XS[0], YS[1], [
    "The head of the carcass, on the right half of the frame: " + SKULL + ".",
    "At the right edge, behind the jaw, " + THROAT + ".",
    "To the left and above, " + OCEAN + "; pale jade shallows round the massif."], [ST1, ST2])
win('W11', XS[1], YS[1], [
    "At the left edge: the back of the jaw of the skull massif, and " + THROAT + ".",
    "Next to it a pale shoulder knot, with a collar-bone ridge and one arm range leaving it straight up to the top edge.",
    "The upper half of the chest: a matte black lava field with faint ropy flow lines, lying under a row of eight or nine thin pale rib ranges that cross it side by side, slanting up to the right. One tiny ember-orange spot in the lava between two ribs, with one thin grey-brown fume streak lying flat; nothing else glows.",
    "Below the ribs a dark sea channel runs straight across the frame from left to right: the strait, deep slate water, with a faint pale line of drowned ridge along its floor.",
    "Below the channel, the roots of a second row of thin pale rib ranges, slanting down to the right.",
    "On the right, the backbone: one thin straight pale knife ridge with snow on its crest, standing out of the sea and running to the right edge. At the right edge, on the ridge, the edge of " + STORM + "."], [ST1, ST2, TS1])
win('W21', XS[2], YS[1], [
    "On the left, the backbone: one thin straight pale knife ridge with snow on its crest, running in from the left edge to the hips. On it sits " + STORM + ".",
    "Centre and right: the hips of the carcass, a pale mountain mass with " + SALT + ".",
    "From the hips one straight pale thigh range runs to the right edge, upper right.",
    "Right of the hips, " + PLUME + ".",
    "Top: " + OCEAN + ". At the top left, a few rib tips."], [ST1, ST3, TS1])
win('W31', XS[3], YS[1], [
    "One leg of the carcass, straight: a pale range runs in from the left edge to a knee knot, then on to the right as two thin parallel shin ranges to an ankle, where the foot turns straight up toward the top edge, " + FOOT + ".",
    "Below the leg, " + PLUME + ". At the bottom left, the knee of the other leg just enters.",
    "On the right " + GLINT + "."], [ST1, ST3])
win('W02', XS[0], YS[2], [
    "Top right: the lower part of the skull massif of the carcass: at the top edge " + LAKE + "; the open mouth as a dark bay, with the lower jaw curving round it as a thin pale range set with small uneven stacks.",
    "At the right edge a channel of deep dark water comes out of the chest and runs down to the left into the open ocean.",
    "The rest is " + OCEAN + "."], [ST1, ST2])
win('W12', XS[1], YS[2], [
    "Top left: the back of the jaw of the skull massif, and a channel of deep dark water running down to the left into the open ocean.",
    "Across the top of the frame: the strait, a dark sea channel; at its right end the backbone, a thin pale knife ridge, and at the top right corner the lower edge of a white storm cloud and its soft shadow on the sea.",
    "Centre: the lower half of the rib cage: nine or ten thin pale rib ranges side by side, slanting down to the right from the channel, with dark water and jade shallows between them, and patches of dark red-brown plateau webbing the gaps near their roots.",
    "Left of centre a pale shoulder knot, and from it the second arm: a broad pale range running down toward the bottom right, with long fine parallel ridges along it.",
    "Bottom and left: " + OCEAN + "."], [ST1, ST2])
win('W22', XS[2], YS[2], [
    "Top centre: the lower half of the hips of the carcass, a pale mountain mass; at the top edge the bottom of a round white salt flat veined with dark oxblood-red water.",
    "From the hips a pale thigh range runs to the right to a knee knot at the right edge, where the leg bends sharply back and a thin shin range runs straight down along the right edge.",
    "Top left: the lower edge of a white storm cloud and its soft shadow on the sea, and the tips of the lower ribs.",
    "Bottom left: the hand of the second arm: a wrist knot and " + HAND + ", reaching to the right.",
    "The sea between is stained in broad soft swirls of milky green and ochre, under very fine cloud."], [ST1, ST3])
win('W32', XS[3], YS[2], [
    "Left: the bent leg of the carcass: a pale thigh range runs in from the left edge near the top to a knee knot, then the shin, two thin parallel ranges, runs straight down to the bottom edge.",
    "Top: " + PLUME + ". Top right: " + GLINT + ".",
    "Bottom right: the outer cloud bands of a spiral storm, curved thin white streets seen from straight above.",
    "Round the leg the sea is stained in soft swirls of milky green and ochre."], [ST1, ST3])
win('W03', XS[0], YS[3], [
    OCEAN[0].upper() + OCEAN[1:] + ", and nothing else."], [ST1, ST2])
win('W13', XS[1], YS[3], [
    "Across the top: the second arm of the carcass: a broad pale range enters at the top left and runs to the right, narrowing to a wrist knot right of centre; then " + HAND + ", reaching toward the right edge.",
    "Pale jade shallows along the arm. The rest is " + OCEAN + ", the streets curving gently."], [ST1, ST2])
win('W23', XS[2], YS[3], [
    "Top left: the hand of an arm of the carcass: a wrist knot at the left edge and " + HAND + ", reaching to the right.",
    "Top right: the foot of a bent leg: a thin shin range comes down from the top edge to an ankle, and the foot range points to the right, " + FOOT + ".",
    "The sea in the upper half is stained in soft swirls of milky green and ochre. Lower half: " + OCEAN + ", the streets curving toward a storm off the right edge."], [ST1, ST3])
win('W33', XS[3], YS[3], [
    "Top left: the foot of the bent leg of the carcass: a thin shin range comes down from the top edge to an ankle, and the foot range points to the right, " + FOOT + ", in jade shallows and milky green stained water.",
    "Bottom right: a spiral storm seen from straight above: a tight flat white pinwheel of curved cloud bands round a small clear eye, hundreds of kilometres across. Keep its shape and place.",
    "Top right: " + GLINT + ". The rest: open dark ocean, with thin cloud streets feeding the spiral."], [ST1, ST2])
# windows centred on single places, so that each is photographed once and whole
win('HD', 28, 276, [
    "The head of the carcass fills the middle of the frame: " + SKULL + ".",
    "Right of the mouth, behind the jaw, " + THROAT + ".",
    "At the right edge two pale shoulder knots, one near the top and one near the bottom, with collar-bone ridges; between them the mouth of a dark sea channel, from which a channel of deep dark water runs down to the left, below the jaw, into the open ocean.",
    "Round the head, " + OCEAN + "; pale jade shallows round the massif."], [ST1, ST2], 'head, centred on the lake; frame 2 of the pull-back lies wholly inside it')
win('ST', 790, 281, [
    "On the left, the backbone: one thin straight pale knife ridge with snow on its crest, running in from the left edge to the hips. On it sits " + STORM + ".",
    "At the left edge, above and below the backbone, the tips of the last thin rib ranges.",
    "Centre and right: the hips of the carcass, a pale mountain mass with " + SALT + ".",
    "Two pale thigh ranges leave the hips to the right: the upper one runs straight to a knee knot at the right edge near the top; the lower one runs to a knee knot near the right edge lower down.",
    "Between and beyond the thighs, " + PLUME + ". Below the hips, soft swirls of milky green and ochre."], [ST1, ST3, TS1, TS2], 'backbone, storm, hips and salt flat')
win('WG', 1115, 130, [
    "One leg of the carcass, straight, crossing the lower half of the frame: a pale thigh range comes in from the left edge near the bottom to a knee knot left of centre, then two thin parallel shin ranges run to the right to an ankle, where the foot turns straight up, " + FOOT + ".",
    "On the right and top right " + GLINT + ".",
    "Along the bottom edge, rust and ochre stained water. Above the leg, " + OCEAN + "."], [ST1, ST3], 'straight leg from knee to foot')
win('WF', 1040, 520, [
    "The lower leg of the carcass: two thin parallel pale shin ranges come down from the top edge, left of centre, and run straight down to an ankle knot, where the foot turns to the right: a short pale range " + FOOT + ", pointing right.",
    "Round it the sea is stained in soft swirls of milky green and ochre, with rust-red streaks at the top right.",
    "Bottom right: the outer cloud bands of a spiral storm, curved thin white streets seen from straight above. Left: open sea under very fine cloud."], [ST1, ST3], 'bent leg from below the knee to the foot')
win('WA', 602, 594, [
    "The second arm of the carcass: a broad pale forearm range, with long fine parallel ridges along it, comes in from the top left corner and runs down to the right to a wrist knot left of centre; then " + HAND + ", reaching to the right.",
    "Along the top edge at the left, the tips of thin rib ranges just enter.",
    "Right of the hand the sea is stained in soft swirls of milky green and ochre. The rest is " + OCEAN + "."], [ST1, ST3], 'lower arm from the elbow, and its hand')
par = cv2.imread(R + PARENT)
jobs = []; meta = {}
for name, w in W.items():
    x0, y0 = w['x0'], w['y0']; ww, hh = 660 / k, 660 / k * 941 / 1672
    x0 = min(x0, 1672 - ww); y0 = min(y0, 941 - hh)
    M = np.float32([[1672 / ww, 0, -x0 * 1672 / ww], [0, 941 / hh, -y0 * 941 / hh]])
    crop = cv2.warpAffine(par, M, (1672, 941), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    cp = 'pull/e2-%s-crop.png' % name; cv2.imwrite(R + cp, crop)
    open(R + 'prompts/cxW-%s.txt' % name, 'w').write(HEAD + '\n'.join('- ' + i for i in w['items']) + '\n' + TAIL + '\n')
    refs = [R + cp] + [R + r for r in w['refs']]
    jobs.append(dict(id='e2-%s-t1' % name, model='gpt_image_2_6_sunburst', prompt='cxW-%s' % name, refs=refs,
                     what='fine plate for the second wide carcass frame: window %s of %s (x %d, y %d of 1672x941; 557x313 px) enlarged 3.0x and re-photographed from lower%s; standards %s'
                          % (name, PARENT, x0, y0, ('; ' + w['note']) if w['note'] else '', ' + '.join(r.split('/')[-1] for r in w['refs']))))
    meta[name] = dict(parent_px=[x0, y0, ww, hh], ext_px=[x0 * k, y0 * k, 660, 660 * 941 / 1672])
json.dump(jobs, open(R + 'jobs/%s.json' % batch, 'w'), indent=1)
json.dump(meta, open(R + 'pull/e2-windows.json', 'w'), indent=1)
print(len(jobs), 'jobs'); print(open(R + 'prompts/cxW-ST.txt').read()[-2600:])
