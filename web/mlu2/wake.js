// Keeps the screen on while a game is in progress, so that the display does not dim or lock in
// the middle of play. See "Keeping the screen on" in docs/mlu2/specifications.md.
//
// It uses the Screen Wake Lock API where the browser has it, and does nothing where it does not.
// Browsers drop the lock whenever the page is hidden, so it is taken again when the page shows.

/** How long to wait after a refused request before asking again, in milliseconds. */
const RETRY_MS = 10000;

/**
 * @param {object} o
 * @param {() => boolean} o.inGame  true while a game is in progress (not on the start page)
 * @returns {{ update: () => void, held: () => boolean }} update() takes or releases the lock to
 *   match, and should be called often; held() tells whether the lock is held, for testing
 */
export function installWakeLock({ inGame }) {
  const api = navigator.wakeLock;
  if (!api) return { update() {}, held: () => false };
  let lock = null;
  let pending = false;
  let retryAt = 0;
  const wanted = () => inGame() && document.visibilityState === 'visible';
  const update = () => {
    if (wanted()) {
      if (lock || pending || performance.now() < retryAt) return;
      pending = true;
      api.request('screen').then((l) => {
        pending = false;
        if (!wanted()) {
          l.release().catch(() => {});
          return;
        }
        lock = l;
        l.addEventListener('release', () => { if (lock === l) lock = null; });
      }, () => {
        pending = false;
        retryAt = performance.now() + RETRY_MS;
      });
    } else if (lock) {
      const l = lock;
      lock = null;
      l.release().catch(() => {});
    }
  };
  document.addEventListener('visibilitychange', update);
  return { update, held: () => lock !== null };
}
