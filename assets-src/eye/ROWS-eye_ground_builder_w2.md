# Files of the Eye's ground that are not computed in the build (eye_ground_builder_w2)

| file | what it is | tool and model | prompt | take | date |
| --- | --- | --- | --- | --- | --- |
| public/assets/eye/land/outcrop-map.png, outcrop-rock.png, outcrop-mesh.png | The relief of the outcrop baked from the film's own code: its lie and occlusion, rock or rubble, and the corners of its mesh | assets-src/eye/land/bake-outcrop.ts (tsx, sharp; no picture goes in, no model) | none | 1 | 2026-11-26 |
| public/assets/eye/land/lip-nh.jpg, lip-tone.jpg | The gravel of the wet lip at the shore camera: the lie and height of its stones, and their tone, hue and occlusion | assets-src/eye/land/make_gravel_lip.py (Python 3, numpy, Pillow, scipy; no picture goes in, no model) | none | 1 | 2026-11-26 |
