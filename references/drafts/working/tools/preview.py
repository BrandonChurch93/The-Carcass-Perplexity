#!/usr/bin/env python3
"""Cut quick previews of frames 2, 3 and 4 from a master. usage: preview.py <master.png> <tag>  ->  tmp/<tag>-f2.jpg, -f3.jpg, -f4.jpg"""
import sys, json, cv2
R = '/home/user/workspace/r3/'
m = cv2.imread(sys.argv[1]); tag = sys.argv[2]
F = json.load(open(R + 'pull/frames-x2.json')); k = m.shape[1] / 1982.0
for n in ('f2', 'f3', 'f4'):
    f = F[n]; x0, y0, w, h = [f[q] * k for q in ('x0', 'y0', 'w', 'h')]
    c = m[int(round(y0)):int(round(y0 + h)), int(round(x0)):int(round(x0 + w))]
    c = cv2.resize(c, (1672, 941), interpolation=cv2.INTER_AREA if c.shape[1] > 1672 else cv2.INTER_CUBIC)
    cv2.imwrite(R + 'tmp/%s-%s.jpg' % (tag, n), c, [cv2.IMWRITE_JPEG_QUALITY, 90])
print('ok', tag)
