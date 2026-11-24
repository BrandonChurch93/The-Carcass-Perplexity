#!/usr/bin/env python3
"""Enter in log.json, with their real times, the decisions and the status posts of the reveal redo that were made in the thread
but not logged at the time (log.py stamps 'now', so it cannot be used for this). Each entry is marked as entered afterwards.
The status texts are the picture captions of each status as posted, read back from the saved status payloads (tmp/inline/status<N>.json)."""
import json, os, time
R = '/home/user/workspace/r3'; P = f'{R}/log.json'; L = json.load(open(P)); START = 1795476717
def el(t):
    h, m = map(int, t.split(':')); sec = (h * 3600 + m * 60) + 86400 - (23 * 3600 + 31 * 60 + 57)
    return f"{sec // 3600}h{(sec % 3600) // 60:02d}m"
now = time.strftime('%H:%M', time.gmtime())
CALLS = [
 ('03:10', "Reveal redo, new start. Pose: on its back, head left, feet right, one arm raised, one knee bent, so that the outline reads at once and no two limbs lie alike. Seen from almost straight above, the planet's edge only at the top left."),
 ('03:48', "First body: 24 takes on five procedural layout maps (rv4), 03:27 to 03:48. rv4-t23 chosen."),
 ('06:02', "Pull-back built on rv4-t23 by re-photographing windows of it from closer (masters v1 to v8; takes pb3, tile, pb2, pb1, bl, fl, fu, hl, hu, cs, sm), 03:51 to 06:02. Tested six times on fresh viewers (a1 to ag3) and rebuilt each time: side-on head read as an animal and was replaced by a face-up skull; storm, sea specks, belly and neck join reworked."),
 ('06:03', "User note: 'One update currently it looks like the Titan is just laying down in the ocean. I don't know if I love that. He doesn't look deep composed or creepy enough.' Read as 'decomposed'; applied without asking. The whole first body is dropped with its eight masters. New rule: the outline says corpse, the surface says continent. STATE brief added so that 'creepy' is measured against the old body as baseline."),
 ('06:20', "The carcass: 14 takes from text and real orbital photographs only (cx), 06:12 to 06:20. Viewers flagged the first ones as sculpted, so they were re-photographed toward real orbital photography. cx-t9 chosen."),
 ('06:39', "Master built on cx-t9 (master-c1, then master-x1 with more ocean round it) and tested (ao1 to ar3). The skeleton reads at once. Corrections the tests asked for: shoulder joints and collar bones, plainer limbs with hands and feet, a through-going strait between two rows of ribs, the storm on the backbone, a whiter salt pan."),
 ('06:54', "Those corrections painted onto master-x1 as a layout (tools/guide_e.py, guide/cx-e-guide.png) and the wide picture made again from it: cx-e, three takes. cx-e-t2 chosen by eye and tested (as1 to au4) before anything was built on it."),
 ('07:15', "Set x2: 21 closer plates of cx-e-t2 (e2), joined into master-x2 (tools/master.py); Heart lights added by script (tools/heart_x2.py); frame 1 plate pb1d. Tested (av1 to bc2): GLANCE 3 of 3, FULL 6 of 6, but the head reads as carved and the storm as an eruption or explosion to 4 of 6."),
 ('07:42', "Set x4: head and storm re-photographed (e3-HD, five takes, takes 2 to 5 each tested on three viewers, take 4 kept; e3-ST-t1 kept), new frame 1 plate pb1e-t1. Tested (bi1 to bp2)."),
 ('07:55', "Set x5: frame 3 of x4 drew 'a giant fish skeleton' from one viewer of three and 'fish-bone or feathers' from a second. Three other windows tested on nine new viewers (bq1 to bs3); window D adopted, by my choice on their answers."),
 ('08:13', "Set x6: PROPORTION test on x5 (bt1 to bt3) says head too big 3 of 3. Head reduced to 0.66 and neck lengthened by one smooth warp of the master (tools/headwarp.py, tag c). Frame 2 drawn through the warp so the tested head is kept pixel for pixel; the sea round it re-photographed once (pb2g-t2) and merged outside a head mask (tools/f2_merge.py). master-x6."),
 ('08:19', "x6 tested on 26 new viewers (bu1 to cb2): GLANCE 3 of 3, FULL 6 of 6, STATE 4, 4, 4, PLACES 6, 5, 6 of 6, head right 2 of 3 and slightly too big 1 of 3. Decision: stop here and hand over. The waist reads too long to 3 of 3 in the PROPORTION test; it is left as it is because that stretch of backbone is The Spine and carries the storm. Offered to the user as an option."),
 ('08:33', "Record faults found and mended: prompts/pb2-g.txt had been overwritten at 08:10 with the new frame 2 prompt (now prompts/pb2-x6.txt); the original text was restored word for word from the session record. Ten replies of the x4 round that had not been saved to file were restored word for word from the session record (bp2 is cut at 4,000 characters there and is marked so)."),
]
have = {c['text'][:40] for c in L['calls']}
for t, text in CALLS:
    if text[:40] not in have: L['calls'].append({'t': t, 'el': el(t), 'text': text, 'entered': f'{now}, after the fact'})
