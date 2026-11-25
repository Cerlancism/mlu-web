// effects: The updates the original made while drawing a frame. They run once per tick here,
// straight after the tick's other updates, in the order the original drew them, on every screen:
// falling rocks, cannon shells, floating labels, particles, explosions, the tractor beam, the
// sonic cannon's beam, the transporter drop-in and pick-up, rain and lightning, wind, the shield,
// the sonic, ice, radiation and nuclear blasts, the pop-up panel and radiation overlay timers,
// the laser cannon, the fatal-message countdown, and the base and start-page timers.
// Specification: docs/mlu2/specifications.md, Lifecycle and main loop (3).
//
// Drawing never changes the game state, so render.js cannot redo these. Where the original drew
// a value and then changed it in the same frame (or drew something that ended in that frame),
// the value it drew is recorded in s.fxLast, which the page clears before every tick; render.js
// draws the play screen from those records. Records (all optional):
//   screen        'play' | 'status' | 'base' | 'start': the screen this tick's frame showed
//   painting      true while the play frame's updates run (render keeps the field picture that
//                 the frame had blitted when a redraw happens during them)
//   rocks[i]      [x, y] of each falling rock drawn (before its fall)
//   bullets       [{b, x, y, angle}] the shells drawn
//   labl1         [str1, str2, x, y];  labl2  [str1, str2, red]
//   gr[i]         [x, y, type, scale] of each particle drawn
//   expl          [image, x, y, width, frame]
//   tr            the tractor beam's direction, when drawn
//   digger        {drawship, iced, hullOk, bolton, cannonx, beam}: what the pod was drawn with
//   entry         [x, y] of the transporter
//   rain          {lines, angle1};  lightning  lightningx when the bolt is drawn;  wind  true
//   shield        the number shown on the shield
//   sbomb, ibomb, rbomb, nucb   the blast step drawn
//   bar           {hull, fuel, battery} as the heads-up display showed them
//   panel55       the pop-up panel drawn (may be null)
//   green         the radiation overlay's alpha (0-255)
//   laserBar      width of the laser charge bar;  laser  {surface, right, pos1} of the beam
//   msg           [text, frozen] of the fatal message drawn
//   timr1, cheat  the start page's blink step and whether the cheat message was drawn

import { RH, RW, SHM, RCK, WIND, SPACE, MAGMA, MAP_H } from './data.js';
import { idiv, toInt, jround, int8, random } from './jmath.js';
import { restart } from './state.js';
import { redraw, checkMagma } from './world.js';
import { modifyMinerals } from './pod.js';

/** The drawing-time updates of one frame, for the current screen. */
export function stepEffects(s) {
  if (!s.fxLast) s.fxLast = {};
  const fx = s.fxLast;
  if (!s.menu) {
    if (s.status) {
      // The pause screen only shows the picture taken when it opened.
      fx.screen = 'status';
      return;
    }
    fx.screen = 'play';
    fx.painting = true;
    play(s, fx);
    fx.painting = false;
  } else if (!s.startpage) {
    fx.screen = 'base';
    // Quirk: the high-score tab's name cursor blinks on the explosion timer.
    if (s.tab === 4) s.etimr++;
  } else {
    fx.screen = 'start';
    s.timr1++;
    fx.timr1 = s.timr1; // drawn before the wrap at 30 below
    if (s.cheattimr > 0) {
      s.cheattimr++;
      fx.cheat = true;
      if (s.cheattimr > 100) s.cheattimr = 0;
    }
    if (s.timr1 === 30) s.timr1 = 0;
  }
}

/** The state changes drawField makes (the field layer is drawn by render.js). */
export function fieldStep(s) {
  if (s.magmatimr > 29) s.magmatimr = 0;
}

