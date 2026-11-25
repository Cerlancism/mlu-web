// Protects a game in progress from closing the tab by accident, mainly by Ctrl+W.
// See "Browser limits" in docs/mlu1/specifications.md.
//
// Ctrl is the tractor beam and W is Teleporter 2, but Ctrl+W closes the browser tab and a page
// cannot stop that. While a game is in progress, leaving the page asks for confirmation first,
// and if Ctrl was held at the time a warning explains the cause once the player stays.

export const CTRL_W_WARNING =
  'Ctrl+W closes the browser tab. Release Ctrl (tractor beam) before pressing W (Teleporter 2).';

/**
 * @param {object} o
 * @param {() => boolean} o.inGame    true while a game is in progress (not on the start page)
 * @param {() => boolean} o.ctrlHeld  true while Ctrl is held
 * @param {(message: string) => void} o.warn  shows a warning to the player
 */
export function installLeaveGuard({ inGame, ctrlHeld, warn }) {
  window.addEventListener('beforeunload', (e) => {
    if (!inGame()) return;
    if (ctrlHeld()) warn(CTRL_W_WARNING);
    e.preventDefault();
    e.returnValue = ''; // older browsers need this to show the confirmation
  });
  // Some browsers do pass Ctrl+W to the page before acting on it.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'KeyW' && inGame()) warn(CTRL_W_WARNING);
  }, true);
}
