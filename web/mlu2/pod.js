// pod: One iteration of the play loop, in the original order: the game clock and the surface
// melting and freezing, temperature, bonuses, lava, transmission triggers, ice9, teleporting,
// the ice bomb's thaw, nanobots, the surface weather (wind, acid rain and lightning, meteors,
// volcanic ash), weight and frost, the tractor beam, the jet glider, flying, driving, drilling,
// falling and landing, energy use and engine load, base entry, earthquakes and lava glow.
// Also what the pod collects (mineral), the sonic cannon's blast (boom), the radiation bomb's
// mineral change (modifyMinerals), the inventory sphere (loadShip), the transmissions
// (loadTrans), and the TextPanel and Bullet records.
// Specification: docs/mlu2/specifications.md, The pod (8).

import { MAGMA, SPACE, SHM, RCK, BASE, RW, RH } from './data.js';
import { idiv, toInt, jround, random } from './jmath.js';
import { meltSurface, freezeSurface, shiftx, shifty, randomTel, baseTel, backColor, redraw,
  loadAsh, setWeight, checkMagma, rockfall, makeQuake, makeBombs } from './world.js';
import { enterBase, makeString, getMineralProfit } from './shop.js';
import { makeExpl, makeGr } from './effects.js';
import { loadHull } from './sprites.js';
import { getName, getPrice, getWeight, getRx } from './stats.js';
import { missionUpdateOne, isCompleted } from './mission.js';
import { decryptString, FINISHED } from './savefile.js';
import { flipName } from './assets.js';

/** A block of text broken into lines of about w characters, drawn step pixels apart. */
export function makeTextPanel(msg, x, y, w, step) {
  const panel = { lines: [], x, y, step };
  let begin = 0;
  for (let i = 0; i < msg.length; i++) {
    if (msg.charAt(i) === ' ' || msg.charAt(i) === '\n') {
      const length = i - begin;
      if (length > w - 5 || msg.charAt(i) === '\n') {
        panel.lines.push(msg.substring(begin, i));
        begin = i + 1;
      }
    }
  }
  panel.lines.push(msg.substring(begin, msg.length));
  return panel;
}

/** Appends one line to a text panel. */
export function addLine(panel, msg) {
  panel.lines.push(msg);
}

/** A meteor or laser shot: its kind (1-3 laser powers, 4 meteor), position, speed, size, damage. */
export function makeBullet(mode, x, y) {
  const b = { mode, x, y, xspeed: 0, yspeed: 0, width: 0, height: 0, damage: 0 };
  if (b.mode === 1) {
    b.width = 4;
    b.height = 2;
    b.damage = 10;
  } else if (b.mode === 2) {
    b.width = 13;
    b.height = 4;
    b.damage = 50;
  } else if (b.mode === 3) {
    b.width = 16;
    b.height = 9;
    b.damage = 120;
  } else if (b.mode === 4) {
    b.width = 80;
    b.height = 40;
    b.damage = 300;
  }
  return b;
}

// Scrolls the view one step right or left when the pod nears the screen edge (the pattern the
// loop repeats; `third` adds the last one-column step at the far right).
function scrollRight(s, third) {
  if (s.framex < 4982) {
    s.framex += 3;
    shiftx(s, -150);
  } else if (s.framex === 4982) {
    s.framex += 2;
    shiftx(s, -100);
  } else if (third && s.framex === 4983) {
    s.framex++;
    shiftx(s, -50);
  }
}

function scrollLeft(s) {
  if (s.framex > 2) {
    s.framex -= 3;
    shiftx(s, 150);
  } else if (s.framex === 2) {
    s.framex -= 2;
    shiftx(s, 100);
  }
}

function shipDamaged(s) {
  s.msg = true;
  s.msgstr = 'SHIP DAMAGED!';
  s.damx = s.digx;
  s.damy = s.digy;
}

// The wind pushes a hovering or falling pod near the surface.
function windDrift(s) {
  if (s.wind && s.iposy < 5 && s.map[s.fposx][s.iposy] >= 75 && s.map[s.cposx][s.iposy] >= 75) {
    s.posx = s.posx + 0.02 * toInt(0.3 * s.windspd);
    s.digx = s.digx + toInt(0.3 * s.windspd);
    if (s.digx > RW - 200) {
      scrollRight(s, false);
    } else if (s.digx < 100) {
      scrollLeft(s);
    }
  }
}