/** The state changes drawDigger makes, recording what the pod is drawn with. */
export function diggerStep(s) {
  if (!s.fxLast) s.fxLast = {};
  const d = {
    drawship: s.drawship, iced: s.iced, hullOk: s.hull <= s.hullmax, bolton: s.bolton,
    cannonx: s.cannonx, beam: 0,
  };
  s.fxLast.digger = d;
  if (s.drawship) {
    if (!s.iced) {
      if (s.hull <= s.hullmax) {
        if (!s.scannon && !s.cannonx) {
          // drawing only
        } else if (!s.cannonx) {
          // The sonic cannon's shot: drawn with the step after this increment.
          if (s.timr2 > 0) {
            s.timr2++;
            d.beam = s.timr2;
            if (s.timr2 === 20) s.timr2 = 0;
          }
        }
      } else {
        // A wrecked pod stays where it was wrecked.
        s.digx = s.damx;
        s.digy = s.damy;
      }
    }
  }
}

/** Starts the pod's explosion. */
export function makeExpl(s) {
  s.expl = 'images/expl.png';
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
}

/** Throws one particle of dirt (or granite or marble chips) from the drill, 3 times in 10. */
export function makeGr(s) {
  if (random() < 0.3) {
    for (let i = 0; i < SHM; i++) {
      if (!s.grexists[i]) {
        s.grx[i] = s.digx + 18;
        s.gry[i] = s.digy - 10;
        if (s.mode === 2) {
          s.gryspd[i] = 8.0 * random() - 4.0;
          if (s.right_side) s.grxspd[i] = 12.0 * random() - 15.0;
          else s.grxspd[i] = -12.0 * random() + 15.0;
        } else if (s.mode === 4) {
          s.gryspd[i] = 6.0 - 8.0 * random();
          s.grxspd[i] = 12.0 * random() - 6.0;
        }
        s.grscale[i] = jround(10.0 * random() + 10.0);
        s.grexists[i] = true;
        s.grtype[i] = 0;
        if (random() < 0.7) {
          if (s.map[s.iposx][s.iposy] === 29) s.grtype[i] = 1;
          else if (s.map[s.iposx][s.iposy] === 30) s.grtype[i] = 2;
        }
        break;
      }
    }
  }
}

// ---- The play screen, in drawing order ------------------------------------------------------

function play(s, fx) {
  // The field: blitted from the layer, or drawn live when rdr is set (never, in practice).
  if (!s.earthq && s.rdr) fieldStep(s);

  // Falling rocks: drawn, then they hit the pod or fall.
  const rocks = [];
  for (let i = 0; i < RCK; i++) {
    if (s.rockexists[i]) {
      rocks[i] = [s.rockx[i], s.rocky[i]];
      if (s.rockx[i] > s.digx && s.rockx[i] < s.digx + 75 && s.rocky[i] > s.digy - 50
          && s.rocky[i] < s.digy + 10) {
        s.rockexists[i] = false;
        if (!s.shieldx) {
          if (s.rockyspd[i] === 9) s.hull += 30;
          else s.hull += 80;
          makeExpl(s);
        }
      }
      s.rocky[i] = s.rocky[i] + s.rockyspd[i];
      if (s.rocky[i] > RH + 50) s.rockexists[i] = false;
    }
  }
  fx.rocks = rocks;

  if (!s.status && s.bullets.length > 0) drawBullets(s, fx);
  drawLabel(s, fx);
  drawGr(s, fx);
  if (s.expls) drawExpl(s, fx);
  if (s.tr) drawTr(s, fx);
  diggerStep(s);
  if (s.entrytimr > 0) drawEntry(s, fx);
  if (s.framey < 4) {
    if (s.rain) drawRain(s, fx);
    if (s.wind) drawWind(s, fx);
  }

  if (s.shieldx) {
    fx.shield = 200 - s.shieldtimr; // the count drawn before this tick's step
    s.shieldtimr++;
    if (s.battery > 0.05) s.battery -= 0.05;
    else s.fuel -= 0.05;
    if (s.shieldtimr === 200) {
      s.shieldx = false;
      s.shieldtimr = 0;
    }
  }

  if (s.sbomb) drawSbomb(s, fx);
  if (s.ibomb) drawIbomb(s, fx);
  if (s.rbomb) drawRbomb(s, fx);
  if (s.nucb) drawNucb(s, fx);

  // The heads-up display is drawn here, before the laser drains the battery or fuel.
  fx.bar = { hull: s.hull, fuel: s.fuel, battery: s.battery };

  // The speed readout's timer (rule: the readout never shows, the timer is never started).
  if (s.gspdtimr > 0) {
    s.gspdtimr++;
    if (s.gspdtimr > 60) s.gspdtimr = 0;
  }

  if (s.timr55 > 0) {
    fx.panel55 = s.panel; // drawn before it is cleared
    s.timr55++;
    if (s.timr55 > 100) {
      s.timr55 = 0;
      s.panel = null;
    }
  }

  if (s.greentimr > 0) {
    fx.green = s.greentimr <= 255 ? s.greentimr : 255;
    s.greentimr++;
    if (s.greentimr > 255) {
      s.msg = true;
      s.msgstr = 'RADIATION EXPOSURE';
    }
  }

  drawLaser(s, fx);

  if (s.msg) {
    let b1 = true;
    if ((s.mode === 4 || s.mode === 2) && s.msgstr === 'ENGINE FAILURE!') {
      b1 = false;
      if (idiv(100 * s.rpm, s.engmax) < 100) {
        s.msg = false;
        s.msgtimr = 0;
      }
    }
    s.msgtimr++;
    if (b1) fx.msg = [s.msgstr, s.msgstr.indexOf('FROZEN') >= 0];
    if (s.msgtimr > 80) {
      if (s.music) s.sfx.musicStop();
      s.menu = true;
      s.startpage = true;
      restart(s);
    }
  }
}

