// The underground tick: movement, drilling, energy, heat, radiation, cargo, damage, death and
// entering the base. See "The pod" in docs/mlu1/specifications.md.

import { MAGMA, EMPTY, GRANITE, MARBLE, SHM, RCK, RW, RH, BONUS_STEPS, mineralName, mineralPrice,
  mineralWeight, mineralRx } from './data.js';
import { idiv, jround, random } from './jmath.js';
import { shiftx, shifty, magmaFlow, earthquake, redraw, checkWrecked } from './world.js';
import { loadHull, loadMenuTiles } from './sprites.js';
import { makeString, mineralProfit, repairsCost } from './shop.js';

/** One tick of play above the mantle (rows 0..2999). */
export function tickUnderground(s) {
  const m = s.map;
  s.time++;
  // Fix: the pod's column is kept on the map; the original froze for good when a sideways dig
  // carried the pod a hair past the edge (see docs/mlu1/fixes.md).
  s.iposx = Math.min(47, Math.max(0, jround(s.posx)));
  s.cposx = Math.ceil(s.posx);
  s.cposy = Math.ceil(s.posy);
  s.fposx = Math.floor(s.posx);
  s.fposy = Math.floor(s.posy + 0.01);
  s.iposy = jround(s.posy);
  let use = 0; // energy used this tick
  s.prev = s.digy;
  s.depth = (s.iposy - 4) * 10;
  s.temp = jround(0.5 * s.posy) - 10;
  const here = m[s.iposx][s.iposy];

  if (s.fuel <= 0 && !s.msg) {
    s.msg = true;
    s.msgstr = 'FUEL TANK EMPTY!';
  }
  if (s.rpm > s.engmax && !s.msg) {
    s.msg = true;
    s.msgstr = 'ENGINE FAILURE!';
  }

  if (s.score > s.bonus && s.bonus > 0 && !s.end) {
    s.money += idiv(s.bonus, 10);
    s.moneystr = makeString(s.money);
    s.labl2 = true;
    s.labl2x = s.digx;
    s.labl2y = s.digy - 30;
    s.labl2timr = 0;
    s.labl2str1 = `Bonus - $${idiv(s.bonus, 10)}`;
    s.labl2str2 = '';
    nextBonus(s);
  }

  if (m[s.iposx][s.iposy] === MAGMA && !s.explorer) {
    s.hull += 10;
    s.temp += 100;
    if (!s.expls) makeExpl(s);
    if (s.temp > s.tempmax && s.ice9 < 0) {
      s.msg = true;
      s.msgstr = 'OVERHEAT!';
    }
    if (s.hull > s.hullmax) {
      s.msg = true;
      s.msgstr = 'SHIP DAMAGED!';
      s.damx = s.digx;
      s.damy = s.digy;
    }
  }

  if (s.iposy >= s.transy && !s.trans) {
    s.trans = true;
    s.img.msgscreen = 'msgscreen.png';
  }

  if (s.ice9 >= 0) {
    s.ice9 -= 1e-6 * s.iposy + 3e-4;
    if (m[s.iposx][s.iposy] === MAGMA) s.ice9 -= 0.003;
  }

  if (s.explorer && s.temp >= 1250 && s.battery < s.batmax) {
    s.battery += 7e-5 * s.posy - 0.03;
    if (m[s.iposx][s.iposy] === MAGMA) s.battery += 0.1;
  }

  // Tractor beam: Ctrl and an arrow pulls in the neighbouring tile's mineral.
  if (s.ctrl && s.tractor === 1 && s.mode === 1 && s.battery + s.fuel >= 30 && !s.tr) {
    if (s.right_key && s.iposx < 47) {
      s.tr = true;
      s.trdir = 0;
      collect(s, m[s.iposx + 1][s.iposy]);
    } else if (s.up_key) {
      s.tr = true;
      s.trdir = 1;
      collect(s, m[s.iposx][s.iposy - 1]);
    } else if (s.left_key && s.iposx > 0) {
      s.tr = true;
      s.trdir = 2;
      collect(s, m[s.iposx - 1][s.iposy]);
    } else if (s.down_key) {
      s.tr = true;
      s.trdir = 3;
      collect(s, m[s.iposx][s.iposy + 1]);
    }
    if (s.tr) {
      redraw(s);
      spend(s, 30);
    }
  }

  // Driving.
  // Fix: a dig started by a key since the last tick counts as drilling; the original drove on its
  // first tick too, adding the driving load and pushing the pod off the grid (docs/mlu1/fixes.md).
  const idle = s.digtimr === 0 && (s.explorer || (s.mode !== 2 && s.mode !== 4));
  if (s.right_key && s.cposx <= 47) {
    if (!s.ctrl && idle && m[s.iposx][s.iposy] >= MAGMA
        && m[s.cposx][s.iposy] >= MAGMA && s.fuel + s.battery > 0) {
      s.sky_x = idiv(-s.iposx * 100, 47);
      s.posx += 0.02 * s.hspd;
      s.digx += s.hspd;
      scrollRight(s);
      use += driveCost(s);
    }
  } else if (s.left_key && s.fposx >= 0 && !s.ctrl && idle
      && m[s.iposx][s.iposy] >= MAGMA && m[s.fposx][s.iposy] >= MAGMA && s.fuel + s.battery > 0) {
    s.sky_x = idiv(-s.iposx * 100, 47);
    s.posx -= 0.02 * s.hspd;
    s.digx -= s.hspd;
    scrollLeft(s);
    use += driveCost(s);
  }

  // Flying.
  if (s.up_key && s.digtimr === 0 && !s.ctrl) {
    s.timr1++;
    s.gastimr++;
    use += 5e-6 * (2000 + s.cargo + s.fuel) + 0.002;
    if (s.flame) use += 5e-6 * (2000 + s.cargo + s.fuel) + 0.002;
    if (m[s.iposx][s.iposy] >= MAGMA && m[s.iposx][s.fposy] >= MAGMA && s.iposy > 2
        && s.fuel + s.battery > 0) {
      if (!s.is_prop && s.sounds) {
        s.sfx.loop(s.flame ? 'jet' : 'prop');
        s.is_prop = true;
      }
      const lift = jround(-0.04 * idiv(100 * s.rpm, s.engmax) + 7);
      s.vspd = idiv((lift - 1) * s.gastimr, 50) + 1;
      if (s.vspd > 5) s.vspd = 5;
      if (s.flame) s.vspd = idiv(20 * s.vspd, 8);
      if (m[s.iposx][s.iposy] === MAGMA) s.vspd = 4;
      s.posy -= 0.02 * s.vspd;
      s.digy -= s.vspd;
      if (s.digy < 150 && s.iposy > 2) {
        s.framey -= 3;
        shifty(s, 150);
      }
      s.mode = 3;
    } else if (s.flame && s.prev === s.digy && !s.expls && s.framey > 0) {
      s.hull += 3;
      makeExpl(s);
    }
  } else if (s.is_prop) {
    s.is_prop = false;
    s.sfx.stop('prop');
  }

  // Drilling.
  if (!s.explorer) {
    if (s.mode === 4) {
      s.digtimr++;
      makeGr(s);
      s.posy += 0.02;
      s.digy++;
      use += 0.02 * (0.0077 * s.posy + 0.5);
      if (s.digy > RH - 200) {
        s.framey += 3;
        shifty(s, -150);
      }
      if (s.digtimr === 45) {
        collect(s, here);
        m[s.iposx][s.iposy] = EMPTY;
        s.score++;
        magmaFlow(s);
        s.scorestr = makeString(s.score);
        if (s.temp > s.tempmax && s.ice9 < 0) {
          s.msg = true;
          s.msgstr = 'OVERHEAT!';
        }
        redraw(s);
        s.sfx.stop('drill');
      }
      if (s.digtimr === 50) {
        s.digtimr = 0;
        s.mode = 1;
      }
      if (s.drill < 0) s.drill = 0;
    } else if (s.mode === 2) {
      s.digtimr++;
      makeGr(s);
      use += 0.02 * (0.0077 * s.posy + 0.5);
      if (!s.right_side) {
        s.posx -= 0.02;
        s.digx--;
        scrollLeft(s);
      } else {
        s.posx += 0.02;
        s.digx++;
        scrollRight(s);
      }
      if (s.digtimr === 45) {
        collect(s, here);
        m[s.iposx][s.iposy] = EMPTY;
        s.score++;
        s.scorestr = makeString(s.score);
        magmaFlow(s);
        redraw(s);
        s.sfx.stop('drill');
      }
      if (s.digtimr === 50) {
        s.digtimr = 0;
        s.mode = 1;
      }
      if (s.drill < 0) s.drill = 0;
    }
  }

  // Falling.
  if (m[s.iposx][s.fposy + 1] >= MAGMA && (!s.up_key || s.fuel + s.battery < 0)
      && s.digtimr === 0 && s.timr2 === 0 && !s.status) {
    s.mode = 5;
    s.timr1++;
    if (s.fallspd < s.termspd) s.fallspd += 0.05;
    if (m[s.iposx][s.iposy] === MAGMA) s.fallspd = 4;
    s.posy += 0.02 * s.fallspd;
    s.digy += jround(s.fallspd);
    if (s.digy > RH - 200) {
      s.framey += 3;
      shifty(s, -150);
    }
    if (m[s.iposx][Math.floor(s.posy + 0.01)] < 47) {
      s.timr1 = 0;
      s.mode = 1;
      s.fallspd = 7;
    }
    if (s.temp > s.tempmax && s.ice9 < 0) {
      s.msg = true;
      s.msgstr = 'OVERHEAT!';
    }
  } else if (!s.up_key && s.mode === 5) {
    if (s.fallspd > 10) {
      s.hull += 5;
      makeExpl(s);
    } else if (s.fallspd > 8) {
      s.hull += 3;
      makeExpl(s);
    }
    s.timr1 = 0;
    s.mode = 1;
    s.fallspd = 7;
  }

  // Energy: the radiator runs unless Ice9 is cooling; the battery is used before fuel.
  if (s.ice9 <= 0) use += s.radf;
  if (s.battery <= 0) s.fuel -= use;
  else s.battery -= use;
  s.rpm = jround(5500 * use);

  // Settle onto the tile grid when standing still.
  if (s.digy === s.prev && !s.up_key && s.digtimr === 0) {
    s.digy = (-s.framey + s.iposy + 1) * 50;
    s.mode = 1;
    if (m[s.iposx][s.iposy] < MAGMA) {
      s.posy--;
      s.digy -= 50;
    }
  }

  if (s.depth === 0 && s.iposx > 44) enterBase(s);

  if (s.earthq) tickEarthquake(s);
}

