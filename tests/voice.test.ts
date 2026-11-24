// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const core = await tool('lib/voice-core');
const eleven = await tool('lib/eleven');
const voice = await tool('voice');
const loud = await tool('lib/loudness');
const a2 = await tool('checks/a2');
const repo = await tool('checks/repo');
const { config, rel } = await tool('lib/paths');

const cfg = config();
const rate = cfg.audio.sampleRate;
const clip = cfg.narration.clips.find((c) => c.id === 'n8');
const FIX = rel('tests', 'fixtures', 'voice');
const fix = (name) => path.join(FIX, name);
const pairs = JSON.parse(fs.readFileSync(rel('tools', 'voice', 'sound-alikes.json'), 'utf8'));
const savedWords = JSON.parse(fs.readFileSync(fix('take-1.words.json'), 'utf8'));
const heard = { ran: true, model: core.VOICE.transcriber, text: savedWords.text, words: savedWords.words };
const HANDLE = 'secret-handle-123';
const STARTS = [0.32, 2.56, 4.88, 6.72];
const LENGTHS = [1.8, 1.96, 1.12, 4.72];

let root;
let saved;
let samples;

function freshRoot(withTake = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-voice-'));
  fs.copyFileSync(rel('ASSETS.md'), path.join(dir, 'ASSETS.md'));
  if (withTake) {
    const into = path.join(dir, voice.WORK, 'n8');
    fs.mkdirSync(into, { recursive: true });
    for (const ext of ['request.json', 'headers.txt', 'response.json']) fs.copyFileSync(fix(`take-1.${ext}`), path.join(into, `take-1.${ext}`));
    const response = JSON.parse(fs.readFileSync(fix('take-1.response.json'), 'utf8'));
    fs.writeFileSync(path.join(into, 'take-1.mp3'), Buffer.from(response.audio_base64, 'base64'));
  }
  return dir;
}

function deps(dir, extra = {}) {
  const lines = [];
  return { lines, cfg, root: dir, print: (l) => lines.push(l), env: {}, transcribe: () => heard, runner: () => { throw new Error('nothing may call out'); }, ...extra };
}

function fakeRunner({ left = 1000, status = '200', body = null } = {}) {
  const calls = [];
  const run = (argv) => {
    calls.push(argv);
    if (argv[argv.length - 1].endsWith('/user/subscription')) return { status: 0, stdout: JSON.stringify({ character_count: 5000 - left, character_limit: 5000, next_character_count_reset_unix: 1 }), stderr: '' };
    fs.copyFileSync(fix('take-1.headers.txt'), argv[argv.indexOf('-D') + 1]);
    if (body === null) fs.copyFileSync(fix('take-1.response.json'), argv[argv.indexOf('-o') + 1]);
    else fs.writeFileSync(argv[argv.indexOf('-o') + 1], body);
    return { status: 0, stdout: status, stderr: '' };
  };
  return { calls, run };
}

