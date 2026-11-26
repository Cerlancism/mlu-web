// One game tick, with no page code, so that the game page and the test harness run the same
// thing. See "Game time" in docs/mlu1/specifications.md.

import { tickUnderground } from './pod.js';
import { tickMantle } from './mantle.js';
import { stepEffects } from './effects.js';

/** One game tick: the play or mantle update, then what the original updated while drawing. */
export function tick(s) {
  s.fxLast = {};
  if (!s.menu && s.iposy <= 2999) tickUnderground(s);
  else if (!s.menu && s.iposy >= 3000) tickMantle(s);
  stepEffects(s);
}

/**
 * One tick with the autopilot, if one is given: it presses its keys first, as a player's keys
 * arrive before the tick.
 */
export function step(s, autopilot) {
  autopilot?.step(s);
  tick(s);
}
