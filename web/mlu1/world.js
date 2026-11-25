// The map: generation, camera, magma flow, earthquakes, teleports, explosives, background colour
// and cheats. See "World" in docs/mlu1/specifications.md.

import { MAP_W, MAGMA, EMPTY, MARBLE, SHM, RCK, LEVELS } from './data.js';
import { idiv, jround, rand, random } from './jmath.js';
import { loadImages, loadGameTiles, loadHull, loadDrill } from './sprites.js';
import { upgradeAmount } from './data.js'; // capacities for cheats

/**
 * The original kept a picture of the visible map and redrew it at these points. The web
 * version draws the map from the state on every frame, so there is nothing to do here; the
 * calls mark where the original refreshed it.
 */
export function redraw(_s) {}

/** The background (earth) colour for the current depth. */
export function backColor(s) {
  const y = s.iposy;
  if (y < 500) {
    s.back_color = [jround(-0.21 * y + 145), jround(-0.174 * y + 120), jround(-0.128 * y + 87)];
  } else if (y < 1200) {
    s.back_color = [jround(0.229 * y - 74), jround(-0.007 * y + 36.57), 23];
  } else {
    s.back_color = [200, 28, 23];
  }
}

/** Generates a new map for the chosen difficulty and starts play. */
export function genMap(s) {
  const rows = 2000;
  const lv = LEVELS[s.level] ?? { density: 1600, money: s.money_factor, score: s.score_factor };
  const density = lv.density;
  s.money_factor = lv.money;
  s.score_factor = lv.score;
  s.bonus = idiv(1000 * s.score_factor, 10);
  const m = s.map;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const r = rand(density);
      if (r > 0 && r < 20 && rand(y) < 50 && y < 500) m[x][y] = 1;
      else if (r > 20 && r < 40 && rand(y) < 60 && y < 500) m[x][y] = 2;
      else if (r > 40 && r < 59 && rand(y) < 70 && y < 500) m[x][y] = 3;
      else if (r > 60 && r < 78 && rand(y) < 80 && y < 500) m[x][y] = 4;
      else if (r > 80 && r < 98 && rand(y) < 100 && y < 500) m[x][y] = 5;
      else if (r > 100 && r < 118 && rand(y) < 100 && y < 500) m[x][y] = 6;
      else if (r > 120 && r < 137 && rand(y) < 150 && rand(y) > 20 && y < 700) m[x][y] = 7;
      else if (r > 140 && r < 157 && rand(y) < 180 && rand(y) > 70 && y < 700) m[x][y] = 8;
      else if (r > 160 && r < 177 && rand(y) < 250 && rand(y) > 100 && y < 700) m[x][y] = 9;
      else if (r > 180 && r < 196 && rand(y) < 300 && rand(y) > 240 && y < 700) m[x][y] = 10;
      else if (r > 200 && r < 216 && rand(y) < 350 && rand(y) > 200 && y < 700) m[x][y] = 11;
      else if (r > 220 && r < 236 && rand(y) < 280 && rand(y) > 340 && y < 700) m[x][y] = 12;
      else if (r > 240 && r < 258 && rand(y) < 750 && rand(y) > 400 && y < 1000) m[x][y] = 13;
      else if (r > 260 && r < 278 && rand(y) < 800 && rand(y) > 440 && y < 1000) m[x][y] = 14;
      else if (r > 280 && r < 297 && rand(y) < 820 && rand(y) > 460 && y < 1000) m[x][y] = 15;
      else if (r > 300 && r < 317 && rand(y) < 840 && rand(y) > 480 && y < 1000) m[x][y] = 16;
      else if (r > 320 && r < 337 && rand(y) < 860 && rand(y) > 500 && y < 1000) m[x][y] = 17;
      else if (r > 340 && r < 357 && rand(y) < 880 && rand(y) > 600 && y < 1200) m[x][y] = 18;
      else if (r > 360 && r < 376 && rand(y) < 800 && rand(y) > 700 && y < 1200) m[x][y] = 19;
      else if (r > 380 && r < 390 && rand(y) < 1000 && rand(y) > 600 && y < 1300) m[x][y] = 20;
      else if (r > 400 && r < 410 && rand(y) < 1000 && rand(y) > 640 && y < 1300) m[x][y] = 21;
      else if (r > 420 && r < 428 && rand(y) < 1000 && rand(y) > 680 && y < 1300) m[x][y] = 22;
      else if (r > 440 && r < 453 && rand(y) > 750 && rand(y) < 1500 && y < 1000) m[x][y] = 23;
      else if (r > 460 && r < 473 && rand(y) > 800 && rand(y) < 1500 && y < 1000) m[x][y] = 24;
      else if (r > 480 && r < 493 && rand(y) > 850 && rand(y) < 1500 && y < 1000) m[x][y] = 25;
      else if (r > 500 && r < 512 && rand(y) > 900 && rand(y) < 1500 && y < 1000) m[x][y] = 26;
      else if (r > 520 && r < 528 && rand(y) > 950 && rand(y) < 1500 && y < 1000) m[x][y] = 27;
      else if (r > 550 && r < 700 && rand(y) > 600 && y < 1400) m[x][y] = 28;

      if (r > 760 && r < 900) m[x][y] = EMPTY;

      if (y > 1200) {
        if (r > 1000 && r < 1010 && rand(y) < 1600) m[x][y] = 32;
        else if (r > 1020 && r < 1030 && rand(y) < 1700) m[x][y] = 33;
        else if (r > 1040 && r < 1050 && rand(y) < 1800) m[x][y] = 34;
        else if (r > 1060 && r < 1070 && rand(y) > 1300) m[x][y] = 35;
        else if (r > 1080 && r < 1090 && rand(y) > 1350) m[x][y] = 36;
        else if (r > 1100 && r < 1110 && rand(y) > 1400) m[x][y] = 37;
        else if (r > 1120 && r < 1128 && rand(y) > 1500) m[x][y] = 38;
        else if (r > 1140 && r < 1148 && rand(y) > 1600) m[x][y] = 39;
        else if (r > 1160 && r < 1168 && rand(y) > 1700) m[x][y] = 40;
        else if (r > 1190 && r < 1296 && rand(y) > 1800) m[x][y] = 41;
      }

      if (m[x][y] === 0 && y < 1201) {
        if (rand(-0.0333 * y + 53) < 1 && y > 100) m[x][y] = 29;
        if (rand(-0.035 * y + 46) < 1 && y > 400) m[x][y] = 30;
        if (rand(-0.03 * y + 42.5) < 1 && y > 600) m[x][y] = 31;
      }

      if (y > 1200) {
        if (m[x][y] === 0 && rand(4) < 1 && y > 400) m[x][y] = 30;
        if (m[x][y] === 0 && rand(6) < 1 && y > 600) m[x][y] = 31;
        if (m[x][y] === EMPTY && rand(-0.0025 * y + 6) < 1) m[x][y] = MAGMA;
      }

      if (y < 5) m[x][y] = EMPTY;
    }
  }

  applyCheat(s);

  for (let x = 0; x < MAP_W; x++) m[x][5] = 0;

  // The five parts of the Superboring Machine, each on a different row between 800 and 1200.
  const x1 = Math.floor(47 * random());
  const y1 = jround(400 * random() + 800);
  const x2 = Math.floor(47 * random());
  let y2 = jround(400 * random() + 800);
  while (y1 === y2) y2 = jround(400 * random() + 800);
  const x3 = Math.floor(47 * random());
  let y3 = jround(400 * random() + 800);
  while (y1 === y3 || y2 === y3) y3 = jround(400 * random() + 800);
  const x4 = Math.floor(47 * random());
  let y4 = jround(400 * random() + 800);
  while (y1 === y4 || y2 === y4 || y3 === y4) y4 = jround(400 * random() + 800);
  const x5 = Math.floor(47 * random());
  let y5 = jround(400 * random() + 800);
  while (y1 === y5 || y2 === y5 || y3 === y5 || y4 === y5) y5 = jround(400 * random() + 800);
  m[x1][y1] = 42;
  m[x2][y2] = 43;
  m[x3][y3] = 44;
  m[x4][y4] = 45;
  m[x5][y5] = 46;

  // The deep layer, rows 2000..2999.
  const unobLimit = s.level === 1 ? 14 : 13;
  for (let y = 2000; y < 3000; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const r = rand(1000);
      m[x][y] = 0;
      if (r > 0 && r < 5 && y > 2100) m[x][y] = 47;
      else if (r > 10 && r < unobLimit && y > 2200) m[x][y] = 48;
      else if (r > 20 && r < 25 && y > 2300) m[x][y] = 49;
      else if (r > 30 && r < 36) m[x][y] = 41;
      else if (r > 40 && r < 55) m[x][y] = 50;
      else if (r > 60 && r < 65 && y > 2100) m[x][y] = 51;
      else if (r > 70 && r < 75 && y > 2200) m[x][y] = 52;
      else if (r > 80 && r < 85 && y > 2300) m[x][y] = 53;
      else if (r > 100 && r < idiv(y, 5) - 100) m[x][y] = 30;
      else if (r > 500 && r < idiv(y, 5) + 200) m[x][y] = 31;
      else if (r > 800 && r < idiv(15 * y, 100) + 550) m[x][y] = MAGMA;
    }
  }

  s.menu = false;
  s.startpage = false;
  loadImages(s);
  loadGameTiles(s);
  loadHull(s);
  loadDrill(s);
  if (s.music) {
    s.theme = 'duke_nukem2.mid';
    s.sfx.musicLoop(s.theme);
  }
  redraw(s);
}