function driveCost(s) {
  return s.up_key ? 1e-6 * (2000 + s.cargo + s.fuel) + 5e-4
    : 2e-6 * (2000 + s.cargo + s.fuel) + 0.0015;
}

function scrollRight(s) {
  if (s.digx > RW - 200) {
    if (s.framex < 30) {
      s.framex += 3;
      shiftx(s, -150);
    } else if (s.framex === 30) {
      s.framex += 2;
      shiftx(s, -100);
    }
  }
}

function scrollLeft(s) {
  if (s.digx < 100) {
    if (s.framex > 2) {
      s.framex -= 3;
      shiftx(s, 150);
    } else if (s.framex === 2) {
      s.framex -= 2;
      shiftx(s, 100);
    }
  }
}

/** Takes energy from the battery first, the rest from fuel. */
export function spend(s, amount) {
  if (s.battery >= amount) {
    s.battery -= amount;
  } else {
    s.fuel -= amount - s.battery;
    s.battery = 0;
  }
}

function nextBonus(s) {
  const f = s.score_factor;
  for (let i = 0; i < BONUS_STEPS.length - 1; i++) {
    if (s.bonus === BONUS_STEPS[i] * f) {
      s.bonus = BONUS_STEPS[i + 1] * f;
      return;
    }
  }
  // Fix: past the last step the original kept the same target and paid the bonus again on
  // every tick (see docs/mlu1/fixes.md). No more bonuses are paid.
  s.bonus = 0;
}

