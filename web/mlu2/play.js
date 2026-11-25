// Entry module for the MLU 2 web port: sets up the page and its menu bar and message boxes, loads
// the images, sounds and fonts, wires input, audio and storage to the game, and starts the clock.
// See "Page and shell" and "Lifecycle and main loop" in docs/mlu2/specifications.md.

import { installViewport } from './viewport.js';
import { createClock } from './clock.js';
import { loadAssets } from './assets.js';
import { createAudio } from './audio.js';
import { createStore } from './storage.js';
import { loadSettings, settingsKeeper } from './settings.js';
import { installInput } from './input.js';
import { installTouch } from './touch.js';
import {
  createSnapshotStore, snapshotBlocker, makeSnapshot, restoreState,
} from './snapshots.js';
import { installLeaveGuard } from './guard.js';
import { createState } from './state.js';
import { tickPlay } from './pod.js';
import { stepEffects } from './effects.js';
import { keyDown, keyUp, mouseClick, mouseMove, menuAction, resumed } from './controls.js';
import { render, snapshot, drawFieldLayer, drawStatusLayer } from './render.js';
import { FONT_LIST, MENU_TEXT, TOUCH_KEYS } from './data.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const g = canvas.getContext('2d', { alpha: false });

installViewport();
canvas.focus();

// ---- Message boxes ------------------------------------------------------------------------
// One box at a time; later ones wait in a queue. A box opened from the game loop ("blocking")
// stops the game until it is closed, as the original's loop waited in the dialog call.

const dialog = {
  el: document.getElementById('dialog'),
  title: document.getElementById('dialog-title'),
  text: document.getElementById('dialog-text'),
  buttons: document.getElementById('dialog-buttons'),
  queue: [],
  current: null,
};

function showNextDialog() {
  const d = dialog.queue[0];
  dialog.current = d ?? null;
  syncModal();
  if (!d) {
    dialog.el.hidden = true;
    canvas.focus();
    return;
  }
  dialog.title.textContent = d.title;
  dialog.text.textContent = d.text;
  dialog.buttons.replaceChildren(...d.buttons.map((label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => closeDialog(label));
    return b;
  }));
  dialog.el.hidden = false;
  dialog.buttons.firstChild.focus();
}

function closeDialog(answer) {
  const d = dialog.queue.shift();
  if (!d) return;
  d.resolve(answer);
  showNextDialog();
}

function openDialog(title, text, buttons, blocking = false) {
  return new Promise((resolve) => {
    dialog.queue.push({ title, text, buttons, blocking, resolve });
    if (!dialog.current) showNextDialog();
  });
}

const gameBlocked = () => dialog.queue.some((d) => d.blocking);

/** Keys while a box is open: Enter presses the focused button, Esc closes, Tab and arrows move. */
function dialogKey(e) {
  const buttons = [...dialog.buttons.children];
  const at = buttons.indexOf(document.activeElement);
  if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
    closeDialog((buttons[at] ?? buttons[0]).textContent);
  } else if (e.code === 'Escape') {
    // Esc closes a question as Cancel (the original's closed-dialog answer).
    closeDialog(buttons.length > 1 ? 'Cancel' : buttons[0].textContent);
  } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft' || e.code === 'Tab') {
    const step = e.code === 'ArrowLeft' || (e.code === 'Tab' && e.shiftKey) ? -1 : 1;
    buttons[(Math.max(at, 0) + step + buttons.length) % buttons.length].focus();
  }
  e.preventDefault();
  e.stopImmediatePropagation();
}

// ---- The menu bar ---------------------------------------------------------------------------

/** Marks <html> while a message box or the menu is open, when the touch keys do nothing. */
function syncModal() {
  document.documentElement.toggleAttribute('data-modal',
    Boolean(dialog.current) || !menu.list.hidden);
}

// Set when the menu's Exit leaves for the launcher, so the leave confirmation does not ask again.
let exiting = false;

/** Goes back to the launcher page, once any save being written is stored. */
function exitToLauncher(s) {
  if (s.storeBusy) {
    setTimeout(() => exitToLauncher(s), 50);
    return;
  }
  exiting = true;
  location.assign('./' + location.search); // keeps ?scale= and any other query
}

