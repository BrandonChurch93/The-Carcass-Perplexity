import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const API = 'https://api.elevenlabs.io/v1';
export const HANDLE_ENV = 'CARCASS_ELEVEN_HANDLE';
export const HANDLE_FILE = 'out/work/voice/handle.txt';
const TIMEOUT_SECONDS = 120;
const BODY_SHOWN = 300;
const MAX_BUFFER = 2 ** 28;

export function readHandle({ env = process.env, root }) {
  const fromEnv = String(env[HANDLE_ENV] ?? '').trim();
  if (fromEnv) return fromEnv;
  const file = path.join(root, HANDLE_FILE);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split('\n')[0].trim() || null;
}

export function spawnRunner(argv) {
  const r = spawnSync(argv[0], argv.slice(1), { maxBuffer: MAX_BUFFER });
  return { status: r.error ? 1 : (r.status ?? 1), stdout: String(r.stdout ?? ''), stderr: r.error ? r.error.message : String(r.stderr ?? '') };
}

export const curl = (handle, rest) => ['pplx', 'credentials', 'run', handle, '--', 'curl', '-sS', '-m', String(TIMEOUT_SECONDS), ...rest];
export const hide = (text, handle) => (handle ? String(text).split(handle).join('<handle>') : String(text));
const lastLine = (text) => String(text).trim().split('\n').pop() ?? '';

export function subscription({ handle, runner = spawnRunner }) {
  const r = runner(curl(handle, [`${API}/user/subscription`]));
  if (r.status !== 0) return { ok: false, why: hide(lastLine(r.stderr) || `the command ended with ${r.status}`, handle) };
  let body;
  try {
    body = JSON.parse(r.stdout);
  } catch {
    return { ok: false, why: hide(`the answer was not JSON: ${r.stdout.slice(0, BODY_SHOWN)}`, handle) };
  }
  const { character_count, character_limit, next_character_count_reset_unix } = body;
  if (!Number.isFinite(character_count) || !Number.isFinite(character_limit)) return { ok: false, why: hide(`the answer holds no character count: ${r.stdout.slice(0, BODY_SHOWN)}`, handle) };
  return { ok: true, character_count, character_limit, next_character_count_reset_unix: next_character_count_reset_unix ?? null, left: character_limit - character_count };
}

export function speak({ voiceId, body, into, handle, outputFormat, runner = spawnRunner }) {
  const files = { request: `${into}.request.json`, headers: `${into}.headers.txt`, response: `${into}.response.json`, mp3: `${into}.mp3` };
  fs.mkdirSync(path.dirname(into), { recursive: true });
  fs.writeFileSync(files.request, JSON.stringify(body, null, 1));
  const url = `${API}/text-to-speech/${voiceId}/with-timestamps?output_format=${outputFormat}`;
  const r = runner(curl(handle, ['-X', 'POST', url, '-H', 'Content-Type: application/json', '--data-binary', `@${files.request}`, '-D', files.headers, '-o', files.response, '-w', '%{http_code}']));
  const status = Number(String(r.stdout).trim().slice(-3));
  const text = fs.existsSync(files.response) ? fs.readFileSync(files.response, 'utf8') : '';
  const fail = (why) => {
    for (const f of [files.request, files.headers, files.response]) fs.rmSync(f, { force: true });
    return { ok: false, status: Number.isFinite(status) ? status : 0, body: hide(why, handle).slice(0, BODY_SHOWN) };
  };
  if (r.status !== 0) return fail(lastLine(r.stderr) || `the command ended with ${r.status}`);
  if (status !== 200) return fail(text);
  let audio;
  try {
    audio = JSON.parse(text).audio_base64;
  } catch {
    return fail(`the answer was not JSON: ${text}`);
  }
  if (typeof audio !== 'string' || audio.length === 0) return fail('the answer holds no audio_base64');
  fs.writeFileSync(files.mp3, Buffer.from(audio, 'base64'));
  return { ok: true, status, files };
}