function tickEarthquake(s) {
  s.eqtimr++;
  if (s.eqtimr > 200) {
    s.eqtimr = 0;
    s.earthq = false;
    s.sfx.stop('earthquake');
  }
  if (s.eqtimr < 150 && random() < 0.07) {
    for (let i = 0; i < RCK; i++) {
      if (!s.rockexists[i]) {
        s.rockexists[i] = true;
        s.rockx[i] = jround(RW * random());
        s.rocky[i] = -50;
        s.rockyspd[i] = jround(5 * random()) + 10;
        break;
      }
    }
  }
  for (let i = 0; i < RCK; i++) {
    if (!s.rockexists[i]) continue;
    if (s.rockx[i] > s.digx - 30 && s.rockx[i] < s.digx + 40
        && s.rocky[i] > s.digy - 50 && s.rocky[i] < s.digy + 10) {
      s.rockexists[i] = false;
      makeExpl(s);
      s.hull += 80;
      // Fix: a rock that wrecks the pod ends the game (see docs/mlu1/fixes.md).
      checkWrecked(s);
    }
    s.rocky[i] += s.rockyspd[i];
    if (s.rocky[i] > RH + 50) s.rockexists[i] = false;
  }
}

/** Driving to the far right of the surface enters the base. */
export function enterBase(s) {
  s.menu = true;
  loadMenuTiles(s);
  s.selx = 0;
  s.sely = 0;
  s.tab = 1;
  s.selymax = 5;
  s.timr1 = 0;
  s.etimr = 0;
  s.scroll = 0;
  s.mineralprofit = makeString(mineralProfit(s));
  s.repairscost = makeString(repairsCost(s));
  if (s.sounds) {
    s.sfx.stop('prop');
    s.sfx.stop('jet');
    s.sfx.stop('lava');
  }
  s.img.shop = 'repairs.jpg';
  s.img.cursor = 'repairs_cursor.png';
  if (s.music) {
    s.theme = 'shops_theme.mid';
    s.sfx.musicLoop(s.theme);
  }
}

