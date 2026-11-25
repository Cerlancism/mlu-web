// snapshots: Game snapshots, a copy of the whole game state taken in a base or on the pause
// screen, kept in the browser's IndexedDB and resumed from the launcher. See "Snapshots" in
// docs/mlu2/specifications.md.
//
// A snapshot is a record { kind, game, format, name, save, created, where, summary, state }:
// state holds every field of the game state except the page's services and a few page-owned
// fields, in a JSON-safe form (byte maps as base64), so the record is stored and exported as is.
// The database, '<game>-snapshots', has two object stores under the same keys: 'meta' (what the
// launcher lists) and 'data' (the records).

const GAME = 'mlu2';
const KIND = 'mlu-web snapshot';
const FORMAT = 1;
const DB_NAME = `${GAME}-snapshots`;

// Never captured or restored: the page's services, and fields the page keeps for itself (the
// music and sound switches are the player's options; the high-score list belongs to the store).
const SKIP = new Set(['sfx', 'ui', 'store', 'gfx', 'fxLast', 'music', 'sounds', 'highscores',
  'storeBusy', 'loading', 'fieldVersion']);

// ---- When a snapshot may be taken -------------------------------------------------------------

/** Null when a snapshot can be taken now, else why not, in words for the player. */
export function snapshotBlocker(s) {
  if (s.startpage) return 'Start or load a game first.';
  if (s.storeBusy || s.loading) return 'The game is being saved or loaded. Try again in a moment.';
  if (s.end) return 'This game is over.';
  if (!s.menu && !s.status) {
    return 'A snapshot can be taken in a base, or on the pause screen (press M during play).';
  }
  return null;
}

