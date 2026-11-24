#!/usr/bin/env python3
"""Write the step 2 detail prompts and job files. Each detail is generated from its establishing view (Image 1) plus one real photograph (Image 2) as the rendering standard."""
import json
R = '/home/user/workspace/r3'; M = 'gpt_image_2_6_sunburst'
EST = {'heart': 'heart-est-t1', 'marsh': 'marsh-est-t3', 'eye': 'eye-est-t1', 'spine': 'spine-est-t2', 'ribs': 'ribs-est-t2', 'breath': 'B-est-t60'}
HEAD = """Two reference images are supplied, with different jobs.
Image 1 is a wide photograph of a real place. The new picture is taken in that same place, at the same moment, in the same light and weather. Keep its landmarks, materials, colours, animals and atmosphere exactly consistent.
Image 2 is an unrelated real photograph. Use it only as the standard for how a real camera records {std}. Do not copy its subject or anything in it.

Make a new 16:9 photograph: a closer shot from the same big-budget natural-history film about an alien world, taken with a {lens} lens from {cam}. It must be indistinguishable from real location photography: one plane of focus, the subject sharp, everything nearer and farther soft.

IN FOCUS. {focus}

BEHIND, SOFT BUT RECOGNISABLE AS IMAGE 1. {behind}

WHAT MAKES IT REAL. The same single light source and weather as Image 1. Real materials with weight and wetness, small flaws, dirt and asymmetry; nothing carved, patterned, glossy or symmetrical; nothing repeated or evenly spaced. Animal skin looks like the skin of a real animal in a real photograph: creased, scarred, dirty, uneven in colour, never smooth, waxy or rubbery. Water runs and drips in uneven dribbles, never in a neat string of beads. The subject is caught as found, not arranged for the camera, and part of it is cut off by the edge of the frame. Natural exposure with gentle highlights and open shadows, no added sharpening, no glow added in post, restrained colour, fine film grain.

No people, no buildings, no equipment, no text, no watermark, no border."""
LIGHT = 'light, haze and exposure'
SKIN = 'light and exposure, and how the skin of a real animal looks'
D = [
 # ---------------- HEART
 ('heart', 1, 'lava-surface', '100 mm', 'a camera set low on the edge of the black bench in Image 1, exactly where the solid rock ends and the crust of the lava lake begins, looking out across the crust',
  'The line between ground and lake, two metres from the lens: a crooked seam, a hand to an arm wide, where the crust is pulling apart. Inside it the lava is bright yellow-orange and moving, slowly welling and stretching into ropes and skins that dull to red and then to grey as they cool. The crust plates on either side are dull grey-black with a wrinkled ropy skin like elephant hide; their edges curl, crack and glow dull red just under the surface. A few small gobs of spatter have landed on the near plate and are going dark. Heat shimmer blurs everything seen across the seam and thin blue-white fume rises from it. At the left edge of the frame is the lip of the solid bench: cinders, loose blocks and a brittle crust of sulphur-yellow crystals round one small steaming crack.',
  'The crust stretching away with other thin glowing seams; two or three crust-walkers as tall thin black shapes lit orange from below; the lava fall from the tunnel mouth in the far wall as a soft bright line; the fume lit from below; the dusk sky.',
  'plate-lava-2', 'the surface of real lava: its crust, its incandescent seams, its exposure at dusk'),
 ('heart', 2, 'crust-walkers', '400 mm', 'the black bench in Image 1, looking out across the crust at the group of crust-walkers working the bright seam in the middle distance',
  'Three of the crust-walkers of Image 1 at slightly different distances, so that only the nearest is fully sharp. Each has a small deep soot-black body carried four metres up on four very long thin legs with knobbly joints, ending in broad flat pads that spread its weight on the crust, and a long drooping neck that ends not in a head but in a tuft of pale feeding tendrils. Their skin is dry, creased and scarred, dusted grey with ash and cracked at the joints. The nearest has lowered its neck so that its tendrils hang just above the glowing seam, lit bright orange, their tips singed dark. Another is in mid-stride with one pad lifted and crumbs of crust falling from it. The third, partly hidden behind the first, has its neck raised. They are lit hard orange from below by the seam and are black on top against the fume. The crust sags a little under each pad. Heat shimmer rises between the lens and the animals.',
  'The lava fall from the tunnel mouth, at the upper left; the dark far wall; the buttress; orange-lit fume.',
  'ref-hide-1', SKIN),
 ('heart', 3, 'foundered', '50 mm', 'a low camera on the edge of the bench in Image 1, a few metres from the crust-walker that sank into the crust',
  'The foundered crust-walker of Image 1, exactly where and how it lies in Image 1: two long thin legs and part of its back stand out of the crust at an angle and everything else is under. The legs are coated in a grey skin of chilled lava that has cracked and flaked to show charred black beneath, and the broad flat pad of one leg hangs in the air. The crust around it is wrinkled into ropy folds where it closed over the body, and one short crack beside it still glows dull red and leaks a little fume. A few steps beyond it, soft, the living crust-walker of Image 1 is stepping away across the crust on its four stilt legs, lit orange from below.',
  'The crust with thin glowing seams; the lava fall and the tunnel mouth in the far wall; the buttress; the fume.',
  'plate-lava-1', LIGHT),
 ('heart', 4, 'vessel-mouth', '600 mm', 'the black bench in Image 1, looking right across the lake at the tunnel mouth in the far wall',
  'The enormous ragged tunnel mouth of Image 1, the stump of a great vessel: eighty metres across, wider than it is tall, its lip sagging, its walls marked with thick rounded bands that go back into darkness, the roof lit orange from below. From its floor lava pours down the cliff in one uneven rope: yellow-white at the top, crusting darker in clots as it falls, splitting round a ledge, and spreading at the bottom into a bright fan that pushes under the dark crust of the lake. Fume and heat shimmer rise along it. At the foot of the fall, tiny against it, two crust-walkers on their stilt legs pick their way along the edge of the fan.',
  'Dark layered cliff and slopes of fallen rock on either side; in front, out of focus, the dark crust with one glowing seam.',
  'plate-lava-1', LIGHT),
 # ---------------- MARSH
 ('marsh', 1, 'bubbling-pool', '100 mm', 'a camera set just above the salt rim of the bubbling seep pool on the left of Image 1, looking across the pool',
  'The surface of the pool, two to five metres from the lens: thick, opaque, oxblood-red water. Gas is coming up through it. One bubble has just swelled into a dome the size of a football, stretched thin and glossy, about to break. Another has just burst, leaving a ragged crown and a few drops in the air. Small ones cluster in foam near the edge, and slow rings spread and cross. The water is not smooth like paint: it carries scum, skins, threads of darker red, floating flecks of salt and dead insects. In the foreground is the rim: a raised crust of dirty-white salt in knobs and frills, wet, stained pink and rust at the waterline, with a film of crimson slime. Thin steam drifts over the surface.',
  'The pale stalks standing in the shallows on the far side of the pool with their crimson fans; one mud-wallower as a grey shape; the white flats and the blank white sky.',
  'plate-porcelain-1', LIGHT),
 ('marsh', 2, 'stalk-colony', '200 mm', 'a camera at head height among the stalk colony that rings the seep pool in Image 1',
  'The tops of five stalks at different distances. Each stalk is bone-coloured, as thick as an arm, ringed and scarred like the tube of a giant tube worm, crusted with salt, and some lean. At the top of the nearest the feeding fan is fully open: a soft plume of crimson filaments like the gills of a feather-duster worm, wet, clumped in places, with some filaments torn or bleached at the tips; small pale flying insects are caught in it and others hover round it. The fan of the next stalk is half drawn back into its tube. Another is closed to a dark red bud. One stalk is broken off and empty, with a dark hole at the top.',
  'The steaming red pool; the white salt flats; one mud-wallower; the low rock hummock; the blank white sky and the far curtain of rain.',
  'plate-porcelain-1', LIGHT),
 ('marsh', 3, 'wallowers', '400 mm', 'the low rock rise of Image 1, looking down the red channel at the mud-wallowers',
  'The large mud-wallower of Image 1 standing at the edge of the channel with two young beside it. It is a heavy low animal the size of a hippopotamus with a broad flat body, short thick legs, no eyes and no ears, and a wide blunt mouth fringed with short thick feelers that are working the mud. Its skin is grey, deeply creased and scarred, flaking with dried salt along the back, wet and stained rust-red up to the waterline, with mud caked on the legs. Red water runs off its belly. One of the young is half under water with only its back and feelers showing; the other is climbing the bank. In the channel behind them the back of another adult breaks the surface like a boulder.',
  'Stalks with crimson fans; the white and grey salt flats; haze and the blank white sky.',
  'ref-hide-2', SKIN),
 ('marsh', 4, 'thin-crust', '85 mm', 'a low camera on firm ground at the edge of the thin grey crust on the right of Image 1',
  'The mud-wallower of Image 1 that left the channel: sunk to its shoulders in grey mud under a broken crust of salt, alive, its blunt eyeless head raised, the feelers round its mouth spread, mud drying pale on its creased back. The crust around it has cracked into plates that tilt into the wet mud, and red brine wells up in the cracks. Around it, at different distances, are the ones that sank here before: shapes of the same animal completely coated in white salt crystals, like figures covered in hoar frost. One shows only its back and head above the surface, one has fallen in on itself and shows dark bone, and the oldest is only a white mound. Flies hang over them.',
  'The red channel with living mud-wallowers in it; stalk colonies with crimson fans; the far curtain of rain under the white sky.',
  'ref-hide-2', SKIN),
 # ---------------- EYE
 ('eye', 1, 'drinkers', '400 mm', 'a camera low on the gravel of the near shore in Image 1, looking along the waterline',
  'Four of the drinkers of Image 1 at different distances, so that only the second is fully sharp. Each is a slender long-legged animal the size of a deer, hairless, with pale skin that is creased at the joints, scarred, dusty and darker along the spine. They have no eyes at all: where eyes would be the skin is unbroken. Each has a long soft flexible snout. Two have their snouts in the amber water, drinking, with rings spreading from them. One stands with its head up and turned toward the middle of the lake, its snout lifted and still. A young one stands between the legs of an adult. Their feet are in a few centimetres of water over amber filaments, and their reflections break in the rings.',
  'The amber shallows with their lines all pointing to the centre; the black-blue centre of the lake with one slow set of rings on it; the far cliffs in warm low sunlight with mist at their feet.',
  'ref-dusk-1', SKIN),
 ('eye', 2, 'iris', '100 mm', 'a camera just above the water in the shallows of Image 1, twenty metres out from the near shore, looking toward the centre of the lake',
  'The floor of the shallows seen through thirty centimetres of perfectly clear water: mats of fine filaments, amber, honey and rust, all combed in one direction, toward the centre of the lake, like hair in a current. Strings of tiny bubbles are caught in them. There are bare patches of pale stone and one darker channel. A few small pale grazing animals the size of a thumb crawl on the mats. Nearest the lens the surface is transparent and you look down through it; farther off it turns to a mirror of the sky. A few bubbles break the surface.',
  'The sharp line where the amber stops and the black-blue water begins; the slow rings on the black water; the far cliffs in warm low sunlight with mist at their feet.',
  'plate-terrace-2', LIGHT),
 ('eye', 3, 'edge', '35 mm', 'a camera three metres above the water at the outer edge of the shallows in Image 1, exactly where the amber shelf ends, looking down and forward toward the centre of the lake',
  'The edge. In the lower part of the frame the amber shelf is seen through clear shallow water: pale stone and amber filaments combed toward the centre. It ends in an irregular lip of pale rock fringed with filaments. Beyond the lip there is no bottom: a sheer underwater wall of pale rock drops straight down and the water goes from clear blue to blue-black to black within a few metres. Low sunlight slants a little way down the wall and fades. Far down, at the limit of sight, several long pale shapes hang upright in the dark, too dim to make out. On the lip itself, half over the drop, lie the pale bones of one drinker. The surface over the deep water is a still dark mirror, and one slow ring is arriving from the centre.',
  'The black-blue centre of the lake; the far cliffs in warm low sunlight and their reflection; thin mist.',
  'plate-crater-1', LIGHT),
 ('eye', 4, 'what-rises', '600 mm', 'the near shore of Image 1, looking across the black centre of the lake',
  'The middle of the black water. The surface there is swelling into a low smooth dome a hundred metres across, as if something very large were rising under it without breaking through. Slow rings run outward from it. Just under the surface around the dome, dozens of long pale shapes, each as long as a tree trunk, lie spread outward like spokes, dim and blurred by the water. Where one of them touches the surface a thin pale tip stands a metre into the air, wet. Thin mist lies on the water. In the foreground, out of focus, are the backs and raised heads of two drinkers at the shore, turned toward it.',
  'The far cliffs with warm low sunlight on their tops, and their reflection broken by the rings.',
  'plate-crater-1', LIGHT),
 # ---------------- SPINE
 ('spine', 1, 'tether-kites', '300 mm', 'the snow crest in Image 1, looking up at the upper part of the nearest spire',
  'The holdfasts of the tether-kites on the windward edge of the spire. In cracks in the pale rock, just below where it is burned black, sit clusters of dark leathery knobs like the holdfasts of kelp, crusted with rime ice. From each a thin dark stalk runs out a few metres and widens into a long flat translucent ribbon, pale as fish skin with a faint violet sheen and fine veins, which streams out horizontally in the gale, rippling, its edges frayed. A dozen ribbons at different distances overlap; one is torn half through and one is knotted round another. Beads of ice hang along the stalks and spindrift blows through them. The rock is frost-shattered and plastered with feathers of rime on its windward side; above, the burned top is black, glassy and cracked.',
  'Dark blue-violet storm cloud; the next spires along the ridge; a violet flash far off; the cloud sea below.',
  'plate-ridge-1', 'snow, rime and rock in mountain light'),
 ('spine', 2, 'strike', '600 mm', 'the snow crest in Image 1, looking along the ridge at the third spire',
  'The black burned tip of the third spire of Image 1 at the instant lightning strikes it: one thin crooked violet-white channel from the cloud to the rock, with fine side branches. At the point of contact there is a small white-hot spot, a spray of glowing fragments of rock, and a puff of steam where rime has flashed off. The ribbon-shaped tether-kites on this spire stand out stiffly in the wind, their edges glowing dim violet-blue, with small sparks at their tips. The snow, the rime and the cloud around the spire are lit by this one flash, with hard shadows; everything else is dusk-dark.',
  'The wall of storm cloud lit from inside; farther spires as dark shapes; the thin orange line at the horizon above the cloud sea.',
  'plate-storm-1', 'lightning and storm cloud at dusk'),
 ('spine', 3, 'canal', '20 mm', 'a camera inside the tunnel mouth of Image 1, a few metres in, looking back out through the mouth',
  'The inside of the canal that runs through the ridge: a natural tunnel eight metres across through pale rock, its walls rounded and wind-polished like the inside of a bone, with bands of harder rock standing out, clear ice glazing the floor, drifts of snow blown in, and icicles at the mouth bent sideways by the wind. Huddled along one wall, out of the wind, are five ridge-runners, the animals whose tracks cross the snow in Image 1: compact animals the size of a goat with a thick coat of coarse white bristles rimed with ice, four short strong legs with hooked climbing claws, no eyes, and a short neck ending in a tuft of dark tendrils held tucked against the chest. They press together; one is lying down; one stands at the mouth, lit violet by a flash outside. The rest are in cold blue shadow.',
  'Seen through the tunnel mouth: the snow crest with their tracks, the next spire with its streaming ribbons, dark storm cloud and blowing spindrift.',
  'plate-ridge-1', 'snow, ice and rock in mountain light'),
 ('spine', 4, 'scorched', '50 mm', 'a low camera on the snow saddle of Image 1, at the foot of the nearest spire',
  'Where lightning has come to ground. A patch of bare rock in the snow is burned black and glassy, with a branching pattern of fused channels spreading from it like roots. The snow has melted back from it in a ring and refrozen as clear ice. Lying across it is the body of a ridge-runner that was caught in the open: an animal the size of a goat with a coat of coarse white bristles, four short legs with hooked claws, no eyes, and a short neck ending in a tuft of dark tendrils. It lies on its side; the coat is singed off along one flank, the bristles burned to stubs and the skin split; it is already rimed over on the windward side and half drifted in with snow. Its tracks lead to this point and stop. Spindrift streams over it.',
  'The spire above with its black top and its streaming ribbons; the dark tunnel mouth; the storm cloud; the cloud sea and the thin orange line at the horizon.',
  'plate-ridge-1', 'snow, rime and rock in mountain light'),
 # ---------------- RIBS
 ('ribs', 1, 'colony', '600 mm', 'the tidal flat of Image 1, looking up at the ledges of the large rib on the right, above the tide line',
  'A stretch of ledges fifty metres up the pale rock, crowded with nesting kite-wings: hundreds of them, packed like a seabird colony but unevenly, with gaps. Each is a pale grey animal with long narrow wings of bare skin, rust-orange along the edges, folded up over its back like a closed umbrella; it stands on two thin legs and has a long flexible neck that ends in a tuft of tendrils instead of a head. Some sit low on nests of dried black weed; some stretch one wing; two squabble with their necks raised; one is landing with wings spread and legs out; several are in the air in front, blurred by their own movement. Their skin is thin, wrinkled, veined and dirty. The rock is streaked white with droppings and blotched rust-orange with lichen. At the bottom of the frame is the top of the black weed line.',
  'Dark blue-grey cloud; more of them wheeling as specks; the curve of another rib in haze.',
  'plate-surf-1', LIGHT),
 ('ribs', 2, 'drowned', '50 mm', 'the foot of the nearest rib on the left of Image 1, looking up at the wall of weed',
  'The drowned animal of Image 1, exactly where it hangs in Image 1: ten metres up the black dripping wall of weed, caught by its legs. It is a large, pale, long-legged, long-necked animal, limp, hanging head-down with its neck and its tuft of tendrils trailing; its skin is sodden and beginning to slough, its ribs show, and one leg is broken. Weed is wrapped round it and water is still running out of the weed. A few small pale scavengers like crabs are already on it. Along the wall at the same height, caught in the weed, are older bones: the line the tide reaches.',
  'The wet tidal flat with its pools; kite-wings standing far off; the far ribs; bright sky reflected in the pools.',
  'plate-surf-1', LIGHT),
 ('ribs', 3, 'tide-pool', '400 mm', 'a camera lying on the wet sand of the tidal flat in Image 1',
  'Three kite-wings feeding in a tide pool, at different distances, so that only the nearest is fully sharp. Each stands on two long thin legs in ankle-deep water with its wings folded up over its back like a closed umbrella, rust-orange along the wing edges, its long neck lowered and its tuft of tendrils spread in the water, feeling under stones. One has pulled out something small that writhes. One is shaking water off. The farthest has begun to run into the wind with its wings half open, kicking up spray. Their skin is bare, thin, wrinkled, veined and wet, with sand stuck to the legs. Their reflections are broken by wind ripples.',
  'The bases of the ribs, black with weed up to the tide line; the pale blades above; surf and spray; dark cloud with one sunlit patch.',
  'ref-wader-1', 'light and exposure, and how a real long-legged wading animal looks'),
 ('ribs', 4, 'bore', '600 mm', 'the tidal flat of Image 1, looking straight down the strait between the farthest ribs',
  'The tide coming back: a breaking wall of white water four metres high, right across the strait from one row of ribs to the other, a kilometre off and coming on. Behind its white front the water is brown-grey and churning; spray smokes off its crest in the wind, and it bursts up white where it meets the foot of a rib. In front of it the flat is still calm and wet with the last pools. Kite-wings that were feeding there are lifting off ahead of it in a ragged line, the last ones only just clear of the water. The bases of two ribs frame it, black with weed up to the tide line.',
  'Farther ribs in spray and haze; dark blue-grey sky with one patch of sunlight.',
  'plate-surf-1', 'surf, spray and haze'),
 # ---------------- BREATH (two more)
 ('breath', 3, 'gill-plumes', '100 mm', 'a low camera on the lip of the large shaft in Image 1, beside the large mass of red gill-plumes',
  'A few fronds of the deep wine-red gill-plumes at arm\'s length: soft wet feathery fronds like the gills of giant tube worms, each a central stem with hundreds of fine filaments, lifted and combed upward by the cold white vapour that streams up past them out of the shaft. The filaments stick together in wet clumps; some are torn and some are bleached pale at the tips; condensation beads on them unevenly. Where the low sun passes through them they glow red; elsewhere they are dark. At their base a fleshy holdfast grips a crack in the pale rock, with shingle and one small old bone beside it.',
  'The dark drop of the shaft with one ruined ivory hoop on its far wall; the vapour; the bone-white wader standing at the rim as a soft pale shape; the gold fog and the pale shelf.',
  'plate-terrace-2', LIGHT),
 ('breath', 4, 'down-the-shaft', '20 mm', 'a camera held out over the lip of the large shaft in Image 1, looking down into it',
  'The inside of the airway, forty metres across, dropping straight down. Its wall carries the ruined cartilage hoops of Image 1, one below another: thick rounded bands of ivory cartilage as tall as a house, cracked, pitted and flaking, stained tea-brown and green-black where water runs. The top one survives only as two arcs with bare rock between them; the second sags, with the fallen block the size of a truck lying on the third; below the third they go on down, dimmer and dimmer, into blackness with no bottom. Cold white vapour wells up the middle of the shaft toward the lens and spills over the low side of the lip. Low sun lights the top of the far wall and everything below is in shadow. At one edge of the frame wine-red gill-plumes hang inward over the lip, and water drips from them.',
  'At the top of the frame: the lip, the pale shelf and the tide channel beyond it, and the gold fog.',
  'plate-terrace-2', LIGHT),
]
jobs = []
for place, n, name, lens, cam, focus, behind, ref2, std in D:
    pid = f'{place}-d{n}'
    open(f'{R}/prompts/{pid}.txt', 'w').write(HEAD.format(std=std, lens=lens, cam=cam, focus=focus, behind=behind) + '\n')
    for t in (1, 2):
        jobs.append({'id': f'{pid}-t{t}', 'model': M, 'prompt': pid, 'refs': [f'{R}/gen/{EST[place]}.png', f'{R}/real/{ref2}.jpg'], 'what': f'step 2 detail: {place} {name}, made from {EST[place]} with {ref2} as the rendering standard'})
for i, k in enumerate(range(0, len(jobs), 16)):
    json.dump(jobs[k:k+16], open(f'{R}/jobs/b{26+i}.json', 'w'), indent=1)
    print(f'b{26+i}', len(jobs[k:k+16]), jobs[k]['id'], '...', jobs[min(k+15, len(jobs)-1)]['id'])
json.dump([(p, n, name) for p, n, name, *_ in D], open(f'{R}/tmp/details.json', 'w'))
