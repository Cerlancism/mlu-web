// Game clock: runs fixed-length game ticks from the display's refresh (requestAnimationFrame).
// See "Lifecycle and main loop" in docs/mlu2/specifications.md.
//
// The original ran one tick, repainted, then slept for an adjustable game-speed setting.
// The web version keeps the tick as the unit of game time, so every rule stays tick-based
// exactly as in the original, and runs a fixed 60 ticks a second (no speed setting).
//
// Speed: each refresh adds the real time since the previous one (the frame delta) to a time
// bank and runs as many ticks as the bank holds, so the refresh rate never changes game speed.
//   - The bank is fed a smoothed frame delta (exponential moving average, weight 1/10), so
//     timestamp jitter cancels out. The average conserves time: what it holds back from one
//     frame it pays out over the next ones, so the long-run rate is exact.
//   - A tick is due when the bank holds at least half a step, and the bank may go half a step
//     negative (round to nearest): at 60 Hz every refresh runs exactly one tick.
//   - After a long gap (hidden tab, debugger, a stall) the clock does not race to catch up.
//
// Smoothness: every refresh is drawn, with alpha in [0, 1): how far real time has moved from
// the latest tick towards the next one. The renderer draws moving things that far between
// their positions at the previous and the latest tick, so motion advances evenly on every
// refresh at any refresh rate, not in steps of whole ticks. This shows the game at most one
// tick (16.7 ms) behind the latest tick. Game state never depends on alpha.

export const TICKS_PER_SECOND = 60;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_TICKS_PER_FRAME = 8;  // more than this in one frame means a stall: drop the backlog
const MAX_FRAME_GAP_MS = 250;   // a longer gap between frames is treated as a pause
const SMOOTHING = 0.1;          // weight of the newest frame delta in the moving average

/**
 * @param {object} game
 * @param {() => void} game.tick       advances the game by one tick, including the updates the
 *                                     original made while drawing (they run once per tick here)
 * @param {(alpha: number) => void} game.render
 *                                     draws the state between the previous and the latest tick,
 *                                     alpha of the way; changes no game state
 */
export function createClock({ tick, render }) {
  let running = false;
  let last = 0;
  let acc = 0; // time bank in ms, kept in [-TICK_MS / 2, TICK_MS / 2) after each frame
  let avg = 0; // smoothed frame delta in ms; 0 = not known yet
  let rafId = 0;
  const stats = { frames: 0, ticks: 0, dropped: 0 };

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const dt = now - last;
    last = now;
    if (dt > MAX_FRAME_GAP_MS) {
      avg = 0; // a pause: no game time passes, and the next delta restarts the average
    } else {
      avg = avg === 0 ? dt : avg + (dt - avg) * SMOOTHING;
      acc += avg;
    }

    let n = 0;
    while (acc >= TICK_MS / 2 && n < MAX_TICKS_PER_FRAME) {
      tick();
      acc -= TICK_MS;
      n++;
    }
    if (acc >= TICK_MS / 2) {
      const drop = Math.floor(acc / TICK_MS + 0.5);
      stats.dropped += drop;
      acc -= drop * TICK_MS;
    }

    stats.frames++;
    stats.ticks += n;
    render(alpha());
  }

  /** Fraction of a tick between the latest tick and the next one, in [0, 1]. */
  function alpha() {
    return Math.min(1, Math.max(0, acc / TICK_MS + 0.5));
  }

  function resume() {
    last = performance.now();
    acc = 0;
    avg = 0;
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resume();
  });

  return {
    start() {
      if (running) return;
      running = true;
      resume();
      render(alpha());
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    /** Counters since start: frames drawn, ticks run, ticks dropped after stalls. */
    stats,
  };
}