// Removes a shell from the list; a shell already removed is left alone, as Vector.remove did.
function removeBullet(s, bullet) {
  const k = s.bullets.indexOf(bullet);
  if (k >= 0) s.bullets.splice(k, 1);
}

function drawBullets(s, fx) {
  const drawn = [];
  // Quirk: removing a shell inside this indexed loop skips the shell after it for this frame.
  for (let i = 0; i < s.bullets.length; i++) {
    const bullet = s.bullets[i];
    bullet.x = bullet.x + bullet.xspeed;
    bullet.y = bullet.y + bullet.yspeed;
    if (bullet.x >= 0 && bullet.x <= RW && (bullet.y >= 0 || bullet.yspeed >= 0) && bullet.y <= RH) {
      if (bullet.mode === 4) {
        // A tank shell: blocked by intact bases, and it blasts the ground it reaches.
        const bposx = s.framex + idiv(bullet.x, 50);
        const bposy = s.framey + idiv(bullet.y, 50);
        for (let bs = 0; bs < s.basex.length; bs++) {
          // Quirk: the shell is removed but goes on being processed (and may still be drawn).
          if (s.baseok[bs] && bposx > s.basex[bs] - 2 && bposx < s.basex[bs] + 4 && bposy > 1) {
            removeBullet(s, bullet);
          }
        }
        // (A row below the map reads as undefined here, so it is not ground; the original
        // would have thrown.)
        if (bposx < 5000 && s.map[bposx][bposy] < SPACE) {
          if (s.map[bposx][bposy] < 70 && bposy > 4) {
            s.map[bposx][bposy] = SPACE;
            s.mapmode[bposx][bposy] = int8(toInt(random() * 6.0));
          }
          if (!s.magmaex) {
            checkMagma(s);
            redraw(s);
          }
          removeBullet(s, bullet);
          continue;
        }
      }
      if (bullet.x > s.digx - 15 && bullet.x < s.digx + 65 && bullet.y > s.digy - 45
          && bullet.y < s.digy + 15 && !s.shieldx) {
        s.hull = s.hull + bullet.damage;
        makeExpl(s);
        removeBullet(s, bullet);
      } else {
        let angle = Math.atan(bullet.yspeed / bullet.xspeed);
        if (bullet.xspeed < 0) angle += Math.PI;
        drawn.push({ b: bullet, x: bullet.x, y: bullet.y, angle });
      }
    } else {
      removeBullet(s, bullet);
    }
  }
  fx.bullets = drawn;
}

function drawLabel(s, fx) {
  if (s.labl1) {
    s.labl1timr++;
    s.labl1y = s.labl1y - s.lablspeed;
    fx.labl1 = [s.labl1str1, s.labl1str2, s.labl1x, s.labl1y];
    if (s.labl1timr === 50) s.labl1 = false;
  }
  if (s.labl2) {
    s.labl2timr++;
    fx.labl2 = [s.labl2str1, s.labl2str2, s.labl2timr % 4 < 2];
    if (s.labl2timr === 150) s.labl2 = false;
  }
}

