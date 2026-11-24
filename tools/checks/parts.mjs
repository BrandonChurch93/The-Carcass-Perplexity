export async function runParts(phase, parts) {
  const out = { ok: true, lines: [], skipped: [] };
  const good = [];
  for (const part of parts) {
    let r;
    try {
      r = await part.run();
    } catch (e) {
      r = { ok: false, lines: [`${part.name}: ${e.message}`] };
    }
    const lines = r.lines ?? [];
    out.skipped.push(...(r.skipped ?? []));
    if (r.ok) good.push(...lines);
    else if (part.from !== undefined && phase < part.from) out.skipped.push(...lines.map((l) => `checked from Phase ${part.from}: ${l}`));
    else {
      out.ok = false;
      out.lines.push(...lines);
    }
  }
  out.lines = out.ok ? good : [...out.lines, ...good.map((l) => `passed: ${l}`)];
  return out;
}

export async function loadRenderer(ctx) {
  try {
    return { renderer: await ctx.renderer(), error: null };
  } catch (e) {
    return { renderer: null, error: `The renderer could not be loaded: ${String(e.message).split('\n')[0]}` };
  }
}
