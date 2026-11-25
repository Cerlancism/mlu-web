// Fits the game to the browser window. See "Page and shell" in docs/mlu1/specifications.md.
//
// Two modes, picked with the URL parameter ?scale=crisp|integer, or else the scaling setting the
// launcher stores (settings.js):
//   crisp   (default) the largest size that fits; play.css computes it on its own.
//   integer the largest whole multiple of the 600-pixel height, counted in device pixels, that
//           fits under the 20-pixel menu bar; this module computes it and sets --h on <html>.
//           Never below 1x.
// Both modes draw hard-edged pixels (image-rendering: pixelated in play.css).

import { loadSettings } from './settings.js';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const MENU_HEIGHT = 20;

const CARD_WIDTH = 189;
const BORDER = 3; // CSS pixels, as in play.css
const MODES = ['crisp', 'integer'];

/** The scaling mode named in the page URL, or else the stored setting, or else "crisp". */
export function scaleMode(search = location.search) {
  const mode = new URLSearchParams(search).get('scale');
  return MODES.includes(mode) ? mode : loadSettings().scale;
}

/** Applies the mode and keeps it applied as the window or the display's pixel density changes. */
export function installViewport(mode = scaleMode()) {
  const root = document.documentElement;
  root.dataset.scale = mode;
  if (mode !== 'integer') {
    return;
  }

  const apply = () => {
    const dpr = window.devicePixelRatio || 1;
    // Device pixels available for the shared height h, from the two fit conditions in play.css.
    const byHeight = (window.innerHeight - MENU_HEIGHT - 2 * BORDER) * dpr;
    const byWidth = ((window.innerWidth - 3 * BORDER) * dpr) / ((CARD_WIDTH + GAME_WIDTH) / GAME_HEIGHT);
    const k = Math.max(1, Math.floor(Math.min(byHeight, byWidth) / GAME_HEIGHT));
    root.style.setProperty('--h', `${(k * GAME_HEIGHT) / dpr}px`);
  };

  apply();
  window.addEventListener('resize', apply);
  // devicePixelRatio changes (zoom, moving to another monitor) do not always fire resize.
  const watchDpr = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
      'change',
      () => { apply(); watchDpr(); },
      { once: true },
    );
  };
  watchDpr();
}

/** Converts a mouse event's position on the scaled canvas to 800x600 game coordinates. */
export function toGameCoords(canvas, event) {
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor(((event.clientX - r.left) * GAME_WIDTH) / r.width),
    y: Math.floor(((event.clientY - r.top) * GAME_HEIGHT) / r.height),
  };
}
