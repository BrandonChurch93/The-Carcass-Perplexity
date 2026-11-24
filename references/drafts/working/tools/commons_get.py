#!/usr/bin/env python3
"""Download one Wikimedia Commons file at 1600 px and append its credit. usage: commons_get.py "<File:title>" <out name> "<use>" """
import sys, json, urllib.request, urllib.parse, re, os
title, name, use = sys.argv[1], sys.argv[2], sys.argv[3]
UA = {'User-Agent': 'carcass-reference-run/0.3 (brandon.church@perplexity.ai)'}
u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1600})
d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20))
p = list(d['query']['pages'].values())[0]; ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
g = lambda k: re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', m.get(k, {}).get('value', ''))).strip()
out = f'/home/user/workspace/r3/real/{name}.jpg'
open(out, 'wb').write(urllib.request.urlopen(urllib.request.Request(ii['thumburl'], headers=UA), timeout=60).read())
line = f"- `{name}.jpg`: \"{title.replace('File:', '')}\" by {g('Artist')}, {g('LicenseShortName')}, {ii['descriptionurl']} . Use: {use}\n"
open('/home/user/workspace/r3/real/CREDITS.md', 'a').write(line); print(out, os.path.getsize(out), g('LicenseShortName'))
