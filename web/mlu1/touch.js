// Touch controls for phones and tablets: a translucent overlay with an eight-way pad for the
// arrow keys, buttons for the game's other keys, a button that opens the device's keyboard (for
// typing game names) and one for landscape full screen. See "Touch controls" in
// docs/mlu1/specifications.md (section 2).
//
// The overlay sends the same Java key codes as the keyboard, through input.js, so the game cannot
// tell them apart. Its keys do nothing while a message box or the menu is open (play.js marks
// <html> with data-modal then).

import { keyCode } from './input.js';

const UP = 38;
const DOWN = 40;
const LEFT = 37;
const RIGHT = 39;
// The pad's eight directions, counter-clockwise from the right, as the arrows each holds down.
const SECTORS = [[RIGHT], [UP, RIGHT], [UP], [UP, LEFT], [LEFT], [DOWN, LEFT], [DOWN], [DOWN, RIGHT]];
const ARROWS = { up: UP, right: RIGHT, down: DOWN, left: LEFT };
const DEAD_ZONE = 0.2; // of the pad's radius: a touch nearer the centre holds no arrow
// Held repeat keys are pressed again after the delay, then at the rate, as a held keyboard key is.
const REPEAT_DELAY = 400;
const REPEAT_EVERY = 40;
// The text kept in the hidden field that receives the device keyboard's typing, so that
// Backspace always has something to delete.
const FILLER = '----';

const SVG_KEYBOARD = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 9.5h1M9 9.5h1M12.5 9.5h1M16 9.5h2M5.5 12h2M9.5 12h1M12.5 12h1M15.5 12h3M8 15h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SVG_FULLSCREEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const root = document.documentElement;
const modal = () => root.hasAttribute('data-modal');

/** The Java key code for a typed character the game reads, or 0. */
function charCode(ch) {
  if (/^[a-z]$/i.test(ch)) return ch.toUpperCase().charCodeAt(0);
  if (/^[0-9]$/.test(ch)) return ch.charCodeAt(0);
  if (ch === ' ') return 32;
  if (ch === '\n') return 10;
  return 0;
}

function make(tag, className, parent) {
  const el = document.createElement(tag);
  el.className = className;
  parent?.append(el);
  return el;
}

/** A button that never takes focus, so the game screen or the keyboard field keeps it. */
function toolButton(className, parent) {
  const b = make('button', className, parent);
  b.type = 'button';
  b.tabIndex = -1;
  b.addEventListener('pointerdown', (e) => e.preventDefault());
  return b;
}

/**
 * Builds the overlay. keys lists the buttons (TOUCH_KEYS in data.js); press and release send a
 * key to the game (from installInput); gesture unlocks sound; canvas takes focus back when the
 * keyboard closes; mode is the "touch" setting: "auto" shows the overlay on touch screens and at
 * the first touch, "on" always, "off" never. speed ({ slower, faster }) makes the game slower and
 * faster; autopilot ({ toggle }), if given, switches the autopilot. Returns reset, which lets go
 * of every key the overlay holds, and setAutopilot, which shows whether the autopilot is on:
 * while it is, the game keys hide. The item keys marked keep (the inventory, the game's pause)
 * sit at the top right, just left of the autopilot's button, rather than with the other item
 * keys, so they stay in reach while it plays.
 */
