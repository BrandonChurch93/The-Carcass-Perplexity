#!/usr/bin/env python3
"""The script as plain text for the thread: every clip, every line, and under each marked line why it is marked
and its two replacements. Reads cut/SCRIPT-SHEET.json, writes out/work/script/text.json (for the inline block,
tools/status/script-text-widget.html) and out/work/script/text.md (the same as chat text)."""
import json, sys

SHORT = {
    'n2.2': 'too long: 6.4 s, and the shot has 4.3 s left',
    'n2.3': 'too long: 7.8 s over 7.1 s of picture',
    'n3.4': 'the shot shows the fire first and the one that sank second, and it is tight',
    'n4.3': 'too long: 5.3 s on a shot of 3.6 s',
    'n4.4': 'a living one feeds at the rim in this shot, as the line says never',
    'n5.2': 'said over the stalks, and no line names them',
    'n6.2': 'the ridge is inside the storm in this shot, not above it',
    'n6.4': 'tight: 6.7 s in a shot of 7.2 s',
    'n7.3': 'too long: 6.5 s on a shot of 5.4 s',
    'n7.4': 'tight: 6.0 s in a shot of 6.3 s',
    'n8.1': 'too long: 4.3 s, and 2.8 s are free before the strike',
}

def clock(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"

def main():
    sheet = json.load(open('cut/SCRIPT-SHEET.json'))
    draft = json.load(open('cut/SCRIPT-DRAFT.json'))
    stands = {f"{c['id']}.{i + 1}": l['mark']['stands'] for c in draft['clips'] for i, l in enumerate(c['lines']) if l.get('mark', {}).get('stands')}
    rows = {}
    for r in sheet['rows']:
        rows.setdefault(r['clip'], []).append(r)
    clips = []
    for c in sheet['clips']:
        lines = []
        for r in sorted(rows[c['id']], key=lambda r: r['line']):
            m = r.get('mark')
            item = {'id': r['id'], 'n': r['line'], 'text': r['text']}
            if m:
                first = m['why'].split('. ')[0].rstrip('.')
                why = SHORT.get(r['id']) or first
                pick = stands.get(r['id'])
                if pick:
                    # The replacement that stands is the line; his own words and the reason go under it.
                    item['text'] = m['replace'][0 if pick == 'A' else 1]['text']
                    item['was'] = r['text']
                    item['reason'] = why
                else:
                    item['why'] = why
                    item['a'] = m['replace'][0]['text']
                    item['b'] = m['replace'][1]['text']
            lines.append(item)
        clips.append({'id': c['id'], 'title': c['title'], 'when': f"{clock(c['from'])} to {clock(c['to'])}", 'lines': lines})
    t = sheet['totals']
    with_a = sum((r['mark']['replace'][0]['seconds'] if r.get('mark') else r['seconds']) for r in sheet['rows'])
    out = {'clips': clips, 'totals': {'lines': t['lines'], 'marked': t['marked'], 'seconds': round(t['seconds'], 1),
                                      'withA': round(with_a, 1), 'approved': t['approvedSeconds']}}
    json.dump(out, open('out/work/script/text.json', 'w'), indent=1)
    md = []
    for c in clips:
        md.append(f"**{c['id']} · {c['title']}** ({c['when']})")
        for l in c['lines']:
            md.append(f"{l['n']}. {l['text']}")
            if 'why' in l:
                md.append(f"   - Marked: {l['why']}. A: \"{l['a']}\" B: \"{l['b']}\"")
            if 'was' in l:
                md.append(f"   - Your words: \"{l['was']}\" ({l['reason']})")
        md.append('')
    open('out/work/script/text.md', 'w').write('\n'.join(md))
    print(f"script text: {len(clips)} clips, {t['lines']} lines, {t['marked']} marked, {out['totals']['seconds']} s as written, {out['totals']['withA']} s with every A")

if __name__ == '__main__':
    sys.exit(main())
