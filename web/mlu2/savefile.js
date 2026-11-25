// savefile: The save format: the map as text, the property list with its substitution cipher and
// checksum, applying the session's cheat, and rebuilding a game after loading.
// Specification: docs/mlu2/specifications.md, Saved games (13), Cheat codes (14).
//
// A save file is, line by line: "mlu 2", the level, the 100 map rows (5000 columns each) as one
// character per cell (value + 33), wrapped every 80 characters into 6250 lines, then the property
// list "money:..,fuel:..,...,checksum:.." passed through encryptString and wrapped into lines of
// 79 then 80 characters. Java's PrintStream.println ends every line with the platform line
// separator; the game shipped as a Windows build, so lines end with "\r\n".
// Reading accepts "\r\n", "\n" or "\r", as Java's BufferedReader.readLine does.

import { MAGMA, SPACE, HILLX } from './data.js';
import { idiv, toInt, jround, int32, random } from './jmath.js';
import { getUpgradeAmount2 } from './stats.js';
import { setWeight, loadSurface, redraw } from './world.js';
import { loadGameTiles, loadImages, loadHull, loadDrill } from './sprites.js';

const EOL = '\r\n';

/** What the save holds after the victory, so that it can no longer be loaded. */
export const FINISHED = 'Mission complete! Please, play again.' + EOL;

// Java's String.charAt: throws when the index is out of range (JS would give NaN or '').
function charAt(str, i) {
  if (i < 0 || i >= str.length) throw new Error('StringIndexOutOfBoundsException: ' + i);
  return str.charCodeAt(i);
}

// Java's (char) cast of an int, then appended to a string.
function jchar(n) {
  return String.fromCharCode(n & 0xffff);
}

// Java's Integer.parseInt: optional sign, then decimal digits, within the int range.
function parseInt32(str) {
  if (!/^[+-]?\d+$/.test(str)) throw new Error('NumberFormatException: "' + str + '"');
  const n = Number(str);
  if (n > 2147483647 || n < -2147483648) throw new Error('NumberFormatException: "' + str + '"');
  return n;
}

// Java's BufferedReader.readLine over the whole text: a line ends at "\r\n", "\n" or "\r", and
// a terminator at the very end does not start another (empty) line. Returns null past the end.
function makeReader(text) {
  const lines = text.split(/\r\n|\n|\r/);
  if (lines[lines.length - 1] === '') lines.pop();
  let at = 0;
  return () => (at < lines.length ? lines[at++] : null);
}

