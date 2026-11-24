import styles from './player.module.css';
import { createPlayer } from './player';

const player = createPlayer((_frames, loopFrames) => ({ first: 0, last: loopFrames - 1, repeat: true, loop: true }));
const stage = document.createElement('main');
stage.className = styles.stage as string;
player.canvas.className = styles.picture as string;
stage.appendChild(player.canvas);
document.body.appendChild(stage);
player.start(() => undefined);
