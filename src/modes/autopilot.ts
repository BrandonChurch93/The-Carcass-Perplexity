import styles from './player.module.css';
import { createPlayer } from './player';

const params = new URLSearchParams(location.search);
const unit = params.get('unit');
const from = Number(params.get('frame') ?? 0);

const player = createPlayer((frames, _loopFrames, shots) => {
  const own = unit ? shots.filter((s) => s.unit === unit) : [];
  const first = own.length ? Math.min(...own.map((s) => s.first)) : 0;
  const last = own.length ? Math.max(...own.map((s) => s.last)) : frames - 1;
  const start = Number.isInteger(from) && from > first && from <= last ? from : first;
  return { first: start, last, repeat: false, loop: false };
});

const stage = document.createElement('main');
stage.className = styles.stage as string;
player.canvas.className = `${styles.picture} ${styles.hidden}`;

const control = document.createElement('button');
control.type = 'button';
control.className = styles.control as string;
control.setAttribute('aria-label', 'Play the film');
control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

control.addEventListener('click', () => {
  control.classList.add(styles.hidden as string);
  player.canvas.classList.remove(styles.hidden as string);
  player.start(() => {
    player.canvas.classList.add(styles.hidden as string);
    control.classList.remove(styles.hidden as string);
  });
});

stage.append(player.canvas, control);
document.body.appendChild(stage);