export function installTouch({ keys, press, release, gesture, canvas, mode, speed, autopilot }) {
  const overlay = make('div', 'touch', document.body);
  overlay.hidden = true;

  // ---- Keys held by the overlay ------------------------------------------------------------

  const down = new Map(); // key code -> its repeat timer
  const views = []; // functions that show which keys are down

  function hold(code, repeat) {
    if (down.has(code) || modal()) return;
    press(code);
    let timer = 0;
    if (repeat) {
      const again = () => {
        if (!modal()) press(code);
        timer = setTimeout(again, REPEAT_EVERY);
        down.set(code, timer);
      };
      timer = setTimeout(again, REPEAT_DELAY);
    }
    down.set(code, timer);
  }

  function letGo(code) {
    if (!down.has(code)) return;
    clearTimeout(down.get(code));
    down.delete(code);
    release(code);
  }

  const showAll = () => { for (const view of views) view(); };

  // ---- The pad -----------------------------------------------------------------------------

  const pad = make('div', 'touch-pad', overlay);
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Arrow keys');
  const arrows = Object.keys(ARROWS).map((dir) => {
    const a = make('span', 'touch-arrow', pad);
    a.dataset.dir = dir;
    return a;
  });
  let padPointer = null;
  let padCodes = [];

  // Sliding to the next direction lets go only of the arrow it no longer holds, so Up stays down
  // from up-left to up-right (letting go of Up has effects of its own).
  function setPad(codes) {
    for (const code of padCodes) if (!codes.includes(code)) letGo(code);
    for (const code of codes) if (!padCodes.includes(code)) hold(code, true);
    padCodes = codes.filter((code) => down.has(code));
    showAll();
  }

  function padCodesAt(e) {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < (DEAD_ZONE * r.width) / 2) return [];
    return SECTORS[(Math.round(Math.atan2(-dy, dx) / (Math.PI / 4)) + 8) % 8];
  }

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (padPointer !== null) return; // one finger on the pad at a time
    pad.setPointerCapture(e.pointerId);
    padPointer = e.pointerId;
    setPad(padCodesAt(e));
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId === padPointer) setPad(padCodesAt(e));
  });
  const padEnd = (e) => {
    if (e.pointerId !== padPointer) return;
    padPointer = null;
    setPad([]);
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    pad.addEventListener(type, padEnd);
  }
  views.push(() => {
    for (const a of arrows) a.classList.toggle('on', padCodes.includes(ARROWS[a.dataset.dir]));
  });

  // ---- Key buttons ---------------------------------------------------------------------------

  function keyButton(k, parent) {
    const b = toolButton(k.className ?? 'touch-key', parent);
    make('b', '', b).textContent = k.key;
    make('small', '', b).textContent = k.does;
    b.setAttribute('aria-label', `${k.key}: ${k.does}`);
    let pointer = null;
    b.addEventListener('pointerdown', (e) => {
      if (k.latch) {
        // Tapped once it stays down, tapped again it is let go.
        if (down.has(k.code)) letGo(k.code);
        else hold(k.code, false);
      } else if (pointer === null) {
        b.setPointerCapture(e.pointerId);
        pointer = e.pointerId;
        hold(k.code, k.repeat);
      }
      showAll();
    });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      letGo(k.code);
      showAll();
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      b.addEventListener(type, end);
    }
    views.push(() => b.classList.toggle('on', down.has(k.code)));
  }

  const top = make('div', 'touch-top', overlay);
  for (const k of keys.top) keyButton(k, top);
  const actions = make('div', 'touch-actions', overlay);
  const items = make('div', 'touch-items', actions);
  const gridKeys = keys.items.filter((k) => !k.keep);
  items.style.setProperty('--cols', String(Math.ceil(gridKeys.length / Math.ceil(gridKeys.length / 5))));
  for (const k of gridKeys) keyButton(k, items);
  const row = make('div', 'touch-row', actions);
  overlay.style.setProperty('--row-keys', String(keys.row.length));
  for (const k of keys.row) keyButton(k, row);
  keyButton({ ...keys.space, className: 'touch-key touch-space' }, overlay);

  // ---- The device keyboard ---------------------------------------------------------------------
  // A hidden text field takes the typing: each character typed, and each one deleted (Backspace),
  // is sent to the game as a key press, whether or not the keyboard sends key events of its own.

  const tools = make('div', 'touch-tools', overlay);

  // ---- Speed and the autopilot -----------------------------------------------------------------

  function toolKey(label, does, onTap) {
    const b = toolButton('touch-key', tools);
    make('b', '', b).textContent = label;
    make('small', '', b).textContent = does;
    b.setAttribute('aria-label', does);
    b.addEventListener('click', onTap);
    return b;
  }
  if (speed) {
    toolKey('\u2212', 'Slower', speed.slower);
    toolKey('+', 'Faster', speed.faster);
  }
  // The item keys marked keep (the inventory, the game's pause) sit just left of the autopilot's
  // button, where they stay while the autopilot plays and the other game keys are hidden.
  for (const k of keys.items.filter((item) => item.keep)) keyButton(k, tools);
  const autoKey = autopilot ? toolKey('Auto', 'Autopilot', autopilot.toggle) : null;
  const field = make('input', 'touch-field', document.body);
  Object.assign(field, { type: 'text', tabIndex: -1, spellcheck: false, autocomplete: 'off' });
  field.setAttribute('autocorrect', 'off');
  field.setAttribute('autocapitalize', 'none');
  field.setAttribute('enterkeyhint', 'enter');
  field.setAttribute('aria-label', 'Typing for the game');
  let last = FILLER;
  let keyEvent = false; // the typing came with a key event the keyboard handler already sent

  const refill = () => {
    field.value = FILLER;
    last = FILLER;
    field.setSelectionRange(FILLER.length, FILLER.length);
  };
  const tap = (code) => {
    if (modal()) return;
    press(code);
    release(code);
  };

  field.addEventListener('focus', refill);
  let unnamed = false; // the last key press did not say which key it was (keyCode 229)
  field.addEventListener('keydown', (e) => {
    keyEvent = !e.isComposing && e.keyCode !== 229 && keyCode(e) !== 0;
    unnamed = e.keyCode === 229;
  });
  field.addEventListener('keyup', (e) => {
    keyEvent = false;
    // Enter changes no text, so when only its release names it, that is when it is sent.
    if (unnamed && keyCode(e) === 10) tap(10);
    unnamed = false;
  });
  field.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertLineBreak' && !keyEvent) {
      e.preventDefault();
      tap(10);
    }
  });
  field.addEventListener('input', (e) => {
    const now = field.value;
    if (!keyEvent) {
      // The change from the text before: what was deleted, then what was typed. A word the
      // keyboard corrects comes out as deletions and retyping, which leaves the same name.
      let same = 0;
      while (same < now.length && same < last.length && now[same] === last[same]) same++;
      for (let i = same; i < last.length; i++) tap(8);
      for (const ch of now.slice(same)) {
        const code = charCode(ch);
        if (code) tap(code);
      }
    }
    last = now;
    if (!e.isComposing) refill();
  });
  field.addEventListener('compositionend', refill);

  const kb = toolButton('touch-tool', tools);
  kb.innerHTML = SVG_KEYBOARD;
  kb.setAttribute('aria-label', 'Keyboard');
  kb.addEventListener('click', () => {
    if (document.activeElement === field) {
      field.blur();
      canvas.focus();
    } else {
      field.focus({ preventScroll: true });
    }
  });
  field.addEventListener('focus', () => kb.classList.add('on'));
  field.addEventListener('blur', () => kb.classList.remove('on'));

  // ---- Full screen -----------------------------------------------------------------------------

  const fsElement = () => document.fullscreenElement ?? document.webkitFullscreenElement;
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
    const fs = toolButton('touch-tool', tools);
    fs.innerHTML = SVG_FULLSCREEN;
    fs.setAttribute('aria-label', 'Full screen');
    fs.addEventListener('click', async () => {
      if (fsElement()) {
        (document.exitFullscreen ?? document.webkitExitFullscreen).call(document);
        return;
      }
      try {
        await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
        // Phones turn to landscape; elsewhere locking is refused, which is fine.
        await screen.orientation?.lock?.('landscape');
      } catch {
        // Refused: the page stays as it is.
      }
    });
    const showFs = () => fs.classList.toggle('on', Boolean(fsElement()));
    document.addEventListener('fullscreenchange', showFs);
    document.addEventListener('webkitfullscreenchange', showFs);
  }

  // ---- Showing, and letting go -------------------------------------------------------------------

  // Browsers allow sound to start only from certain events; for a touch, its end is one.
  overlay.addEventListener('pointerup', gesture);
  const show = () => { overlay.hidden = false; };
  if (mode === 'on' || (mode === 'auto' && matchMedia('(pointer: coarse)').matches)) show();
  if (mode === 'auto') {
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') show(); }, true);
  }

  function reset() {
    for (const code of [...down.keys()]) letGo(code);
    padPointer = null;
    padCodes = [];
    showAll();
  }
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });

  function setAutopilot(on) {
    overlay.toggleAttribute('data-autopilot', on);
    autoKey?.classList.toggle('on', on);
  }

  return { reset, setAutopilot };
}
