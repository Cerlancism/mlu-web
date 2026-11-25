// Keeping saved games in the browser's local storage, one entry per save name.
// See "Saved games" in docs/mlu1/specifications.md.

const PREFIX = 'mlu1.save.';

/** The store interface the game state uses. Storage errors (full, blocked) are reported. */
export function createStore(onError = () => {}) {
  const ls = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })();
  return {
    read(name) {
      try {
        return ls?.getItem(PREFIX + name) ?? null;
      } catch {
        return null;
      }
    },
    /** Stores a save; returns false (and reports why) if the browser refused it. */
    write(name, text) {
      try {
        if (!ls) throw new Error('local storage is not available');
        ls.setItem(PREFIX + name, text);
        return true;
      } catch (err) {
        const full = err && (err.name === 'QuotaExceededError' || err.code === 22);
        onError(`Could not save "${name}": ${full ? 'browser storage is full' : err.message}`);
        return false;
      }
    },
    remove(name) {
      try {
        ls?.removeItem(PREFIX + name);
      } catch {
        // nothing to remove
      }
    },
    /** Every save as { name, size } (size in characters), sorted by name; null if unreadable. */
    list() {
      try {
        if (!ls) return null;
        const saves = [];
        for (let i = 0; i < ls.length; i++) {
          const key = ls.key(i);
          if (key && key.startsWith(PREFIX)) {
            saves.push({ name: key.slice(PREFIX.length), size: ls.getItem(key)?.length ?? 0 });
          }
        }
        return saves.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      } catch {
        return null;
      }
    },
  };
}