/** One iteration of the game loop, everything before the frame is drawn. */
export function tickPlay(s) {
  if (!s.menu && !s.status && !s.trans) {
    const map = s.map;
    const mapmode = s.mapmode;
    s.time++;
    if (s.time % 300 === 0) {
      s.minutes++;
      if (s.minutes === 60) {
        s.hours++;
        s.minutes = 0;
        if (s.hours === 8) {
          s.hours = 0;
          s.days++;
        }
      }

      if (s.hours === 3 && s.minutes % 6 === 0) {
        meltSurface(s, 83.333 * s.minutes);
      } else if (s.hours === 5 && s.minutes % 6 === 0) {
        freezeSurface(s, 83.333 * s.minutes);
      }
    }

    s.iposx = jround(s.posx);
    s.cposx = Math.ceil(s.posx);
    s.cposy = Math.ceil(s.posy);
    s.fposx = Math.floor(s.posx);
    s.fposy = Math.floor(s.posy + 0.01);
    s.iposy = jround(s.posy);
    let fs = 0.0015; // energy used this tick
    s.prev = s.digy;
    s.depth = (s.iposy - 4) * 10;
    const hrs = 1.0 * s.hours + 1.0 * s.minutes / 60.0 + 1.0 * (s.time % 300) / 19000.0;
    s.temp = toInt((800.0 * Math.sin(0.83 * (hrs - s.posx / 5000.0) + 4.5) + 400.0)
      * (-0.007 * s.posy + 1.0) - 2.0 * s.posy);
    if (s.magmaex) {
      s.temp += 100;
    }

    if (s.temp > s.tempmax) {
      s.msg = true;
      s.msgstr = 'OVERHEAT!';
    }

    if (s.fuel <= 0.0 && !s.msg) {
      s.msg = true;
      s.msgstr = 'FUEL TANK EMPTY!';
    }

    if (s.score > s.bonus && s.bonus > 0 && s.score < 1000000000 && !s.end) {
      s.money = s.money + idiv(s.bonus, 10);
      s.moneystr = makeString(s.money);
      s.labl2 = true;
      s.labl2x = s.digx;
      s.labl2y = s.digy - 30;
      s.labl2timr = 0;
      s.labl2str1 = 'Bonus - $' + idiv(s.bonus, 10);
      s.labl2str2 = '';
      const f = s.score_factor;
      if (s.bonus === 100 * f) {
        s.bonus = 500 * f;
      } else if (s.bonus === 500 * f) {
        s.bonus = 2000 * f;
      } else if (s.bonus === 2000 * f) {
        s.bonus = 10000 * f;
      } else if (s.bonus === 10000 * f) {
        s.bonus = 100000 * f;
      } else if (s.bonus === 100000 * f) {
        s.bonus = 300000 * f;
      } else if (s.bonus === 300000 * f) {
        s.bonus = 1000000 * f;
      } else if (s.bonus === 1000000 * f) {
        s.bonus = 2500000 * f;
      } else if (s.bonus === 2500000 * f) {
        s.bonus = 10000000 * f;
      } else if (s.bonus === 10000000 * f) {
        s.bonus = 20000000 * f;
      } else if (s.bonus === 20000000 * f) {
        s.bonus = 200000000 * f;
      }
    }

    if (mapmode[s.iposx][s.iposy] === MAGMA && !s.shieldx) {
      s.hull += 10;
      s.temp += 100;
      if (!s.expls && !s.shieldx) {
        makeExpl(s);
      }

      if (s.temp > s.tempmax && s.ice9 < 0.0) {
        s.msg = true;
        s.msgstr = 'OVERHEAT!';
      }

      if (s.hull > s.hullmax) {
        shipDamaged(s);
      }
    }

    // Transmissions start when the pod passes their column.
    if (s.iposx >= s.transarr[s.transc] && !s.trans && s.entrytimr === 0) {
      let b1 = true;
      if (s.transc === 16 && s.iposy > 4) {
        b1 = false;
      }

      if (b1) {
        const msgstr = loadTrans(s, s.transarr[s.transc]);
        s.trans_cur = s.transc;
        s.panel = makeTextPanel(msgstr, 140, 150, 60, 15);
        s.trans = true;
        s.selx = 1;
        s.sely = 0;
        s.mineralprofit = makeString(getMineralProfit(s));
        if (s.transc === 12) {
          s.baseok[0] = false;
        } else if (s.transc === 15) {
          s.baseok[1] = false;
        }

        // Fix: the sounds stop when the transmission opens. The original also stopped them on
        // every tick while the last transmission waited for the pod to come up to the surface
        // (see docs/mlu2/fixes.md, "Sound cut out near the end of the map").
        if (s.sounds) {
          s.sfx.stopAll();
        }
      }
    }

    if (s.ice9 > 0.0 && s.temp > -100) {
      let icedec = 4.54E-6 * s.temp + 4.54E-4;
      if (icedec < 0.001) {
        icedec = 0.001;
      }

      if (mapmode[s.iposx][s.iposy] === MAGMA) {
        icedec += 0.003;
      }

      s.ice9 -= icedec;
    }

    if (s.teltimr > 0) {
      s.teltimr++;
      if (s.teltimr === 20) {
        s.teltimr = 0;
        if (s.telmode === 1) {
          randomTel(s);
        } else if (s.telmode === 2) {
          baseTel(s);
        }

        for (let i = 0; i < SHM; i++) {
          s.grexists[i] = false;
        }

        s.labl1 = false;
        s.labl2 = false;
        s.expls = false;
        s.earthq = false;
        if (s.sounds) {
          s.sfx.stopAll();
        }

        backColor(s, s.temp);
        redraw(s);
      }
    }

    // The ice bomb's freeze ends: lava on screen hardens into rock.
    if (s.freezetimr > 0) {
      s.freezetimr--;
      if (s.freezetimr === 0 && (s.iposx < 3000 || s.iposx > 4400)) {
        for (let i = s.framex; i < s.framex + 16; i++) {
          for (let j = s.framey; j < s.framey + 12; j++) {
            if (i < 5000 && j < 100 && map[i][j] === MAGMA && (i !== s.iposx || j !== s.iposy)) {
              map[i][j] = 0;
              mapmode[i][j] = toInt(random() * 6.0);
            }
          }
        }
      }
    }

    if (s.nanobots && s.time % 40 === 0 && s.hull >= 1) {
      s.hull--;
    }

    // Unstable cargo (mineral 27) can blow up.
    if (s.minerals[27] > 1 && random() < 1.0E-4 && !s.msg) {
      s.hull = s.hullmax + toInt(random() * 500.0);
      makeExpl(s);
      if (s.hull > s.hullmax) {
        shipDamaged(s);
      }
    }

    // Surface weather, while the view shows the surface.
    if (s.framey < 6) {
      if (!s.wind && random() < 5.0E-4 && s.posx > 500.0) {
        s.wind = true;
        s.windtimr = toInt(random() * 1000.0 + 2000.0);
        s.windspd = toInt(random() * 3.0 + 3.0);
        if (random() < 0.5) {
          s.windspd = -s.windspd;
        }

        s.windincr = true;
      } else {
        // Quirk: this runs also when there is no wind, so windtimr keeps counting down.
        s.windtimr--;
        if (s.windtimr === 0) {
          s.windincr = false;
        }

        if (random() < 5.0E-4) {
          if (s.windspd > 0) {
            if (s.windincr && s.windspd < 20) {
              s.windspd++;
            } else if (!s.windincr) {
              s.windspd--;
            }

            if (s.windspd < 6 && !s.windincr) {
              s.wind = false;
            }
          } else {
            if (s.windincr && s.windspd > -20) {
              s.windspd--;
            } else if (!s.windincr) {
              s.windspd++;
            }

            if (s.windspd > -6 && !s.windincr) {
              s.wind = false;
            }
          }
        }
      }

      if (!s.rain && random() < 3.0E-4 && s.temp > -120 && s.temp < 600 && s.posx > 300.0) {
        s.rain = true;
        s.raininc = true;
        s.rainmode = 0;
        s.raintimr = toInt(random() * 500.0 + 1000.0);
        if (s.sounds) {
          s.sfx.loop('rain');
        }
      } else if (s.rain) {
        if (s.temp < -120 || s.temp > 600) {
          s.rain = false;
          // Fix: the rain sound stops with the rain (see docs/mlu2/fixes.md, "The rain sound
          // kept playing after the rain stopped").
          if (s.sounds) {
            s.sfx.stop('rain');
          }
        }

        if (random() < 0.01 && !s.xlightning) {
          s.xlightning = true;
          s.lightningtimr = 12;
          s.charged = false;
          s.lightningx = toInt(random() * 800.0);
          if (s.lightningx < s.rainbegin || s.lightningx > s.rainend) {
            s.xlightning = false;
            s.lightningtimr = 0;
          }

          if (s.sounds) {
            s.sfx.play('thunder');
          }
        }

        if (s.iposy < 5 && !s.shieldx) {
          s.raindamage = s.raindamage + (0.004 * s.rainmode + 0.005);
          if (s.raindamage >= 1.0) {
            s.hull++;
            s.raindamage = 0.0;
            if (s.hull > s.hullmax) {
              shipDamaged(s);
            }
          }
        }

        if (s.raininc) {
          s.raintimr--;
          if (s.raintimr === 0) {
            s.raininc = false;
          }

          if (s.rainmode > 5 && random() < 0.001) {
            s.raininc = false;
          }

          if (s.rainmode === 10) {
            s.raininc = false;
          }

          if (random() < 0.001) {
            s.rainmode++;
          }
        } else {
          if (s.rainmode < 0) {
            s.rain = false;
            s.xlightning = false;
            s.bolton = false;
            if (s.sounds) {
              s.sfx.stop('rain');
            }
          }

          if (random() < 0.001) {
            s.rainmode--;
          }
        }
      }

      // Meteors, once the pod has gone far enough east.
      if (random() < 0.003 && (s.xmax > 3000 && s.iposx > 3000 || s.xmax > 3500 && s.iposx > 1500)) {
        const bullet = makeBullet(4, toInt(random() * 799.0 + 1.0), -50);
        const speed1 = random() * 10.0 + 20.0;
        const dir = random() * 1.0 - 0.5;
        bullet.xspeed = toInt(speed1 * Math.sin(dir));
        bullet.yspeed = toInt(speed1 * Math.cos(dir));
        s.bullets.push(bullet);
      }

      // Volcanic ash clouds.
      if (s.iposy < 5 && (map[s.iposx][4] === 81 || map[s.iposx][2] === 81) && !s.shieldx) {
        if (random() < 0.3) {
          s.hull++;
        }

        if (s.hull > s.hullmax) {
          shipDamaged(s);
        }

        if (random() < 0.02) {
          s.up_key = false;
          s.right_key = false;
          s.left_key = false;
        }

        fs += 0.02;
      }

      if (random() < 2.0E-4 && !s.ashon) {
        loadAsh(s);
      } else if (random() < 1.0E-4 && s.ashon) {
        s.ashon = false;

        for (let i = s.framex; i < s.framex + 16; i++) {
          if (map[i][4] === 81) {
            map[i][4] = 80;
          }

          if (map[i][2] === 81) {
            map[i][2] = 80;
          }
        }
      }
    }

    // Weight, frost and the periodic field refresh.
    if (s.time % 100 === 99) {
      setWeight(s);
      if (s.temp < s.tempmin) {
        s.frostlevel = s.frostlevel - toInt(0.05 * s.temp);
        if (s.frostlevel > 300) {
          s.frostlevel = 300;
        }
      } else {
        let frate = toInt(0.04 * (s.temp - s.tempmin) + 4.0);
        if (frate > 20) {
          frate = 20;
        }

        s.frostlevel -= frate;
        if (s.frostlevel < 0) {
          s.frostlevel = 0;
        }
      }

      if (s.frostlevel >= 250) {
        s.msg = true;
        s.msgstr = 'SHIP FROZEN!';
        s.iced = true;
        s.flame = false;
        s.up_key = false;
        s.left_key = false;
        s.right_key = false;
        s.mode = 1;
      }

      if (s.time > s.redrawtime + 90) {
        backColor(s, s.temp);
        redraw(s);
      }
    }

    // The tractor beam pulls in the block next to the pod.
    if (s.ctrl && s.tractor === 1 && s.mode === 1 && s.battery + s.fuel >= 30.0 && !s.tr) {
      if (s.right_key && s.iposx < 4999) {
        s.tr = true;
        s.trdir = 0;
        mineral(s, s.iposx + 1, s.iposy);
      } else if (s.up_key) {
        s.tr = true;
        s.trdir = 1;
        mineral(s, s.iposx, s.iposy - 1);
      } else if (s.left_key && s.iposx > 0) {
        s.tr = true;
        s.trdir = 2;
        mineral(s, s.iposx - 1, s.iposy);
      } else if (s.down_key) {
        s.tr = true;
        s.trdir = 3;
        mineral(s, s.iposx, s.iposy + 1);
      }

      if (s.tr) {
        redraw(s);
        if (s.battery >= 30.0) {
          s.battery -= 30.0;
        } else {
          s.fuel = s.fuel - (30.0 - s.battery);
          s.battery = 0.0;
        }
      }
    }

    // The jet glider.
    if (s.flame && s.fuel + s.battery > 0.0) {
      if (s.right_side) {
        s.posx = s.posx + 0.02 * s.glidespd;
        s.digx = toInt(s.digx + s.glidespd);
        if (s.glidespd < s.glidemax) {
          s.glidespd += 0.1;
        }

        if (s.digx > RW - 200) {
          scrollRight(s, false);
          s.iposx = jround(s.posx);
          s.digx = 50 * (s.iposx - s.framex) - 10;
        }
      } else {
        s.posx = s.posx - 0.02 * s.glidespd;
        s.digx = toInt(s.digx - s.glidespd);
        if (s.glidespd < s.glidemax) {
          s.glidespd += 0.1;
        }

        if (s.digx < 150) {
          scrollLeft(s);
          s.iposx = jround(s.posx);
          s.digx = 50 * (s.iposx - s.framex) - 10;
        }
      }

      fs += 1.5E-5 * (1300 + s.weight + s.cargo + s.fuel) + 0.01;
      if (s.wind) {
        s.posx = s.posx + 0.02 * toInt(0.3 * s.windspd);
        s.digx = s.digx + toInt(0.3 * s.windspd);
      }

      // Fix: the glider stops at the edge of the map. The original glided on past it (possible
      // once the base at that end is destroyed), read outside the map and stopped the game for
      // good (see docs/mlu2/fixes.md, "Gliding off the edge of the map").
      if (s.iposx < 0 || s.iposx > 4999 || s.cposx < 0 || s.cposx > 4999) {
        s.flame = false;
        s.glidespd = 0.0;
        s.posx = Math.min(Math.max(s.posx, 0), 4999);
        s.iposx = jround(s.posx);
        s.cposx = s.iposx;
      } else if (mapmode[s.iposx][5] === MAGMA) {
        s.flame = false;
        s.glidespd = 0.0;
      }

      if (map[s.cposx][4] !== SPACE) {
        s.flame = false;
        s.glidespd = 0.0;
        if (!s.shieldx) {
          if (!s.expls) {
            makeExpl(s);
          }

          s.hull += 10;
          if (s.hull > s.hullmax) {
            shipDamaged(s);
          }
        }
      }
    }

    // Flying up.
    if (s.up_key && s.digtimr === 0 && !s.ctrl && !s.flame) {
      s.timr1++;
      s.gastimr++;
      fs += 5.0E-6 * (1300 + s.weight + s.cargo + s.fuel) + 0.002;
      if (map[s.iposx][s.iposy] >= 75 && map[s.iposx][s.fposy] >= 75 && s.iposy > 0
        && s.fuel + s.battery > 0.0) {
        if (!s.is_prop && s.sounds) {
          s.sfx.loop('prop');
          s.is_prop = true;
        }

        const vmax = jround(-0.04 * idiv(100 * s.rpm, s.engmax) + 7.0);
        s.vspd = idiv((vmax - 1) * s.gastimr, 50) + 1;
        if (s.vspd > 5) {
          s.vspd = 5;
        }

        // Quirk: never true here, the branch requires !flame.
        if (s.flame) {
          s.vspd = idiv(20 * s.vspd, 8);
        }

        if (mapmode[s.iposx][s.iposy] === MAGMA) {
          s.vspd = 4;
        }

        s.posy = s.posy - 0.02 * s.vspd;
        s.digy = s.digy - s.vspd;
        if (s.digy < 150 && s.iposy > 2 && s.framey > 2) {
          s.framey -= 3;
          shifty(s, 150);
        }

        s.mode = 3;
      } else if (s.flame && s.prev === s.digy && !s.expls && s.framey > 0 && !s.shieldx) {
        s.hull += 3;
        makeExpl(s);
      }

      windDrift(s);
    } else if (s.is_prop) {
      s.is_prop = false;
      s.sfx.stop('prop');
    }

    // Driving sideways.
    // Fix: a dig started by a key since the last tick counts as drilling; the original drove on
    // its first tick too, adding the driving load to the engine and pushing the pod off its tile
    // (see docs/mlu2/fixes.md, "Digging while holding an arrow key could cause engine failure").
    const idle = s.digtimr === 0 && s.mode !== 2 && s.mode !== 4;
    if (s.right_key && s.cposx <= 4999) {
      if (!s.ctrl
        && idle
        && map[s.iposx][s.iposy] >= 75
        && map[s.cposx][s.iposy] >= 75
        && s.fuel + s.battery > 0.0
        && !s.flame) {
        s.right_side = true;
        s.posx = s.posx + 0.02 * s.hspd;
        s.digx = s.digx + s.hspd;
        if (s.digx > RW - 200) {
          scrollRight(s, true);
        }

        if (!s.up_key) {
          fs += 2.0E-6 * (2000 + s.cargo + s.fuel) + 0.0015;
        } else {
          fs += 1.0E-6 * (1300 + s.weight + s.cargo + s.fuel) + 5.0E-4;
        }
      }
    } else if (s.left_key
      && s.fposx >= 0
      && !s.ctrl
      && idle
      && map[s.iposx][s.iposy] >= 75
      && map[s.fposx][s.iposy] >= 75
      && s.fuel + s.battery > 0.0
      && !s.flame) {
      s.right_side = false;
      s.posx = s.posx - 0.02 * s.hspd;
      s.digx = s.digx - s.hspd;
      if (s.digx < 100) {
        scrollLeft(s);
      }

      if (!s.up_key) {
        fs += 2.0E-6 * (2000 + s.cargo + s.fuel) + 0.0015;
      } else {
        fs += 1.0E-6 * (1300 + s.weight + s.cargo + s.fuel) + 5.0E-4;
      }
    }

    // Drilling down (mode 4) or sideways (mode 2); the sonic cannon replaces the drill.
    if (!s.scannon) {
      if (s.mode === 4) {
        s.digtimr++;
        makeGr(s);
        s.posy += 0.02;
        s.digy++;
        fs += -1.5E-4 * s.temp + 0.01;
        if (fs < 0.01) {
          fs = 0.01;
        }

        fs *= 0.03 * s.posy + 1.0;
        if (s.digy > RH - 200) {
          s.framey += 3;
          shifty(s, -150);
        } else if (s.digtimr === 45) {
          if (s.sounds) {
            s.sfx.stop('drill');
          }

          mineral(s, s.iposx, s.iposy);
          map[s.iposx][s.iposy] = SPACE;
          s.score++;
          checkMagma(s);
          s.scorestr = makeString(s.score);
          rockfall(s);
          redraw(s);
          s.rdr = false;
        }

        if (s.digtimr === 50) {
          s.digtimr = 0;
          s.mode = 1;
        }

        if (s.drill < 0.0) {
          s.drill = 0.0;
        }
      } else if (s.mode === 2) {
        s.digtimr++;
        makeGr(s);
        fs += -1.5E-4 * s.temp + 0.01;
        if (fs < 0.01) {
          fs = 0.01;
        }

        fs *= 0.03 * s.posy + 1.0;
        if (!s.right_side) {
          s.posx -= 0.02;
          s.digx--;
          if (s.digx < 100) {
            scrollLeft(s);
          }
        } else {
          s.posx += 0.02;
          s.digx++;
          if (s.digx > RW - 200) {
            scrollRight(s, true);
          }
        }

        if (s.digtimr === 45) {
          if (s.sounds) {
            s.sfx.stop('drill');
          }

          mineral(s, s.iposx, s.iposy);
          map[s.iposx][s.iposy] = SPACE;
          s.score++;
          s.scorestr = makeString(s.score);
          rockfall(s);
          checkMagma(s);
          redraw(s);
        }

        if (s.digtimr === 50) {
          s.digtimr = 0;
          s.mode = 1;
        }

        if (s.drill < 0.0) {
          s.drill = 0.0;
        }
      }
    }

    // Falling, and landing.
    if (s.fposy < 101
      && map[s.iposx][s.fposy + 1] >= 75
      && (!s.up_key || s.fuel + s.battery < 0.0)
      && s.digtimr === 0
      && s.timr2 === 0
      && !s.status
      && !s.flame) {
      s.mode = 5;
      s.timr1++;
      if (s.fallspd < s.termspd) {
        s.fallspd += 0.05;
      }

      if (mapmode[s.iposx][s.iposy] === MAGMA) {
        s.fallspd = 4.0;
      }

      s.posy = s.posy + 0.02 * s.fallspd;
      s.digy = s.digy + jround(s.fallspd);
      if (s.digy > RH - 200) {
        s.framey += 3;
        shifty(s, -150);
      }

      if (map[s.iposx][Math.floor(s.posy + 0.01)] < 47) {
        s.timr1 = 0;
        s.mode = 1;
        s.fallspd = 7.0;
      }

      if (s.temp > s.tempmax && s.ice9 < 0.0) {
        s.msg = true;
        s.msgstr = 'OVERHEAT!';
      }

      windDrift(s);
    } else if (!s.up_key && s.mode === 5) {
      if (!s.shieldx && s.fallspd > 8.0) {
        s.hull = s.hull + toInt(0.1 * s.fallspd * s.fallspd - 4.0);
        makeExpl(s);
      }

      s.timr1 = 0;
      s.mode = 1;
      s.fallspd = 7.0;
    }

    // Energy use and engine load.
    if (s.ice9 <= 0.0 && s.temp > 50) {
      fs += s.radf;
    }

    if (s.temp < -10) {
      fs += s.heatf;
    }

    if (s.battery <= 0.0) {
      s.fuel -= fs;
    } else {
      s.battery -= fs;
    }

    s.rpm = jround(5500.0 * fs);
    if (s.rpm > s.engmax && !s.msg) {
      s.msg = true;
      s.msgstr = 'ENGINE FAILURE!';
    }

    // Settling onto a block when nothing moved.
    if (s.digy === s.prev && !s.up_key && s.digtimr === 0) {
      s.digy = (-s.framey + s.iposy + 1) * 50;
      s.mode = 1;
      if (map[s.iposx][s.iposy] < 75) {
        s.posy--;
        s.digy -= 50;
      }
    }

    let bbase = -1;

    for (let i = 0; i < BASE; i++) {
      if (s.iposx === s.basex[i] && s.baseok[i] && s.iposy === 4) {
        bbase = i;
        break;
      }
    }

    if (s.depth === 0 && bbase >= 0) {
      s.baseidx = bbase;
      enterBase(s);
    }

    // Falling rocks during an earthquake.
    if (s.earthq) {
      s.eqtimr++;
      if (s.eqtimr > 200) {
        s.eqtimr = 0;
        s.earthq = false;
      }

      if (s.eqtimr < 150 && random() < 0.07 && s.rockfall) {
        for (let ix = 0; ix < RCK; ix++) {
          if (!s.rockexists[ix]) {
            s.rockexists[ix] = true;
            s.rockx[ix] = jround(RW * random());
            s.rocky[ix] = -50;
            s.rockyspd[ix] = toInt(random() * 5.0 + 10.0);
            break;
          }
        }
      }
    }

    if (s.time % 8 === 0 && s.magmaex) {
      if (s.time % 80 === 0) {
        backColor(s, s.temp);
      }

      s.magmatimr++;
      redraw(s);
    }
  }
}

