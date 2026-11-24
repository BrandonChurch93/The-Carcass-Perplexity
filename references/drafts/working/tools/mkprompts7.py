#!/usr/bin/env python3
# Batch 7: detail views re-shot from the restraint-pass establishing picks (A take 21, B take 21, C take 22).
# Image 1 = the establishing frame of that direction. Three detail ideas per direction; two will be kept.
R = '/home/user/workspace/r3/prompts'
HEAD = "Image 1 is the wide establishing frame of a location in a big-budget natural-history film about an alien world. Make another frame from the same film: the same location at the same moment, with the same light, weather, colours, materials and living things as image 1, and the same real location-photography look. This frame is a detail found inside image 1 after moving into the scene. Output a wide 16:9 landscape frame."
TAIL = "True lens perspective and focus fall-off, fine physical surface detail, natural light only, slight film grain, restrained natural colour. Nothing is posed or centred: the subject is caught mid-action, partly cut by the edge of the frame, and no two things in the frame are alike. It must read as a photograph of a real thing in a real place, not artwork and not a studio subject: the surroundings continue past every edge of the frame. No people, no buildings, no cameras, drones or equipment, no text, no watermark, no border."
P = {
'A-d1b': """VIEWPOINT. Crouched low on the wet moss, one metre from the old carcass that lies sunk in moss on the rock ledge in the lower right of image 1. 100 mm macro lens, shallow focus.

IN FOCUS. Three of the carcass's ribs, draped in wet moss, with a crowd of pale leathery bladders growing out from between them, from the size of a fist to the size of a melon, matte and slightly wrinkled, each with a small dark pore; two are collapsed and brown. One bladder has just split: a slow roll of fine golden dust is leaving it and drifting to the left, lit from behind by a stray beam of sunlight so every grain shows. A few small four-winged insects lie dead on the bladder skins. Water drops hang from the moss.

BACKGROUND, soft but recognisable from image 1. The dark river, and beyond it the first forest island standing in its shaft of sun with the thin waterfall, under the dark wall of the tunnel with its pale hoops.""",
'A-d2b': """VIEWPOINT. Down at the river's edge, low, forty metres from the herd that drinks at the water's edge below the forest island in image 1. 400 mm telephoto lens, shallow focus.

IN FOCUS. Three of the six-legged grazing animals from image 1 at the water's edge: the size of oxen, low-backed, with wet mottled grey-brown hide and small eyeless heads. One is drinking; one lifts its head with water running from its mouth; the third stands a little apart, thinner than the others, breathing with its mouth open: along its spine and shoulder a row of small pale leathery bladders, the same growth as on the old carcass in image 1, has begun to push out through its hide. Fine golden dust drifts across them in the slanting sunlight. Their reflections and slow ripples lie on the shallow water.

BACKGROUND, soft but recognisable from image 1. The foot of the forest island: tree-fern trunks, the pale trunks of the red-crowned trees, the base of the thin waterfall as a bright blur of spray, and the dark wet wall of the tunnel behind.""",
'A-d3b': """VIEWPOINT. Standing at the edge of the first forest island in image 1, looking up along the shaft of sunlight toward the skylight. 135 mm lens.

IN FOCUS. Seven or eight four-winged flyers, each the size of a heron, with thin translucent membrane wings lit from behind, circling upward inside the shaft at different heights and feeding on drifting golden dust. Behind them the thin waterfall falls from the ragged edge of the skylight and breaks into spray that hangs in the beam. Roots and ribbon vines hang from the rim.

BACKGROUND AND EDGES, recognisable from image 1. One pale cartilage hoop of the tunnel roof curving past the skylight in deep shadow, the tongue of cloud sliding under the roof, and at the bottom of the frame the dark red and green crowns of the island's trees.""",
'B-d1b': """VIEWPOINT. Standing on the shelf six metres from the rim of the nearest large throat, the one on the right in image 1, at the height of the rim, looking along it. 85 mm lens, shallow focus.

IN FOCUS. The wet rim of the throat: stacked ivory cartilage rings, stained, chipped and dripping. Dense cold white vapour pours up out of the dark hole behind the rim and rolls over it. Crimson feathery gill-plumes crowd the rim in a ragged band, bent flat outward by the rush of air, shedding beads of water from their tips. Two small dark flyers that crossed the breath lie dead and wet among the plumes, and the nearest plumes are slowly closing over one of them. A few pale barnacle-like cones of different sizes sit on the rings, some with their lids open.

BACKGROUND, soft but recognisable from image 1. The pale teal tide channel, two of the long-legged striders small in the distance, other vapour columns leaning the same way, and the low sun as a pale disc in the fog.""",
'B-d2b': """VIEWPOINT. Very low, just above the water of the tide channel in image 1, looking along it. 300 mm telephoto lens, shallow focus.

IN FOCUS. One of the striders from image 1, exactly the same kind of animal as it appears there, seen from the height of its knees and partly cut by the top of the frame: a small pale hairless body carried high on very long, thin, jointed stilt legs planted in the shallow teal water, its small eyeless head on a short neck lowered to the bank, where it is pulling at a bed of crimson gill-plumes; the plumes nearest its mouth have snapped back into their tubes. Water streams from one lifted leg. Its skin is wet, pale and faintly translucent, with old scars. Small bubbles rise through the water around its feet, and its reflection breaks on the ripples.

BACKGROUND, soft but recognisable from image 1. A second strider farther off, vapour drifting low across the channel from a ringed throat, and far away in the haze the broken ribbed windpipe lying at the foot of the snow-streaked hills under the low sun.""",
'B-d3b': """VIEWPOINT. Kneeling at the edge of the tide channel in image 1, looking down and across the water at a steep angle. 50 mm lens.

IN FOCUS. A drowned throat: a ring of ivory cartilage one metre across lying under thirty centimetres of clear pale teal water, breathing out. Above it the water domes up and boils with big cold silver bubbles that burst into a low white vapour which slides away across the surface. A ragged ring of crimson gill-plumes around it leans outward, swaying with each pulse. A dozen small pale shrimp-like animals float belly-up in the slick of vapour downwind, and one, still alive, kicks slowly at the edge of it. The rock under the water is pale porous bone with black-green weed.

BACKGROUND, soft but recognisable from image 1. The channel running on across the shelf in its S curve, a large ringed throat with its vapour column, the long-legged striders tiny in the distance, the low sun and its glitter on the water.""",
'C-d1b': """VIEWPOINT. Forty centimetres from the skin of the largest air sac in the nearest bunch, the one in the lower left of image 1. 100 mm macro lens, very shallow focus, available light only.

IN FOCUS. The wet leathery membrane of the sac: branching dark veins, fine wrinkles, beads of condensation, each bead holding a point of the glow. Through the skin, against the cold blue-green light inside, hangs the dark shape of a caught animal the size of a hare, with six thin limbs and a long tail, half dissolved, one limb still pressed against the inside of the skin. A pale moth-like animal walks on the outside of the membrane, and the folded skin of a collapsed dead sac sags into the corner of the frame.

BACKGROUND, soft but recognisable from image 1. Other bunches as dim discs of blue-green and amber light in the mist along the black stream, and the last band of dull afterglow above the dark cliff.""",
'C-d2b': """VIEWPOINT. On the wet rock of the valley floor, thirty metres from the large six-legged animal that walks toward a lit bunch of sacs in image 1. 200 mm lens, shallow focus, available light only.

IN FOCUS. The animal from image 1, seen from the side and behind and partly cut by the edge of the frame: shoulder-high to a horse, with wet dark hide, a low heavy head without eyes, steam leaving its mouth. It has stopped one metre from the nearest glowing sac with its head lifted toward the light, lit only by the cold blue-green glow, which rims its neck and shoulder and shines in the wet on its hide. Thin wet ropes of tissue from the bunch already lie looped around two of its legs. Pale moth-like animals turn in the light between it and the sac.

BACKGROUND, soft but recognisable from image 1. The black stream mirroring the lights, more bunches of sacs dimmer and bluer down the valley, mist draining along the ground, and the dark cliff with its breathing cave mouths under the last dull afterglow.""",
'C-d3b': """VIEWPOINT. Beside the black stream in image 1 at knee height, looking along the side of a bunch of sacs. 85 mm lens, shallow focus, available light only.

IN FOCUS. A puckered pore in the skin of a sac at the moment it exhales: a jet of faintly luminous mist rolls out and sinks toward the wet rock. Six or seven pale moth-like animals spiral into the jet; two are already stuck to the wet lip of the pore, wings spread, and the skin is slowly folding over one of them.

BACKGROUND, soft but recognisable from image 1. The valley receding as scattered bunches of dim lights in low mist, the stream mirroring them, the dark cliff with its cave mouths and the last band of dull afterglow.""",
}
for k, body in P.items():
    open(f'{R}/{k}.txt', 'w').write(HEAD + '\n\n' + body + '\n\n' + TAIL + '\n'); print(k, len(body))
