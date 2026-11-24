import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const load = (p: string): Promise<any> => import(p);
const repo = await load('../tools/checks/repo.mjs');
const { config, ROOT } = await load('../tools/lib/paths.mjs');

const j = (...parts: string[]) => parts.join('');
const letters = 'abcdefghijklmnopqrstuvwxyz';
const mixed = j('a1B2', 'c3D4', 'e5F6', 'g7H8', 'i9J0', 'k1L2');
const kinds = (text: string): string[] => repo.findSecrets(text).map((h: any) => h.kind);

const temps: string[] = [];
const tempDir = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-checks-'));
  temps.push(d);
  return d;
};
const put = (root: string, file: string, body: string | Buffer = 'x\n') => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
};
afterAll(() => {
  for (const d of temps) fs.rmSync(d, { recursive: true, force: true });
});

describe('the secret patterns', () => {
  const caught: [string, string][] = [
    ['a private key block', j('-----BEGIN', ' RSA ', 'PRIVATE', ' KEY-----')],
    ['an OpenSSH private key block', j('-----BEGIN', ' OPENSSH ', 'PRIVATE', ' KEY-----')],
    ['an sk- token', j('const a = "', 'sk', '-', letters.slice(0, 20), '"')],
    ['an sk-proj token', j('sk', '-', 'proj-', mixed)],
    ['a ghp_ token', j('remote = https://', 'ghp', '_', mixed, mixed.slice(0, 12), '@github.com/x/y')],
    ['a github_pat_ token', j('github', '_pat_', mixed, '_', mixed)],
    ['an xi-api-key header', j('-H "', 'xi-api', '-key', ': ', mixed, '"')],
    ['an xi-api-key property', j("'", 'xi-api', '-key', "'", ': ', "'", mixed, "'")],
    ['an AKIA key id', j('id=', 'AK', 'IA', 'ABCDEFGH', '12345678')],
    ['a quoted literal assigned to a name ending in KEY', j('ELEVENLABS_API_', 'KEY', ' = "', letters.slice(0, 22), '"')],
    ['an env line for a name ending in TOKEN', j('GH_', 'TOKEN', '=', mixed)],
    ['a JSON value for a name ending in SECRET', j('"CLIENT_', 'SECRET', '": "', mixed, '"')],
    ['a YAML value for a name ending in PASSWORD', j('DB_', 'PASSWORD', ': ', mixed)]
  ];
  for (const [name, line] of caught) {
    it(`catches ${name}`, () => {
      expect(repo.findSecrets(line)).toHaveLength(1);
    });
  }

  const clean: [string, string][] = [
    ['an sk- token that is too short', j('sk', '-', letters.slice(0, 19))],
    ['sk- inside a longer word', j('task', '-', 'management-system-for-everyone')],
    ['a header read from the environment', j("headers: { '", 'xi-api', '-key', "': process.env.ELEVENLABS_API_", 'KEY', ' }')],
    ['a header filled from a shell variable', j('-H "', 'xi-api', '-key', ': $ELEVENLABS_API_', 'KEY', '"')],
    ['a name with no value', j('ELEVENLABS_API_', 'KEY', '=')],
    ['a name set from the environment', j('const GH_', 'TOKEN', ' = process.env.GH_', 'TOKEN', ';')],
    ['a name set from a call', j('const SESSION_', 'TOKEN', ' = readTheTokenFromTheKeychain();')],
    ['a short literal', j('API_', 'KEY', '="', letters.slice(0, 19), '"')],
    ['a key frame id in the config', '"key": "reveal-4-titan-from-orbit-4k-and-more"'],
    ['AKIA with too few characters', j('AK', 'IA', 'ABCDEFGH', '1234567')],
    ['plain prose about keys', 'Never commit or print tokens, keys or passwords.']
  ];
  for (const [name, line] of clean) {
    it(`passes ${name}`, () => {
      expect(repo.findSecrets(line)).toHaveLength(0);
    });
  }

  it('reports the line number and the kind, never the value', () => {
    const value = j('sk', '-', mixed);
    const hits = repo.findSecrets(['one', 'two', j('x = "', value, '"'), 'four', j('GH_', 'TOKEN', '=', mixed)].join('\n'));
    expect(hits.map((h: any) => h.line)).toEqual([3, 5]);
    expect(JSON.stringify(hits)).not.toContain(mixed);
    expect(kinds(value)).toEqual(['sk- token']);
  });

  it('finds nothing in the checker or in its own tests', () => {
    for (const f of ['tools/checks/repo.mjs', 'tests/repo-checks.test.ts', 'tests/clock.test.ts']) {
      expect(repo.findSecrets(fs.readFileSync(path.join(ROOT, f), 'utf8'))).toEqual([]);
    }
  });
});

