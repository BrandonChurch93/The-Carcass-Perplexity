# Writes assets-src/<place>/mat/RECIPE.md for the five places from assets-src/materials/spec.json.
# Run: python3 assets-src/materials/write-recipes.py
import json, os
spec = json.load(open('assets-src/materials/spec.json'))
NAMES = {'ribs': 'the Ribs', 'breath': 'the Breath', 'marsh': 'the Blood Marsh', 'spine': 'the Spine', 'eye': 'the Eye', 'reveal': 'the Reveal'}
for place, title in NAMES.items():
    rows = [r for r in spec if r['place'] == place and os.path.exists(f"assets-src/{place}/mat/src/{r['name']}.png")]
    out = [f"# Material pictures of {title}", "",
           f"The material pictures and the sky picture of {title}, made by the Builder on 2026-11-25 for every owner of the place to read. Each began as one generated picture: a flat surface seen straight on under even light, 1254 px square, or a sky, 1536 x 1024. `assets-src/materials/make-materials.mjs` makes each surface tile and writes a colour picture and a data picture from it, by the method of the Heart's materials. The list and every prompt are in `assets-src/materials/spec.py`.", "",
           *(["The Reveal's pictures are seen straight down from orbit. Cloud pictures lie on a black sea: their brightness is the cover, after the dark floor of the sea is taken off. `cells`, `streets` and `veil` repeat; `front`, `storm` and `cyclone` are plates, one whole feature each, written at their own size and not repeated. The ground pictures (`range`, `plain`, `badland`, `shelf`, `redflat`) are detail for the provinces of the continent and repeat.", ""] if place == 'reveal' else []),
           "How to read them: the colour picture is sRGB. In the data picture red and green are the slope on x and y (0.5 is level) and blue is height. `metres` in `materials.json` is the real width one repeat stands for. A face with beds or courses (`ledge`, `strata`, `cliff`, `canal`, `bark`, `hoop`) repeats well from left to right; lay its height once or break the repeat. Blend two scales of a tile and break it with the place's own large shapes so no repeat shows. These pictures carry no light: the place's rig lights them.", ""]
    for r in rows:
        if r['kind'] == 'sky':
            out += [f"## `public/assets/{place}/mat/sky.jpg`", ""]
        elif r['kind'] == 'plate':
            out += [f"## `public/assets/{place}/mat/{r['name']}.jpg`", ""]
        else:
            out += [f"## `public/assets/{place}/mat/{r['name']}.jpg` and `public/assets/{place}/mat/{r['name']}-nh.png`", ""]
        out += [f"Made by: the image model `gpt_image_2_6_flare` (OpenAI GPT Image, through Perplexity), then `assets-src/materials/make-materials.mjs` on Node with the `sharp` of `package-lock.json`.",
                f"From: `assets-src/{place}/mat/src/{r['name']}.png`, the generated picture. Pictures passed to the model with the prompt: `{r['refs'][0]}`, `{r['refs'][1]}`.",
                f"Prompt or command: the prompt below, then `node assets-src/materials/make-materials.mjs {place}`.", "", "```", r['prompt'], "```", "",
                "Takes: 1 made, take 1 kept.",
                f"Why this one: {r['why']}.",
                "Date: 2026-11-25", ""]
    out += [f"## `public/assets/{place}/mat/materials.json`", "",
            "Made by: `assets-src/materials/make-materials.mjs`.",
            "From: the pictures above.",
            f"Prompt or command: `node assets-src/materials/make-materials.mjs {place}`.", "",
            "What it holds: the settings of the script, and for each tile its name, the real width of one repeat in metres and its mean colour in linear light, so a place can tint or blend by number.",
            "Date: 2026-11-25", ""]
    open(f'assets-src/{place}/mat/RECIPE.md', 'w').write('\n'.join(out))
    print(place, len(rows), 'pictures')
