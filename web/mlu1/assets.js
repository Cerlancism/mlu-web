// Preloading images by exact name. See "Start-up" in docs/mlu1/specifications.md.
//
// Every image in images/ is loaded before the game starts. A name that has no file (the game
// asks for three that never existed) simply has no image and draws nothing, as in the original.

import { IMAGE_FILES } from './imagelist.js';

const BASE = new URL('./images/', import.meta.url);

/** Resolves an image file name to its URL; the space in "dark matter.png" is escaped. */
export function imageUrl(name) {
  return new URL(name.split('/').map(encodeURIComponent).join('/'), BASE).href;
}

/**
 * Loads every image. onProgress(done, total) is called as each one finishes.
 * Resolves to { image(name) } which returns a loaded image or null.
 */
export async function loadAssets(onProgress = () => {}) {
  const images = new Map();
  let done = 0;
  await Promise.all(IMAGE_FILES.map((name) => new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      images.set(name, im);
      onProgress(++done, IMAGE_FILES.length);
      resolve();
    };
    im.onerror = () => {
      onProgress(++done, IMAGE_FILES.length);
      resolve();
    };
    im.src = imageUrl(name);
  })));
  return {
    image: (name) => images.get(name) ?? null,
    count: images.size,
  };
}
