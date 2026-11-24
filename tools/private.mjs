import { execFileSync } from 'node:child_process';
import { config, utc } from './lib/paths.mjs';

const url = config().repo.url;
const slug = url.replace('https://github.com/', '').replace(/\.git$/, '');
let api = 'unknown';
let anon = 'unknown';
try { api = execFileSync('gh', ['api', `repos/${slug}`, '--jq', '.private'], { encoding: 'utf8' }).trim(); } catch { api = 'error'; }
try { anon = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `https://github.com/${slug}`], { encoding: 'utf8' }).trim(); } catch { anon = 'error'; }
const isPrivate = api === 'true' && anon !== '200';
console.log(`${utc()} repo private: ${isPrivate ? 'yes' : 'no'} (api private=${api}, anonymous page=${anon})`);
process.exit(isPrivate ? 0 : 3);