/** Applies the cheat chosen on the start page to a new or loaded game. */
export function applyCheat(s) {
  switch (s.cheat) {
    case 1: s.money = 1000000; break;
    case 2: s.engine = 7; s.engmax = 1500; break;
    case 3: s.fueltank = 7; s.fuelmax = upgradeAmount(6 + s.fueltank); s.fuel = s.fuelmax; break;
    case 4: s.cargobay = 7; s.cargomax = 6000; break;
    case 5: s.radiator = 7; s.tempmax = 600; s.radf = 0.03; break;
    case 6: s.hullx = 7; s.hullmax = 1000; break;
    case 7: s.biox = 7; s.biomax = 60000; break;
    case 8: s.drillx = 7; s.drillmax = upgradeAmount(41 + s.drillx); s.drill = s.drillmax; break;
    case 9: s.batx = 7; s.batmax = 10000; break;
    case 10: for (let y = 0; y <= 1200; y++) s.map[24][y] = EMPTY; break;
    case 11: s.globe = true; break;
    default: break;
  }
}

/** Camera scroll by whole tiles sideways: everything on screen moves by dx pixels. */
export function shiftx(s, dx) {
  s.digx += dx;
  s.labl1x += dx;
  s.labl2x += dx;
  s.explx += dx;
  for (let i = 0; i < SHM; i++) s.grx[i] += dx;
  for (let i = 0; i < RCK; i++) s.rockx[i] += dx;
  s.ibombx += dx;
  s.sbombx += dx;
  s.nucbx += dx;
  redraw(s);
}

