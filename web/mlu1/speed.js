// Game speed: the steps the - and = keys move through during a game.
// See "Speed" in docs/mlu1/specifications.md (section 3).
//
// The original slept a whole number of milliseconds after each tick, 27 ms at first, and its -
// and = keys changed that by 1 ms, no faster than 15 ms. The web version runs 60 ticks a second
// and keeps those pauses as steps (a pause of p ms is 1000 / p ticks a second), between even
// steps of 0.05 times its own speed from 0.5 to 1.5, then a few larger ones up to 16 times.

/** Each step: the speed as a multiple of 60 ticks a second, and how it is shown. */
export const SPEEDS = (() => {
  const steps = [];
  for (let k = 10; k <= 30; k++) {
    const x = k / 20;
    steps.push({ x, label: k === 20 ? 'Normal' : `${x}×` });
  }
  for (let p = 27; p >= 15; p--) steps.push({ x: 1000 / p / 60, label: `${p} ms` });
  for (const x of [2, 3, 4, 6, 8, 12, 16]) steps.push({ x, label: `${x}×` });
  return steps.sort((a, b) => a.x - b.x);
})();

/** The step nearest to speed x, as a multiple of 60 ticks a second. */
export function nearestStep(x) {
  let best = 0;
  for (let i = 1; i < SPEEDS.length; i++) {
    if (Math.abs(Math.log(SPEEDS[i].x / x)) < Math.abs(Math.log(SPEEDS[best].x / x))) best = i;
  }
  return best;
}
