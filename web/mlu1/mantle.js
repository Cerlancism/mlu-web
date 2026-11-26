// The mantle (row 3000 and below): the endless magma dive, rocks, detonations and victory.
// See "The mantle" in docs/mlu1/specifications.md.

import { RCK, RW, RH } from './data.js';
import { idiv, jround, random } from './jmath.js';
import { makeExpl, collision } from './pod.js';
import { stepExplosion, teleportHome } from './effects.js';
import { loadSwimTiles } from './sprites.js';
import { restart } from './state.js';

/** Entering the mantle: the magma background, rocks and the dive speed. */
export function loadSwim(s) {
  loadSwimTiles(s);
  s.hspeed = 0;
  s.vspeed = 3;
  s.rocks = 0;
  s.timr1 = 0;
  s.fallspd = RH;   // in the mantle this holds the background's scroll offset
  s.grexists.fill(false);
  s.rockexists.fill(false);
  // The background: magma tiles on the grid plus 100 at random places.
  s.swimTiles = [];
  for (let x = 0; x < RW; x += 50) for (let y = 0; y < RH; y += 50) s.swimTiles.push([x, y]);
  for (let i = 0; i < 100; i++) {
    s.swimTiles.push([jround(random() * (RW - 50)), jround(random() * (RH - 50))]);
  }
}

// Collision boxes of the three rock pictures, in hundredths of the rock's scale:
// [left, right, top, bottom] relative to the rock's top-left corner.
export const ROCK_BOXES = {
  1: [[27, 198, 6, 128], [0, 267, 128, 247], [32, 214, 247, 362]],
  2: [[16, 185, 15, 113], [2, 236, 113, 189], [27, 232, 202, 292]],
  3: [[13, 226, 17, 205], [226, 392, 34, 249], [94, 383, 205, 330]],
};

/** One tick in the mantle, including the updates the original made while drawing it. */
export function tickMantle(s) {
  if (!s.flg1) {
    s.flg1 = true;
    loadSwim(s);
  }
  s.time++;
  let use = s.vspeed / 30;
  s.depth += jround(s.vspeed / 2);
  s.temp = idiv(s.depth, 60) + 990;
  if (s.battery < s.batmax) s.battery += idiv(s.depth, 157000) + 0.0889;
  s.ice9 -= s.depth / 2882000 - 0.0041;
  if (s.ice9 < 0) {
    s.msg = true;
    s.msgstr = 'OVERHEAT!';
  }
  if (s.fuel < 0) {
    s.msg = true;
    s.msgstr = 'FUEL TANK EMPTY!';
  }
  if (!s.explorer) {
    s.hull += 10;
    if (!s.expls) makeExpl(s);
    if (s.hull > s.hullmax) {
      s.msg = true;
      s.msgstr = 'SHIP DAMAGED!';
    }
  }

  if (s.right_key && s.digx < RW) {
    s.digx += 5;
    use += 0.05;
  } else if (s.left_key && s.digx > 0) {
    s.digx -= 5;
    use += 0.05;
  }
  if (s.up_key && s.digy > 0) {
    s.digy -= 5;
    use += 0.05;
  } else if (s.down_key && s.digy < RH) {
    s.digy += 5;
    use += 0.05;
  }
  if (s.xkey && s.vspeed < 20) s.vspeed += 0.1;
  if (s.zkey && s.vspeed > 0) s.vspeed -= 0.1;
  if (s.battery > 0) s.battery -= use;
  else s.fuel -= use;

  // Rocks rise towards the ship below 32,000 ft.
  if (s.depth > 32000 && s.rocks < 5) {
    if (random() < 5e-7 * s.depth) {
      for (let i = 0; i < RCK; i++) {
        if (!s.grexists[i]) {
          s.grexists[i] = true;
          s.gryspd[i] = jround(8 * random() - 4);
          s.grx[i] = jround(RW * random() - 150);
          s.gry[i] = RH + 50;
          s.grtype[i] = Math.floor(3 * random()) + 1;
          s.grscale[i] = jround(30 * random() + 30);
          break;
        }
      }
    }
  }

  for (let i = 0; i < RCK; i++) {
    if (!s.grexists[i]) continue;
    s.gry[i] = Math.trunc(s.gry[i] + (s.gryspd[i] - s.vspeed));
    const boxes = ROCK_BOXES[s.grtype[i]];
    if (boxes) {
      const k = s.grscale[i];
      for (const [l, r, t, b] of boxes) {
        // Fix: the first box of the first rock compared against the wrong coordinates, so it
        // never hit (see docs/mlu1/fixes.md).
        if (s.digx > s.grx[i] + idiv(l * k, 100) && s.digx < s.grx[i] + idiv(r * k, 100)
            && s.digy > s.gry[i] + idiv(t * k, 100) && s.digy < s.gry[i] + idiv(b * k, 100)) {
          collision(s);
          break;
        }
      }
    }
    if (s.expls && s.eframes === 40 && s.etimr < 30) {
      const d = Math.sqrt((s.explx - s.grx[i]) ** 2 + (s.exply - s.gry[i]) ** 2);
      if (d < 170) s.grexists[i] = false;
    }
    if (s.gry[i] < -400) s.grexists[i] = false;
  }

  // What the original updated while drawing the mantle.
  s.timr1++;
  s.fallspd -= s.vspeed;
  if (s.fallspd < 0) s.fallspd = RH;
  if (s.expls) stepExplosion(s);
  if (s.nucb) {
    s.nuctimr++;
    if (s.nuctimr === s.nucrad) {
      s.nucb = false;
      s.fxLast.nuke = s.nuctimr - 1;
      if (s.detd === 0) teleportHome(s);
    }
  }
  if (s.msg) {
    s.msgtimr++;
    if (s.msgtimr > 80) {
      // Fix: the mantle's game over now stops the music like every other game over.
      s.sfx.musicStop();
      s.menu = true;
      s.startpage = true;
      restart(s);
    }
  }
}

