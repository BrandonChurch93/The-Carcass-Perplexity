# Writes assets-src/<place>/mat/RECIPE.md for the six places from assets-src/materials/spec.json and spec2.json.
# Run: python3 assets-src/materials/write-recipes.py
import json, os
spec = json.load(open('assets-src/materials/spec.json'))
if os.path.exists('assets-src/materials/spec2.json'):
    spec += json.load(open('assets-src/materials/spec2.json'))
BIG = {(j['place'], j['name']): j for j in json.load(open('assets-src/materials/enlarge.json'))} if os.path.exists('assets-src/materials/enlarge.json') else {}
NAMES = {'ribs': 'the Ribs', 'breath': 'the Breath', 'marsh': 'the Blood Marsh', 'spine': 'the Spine', 'eye': 'the Eye', 'reveal': 'the Reveal'}
MODEL = {'gpt_image_2_6_flare': 'the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity)', 'gpt_image_2_6_sunburst': 'the image model `gpt_image_2_6_sunburst` (OpenAI GPT Image, through Perplexity)'}
for place, title in NAMES.items():
    rows = [r for r in spec if r['place'] == place and os.path.exists(f"assets-src/{place}/mat/src/{r['name']}.png")]
    second = [r for r in rows if r.get('date', '2026-11-25') != '2026-11-25']
    out = [f"# Material pictures of {title}", "",
           f"The working pictures of {title}, made by the Builder for every owner of the place to read: surface tiles and a sky on 2026-11-25 (the list and every prompt are in `assets-src/materials/spec.py`)"
           + (f", and on 2026-11-26 {len(second)} more for the second owners, most of them asked for by an owner: far backplates, feature sheets, ground plates and more tiles (`assets-src/materials/spec2.py`)" if second else "")
           + ". Each began as one generated picture: 1254 px square, 1672 x 941, 941 x 1672, or a sky of 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile repeat and writes a colour picture and a data picture from it, by the method of the Heart's materials, and writes each plate as it is.", "",
           *(["The Reveal's pictures are seen straight down from orbit. Cloud pictures lie on a black sea: their brightness is the cover, after the dark floor of the sea is taken off. `cells`, `streets`, `veil`, `popcorn` and `streaks` repeat; `front`, `storm`, `cyclone` and `wisps` are plates, one whole feature each, written at their own size and not repeated. The ground pictures (`range`, `plain`, `badland`, `shelf`, `redflat`) and the water pictures (`glitter`, `lakewater`) are detail for the provinces of the continent and repeat.", ""] if place == 'reveal' else []),
           "How to read them: the colour picture is sRGB. For a tile, in the data picture `<name>-nh.png` red and green are the slope on x and y (0.5 is level) and blue is height, taken from the picture's own light and dark. `metres` in `materials.json` is the real width one repeat of a tile, or the whole of a plate, stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.", "",
           "A plate is one whole picture and does not repeat: a far backplate (the far distance of a view, with its own sky and a level horizon), a feature sheet (one thing whole on black under flat light), or a ground plate (one piece of ground from straight above). Where a plate has a relief picture, `<name>-h.png`, it is grey and the size of the colour picture: white is highest (ground plates) or nearest (feature sheets and faces), black is lowest or furthest, and on a feature sheet the black round the subject is no subject. The relief was made by a second call from the colour picture, so it lies on it within a few pixels and its greys are a guess at the form, good for slope and for parallax, not a measured height. Where the generated picture came with a clear background, the plate is laid on black and `<name>-a.png` is its cover: grey, white where the subject is. The animals in these pictures have no eyes and no ears.", ""]
    for r in rows:
        relief = r.get('height') and os.path.exists(f"assets-src/{place}/mat/src/{r['name']}-h.png")
        if r['kind'] == 'sky':
            out += [f"## `public/assets/{place}/mat/sky.jpg`", ""]
        elif r['kind'] == 'plate':
            cover = os.path.exists(f"public/assets/{place}/mat/{r['name']}-a.png")
            out += [f"## `public/assets/{place}/mat/{r['name']}.jpg`" + (f" and `public/assets/{place}/mat/{r['name']}-h.png`" if relief else "") + (f" and `public/assets/{place}/mat/{r['name']}-a.png`" if cover else ""), ""]
        else:
            out += [f"## `public/assets/{place}/mat/{r['name']}.jpg` and `public/assets/{place}/mat/{r['name']}-nh.png`", ""]
        made = MODEL[r.get('model', 'gpt_image_2_6_flare')]
        big = BIG.get((place, r['name']))
        if relief:
            made += f", then for the relief {MODEL[r.get('heightModel', 'gpt_image_2_6_sunburst')]} with the colour picture as its one reference"
        out += [f"Made by: {made}, then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.",
                f"From: `assets-src/{place}/mat/src/{r['name']}.png`, the generated picture" + (f", and `assets-src/{place}/mat/src/{r['name']}-h.png`, the generated relief" if relief else "") + ". Pictures passed to the model with the prompt: " + ", ".join(f"`{x}`" for x in r['refs']) + ".",
                f"Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs {place}`.", "", "```", r['prompt'], "```", ""]
        if relief:
            out += ["The prompt of the relief:", "", "```", r['height'], "```", ""]
        if big:
            jn = json.load(open(f"assets-src/{place}/mat/src/big/{r['name']}-join.json"))
            used = [w for w in jn['windows'] if w.get('used', True)]
            out += [f"The file in `public/` is the larger copy, {jn['written'][0]} x {jn['written'][1]}: the generated picture is the parent, cut into 3 x 3 windows, each made again at full resolution by {MODEL[big['model']]} from its enlarged crop with `{big['real']}` as the standard, and the windows are fitted to the parent, tone-matched and joined by `python3 assets-src/materials/enlarge-plate.py join {place} {r['name']}` (the method of `assets-src/reveal/maps/enlarge-maps.py`). MEASURED (`src/big/{r['name']}-join.json`): {sum(1 for w in used if w['fitted'])} of {len(used)} windows used were fitted, moved at most {max(w['movedPx'] for w in used)} px at a corner."
                    + (f" Not used: {big['parentRowsWhy']}." if big.get('parentRows') else "") + " The prompt of a window:", "", "```", big['prompt'], "```", ""]
        out += [f"Takes: {r.get('takes', '1 made, take 1 kept')}." + (f" The relief: {r.get('heightTakes', '1 made, take 1 kept')}." if relief else "") + (f" The larger copy: 9 windows, 1 take each, {9 - 3 * len(big.get('parentRows', []))} kept." if big else ""),
                f"Why this one: {r['why']}" + (f" (asked for by `{r['asked']}`)" if r.get('asked') and not r['asked'].startswith('the Builder') else "") + ".",
                f"Date: {r.get('date', '2026-11-25')}", ""]
    out += [f"## `public/assets/{place}/mat/materials.json`", "",
            "Made by: `assets-src/materials/make-materials.mjs`.",
            "From: the pictures above.",
            f"Prompt or command: `node assets-src/materials/make-materials.mjs {place}`.", "",
            "What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number; for each plate its size in pixels, the real width it stands for and the name of its relief picture where it has one.",
            "Date: 2026-11-26" if second else "Date: 2026-11-25", ""]
    open(f'assets-src/{place}/mat/RECIPE.md', 'w').write('\n'.join(out))
    print(place, len(rows), 'pictures')
