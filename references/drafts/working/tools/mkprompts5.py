#!/usr/bin/env python3
# Batch 5: detail views. Image 1 = the establishing frame of that direction.
R = '/home/user/workspace/r3/prompts'
HEAD = "Image 1 is the wide establishing frame of a location in a big-budget natural-history film about an alien world. Make another frame from the same film: the same location at the same moment, with the same light, weather, colours, materials and living things as image 1, and the same real location-photography look. This frame is a detail found inside image 1 after moving into the scene. Output a wide 16:9 landscape frame."
TAIL = "True lens perspective and focus fall-off, fine physical surface detail, natural light only, slight film grain. It must read as a photograph of a real thing in a real place, not artwork and not a studio subject: the surroundings continue past every edge of the frame. No people, no buildings, no cameras, drones or equipment, no text, no watermark, no border."
P = {
'A-d1': """VIEWPOINT. Crouched low on the wet moss, one metre from the rib cage of the dead six-legged animal that lies on the bank in image 1. 100 mm macro lens, shallow focus.

IN FOCUS. Three of the carcass's ribs, draped in wet moss, with a crowd of pale leathery bladders growing out from between them, from the size of a fist to the size of a melon, matte and slightly wrinkled, each with a small dark pore. One bladder has just split: a slow roll of fine golden dust is leaving it and drifting to the left, lit from behind by sunlight so every grain shows. Small four-winged insects lie dead on the bladder skins. Water drops hang from the moss.

BACKGROUND, soft but recognisable from image 1. The river, and beyond it the first forest island standing in its shaft of sun with the thin waterfall, under the dark ribbed wall of the tunnel.""",
'A-d2': """VIEWPOINT. Standing at the edge of the first forest island in image 1, looking up along the shaft of sunlight toward the skylight. 135 mm lens.

IN FOCUS. A dozen four-winged flyers, each the size of a heron, with thin translucent membrane wings lit from behind, circling upward inside the shaft and feeding on drifting golden dust. Behind them the thin waterfall falls from the skylight edge and breaks into spray that hangs in the beam. Ribbon vines hang from the rim of the skylight.

BACKGROUND AND EDGES, recognisable from image 1. The pale cartilage hoops of the tunnel roof curving around the skylight in deep shadow, the tongue of cloud sliding under the roof, and at the bottom of the frame the dark wine-red and green crowns of the island's trees.""",
'B-d1': """VIEWPOINT. Standing on the shelf six metres from the rim of the nearest throat, the one on the right in image 1, at the height of the rim, looking along it. 85 mm lens, shallow focus.

IN FOCUS. The wet rim of the throat: stacked ivory cartilage rings, stained, chipped and dripping. Dense cold white vapour pours up out of the dark hole behind the rim and over it. Crimson feathery gill-plumes crowd the rim, bent flat outward by the rush of air, shedding beads of water from their tips. Pale barnacle-like cones sit on the rings with their lids open.

BACKGROUND, soft but recognisable from image 1. The pale teal tide channel, two of the long-legged striders, other vapour columns leaning the same way, and the low sun in the fog.""",
'B-d2': """VIEWPOINT. Very low, just above the water of the tide channel in image 1, looking along it. 300 mm telephoto lens, shallow focus.

IN FOCUS. One of the striders from image 1, seen from the height of its knees: long thin jointed ivory legs planted in the shallow teal water, the small barrel-sized body above them lowering a cluster of thin feeding arms into a bed of crimson gill-plumes on the bank, which are pulling back into their tubes around the arms. Water streams from one lifted leg. Small bubbles rise through the water around its feet.

BACKGROUND, soft but recognisable from image 1. A second strider farther off, vapour drifting across the channel from a ringed throat, and far away in the haze the broken ribbed windpipe lying on the hillside under the low sun.""",
'C-d1': """VIEWPOINT. Forty centimetres from the skin of one air sac in the nearest heap in image 1. 100 mm macro lens, very shallow focus, available light only.

IN FOCUS. The wet leathery membrane of the sac: branching veins, fine wrinkles, beads of condensation, each bead holding a point of the glow. Through the skin, against the cold blue-green light inside, hangs the dark shape of a caught animal with many thin limbs, half dissolved, one limb still pressed against the inside of the skin. A pale moth-like animal walks on the outside of the membrane.

BACKGROUND, soft but recognisable from image 1. Other sacs as dim discs of blue-green and amber light in the mist, and the last band of twilight above the dark cliff.""",
'C-d2': """VIEWPOINT. Beside the black stream in image 1 at knee height, looking along the side of the nearest heap of sacs. 85 mm lens, shallow focus, available light only.

IN FOCUS. A puckered pore in the skin of a sac at the moment it exhales: a jet of faintly luminous mist rolls out and sinks toward the ground. Six or seven pale moth-like animals spiral into the jet; two are already stuck to the wet lip of the pore, wings spread.

BACKGROUND, soft but recognisable from image 1. The valley of sacs receding as hundreds of dim lights in knee-deep mist, the stream mirroring them, the dark cliff with its cave mouths and the last band of dull orange twilight.""",
}
for k, body in P.items():
    open(f'{R}/{k}.txt', 'w').write(HEAD + '\n\n' + body + '\n\n' + TAIL + '\n'); print(k, len(body))