/** Starts the small explosion animation on the pod and checks for a wreck. */
export function makeExpl(s) {
  s.expl = 'expl.png';
  if (s.sounds) s.sfx.play('shipexpl');
  s.expls = true;
  s.eframes = 32;
  s.ewidth = 64;
  s.explx = s.digx;
  s.exply = s.digy - 50;
  s.etimr = 0;
  if (s.hull > s.hullmax) {
    s.msg = true;
    s.msgstr = 'SHIP DAMAGED!';
    s.damx = s.digx;
    s.damy = s.digy;
  }
  if (s.explorer) s.hull = 0;
}

/** Throws a chip from the drill, three times in ten. */
export function makeGr(s) {
  if (random() >= 0.3) return;
  for (let i = 0; i < SHM; i++) {
    if (s.grexists[i]) continue;
    s.grx[i] = s.digx + 18;
    s.gry[i] = s.digy - 10;
    if (s.mode === 2) {
      s.gryspd[i] = 8 * random() - 4;
      s.grxspd[i] = s.right_side ? 12 * random() - 15 : -12 * random() + 15;
    } else if (s.mode === 4) {
      s.gryspd[i] = 6 - 8 * random();
      s.grxspd[i] = 12 * random() - 6;
    }
    s.grscale[i] = jround(10 * random() + 10);
    s.grexists[i] = true;
    s.grtype[i] = 0;
    if (random() < 0.7) {
      const here = s.map[s.iposx][s.iposy];
      if (here === GRANITE) s.grtype[i] = 1;
      else if (here === MARBLE) s.grtype[i] = 2;
    }
    break;
  }
}

