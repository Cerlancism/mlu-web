// assets: Preloading every image by exact file name before the game starts, and the mirrored
// copies the original built at run time.
// Specification: docs/mlu2/specifications.md, Page and shell (2), Graphics (11).
//
// The game holds images as file names, as passed to the original's getImage, for example
// 'images/repairs.jpg'. A name with '#flip' appended is that image mirrored left to right, made on
// first use. A name with no file draws nothing.

import { IMAGE_FILES } from './imagelist.js';

const BASE = new URL('./', import.meta.url);

/** The name of the left-to-right mirror image of an image (the original's mirror()). */
export function flipName(name) {
  return name == null ? null : `${name}#flip`;
}

/** Resolves an image name such as 'images/dark matter.png' to its URL. */
export function imageUrl(name) {
  return new URL(name.split('/').map(encodeURIComponent).join('/'), BASE).href;
}

/**
 * Loads every image. onProgress(done, total) is called as each one finishes.
 * Resolves to { image(name) }, which returns a loaded image, a mirrored canvas, or null.
 */
export async function loadAssets(onProgress = () => {}) {
  const images = new Map();
  let done = 0;
  await Promise.all(IMAGE_FILES.map((name) => new Promise((resolve) => {
    const im = new Image();
    im.decoding = 'async';
    const finish = () => {
      onProgress(++done, IMAGE_FILES.length);
      resolve();
    };
    im.onload = () => {
      images.set(`images/${name}`, im);
      finish();
    };
    im.onerror = finish;
    im.src = imageUrl(`images/${name}`);
  })));

  const image = (name) => {
    if (name == null) return null;
    const got = images.get(name);
    if (got !== undefined) return got;
    if (name.endsWith('#flip')) {
      const src = image(name.slice(0, -5));
      let out = null;
      if (src) {
        out = document.createElement('canvas');
        out.width = src.width;
        out.height = src.height;
        const g = out.getContext('2d');
        g.translate(src.width, 0);
        g.scale(-1, 1);
        g.drawImage(src, 0, 0);
      }
      images.set(name, out);
      return out;
    }
    images.set(name, null);
    return null;
  };
  return { image, count: done };
}
