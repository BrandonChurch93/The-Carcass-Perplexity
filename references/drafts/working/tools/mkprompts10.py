#!/usr/bin/env python3
"""Edit 4: re-shoots against the faults named by blind packets 5 and 6."""
import json
P = '/home/user/workspace/r3/prompts/'
HEAD = "Image 1 is a frame from a big-budget natural-history film about an alien world. Re-shoot the same frame: the same location, the same camera position and lens, the same light and weather, the same composition and colours, and the same real location-photography look with true lens perspective and fine physical surface detail. Output a wide 16:9 landscape frame. Change only the things listed below; everything else stays exactly as in image 1, and nothing new is added anywhere else.\n\nCHANGES.\n"
TAIL = "\n\nIt must still read as real location photography of a place you could walk into, not artwork: irregular, weathered, unposed. No people, no buildings or ruins, no cameras, drones or equipment, no text, no watermark, no border."
A = """1. One light source only. The bright opening and its beam low on the left wall are gone; that side of the cave is dark wet rock and hanging roots. All the light comes from the one great skylight above the forest.
2. The light from the skylight is softer and less tidy: a broad uneven glow in drifting mist with two or three faint broken shafts, not a fan of sharp rays.
3. The pale curved hoop on the left wall is no longer a clean free-standing arch. It is half buried: only stretches of it show through flowstone, moss and roots, and it carries on across the ceiling as a low broken ridge. The farther hoops are uneven: one slumped, one almost buried, at irregular spacing, so the cave never looks built.
4. The waterfall is broader and heavier, breaks into drifting spray halfway down and lands in a cloud of mist behind the trees.
5. The animals are a real herd, not a row: two adults close together drinking, a small juvenile behind them, one lying down, one standing belly-deep in the river, three more far along the bank half hidden by ferns. They differ in size. Each stands in wet gravel and casts a soft shadow away from the skylight. They are heavy, long-bodied, eyeless grazers with a thick neck, a broad blunt head and a long thick tail; not tapirs, boars or any earth animal."""
B = """1. The big shaft on the right is no longer a clean circle with even ledges. Its mouth is ragged and lopsided. On its near side a stretch of the lip has collapsed inward, and a few fallen slabs lie tilted on a ledge inside. The hoops on its inside wall are uneven in thickness and spacing, sagging, cracked and stained by drips; one is broken through, leaving a dark gap; after the third they are lost in darkness and vapour.
2. The crimson growth no longer follows every edge. It is now in three places only: one dense patch inside the far lip of the big shaft where the vapour wets the wall; a thin broken scatter along the downwind bank of the channel in the middle distance; and one small patch at a distant shaft. Every other edge of the channel and of the rock is bare.
3. The cave in the far cliff is not a neat arch. It is a huge ragged opening, wider than it is tall, lopsided, with a fan of fallen rock at its foot, and the fog pours out of it and down the slope.
4. The vapour columns differ: one big column far off, a few thin wisps, and two shafts that breathe nothing at all. They are not evenly spaced.
5. The flock: one loose group of seven of the white stilt-legged animals stands in the shallows much nearer, about a hundred and fifty metres away, small in the frame but clear, in different postures, each with its reflection. The rest stay far off in uneven clumps, a few of them in the air."""
C = """1. The sacs differ greatly from one another: from the size of a fist to the size of a house. Most are dim or dark. A few are slack and collapsed, torn open and empty. Only four or five glow strongly. Their skins differ: some thick, leathery and opaque with light leaking only at the seams; some thin and clear.
2. Each glowing sac lights what is around it: a pool of green-white light on the wet rock, on the mist and on the flank of the animal beside it, falling off quickly with distance.
3. The ground is not one wet gloss. It is wet only along the stream. The slopes are dry, matte, dark grey ash and broken scree with pale patches of lichen crust. The foreground slope is matte, broken and plain.
4. The largest cave in the cliff shows its inside: a faint glow deep within outlines a rock floor and hanging sheets of tissue, and a tongue of mist pours out of its mouth and down the slope.
5. The animal near the light is clear and solid: a heavy, dark, eyeless, long-headed animal as tall as a horse, seen from three-quarters behind, its flank lit by the sac in front of it, a long soft shadow behind it. Two more of its kind are far down the valley, small, walking toward the distant lights."""
for k, body in (('A', A), ('B', B), ('C', C)):
    open(P + f'{k}-est-edit4.txt', 'w').write(HEAD + body + TAIL)
G = '/home/user/workspace/r3/gen/'
jobs = []
for n, (k, ref, base) in enumerate((('A', 'A-est-t26', 28), ('B', 'B-est-t31', 32), ('C', 'C-est-t26', 28))):
    for i in range(2):
        jobs.append({'id': f'{k}-est-t{base+i}', 'model': 'gpt_image_2_6_sunburst', 'prompt': f'{k}-est-edit4', 'refs': [G + ref + '.png'], 'what': f're-shoot of {ref} against packet 5 and 6 faults'})
jobs.sort(key=lambda j: j['id'][-1])
json.dump(jobs, open('/home/user/workspace/r3/jobs/b11.json', 'w'), indent=1)
print([j['id'] for j in jobs])