/** Builds the text gameSave writes to the save file. gameSave changes no game state. */
export function gameSave(s) {
  let cnt = 0;
  let out = '';
  out += 'mlu 2' + EOL;
  out += String(s.level) + EOL;
  cnt = int32(cnt + 33 * s.level);
  let linecnt = 0;

  const parts = [];
  for (let j = 0; j < 100; j++) {
    for (let i = 0; i < 5000; i++) {
      const num = s.map[i][j] + 33;
      cnt = int32(cnt + (num - 33));
      parts.push(jchar(num));
      if (++linecnt === 80) {
        linecnt = 0;
        parts.push(EOL);
      }
    }
  }
  out += parts.join('');

  const tf = (b) => (b ? 'T' : 'F');
  let str = 'money:' + s.money
    + ',fuel:' + toInt(s.fuel)
    + ',battery:' + toInt(s.battery)
    + ',drill:' + toInt(s.drill)
    + ',hull:' + s.hull
    + ',engine:' + s.engine
    + ',fueltank:' + s.fueltank
    + ',cargobay:' + s.cargobay
    + ',radiator:' + s.radiator
    + ',hullx:' + s.hullx
    + ',biox:' + s.biox
    + ',drillx:' + s.drillx
    + ',batx:' + s.batx
    + ',dyn:' + s.dyn
    + ',tnt:' + s.tnt
    + ',tel1:' + s.tel1
    + ',tel2:' + s.tel2
    + ',drillfix:' + s.drillfix
    + ',hullfix:' + s.hullfix
    + ',iceconverter:' + tf(s.iceconverter)
    + ',nanobots:' + tf(s.nanobots)
    + ',scannon:' + tf(s.scannon)
    + ',extractor:' + tf(s.extractor)
    + ',converter:' + tf(s.converter)
    + ',cannon:' + tf(s.cannon)
    + ',tractor:' + s.tractor
    + ',coalb:' + s.coalb
    + ',petrolr:' + s.petrolr
    + ',jet:' + s.jet
    + ',gasb:' + s.gasb
    + ',nuc:' + s.nuc
    + ',nucx:' + s.nucx
    + ',score:' + s.score
    + ',transc:' + s.transc
    + ',sonb:' + s.sonb
    + ',iceb:' + s.iceb
    + ',time:' + s.time
    + ',shield:' + s.shield
    + ',radb:' + s.radb
    + ',xhours:' + s.xhours
    + ',xminutes:' + s.xminutes
    + ',days:' + s.days
    + ',saves:' + s.saves
    + ',xmax:' + s.xmax
    + ',baseidx:' + s.baseidx
    + ',gameid:' + s.gameid
    + ',nux:' + s.nux
    + ',base4day:' + s.base4day
    + ',heater:' + s.heater
    + ',mtrans:' + s.mtrans
    + ',echarger:' + s.echarger;

  // The checksum terms, in Java's order; the int sum wraps at 32 bits.
  const terms = [
    s.money, toInt(s.fuel), toInt(s.battery), toInt(s.drill), s.hull, s.engine, s.fueltank,
    s.cargobay, s.radiator, s.hullx, s.biox, s.drillx, s.batx, s.dyn, s.tnt, s.tel1, s.tel2,
    s.drillfix, s.hullfix, s.tractor, s.coalb, s.petrolr, s.jet, s.gasb, s.nuc, s.nucx, s.score,
    s.transc, s.sonb, s.iceb, s.time, s.radb, s.shield, s.xminutes, s.xhours, s.days, s.saves,
    s.xmax, s.iceconverter ? 1 : 0, s.nanobots ? 1 : 0, s.scannon ? 1 : 0, s.extractor ? 1 : 0,
    s.converter ? 1 : 0, s.cannon ? 1 : 0, s.baseidx, s.gameid % 1000000, s.nux, s.base4day,
    s.heater, s.mtrans, s.echarger,
  ];
  let sum = 0;
  for (const t of terms) sum = int32(sum + t);
  cnt = int32(cnt + sum);
  str = str + ',checksum:' + cnt;

  // Quirk: the first encrypted line holds 79 characters, the rest 80.
  let begin = 0;
  for (let ix = 0; ix <= str.length; ix++) {
    if (ix % 80 === 79 || ix === str.length) {
      out += encryptString(str.substring(begin, ix)) + EOL;
      begin = ix;
    }
  }
  return out;
}

/**
 * Loads a save from its text (null when the file does not exist) and starts play, as Java's
 * loadMap does after opening the file. Returns false when the text cannot be read; the game is
 * then left with the error message and saving disabled, as in Java (a missing file goes the same
 * way, since Java caught FileNotFoundException in the same handler).
 */
