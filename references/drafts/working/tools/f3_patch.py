#!/usr/bin/env python3
"""Prepare the head-and-shoulders crop for its re-photograph after the head was replaced.
Removes what is left of the old head above the new head's window (its vapour plume and a few islets),
then lays the old plume back in, sheared so that its foot stands on the new plume.
usage: f3_patch.py <master.png> <out_crop.png>   (the crop is the frame-3 window: master x 101, y 827, 1672 x 941)"""
import sys, numpy as np, cv2
M = cv2.imread(sys.argv[1]); X0, Y0 = 101, 827
c = M[Y0:Y0 + 941, X0:X0 + 1672].astype(np.float32)
H, W = c.shape[:2]
poly = np.array([(610, 0), (900, 0), (900, 40), (870, 85), (868, 110), (888, 150), (895, 180), (915, 210), (920, 250), (902, 290), (897, 318), (560, 318), (575, 250), (600, 180)], np.int32)
mask = np.zeros((H, W), np.float32); cv2.fillPoly(mask, [poly], 1.0)
mask[318:] = 0
soft = cv2.GaussianBlur(mask, (0, 0), 5); soft[318:] = 0
# open water copied from 300 px to the left, same rows
fill = np.roll(c, 300, axis=1)
clean = c * (1 - soft[..., None]) + fill * soft[..., None]
# the old plume, sheared to the right toward its foot so it meets the new plume inside the window
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
shift = 95.0 * np.clip(yy / 318.0, 0, 1) ** 1.5
sheared = cv2.remap(c, xx - shift, yy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
b, g, r = sheared[..., 0], sheared[..., 1], sheared[..., 2]
a = np.clip((r - 55) / 45.0, 0, 1) * (r < b + 6)            # grey haze, not tan land
a = cv2.GaussianBlur(a, (0, 0), 3) * cv2.GaussianBlur(cv2.remap(mask, xx - shift, yy, cv2.INTER_LINEAR), (0, 0), 6)
a[318:] = 0
a = np.clip(a, 0, 1)[..., None]
out = clean * (1 - a) + sheared * a
cv2.imwrite(sys.argv[2], np.clip(out, 0, 255).astype(np.uint8)); print(sys.argv[2])
