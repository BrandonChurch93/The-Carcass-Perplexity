#!/usr/bin/env python3
"""Round 3 log. usage:
 log.py call "<text>"                      decision / call made
 log.py status "<text>"                    status post recorded
 log.py take <id> --model M --prompt P --refs a,b --secs N --path X [--what "..."]   register a generated take
 log.py eye <id> "<text>" [--keep|--drop]  my own check of a take
 log.py crit <id> <critic> "<text>"        a critic's answer on a take or set
 log.py keep <slot> <id> --reason "..." [--faults "..."]   mark a take as the kept image of a slot
"""
import sys, json, os, time, argparse
P = '/home/user/workspace/r3/log.json'
START = 1795476717  # 2026-11-23T23:31:57Z
def load():
    if os.path.exists(P): return json.load(open(P))
    return {'start': '2026-11-23T23:31:57Z', 'calls': [], 'status': [], 'takes': {}, 'kept': {}, 'order': []}
def stamp():
    now = time.time(); el = int(now - START)
    return time.strftime('%H:%M', time.gmtime(now)), f"{el//3600}h{(el%3600)//60:02d}m"
L = load(); cmd = sys.argv[1]; t, el = stamp()
if cmd in ('call', 'status'):
    L['calls' if cmd == 'call' else 'status'].append({'t': t, 'el': el, 'text': sys.argv[2]})
elif cmd == 'take':
    a = argparse.ArgumentParser(); a.add_argument('id'); a.add_argument('--model'); a.add_argument('--prompt'); a.add_argument('--refs', default=''); a.add_argument('--secs', default=''); a.add_argument('--path'); a.add_argument('--what', default=''); a.add_argument('--size', default='')
    x = a.parse_args(sys.argv[2:])
    L['takes'][x.id] = {'id': x.id, 'model': x.model, 'prompt': x.prompt, 'refs': [r for r in x.refs.split(',') if r], 'secs': x.secs, 'path': x.path, 'what': x.what, 'size': x.size, 't': t, 'el': el, 'eye': [], 'crit': []}
    L['order'].append(x.id)
elif cmd == 'eye':
    e = {'t': t, 'text': sys.argv[3]}
    if '--keep' in sys.argv: e['v'] = 'keep'
    if '--drop' in sys.argv: e['v'] = 'drop'
    L['takes'][sys.argv[2]]['eye'].append(e)
elif cmd == 'crit':
    L['takes'].setdefault(sys.argv[2], {'id': sys.argv[2], 'eye': [], 'crit': []})['crit'].append({'t': t, 'critic': sys.argv[3], 'text': sys.argv[4]})
elif cmd == 'keep':
    a = argparse.ArgumentParser(); a.add_argument('slot'); a.add_argument('id'); a.add_argument('--reason', default=''); a.add_argument('--faults', default='')
    x = a.parse_args(sys.argv[2:])
    L['kept'][x.slot] = {'id': x.id, 'reason': x.reason, 'faults': x.faults, 't': t, 'el': el}
json.dump(L, open(P, 'w'), indent=1)
print(cmd, 'ok', t, el)