export function loadMap(s, text) {
  try {
    if (text == null) throw new Error('FileNotFoundException');
    let cntr = 0;
    let cnt = 0;
    const readLine = makeReader(text);
    let str = readLine();
    str = readLine();
    if (str == null) throw new Error('NullPointerException');
    if (charAt(str, 0) === 49) { // '1'
      s.level = 1;
      cnt += 33;
      s.money_factor = 15;
      s.score_factor = 5;
    } else if (charAt(str, 0) === 50) { // '2'
      s.level = 2;
      cnt += 66;
      s.money_factor = 12;
      s.score_factor = 7;
    } else if (charAt(str, 0) === 51) { // '3'
      s.level = 3;
      cnt += 99;
      s.money_factor = 10;
      s.score_factor = 10;
    }

    let cnti = 0;
    let cntj = 0;
    for (let j = 0; j < 6250; j++) {
      str = readLine();
      if (str == null) throw new Error('NullPointerException');
      for (let i = 0; i < 80; i++) {
        const c = charAt(str, i) - 33;
        s.map[cnti][cntj] = c; // Int8Array store: Java's (byte) cast
        cnt = int32(cnt + c);
        if (++cnti === 5000) {
          cnti = 0;
          cntj++;
        }
      }
    }

    for (let ix = 0; ix < 5000; ix++) {
      if (s.map[ix][5] === SPACE) {
        s.map[ix][5] = 0;
        s.mapmode[ix][5] = toInt(random() * 6.0);
      }
      if (s.map[ix][6] === SPACE) {
        s.map[ix][6] = 0;
        s.mapmode[ix][6] = toInt(random() * 6.0);
      }
    }

    let line = '';
    while ((str = readLine()) !== null) line = line + str;
    line = ',' + decryptString(line);

    s.money = getPropertyInt(line, 'money', s.money);
    cnt = int32(cnt + s.money);
    s.fuel = getPropertyInt(line, 'fuel', s.fuel);
    cnt = toInt(cnt + s.fuel); // a double sum cast back to int: saturates rather than wraps
    s.battery = getPropertyInt(line, 'battery', s.battery);
    cnt = toInt(cnt + s.battery);
    s.drill = getPropertyInt(line, 'drill', s.drill);
    cnt = toInt(cnt + s.drill);
    s.hull = getPropertyInt(line, 'hull', s.hull);
    cnt = int32(cnt + s.hull);
    s.engine = getPropertyInt(line, 'engine', s.engine);
    cnt = int32(cnt + s.engine);
    s.fueltank = getPropertyInt(line, 'fueltank', s.fueltank);
    cnt = int32(cnt + s.fueltank);
    s.cargobay = getPropertyInt(line, 'cargobay', s.cargobay);
    cnt = int32(cnt + s.cargobay);
    s.radiator = getPropertyInt(line, 'radiator', s.radiator);
    cnt = int32(cnt + s.radiator);
    s.hullx = getPropertyInt(line, 'hullx', s.hullx);
    cnt = int32(cnt + s.hullx);
    s.biox = getPropertyInt(line, 'biox', s.biox);
    cnt = int32(cnt + s.biox);
    s.drillx = getPropertyInt(line, 'drillx', s.drillx);
    cnt = int32(cnt + s.drillx);
    s.batx = getPropertyInt(line, 'batx', s.batx);
    cnt = int32(cnt + s.batx);
    s.dyn = getPropertyInt(line, 'dyn', s.dyn);
    cnt = int32(cnt + s.dyn);
    s.tnt = getPropertyInt(line, 'tnt', s.tnt);
    cnt = int32(cnt + s.tnt);
    s.tel1 = getPropertyInt(line, 'tel1', s.tel1);
    cnt = int32(cnt + s.tel1);
    s.tel2 = getPropertyInt(line, 'tel2', s.tel2);
    cnt = int32(cnt + s.tel2);
    s.drillfix = getPropertyInt(line, 'drillfix', s.drillfix);
    cnt = int32(cnt + s.drillfix);
    s.hullfix = getPropertyInt(line, 'hullfix', s.hullfix);
    cnt = int32(cnt + s.hullfix);
    s.tractor = getPropertyInt(line, 'tractor', s.tractor);
    cnt = int32(cnt + s.tractor);
    s.coalb = getPropertyInt(line, 'coalb', s.coalb);
    cnt = int32(cnt + s.coalb);
    s.petrolr = getPropertyInt(line, 'petrolr', s.petrolr);
    cnt = int32(cnt + s.petrolr);
    s.jet = getPropertyInt(line, 'jet', s.jet);
    cnt = int32(cnt + s.jet);
    s.gasb = getPropertyInt(line, 'gasb', s.gasb);
    cnt = int32(cnt + s.gasb);
    s.nuc = getPropertyInt(line, 'nuc', s.nuc);
    cnt = int32(cnt + s.nuc);
    s.nucx = getPropertyInt(line, 'nucx', s.nucx);
    cnt = int32(cnt + s.nucx);
    s.score = getPropertyInt(line, 'score', s.score);
    cnt = int32(cnt + s.score);
    s.transc = getPropertyInt(line, 'transc', s.transc);
    cnt = int32(cnt + s.transc);
    s.sonb = getPropertyInt(line, 'sonb', s.sonb);
    cnt = int32(cnt + s.sonb);
    s.iceb = getPropertyInt(line, 'iceb', s.iceb);
    cnt = int32(cnt + s.iceb);
    s.time = getPropertyInt(line, 'time', s.time);
    cnt = int32(cnt + s.time);
    s.shield = getPropertyInt(line, 'shield', s.shield);
    cnt = int32(cnt + s.shield);
    s.radb = getPropertyInt(line, 'radb', s.radb);
    cnt = int32(cnt + s.radb);
    s.xhours = getPropertyInt(line, 'xhours', s.xhours);
    cnt = int32(cnt + s.xhours);
    s.xminutes = getPropertyInt(line, 'xminutes', s.xminutes);
    cnt = int32(cnt + s.xminutes);
    s.days = getPropertyInt(line, 'days', s.days);
    cnt = int32(cnt + s.days);
    s.saves = getPropertyInt(line, 'saves', s.saves);
    cnt = int32(cnt + s.saves);
    s.xmax = getPropertyInt(line, 'xmax', s.xmax);
    cnt = int32(cnt + s.xmax);
    s.baseidx = getPropertyInt(line, 'baseidx', s.baseidx);
    cnt = int32(cnt + s.baseidx);
    s.gameid = getPropertyInt(line, 'gameid', s.gameid);
    cnt = int32(cnt + s.gameid % 1000000);
    s.nux = getPropertyInt(line, 'nux', s.nux);
    cnt = int32(cnt + s.nux);
    s.base4day = getPropertyInt(line, 'base4day', s.base4day);
    cnt = int32(cnt + s.base4day);
    s.heater = getPropertyInt(line, 'heater', s.heater);
    cnt = int32(cnt + s.heater);
    s.mtrans = getPropertyInt(line, 'mtrans', s.mtrans);
    cnt = int32(cnt + s.mtrans);
    s.echarger = getPropertyInt(line, 'echarger', s.echarger);
    cnt = int32(cnt + s.echarger);
    cntr = getPropertyInt(line, 'checksum', cntr);
    s.cannon = getPropertyBool(line, 'cannon', s.cannon);
    cnt = int32(cnt + (s.cannon ? 1 : 0));
    s.converter = getPropertyBool(line, 'converter', s.converter);
    cnt = int32(cnt + (s.converter ? 1 : 0));
    s.extractor = getPropertyBool(line, 'extractor', s.extractor);
    cnt = int32(cnt + (s.extractor ? 1 : 0));
    s.scannon = getPropertyBool(line, 'scannon', s.scannon);
    cnt = int32(cnt + (s.scannon ? 1 : 0));
    s.nanobots = getPropertyBool(line, 'nanobots', s.nanobots);
    cnt = int32(cnt + (s.nanobots ? 1 : 0));
    s.iceconverter = getPropertyBool(line, 'iceconverter', s.iceconverter);
    cnt = int32(cnt + (s.iceconverter ? 1 : 0));
    s.newbar = false;
    if (s.cannon && s.converter && s.extractor && s.nanobots && s.iceconverter) {
      s.newbar = true;
    }

    // Java's array bounds check: a base index out of range is a load error.
    if (s.baseidx < 0 || s.baseidx >= s.basex.length) {
      throw new Error('ArrayIndexOutOfBoundsException: ' + s.baseidx);
    }
    s.posx = s.basex[s.baseidx] + 3;
    if (cnt !== cntr) {
      s.saveok = false;
      s.msg = true;
      s.msgstr = 'Save file has been modified! Game session terminated.';
      s.msgtimr = -50;
    }
  } catch (e) {
    s.saveok = false;
    s.msgtimr = -50;
    s.transc = 15;
    s.msg = true;
    s.msgstr = 'Error loading data! Game session terminated.';
    return false;
  }

  loadCheat(s);
  s.engmax = getUpgradeAmount2(s.engine - 1);
  s.fuelmax = getUpgradeAmount2(6 + s.fueltank);
  s.cargomax = getUpgradeAmount2(13 + s.cargobay);
  s.tempmax = getUpgradeAmount2(20 + s.radiator);
  s.hullmax = getUpgradeAmount2(27 + s.hullx);
  s.biomax = getUpgradeAmount2(34 + s.biox);
  s.drillmax = getUpgradeAmount2(41 + s.drillx);
  s.batmax = getUpgradeAmount2(48 + s.batx);
  if (s.engine === 8) {
    s.engmax = 3000;
    for (let ix = 0; ix < 7; ix++) s.upgrades[0][ix] = true;
  } else {
    for (let ix = 0; ix < s.engine; ix++) s.upgrades[0][ix] = true;
  }

  if (s.fueltank === 8) {
    s.fuelmax = 6000;
    for (let ix = 0; ix < 7; ix++) s.upgrades[1][ix] = true;
  } else {
    for (let ix = 0; ix < s.fueltank; ix++) s.upgrades[1][ix] = true;
  }

  if (s.cargobay === 8) {
    s.cargomax = 15000;
    for (let ix = 0; ix < 7; ix++) s.upgrades[2][ix] = true;
  } else {
    for (let ix = 0; ix < s.cargobay; ix++) s.upgrades[2][ix] = true;
  }

  if (s.hullx === 8) {
    s.hullmax = 2000;
    for (let ix = 0; ix < 7; ix++) s.upgrades[4][ix] = true;
  } else {
    for (let ix = 0; ix < s.hullx; ix++) s.upgrades[4][ix] = true;
  }

  if (s.radiator === 8) {
    s.tempmax = 1200;
    for (let ix = 0; ix < 7; ix++) s.upgrades[3][ix] = true;
  } else {
    for (let ix = 0; ix < s.radiator; ix++) s.upgrades[3][ix] = true;
  }

  for (let ix = 0; ix < s.biox; ix++) s.upgrades[5][ix] = true;
  for (let ix = 0; ix < s.drillx; ix++) s.upgrades[6][ix] = true;
  for (let ix = 0; ix < s.batx; ix++) s.upgrades[7][ix] = true;

  if (s.radiator === 1) {
    s.radf = 0.001;
  } else if (s.radiator === 2) {
    s.radf = 0.002;
  } else if (s.radiator === 3) {
    s.radf = 0.003;
  } else if (s.radiator === 4) {
    s.radf = 0.006;
  } else if (s.radiator === 5) {
    s.radf = 0.01;
  } else if (s.radiator === 6) {
    s.radf = 0.02;
  } else if (s.radiator === 7) {
    s.radf = 0.03;
  } else if (s.radiator === 8) {
    s.radf = 0.06;
  }

  if (s.heater === 1) {
    s.tempmin = -150;
  } else if (s.heater === 2) {
    s.tempmin = -225;
  } else if (s.heater === 3) {
    s.tempmin = -300;
  } else if (s.heater === 4) {
    s.tempmin = -375;
  } else if (s.heater === 5) {
    s.tempmin = -425;
  }

  s.heatf = 0.005 * s.heater;
  const f = s.score_factor;
  if (s.score < 100 * f) {
    s.bonus = 100 * f;
  } else if (s.score < 500 * f) {
    s.bonus = 500 * f;
  } else if (s.score < 2000 * f) {
    s.bonus = 2000 * f;
  } else if (s.score < 10000 * f) {
    s.bonus = 10000 * f;
  } else if (s.score < 100000 * f) {
    s.bonus = 100000 * f;
  } else if (s.score < 300000 * f) {
    s.bonus = 300000 * f;
  } else if (s.score < 1000000 * f) {
    s.bonus = 1000000 * f;
  } else if (s.score < 2500000 * f) {
    // Fix: the step on the ladder is 2,500,000; the original's 25,000,000 made the bonus pay on
    // every tick once passed (see docs/mlu2/fixes.md).
    s.bonus = 2500000 * f;
  } else if (s.score < 10000000 * f) {
    s.bonus = 10000000 * f;
  } else if (s.score < 20000000 * f) {
    s.bonus = 20000000 * f;
  } else {
    // Fix: any higher score waits for the top step, 200,000,000, as in play. The original set
    // 100,000,000, which is not a step, for scores below it and left the starting 1,000 for
    // scores above it; either way the bonus then paid on every tick.
    s.bonus = 200000000 * f;
  }

  for (let ix = 0; ix < 5000; ix++) {
    for (let j = 0; j < 100; j++) {
      const m = s.map[ix][j];
      if (m === 33) {
        s.mapmode[ix][j] = 5;
      } else if (m < 70) {
        s.mapmode[ix][j] = toInt(random() * 6.0);
      } else if (m >= 71 && m <= 74) {
        s.mapmode[ix][j] = HILLX;
      } else if (m >= 75 && m <= 79) {
        s.mapmode[ix][j] = MAGMA;
      }
    }
  }

  for (let ix = 0; ix < 5000; ix++) {
    if (s.map[ix][99] === 75) {
      s.map[ix][100] = 75;
      s.map[ix][101] = 75;
      s.mapmode[ix][100] = MAGMA;
      s.mapmode[ix][101] = MAGMA;
    }
  }

  setWeight(s);
  s.menu = false;
  s.startpage = false;
  loadGameTiles(s);
  s.minutes = s.xminutes;
  s.hours = s.xhours;
  if (s.xmax >= 3005) s.baseok[0] = false;
  if (s.xmax >= 3990) s.baseok[1] = false;
  if (s.xmax >= 4600) s.baseok[2] = false;
  if (s.base4day > 0 && s.base4day + 2 < s.days) s.baseok[3] = false;

  s.cargo = idiv(s.nux, 5);
  if (s.music) {
    s.sfx.musicStop();
    s.sfx.musicLoop('game_theme.mid');
  }

  if (s.sounds) {
    s.is_wind = true;
    s.sfx.loop('wind');
  }

  s.mode = 1;
  s.iposx = jround(s.posx);
  s.framex = idiv(s.iposx, 3) * 3 - 3;
  s.digx = (s.iposx - s.framex) * 50 - 10;
  s.digy = (s.iposy - s.framey) * 50 + 50;
  loadSurface(s);

  for (let ixx = 1000; ixx < 1250; ixx++) {
    s.map[ixx][5] = 77;
    s.mapmode[ixx][5] = MAGMA;
  }

  for (let ixx = 1250; ixx < 1500; ixx++) {
    s.map[ixx][5] = 78;
    s.mapmode[ixx][5] = MAGMA;
  }

  for (let ixx = 1550; ixx < 2010; ixx++) {
    if (s.map[ixx][6] === 75) {
      s.map[ixx][5] = 75;
      s.mapmode[ixx][5] = MAGMA;
    }
  }

  // The columns around each standing base, where digging is not allowed.
  let indx = 0;
  const nodig2 = new Array(30).fill(0);
  for (let bs = 0; bs < s.basex.length; bs++) {
    if (s.baseok[bs]) {
      for (let ixxx = s.basex[bs] - 1; ixxx < s.basex[bs] + 4; ixxx++) {
        if (ixxx >= 0 && ixxx < 5000) {
          nodig2[indx] = ixxx;
          indx++;
        }
      }
    }
  }

  s.nodig = nodig2;
  s.transporter = null;
  loadImages(s);
  loadHull(s);
  loadDrill(s);
  redraw(s);
  return true;
}