/** The pod hits something: an explosion and the "SHIP DAMAGED!" message. */
export function collision(s) {
  if (!s.expls) {
    makeExpl(s);
    s.explx = s.digx - 10;
    s.exply = s.digy - 20;
  }

  s.msg = true;
  s.msgstr = 'SHIP DAMAGED!';
}

/** The radiation bomb: minerals within its blast on screen may change into others. */
export function modifyMinerals(s) {
  const map = s.map;
  for (let i = s.framex; i < s.framex + 16; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      if (j < 100) {
        const x1 = 50 * (i - s.framex);
        const y1 = 50 * (j - s.framey);
        const dist = jround(Math.sqrt((x1 - s.rbombx) * (x1 - s.rbombx) + (y1 - s.rbomby) * (y1 - s.rbomby)));
        if (dist <= 360) {
          if (map[i][j] === 1) {
            if (random() < 0.05) {
              map[i][j] = 18;
            }
          } else if (map[i][j] === 0) {
            if (random() < 0.5) {
              map[i][j] = 3;
            }
          } else if (map[i][j] === 4) {
            if (random() < 0.15) {
              map[i][j] = 15;
            }
          } else if (map[i][j] === 5) {
            if (random() < 0.25) {
              map[i][j] = 14;
            }
          } else if (map[i][j] === 6) {
            if (random() < 0.5) {
              map[i][j] = 10;
            }
          } else if (map[i][j] === 10) {
            if (random() < 0.2) {
              map[i][j] = 20;
            }
          } else if (map[i][j] === 11) {
            if (random() < 0.15) {
              map[i][j] = 21;
            }
          } else if (map[i][j] === 14) {
            if (random() < 0.5) {
              map[i][j] = 18;
            }
          } else if (map[i][j] === 15) {
            if (random() < 0.12) {
              map[i][j] = 26;
            }
          } else if (map[i][j] === 17) {
            if (random() < 0.15) {
              map[i][j] = 25;
            }
          } else if (map[i][j] === 18) {
            if (random() < 0.3) {
              map[i][j] = 24;
            }
          } else if (map[i][j] === 22) {
            if (random() < 0.22) {
              map[i][j] = 27;
            }
          } else if (map[i][j] === 29) {
            if (random() < 0.4) {
              map[i][j] = 5;
            }
          } else if (map[i][j] === 30) {
            if (random() < 0.3) {
              map[i][j] = 14;
            }
          } else if (map[i][j] === 31) {
            if (random() < 0.5) {
              map[i][j] = 29;
            }
          } else if (s.mapmode[i][j] === MAGMA && map[i][j] !== MAGMA && random() < 0.6) {
            map[i][j] = 0;
          }
        }
      }
    }
  }

  redraw(s);
}

