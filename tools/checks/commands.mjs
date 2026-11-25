import { spawn } from 'node:child_process';

export const TAIL_LINES = 15;
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;

export function tail(text, n = TAIL_LINES) {
  return text
    .replace(ANSI, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '')
    .slice(-n);
}

export function exec(command, argv, { cwd, timeoutMs, env }) {
  return new Promise((resolve) => {
    let text = '';
    let timedOut = false;
    const child = spawn(command, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: env ? { ...process.env, ...env } : process.env, detached: true });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, timeoutMs);
    const take = (d) => {
      text += d.toString();
      if (text.length > 400000) text = text.slice(-200000);
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: 1, tail: [e.message], timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, tail: tail(text), timedOut });
    });
  });
}

export function commandCheck(argv, env = undefined) {
  const shown = `npm ${argv.join(' ')}`;
  return async (ctx) => {
    const minutes = ctx.config.sandbox.stepTimeoutMinutes;
    const r = await ctx.exec('npm', argv, { cwd: ctx.root, timeoutMs: minutes * 60 * 1000, ...(env ? { env } : {}) });
    if (r.code === 0 && !r.timedOut) return { ok: true, lines: [`${shown} exited with code 0.`], skipped: [] };
    const head = r.timedOut ? `${shown} was stopped after ${minutes} minutes.` : `${shown} exited with code ${r.code}. Its last lines:`;
    return { ok: false, lines: [head, ...r.tail.map((l) => `| ${l}`)], skipped: [] };
  };
}