/**
 * The integer after "<name>:" in the property list, or def (cast to int) when the name is
 * absent. Throws on a malformed number, as Java's Integer.parseInt does.
 */
export function getPropertyInt(text, str, def) {
  const pos = text.indexOf(',' + str);
  let colon = -1;
  let comma = text.length;
  if (pos === -1) return toInt(def);
  for (let i = pos; i < text.length; i++) {
    if (charAt(text, i) === 58) { // ':'
      colon = i;
      break;
    }
  }
  for (let ix = colon; ix < text.length; ix++) {
    if (charAt(text, ix) === 44) { // ','
      comma = ix;
      break;
    }
  }
  return parseInt32(text.substring(colon + 1, comma));
}

/** Whether the value after "<name>:" in the property list is "T", or def when absent. */
export function getPropertyBool(text, str, def) {
  const pos = text.indexOf(',' + str);
  let colon = -1;
  let comma = text.length;
  if (pos === -1) return def;
  for (let i = pos; i < text.length; i++) {
    if (charAt(text, i) === 58) {
      colon = i;
      break;
    }
  }
  for (let ix = colon; ix < text.length; ix++) {
    if (charAt(text, ix) === 44) {
      comma = ix;
      break;
    }
  }
  return text.substring(colon + 1, comma) === 'T';
}

