// storage: Keeping saved games and the local high-score list in the browser's IndexedDB.
// Specification: docs/mlu2/specifications.md, Storage in the browser (13).
//
// One database, 'mlu2', with two object stores: 'saves' maps a game name to the exact text of its
// save file, and 'scores' holds the high-score list as one array under the key 'list'. Every
// call is asynchronous and never rejects: failures resolve to null, [] or false, and writes that
// fail are reported through onError.

const DB_NAME = 'mlu2';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
      if (!db.objectStoreNames.contains('scores')) db.createObjectStore('scores');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('could not open the database'));
    req.onblocked = () => reject(new Error('the database is blocked by another tab'));
  });
}

/** The store interface the game state uses. */
export function createStore(onError = () => {}) {
  let dbPromise = null;
  const db = () => {
    if (!dbPromise) {
      dbPromise = openDb();
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  };

  const get = async (store, key) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const req = d.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };
  const put = async (store, key, value) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('the write was aborted'));
    });
  };
  const del = async (store, key) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('the delete was aborted'));
    });
  };
  /** Every [key, value] pair of a store. */
  const entries = async (store) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const out = [];
      const req = d.transaction(store, 'readonly').objectStore(store).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(out);
          return;
        }
        out.push([cursor.key, cursor.value]);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  };
  const why = (err) => (err && err.name === 'QuotaExceededError'
    ? 'browser storage is full' : (err && err.message) || 'storage is not available');

  // Ask the browser not to clear this site's data when the disk runs low.
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    // not supported
  }

  return {
    /** Every save as { name, size } (size in characters), sorted by name; null if unreadable. */
    async list() {
      try {
        const all = await entries('saves');
        return all
          .filter(([name, text]) => typeof name === 'string' && typeof text === 'string')
          .map(([name, text]) => ({ name, size: text.length }))
          .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      } catch {
        return null;
      }
    },
    /** Deletes a save; returns false (and reports why) if the browser refused. */
    async remove(name) {
      try {
        await del('saves', name);
        return true;
      } catch (err) {
        onError(`Could not delete "${name}": ${why(err)}`);
        return false;
      }
    },
    async read(name) {
      try {
        const text = await get('saves', name);
        return typeof text === 'string' ? text : null;
      } catch {
        return null;
      }
    },
    async write(name, text) {
      try {
        await put('saves', name, text);
        return true;
      } catch (err) {
        onError(`Could not save "${name}": ${why(err)}`);
        return false;
      }
    },
    async readScores() {
      try {
        const list = await get('scores', 'list');
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    async writeScores(list) {
      try {
        await put('scores', 'list', list);
        return true;
      } catch (err) {
        onError(`Could not record the score: ${why(err)}`);
        return false;
      }
    },
  };
}