/** The sonic cannon blasts the block to the right (dir 1), left (2) or below (3). */
export function boom(s, dir) {
  const map = s.map;
  let cnt1 = 0;
  s.rdr = false;

  for (let i = 0; i < SHM; i++) {
    if (!s.grexists[i]) {
      if (++cnt1 > 8) {
        break;
      }

      s.grexists[i] = true;
      s.grxspd[i] = 16.0 * random() - 8.0;
      s.gryspd[i] = 16.0 * random() - 8.0;
      s.grscale[i] = jround(10.0 * random() + 10.0);
      s.grtype[i] = 0;
      if (dir === 1) {
        s.grx[i] = s.digx + 50;
        s.gry[i] = s.digy - 20;
      } else if (dir === 2) {
        s.grx[i] = s.digx - 50;
        s.gry[i] = s.digy - 20;
      } else if (dir === 3) {
        s.grx[i] = s.digx + 25;
        s.gry[i] = s.digy + 30;
      }

      if (random() < 0.6) {
        if (dir === 1 && map[s.iposx + 1][s.iposy] === 30) {
          s.grtype[i] = 2;
        } else if (dir === 2 && map[s.iposx - 1][s.iposy] === 30) {
          s.grtype[i] = 2;
        } else if (dir === 3 && map[s.iposx][s.iposy + 1] === 30) {
          s.grtype[i] = 2;
        } else if (dir === 1 && map[s.iposx + 1][s.iposy] === 29) {
          s.grtype[i] = 1;
        } else if (dir === 2 && map[s.iposx - 1][s.iposy] === 29) {
          s.grtype[i] = 1;
        } else if (dir === 3 && map[s.iposx][s.iposy + 1] === 29) {
          s.grtype[i] = 1;
        }
      }
    }
  }

  if (dir === 1 && map[s.iposx + 1][s.iposy] !== 33) {
    mineral(s, s.iposx + 1, s.iposy);
    map[s.iposx + 1][s.iposy] = SPACE;
  } else if (dir === 2 && map[s.iposx - 1][s.iposy] !== 33) {
    mineral(s, s.iposx - 1, s.iposy);
    map[s.iposx - 1][s.iposy] = SPACE;
  } else if (dir === 3 && map[s.iposx][s.iposy + 1] !== 33) {
    mineral(s, s.iposx, s.iposy + 1);
    map[s.iposx][s.iposy + 1] = SPACE;
  }

  if (s.battery >= 30.0) {
    s.battery -= 30.0;
  } else {
    s.fuel = s.fuel - (30.0 - s.battery);
    s.battery = 0.0;
  }

  checkMagma(s);
  redraw(s);
  if (s.sounds) {
    s.sfx.play('boom');
  }

  rockfall(s);
}