/** Applies the session's cheat (s.cheat, 1-10) to the loaded or new game. */
export function loadCheat(s) {
  if (s.cheat === 1) {
    s.money = 1000000;
  } else if (s.cheat === 2) {
    s.engine = 7;
    s.engmax = 1500;
  } else if (s.cheat === 3) {
    s.fueltank = 7;
    s.fuelmax = getUpgradeAmount2(6 + s.fueltank);
    s.fuel = s.fuelmax;
  } else if (s.cheat === 4) {
    s.cargobay = 7;
    s.cargomax = 6000;
  } else if (s.cheat === 5) {
    s.radiator = 7;
    s.tempmax = 600;
    s.radf = 0.03;
  } else if (s.cheat === 6) {
    s.hullx = 7;
    s.hullmax = 1000;
  } else if (s.cheat === 7) {
    s.biox = 7;
    s.biomax = 60000;
  } else if (s.cheat === 8) {
    s.drillx = 7;
    s.drillmax = getUpgradeAmount2(41 + s.drillx);
    s.drill = s.drillmax;
  } else if (s.cheat === 9) {
    s.batx = 7;
    s.batmax = 10000;
  } else if (s.cheat === 10) {
    s.saves = 1000;
  }
}

// ---- Encryptor: the static helpers of the original's Encryptor class. ----