/** Camera scroll by whole tiles vertically, which also updates colour, magma and lava sound. */
export function shifty(s, dy) {
  s.digy += dy;
  s.ibomby += dy;
  s.sbomby += dy;
  s.nucby += dy;
  s.labl1y += dy;
  s.labl2y += dy;
  s.exply += dy;
  for (let i = 0; i < SHM; i++) s.gry[i] += dy;
  for (let i = 0; i < RCK; i++) s.rocky[i] += dy;
  backColor(s);
  magmaFlow2(s);
  redraw(s);
  if (s.sounds) {
    if (s.is_lava && s.posy < 1200) {
      s.sfx.stop('lava');
      s.is_lava = false;
    } else if (s.posy > 1200 && !s.is_lava) {
      s.sfx.loop('lava');
      s.is_lava = true;
    }
  }
}

/** Spreads magma into every open tile next to it (left, right, below), on screen only. */
export function magmaFlow(s) {
  flow(s, s.framex, s.framex + 16);
}

/** As magmaFlow, across the full width of the map. */
export function magmaFlow2(s) {
  flow(s, 0, MAP_W);
}

// Repeats single spreading passes over the given columns of the visible rows until nothing
// changes. Below row 1190 only.
function flow(s, x0, x1) {
  if (s.iposy <= 1190) return;
  const m = s.map;
  let changed = true;
  while (changed) {
    changed = false;
    for (let x = x0; x < x1; x++) {
      for (let y = s.framey; y < s.framey + 12; y++) {
        if (m[x][y] !== MAGMA) continue;
        if (x > 0 && m[x - 1][y] === EMPTY) { changed = true; m[x - 1][y] = MAGMA; }
        if (x < 47 && m[x + 1][y] === EMPTY) { changed = true; m[x + 1][y] = MAGMA; }
        if (m[x][y + 1] === EMPTY) { changed = true; m[x][y + 1] = MAGMA; }
      }
    }
  }
}

