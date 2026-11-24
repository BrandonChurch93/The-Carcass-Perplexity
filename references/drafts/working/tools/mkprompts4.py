#!/usr/bin/env python3
# Batch 4: re-shoots of the batch 3 picks (image 1 = the pick), changing only the listed faults.
R = '/home/user/workspace/r3/prompts'
HEAD = "Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and 24 mm lens, the same light and weather, the same composition and colours, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in image 1."
TAIL = "It must still read as real location photography of a place you could walk into, not artwork. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border."
P = {
'A-est-edit1': """CHANGES.
1. The pale bladders on the right: much smaller and far more numerous. Hundreds of them, from the size of a fist to the size of a pumpkin, none larger than the skull of the carcass, crowded like puffball fungi over the fallen hoop and over the carcass. They are soft, matte and leathery, slightly wrinkled, each with a small dark pore on top; they are not smooth, not shiny and not shaped like eggs. Three have split open and breathe out fine golden dust that drifts across the frame toward the shaft of sunlight.
2. The trees on the forest islands: no palms. Pale smooth trunks carrying flat umbrella crowns of dark wine-red and deep green, with long ribbon leaves hanging from them, among tree ferns.
3. The cartilage hoops of the tunnel: weathered and uneven, cracked, water-stained, a few broken, so no two hoops look alike.""",
'B-est-edit1': """CHANGES.
1. The striders: seven of them, no longer standing in a row. They are scattered at different distances across the channel and the shelf, each in a different pose: one mid-stride with two legs lifted, one standing still, one with its body lowered to feed among the red plumes on the left bank, one half hidden in vapour, two far away and tiny near the distant throats. No two alike.
2. The vapour columns in the middle distance: irregular. A few are large, many are small, some throats are quiet with only a wisp, and the gaps between them are uneven, so they never form an evenly spaced row.
3. The far broken windpipe on the hillside: its rings are eroded, sagging and partly collapsed, overgrown with the same crimson and orange life, so it reads as a dead organ and not as wreckage or a building.""",
'C-est-edit1': """CHANGES.
1. The nearest heap of sacs on the left: moved back and left so it fills no more than a quarter of the frame, leaving more wet black rock path and stream in the foreground.
2. The sacs vary more: some are swollen tight, some have collapsed into wrinkled folds like emptied skins, a few are dark and dead; no two have the same size, shape or brightness, and many are dim.
3. The cave mouths in the far cliff breathe out slow mist that drains down into the valley.""",
}
for k, body in P.items():
    open(f'{R}/{k}.txt', 'w').write(HEAD + '\n\n' + body + '\n\n' + TAIL + '\n'); print(k, len(body))
