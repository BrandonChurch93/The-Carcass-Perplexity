# The fronds, made ready for cutting

Made by `assets-src/breath/plumes/make_frond.py` from the working pictures `public/assets/breath/mat/frond.jpg` and `public/assets/breath/mat/frond-b.jpg` (with its cover `frond-b-a.png`). Run from the repository root: `python3 assets-src/breath/plumes/make_frond.py`.

## public/assets/breath/plumes/frond.jpg

The colour of the frond picture, carried outward from every thread into the black round it, so that a thread read at its edge is its own red. 2048 x 768, the root at the left, the stem along the middle.

## public/assets/breath/plumes/frond-a.png

Data. Red: the distance to the edge of a thread (128 at the edge, 16 to a pixel of the picture, more inside), cut at 0.5. Green: how thick the growth is round a place (the cover blurred over 14 pixels): where it is thick the threads shade one another. 2048 x 768.

## public/assets/breath/plumes/frond-b.jpg

The colour of the sparse ragged frond, its root lump left out (the left 8.5 percent of the picture), carried outward from every lock into the black round it. 2048 x 768, the root at the left, the stem along the middle.

## public/assets/breath/plumes/frond-b-a.png

Data, as `frond-a.png`: red the distance to the edge of a lock, read from the cover given with the picture; green how thick the growth is round a place. 2048 x 768.
