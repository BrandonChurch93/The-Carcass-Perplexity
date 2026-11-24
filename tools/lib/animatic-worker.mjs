import { parentPort, workerData } from 'node:worker_threads';
import { drawer } from './animatic-draw.mjs';

const draw = drawer(workerData);

parentPort.on('message', async ({ p, f }) => {
  try {
    const data = (await draw.frame(f)).slice();
    parentPort.postMessage({ p, data }, [data.buffer]);
  } catch (e) {
    parentPort.postMessage({ p, error: e.message });
  }
});
