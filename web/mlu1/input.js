// Browser keyboard and mouse events to the game's key codes and click positions.
// See "Controls" in docs/mlu1/specifications.md.

import { toGameCoords } from './viewport.js';

// The original's - and = speed keys never reach the game: the page handles them (speed.js).
const CODES = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 10, NumpadEnter: 10,
  Space: 32, Escape: 27, Backspace: 8, ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17,
  ControlRight: 17,
};
// The same keys by name, for keyboards that leave the key's position (code) empty, as phone
// keyboards often do.
const NAMES = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 10, ' ': 32, Escape: 27,
  Backspace: 8,
};

/** The Java key code for a browser key event, or 0 for keys the game never sees. */
export function keyCode(e) {
  if (e.code in CODES) return CODES[e.code];
  if (/^Digit[0-9]$/.test(e.code)) return 48 + Number(e.code[5]);
  if (/^Numpad[0-9]$/.test(e.code)) return 96 + Number(e.code[6]);
  // Letters follow the keyboard layout, as the original's key codes did.
  if (e.key.length === 1 && /[a-z]/i.test(e.key)) return e.key.toUpperCase().charCodeAt(0);
  if (/^Key[A-Z]$/.test(e.code)) return e.code.charCodeAt(3);
  const noCode = !e.code || e.code === 'Unidentified';
  if (noCode && e.key in NAMES) return NAMES[e.key];
  if (noCode && /^[0-9]$/.test(e.key)) return 48 + Number(e.key);
  return 0;
}

/**
 * Sends key presses (including the system's key repeats), key releases and clicks on the canvas
 * to the game. Keys still held when the page loses focus are released. Returns releaseAll, which
 * releases every held key (used when the menu or a message box takes the keyboard), and press
 * and release, for the touch controls.
 */
export function installInput(canvas, { keyDown, keyUp, click, gesture }) {
  const held = new Set();
  // A Ctrl release can be lost (for example to the browser's leave-page dialog); any key event
  // that shows Ctrl up releases it.
  const syncCtrl = (e) => {
    if (!e.ctrlKey && e.code !== 'ControlLeft' && e.code !== 'ControlRight' && held.has(17)) {
      held.delete(17);
      keyUp(17);
    }
  };
  const target = window;
  target.addEventListener('keydown', (e) => {
    gesture();
    if (e.altKey || e.metaKey) return;
    syncCtrl(e);
    const code = keyCode(e);
    if (!code) return;
    // With Ctrl held, letters and digits still reach the game but also keep their browser
    // shortcut (Ctrl+R, Ctrl+F and so on); arrows, Space and Enter stay with the game.
    const letter = code >= 48 && code <= 90;
    if (!(e.ctrlKey && letter)) e.preventDefault();
    held.add(code);
    keyDown(code);
  });
  target.addEventListener('keyup', (e) => {
    syncCtrl(e);
    const code = keyCode(e);
    if (!code) return;
    e.preventDefault();
    held.delete(code);
    keyUp(code);
  });
  const releaseAll = () => {
    for (const code of held) keyUp(code);
    held.clear();
  };
  // Key presses from the touch controls (touch.js), kept with the keyboard's so that releaseAll
  // releases them too. A press while the key is held is a key repeat.
  const press = (code) => {
    gesture();
    held.add(code);
    keyDown(code);
  };
  const release = (code) => {
    if (!held.delete(code)) return;
    keyUp(code);
  };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  canvas.addEventListener('mousedown', (e) => {
    gesture();
    canvas.focus();
    e.preventDefault();
  });
  canvas.addEventListener('click', (e) => {
    const { x, y } = toGameCoords(canvas, e);
    click(x, y);
  });
  return { releaseAll, press, release };
}