describe('the recipe matching', () => {
  const file = 'public/assets/heart/lava/crust-albedo.ktx2';
  const covers = (heading: string, f = file) => repo.recipeCovers([heading], f);

  it('reads the headings of a recipe and skips the ones inside a code fence', () => {
    const text = ['# Heart', '## `heart/lava/`', 'Made by: x', '```', '## not/a/heading', '```', '### deeper', '## sky.exr'].join('\n');
    expect(repo.recipeHeadings(text)).toEqual(['`heart/lava/`', 'sky.exr']);
  });

  it('accepts a heading that names the file', () => {
    expect(covers('public/assets/heart/lava/crust-albedo.ktx2')).toBe(true);
    expect(covers('`heart/lava/crust-albedo.ktx2`')).toBe(true);
    expect(covers('assets/heart/lava/crust-albedo.ktx2')).toBe(true);
    expect(covers('crust-albedo.ktx2')).toBe(true);
    expect(covers('The crust, `crust-albedo.ktx2` and `crust-normal.ktx2`')).toBe(true);
    expect(covers('heart/lava/crust-albedo.ktx2, heart/lava/crust-normal.ktx2')).toBe(true);
  });

  it('accepts a heading that names its folder', () => {
    expect(covers('public/assets/heart/lava/')).toBe(true);
    expect(covers('`heart/lava`')).toBe(true);
    expect(covers('heart/')).toBe(true);
    expect(covers('lava')).toBe(true);
  });

  it('accepts a heading with a glob that matches it', () => {
    expect(covers('`public/assets/heart/lava/crust-*.ktx2`')).toBe(true);
    expect(covers('heart/**/*.ktx2')).toBe(true);
    expect(covers('heart/lava/crust-albedo.{ktx2,png}')).toBe(true);
    expect(covers('*.ktx2')).toBe(true);
    expect(covers('heart/la?a/*')).toBe(true);
  });

  it('refuses a heading that names something else', () => {
    expect(covers('public/assets/heart/lava/crust-normal.ktx2')).toBe(false);
    expect(covers('`marsh/`')).toBe(false);
    expect(covers('heart/lav')).toBe(false);
    expect(covers('heart/*.ktx2')).toBe(false);
    expect(covers('`*.png`')).toBe(false);
    expect(covers('crust-albedo')).toBe(false);
    expect(covers('<file or group of files>')).toBe(false);
  });

  it('refuses a heading that would cover every asset at once', () => {
    expect(covers('public/assets/')).toBe(false);
    expect(covers('public')).toBe(false);
    expect(covers('assets')).toBe(false);
    expect(covers('*')).toBe(false);
    expect(covers('`**/*`')).toBe(false);
    expect(covers('public/assets/**')).toBe(false);
  });

  it('covers nothing without a heading', () => {
    expect(repo.recipeCovers([], file)).toBe(false);
  });
});

describe('the record check', () => {
  const full = [
    '## n3',
    'Made by: the tool, the endpoint, the model',
    'Voice: a voice',
    'Text or description: The fire.',
    'Settings: stability 0.5, seed 7',
    'Takes: 3 made, take 2 kept',
    'Measured: 14.2 s, -18 LUFS, -2 dB peak',
    'Date: 2026-11-25'
  ];

  it('accepts a record that holds every line', () => {
    expect(repo.recordMissing(full.join('\n'))).toEqual([]);
  });

  for (const label of repo.RECORD_LABELS as string[]) {
    it(`names "${label}" when that line is missing or empty`, () => {
      expect(repo.recordMissing(full.filter((l) => !l.startsWith(label)).join('\n'))).toEqual([label]);
      expect(repo.recordMissing(full.map((l) => (l.startsWith(label) ? `${label}  ` : l)).join('\n'))).toEqual([label]);
    });
  }

  it('names every line of an empty record', () => {
    expect(repo.recordMissing('')).toEqual(repo.RECORD_LABELS);
  });
});

describe('the third-party table', () => {
  const table = (rows: string[]) =>
    ['# Assets', '', '## Third-party files', '', '| File | What it is | Source URL | Licence | Date added |', '| --- | --- | --- | --- | --- |', ...rows, '', '## After', '', '| File | Source URL | Licence |', '| --- | --- | --- |', '| other.bin | | |'].join('\n');

  it('reads the rows of that table only', () => {
    const rows = repo.thirdPartyRows(table(['| `public/assets/a.hdr` | A sky | https://example.org/a | CC0 | 2026-11-25 |']));
    expect(rows).toEqual([{ file: 'public/assets/a.hdr', source: 'https://example.org/a', licence: 'CC0' }]);
    expect(repo.thirdPartyRows(table([]))).toEqual([]);
    expect(repo.thirdPartyRows('# Assets\n')).toBeNull();
  });

  it('names a row whose file is missing, or that has no source or no licence', () => {
    const rows = repo.thirdPartyRows(
      table(['| `a.hdr` | A sky | https://example.org/a | CC0 | 2026-11-25 |', '| `b.hdr` | A sky | | CC0 | 2026-11-25 |', '| `c.hdr` | A sky | https://example.org/c | unknown | 2026-11-25 |'])
    );
    const faults: string[] = repo.thirdPartyFaults(rows, (f: string) => f !== 'c.hdr');
    expect(faults).toHaveLength(3);
    expect(faults.some((l) => l.startsWith('b.hdr has no source'))).toBe(true);
    expect(faults.some((l) => l.startsWith('c.hdr has no licence'))).toBe(true);
    expect(faults.some((l) => l.startsWith('c.hdr is listed') && l.includes('does not exist'))).toBe(true);
    expect(repo.thirdPartyFaults(rows.slice(0, 1), () => true)).toEqual([]);
  });
});