/** The super-ship's laser drill: clears the tile in direction 1 right, 2 left, 3 down. */
export function boom(s, dir) {
  const m = s.map;
  for (let i = 0; i < 10; i++) {
    if (s.grexists[i]) continue;
    s.grexists[i] = true;
    s.grxspd[i] = 16 * random() - 8;
    s.gryspd[i] = 16 * random() - 8;
    s.grscale[i] = jround(10 * random() + 10);
    s.grtype[i] = 0;
    if (dir === 1) { s.grx[i] = s.digx + 50; s.gry[i] = s.digy; }
    else if (dir === 2) { s.grx[i] = s.digx - 50; s.gry[i] = s.digy; }
    else if (dir === 3) { s.grx[i] = s.digx; s.gry[i] = s.digy + 50; }
    if (random() < 0.6) {
      const t = dir === 1 ? m[s.iposx + 1][s.iposy]
        : dir === 2 ? m[s.iposx - 1][s.iposy]
          : dir === 3 ? m[s.iposx][s.iposy + 1] : -1;
      if (t === MARBLE) s.grtype[i] = 2;
      else if (t === GRANITE) s.grtype[i] = 1;
    }
  }
  if (dir === 1) {
    collect(s, m[s.iposx + 1][s.iposy]);
    m[s.iposx + 1][s.iposy] = EMPTY;
  } else if (dir === 2) {
    collect(s, m[s.iposx - 1][s.iposy]);
    m[s.iposx - 1][s.iposy] = EMPTY;
  } else if (dir === 3) {
    collect(s, m[s.iposx][s.iposy + 1]);
    m[s.iposx][s.iposy + 1] = EMPTY;
  }
  spend(s, 30);
  s.drill = 1000;
  magmaFlow(s);
  redraw(s);
}

/** A hit by a mantle rock: an explosion and game over. */
export function collision(s) {
  if (!s.expls) {
    makeExpl(s);
    s.explx = s.digx - 10;
    s.exply = s.digy - 20;
  }
  s.msg = true;
  s.msgstr = 'SHIP DAMAGED!';
}