/** The pod takes the block at (x, y): drill wear, score, items, hazards and cargo. */
export function mineral(s, x, y) {
  const min = s.map[x][y];
  s.score = s.score + idiv(getPrice(min) * s.score_factor, 10);
  if (!s.tr) {
    if (!s.scannon) {
      let ds = 0.0;
      if (min === 29) {
        ds = -1.8 * s.temp + 100.0;
        if (ds < 100.0) {
          ds = 100.0;
        }

        s.drill -= ds;
      } else if (min === 30) {
        ds = -4.5 * s.temp + 250.0;
        if (ds < 250.0) {
          ds = 250.0;
        }

        s.drill -= ds;
      } else if (min === 32) {
        ds = 1000.0;
        s.drill -= ds;
      }

      ds = (-0.014 * s.temp + 1.0) * (0.015 * s.iposy + 1.0);
      if (ds < 1.0) {
        ds = 1.0;
      }

      s.drill -= ds;
    }

    makeQuake(s);
  }

  if (min >= 42 && min <= 46) {
    // Mega upgrades.
    s.labl1 = true;
    s.labl1timr = 0;
    s.labl1x = s.digx;
    s.labl1y = s.digy;
    s.lablspeed = 3;
    s.score += 1000000;
    s.labl1str2 = '';
    let idx = 0;
    if (min === 42) {
      s.labl1str1 = 'Mega Engine: 3000 HP';
      s.engine = 8;
      s.engmax = 3000;
      idx = 0;
    } else if (min === 43) {
      s.labl1str1 = 'Mega Fuel Tank: 6000 L';
      s.fueltank = 8;
      s.fuelmax = 6000;
      idx = 1;
    } else if (min === 44) {
      s.labl1str1 = 'Mega Cargo Bay: 15000 lbs';
      s.cargobay = 8;
      s.cargomax = 15000;
      idx = 2;
    } else if (min === 45) {
      s.labl1str1 = 'Mega Hull: 2000 Hits';
      s.hullx = 8;
      s.hullmax = 2000;
      idx = 4;
      loadHull(s);
    } else if (min === 46) {
      s.labl1str1 = 'Mega Cooling System: 1200 F';
      s.radiator = 8;
      s.tempmax = 1200;
      s.radf = 0.06;
      idx = 3;
    }

    for (let i = 0; i < 7; i++) {
      s.upgrades[idx][i] = true;
    }

    s.map[x][y] = 0;
  } else if (min >= 56 && min <= 61 && !s.tr) {
    // Ancient gadgets, each announced in a transmission box.
    s.labl1 = true;
    s.labl1timr = 0;
    s.labl1x = s.digx;
    s.labl1y = s.digy;
    s.score += 1000000;
    s.scorestr = makeString(s.score);
    s.labl1str2 = '';
    let msgstr = '';
    if (min === 56) {
      s.cannon = true;
      msgstr = 'You have found the laser cannon. Press \'D\' to start charging the laser; release the key when  it\'s at the desired power level. Warning: the laser takes a lot of energy to use.';
      s.labl1str1 = 'Laser Cannon';
      s.cannon = true;
    } else if (min === 57) {
      s.extractor = true;
      msgstr = 'You have found bomb fuel extractor. It can extract bomb fuel from any bomb you find and use it as dynamite or TNT.';
      s.labl1str1 = 'Nuclear Fuel Extractor';
    } else if (min === 58) {
      s.converter = true;
      msgstr = 'You have found lava energy converter. You can use it to convert heat from lava into energy that goes into your battery by drilling through the lava. It also protects you from the damage from lava.';
      s.labl1str1 = 'Lava Energy Converter';
    } else if (min === 59) {
      s.scannon = true;
      msgstr = 'You have found sonic cannon. With it you can blast the hardest rock in four directions around you.';
      s.labl1str1 = 'Sonnic Cannon';
      s.scannonl = 'images/soniccannon.png';
      s.scannonr = flipName(s.scannonl);
    } else if (min === 60) {
      s.nanobots = true;
      msgstr = 'You have found self-replicating nanobots. They slowly repair your ship when it is damaged.';
      s.labl1str1 = 'Nanobots';
    } else if (min === 61) {
      s.iceconverter = true;
      msgstr = 'You have found ice9 converter. You can use it to convert 3 lbs. of ice9 into an ice bomb.';
      s.labl1str1 = 'Ice9 Converter';
    }

    if (!s.newbar && s.converter && s.extractor && s.cannon && s.nanobots && s.iceconverter) {
      s.newbar = true;
      s.bar2 = 'images/bartop2.png';
    }

    s.trans_cur = s.transc;
    s.panel = makeTextPanel(msgstr, 140, 150, 60, 15);
    s.trans = true;
    s.selx = 1;
    s.sely = 0;
    s.mineralprofit = makeString(getMineralProfit(s));
    s.digtimr = 0;
    s.transc--;
  } else if (min === 28) {
    // Gas pocket.
    if ((s.gasb === 0 || s.tr || s.scannon || random() < 8.0E-4 * s.temp - 0.16) && !s.shieldx) {
      s.hull += 20;
      makeExpl(s);
    } else if (s.battery + 50.0 <= s.batmax) {
      s.battery += 50.0;
      s.score += 100;
    }
  } else if (min === 31) {
    if (!s.converter && !s.shieldx) {
      s.hull += 100;
      makeExpl(s);
      s.temp += 100;
    } else if (s.battery < s.batmax - 80) {
      s.battery += 80.0;
      s.score += 80;
      s.temp += 100;
    }
  } else if (min === 54 && !s.tr) {
    // Fuel cache.
    s.labl1 = true;
    s.labl1timr = 0;
    s.labl1x = s.digx;
    s.labl1y = s.digy;
    s.lablspeed = 3;
    s.score += 1000;
    s.scorestr = makeString(s.score);
    s.labl1str2 = '';
    const amnt = toInt(random() * 200.0 + 100.0);
    const fuel0 = toInt(s.fuel);
    if (s.fuel + amnt < s.fuelmax) {
      s.fuel += amnt;
    } else {
      s.fuel = s.fuelmax;
    }

    s.labl1str1 = toInt(s.fuel - fuel0) + ' L of fuel';
    setWeight(s);
  } else if (min === 55 && !s.tr) {
    // Inventory sphere.
    s.ximgs[3] = 'images/ship_window.png';
    loadShip(s);
    s.timr55 = 1;
    s.map[x][y] = 0;
  }

  if (getWeight(min) !== 0) {
    if (s.sounds) {
      s.sfx.play('clank');
    }

    if (getWeight(min) + s.cargo <= s.cargomax) {
      const str1 = getName(min);
      let str2 = '' + idiv(getPrice(min) * s.money_factor, 10) + '$  ' + getWeight(min);
      if (min !== 27) {
        str2 = str2 + ' lb';
      } else {
        str2 = str2 + ' oz';
      }

      s.labl1 = true;
      s.labl1x = s.digx;
      s.labl1y = s.digy;
      s.labl1timr = 0;
      s.lablspeed = 3;
      s.labl1str1 = str1;
      s.labl1str2 = str2;
      if (min > 46) {
        if (min === 47) {
          s.mith++;
        } else if (min === 48) {
          s.unob++;
        } else if (min === 49) {
          s.adam++;
        } else if (min === 50) {
          if (s.ice9 > 0.0) {
            s.ice9max = 10 + Math.ceil(s.ice9);
          } else {
            s.ice9max = 10;
          }

          s.ice9 += 10.0;
        } else if (min === 51) {
          s.bomb1++;
          s.nux += 50;
          s.score += 30000;
        } else if (min === 52) {
          s.bomb2++;
          s.nux += 100;
          s.score += 100000;
        } else if (min === 53) {
          s.bomb3++;
          s.nux += 300;
          s.score += 250000;
        }

        if (min !== 50) {
          s.cargo = s.cargo + getWeight(min);
        }

        makeBombs(s);
      } else {
        s.minerals[min]++;
        s.cargo = s.cargo + getWeight(min);
        s.rx = s.rx + getRx(min);
      }

      // The processor turns fuel minerals into battery charge.
      if (min === 1 && s.coalb === 1 && s.battery + 10.0 <= s.batmax && s.processor) {
        s.battery += 10.0;
        s.minerals[min]--;
        s.cargo -= 40;
      } else if (min === 2 && s.petrolr === 1 && s.battery + 20.0 <= s.batmax && s.processor) {
        s.battery += 20.0;
        s.minerals[min]--;
        s.cargo -= 50;
      } else if (min === 20 && s.processor) {
        if (s.nuc === 1 && s.nucx === 0 && s.battery + 100.0 <= s.batmax) {
          s.battery += 100.0;
          s.minerals[min]--;
          s.cargo -= 35;
          s.rx -= 100;
        }

        if (s.nucx === 1 && s.battery + 200.0 <= s.batmax) {
          s.battery += 200.0;
          s.minerals[min]--;
          s.cargo -= 35;
          s.rx -= 100;
        }
      } else if (min === 21 && s.processor) {
        if (s.nuc === 1 && s.nucx === 0 && s.battery + 150.0 <= s.batmax) {
          s.battery += 150.0;
          s.minerals[min]--;
          s.cargo -= 30;
          s.rx -= 200;
        }

        if (s.nucx === 1 && s.battery + 300.0 <= s.batmax) {
          s.battery += 300.0;
          s.minerals[min]--;
          s.cargo -= 30;
          s.rx -= 200;
        }
      } else if (min === 22 && s.processor) {
        if (s.nuc === 1 && s.nucx === 0 && s.battery + 250.0 <= s.batmax) {
          s.battery += 250.0;
          s.minerals[min]--;
          s.cargo -= 25;
          s.rx -= 500;
        }

        if (s.nucx === 1 && s.battery + 500.0 <= s.batmax) {
          s.battery += 500.0;
          s.minerals[min]--;
          s.cargo -= 25;
          s.rx -= 500;
        }
      }
    } else {
      s.labl1x = s.digx;
      s.labl1 = true;
      s.labl1y = s.digy;
      s.labl1timr = 0;
      s.labl1str1 = 'Cargo Bay is Full';
      s.labl1str2 = '';
    }

    if (s.tr) {
      if (s.trdir === 0) {
        s.map[s.iposx + 1][s.iposy] = 0;
      } else if (s.trdir === 1) {
        s.map[s.iposx][s.iposy - 1] = 0;
      } else if (s.trdir === 2) {
        s.map[s.iposx - 1][s.iposy] = 0;
      } else if (s.trdir === 3) {
        s.map[s.iposx][s.iposy + 1] = 0;
      }
    }

    if (s.drill < 0.0) {
      s.drill = 0.0;
    }

    s.scorestr = makeString(s.score);
    if (s.rx > s.biomax && s.greentimr === 0) {
      s.greentimr = 1;
    }

    if (s.is_mission) {
      missionUpdateOne(s.mission, min);
      isCompleted(s.mission); // sets the mission's complete flag; the result is unused
    }
  }
}