/** The default name: the save's name and the local date and time, to the second. */
export function defaultName(s, date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const when = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
    + ` ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
  return `${s.inputstr || GAME} ${when}`;
}

// ---- Encoding the state -----------------------------------------------------------------------

function toBase64(bytes) {
  const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let bin = '';
  for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode(...u8.subarray(i, i + 8192));
  return btoa(bin);
}

function fromBase64(text) {
  const bin = atob(text);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const isPlain = (v) => v !== null && typeof v === 'object'
  && Object.getPrototypeOf(v) === Object.prototype;

function encode(v) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : { $num: String(v) };
  if (v instanceof Int8Array) return { $i8: toBase64(v) };
  if (Array.isArray(v)) return v.map(encode);
  if (isPlain(v)) {
    const out = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) out[k] = encode(x);
    return out;
  }
  throw new Error(`cannot keep a ${typeof v} in a snapshot`);
}

function decode(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decode);
  if (typeof v.$i8 === 'string' && Object.keys(v).length === 1) return fromBase64(v.$i8);
  if (typeof v.$num === 'string' && Object.keys(v).length === 1) return Number(v.$num);
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (k !== '__proto__') out[k] = decode(x);
  }
  return out;
}

/**
 * Whether a restored value can stand in for the fresh game's value: the same kind, and for byte
 * maps and fixed-size lists the same length, all the way down. A field that is null in a fresh
 * game (an image name, a panel, a mission) takes any value.
 */
function fits(cur, val) {
  if (cur === null || cur === undefined) return true;
  if (cur instanceof Int8Array) return val instanceof Int8Array && val.length === cur.length;
  if (Array.isArray(cur)) {
    if (!Array.isArray(val)) return false;
    if (cur.length === 0) return true; // a list that grows (bullets)
    return val.length === cur.length && cur.every((c, i) => fits(c, val[i]));
  }
  if (typeof cur === 'string') return typeof val === 'string' || val === null;
  if (isPlain(cur)) return isPlain(val);
  return typeof val === typeof cur;
}

/** The game state in a form that JSON and IndexedDB keep exactly. */
export function captureState(s) {
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (!SKIP.has(k) && v !== undefined) out[k] = encode(v);
  }
  return out;
}

/**
 * Puts a captured state into a freshly created game state. Fields the game no longer has are
 * ignored and fields the snapshot lacks keep their fresh value; throws, changing nothing, when a
 * field does not fit.
 */
export function restoreState(s, state) {
  if (!isPlain(state)) throw new Error('the snapshot holds no game');
  const values = [];
  for (const [k, raw] of Object.entries(state)) {
    if (SKIP.has(k) || !Object.prototype.hasOwnProperty.call(s, k)) continue;
    const v = decode(raw);
    if (!fits(s[k], v)) throw new Error(`the snapshot does not fit this game (${k})`);
    values.push([k, v]);
  }
  for (const [k, v] of values) s[k] = v;
}

// ---- Records ----------------------------------------------------------------------------------

/** A snapshot of the game as it is now (snapshotBlocker must be null). */
export function makeSnapshot(s, name = defaultName(s)) {
  const summary = { money: s.money, score: s.score };
  if (typeof s.days === 'number') summary.days = s.days;
  return {
    kind: KIND,
    game: GAME,
    format: FORMAT,
    name,
    save: s.inputstr,
    created: new Date().toISOString(),
    where: s.menu ? 'base' : 'pause',
    summary,
    state: captureState(s),
  };
}

/** A record read from an exported file, checked; throws with the reason when it is not one. */
export function parseSnapshot(text) {
  let r;
  try {
    r = JSON.parse(text);
  } catch {
    throw new Error('not a snapshot file');
  }
  if (!isPlain(r) || r.kind !== KIND) throw new Error('not a snapshot file');
  if (r.game !== GAME) throw new Error(`a snapshot of another game (${String(r.game)})`);
  if (r.format !== FORMAT) throw new Error('a snapshot from another version of this site');
  if (!isPlain(r.state)) throw new Error('the snapshot holds no game');
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const summary = {};
  if (isPlain(r.summary)) {
    for (const k of ['money', 'score', 'days']) {
      if (Number.isFinite(r.summary[k])) summary[k] = r.summary[k];
    }
  }
  const created = Number.isNaN(Date.parse(r.created)) ? new Date().toISOString() : r.created;
  return {
    kind: KIND,
    game: GAME,
    format: FORMAT,
    name: str(r.name, 100).trim() || 'Imported snapshot',
    save: str(r.save, 13),
    created,
    where: r.where === 'base' ? 'base' : 'pause',
    summary,
    state: r.state,
  };
}

/** A record as the text of its exported file. */
export function snapshotText(record) {
  const { id, ...rest } = record;
  return JSON.stringify(rest);
}

// ---- The store --------------------------------------------------------------------------------

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('this browser keeps no IndexedDB storage'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('data')) db.createObjectStore('data');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('could not open the database'));
    req.onblocked = () => reject(new Error('the database is blocked by another tab'));
  });
}

const why = (err) => (err && err.name === 'QuotaExceededError'
  ? 'browser storage is full' : (err && err.message) || 'storage is not available');

/**
 * The snapshot store. Every call is asynchronous; failures reject with an Error whose message
 * says why, in words for the player.
 */
export function createSnapshotStore() {
  let dbPromise = null;
  const db = () => {
    if (!dbPromise) {
      dbPromise = openDb();
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  };
  const run = async (stores, mode, body) => {
    let d;
    try {
      d = await db();
    } catch (err) {
      throw new Error(why(err));
    }
    return new Promise((resolve, reject) => {
      const tx = d.transaction(stores, mode);
      let result;
      body(tx, (v) => { result = v; });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(new Error(why(tx.error)));
      tx.onabort = () => reject(new Error(why(tx.error)));
    });
  };
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const metaOf = (id, r, size) => ({
    id, name: r.name, save: r.save, created: r.created, where: r.where, summary: r.summary, size,
  });

  return {
    /** Every snapshot's list entry, newest first. */
    list: () => run('meta', 'readonly', (tx, done) => {
      const req = tx.objectStore('meta').getAll();
      req.onsuccess = () => done(req.result
        .filter(isPlain)
        .sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0)));
    }),
    /** The record, or null when there is none under that id. */
    get: (id) => run('data', 'readonly', (tx, done) => {
      const req = tx.objectStore('data').get(id);
      req.onsuccess = () => done(isPlain(req.result) ? { ...req.result, id } : null);
    }),
    /** Stores a record under a new id; resolves to its list entry. */
    add(record) {
      const id = newId();
      const meta = metaOf(id, record, snapshotText(record).length);
      return run(['meta', 'data'], 'readwrite', (tx, done) => {
        tx.objectStore('data').put(record, id);
        tx.objectStore('meta').put(meta, id);
        done(meta);
      });
    },
    rename: (id, name) => run(['meta', 'data'], 'readwrite', (tx) => {
      for (const store of ['meta', 'data']) {
        const os = tx.objectStore(store);
        const req = os.get(id);
        req.onsuccess = () => {
          if (isPlain(req.result)) os.put({ ...req.result, name }, id);
        };
      }
    }),
    remove: (id) => run(['meta', 'data'], 'readwrite', (tx) => {
      tx.objectStore('meta').delete(id);
      tx.objectStore('data').delete(id);
    }),
  };
}