/** What happens when a tile's contents reach the pod (drill, laser or tractor beam). */
export function collect(s, v) {
  s.score += idiv(mineralPrice(v) * s.score_factor, 10);
  if (!s.tr) {
    s.drill -= 0.003 * s.posy + 1;
    if (v === GRANITE) s.drill -= 0.3 * s.posy + 100;
    else if (v === MARBLE) s.drill -= 0.75 * s.posy + 250;
    if (s.posy > 1000 && !s.earthq) {
      if (random() < 1.5e-5 * s.posy) {
        s.eqtimr = 0;
        s.earthq = true;
        earthquake(s);
      }
    }
  }

  if (v >= 42 && v <= 46 && !s.tr) {
    // A part of the Superboring Machine: the top upgrade of one category.
    s.labl1 = true;
    s.labl1timr = 0;
    s.labl1x = s.digx;
    s.labl1y = s.digy;
    s.score += 1000000;
    s.labl1str2 = '';
    let cat = 0;
    if (v === 42) {
      s.labl1str1 = 'Mega Engine: 3000 HP'; s.engine = 8; s.engmax = 3000; cat = 0;
    } else if (v === 43) {
      s.labl1str1 = 'Mega Fuel Tank: 6000 L'; s.fueltank = 8; s.fuelmax = 6000; cat = 1;
    } else if (v === 44) {
      s.labl1str1 = 'Mega Cargo Bay: 15000 lbs'; s.cargobay = 8; s.cargomax = 15000; cat = 2;
    } else if (v === 45) {
      s.labl1str1 = 'Mega Hull: 2000 Hits'; s.hullx = 8; s.hullmax = 2000; cat = 4;
      loadHull(s);
    } else {
      s.labl1str1 = 'Mega Cooling System: 1200 F'; s.radiator = 8; s.tempmax = 1200;
      s.radf = 0.06; cat = 3;
    }
    for (let t = 0; t < 7; t++) s.upgrades[cat][t] = true;
  } else if (v === 28) {
    // Gas pocket: fuel for the gas burner, otherwise it explodes.
    if (s.gasb !== 0 && !s.tr) {
      if (s.battery + 50 <= s.batmax) {
        s.battery += 50;
        s.score += 100;
      }
    } else {
      s.hull += 20;
      makeExpl(s);
    }
  } else if (v === 31) {
    // Lava.
    if (!s.explorer) {
      s.hull += 100;
      makeExpl(s);
      s.temp += 100;
    } else if (s.battery < s.batmax - 100) {
      s.battery += 100;
    }
  }

  const w = mineralWeight(v);
  if (w !== 0) {
    if (s.sounds) s.sfx.play('clank');
    if (w + s.cargo <= s.cargomax) {
      let info = `${idiv(mineralPrice(v) * s.money_factor, 10)}$  ${w}`;
      info += v !== 27 ? ' lb' : ' oz';
      s.labl1 = true;
      s.labl1x = s.digx;
      s.labl1y = s.digy;
      s.labl1timr = 0;
      s.labl1str1 = mineralName(v);
      s.labl1str2 = info;
      if (v > 46) {
        if (v === 47) s.mith++;
        else if (v === 48) s.unob++;
        else if (v === 49) s.adam++;
        else if (v === 50) {
          s.ice9max = s.ice9 > 0 ? 10 + Math.ceil(s.ice9) : 10;
          s.ice9 += 10;
        } else if (v === 51) { s.bomb1++; s.nux += 50; }
        else if (v === 52) { s.bomb2++; s.nux += 120; }
        else if (v === 53) { s.bomb3++; s.nux += 300; }
        if (v !== 50) s.cargo += w;
        if (s.explorer) {
          if (v === 51) s.score += 30000;
          else if (v === 52) s.score += 100000;
          else if (v === 53) s.score += 250000;
        }
      } else {
        s.minerals[v]++;
        s.cargo += w;
        s.rx += mineralRx(v);
      }

      // Burners and reactors turn some minerals straight into battery charge.
      if (v === 1 && s.coalb === 1 && s.battery + 10 <= s.batmax && s.processor) {
        s.battery += 10; s.minerals[v]--; s.cargo -= 40;
      } else if (v === 2 && s.petrolr === 1 && s.battery + 20 <= s.batmax && s.processor) {
        s.battery += 20; s.minerals[v]--; s.cargo -= 50;
      } else if (v === 20) {
        if (s.nuc === 1 && s.nucx === 0 && s.battery + 100 <= s.batmax && s.processor) {
          s.battery += 100; s.minerals[v]--; s.cargo -= 35; s.rx -= 100;
        }
        if (s.nucx === 1 && s.battery + 200 <= s.batmax) {
          s.battery += 200; s.minerals[v]--; s.cargo -= 35; s.rx -= 100;
        }
      } else if (v === 21 && s.battery + 150 <= s.batmax && s.processor) {
        if (s.nuc === 1 && s.nucx === 0) {
          s.battery += 150; s.minerals[v]--; s.cargo -= 30; s.rx -= 200;
        }
        if (s.nucx === 1 && s.battery + 300 <= s.batmax) {
          s.battery += 300; s.minerals[v]--; s.cargo -= 30; s.rx -= 200;
        }
      } else if (v === 22 && s.battery + 250 <= s.batmax && s.processor) {
        if (s.nuc === 1 && s.nucx === 0) {
          s.battery += 250; s.minerals[v]--; s.cargo -= 25; s.rx -= 500;
        }
        if (s.nucx === 1 && s.battery + 500 <= s.batmax) {
          s.battery += 500; s.minerals[v]--; s.cargo -= 25; s.rx -= 500;
        }
      }

      if (s.rx > s.biomax) {
        s.msg = true;
        s.msgstr = 'RADIATION EXPOSURE!';
      }
    } else {
      s.labl1x = s.digx;
      s.labl1 = true;
      s.labl1y = s.digy;
      s.labl1timr = 0;
      s.labl1str1 = 'Cargo Bay is Full';
      s.labl1str2 = '';
    }

    if (s.tr && w > 0) {
      if (s.trdir === 0) s.map[s.iposx + 1][s.iposy] = 0;
      else if (s.trdir === 1) s.map[s.iposx][s.iposy - 1] = 0;
      else if (s.trdir === 2) s.map[s.iposx - 1][s.iposy] = 0;
      else if (s.trdir === 3) s.map[s.iposx][s.iposy + 1] = 0;
    }
    if (s.drill < 0) s.drill = 0;
    s.scorestr = makeString(s.score);
  }
}