const nums = [
  39, 94, 68, 65, 69, 61, 72, 83, 25, 43, 20, 40, 2, 76, 80, 8, 22, 36, 56, 41, 42, 35, 62, 79,
  3, 5, 34, 23, 70, 28, 52, 37, 84, 48, 30, 93, 90, 7, 64, 21, 38, 57, 9, 13, 89, 73, 66, 44, 58,
  4, 81, 54, 15, 32, 49, 16, 29, 71, 19, 53, 17, 85, 45, 26, 74, 0, 18, 14, 78, 67, 55, 51, 12,
  87, 86, 60, 46, 77, 6, 10, 11, 47, 31, 1, 75, 24, 95, 33, 91, 88, 92, 82, 27, 59, 50, 63,
];

/** The last `digits` (1-5) base-93 digits of n, each as a character from '!'. */
export function encrypt(n, digits) {
  let str = '';
  const d6 = idiv(n, 74805201);
  const r10 = n % 74805201;
  const d5 = idiv(r10, 804357);
  const r9 = r10 % 804357;
  const d4 = idiv(r9, 8649);
  const r8 = r9 % 8649;
  const d3 = idiv(r8, 93);
  const d7 = r8 % 93;
  str = str + jchar(33 + d6) + jchar(33 + d5) + jchar(33 + d4) + jchar(33 + d3) + jchar(33 + d7);
  return str.substring(5 - digits, 5);
}