function drawGr(s, fx) {
  const gr = [];
  for (let i = 0; i < SHM; i++) {
    if (s.grexists[i]) {
      s.grx[i] = toInt(s.grx[i] + s.grxspd[i]);
      s.gry[i] = toInt(s.gry[i] + s.gryspd[i]);
      s.gryspd[i] = s.gryspd[i] + 0.15;
      if (s.grx[i] < 0 || s.grx[i] > RW || s.gry[i] < 0 || s.gry[i] > RH) s.grexists[i] = false;
      // drawn even when it just left the screen
      gr[i] = [s.grx[i], s.gry[i], s.grtype[i], s.grscale[i]];
    }
  }
  fx.gr = gr;
}

function drawExpl(s, fx) {
  fx.expl = [s.expl, s.explx, s.exply, s.ewidth, s.etimr];
  s.etimr++;
  if (s.etimr === s.eframes) {
    s.etimr = 0;
    s.expls = false;
    s.expl = null;
  }
}

function drawTr(s, fx) {
  s.trtimr++;
  if (s.trtimr === 20) {
    s.tr = false;
    s.trtimr = 0;
  }
  fx.tr = s.trdir;
}

// The transporter: drops the pod at the start (bases 0-2) or picks it up at the last base.
function drawEntry(s, fx) {
  s.entrytimr++;
  if (s.baseidx < 3) {
    if (s.entrytimr < 100) fx.entry = [50, s.entrytimr * 3 - 150];
    else if (s.entrytimr < 110) fx.entry = [50, 140];
    else if (s.entrytimr < 170) fx.entry = [50, 140 - (s.entrytimr - 110) * 4];
    else s.entrytimr = 0;
    if (s.entrytimr > 0 && s.entrytimr < 100) s.drawship = false;
    else s.drawship = true;
  } else {
    const x1 = s.digx - 150;
    if (s.entrytimr < 100) fx.entry = [x1, s.entrytimr * 3 - 150];
    else if (s.entrytimr < 110) fx.entry = [x1, 140];
    else if (s.entrytimr < 170) fx.entry = [x1, 140 - (s.entrytimr - 110) * 4];
    else {
      s.menu = true;
      s.startpage = true;
      restart(s);
    }
    if (s.entrytimr < 100) s.drawship = true;
    else s.drawship = false;
  }
}

function drawRain(s, fx) {
  let angle1 = 10;
  if (s.wind) {
    if (s.windspd > 0) angle1 = -3 * s.windspd;
    else angle1 = 3 * s.windspd;
  }
  const inc = toInt(-2.4 * s.rainmode + 30.0);
  const lines = [];
  for (let i = s.rainbegin + toInt(random() * inc); i < s.rainend;
    i += toInt(random() * inc + idiv(inc, 2))) {
    lines.push(i);
  }
  fx.rain = { lines, angle1 };

  if (s.lightningtimr > 0) {
    s.lightningtimr--;
    if (s.lightningtimr <= 0) {
      s.lightningtimr = 0;
      s.xlightning = false;
      s.bolton = false;
      return;
    }
    fx.lightning = s.lightningx;
    if (s.posy < 5.0 && s.digx > s.lightningx - 50 && s.digx < s.lightningx + 50) {
      if (s.echarger > 0 && (s.mode === 3 || s.mode === 5 || s.flame)) {
        // The lightning charger turns a strike into battery charge.
        if (!s.charged) {
          s.charged = true;
          if (s.battery + 60.0 < s.batmax) s.battery += 60.0;
          else s.battery = s.batmax;
        }
        s.bolton = true;
        return;
      }
      if (!s.expls && !s.shieldx) {
        s.hull += 70;
        s.expls = true;
        makeExpl(s);
        if (s.hull > s.hullmax) {
          s.msg = true;
          s.msgstr = 'SHIP DAMAGED!';
          s.damx = s.digx;
          s.damy = s.digy;
        }
      }
    }
  }
}

