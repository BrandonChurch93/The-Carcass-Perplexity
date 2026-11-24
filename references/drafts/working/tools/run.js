const sh = async c => {const r = await tools.bash({command:c}); return typeof r==='string'? r : (r.stdout ?? JSON.stringify(r));};
const unwrap = s => {try{const o=JSON.parse(s); return o.stdout ?? s;}catch(e){return s;}};
const R='/home/user/workspace/r3';
const jobs = JSON.parse(unwrap(await sh(`cat ${R}/jobs/${BATCH}.json`)));
const run = async j => {
  const prompt = unwrap(await sh(`cat ${R}/prompts/${j.prompt}.txt`));
  const t0 = Date.now();
  try {
    const args = {prompt, filename:`${R}/gen/${j.id}`, model:j.model, aspect_ratio:j.ar||'16:9'};
    if (j.refs && j.refs.length) args.images = j.refs;
    const r = await tools.generate_image(args);
    const secs = Math.round((Date.now()-t0)/1000);
    const ls = unwrap(await sh(`ls ${R}/gen/${j.id}.* 2>/dev/null | head -1`)).trim();
    await tools.write({file_path:`${R}/gen/res/${j.id}.json`, content: JSON.stringify({id:j.id, ok:!!ls, model:j.model, prompt:j.prompt, refs:(j.refs||[]).join(','), secs, path:ls, what:j.what||'', hint:(r&&r.hint)||''})});
    text(`${j.id} ${j.model} ${secs}s ${ls? 'ok':'NOFILE '+JSON.stringify(r).slice(0,300)}`);
  } catch(e) { text(`${j.id} ${j.model} ERR ${String(e&&e.message||e).slice(0,300)}`); }
};
await Promise.all(jobs.map(run));
text('batch done');