/** Reads a number written by encrypt with the given digit count; int arithmetic wraps. */
export function decrypt(str, digits) {
  try {
    if (digits === 5) {
      let v = Math.imul(charAt(str, 0) - 33, 74805201);
      v = int32(v + Math.imul(charAt(str, 1) - 33, 804357));
      v = int32(v + Math.imul(charAt(str, 2) - 33, 8649));
      v = int32(v + Math.imul(charAt(str, 3) - 33, 93));
      return int32(v + (charAt(str, 4) - 33));
    }
    if (digits === 4) {
      // Quirk: the last digit subtracts 161 instead of 33, so 4 digits do not round-trip.
      let v = Math.imul(charAt(str, 0) - 33, 804357);
      v = int32(v + Math.imul(charAt(str, 1) - 33, 8649));
      v = int32(v + Math.imul(charAt(str, 2) - 33, 93));
      return int32(v + (charAt(str, 3) - 161));
    }
    if (digits === 3) {
      return int32((charAt(str, 0) - 33) * 8649 + (charAt(str, 1) - 33) * 93
        + (charAt(str, 2) - 33));
    }
    if (digits === 2) {
      return (charAt(str, 0) - 33) * 93 + (charAt(str, 1) - 33);
    }
  } catch (e) {
    // Java printed the stack trace and fell through.
  }
  return charAt(str, 0) - 33;
}