/** Starts an earthquake: shuffles tiles in bands above and below the screen. */
export function earthquake(s) {
  const m = s.map;
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(47 * random());
    const y = s.framey - 10 - jround(100 * random());
    swap(m, x, y);
  }
  if (s.iposy < 2800) {
    for (let i = 0; i < 300; i++) {
      const x = Math.floor(47 * random());
      const y = s.framey + 20 + jround(100 * random());
      swap(m, x, y);
    }
  }
  if (s.sounds) s.sfx.loop('earthquake');
}

// Rows off the map are skipped; earthquakes only happen deep enough that this never applies.
function swap(m, x, y) {
  if (y < 0 || y >= m[x].length) return;
  const t = m[x][y];
  m[x][y] = m[x + 1][y];
  m[x + 1][y] = t;
}

/** Ends an earthquake early (teleports); fix: its sound stops too. */
export function stopEarthquake(s) {
  s.earthq = false;
  s.sfx.stop('earthquake');
}

const MAX_TELEPORT_TRIES = 100000;

/** Teleporter: below row 1100 it may drop the pod in a random open tile up to 400 rows above. */
export function randomTel(s) {
  const chance = idiv(s.iposy, 4) + 250;
  const roll = 1000 * random();
  let spot = null;
  if (s.iposy > 1100 && roll < chance) {
    // Fix: the original searched until it found an open tile, which could hang forever when
    // none was left in range (see docs/mlu1/fixes.md); this gives up and goes to the surface.
    for (let tries = 0; tries < MAX_TELEPORT_TRIES; tries++) {
      const x = jround(47 * random());
      const y = jround(random() * 400 + s.framey - 400);
      if (y >= 0 && s.map[x][y] === EMPTY) { spot = [x, y]; break; }
    }
  }
  if (spot) {
    const [x, y] = spot;
    s.posx = x;
    s.iposx = x;
    s.posy = y;
    s.mode = 1;
    s.iposy = y;
    s.framex = Math.min(32, Math.max(0, idiv(s.iposx, 3) * 3 - 3));
    s.framey = Math.max(0, idiv(s.iposy, 3) * 3 - 6);
    s.digx = (s.iposx - s.framex) * 50 - 10;
    s.digy = (s.iposy - s.framey) * 50 + 50;
    magmaFlow2(s);
    redraw(s);
  } else {
    s.digx = 390;
    s.digy = 250;
    s.posx = 23;
    s.posy = 4;
    s.framex = 15;
    s.framey = 0;
    s.mode = 1;
    s.iposy = 4;
  }
}

/** Dynamite (radius 1) or TNT (radius 2) blast over columns x0..x1 around the pod's row. */
export function explos(s, radius, x0, x1) {
  const m = s.map;
  for (let x = x0; x <= x1; x++) {
    for (let y = s.iposy - radius; y <= s.iposy + radius; y++) {
      const v = m[x][y];
      if (v === 50) {
        s.ibomb = true;
        s.itimr = 0;
        s.ibombx = (x - s.framex) * 50 + 25;
        s.ibomby = (y - s.framey) * 50 + 25;
      } else if (v >= 51 && v <= 53) {
        s.nucb = true;
        s.nucbx = (x - s.framex) * 50 + 25;
        s.nucby = (y - s.framey) * 50 + 25;
        s.nuctimr = 0;
        if (!s.earthq) {
          s.eqtimr = 0;
          s.earthq = true;
          earthquake(s);
        }
        if (v === 51) { s.nucrad = 10; s.hull += 200; }
        else if (v === 52) { s.nucrad = 14; s.hull += 500; }
        else { s.nucrad = 20; s.hull += 1500; }
        // Fix: a bomb blast that wrecks the pod ends the game (see docs/mlu1/fixes.md).
        checkWrecked(s);
      } else if (v === MARBLE && radius === 2) {
        m[x][y] = EMPTY;
      }
      if (m[x][y] !== MARBLE) m[x][y] = EMPTY;
    }
  }
}

/**
 * Fix: damage that did not come with an explosion never ended the game in the original, and
 * left the wreck drawn at a stale place. Ends the game the same way an explosion does.
 */
export function checkWrecked(s) {
  // Like an explosion, this records the wreck's place even if another fatal message is already
  // showing; otherwise the wreck would pin the pod to a stale place.
  if (!s.explorer && s.hull > s.hullmax) {
    s.msg = true;
    s.msgstr = 'SHIP DAMAGED!';
    s.damx = s.digx;
    s.damy = s.digy;
  }
}

