# The plume spray, made ready for cutting

Made by `assets-src/breath/plumes/make_spray.py` from the working picture `public/assets/breath/mat/plume.jpg` and its cover `public/assets/breath/mat/plume-a.png`. Run from the repository root: `python3 assets-src/breath/plumes/make_spray.py`.

## public/assets/breath/plumes/spray.jpg

The colour of the plume picture, carried outward from every thread into the black round it, so that a thread read at its edge is its own red and has no dark fringe. 1536 x 1024.

## public/assets/breath/plumes/spray-a.png

The cover the sprays are cut by: where the picture is not dark and is brighter than what lies round it (92 percent of its own mean over 7 pixels), inside the given cover, softened by 0.6 of a pixel. It follows the single threads and leaves the gaps between them open, which the given cover does not. It is stored as a distance to the edge of the thread: 128 at the edge, 16 to a pixel of the picture, more inside. 1536 x 1024, one channel.
