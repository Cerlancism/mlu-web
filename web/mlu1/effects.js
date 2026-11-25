// Updates the original made while drawing a frame. They run once per tick here, straight after
// the tick's other updates, in the order the original drew them.
// See "Updates made while drawing" in docs/mlu1/specifications.md.

import { MAGMA, EMPTY, GRANITE, MARBLE, LAVA, SHM, RW, RH, REWARDS } from './data.js';
import { idiv, jround, random } from './jmath.js';
import { magmaFlow, redraw, backColor } from './world.js';
import { loadGameTiles } from './sprites.js';
import { makeString } from './shop.js';
import { restart } from './state.js';

/** The drawing-time updates for the current screen. */
export function stepEffects(s) {
  if (!s.menu) {
    if (s.iposy < 3000) underground(s);
    // the mantle's drawing-time updates are part of its tick (see mantle.js)
  } else if (s.startpage) {
    s.timr1++;
    if (s.timr1 === 30) s.timr1 = 0;
  }
}

function underground(s) {
  // Floating labels.
  if (s.labl1) {
    s.labl1timr++;
    s.labl1y -= 3;
    if (s.labl1timr === 50) { s.labl1 = false; s.fxLast.labl1 = true; }
  }
  if (s.labl2) {
    s.labl2timr++;
    if (s.labl2timr === 150) { s.labl2 = false; s.fxLast.labl2 = true; }
  }

  // Particles fly and fall.
  for (let i = 0; i < SHM; i++) {
    if (!s.grexists[i]) continue;
    s.grx[i] = Math.trunc(s.grx[i] + s.grxspd[i]);
    s.gry[i] = Math.trunc(s.gry[i] + s.gryspd[i]);
    s.gryspd[i] += 0.15;
    if (s.grx[i] < 0 || s.grx[i] > RW || s.gry[i] < 0 || s.gry[i] > RH) s.grexists[i] = false;
  }

  if (s.expls) stepExplosion(s);

  if (s.tr) {
    s.trtimr++;
    if (s.trtimr === 20) {
      s.tr = false;
      s.fxLast.tr = true;
      s.trtimr = 0;
    }
    // drawn this tick with the direction it had
  }

  if (!s.explorer) {
    // A wrecked pod stays where it was wrecked.
    if (s.hull > s.hullmax) {
      s.digx = s.damx;
      s.digy = s.damy;
    }
  } else if (s.timr2 > 0) {
    s.timr2++;
    if (s.timr2 === 20) { s.timr2 = 0; s.fxLast.laser = 20; }
  }

  if (s.sbomb) stepSonicBomb(s);
  if (s.ibomb) stepIceBomb(s);
  if (s.nucb) stepNuke(s);

  // The inventory pauses the gauges and the clock: they are put back each tick.
  if (s.status) {
    s.fuel = s.s_fuel;
    s.ice9 = s.s_ice9;
    s.battery = s.s_battery;
    s.time = s.s_time;
  }

  if (s.trans && s.transy === 20000 && !s.end) victoryScore(s);

  if (s.msg) {
    s.msgtimr++;
    if (s.msgtimr > 80) {
      s.sfx.musicStop();
      s.menu = true;
      s.startpage = true;
      restart(s);
    }
  }
}

/** Advances the explosion animation one frame (also used in the mantle). */
export function stepExplosion(s) {
  s.etimr++;
  if (s.etimr === s.eframes) {
    s.etimr = 0;
    s.expls = false;
    s.fxLast.expl = { name: s.expl, x: s.explx, y: s.exply, w: s.ewidth, frame: s.eframes - 1 };
    s.expl = null;
  }
}

function stepNuke(s) {
  // The blast clears every tile whose centre it covers.
  for (let x = s.framex; x < s.framex + 16; x++) {
    for (let y = s.framey; y < s.framey + 12; y++) {
      const cx = 50 * (x - s.framex) + 25;
      const cy = 50 * (y - s.framey) + 25;
      const d = jround(Math.sqrt((cx - s.nucbx) ** 2 + (cy - s.nucby) ** 2));
      if (d <= s.nuctimr * 15 && s.nuctimr > 0) s.map[x][y] = EMPTY;
    }
  }
  s.nuctimr++;
  if (s.nuctimr === s.nucrad) {
    s.nucb = false;
    s.fxLast.nuke = s.nuctimr - 1;
    magmaFlow(s);
  }
  redraw(s);
}

function stepSonicBomb(s) {
  // Shatters granite and marble around the pod.
  for (let x = s.framex; x < s.framex + 16; x++) {
    for (let y = s.framey; y < s.framey + 12; y++) {
      const tx = 50 * (x - s.framex) - 15;
      const ty = 50 * (y - s.framey) - 15;
      const v = s.map[x][y];
      if (v === GRANITE || v === MARBLE) {
        const d = jround(Math.sqrt((tx - s.digx) ** 2 + (ty - s.digy) ** 2));
        if (d <= s.stimr * 20 && s.stimr > 0) s.map[x][y] = 0;
      }
    }
  }
  s.stimr0 = s.stimr; // the ring drawn this tick, kept for the last one
  s.stimr++;
  redraw(s);
  if (s.stimr === idiv(-s.iposy, 200) + 19) {
    s.stimr = 0;
    s.sbomb = false;
    s.fxLast.sonic = s.stimr0;
  }
}

function stepIceBomb(s) {
  // Freezes magma into earth and lava into marble.
  const onMagma = s.map[s.iposx][s.iposy] === MAGMA;
  for (let x = s.framex; x < s.framex + 16; x++) {
    for (let y = s.framey; y < s.framey + 12; y++) {
      const v = s.map[x][y];
      if (v === MAGMA || v === LAVA) {
        const tx = 50 * (x - s.framex);
        const ty = 50 * (y - s.framey);
        const d = jround(Math.sqrt((tx - s.ibombx) ** 2 + (ty - s.ibomby) ** 2));
        if (d <= s.itimr * 15 && s.itimr > 0) s.map[x][y] = v === MAGMA ? 0 : MARBLE;
      }
    }
  }
  if (onMagma) s.map[s.iposx][s.iposy] = MAGMA;
  s.itimr++;
  redraw(s);
  if (s.itimr === 25) {
    s.itimr = 0;
    s.ibomb = false;
    s.fxLast.ice = 24;
  }
}

function victoryScore(s) {
  s.end = true;
  s.labl1x = Math.floor(10 * random());
  s.cheat = s.score;
  s.bonus = (4320000 - s.time) * 50;
  if (s.bonus < 0) s.bonus = 5000000;
  s.score = s.score + s.bonus + idiv(s.money, 2);
  s.scorestr = makeString(s.score);
  // Fix: the reward is fixed now; the original re-read it from a number the mineral labels
  // also change (see docs/mlu1/fixes.md).
  s.reward = REWARDS[Math.min(s.labl1x, 9)];
}

/** After the mantle's last detonation: back to the surface with the victory transmission. */
export function teleportHome(s) {
  s.digx = 390;
  s.digy = 250;
  s.posx = 23;
  s.posy = 4;
  s.framex = 15;
  s.framey = 0;
  s.mode = 1;
  s.iposy = 4;
  loadGameTiles(s);
  backColor(s);
  redraw(s);
  s.fxLast.nuke = null; // the mantle's last blast is not drawn over the surface
  s.trans = true;
  s.transy = 20000;
  s.earthq = false;
  s.sfx.stop('earthquake'); // Fix: the quake's sound stops with it
  s.img.msgscreen = 'msgscreen.png';
}