describe('the sound rule', () => {
  it('applies when the line starts with no, and is skipped for anything else', () => {
    expect(repo.repoIsPublic('- Repo is private: no, measured at 20:41 UTC').isPublic).toBe(true);
    expect(repo.repoIsPublic('- Repo is private: No').isPublic).toBe(true);
    expect(repo.repoIsPublic('- Repo is private: yes').isPublic).toBe(false);
    expect(repo.repoIsPublic("- Repo is private: treated as private on Brandon's word").isPublic).toBe(false);
  });

  it('applies when the line is absent', () => {
    expect(repo.repoIsPublic('# Progress\n')).toMatchObject({ known: false, isPublic: true });
  });

  it('knows a sound file and a video file by name', () => {
    for (const e of repo.SOUND_EXTS as string[]) expect(repo.isSoundName(`audio/kept/n1.${e.toUpperCase()}`)).toBe(true);
    for (const e of repo.VIDEO_EXTS as string[]) expect(repo.isVideoName(`out/clips/a.${e}`)).toBe(true);
    expect(repo.isSoundName('audio/records/n1.md')).toBe(false);
    expect(repo.isSoundName('out/clips/a.mp4')).toBe(false);
  });
});

describe('G8 on a made-up tree', () => {
  const assets = (rows: string[] = []) =>
    ['# Assets', '', 'The music is `audio/supplied/music.mp3`.', '', '## Third-party files', '', '| File | What it is | Source URL | Licence | Date added |', '| --- | --- | --- | --- | --- |', ...rows, ''].join('\n');

  it('passes when every folder is absent', async () => {
    const root = tempDir();
    put(root, 'ASSETS.md', assets());
    const r = await repo.checkG8({ root });
    expect(r).toMatchObject({ id: 'G8', pass: true });
  });

  it('passes a tree where everything is accounted for', async () => {
    const root = tempDir();
    put(root, 'ASSETS.md', assets(['| `public/assets/sky/day.hdr` | A sky | https://example.org/day | CC0 | 2026-11-25 |']));
    put(root, 'audio/supplied/music.mp3');
    put(root, 'public/assets/sky/day.hdr');
    put(root, 'public/assets/heart/lava/crust.ktx2');
    put(root, 'assets-src/sky/RECIPE.md', '## `sky/`\nMade by: x\n');
    put(root, 'assets-src/heart/lava/RECIPE.md', '## `heart/lava/*.ktx2`\nMade by: x\n');
    put(root, 'audio/kept/n1.wav');
    put(root, 'audio/records/n1.md', (repo.RECORD_LABELS as string[]).map((l) => `${l} x`).join('\n'));
    const r = await repo.checkG8({ root });
    expect(r.lines.join('\n')).not.toMatch(/[\u2014!]/);
    expect(r.pass).toBe(true);
  });

  it('names every offending file', async () => {
    const root = tempDir();
    put(root, 'ASSETS.md', assets(['| `public/assets/gone.hdr` | A sky | https://example.org/gone | | 2026-11-25 |']));
    put(root, 'audio/supplied/music.mp3');
    put(root, 'audio/supplied/stray.wav');
    put(root, 'public/assets/heart/lava/crust.ktx2');
    put(root, 'public/assets/marsh/mud.ktx2');
    put(root, 'assets-src/heart/RECIPE.md', '## `heart/`\n');
    put(root, 'audio/kept/n1.wav');
    put(root, 'audio/kept/n2.wav');
    put(root, 'audio/records/n2.md', 'Made by: x\nTakes: 1\n');
    const r = await repo.checkG8({ root });
    const text: string = r.lines.join('\n');
    expect(r.pass).toBe(false);
    expect(text).toContain('audio/supplied/stray.wav is not named in ASSETS.md.');
    expect(text).not.toContain('audio/supplied/music.mp3 is not named');
    expect(text).toContain('public/assets/marsh/mud.ktx2 has no recipe');
    expect(text).not.toContain('crust.ktx2 has no recipe');
    expect(text).toContain('audio/kept/n1.wav has no record audio/records/n1.md.');
    expect(text).toContain('audio/records/n2.md lacks "Text or description:", "Settings:", "Measured:", "Date:".');
    expect(text).toContain('public/assets/gone.hdr is listed in the third-party table and does not exist.');
    expect(text).toContain('public/assets/gone.hdr has no licence');
  });
});

