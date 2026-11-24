#!/usr/bin/env python3
"""Search Wikimedia Commons for free photographs. usage: commons.py "<query>" [n]"""
import sys, json, urllib.request, urllib.parse, re
q = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
u = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': n, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1600})
req = urllib.request.Request(u, headers={'User-Agent': 'carcass-reference-run/0.3 (brandon.church@perplexity.ai)'})
d = json.load(urllib.request.urlopen(req, timeout=20))
for p in sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0)):
    ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
    g = lambda k: re.sub('<[^>]+>', '', m.get(k, {}).get('value', ''))[:60]
    print(json.dumps({'title': p['title'], 'w': ii['width'], 'h': ii['height'], 'lic': g('LicenseShortName'), 'artist': g('Artist'), 'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl')}))
