# Pictures of the waders

The skin of the waders, alive and dead, reads two pictures of its own, both built by one script from one generated picture. The script was written after the first build of the two files, which was typed by hand and not kept; both files were then remade by the script, so what is committed is what the script writes.

## `public/assets/breath/waders/hide.jpg`

Made by: `assets-src/breath/waders/make-hide.py` (Python 3.14.8, Pillow 13.0.0, numpy 2.5.5, scipy 1.18.1)
From: `assets-src/breath/waders/hide-take1.png`
Prompt or command: `python3 assets-src/breath/waders/make-hide.py` from the repository root. It takes the middle 1024 by 1024 of the source, takes out its large light (a blur of 64 pixels subtracted), lets a band of 96 pixels at each edge give way to the picture moved by half its size so that it wraps, and sets its mean to the hide's (0.693, 0.585, 0.53). Saved as JPEG at quality 92.
Takes: 1 made, 1 kept
Why this one: pores, creases, veins and blotches at a scale that holds at 3840 wide on the nearest wader, with no patch of light that would show the repeat.
Date: 2026-11-26

## `public/assets/breath/waders/hide-nh.png`

Made by: `assets-src/breath/waders/make-hide.py` (Python 3.14.8, Pillow 13.0.0, numpy 2.5.5, scipy 1.18.1)
From: `assets-src/breath/waders/hide-take1.png`, through the sheet above
Prompt or command: `python3 assets-src/breath/waders/make-hide.py` from the repository root. The blue channel holds the fine part of the sheet's brightness (the brightness less its blur of 16 pixels, times 3.4, about one half); red and green are held at 128.
Takes: 1 made, 1 kept
Why this one: the relief stands where the picture shows a pore or a crease, so light and tone agree, and the blotches stay flat.
Date: 2026-11-26

## `assets-src/breath/waders/hide-take1.png`

Made by: generate_image, default model
From: nothing, a prompt alone
Prompt or command: "Seamless tileable texture, flat top-down macro photograph filling the whole frame edge to edge: pale cream-pink bare skin of a plucked wading bird, wet. Dense goose-flesh follicle bumps and pores, fine crossing creases and wrinkles, a few faint blue-violet veins branching under the skin, irregular rose and raw red blotches, small scabs and silt specks. Even soft diffuse light, no cast shadows, no highlights hot spots, no vignette, no border, no text, no feathers, no eyes. Uniform scale across the frame, photographic, extremely sharp detail."
Takes: 1 made of the 6 allowed, take 1 kept
Why this one: the first take already gave even light and a uniform scale, so no second was spent.
Date: 2026-11-26