beforeAll(() => {
  root = freshRoot();
  samples = loud.decode(path.join(root, voice.WORK, 'n8', 'take-1.mp3'), { rate, channels: 1 })[0];
  const alignment = JSON.parse(fs.readFileSync(fix('take-1.response.json'), 'utf8')).alignment;
  saved = core.checkTake({ samples, rate, alignment, clip, heard, pairs });
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('the request', () => {
  it('is the body of the saved take, byte for byte', () => {
    expect(core.bodyText(core.requestBody(clip, 1, cfg))).toBe(fs.readFileSync(fix('take-1.request.json'), 'utf8'));
    expect(core.seedOf(3, cfg)).toBe(cfg.seed + 2);
  });

  it('costs what the newest saved headers say', () => {
    const text = core.requestText(clip);
    const per = core.costPerCharacter(fs.readFileSync(fix('take-1.headers.txt'), 'utf8'), text);
    expect(core.costOf(text, per)).toBe(49);
    expect(core.costOf(text, core.costPerCharacter(null, null))).toBe(Math.ceil(text.length * core.VOICE.costPerCharacter));
    expect(core.headerDay(fs.readFileSync(fix('take-1.headers.txt'), 'utf8'))).toBe('2026-11-24');
  });
});

describe('the split of the saved take', () => {
  it('finds the four lines of the alignment', () => {
    expect(saved.lines).toHaveLength(4);
    saved.lines.forEach((l, k) => {
      expect(Math.abs(l.alignedStart - STARTS[k])).toBeLessThanOrEqual(0.05);
      expect(Math.abs(l.alignedEnd - l.alignedStart - LENGTHS[k])).toBeLessThanOrEqual(0.05);
      expect(l.text).toBe(clip.lines[k]);
    });
  });

  it('moves each edge to where the sound starts and stops, inside its reach', () => {
    const win = core.windowLevels(samples, rate);
    const at = (t) => win.levels[Math.min(win.levels.length - 1, Math.max(0, Math.round(t / win.seconds)))];
    saved.lines.forEach((l, k) => {
      expect(Math.abs(l.start - l.alignedStart)).toBeLessThanOrEqual(core.LIMITS.edgeReachSeconds + 1e-6);
      expect(Math.abs(l.end - Math.min(l.alignedEnd, saved.seconds))).toBeLessThanOrEqual(core.LIMITS.edgeReachSeconds + 1e-6);
      expect(at(l.start)).toBeLessThanOrEqual(core.LIMITS.edgeQuietDb);
      expect(at(l.end - win.seconds)).toBeLessThanOrEqual(core.LIMITS.edgeQuietDb);
      if (k > 0) expect(l.start).toBeGreaterThanOrEqual(saved.lines[k - 1].end);
    });
  });

  it('measures the take near the reference numbers', () => {
    expect(Math.abs(saved.seconds - 11.36)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(saved.pitch.medianHz - 87)).toBeLessThanOrEqual(3);
    expect(Math.abs(saved.lufs - -19.3)).toBeLessThanOrEqual(0.3);
    expect(saved.wordCount).toBe(20);
    expect(saved.pauses).toHaveLength(3);
    expect(saved.truePeakDb).toBeLessThan(0);
  });
});

describe('the words', () => {
  const script = 'Now you see it. This was never land. It was a god. Gods die slow.';
  it('match when only case and punctuation differ', () => {
    expect(core.compareWords(script, 'now, you see it this was never land it was a god. gods die slow').result).toBe('match');
  });
  it('are a sound-alike when every difference is a listed pair', () => {
    const r = core.compareWords(script, 'Now, you see it. This was Neverland. It was a god. Guards die slow.', pairs);
    expect(r.result).toBe('sound-alike');
    expect(r.pairs).toEqual([['never land', 'neverland'], ['gods', 'guards']]);
    expect(saved.words.result).toBe('sound-alike');
    expect(core.compareWords(script, 'Now you see it. This was Neverland. It was a god. Guards die slow.', []).result).toBe('differs');
  });
  it('differ on a missing word, an extra word and a wrong word', () => {
    const missing = core.compareWords(script, 'Now you see it. This was never land. It was god. Gods die slow.', pairs);
    expect(missing.result).toBe('differs');
    expect(missing.differs).toEqual(['missing "a"']);
    const extra = core.compareWords(script, 'Now you see it. This was never ever land. It was a god. Gods die slow.', pairs);
    expect(extra.differs).toEqual(['extra "ever"']);
    const wrong = core.compareWords(script, 'Now you see it. This was never land. It was a dog. Gods die slow.', pairs);
    expect(wrong.differs).toEqual(['"dog" for "god"']);
    const rejected = core.checkTake({ samples, rate, alignment: JSON.parse(fs.readFileSync(fix('take-1.response.json'), 'utf8')).alignment, clip, heard: { ...heard, text: heard.text.replace('finished', 'famished') }, pairs });
    expect(rejected.rejected).toBe(true);
    expect(rejected.reasons[0]).toContain('"famished" for "finished"');
  });
  it('are not a pass when the transcriber did not run', () => {
    const r = core.checkTake({ samples, rate, alignment: JSON.parse(fs.readFileSync(fix('take-1.response.json'), 'utf8')).alignment, clip, heard: { ran: false, why: 'faster_whisper is missing' }, pairs });
    expect(r.words.result).toBe('not run');
  });
});

describe('the faults', () => {
  const SECONDS = 9;
  const LINES = [
    { line: 1, text: 'one two three', start: 0.5, end: 2 },
    { line: 2, text: 'four five six seven', start: 3, end: 5 },
    { line: 3, text: 'eight nine ten', start: 6, end: 8 }
  ];
  const made = (change = () => {}, lines = LINES) => {
    const x = new Float32Array(SECONDS * rate);
    const tone = (from, to, level) => {
      for (let i = Math.round(from * rate); i < Math.round(to * rate); i++) x[i] = level * Math.sin((2 * Math.PI * 150 * i) / rate);
    };
    for (const l of LINES) tone(l.start, l.end, 0.3);
    change(x, tone);
    return core.findFaults({ samples: x, rate, win: core.windowLevels(x, rate), lines, words: [['one', 0.5, 1, 0.9]] }).map((f) => f.fault);
  };

  it('finds none in a clean made-up signal and none in the saved take', () => {
    expect(made()).toEqual([]);
    expect(saved.faults).toEqual([]);
    expect(saved.rejected).toBe(false);
  });
  it('names a clipped take', () => {
    expect(made((x) => x.fill(1, rate, rate + 3))).toEqual(['clipped']);
    expect(made((x, tone) => tone(1, 1.5, 0.98))).toEqual(['clipped']);
  });
  it('names a noise between lines', () => {
    expect(made((x, tone) => tone(2.3, 2.6, 0.02))).toEqual(['gap noise']);
    expect(made((x, tone) => tone(2.3, 2.4, 0.02))).toEqual([]);
  });
  it('names a line that stalls', () => {
    expect(made((x, tone) => tone(3.2, 4.9, 0))).toEqual(['stalls']);
  });
  it('names a line that is too slow or rushed', () => {
    expect(made(() => {}, [{ ...LINES[0], text: 'one' }, LINES[1], LINES[2]])).toEqual(['too slow']);
    expect(made(() => {}, [LINES[0], { ...LINES[1], text: 'a b c d e f g h' }, LINES[2]])).toEqual(['rushed']);
  });
  it('names a take that is cut off', () => {
    expect(made((x, tone) => tone(8, SECONDS, 0.3), [LINES[0], LINES[1], { ...LINES[2], end: SECONDS }])).toEqual(['cut off']);
  });
  it('names an unclear word', () => {
    const x = new Float32Array(rate);
    const faults = core.findFaults({ samples: x, rate, win: core.windowLevels(x, rate), lines: [], words: [['mumble', 0.2, 0.4, 0.1], ['clear', 0.4, 0.6, 0.9]] });
    expect(faults.map((f) => f.fault)).toEqual(['unclear word']);
    expect(faults[0].text).toContain('mumble');
  });
  it('rejects a take the verdict file faults', () => {
    const r = core.checkTake({ samples, rate, alignment: JSON.parse(fs.readFileSync(fix('take-1.response.json'), 'utf8')).alignment, clip, heard, pairs, verdict: { fault: 'words' } });
    expect(r.rejected).toBe(true);
    expect(r.reasons.join(' ')).toContain('words');
  });
});

describe('the keep order', () => {
  const t = (take, wpm, pitchHz, rejected = false) => ({ take, wpm, pitchHz, rejected, reasons: rejected ? ['It is clipped.'] : [] });
  it('keeps the slowest and lowest', () => {
    expect(core.chooseTake([t(1, 140, 95), t(2, 120, 85), t(3, 130, 90)]).take).toBe(2);
  });
  it('breaks a tie with the lower pitch', () => {
    expect(core.chooseTake([t(1, 120, 95), t(2, 130, 85)]).take).toBe(2);
  });
  it('puts a rejected take behind any other', () => {
    const c = core.chooseTake([t(1, 100, 70, true), t(2, 150, 110)]);
    expect(c.take).toBe(2);
    expect(c.withFault).toBe(false);
    expect(c.order.map((o) => o.take)).toEqual([2, 1]);
  });
  it('keeps the best when every take was rejected, and says so', () => {
    const c = core.chooseTake([t(1, 140, 95, true), t(2, 120, 85, true)]);
    expect(c.take).toBe(2);
    expect(c.withFault).toBe(true);
    expect(c.why).toContain('kept with a fault');
    expect(c.why).toContain('It is clipped.');
  });
  it('puts a take more than 20 percent from the kept clips behind those within', () => {
    expect(core.chooseTake([t(1, 100, 60), t(2, 140, 92)], [90, 88]).take).toBe(2);
    expect(core.chooseTake([t(1, 100, 60), t(2, 140, 92)], []).take).toBe(1);
    expect(core.chooseTake([t(1, 100, 80), t(2, 140, 92)], [90, 88]).take).toBe(1);
  });
});

describe('--make', () => {
  it('writes the four files of a take and never prints the handle', async () => {
    const dir = freshRoot(false);
    const fake = fakeRunner();
    const d = deps(dir, { runner: fake.run, env: { [eleven.HANDLE_ENV]: HANDLE } });
    await voice.voiceCommand({ _: [], make: 'n8' }, d);
    const into = path.join(dir, voice.WORK, 'n8');
    expect(fs.readdirSync(into).sort()).toEqual(['take-1.headers.txt', 'take-1.mp3', 'take-1.request.json', 'take-1.response.json']);
    expect(fs.readFileSync(path.join(into, 'take-1.request.json'), 'utf8')).toBe(fs.readFileSync(fix('take-1.request.json'), 'utf8'));
    expect(fs.readFileSync(path.join(into, 'take-1.mp3')).equals(fs.readFileSync(path.join(root, voice.WORK, 'n8', 'take-1.mp3')))).toBe(true);
    const post = fake.calls.find((c) => c.includes('-D'));
    expect(post.slice(0, 9)).toEqual(['pplx', 'credentials', 'run', HANDLE, '--', 'curl', '-sS', '-m', '120']);
    expect(post.join(' ')).toContain(`/text-to-speech/${core.VOICE.voiceId}/with-timestamps?output_format=${core.VOICE.outputFormat}`);
    expect(d.lines.join('\n')).not.toContain(HANDLE);
    expect(d.lines.join('\n')).toContain('voice: made out/work/voice/n8/take-1.mp3');
    await voice.voiceCommand({ _: [], make: 'n8' }, d);
    expect(JSON.parse(fs.readFileSync(path.join(into, 'take-2.request.json'), 'utf8')).seed).toBe(cfg.seed + 1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('refuses when the account has too few characters, and does not fail', async () => {
    const dir = freshRoot(false);
    const fake = fakeRunner({ left: 10 });
    const d = deps(dir, { runner: fake.run, env: { [eleven.HANDLE_ENV]: HANDLE } });
    await expect(voice.voiceCommand({ _: [], make: ['n7', 'n8'] }, d)).resolves.toBeTruthy();
    const need = core.costOf(core.requestText(cfg.narration.clips.find((c) => c.id === 'n7')), core.VOICE.costPerCharacter);
    expect(d.lines).toEqual([`voice: n7 not made. It needs about ${need} characters and the account has 10 left.`]);
    expect(fake.calls.every((c) => !c.includes('-D'))).toBe(true);
    expect(fs.existsSync(path.join(dir, voice.WORK, 'n8'))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('calls nothing but the subscription on a dry run', async () => {
    const dir = freshRoot(false);
    const fake = fakeRunner();
    const d = deps(dir, { runner: fake.run, env: { [eleven.HANDLE_ENV]: HANDLE } });
    await voice.voiceCommand({ _: [], make: true, 'dry-run': 'n8' }, d);
    expect(fake.calls).toHaveLength(1);
    expect(d.lines[0]).toContain('would cost about');
    expect(d.lines[0]).toContain('[slowly, gravely] Now you see it.');
    expect(d.lines.join('\n')).not.toContain(HANDLE);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fails in one line with no handle, and with a status that is not 200', async () => {
    const dir = freshRoot(false);
    await expect(voice.voiceCommand({ _: [], make: 'n8' }, deps(dir))).rejects.toThrow(/no handle/);
    const fake = fakeRunner({ status: '401', body: `{"detail":"bad key ${HANDLE}"}` });
    const d = deps(dir, { runner: fake.run, env: { [eleven.HANDLE_ENV]: HANDLE } });
    let message = '';
    await voice.voiceCommand({ _: [], make: 'n8' }, d).catch((e) => (message = e.message));
    expect(message).toContain('status 401');
    expect(message).not.toContain(HANDLE);
    expect(fs.existsSync(path.join(dir, voice.WORK, 'n8', 'take-1.mp3'))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('--check, --keep and --sheet on the saved take', () => {
  it('writes the check, the listening copy, the kept files, the record and the row, the same bytes twice', async () => {
    const d = deps(root);
    await voice.voiceCommand({ _: [], check: 'n8' }, d);
    const work = path.join(root, voice.WORK, 'n8');
    const check = JSON.parse(fs.readFileSync(path.join(work, 'take-1.check.json'), 'utf8'));
    expect(check.schema).toBe(core.CHECK_SCHEMA);
    expect(check.rejected).toBe(false);
    expect(check.seed).toBe(cfg.seed);
    const listen = loud.decode(path.join(work, 'take-1.listen.wav'))[0];
    expect(Math.abs(loud.integratedLufs([listen], rate) - core.LEVEL.listenLufs)).toBeLessThanOrEqual(0.7);

    await voice.voiceCommand({ _: [], keep: 'n8' }, d);
    const files = ['audio/kept/narration/n8.mp3', 'audio/records/n8.md', 'ASSETS.md', ...[1, 2, 3, 4].flatMap((n) => [`audio/kept/lines/n8-${n}.wav`, `audio/records/n8-${n}.md`])];
    const first = files.map((f) => fs.readFileSync(path.join(root, f)));
    expect(first[0].equals(fs.readFileSync(path.join(work, 'take-1.mp3')))).toBe(true);
    fs.rmSync(path.join(work, 'take-1.check.json'));
    fs.rmSync(path.join(root, 'audio', 'kept'), { recursive: true });
    await voice.voiceCommand({ _: [], check: 'n8' }, d);
    await voice.voiceCommand({ _: [], keep: 'n8' }, d);
    files.forEach((f, k) => expect(fs.readFileSync(path.join(root, f)).equals(first[k]), f).toBe(true));

    const record = fs.readFileSync(path.join(root, 'audio/records/n8.md'), 'utf8');
    expect(a2.recordLacks(record, 'n8', true)).toEqual([]);
    expect(record).not.toMatch(/[\u2014!]/);
    for (const n of [1, 2, 3, 4]) {
      const lineRecord = fs.readFileSync(path.join(root, `audio/records/n8-${n}.md`), 'utf8');
      expect(repo.recordMissing(lineRecord)).toEqual([]);
      expect(lineRecord).toContain(`## n8-${n}`);
      expect(lineRecord).toContain(JSON.stringify(clip.lines[n - 1]));
    }
    expect(record).toContain(`seed ${cfg.seed}`);
    expect(record).toContain('Date: 2026-11-24');
    expect(a2.hasRow(fs.readFileSync(path.join(root, 'ASSETS.md'), 'utf8'), 'audio/kept/narration/n8.mp3')).toBe(true);
    expect(fs.readFileSync(path.join(root, 'ASSETS.md'), 'utf8').split('\n').filter((l) => l.includes('audio/kept/narration/n8.mp3'))).toHaveLength(1);
    expect(a2.recordFaults(a2.keptFiles(root), fs.readFileSync(path.join(root, 'ASSETS.md'), 'utf8')).faults).toEqual([]);

    const parts = [1, 2, 3, 4].map((n) => loud.decode(path.join(root, `audio/kept/lines/n8-${n}.wav`))[0]);
    const joined = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
    parts.reduce((at, p) => (joined.set(p, at), at + p.length), 0);
    expect(Math.abs(loud.integratedLufs([joined], rate) - core.LEVEL.linesLufs)).toBeLessThanOrEqual(0.2);
    for (const p of parts) {
      expect(loud.truePeakDb([p], rate)).toBeLessThanOrEqual(core.LEVEL.truePeakDb);
      expect(p[0]).toBe(0);
      expect(Math.abs(p[p.length - 1])).toBeLessThan(0.001);
    }
    const info = loud.probe(path.join(root, 'audio/kept/lines/n8-1.wav'));
    expect(info).toEqual({ channels: 1, sampleRate: rate });

    const state = core.readRecord(record);
    expect(state.kept).toBe(1);
    expect(state.made).toBe(1);
    expect(state.lines).toHaveLength(4);
    expect(d.lines.filter((l) => l.startsWith('voice: audio/kept/lines/'))).toHaveLength(8);
    expect(d.lines.every((l) => l.startsWith('voice: '))).toBe(true);
  });

  it('quotes the listener when its files exist', async () => {
    const work = path.join(root, voice.WORK, 'n8');
    fs.writeFileSync(path.join(work, 'take-1.listener-1.txt'), 'A deep, slow male voice.\nNothing wrong.');
    const d = deps(root);
    await voice.voiceCommand({ _: [], keep: 'n8' }, d);
    expect(fs.readFileSync(path.join(root, 'audio/records/n8.md'), 'utf8')).toContain('The listener: call 1: "A deep, slow male voice. Nothing wrong."');
    fs.rmSync(path.join(work, 'take-1.listener-1.txt'));
  });

  it('draws the sheet 1600 wide and reports the status', async () => {
    const d = deps(root);
    await voice.voiceCommand({ _: [], sheet: true }, d);
    const sharp = (await import('sharp')).default;
    const meta = await sharp(path.join(root, voice.SHEET)).metadata();
    expect(meta.width).toBe(1600);
    await voice.voiceCommand({ _: [], status: true }, d);
    expect(d.lines).toContain('voice: no handle, so the account was not read.');
    expect(d.lines).toContain('voice: n8 kept (take 1), 1 take on disk, 1 checked');
    expect(d.lines).toContain('voice: n1 not kept, 0 takes on disk, 0 checked');
  });
});