/** The inventory sphere: random minerals, money and gadgets, listed in a panel. */
export function loadShip(s) {
  s.panel = makeTextPanel('Inventory Sphere', 210, 220, 30, 12);
  const num1 = toInt(random() * 5.0 + 3.0);
  let rxtotal = s.rx;

  for (let i = 0; i < num1; i++) {
    const type = toInt(random() * 19.0 + 1.0);
    const amount = toInt(random() * 5.0 + 2.0);
    const w = getWeight(type) * amount;
    if (w + s.cargo <= s.cargomax) {
      const rx1 = amount * getRx(type);
      rxtotal += rx1;
      if (rxtotal <= s.biomax || !(random() > 0.03)) {
        s.rx += rx1;
        addLine(s.panel, '' + amount + ' ' + getName(type) + ', ' + w + ' lbs.');
        s.cargo += w;
        // Fix: the count rises by the pieces loaded; the original added one piece but the weight,
        // radiation and score of all of them (see docs/mlu2/fixes.md, "An Inventory Sphere
        // charged for minerals it did not give").
        s.minerals[type] += amount;
        s.score = s.score + idiv(amount * getPrice(type) * s.score_factor, 10);
        s.scorestr = makeString(s.score);
        if (s.rx > s.biomax) {
          s.greentimr = 1;
        }
      }
    }
  }

  if (random() < 0.7) {
    const amount1 = toInt((random() + 1.0) * 2.0 * (19.9 * s.iposx + 500.0));
    s.money += amount1;
    addLine(s.panel, '+$' + makeString(amount1));
    s.moneystr = makeString(s.money);
  }

  if (random() < 1.0E-4 * s.iposx) {
    const type = toInt(random() * 10.0);
    if (type === 0) {
      const am1 = toInt(random() * 2.0 + 1.0);
      s.shield += am1;
      addLine(s.panel, '+' + am1 + ' Shields');
    } else if (type === 1) {
      const am1 = toInt(random() * 3.0 + 2.0);
      s.dyn += am1;
      addLine(s.panel, '+' + am1 + ' Dynamites');
    } else if (type === 2) {
      const am1 = toInt(random() * 2.0 + 1.0);
      s.tnt += am1;
      addLine(s.panel, '+' + am1 + ' TNT');
    } else if (type === 3) {
      const am1 = toInt(random() * 2.0 + 1.0);
      s.tel1 += am1;
      addLine(s.panel, '+' + am1 + ' Teleporter 1');
    } else if (type === 4) {
      // Fix: the line says two, as many as it gives (the original said one).
      s.tel2 += 2;
      addLine(s.panel, '+2 Teleporter 2');
    } else if (type === 5) {
      s.hullfix += 2;
      addLine(s.panel, '+2 Hull repairs');
    } else if (type === 6) {
      s.drillfix++;
      addLine(s.panel, '+1 Drill repairs');
    } else if (type === 7) {
      s.sonb++;
      addLine(s.panel, '+1 Sonic bomb');
    } else if (type === 8) {
      s.iceb++;
      addLine(s.panel, '+1 Ice bomb');
    } else if (type === 9) {
      s.radb++;
      addLine(s.panel, '+1 Radiation bomb');
    }
  }

  addLine(s.panel, '+1 Save');
  s.saves++;
  s.score += 1000;
}

