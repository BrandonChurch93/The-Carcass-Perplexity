#!/usr/bin/env python3
"""Final detail prompts, re-shot from the establishing takes chosen after edit 4/5 (A t28, B t34, C t29)."""
import json
P = '/home/user/workspace/r3/prompts/'
HEAD = "Image 1 is the wide establishing frame of a location in a big-budget natural-history film about an alien world. Make another frame from the same film: the same location at the same moment, with the same light, weather, colours, materials and living things as image 1, and the same real location-photography look. This frame is a detail found inside image 1 after moving into the scene. Output a wide 16:9 landscape frame.\n\n"
TAIL = "\n\nTrue lens perspective and focus fall-off, fine physical surface detail, natural light only, slight film grain, restrained natural colour. Nothing is posed or centred: the subject is caught mid-action, partly cut by the edge of the frame, and no two things in the frame are alike. It must read as a photograph of a real thing in a real place, not artwork and not a studio subject: the surroundings continue past every edge of the frame. No people, no buildings, no cameras, drones or equipment, no text, no watermark, no border."
D = {}
D['A-d1d'] = """VIEWPOINT. Crouched low on the wet gravel, one metre from the animal that lies on the bank at the right-hand end of the herd in image 1. 100 mm macro lens, shallow focus.

IN FOCUS. The animal is not resting. It is one of the herd, dead for days: the same mottled grey-brown hide, sunken between the ribs, green with moss along the flank. Out of its back and shoulder grows a crowd of pale leathery bladders, from the size of a fist to the size of a melon, matte and slightly wrinkled, each with a small dark pore; two are collapsed and brown. One bladder has just split: a slow roll of fine golden dust is leaving it and drifting to the left, lit from behind by the light of the skylight so every grain shows. A few small four-winged insects lie dead on the bladder skins. Water drops hang from the moss.

BACKGROUND, soft but recognisable from image 1. The river and two of the living herd still drinking a few metres away, unaware; beyond them the forest island with its red-crowned trees, the broad waterfall dissolving into spray, and the dark roof of the cave around the one bright skylight."""
D['A-d2d'] = """VIEWPOINT. Down at the river's edge, low, forty metres from the animals drinking side by side in image 1. 400 mm telephoto lens, shallow focus.

IN FOCUS. Three of the grazing animals from image 1 at the water's edge, exactly as they are in image 1 but seen close: the size of oxen, heavy and long-bodied, with a thick neck, a broad blunt eyeless head, a long thick tail and wet mottled grey-brown hide. One is drinking; one lifts its head with water running from its mouth; the third stands a little apart, thinner than the others, breathing with its mouth open: along its spine and shoulder a row of small pale leathery bladders has begun to push out through its hide. Fine golden dust drifts across them in the slanting light. Their reflections and slow ripples lie on the shallow water.

BACKGROUND, soft but recognisable from image 1. The foot of the forest island: tree-fern trunks, the pale trunks of the red-crowned trees, the base of the broad waterfall as a bright blur of spray, and the dark wet wall of the cave behind."""
D['B-d1d'] = """VIEWPOINT. Standing at the broken lip of the large shaft on the right of image 1, beside the fallen slabs, looking along the curve of the lip and down into the shaft. 28 mm lens, deep focus.

IN FOCUS. The undercut lip of pale bone-rock, wet and finely cracked. Just inside it, the band of deep crimson feathery gill-plumes from image 1, pressed flat upward against the wall by the rush of air and shedding beads of water. Below them the hoops of ivory cartilage of the shaft wall, exactly as in image 1: rounded, sagging, each as thick as a house, drip-stained and cracked, one below another, curving away around the shaft and sinking into darkness; one is broken through, leaving a black gap. Cold white vapour wells up past them out of the dark and spills over the lip. On the top of the first hoop, as on a ledge, lie the pale bones and one fresh body of the white stilt-legged wading animals that came too close, half grown over by plumes.

BACKGROUND, recognisable from image 1. The far lip of the shaft forty metres away, the flat wet shelf beyond it with a leaning vapour column, and the low sun as a pale glow in the fog, just outside the frame."""
D['B-d2d'] = """VIEWPOINT. Very low at the edge of the shallows, twenty metres from the seven white animals that stand in the water in image 1. 400 mm telephoto lens, shallow focus.

IN FOCUS. Four of the white wading animals from image 1, seen close for the first time: bone-white and hairless, the size of a goat, each standing on four thin stilt legs twice as long as its body, with an arched neck and a small eyeless head that ends in a bundle of thin feeding tendrils. Two feed with their heads under the water. One has raised its head into the wind, water streaming from its tendrils. The fourth is a little apart and lower down, where the heavy white vapour lies in a hollow of the shelf: it has gone down on its folded legs inside the vapour, head sinking. Reflections and ripples on the shallow pale teal water; backlit by the low sun, which is outside the frame, with bright rims on their backs and legs.

BACKGROUND, soft but recognisable from image 1. The far flock out of focus, one leaning vapour column, and far away in the fog the snow-streaked cliff with its huge ragged cave mouth pouring fog."""
D['B-d3d'] = """VIEWPOINT. Kneeling at the edge of the tide channel in image 1, looking down and across the water at a steep angle. 50 mm lens. The sun is outside the frame.

IN FOCUS. A drowned shaft: a round hole one metre across in the bed of the channel, its first rounded hoop of ivory cartilage just visible under thirty centimetres of clear pale teal water, breathing out. Above it the water domes up and boils with big cold silver bubbles that burst into a low white vapour, which slides away across the surface. A ragged ring of crimson gill-plumes around the hole sways outward with each pulse. A dozen small pale shrimp-like animals float belly-up in the vapour downwind, and one, still alive, kicks slowly at the edge of it. The bed of the channel is smooth pale bone-rock with fine cracks.

BACKGROUND, soft but recognisable from image 1. The channel running on across the bare wet shelf, the ragged lip of the large shaft with its crimson band and thin vapour, the white animals tiny in the shallows, and the sun glitter on the water."""
D['C-d1d'] = """VIEWPOINT. Forty centimetres from the skin of the brightly glowing sac beside the animal in the middle of image 1. 100 mm macro lens, very shallow focus, available light only.

IN FOCUS. The wet leathery membrane of the sac: branching dark veins, fine wrinkles, beads of condensation, each bead holding a point of the glow. Through the skin, against the cold green-white light inside, hangs the dark shape of a caught animal the size of a hare, with six thin limbs and a long tail, half dissolved, one limb still pressed against the inside of the skin. A pale moth-like animal walks on the outside of the membrane, and the folded skin of a collapsed dead sac sags into the corner of the frame.

BACKGROUND, soft but recognisable from image 1. The dark ash slope, other sacs as dim discs of green-white light in the mist along the stream, the cliff with the faint glow inside its cave, and the last band of dull orange afterglow under the cloud."""
D['C-d2d'] = """VIEWPOINT. On the ash of the valley floor, fifteen metres from the animal that stands at the brightly glowing sac in the middle of image 1. 200 mm lens, shallow focus, available light only.

IN FOCUS. The animal from image 1, exactly as it is there but seen close, from the side and behind and partly cut by the edge of the frame: as tall as a horse, heavy, with dark banded hide, a long low head without eyes, steam leaving its mouth. It has stopped one metre from the glowing sac with its head stretched toward the light, lit only by the cold green-white glow, which rims its neck and shoulder and shines in the wet on its hide. Thin wet ropes of tissue from the sac already lie looped around two of its legs, and one is pulling tight. Pale moth-like animals turn in the light between it and the sac.

BACKGROUND, soft but recognisable from image 1. The stream mirroring the lights, the dim leathery domes of other sacs down the valley, mist draining along the ground, and the dark cliff with the glow inside its cave under the last dull afterglow."""
for k, v in D.items(): open(P + k + '.txt', 'w').write(HEAD + v + TAIL)
G = '/home/user/workspace/r3/gen/'
REF = {'A': 'A-est-t28', 'B': 'B-est-t34', 'C': 'C-est-t29'}
START = {'A-d1': 7, 'A-d2': 7, 'B-d1': 7, 'B-d2': 7, 'B-d3': 3, 'C-d1': 7, 'C-d2': 7}
jobs = []
for i in range(2):
    for k in D:
        slot = k[:-1]
        jobs.append({'id': f'{slot}-t{START[slot]+i:02d}', 'model': 'gpt_image_2_6_sunburst', 'prompt': k, 'refs': [G + REF[k[0]] + '.png'], 'what': f'detail re-shot from {REF[k[0]]}'})
json.dump(jobs, open('/home/user/workspace/r3/jobs/b13.json', 'w'), indent=1)
print(len(jobs), [j['id'] for j in jobs])