ST = []
for n in range(2, 15):
    f = f'{R}/tmp/inline/status{n}.json'; d = json.load(open(f)); items = d if isinstance(d, list) else list(d.values())[0]
    t = time.strftime('%H:%M', time.gmtime(os.path.getmtime(f)))
    caps = [next(v for k, v in it.items() if isinstance(v, str) and not v.startswith('data:')) for it in items]
    ST.append({'t': t, 'el': el(t), 'text': f"Reveal redo status {n} ({t} UTC), posted inline in the thread with {len(caps)} pictures. Captions as posted: " + ' | '.join(caps), 'entered': f'{now}, after the fact'})
if not any('Reveal redo status 2 ' in s['text'] for s in L['status']):
    i = next(k for k, s in enumerate(L['status']) if 'Reveal redo status 15' in s['text']); L['status'][i:i] = ST
KEPT = {
 'reveal-frame-1': dict(id='pb1e-t1', reason="Key frame 1, just above the lake: the round shore fills the frame. The plate pb1e-t1, graded to its window of the master. SCALE test (bo1 to bo3): real terrain 3 of 3.", faults="Read as 10 to 60 km wide against 250 km stated. A critic calls it 'vulnerable to macro/model' reads. Its mist plume, cliff wall and whitecaps are softer in frame 2."),
 'reveal-frame-2': dict(id='pb2g-t2 + e3-HD-t4', reason="Key frame 2, the skull massif: head from e3-HD-t4 drawn through the head warp, sea and throat from pb2g-t2. HEAD test (ca1 to ca3): skull or screaming face with the lake as an eye 3 of 3.", faults="The weakest frame for scale: read as 40 to 150 km wide against 920 km stated; one of three chose 'a painting or drawing'; round pits and lace-like texture called 'possibly artificial or miniature'."),
 'reveal-frame-3': dict(id='master-x6 (window)', reason="Key frame 3, head and shoulders: a window of master-x6. SCALE test (bz1 to bz3): real terrain 2 of 3, no fish read.", faults="Read as 100 to 300 km wide against 2,150 km stated. Several orange dots where frame 4 shows one. Sea beside the crown stretched up to 1.58 times by the head warp."),
 'reveal-frame-4': dict(id='master-x6 (window)', reason="Key frame 4, the reveal frame: the whole titan from orbit, a window of master-x6 (98.7% of its width). GLANCE 3 of 3, FULL 6 of 6, STATE 4, 4, 4, PLACES 6, 5 and 6 of 6 (bu1 to by3).", faults="Every viewer says skeleton. 3 of 6 call it a digital illustration. Waist reads too long 3 of 3; legs short, hands big, feet small. Red channels read as blood or dye. Storm 'puffy'. The body does not foreshorten with the planet's curve."),
}
for k, v in KEPT.items(): L['kept'][k] = {**v, 't': '08:19', 'el': el('08:19'), 'entered': f'{now}, after the fact'}
json.dump(L, open(P, 'w'), indent=1)
print('calls', len(L['calls']), 'status', len(L['status']), 'kept', len(L['kept']))
