import { install } from '../capture/interface';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
install(canvas);