// The transmissions for transarr[0] to transarr[15], stored encrypted as in the original.
const TRANS_TEXT = [
  '0cN.*mcGk*G9*?G!,*8NnGYG! xG2cA ?cG*WKG+N &ckG}?cm k*?w pGYkGw!G G+N &ckGW8NNG*WGn &Sc?!G &nGc{k?cmc!pG`*?G&*AGv8!kGnwSG*8kG !Gm &xGmw&c? N!G !Gx*8G. &pG0 k.,Gx*8?Gc&Sw&cG?c nw&SBGk,cG!*wNGSck!G\u007fc?xG, ?nG GWcAGWcckGn*A&pGz*G&*kG!+c&nGm*?cGk, &GD6Gmw&8kc!G*&Gk,w!G?8&"GGYGAwNNGc{+N w&GA,xGN kc?pG0,c&Gx*8Gc{wkGk,cG2 !c"Gx*8GAwNNG, \u007fcG G., &.cGk*G!ckGk,cGkwmcGA,c&Gx*8GNc \u007fcGk,cG2 !cpG0cG, \u007fcG!ckGk,cGkwmcGv8!kG?wS,kGW*?Gx*8?G.8??c&kG8+S? nc!"G!*Gx*8G. &Gv8!kG+?c!!G\'!.G S w&G &nGS*Gmw&cGm*?cGmw&c? N!pG5**nGN8.\\~',
  '/,cG+N &ckG}?cm k*?w G, !G &G#G,*8?Gn xpG/,cGkcm+c? k8?cG. &GSckG !G,wS,G !GD666GncS?cc!Gn8?w&SGk,cGn xG &nGn?*+Gk*G G2*&cl.,wNNw&SGlJ66G kG&wS,kpGV*G2cG. ?cW8NNGA,c&Gx*8GNc \u007fcGk,cG2 !cpGg*8G. &G nv8!kGk,cGkwmcG8!w&SG ??*AG\\cx!pG0 ?mc?Gkcm+c? k8?c!Gm \\cGk,cG!*wNG!*Wkc?G &nGc !wc?Gk*GnwSGk,?*8S,"G28kGk,w!GNwmwk!Gk,cGkwmcGx*8G. &G!+c&nGmw&w&SG*8k!wncpGYWGx*8G8+S? ncGx*8?Gc&Sw&c"Gx*8G. &G!k ?kG*8kGc ?Nwc?G &nGnwSGncc+c?pGYWGx*8G8+S? ncGx*8G? nw k*?"Gx*8G. &GNc \u007fcGN kc?G &nG! \u007fcGW8cNG*&GnwSSw&SGk,cG!*wNp',
  '/,c?cG ?cG\u007f N8 2NcGmck N!Gk,cGncc+c?Gx*8GS*"GNw\\cG!wN\u007fc?"GS*NnG &nG+N kw&8m"GxckGk,cxG ?cG, ?nGk*Gmw&cGn8cGk*Gk,cG, ?n&c!!G*WGk,cG!*wNpGg*8GA*8NnG&ccnGk*G,c nGc !kG9wpcpG?wS,kKGw&G!c ?.,G*WGm*?cG\u007f N8 2NcGmw&c? N!pG/,cG!8&Gm*\u007fc!GW?*mGAc!kGk*Gc !k"G?cmcm2c?Gk, kp',
  'g*8G, \u007fcG+?*2 2NxG&*kw.cnG G)ckG5Nwnc?G8+S? ncGw&Gk,cG!,*+pGYkG. &G2cGG8!cnGk*Gm*\u007fcGW !kG .?*!!Gk,cG!8?W .cpGg*8G. &G .kw\u007f kc(nc .kw\u007f kcGwkG2xG+?c!!w&SGV,wWkG28kk*&pGz*G&*kGSNwncG*\u007fc?G &xGm Sm GWwcNn!"G !Gx*8GAwNNG!w&\\pG)ckGSNwnc?G. &G,*\u007fc?G*\u007fc?Gn8SG*8kG!*wNG28kGwkG. &G&*kG+ !!Gk,?*8S,G &xG*2!kw.Nc!Gk, kGx*8Gm xGc&.*8&kc?pGPN!*"GA k.,Gx*8?Gc&Sw&cG?c nw&SG !GSNwnw&SG?cO8w?c!G GN*kG*WG+*Ac?pG>c!wnc!Gk,cGvckGSNwnc?"Gx*8G. &G8!cGk,cGkcNc+*?kc?!Gk*Gm*\u007fcG .?*!!Gk,cGWwcNnpG/cNc+*?kc?GDGkcNc+*?k!Gx*8G +?*{wm kcNxGC666GWkGw&Gk,cGnw?c.kw*&Gx*8G ?cGW .w&SGA,c&Gx*8G ?cG kG*?G 2*\u007fcGk,cG!8?W .cpGF*Ac\u007fc?GwkGAwNNGW wNGwWGx*8?Gnc!kw& kw*&Gw!G&*kGW?ccpG/cNc+*?kc?GXGkcNc+*?k!Gx*8Gk*Gk,cG+*!wkw*&G*WGx*8?GW ?k,c!kG,*?w|*&k NG+?*S?c!!GA,c&Gx*8GkcNc+*?kG*WWGk,cG!8?W .cG &nGwkGkcNc+*?k!Gx*8Gk*Gk,cG2 !cGA,c&Gx*8G ?cG2cN*AGk,cG!8?W .cp',
  'PGN xc?G*WGO8 ?k|G, !G2cc&G!+*kkcnG*&G*8?G? n ?pGYkGm8!kG2cG.N*!cGk*GA,c?cGx*8G ?cG?wS,kG&*Appp',
  '}?cm k*?w s!G!*wNG. &G2cG8&!k 2NcpGQw2? kw*&!GW?*mGx*8?Gn?wNNG. &Gnw!N*nScG &xGm ?2NcG?*.\\!G 2*\u007fcGx*8GA,w.,G. &Gnc NG!c?w*8!Gn m ScGk*Gx*8?G!,w+pGPN!*GA k.,G*8kGW*?Gc ?k,O8 \\c!7Gk,cxG. &G. 8!cG?*.\\GW NNG &nG2N*.\\Gx*8?Gk8&&cN!"G!*G\\cc+G GWcAG,8NNG?c+ w?!G &nGnx& mwkc!p',
  '/,cGAc k,c?G*&Gk,w!G+N &ckGw!G8&+?cnw.k 2NcpGP.wnG!,*Ac?!"G,x+c?. &cGAw&n!G &nGmcS GNwS,k&w&S!G ?cG+?c\u007f Nc&kpG/,cxG. &Gnc!k?*xGx*8G!,w+GwWGx*8G!k xG*&Gk,cG!8?W .cGk**GN*&Sp',
  '/,c?cGw!G G!, N*AGN \\cG*WGm Sm GW8?k,c?G*&pGYkGw!G+c?m &c&kG &nG. &G&*kG2cGnc!k?*xcnpGg*8GA*8NnG&ccnGk*Gcwk,c?GWNxG*\u007fc?GwkG*?GnwSG8&nc?GwkpGPN!*"GA k.,Gx*8?Gkcm+c? k8?cG?c nw&SG !GwkGSck!G,*kkc?GA,c&Gx*8G ?cGw&G\u007fw.w&wkxG*WG &xGnx& mw.Gm Sm G+**N!G*?G!k?c m!p',
  '/,cG ?c GW8?k,c?G*&G, !G GN*kG*WGNw\u007fcG\\xm2c?NwkcG+w+c!G9wpcpGm Sm G!k?c m!KGA,w.,G. 8!cGW*?m kw*&G*WGnw m*&n!p',
  'qcm w&!G*WG &G &.wc&kGV8+c?2*?w&SGi .,w&cG, \u007fcG2cc&Gnckc.kcnpGPNNGwk!G2N8c+?w&k!G, \u007fcG2cc&GN*!k"G28kGwk!G+ ?k!G. &G2cGw&!k NNcnGw&k*Gx*8?GnwSSc?Gk*Gm \\cGx*8?G\u007fc,w.NcGm*?cG+*Ac?W8NpG} &Gx*8GN*. kcG NNGk,cG+ ?k!E',
  'FcxGk,c?c"GWcNN*AGmw&c?pGYG!ccGx*8G ?cG!8..ccnw&SGw&Gk,w!Gn &Sc?*8!Gc&\u007fw?*&mc&kpG5**nGA*?\\~G)8!kG, \u007fcG*&cGk,w&SGk*G! xpGL&cGn xGYGnc.wncnGk*Gnc+ ?kGc ?NxGw&Gk,cGm*?&w&SG &nG?ck8?&GN kcGw&Gk,cGc\u007fc&w&SpGP&nG!8?cGc&*8S,"GYGW*?S*kGk,cGm*!kGwm+*?k &kGk,w&SBGk,cG!8?W .cGmcNk!GA,c&GwkGw!Gk**G,*kG*8k!wncG &nGW?cc|c!GA,c&GwkG.**N!Gn*A&GN kc?Gw&Gk,cG Wkc?&**&pG5**nGk,w&SGYG, nG G.*8+NcG*WGc{+N*!w\u007fc!Gk*G2N !kGmxGA xGk*Gk,cG!8?W .c"G*k,c?Aw!cGYGA*8Nn GnwcnG GN*&cNxGnc k,G2cw&SGv8!kG GWcAGWcckGW?*mGk,cG!8?W .cpGF*+cGx*8GnwnG&*kGm \\cGk,cG! mcGmw!k \\cGxckp',
  'YkGw!G?c NNxGk*8S,Gmw&w&SGw&Gk,w!G?cm*kcG+N .cpGg*8G, \u007fcGm*8&k w&!G*&Gk*+G*WGx*8G &nGN*k!G*WGm Sm GW8?k,c?G*&pGP&nGwks!G?c NNxG GN*&SGA xGk*Gk,cG2 !c"G+N8!Gk,cGkcNc+*?kc?!G ?cGn m&Gc{+c&!w\u007fc"G!*GYG mGm \\w&SGNwkkNcG+?*WwkpG>8kGYs\u007fcG,c ?nG?8m*?!G*WG GW*?S*kkc&G2 !cG!*mcA,c?cGw&Gk,cG,wNN!pGV*mcGW*?S*kkc&G!*8NGw!G!kwNNG*+c? kw&SGwk"GYG,c ?pGYWGwkGk?8NNxGc{w!k!G &nGx*8GWw&nGwk"Gx*8GA*8Nn&kGmw&nGkcNNw&SGmcGA,c?cGwkGw!"GA*8NnGx E',
  'YGv8!kG!k8m2NcnG*&G Gm*k,c?N* nG*WG+*Ac?l!k*&c!BG!k ?!k*&c!"G!8&!k*&c!"G\\?x+k*&wkc!"Gx*8G& mcGwkpGYsmGS*&& G2cG!8+c?G?w.,G*&.cGYG!cNNGk,cmG kGk,cG2 !cpppG0, ks!Gk, kG!k? &ScGSN*AG.*mmw&SGW?*mGmxG. ?S*G2 xEGYkG. &skG2cG? nw kw*&"GYG, \u007fcG!8+c?l!,wcNnG2w*l=pppGi8!kG2cGk, kGn ?\\Gm kkc?pppGGGGGGGGGGGGGG-P>LLLLLLLiiii~~~~',
  '0cG, \u007fcGnckc.kcnG GWcAG+*Ac?GAc +*&!Gk, kG ?cGN*. kcnG8&nc?&c k,G Gm Sm G., m2c?G&c ?GA,c?cGx*8G ?cG?wS,kG&*ApG0cG2cNwc\u007fcGk,cxG. &G,cN+Gx*8Gmw&cGmw&c? N!GW !kc?G &nGm*?cGcWWw.wc&kNxpGPN!*GA k.,G*8kGW*?G Gmckc*?G!,*Ac?pGYkG*Wkc&G*..8?!Gk,w!GkwmcG*WGxc ?p',
  'YkGk8?&!G*8kGk, kGk,cGmckc*?G!,*Ac?Gw!G\u007fc?xGnc!k?8.kw\u007fcpGV*Gnc!k?8.kw\u007fcGk, kGwkGm xG&*kG2cG+*!!w2NcGk*Gm w&k w&G2 !c!G*&G}?cm k*?w pGVkwNNGk,c?cGw!G+Nc&kxG*WG\u007f N8 2NcGmw&c? N!G*8kGk,c?cpG/,cGCG+*Ac?GAc +*&!G. &G,cN+Gx*8G!k xG*8kGN*&Sc?"G!*Gx*8G&ccnGk*GWw&nGk,cmGk*G.*&kw&8cGmw&w&SpG0cGAwNNGk?xGk*G\\cc+Gk,cG2 !c!G*+c? kw*& NG !GN*&SG !GAcG. &"Gk,*8S,Gk, ks!G&*kG G+?*mw!cpGPN!*"GW8?k,c?G*&"Gk,c?cG ?cG GN*kG*WG&8\\c!GNcWkGW?*mG &G &.wc&kGA ?pG/,cxG. &G+?*\u007fwncGx*8GAwk,G2*m2GW8cNGW*?Gnx& mwkcG &nG/b/pGg*8G!,*8NnG NA x!G. ??xGk,cGm {wm8mG m*8&kG*WGS nSck!GW?*mG&*AG*&G2c. 8!cGk,c?cGw!G&*GkcNNw&SGwWGk,c?cGAwNNG!kwNNG2cG2 !c!Gk*G2xGk,cmGw&G&c ?GW8k8?cp',
  '/? &!mw!!w*&GW?*mG G}?cm k*?w &G2 !cpppGYG mGk,cGN !kG*&cG,c?cGk, kG!kwNNG*+c? kc!G G2 !cpG/,cG*k,c?!G ?cG 2 &n*&cnG*?Gnc!k?*xcnpGP&nGYGn*&skGk,w&\\GYG. &G!k xG,c?cG &xGN*&Sc?pG/,c?cGw!G &G 2 &n*&cnG2 !cG 2*\u007fcGx*8G*&Gk,cG!8?W .cpGYk!G+?*kc.kw\u007fcG!,wcNnGw!G!kwNNG*+c? kw*& N"Gk,*8S,Gk,c?cGw!G&*G*&cGk,c?cGk*G?cW8cNG &nGWw{GnwSSc?!pGg*8Gm xG!k xGk,c?cGk*G!+c&nG G&wS,kG9*?G Gn xKG28kGx*8G ?cGS*&& G, \u007fcGk*G8!cG? AGmw&c? N!Gk*Gm w&k w&Gx*8?G!,w+G*+c? kw*& NGwWGx*8GA &kGk*G.*&kw&8cGmw&w&SpGYGAwNNG+?*2 2NxG!kwNNG2cGk,c?cGW*?GXGn x!"G!*Gm \\cG!8?cGx*8GWw&nGmxG2 !cG2cW*?cGk, kG!*Gk, kGAcG. &G2cGk? &!+*?kcnGW?*mGk,w!G+N &ckpGic &A,wNc"GAcG, \u007fcGnckc.kcnG GN ?ScGWwcNnG*WG8&\\&*A&G28kG+?*2 2NxGw&! &cNxG\u007f N8 2NcGmw&c? NpGYWGx*8G. &"Gmw&cGwkG2cW*?cGx*8GNc \u007fcG &nGx*8G9 &nGmcGw&.N8ncnKGAwNNG2cGWwNk,xG?w.,pGPN!*"GA k.,G*8kGW*?G*2!wnw &"GwkGw!G G\u007fc?xG, ?nG?*.\\G*WGn ?\\G.*N*?G &nG. &G*&NxG2cGnc!k?*xcnG2xGN !c?G &nG*&G*.. !w*&G2xG/b/pGF*+cGk,w!Gw!G&*kGk,cGN !kGkwmcGx*8G,c ?GW?*mGmcpG5**nGN8.\\~',
];