function drawWind(s, fx) {
  if (!s.rain) {
    let windspd1 = s.windspd;
    if (s.windspd < 0 && s.windspd > -10) windspd1 = -10;
    else if (s.windspd > 0 && s.windspd < 10) s.windspd = 10; // Quirk: sets the wind, not the copy
    for (let i = 0; i < WIND; i++) {
      // Quirk: the casts truncate toward zero, so the random jitter is almost always 0.
      s.windx[i] = s.windx[i] + windspd1 + toInt(random() * 2.0 - 1.0);
      s.windy[i] = s.windy[i] + toInt(random() * 2.0 - 1.0);
      if (s.windx[i] < 0) s.windx[i] = toInt(random() * 100.0 + 700.0);
      if (s.windx[i] > 800) s.windx[i] = toInt(random() * 100.0);
      // Quirk: the vertical checks reset the horizontal position.
      if (s.windy[i] < 0) s.windx[i] = toInt(random() * 50.0 + 200.0);
      if (s.windy[i] > 250) s.windx[i] = toInt(random() * 50.0);
    }
    fx.wind = true; // drawn from windx and windy as they are now
  }
}

function distance(x1, y1, x2, y2) {
  return jround(Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)));
}

function drawSbomb(s, fx) {
  fx.sbomb = s.stimr;
  for (let i = s.framex; i < s.framex + 16; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      const x1 = 50 * (i - s.framex) - 15;
      const y1 = 50 * (j - s.framey) - 15;
      if (j < 100 && (s.map[i][j] === 29 || s.map[i][j] === 30)) {
        // Quirk: the ring is drawn round where it was set off, but shatters round the pod.
        const dist = distance(x1, y1, s.digx, s.digy);
        if (dist <= s.stimr * 20 && s.stimr > 0) s.map[i][j] = 0;
      }
    }
  }
  s.stimr++;
  redraw(s);
  if (s.stimr >= -0.06 * s.posy + 15.0) {
    s.stimr = 0;
    s.sbomb = false;
  }
}

function drawIbomb(s, fx) {
  fx.ibomb = s.itimr;
  let bool = false;
  if (s.map[s.iposx][s.iposy] === MAGMA) bool = true;
  for (let i = s.framex; i < s.framex + 16; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      const x1 = 50 * (i - s.framex);
      const y1 = 50 * (j - s.framey);
      if (j < 100 && (s.map[i][j] === MAGMA || s.map[i][j] === 31)) {
        const dist = distance(x1, y1, s.ibombx, s.ibomby);
        if (dist <= s.itimr * 15 && s.itimr > 0) {
          if (s.map[i][j] === MAGMA) {
            s.map[i][j] = 0;
            s.mapmode[i][j] = int8(toInt(random() * 6.0));
          } else {
            s.map[i][j] = 30;
          }
        }
      }
    }
  }
  if (bool) {
    s.map[s.iposx][s.iposy] = MAGMA;
    s.mapmode[s.iposx][s.iposy] = MAGMA;
  }
  s.itimr++;
  redraw(s);
  if (s.itimr >= -0.01 * s.temp + 15.0 || s.itimr >= 15) {
    s.itimr = 0;
    s.ibomb = false;
  }
}

function drawRbomb(s, fx) {
  fx.rbomb = s.rtimr;
  s.rtimr++;
  if (s.rtimr === 30) {
    s.rtimr = 0;
    s.rbomb = false;
    modifyMinerals(s);
  }
}

function drawNucb(s, fx) {
  fx.nucb = s.nuctimr;
  for (let i = s.framex; i < s.framex + 16; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      // Fix: rows below the map are skipped. With the view at the bottom the original wrote
      // past the map, which threw and stopped the game for good.
      if (j >= MAP_H) continue;
      const x1 = 50 * (i - s.framex) + 25;
      const y1 = 50 * (j - s.framey) + 25;
      const dist = distance(x1, y1, s.nucbx, s.nucby);
      if (dist <= s.nuctimr * 15 && s.nuctimr > 0) s.map[i][j] = SPACE;
    }
  }
  s.nuctimr++;
  if (s.nuctimr === s.nucrad) {
    s.nucb = false;
    checkMagma(s);
  }
  redraw(s);
}