// Back from the launcher can show this page again from the browser's cache: guard it again.
window.addEventListener('pageshow', () => { exiting = false; });

const menu = {
  title: document.getElementById('menu-title'),
  list: document.getElementById('menu-items'),
  items: [...document.querySelectorAll('#menu-items button')],
};

/** The check boxes show the game's music and sound switches, the ones on the start page. */
function openMenu(s) {
  for (const b of menu.items) {
    const item = b.dataset.item;
    if (item === 'music' || item === 'sounds') b.setAttribute('aria-checked', String(s[item]));
  }
  menu.list.hidden = false;
  menu.title.setAttribute('aria-expanded', 'true');
  syncModal();
}

function closeMenu() {
  if (menu.list.hidden) return;
  menu.list.hidden = true;
  menu.title.setAttribute('aria-expanded', 'false');
  syncModal();
  canvas.focus();
}

function menuKey(e) {
  const at = menu.items.indexOf(document.activeElement);
  if (e.code === 'Escape') {
    closeMenu();
  } else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    const step = e.code === 'ArrowDown' ? 1 : -1;
    const n = menu.items.length;
    menu.items[at < 0 ? (step > 0 ? 0 : n - 1) : (at + step + n) % n].focus();
  } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
    if (at >= 0) menu.items[at].click();
  }
  e.preventDefault();
  e.stopImmediatePropagation();
}

function installMenu(s) {
  menu.title.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (dialog.current) return; // message boxes are modal
    if (menu.list.hidden) openMenu(s);
    else closeMenu();
  });
  document.addEventListener('mousedown', (e) => {
    if (!menu.list.hidden && !e.target.closest('#menu')) closeMenu();
  });
  for (const b of menu.items) {
    b.addEventListener('mouseenter', () => b.focus());
    b.addEventListener('click', () => {
      const item = b.dataset.item;
      closeMenu();
      runMenuItem(s, item);
    });
  }
}

async function runMenuItem(s, item) {
  if (item === 'help') {
    openDialog('About', MENU_TEXT.help, ['OK']);
  } else if (item === 'shops') {
    openDialog('Controls', MENU_TEXT.shops, ['OK']);
  } else if (item === 'game') {
    openDialog('Controls', MENU_TEXT.game, ['OK']);
  } else if (item === 'restart') {
    const answer = await openDialog('MLU', 'Are you sure you want to quit this game?',
      ['Yes', 'No', 'Cancel']);
    if (answer === 'Yes') menuAction(s, 'restart');
  } else if (item === 'mission') {
    const text = menuAction(s, 'mission');
    if (text != null) openDialog('Mission', text, ['OK']);
  } else if (item === 'music' || item === 'sounds') {
    menuAction(s, item, !s[item]);
  } else if (item === 'snapshot') {
    takeSnapshot(s);
  } else if (item === 'exit') {
    // During a game, Exit asks first, as Restart does; on the start page it leaves at once.
    if (!s.startpage) {
      const answer = await openDialog('MLU', 'Are you sure you want to quit this game?',
        ['Yes', 'No', 'Cancel']);
      if (answer !== 'Yes') return;
    }
    exitToLauncher(s);
  }
}

// ---- Snapshots --------------------------------------------------------------------------------

const snapshots = createSnapshotStore();

/** Game > Take Snapshot: keeps the whole game as it is now, to be resumed from the launcher. */
async function takeSnapshot(s) {
  const blocker = snapshotBlocker(s);
  if (blocker) {
    openDialog('Snapshot', blocker, ['OK']);
    return;
  }
  const record = makeSnapshot(s); // the game as it is at this moment
  try {
    await snapshots.add(record);
    openDialog('Snapshot',
      `The game is kept as the snapshot "${record.name}". Resume it from the launcher.`, ['OK']);
  } catch (err) {
    openDialog('Snapshot', `The snapshot could not be stored: ${err.message}.`, ['OK']);
  }
}

