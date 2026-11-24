#!/usr/bin/env python3
# Batch 10: (1) A and C: the foreground prop leaves the corner (Carbon: "pasted into the corner as a 2D frame"); (2) B details for the rebuilt B (flush shafts, flock of waders).
R = '/home/user/workspace/r3/prompts'
EH = "Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition and colours, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in image 1, and nothing new is added anywhere else."
ET = "It must still read as real location photography of a place you could walk into, not artwork. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border."
E = {
'A-est-edit3': """CHANGES.
1. The carcass with the pale bladders is no longer in the lower right corner. It lies farther off and smaller, down on the wet rocks at the river's edge about twenty-five metres ahead, half in shadow, no wider than a tenth of the frame; a thin drift of golden dust leaves one of its bladders and catches a stray beam. The lower right corner is now plain mossy rock and a few ferns in shadow.
2. The herd at the river's edge below the forest: nine animals, scattered and facing different ways: some drinking, two lying on the gravel, one wading in the shallows; none of them in a line or in clean side view.""",
'C-est-edit3': """CHANGES.
1. The bunch of sacs in the lower left corner is no longer there. It sits farther off and smaller, down the slope at the edge of the stream about thirty metres ahead, no wider than a seventh of the frame. The lower left corner is now plain wet black rock.
2. The cave mouths in the cliff on the right: ragged and irregular, of different sizes and at different heights, one of them only a tall crack, so they never read as a row of arches.
3. The animal walking toward the light is seen from behind at three-quarters as it walks away from the viewer, not in side view.""",
}
for k, body in E.items():
    open(f'{R}/{k}.txt', 'w').write(EH + '\n\n' + body + '\n\n' + ET + '\n'); print(k, len(body))

HEAD = "Image 1 is the wide establishing frame of a location in a big-budget natural-history film about an alien world. Make another frame from the same film: the same location at the same moment, with the same light, weather, colours, materials and living things as image 1, and the same real location-photography look. This frame is a detail found inside image 1 after moving into the scene. Output a wide 16:9 landscape frame."
TAIL = "True lens perspective and focus fall-off, fine physical surface detail, natural light only, slight film grain, restrained natural colour. Nothing is posed or centred: the subject is caught mid-action, partly cut by the edge of the frame, and no two things in the frame are alike. It must read as a photograph of a real thing in a real place, not artwork and not a studio subject: the surroundings continue past every edge of the frame. No people, no buildings, no cameras, drones or equipment, no text, no watermark, no border."
P = {
'B-d1c': """VIEWPOINT. At the broken lip of the nearest large shaft, the one on the right in image 1, looking along the curve of the lip and down into the shaft. 35 mm lens, deep focus.

IN FOCUS. The undercut lip of pale bone-rock, wet, honeycombed where it has broken. Just inside it, a ragged band of deep crimson feathery gill-plumes, pressed flat upward against the wall by the rush of air and shedding beads of water. Below them the ivory cartilage hoops of the shaft wall, each as thick as a house, stained, cracked and dripping, one below another, curving away around the shaft and dropping into darkness. Cold white vapour wells up past them out of the dark and pours over the lip. On a ledge of the first hoop lie the pale bones and one fresh body of the small white wading animals that came too close, half grown over by plumes.

BACKGROUND, recognisable from image 1. The far lip of the shaft forty metres away, the flat wet shelf beyond it with other leaning vapour columns, and the low sun as a pale glow in the fog.""",
'B-d2c': """VIEWPOINT. Very low at the edge of the shallows where the flock feeds in image 1, twenty metres from the nearest animals. 400 mm telephoto lens, shallow focus.

IN FOCUS. Four of the small white wading animals from image 1, seen close for the first time: bone-white and hairless, the size of a goat, each standing on four thin stilt legs twice as long as its body, with a small eyeless head that ends in a bundle of thin feeding tendrils. Two feed with their heads under the water. One has raised its head into the wind, water streaming from its tendrils. The fourth is a little apart and lower down, where the heavy white vapour lies in a hollow of the shelf: it has gone down on its folded legs inside the vapour, head sinking. Reflections and ripples on the shallow pale teal water; backlit by the low sun, with bright rims on their backs and legs.

BACKGROUND, soft but recognisable from image 1. The rest of the flock out of focus, one leaning vapour column, and far away in the fog the dark cliff with its enormous round cave mouth.""",
'B-d3c': """VIEWPOINT. Kneeling at the edge of the tide channel in image 1, looking down and across the water at a steep angle. 50 mm lens.

IN FOCUS. A drowned shaft: a round hole one metre across in the bed of the channel, its first ivory cartilage hoop just visible under thirty centimetres of clear pale teal water, breathing out. Above it the water domes up and boils with big cold silver bubbles that burst into a low white vapour, which slides away across the surface. A ragged ring of crimson gill-plumes around the hole sways outward with each pulse. A dozen small pale shrimp-like animals float belly-up in the vapour downwind, and one, still alive, kicks slowly at the edge of it. The bed of the channel is smooth pale bone-rock with fine cracks.

BACKGROUND, soft but recognisable from image 1. The channel running on across the shelf in its S curve with the crimson band along its edges, the large shaft with its vapour, the flock tiny in the distance, and the sun glitter on the water.""",
}
for k, body in P.items():
    open(f'{R}/{k}.txt', 'w').write(HEAD + '\n\n' + body + '\n\n' + TAIL + '\n'); print(k, len(body))
