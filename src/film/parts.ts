// The parts of the unit `film`: what the whole film draws that no single place owns (kit/08-BUILD-ORDER.md, Phase 5):
// the opening approach, the ending, the card loop, and any transition that draws something of its own. A plain cut is not a part.
// Each part is drawn by the place named in `drawnBy`, and has no object of its own to show alone, so its kind is `effect`.
// A part is listed here when it is merged, with the state it then has, the way a place declares the state of its own parts;
// `npm run parts -- --unit film --write` carries the list into parts/PARTS.json and G13 holds the two together.
import { config } from '../config';
import type { PartState } from '../core/place';

export const FILM_UNIT: string = (config.units[config.units.length - 1] as { id: string }).id;

export interface FilmPart {
  name: string;
  state: PartState;
  drawnBy: string;
  what: string;
}

export const FILM_PARTS: readonly FilmPart[] = [
  { name: 'opening', state: 'built', drawnBy: 'ribs', what: 'The approach: the shot ribs-01, frames 0 to 1041, the fog bank and the blades that stand out of it' },
  { name: 'handoff', state: 'built', drawnBy: 'eye and reveal', what: 'The join from the Eye into the rise: the rings on deep water that both places draw either side of frame 9541' },
];

export const filmParts = (): { id: string; unit: string; name: string; kind: string; state: string }[] =>
  FILM_PARTS.map((p) => ({ id: `${FILM_UNIT}/${p.name}`, unit: FILM_UNIT, name: p.name, kind: 'effect', state: p.state }));