/** A snapshot named in the URL (the launcher's Resume, ?snapshot=) takes the start page's place. */
async function resumeFromUrl(s, notify) {
  const params = new URLSearchParams(location.search);
  const id = params.get('snapshot');
  if (id === null) return;
  // Used once: a reload, or Exit to the launcher, does not resume it again.
  params.delete('snapshot');
  const query = params.toString();
  history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  try {
    const record = await snapshots.get(id);
    if (!record) throw new Error('it is no longer kept in this browser');
    restoreState(s, record.state);
    resumed(s);
  } catch (err) {
    notify(`Could not resume the snapshot: ${err.message}`);
  }
}

// ---- Keys go to the open box or menu first ---------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (dialog.current) dialogKey(e);
  else if (!menu.list.hidden) menuKey(e);
}, true);
window.addEventListener('keyup', (e) => {
  if (dialog.current || !menu.list.hidden) e.stopImmediatePropagation();
}, true);

// ---- Start-up -------------------------------------------------------------------------------

/** One game tick: the play update, then what the original updated while drawing. */
export function tick(s) {
  if (gameBlocked()) return;
  s.fxLast = {};
  tickPlay(s);
  stepEffects(s);
}

async function main() {
  status.textContent = 'Loading images…';
  const assets = await loadAssets((done, total) => {
    status.textContent = `Loading images ${done}/${total}`;
  });
  status.textContent = 'Loading sounds…';
  const sfx = await createAudio();
  status.textContent = 'Loading fonts…';
  // Text is drawn only once the fonts are ready, so the first frames never use another font.
  await Promise.all(FONT_LIST.map((f) => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready;

  // Warnings and save errors show in the status strip, in red, for 8 seconds.
  let noticeTimer = 0;
  const notify = (message) => {
    status.textContent = message;
    status.classList.add('warn');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      status.textContent = '';
      status.classList.remove('warn');
    }, 8000);
  };
  const store = createStore(notify);
  const ui = {
    alert(title, text, blocking = false) {
      openDialog(title, text, ['OK'], blocking);
    },
  };

  // The field layer is drawn at the moment the game asks for it, as the original drew it into its
  // field image; createState already asks once, before this is wired, so it is drawn again here.
  const gfx = { redrawField() {}, drawStatus() {} };
  const settings = loadSettings();
  const s = createState({ sfx, ui, store, gfx, settings });
  const keepSettings = settingsKeeper(s);
  window.addEventListener('pagehide', keepSettings);
  gfx.redrawField = () => drawFieldLayer(s, assets);
  gfx.drawStatus = () => drawStatusLayer(s, assets);
  gfx.redrawField();
  let prev = null;

  installMenu(s);
  const input = installInput(canvas, {
    keyDown: (code) => keyDown(s, code),
    keyUp: (code) => keyUp(s, code),
    click: (x, y) => { if (!dialog.current) mouseClick(s, x, y); },
    move: (x, y) => mouseMove(s, x, y),
    gesture: () => sfx.unlock(),
  });
  installTouch({
    keys: TOUCH_KEYS,
    press: input.press,
    release: input.release,
    gesture: () => sfx.unlock(),
    canvas,
    mode: settings.touch,
  });
  installLeaveGuard({ inGame: () => !s.startpage && !exiting, ctrlHeld: () => s.ctrl, warn: notify });

  const clock = createClock({
    tick: () => {
      prev = snapshot(s);
      tick(s);
      keepSettings();
    },
    // While a box opened from the game loop is up, the screen keeps the last frame drawn, as
    // the original's loop stood still inside the dialog call.
    render: (alpha) => { if (!gameBlocked()) render(g, s, assets, alpha, prev); },
  });

  // For testing from the console: step(n) runs n ticks and draws, even while the page is hidden.
  window.mlu = {
    state: s, clock, assets, snapshots,
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        prev = snapshot(s);
        tick(s);
      }
      render(g, s, assets, 1, prev);
    },
    dialog,
  };
  status.textContent = '';
  await resumeFromUrl(s, notify);
  clock.start();
}

// The site's service worker, one folder up, keeps the pages working offline (see sw.js). A port
// served on its own has none, which is fine.
navigator.serviceWorker?.register('../sw.js').catch(() => {});

main().catch((err) => {
  status.textContent = `Error: ${err.message}`;
  throw err;
});