// The laser cannon: charges while its key is held, fires while the charge runs down.
function drawLaser(s, fx) {
  if (s.mode !== 1) {
    s.laser_bar = false;
    s.lasertimr = 0;
  } else {
    if (s.lasertimr > 0) {
      let inc1 = 1;
      if (!s.laser_bar) inc1 = 2;
      if (s.battery > 0.0) {
        s.battery -= inc1;
      } else {
        if (!(s.fuel > 0.0)) return;
        s.fuel -= inc1;
      }
      fx.laserBar = s.lasertimr * 4;
    }
    if (s.laser_bar && s.cannonx) {
      if (s.lasertimr < 50) s.lasertimr++;
    } else if (s.lasertimr > 0) {
      s.lasertimr--;
      if (s.iposy < 5) {
        fx.laser = { surface: true, right: s.right_side, pos1: 0 };
        return;
      }
      let posx1 = 0;
      if (s.right_side) {
        posx1 = s.framex + 16;
        let end1 = s.framex + 24;
        if (end1 > 5000) end1 = 5000;
        for (let i = s.iposx; i < end1; i++) {
          if (s.map[i][s.iposy] < 75) {
            posx1 = i;
            break;
          }
        }
        fx.laser = { surface: false, right: true, pos1: (posx1 - s.framex) * 50 };
      } else {
        posx1 = s.framex;
        let init = s.framex - 8;
        if (init < 0) init = 0;
        for (let ix = s.iposx; ix >= init; ix--) {
          if (s.map[ix][s.iposy] < 75) {
            posx1 = ix;
            break;
          }
        }
        fx.laser = { surface: false, right: false, pos1: (posx1 - s.framex) * 50 + 47 };
      }

      if (s.lasertimr % 8 === 7 && s.iposy > 4) {
        // Every 8 steps the beam breaks the tile it reaches.
        let cnt1 = 0;
        if (posx1 > 4999) posx1 = 4999;
        for (let ixx = 0; ixx < SHM; ixx++) {
          if (!s.grexists[ixx]) {
            if (++cnt1 > 7) break;
            s.grexists[ixx] = true;
            s.grxspd[ixx] = 4.0 * random() - 2.0;
            s.gryspd[ixx] = 4.0 * random() + 6.0;
            if (random() < 0.5) s.gryspd[ixx] = -s.gryspd[ixx];
            s.grscale[ixx] = jround(10.0 * random() + 10.0);
            s.grtype[ixx] = 0;
            s.grx[ixx] = (posx1 - s.framex) * 50 + 25;
            s.gry[ixx] = s.digy - 25;
            if (random() < 0.6) {
              if (s.map[posx1][s.iposy] === 30) s.grtype[ixx] = 2;
              else if (s.map[posx1][s.iposy] === 29) s.grtype[ixx] = 1;
            }
          }
        }
        if (s.map[posx1][s.iposy] === 33 && s.mapmode[posx1][s.iposy] > 0) {
          s.mapmode[posx1][s.iposy]--;
          return;
        }
        if (s.map[posx1][s.iposy] >= 51 && s.map[posx1][s.iposy] <= 53) {
          // A bomb mineral hit by the beam goes off.
          s.nucb = true;
          s.nucbx = (posx1 - s.framex) * 50 + 25;
          s.nucby = (s.iposy - s.framey) * 50 + 25;
          s.nuctimr = 0;
          if (s.map[posx1][s.iposy] === 51) {
            s.nucrad = 10;
            s.hull += 200;
          } else if (s.map[posx1][s.iposy] === 52) {
            s.nucrad = 14;
            s.hull += 500;
          } else if (s.map[posx1][s.iposy] === 53) {
            s.nucrad = 20;
            s.hull += 1500;
          }
          // Fix: damage from a nuclear blast wrecks the pod like any other damage; the original
          // let it drive on over the hull's limit (see docs/mlu2/fixes.md).
          if (s.hull > s.hullmax) {
            s.msg = true;
            s.msgstr = 'SHIP DAMAGED!';
            s.damx = s.digx;
            s.damy = s.digy;
          }
        }
        s.map[posx1][s.iposy] = SPACE;
        checkMagma(s);
        redraw(s);
      }
    }
    if (s.lasertimr === 0) s.cannonx = false;
  }
}