const CHEAT_KEYS = [
  '$1,000,000',
  'Turbo-X Engine',
  'Super Fuel Tank',
  'Gigantic Cargo Bay',
  'Liquid Nitrogen Radiator',
  'Energy-Shielded Hull',
  'Super-Shield BioX',
  'Nano-Tube Drill',
  'Kryptonite Battery',
  '1000 Saves',
];

/** The text of the transmission that starts at column transy1. The last one ends the game. */
export function loadTrans(s, transy1) {
  let msg1 = '';
  // The first entry of transarr equal to transy1 picks the text, as the original's if-chain.
  let k = 0;
  while (k < 17 && transy1 !== s.transarr[k]) k++;
  if (k < 16) {
    msg1 = TRANS_TEXT[k];
    if (k === 15) {
      s.base4day = s.days;
    }
  } else if (k === 16) {
    msg1 = 'Congratulations! You made it. I hope you found the motherload of super-valuable Alexxzandrites.\nTo record your score, enter the base. Here is your reward: You can enter this cheat:\n';
    const cht = toInt(random() * s.cheats.length);
    msg1 = msg1 + s.cheats[cht] + '\nfor a ' + CHEAT_KEYS[cht] + '.\n\n';
    let timebonus = 1000000 * (150 - s.days);
    if (timebonus < 0) {
      timebonus = 0;
    }

    msg1 = msg1
      + 'All game data erased.\n\nCurrent score: '
      + makeString(s.score)
      + '.\nMoney Bonus: '
      + makeString(idiv(s.money, 5))
      + '.\nTime bonus: '
      + makeString(timebonus)
      + '.\nFinal Score: '
      + makeString(s.score + idiv(s.money, 5) + timebonus);
    s.score = s.score + idiv(s.money, 5) + timebonus;
    s.scorestr = makeString(s.score);

    // The save is overwritten so that it can no longer be loaded. Failures are ignored.
    s.store.write(s.inputstr, FINISHED)
      .catch(() => {});

    return msg1;
  }

  return decryptString(msg1);
}