/** Packs seven 0/1 flags into two encrypt digits. */
export function encryptBool(flags) {
  const n = flags[0] * 1 + flags[1] * 2 + flags[2] * 4 + flags[3] * 8 + flags[4] * 16
    + flags[5] * 32 + flags[6] * 64;
  return encrypt(n, 2);
}

/** Unpacks two encrypt digits into seven flags, written into `flags`. */
export function decryptBool(str, flags) {
  const n = decrypt(str, 2);
  const r = new Array(7).fill(0);
  flags[6] = idiv(n, 64);
  r[6] = n % 64;
  flags[5] = idiv(r[6], 32);
  r[5] = r[6] % 32;
  flags[4] = idiv(r[5], 16);
  r[4] = r[5] % 16;
  flags[3] = idiv(r[4], 8);
  r[3] = r[4] % 8;
  flags[2] = idiv(r[3], 4);
  r[2] = r[3] % 4;
  flags[1] = idiv(r[2], 2);
  r[1] = r[2] % 2;
  flags[0] = idiv(r[1], 1);
}

/** The substitution cipher of the save's property list (printable ASCII to printable ASCII). */
export function encryptString(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i) - 32;
    // Java's array bounds check: only characters ' ' to DEL have a substitute.
    if (k < 0 || k >= nums.length) throw new Error('ArrayIndexOutOfBoundsException: ' + k);
    out = out + jchar(nums[k] + 32);
  }
  return out;
}

/** Reverses encryptString; characters with no substitute are dropped. */
export function decryptString(str) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    for (let k = 0; k < 96; k++) {
      if (str.charCodeAt(i) - 32 === nums[k]) {
        out = out + jchar(k + 32);
        break;
      }
    }
  }
  return out;
}

/** The text as a quoted Java string literal, split every 80 characters (a developer helper). */
export function stringPrint(str) {
  let out = '"';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' || str[i] === '\\') out = out + '\\';
    out = out + str[i];
    if (i % 80 === 79) out = out + '"+\n"';
  }
  return out + '"';
}
