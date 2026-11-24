import fs from 'node:fs';
import { args, utc } from './lib/paths.mjs';
import * as P from './lib/progress.mjs';

const a = args();
const val = (v) => (Array.isArray(v) ? v.join(' ') : v);
let t = P.read();
if (a.append) t = P.appendSection(val(a.append), a.file ? fs.readFileSync(val(a.file), 'utf8').trim() : val(a.line), t);
else if (a.set) t = P.setSection(val(a.set), a.file ? fs.readFileSync(val(a.file), 'utf8') : val(a.body), t);
else if (a.line && a.key) t = P.setLine(val(a.key), val(a.line), t);
else if (a.key) t = P.setLine(val(a.key), val(a.value), t);
else if (a.row) t = P.setRow(val(a.row), val(a.cells).split('|').map((c) => (c.trim() === '=' ? null : c.trim())), t);
else if (a.log) t = P.appendSection('Session log', `- ${utc().replace('T', ' ').replace(/:\d\dZ$/, ' UTC')}. ${val(a.log)}`, t);
else if (a.decide) t = P.appendSection('Decisions made by the Builder', `- ${utc().slice(0, 10)}. ${val(a.decide)}`, t);
else if (a.get) { console.log(P.getSection(val(a.get), t)); process.exit(0); }
else { console.log('usage: --append SECTION --line TEXT | --set SECTION --body TEXT | --key KEY --value V | --row FIRST --cells "a|b|=|c" | --log TEXT | --decide TEXT | --get SECTION'); process.exit(1); }
P.write(t);