describe('G9 on a made-up tree', () => {
  const git = (root: string, ...argv: string[]) => execFileSync('git', argv, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const sha = (body: string) => execFileSync('sha256sum', { input: body, encoding: 'utf8' }).split(' ')[0];
  const base = (privateLine: string) => {
    const root = tempDir();
    git(root, 'init', '-q');
    put(root, 'kit/PROGRESS.md', `# Progress\n\n- Repo is private: ${privateLine}\n`);
    put(root, 'references/approved/a.jpg', 'picture\n');
    put(root, 'references/approved/MANIFEST.sha256', `${sha('picture\n')}  a.jpg\n`);
    put(root, 'tools/x.mjs', 'export const x = 1;\n');
    return root;
  };

  it('passes a clean tree and says the sound rule was skipped', async () => {
    const root = base('yes');
    put(root, 'audio/kept/n1.wav');
    git(root, 'add', '-A');
    const r = await repo.checkG9({ root });
    expect(r).toMatchObject({ id: 'G9', pass: true });
    expect(r.lines.some((l: string) => l.startsWith('The sound rule is skipped'))).toBe(true);
    expect(r.lines.join('\n')).not.toMatch(/[\u2014!]/);
  });

  it('names a file over the limit, a secret by line, a stray folder and a changed picture', async () => {
    const root = base('yes');
    const value = j('sk', '-', mixed);
    put(root, 'tools/leak.mjs', j('const a = 1;\n', 'const b = "', value, '";\n'));
    put(root, 'references/notes.txt', j('x = "', value, '"\n'));
    put(root, 'package-lock.json', j('{ "x": "', value, '" }\n'));
    put(root, 'out/work/frame.png');
    put(root, 'references/cache/photo.jpg');
    put(root, 'deliver/film/film.txt');
    put(root, 'references/approved/a.jpg', 'retouched\n');
    fs.mkdirSync(path.join(root, 'public/assets'), { recursive: true });
    const big = path.join(root, 'public/assets/big.bin');
    fs.writeFileSync(big, 'x');
    fs.truncateSync(big, config().repo.maxFileMb * 1000 * 1000 + 1);
    git(root, 'add', '-A', '-f');
    const r = await repo.checkG9({ root });
    const text: string = r.lines.join('\n');
    expect(r.pass).toBe(false);
    expect(text).toContain('public/assets/big.bin is ');
    expect(text).toContain('tools/leak.mjs line 2 looks like a secret: sk- token.');
    expect(text).not.toContain(value);
    expect(text).not.toContain('references/notes.txt line');
    expect(text).not.toContain('package-lock.json line');
    expect(text).toContain('out/work/frame.png is tracked and must not be.');
    expect(text).toContain('references/cache/photo.jpg is tracked and must not be.');
    expect(text).toContain('deliver/film/film.txt is tracked and must not be.');
    expect(text).toContain('references/approved/a.jpg no longer has its listed hash.');
  }, 60000);

  it('names every sound file on the current branch while the repo is public', async () => {
    const root = base('no, measured public');
    put(root, 'audio/kept/n1.wav');
    put(root, 'audio/supplied/music.MP3');
    put(root, 'out/clips/broken.mp4', 'not a film\n');
    git(root, 'add', '-A');
    const r = await repo.checkG9({ root });
    const text: string = r.lines.join('\n');
    expect(r.pass).toBe(false);
    expect(text).toContain('audio/kept/n1.wav is a sound file and is tracked on the current branch.');
    expect(text).toContain('audio/supplied/music.MP3 is a sound file and is tracked on the current branch.');
    expect(text).toContain('out/clips/broken.mp4 could not be read by ffprobe');
  });

  it('passes a public tree that holds no sound', async () => {
    const root = base('no');
    git(root, 'add', '-A');
    const r = await repo.checkG9({ root });
    expect(r.pass).toBe(true);
    expect(r.lines.some((l: string) => l.includes('the sound rule applies'))).toBe(true);
  });
});

describe('the real repo', () => {
  it('passes G8', async () => {
    const r = await repo.checkG8();
    expect(r.id).toBe('G8');
    expect(r.lines, r.lines.join('\n')).not.toHaveLength(0);
    expect(r.pass, r.lines.join('\n')).toBe(true);
  });

  it('passes G9', async () => {
    const r = await repo.checkG9();
    expect(r.id).toBe('G9');
    expect(r.pass, r.lines.join('\n')).toBe(true);
  }, 120000);
});
