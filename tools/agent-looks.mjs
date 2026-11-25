#!/usr/bin/env node
// A build agent's heartbeat for pictures: puts up to `status.maxPictures` pictures, resized to `status.pictureLongEdgePx`, with a note, on the
// agent's looks branch as one new commit on top of the branch as it stands on the remote. Nothing is checked out and nothing is forced.
//   node tools/agent-looks.mjs --branch agent/ribs-ground-looks --note "what the pictures show" FILE [FILE ...] [--dry-run]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const files = [];
let branch = '';
let note = '';
let dry = false;
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '--branch') branch = args[(i += 1)] ?? '';
  else if (a === '--note') note = args[(i += 1)] ?? '';
  else if (a === '--dry-run') dry = true;
  else files.push(a);
}
const config = JSON.parse(readFileSync('config/showcase.json', 'utf8'));
const max = config.status.maxPictures;
const edge = config.status.pictureLongEdgePx;
if (!/^agent\/[a-z0-9-]+-looks$/.test(branch)) throw new Error('Name the branch with --branch agent/<place>-<folder>-looks');
if (files.length === 0) throw new Error('Name at least one picture');
if (files.length > max) throw new Error(`A looks push holds at most ${max} pictures`);

const git = (list, options = {}) => execFileSync('git', list, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
const work = mkdtempSync(join(tmpdir(), 'looks-'));
const index = join(work, 'index');
const env = { ...process.env, GIT_INDEX_FILE: index };
git(['read-tree', '--empty'], { env });

const names = [];
for (let i = 0; i < files.length; i += 1) {
  const name = `look-${i + 1}.jpg`;
  const out = join(work, name);
  await sharp(files[i]).resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toFile(out);
  const blob = git(['hash-object', '-w', out]);
  git(['update-index', '--add', '--cacheinfo', `100644,${blob},${name}`], { env });
  names.push(`${name} = ${files[i]}`);
}
const head = git(['rev-parse', '--short', 'HEAD']);
const text = [`${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, `work at ${head} on ${git(['rev-parse', '--abbrev-ref', 'HEAD'])}`, note, ...names, ''].join('\n');
const noteFile = join(work, 'NOTE.txt');
writeFileSync(noteFile, text);
git(['update-index', '--add', '--cacheinfo', `100644,${git(['hash-object', '-w', noteFile])},NOTE.txt`], { env });
const tree = git(['write-tree'], { env });

let parent = '';
try {
  git(['fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`]);
  parent = git(['rev-parse', `refs/remotes/origin/${branch}`]);
} catch {
  parent = '';
}
const message = `Looks: ${note || 'no note'}\n\nCo-authored-by: Perplexity <noreply@perplexity.ai>\n`;
const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message]);
if (dry) {
  console.log(`looks: dry run, commit ${commit.slice(0, 7)} with ${files.length} pictures, not pushed`);
} else {
  git(['push', '-q', 'origin', `${commit}:refs/heads/${branch}`]);
  console.log(`looks: pushed ${files.length} pictures to ${branch} at ${commit.slice(0, 7)}`);
}
