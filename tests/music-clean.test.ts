// @ts-nocheck
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { config, rel, readJson, ROOT } from '../tools/lib/paths.mjs';
import { musicFile } from '../tools/lib/cut-core.mjs';

const cfg = config();
const sha256 = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const python = spawnSync('python3', ['-c', 'import numpy, soundfile'], { encoding: 'utf8' }).status === 0;

describe('the cleaned music', () => {
  const report = readJson(rel('audio', 'cleaned', 'cleaned.json'));
  const spots = readJson(rel('audio', 'cleaned', 'removed', 'spots.json'));

  it('is named in the config beside the supplied track, which keeps its own name and hash', () => {
    expect(cfg.music.file).toBe('The-Carcass-Audio.mp3');
    expect(cfg.music.cleaned.file).toBe('audio/cleaned/The-Carcass-Audio-cleaned.flac');
    expect(cfg.music.cleaned.file).toBe(spots.cleaned);
    expect(report.supplied.sha256).toBe(cfg.music.sha256);
    expect(sha256(rel('audio', 'supplied', cfg.music.file))).toBe(cfg.music.sha256);
  });

  it('is the file the config hashes', () => {
    expect(sha256(rel(cfg.music.cleaned.file))).toBe(cfg.music.cleaned.sha256);
    expect(report.cleaned.sha256).toBe(cfg.music.cleaned.sha256);
  });

  it('is as long as the supplied track to the sample, so the map and the cut do not move', () => {
    expect(report.cleaned.samples).toBe(report.suppliedSamples);
    expect(Math.abs(report.cleaned.seconds - cfg.music.seconds)).toBeLessThan(0.01);
  });

  it('differs from the supplied track only inside the two spots', () => {
    expect(report.faults).toEqual([]);
    expect(report.spots.map((s: { id: string }) => s.id)).toEqual(['spot-1', 'spot-2']);
    expect(report.proof.outsideMaxDifference).toBeLessThanOrEqual(report.proof.step24);
    expect(report.proof.insideMaxDifference).toBeLessThanOrEqual(report.proof.step24);
    expect(report.proof.outsideSamples + report.proof.insideSamples).toBe(report.cleaned.samples);
    for (const s of report.spots) {
      expect(s.endSample).toBeGreaterThan(s.firstSample);
      expect(sha256(rel(s.removedFile))).toBe(s.removedSha256);
    }
  });

  it('keeps each removed signal, so the supplied track can be had back', () => {
    for (const s of spots.spots) {
      expect(fs.existsSync(rel('audio', 'cleaned', 'removed', s.file))).toBe(true);
      expect(s.way.length).toBeGreaterThan(20);
    }
  });

  it('has a before and an after clip of each spot for the review page', () => {
    for (const name of ['spot-1-before.wav', 'spot-1-after.wav', 'spot-2-before.wav', 'spot-2-after.wav']) {
      expect(fs.existsSync(rel('audio', 'cleaned', 'proof', name))).toBe(true);
    }
  });

  it.skipIf(!python)('proves again against a fresh decode of the supplied track', () => {
    const run = spawnSync('python3', ['pipeline/music/clean.py', '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    expect(run.stdout + run.stderr).not.toContain('FAULT');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`sha256 ${cfg.music.cleaned.sha256}`);
  }, 130000);
});

describe('the track the film plays', () => {
  it('is the cleaned track when the config names one', () => {
    expect(musicFile(cfg)).toBe(cfg.music.cleaned.file);
  });

  it('is the supplied track when it does not', () => {
    const plain = { ...cfg, music: { ...cfg.music, cleaned: undefined } };
    expect(musicFile(plain)).toBe(`audio/supplied/${cfg.music.file}`);
  });
});
