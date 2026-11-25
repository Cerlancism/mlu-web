// The save format, its checksum, and rebuilding a game from a save.
// See "Saved games" in docs/mlu1/specifications.md.

import { MAP_W, BONUS_STEPS, RADIATOR_COST, upgradeAmount } from './data.js';
import { int32, int8, jround } from './jmath.js';
import { applyCheat, redraw } from './world.js';
import { loadImages, loadImages2, loadHull, loadDrill, loadGameTiles } from './sprites.js';

const ROWS = 3000;
const EOL = '\r\n';

// The numbers after the map, in file order. 'explorer' is written as 1 or 0.
const FIELDS = ['money', 'fuel', 'battery', 'drill', 'hull', 'engine', 'fueltank', 'cargobay',
  'radiator', 'hullx', 'biox', 'drillx', 'batx', 'dyn', 'tnt', 'tel1', 'tel2', 'drillfix',
  'hullfix', 'tractor', 'coalb', 'petrolr', 'jet', 'gasb', 'nuc', 'nucx', 'score', 'transy',
  'sonb', 'iceb', 'time', 'explorer', 'mith', 'unob', 'adam'];
const ROUNDED = new Set(['fuel', 'battery', 'drill']);

/** The text the erased-save marker holds. */
export const ERASED = ':(';

/** Writes the game as save text, in the original's format. */
export function serialise(s) {
  const out = [];
  let sum = int32(33 * s.level);
  out.push(String(s.level));
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < MAP_W; x++) {
      const v = s.map[x][y];
      sum = int32(sum + v);
      line += String.fromCharCode(v + 33);
    }
    out.push(line);
  }
  for (const f of FIELDS) {
    let v;
    if (f === 'explorer') v = s.explorer ? 1 : 0;
    else if (ROUNDED.has(f)) v = jround(s[f]);
    else v = s[f];
    out.push(String(v));
    sum = int32(sum + v);
  }
  out.push(String(sum));
  return out.join(EOL) + EOL;
}

// Java's Integer.parseInt: optional sign and decimal digits only, within the int range.
function parseInt32(line) {
  if (line == null || !/^[+-]?\d+$/.test(line)) throw new Error('bad number');
  const n = Number(line);
  if (n > 2147483647 || n < -2147483648) throw new Error('number out of range');
  return n;
}

/**
 * Reads save text into the game and starts play. Returns false (and changes nothing) when the
 * text is not a readable save. A save whose checksum does not match still loads, but ends at
 * once with a message, and the stored save is erased, as in the original.
 */
export function loadSave(s, text) {
  const lines = text.split(/\r\n|\r|\n/);
  let data;
  try {
    data = parse(lines);
  } catch {
    // Fix: the original stopped half-way through such a file, or silently did nothing
    // (see docs/mlu1/fixes.md).
    return false;
  }
  apply(s, data);
  return true;
}

function parse(lines) {
  const map = Array.from({ length: MAP_W }, () => new Int8Array(ROWS));
  let sum = 0;
  let level;
  let row = 0;
  let li = 0;
  const first = lines[li++];
  if (first == null || first.length === 0) throw new Error('empty');
  if (first[0] === '1' || first[0] === '2' || first[0] === '3') {
    level = first.charCodeAt(0) - 48;
    sum += 33 * level;
  } else {
    // Older saves have no level line and start with the first map row; they play at level 3.
    level = 0;
    li--;
  }
  for (; row < ROWS; row++) {
    const line = lines[li++];
    if (line == null || line.length < MAP_W) throw new Error('short map row');
    for (let x = 0; x < MAP_W; x++) {
      const v = line.charCodeAt(x) - 33;
      map[x][row] = int8(v);
      sum = int32(sum + v);
    }
  }
  const values = {};
  for (const f of FIELDS) {
    const v = parseInt32(lines[li++]);
    values[f] = v;
    sum = int32(sum + v);
  }
  const check = parseInt32(lines[li++]);
  return { level, map, values, intact: sum === check };
}

function apply(s, { level, map, values, intact }) {
  if (level === 0) {
    s.level = 3;
  } else {
    s.level = level;
    s.money_factor = [0, 15, 12, 10][level];
    s.score_factor = [0, 5, 7, 10][level];
  }
  for (let x = 0; x < MAP_W; x++) s.map[x].set(map[x], 0);
  for (const f of FIELDS) if (f !== 'explorer') s[f] = values[f];
  const explorer = values.explorer;
  if (!intact) {
    s.msg = true;
    s.msgstr = 'Save file has been modified. All data has been erased.';
    s.store.write(s.inputstr, ERASED);
  }

  applyCheat(s);
  s.engmax = upgradeAmount(s.engine - 1);
  s.fuelmax = upgradeAmount(6 + s.fueltank);
  s.cargomax = upgradeAmount(13 + s.cargobay);
  s.tempmax = upgradeAmount(20 + s.radiator);
  s.hullmax = upgradeAmount(27 + s.hullx);
  s.biomax = upgradeAmount(34 + s.biox);
  s.drillmax = upgradeAmount(41 + s.drillx);
  s.batmax = upgradeAmount(48 + s.batx);
  owned(s, 0, s.engine, () => { s.engmax = 3000; });
  owned(s, 1, s.fueltank, () => { s.fuelmax = 6000; });
  owned(s, 2, s.cargobay, () => { s.cargomax = 15000; });
  owned(s, 4, s.hullx, () => { s.hullmax = 2000; });
  owned(s, 3, s.radiator, () => { s.tempmax = 1200; });
  for (let t = 0; t < s.biox; t++) s.upgrades[5][t] = true;
  for (let t = 0; t < s.drillx; t++) s.upgrades[6][t] = true;
  for (let t = 0; t < s.batx; t++) s.upgrades[7][t] = true;
  if (s.radiator >= 1 && s.radiator <= 8) s.radf = RADIATOR_COST[s.radiator];

  // The next bonus is the first step above the loaded score; past the last step there is none.
  // Fix: the original had one step ten times too high, and past the last step kept its start
  // value, both of which paid a bonus on every tick (see docs/mlu1/fixes.md).
  s.bonus = 0;
  for (const step of BONUS_STEPS) {
    if (s.score < step * s.score_factor) {
      s.bonus = step * s.score_factor;
      break;
    }
  }

  loadImages(s);
  loadHull(s);
  loadDrill(s);
  if (explorer === 1) {
    s.explorer = true;
    loadImages2(s);
    s.cargomax = 20000;
    s.fuelmax = 6000;
    s.engmax = 5000;
    s.hullmax = 10000;
  } else {
    s.explorer = false;
  }
  s.menu = false;
  s.startpage = false;
  loadGameTiles(s);
  redraw(s);
  if (s.music) {
    s.theme = 'duke_nukem2.mid';
    s.sfx.musicLoop(s.theme);
  }
}

// Marks the owned tiers of a category; level 8 is a Mega part and owns the whole column.
function owned(s, cat, level, mega) {
  if (level === 8) {
    mega();
    for (let t = 0; t < 7; t++) s.upgrades[cat][t] = true;
  } else {
    for (let t = 0; t < level; t++) s.upgrades[cat][t] = true;
  }
}
