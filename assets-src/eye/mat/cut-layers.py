"""Cuts the long lens picture of the far wall (public/assets/eye/mat/far-long3.jpg) into three layers that stand one behind another:
the scree at the foot, the buttresses, and the far face between and behind them.

The lines are drawn by hand over the picture (points below, read off thirds of the picture shown 1430 wide) and then pulled onto
the edge that is in the picture by a cut of colour (GrabCut) kept to a narrow band either side of the hand's line. Nothing is read
from how dark the picture is.

Writes, beside the picture:
  far-long3-cut.png   red: buttress, green: scree foot, where neither: far face; blue: see below. Half the picture's size.

Run from the repo root: python3 assets-src/eye/mat/cut-layers.py
"""
import cv2
import numpy as np

SRC = 'public/assets/eye/mat/far-long3.jpg'
REACH = 40  # rows of the half-size picture
K = 1672 / 1430  # a point read off a third of the picture shown 1430 wide, in the picture's own pixels

# Where the scree meets the rock, third by third from the left.
SCREE = [
    [(0, 445), (20, 480), (140, 490), (160, 520), (320, 535), (480, 500), (600, 535), (665, 540), (690, 480), (745, 440), (760, 470),
     (880, 485), (960, 480), (1030, 470), (1040, 495), (1130, 500), (1250, 555), (1330, 570), (1430, 600)],
    [(0, 600), (120, 600), (130, 540), (200, 520), (290, 500), (420, 500), (450, 470), (520, 450), (560, 445), (640, 470), (720, 492),
     (760, 480), (830, 455), (895, 410), (930, 400), (1040, 405), (1100, 380), (1160, 355), (1230, 392), (1260, 380), (1330, 330),
     (1380, 290), (1430, 270)],
    [(0, 270), (100, 285), (200, 255), (330, 235), (420, 210), (560, 180), (640, 140), (700, 118), (760, 115), (830, 125), (900, 150),
     (1000, 200), (1100, 250), (1200, 300), (1300, 335), (1430, 360)],
]
# The buttresses, in the middle third: the stepped sunlit rock that fills the left of the picture up to this line, and the pale bulge the cave is in.
LEFT_EDGE = [(480, 0), (470, 200), (455, 300), (440, 470)]
BULGE = [(790, 60), (900, 100), (1010, 110), (1120, 160), (1200, 210), (1245, 290), (1250, 385), (1230, 392), (1160, 355), (1100, 380),
         (1040, 405), (930, 400), (895, 410), (830, 455), (760, 480), (735, 470), (745, 330), (770, 200)]


def full(points, third):
    return [(third * 1672 + x * K, y * K) for x, y in points]


def pulled(img, hand, band):
    """The hand's cut, moved onto the picture's own edge within band pixels of it."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * band + 1, 2 * band + 1))
    sure_in = cv2.erode(hand, kernel)
    sure_out = cv2.erode(255 - hand, kernel)
    m = np.where(hand > 127, cv2.GC_PR_FGD, cv2.GC_PR_BGD).astype(np.uint8)
    m[sure_in > 127] = cv2.GC_FGD
    m[sure_out > 127] = cv2.GC_BGD
    cv2.grabCut(img, m, None, np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64), 4, cv2.GC_INIT_WITH_MASK)
    out = np.where((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # Specks either side of the line are no part of it.
    out = cv2.morphologyEx(out, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    out = cv2.morphologyEx(out, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    return out


def main():
    big = cv2.imread(SRC)
    h, w = big.shape[:2]
    img = cv2.resize(big, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    hh, ww = img.shape[:2]

    line = [p for third in range(3) for p in full(SCREE[third], third)]
    scree_hand = np.zeros((hh, ww), np.uint8)
    poly = np.array([(x / 2, y / 2) for x, y in line] + [(ww, hh), (0, hh)], np.int32)
    cv2.fillPoly(scree_hand, [poly], 255)
    scree = pulled(img, scree_hand, 22)

    butt_hand = np.zeros((hh, ww), np.uint8)
    left = np.array([(0, 0)] + [(x / 2, y / 2) for x, y in full(LEFT_EDGE, 1)] + [(0, hh)], np.int32)
    cv2.fillPoly(butt_hand, [left], 255)
    cv2.fillPoly(butt_hand, [np.array([(x / 2, y / 2) for x, y in full(BULGE, 1)], np.int32)], 255)
    butt = pulled(img, butt_hand, 12)
    butt[scree > 127] = 0

    # Soft by a pixel or two, so no layer has a cut edge.
    cut = np.zeros((hh, ww, 3), np.uint8)
    cut[..., 2] = cv2.GaussianBlur(butt, (0, 0), 1.2)
    cut[..., 1] = cv2.GaussianBlur(scree, (0, 0), 1.2)

    # Blue: behind the buttresses and the scree the far face goes on, and where the layers part a strip of it is uncovered. There the
    # shader shows the face that stands above the cut edge, folded down about that edge. Blue is how many rows above a point the far face
    # begins (REACH rows is 1), and 0 where that is further than a climbing lens ever uncovers.
    front = cv2.dilate(np.maximum(butt, scree), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 127
    rows = np.zeros((hh, ww), np.float32)
    for y in range(1, hh):
        rows[y] = np.where(front[y], rows[y - 1] + 1, 0)
    cut[..., 0] = np.where(rows <= REACH, rows * (255.0 / REACH), 0).astype(np.uint8)
    cv2.imwrite('public/assets/eye/mat/far-long3-cut.png', cut)
    print('scree', int((scree > 127).mean() * 100), 'percent; buttress', int((butt > 127).mean() * 100), 'percent')


main()
