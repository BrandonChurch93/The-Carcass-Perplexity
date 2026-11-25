import type { PlaceModule } from '../core/place';
import ribs from './ribs';
import heart from './heart';
import breath from './breath';
import marsh from './marsh';
import spine from './spine';
import eye from './eye';
import reveal from './reveal';

export const places: Record<string, PlaceModule> = { ribs, heart, breath, marsh, spine, eye, reveal };
