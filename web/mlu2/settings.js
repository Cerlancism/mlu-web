// settings: Keeping the Music and Sounds switches, the scaling mode and the touch controls
// setting in the browser's local storage, so the game starts as the player last left it. The
// launcher sets them too. See docs/mlu2/specifications.md, Storage in the browser (13), "Settings".

const KEY = 'mlu2.settings';
const SCALES = ['crisp', 'integer'];
const TOUCH = ['auto', 'on', 'off'];

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored() {
  try {
    const saved = JSON.parse(storage()?.getItem(KEY) ?? 'null');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {}; // unreadable: use the defaults
  }
}

/**
 * The settings as last stored: each switch is on, scaling crisp and the touch controls automatic
 * (shown on touch screens), when nothing is stored.
 */
export function loadSettings() {
  const saved = readStored();
  return {
    music: typeof saved.music === 'boolean' ? saved.music : true,
    sounds: typeof saved.sounds === 'boolean' ? saved.sounds : true,
    scale: SCALES.includes(saved.scale) ? saved.scale : 'crisp',
    touch: TOUCH.includes(saved.touch) ? saved.touch : 'auto',
    speed: typeof saved.speed === 'number' && saved.speed > 0 ? saved.speed : 1,
  };
}

/** Stores the given settings, keeping the others as they are. Returns false if storage refused. */
export function saveSettings(patch) {
  try {
    const ls = storage();
    if (!ls) return false;
    ls.setItem(KEY, JSON.stringify({ ...readStored(), ...patch }));
    return true;
  } catch {
    return false; // storage blocked or full: the settings still work for this session
  }
}

/** Returns a function that stores the switches of game state s whenever they have changed. */
export function settingsKeeper(s) {
  let last = `${s.music},${s.sounds}`;
  return () => {
    const now = `${s.music},${s.sounds}`;
    if (now === last) return;
    last = now;
    saveSettings({ music: s.music, sounds: s.sounds });
  };
}
