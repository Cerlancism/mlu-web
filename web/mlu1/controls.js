// Key and click handling for each screen. Keys arrive as Java key codes (see input.js),
// including the system's key repeats. See "Controls" in docs/mlu1/specifications.md.

import { K, MAGMA, GRANITE, MARBLE, SHM, TRANS_NEXT, CHEATS } from './data.js';
import { genMap, explos, magmaFlow, earthquake, randomTel, backColor, redraw,
  stopEarthquake } from './world.js';
import { boom, spend } from './pod.js';
import { makeString, mineralProfit, repairsAction, upgradesAction, gadgetsAction,
  displayUpgrade, nextTab, leaveBase } from './shop.js';
import { loadSave, ERASED } from './savefile.js';
import { restart } from './state.js';
import { random } from './jmath.js';

export function keyDown(s, code) {
  s.keynum = code;
  if (code !== K.M) s.status = false;
  if (code === K.UP) s.up_key = true;
  else if (code === K.LEFT) s.left_key = true;
  else if (code === K.RIGHT) s.right_key = true;
  else if (code === K.DOWN) s.down_key = true;

  if (!s.menu && s.iposy < 3000) playKey(s, code);
  else if (!s.menu && s.iposy >= 3000) mantleKey(s, code);
  else if (!s.startpage) shopKey(s, code);
  else startKey(s, code);
}

export function keyUp(s, code) {
  if (code === K.UP) {
    s.up_key = false;
    s.gastimr = 0;
    if (s.sounds) {
      s.sfx.stop('prop');
      s.sfx.stop('jet');
    }
  } else if (code === K.LEFT) s.left_key = false;
  else if (code === K.RIGHT) s.right_key = false;
  else if (code === K.DOWN) s.down_key = false;
  else if (code === K.CTRL) s.ctrl = false;
  else if (code === K.Z) s.zkey = false;
  else if (code === K.X) s.xkey = false;
}

const hard = (v) => v === GRANITE || v === MARBLE;

function playKey(s, code) {
  const m = s.map;
  if (code === K.UP) {
    s.fallspd = 7;
  } else if (code === K.LEFT) {
    s.right_side = false;
  } else if (code === K.RIGHT) {
    s.right_side = true;
  } else if (code === K.DOWN) {
    // Drill down; granite and marble need a drill of at least 200.
    if (s.digtimr === 0 && s.mode === 1 && !s.ctrl && s.drill > 0) {
      if (!(s.drill < 200 && hard(m[s.iposx][s.iposy + 1]))) {
        s.digx = 50 * (s.iposx - s.framex) - 10;
        s.posx = 0.02 * (s.digx + 10) + s.framex;
        s.mode = 4;
        if (s.explorer) {
          s.timr2 = 1;
          s.dir2 = 3;
          boom(s, s.dir2);
        } else if (s.sounds) {
          s.sfx.play('drill');
        }
      }
    }
  } else if (code === K.SPACE) {
    // Drill sideways in the facing direction.
    if (s.digtimr === 0 && s.mode === 1 && s.drill > 0) {
      const old = s.digx;
      s.digx = (s.iposx - s.framex) * 50 - 10;
      s.digy = (s.iposy - s.framey) * 50 + 50;
      if (Math.abs(s.digx - old) >= 20) {
        const half = Math.trunc(Math.abs(s.digx - old) / 2);
        s.digx += s.digx - old > 0 ? -half : half;
      }
      s.posx = 0.02 * (s.digx + 10) + s.framex;
      if (!s.right_side && s.iposx > 0 && m[s.iposx - 1][s.iposy] < MAGMA) {
        s.mode = 2;
        if (s.drill < 200 && hard(m[s.iposx - 1][s.iposy])) s.mode = 1;
        if (s.explorer) {
          s.timr2 = 1;
          s.dir2 = 2;
          boom(s, s.dir2);
        }
        if (s.mode === 2 && s.sounds) s.sfx.play('drill');
      } else if (s.right_side && s.iposx < 47 && m[s.iposx + 1][s.iposy] < MAGMA) {
        s.mode = 2;
        if (s.drill < 200 && hard(m[s.iposx + 1][s.iposy])) s.mode = 1;
        if (s.explorer) {
          s.timr2 = 1;
          s.dir2 = 1;
          boom(s, s.dir2);
        }
        if (s.mode === 2 && s.sounds) s.sfx.play('drill');
      }
      if (s.iposy === 5 && s.posx > 43) s.mode = 1;
    }
  } else if (code === K.CTRL) {
    s.ctrl = true;
  } else if (code === K.ENTER) {
    if (s.trans && !s.pop_up) {
      s.trans = false;
      if (s.transy === 20000) {
        gameWon(s);
        return;
      }
      if (s.transy in TRANS_NEXT) s.transy = TRANS_NEXT[s.transy];
      s.img.msgscreen = null;
    } else if (s.pop_up) {
      s.pop_up = false;
    }
  } else if (code === K.Z && !s.expls && s.digtimr === 0 && s.iposy > 2
      && (s.dyn > 0 || s.nux >= 30)) {
    blast(s, 1);
  } else if (code === K.X && !s.expls && s.digtimr === 0 && s.iposy > 2
      && (s.tnt > 0 || s.nux >= 100)) {
    blast(s, 2);
  } else if (code === K.A && s.hullfix > 0 && s.hull > 0 && s.digtimr === 0) {
    s.hullfix--;
    s.hull = s.hull - 250 < 0 ? 0 : s.hull - 250;
  } else if (code === K.S && s.drillfix > 0 && s.drill < s.drillmax && s.digtimr === 0) {
    s.drillfix--;
    s.drill = s.drillmax;
  } else if (code === K.Q && s.tel1 > 0 && s.depth <= 8000 && s.digtimr === 0) {
    s.tel1--;
    teleport(s);
  } else if (code === K.W && s.tel2 > 0 && s.digtimr === 0) {
    s.tel2--;
    teleport(s);
  } else if (code === K.SHIFT && s.jet === 1) {
    s.flame = !s.flame;
  } else if (code === K.D1 && !s.sbomb && s.sonb > 0 && s.battery + s.fuel >= 70) {
    s.sonb--;
    s.sbomb = true;
    s.stimr = 0;
    s.sbombx = s.digx + 40;
    s.sbomby = s.digy - 10;
    spend(s, 70);
  } else if (code === K.D2 && !s.ibomb && s.iceb > 0 && s.battery + s.fuel >= 100) {
    s.iceb--;
    s.ibomb = true;
    s.itimr = 0;
    s.ibombx = s.digx + 40;
    s.ibomby = s.digy - 10;
    spend(s, 100);
  } else if (code === K.M) {
    if (!s.status) {
      s.status = true;
      s.s_fuel = s.fuel;
      s.s_ice9 = s.ice9;
      s.s_battery = s.battery;
      s.s_time = s.time;
      s.mineralprofit = makeString(mineralProfit(s));
      s.img.shopimg0 = 'music_on.png';
      s.img.shopimg1 = 'sounds_on.png';
      s.img.shopimg2 = 'stop.png';
    } else {
      s.status = false;
    }
  } else if (code === K.C) {
    s.processor = !s.processor;
    s.img.cursor = s.processor ? 'green_light.png' : 'black_light.png';
  }
  // The original's game-speed keys (- and =) are removed: the web version runs at a fixed speed.
}

// Dynamite (size 1) or TNT (size 2), paid for with a stick or with explosives from bombs.
function blast(s, size) {
  const tnt = size === 2;
  s.expl = tnt ? 'tnt.png' : 'dynomite.png';
  if (s.sounds) s.sfx.play(tnt ? 'tnt' : 'dynamite');
  s.ewidth = tnt ? 250 : 150;
  s.eframes = tnt ? 40 : 20;
  s.explx = s.digx - (tnt ? 90 : 40);
  s.exply = s.digy - (tnt ? 150 : 100);
  s.expls = true;
  if (tnt) {
    if (s.tnt > 0) s.tnt--;
    else s.nux -= 100;
  } else if (s.dyn > 0) {
    s.dyn--;
  } else {
    s.nux -= 30;
  }
  const spread = tnt ? 10 : 8;
  for (let i = 0; i < SHM; i++) {
    if (!s.grexists[i]) {
      s.grexists[i] = true;
      s.grxspd[i] = 2 * spread * random() - spread;
      s.gryspd[i] = 2 * spread * random() - spread;
      s.grx[i] = s.digx;
      s.gry[i] = s.digy;
      s.grscale[i] = Math.round(10 * random() + 10);
      s.grtype[i] = 0;
    }
  }
  let x0 = s.iposx;
  let x1 = s.iposx;
  if (s.iposx > 0) x0 = s.iposx - 1;
  if (tnt && s.iposx > 1) x0 = s.iposx - 2;
  if (s.iposx < 47) x1 = s.iposx + 1;
  if (tnt && s.iposx < 46) x1 = s.iposx + 2;
  if (s.posy > 1000 && !s.earthq) {
    if (random() < (tnt ? 3e-5 : 2e-5) * s.posy) {
      s.eqtimr = 0;
      s.earthq = true;
      earthquake(s);
    }
  }
  explos(s, size, x0, x1);
  magmaFlow(s);
  redraw(s);
}

function teleport(s) {
  if (s.sounds) s.sfx.play('teleport');
  randomTel(s);
  s.grexists.fill(false);
  s.labl1 = false;
  s.labl2 = false;
  s.expls = false;
  stopEarthquake(s);
  if (s.sounds) {
    s.sfx.stop('prop');
    s.sfx.stop('jet');
    s.sfx.stop('lava');
  }
  backColor(s);
  redraw(s);
}

/**
 * Fix: dismissing the victory transmission ends the game, as its text says ("Game Over", "All
 * game data is erased"). The original left the player stuck in the base forever.
 */
function gameWon(s) {
  s.store.remove(s.inputstr);
  s.sfx.musicStop();
  s.menu = true;
  s.startpage = true;
  restart(s);
}

const DETONATIONS = { 85200: 102300, 102300: 105000, 105000: 147300, 147300: 162500, 162500: 0 };

function mantleKey(s, code) {
  if (code === K.ENTER && s.nux >= 9000) {
    // A detonation; it counts when set off within 200 ft of the target depth.
    s.nucb = true;
    s.nucbx = s.digx;
    s.nucby = s.digy;
    s.nuctimr = 0;
    s.nucrad = 25;
    s.nux -= 9000;
    if (s.depth > s.detd - 200 && s.depth < s.detd + 200 && s.detd in DETONATIONS) {
      s.detd = DETONATIONS[s.detd];
    }
    if (s.sounds) s.sfx.play('tnt');
  } else if (code === K.Z) {
    s.zkey = true;
  } else if (code === K.X) {
    s.xkey = true;
  } else if (code === K.SPACE && s.nux >= 100) {
    s.expl = 'tnt.png';
    s.ewidth = 250;
    s.eframes = 40;
    s.explx = s.digx - 120;
    s.exply = s.digy - 125;
    s.expls = true;
    s.nux -= 100;
    if (s.sounds) s.sfx.play('tnt');
  }
}

function beep(s) {
  if (s.sounds) s.sfx.play('beep');
}

function shopKey(s, code) {
  if (code === K.UP) {
    s.sely = s.sely > 0 ? s.sely - 1 : s.selymax;
    beep(s);
  } else if (code === K.LEFT) {
    s.selx = s.selx > 0 ? s.selx - 1 : 7;
    beep(s);
  } else if (code === K.RIGHT) {
    s.selx = s.selx < 7 ? s.selx + 1 : 0;
    beep(s);
  } else if (code === K.DOWN) {
    s.sely = s.sely < s.selymax ? s.sely + 1 : 0;
    beep(s);
  } else if (code === K.ENTER && !s.pop_up && !s.end) {
    nextTab(s);
  } else if ((code === K.ENTER || code === K.ESC) && s.pop_up) {
    // Fix: Esc closes the pop-up first; the original left the base with the pop-up still showing
    // over the play screen (docs/mlu1/fixes.md).
    s.pop_up = false;
    s.popup = null;
  } else if (code === K.ESC && !s.end) {
    leaveBase(s);
  } else if (code === K.SPACE) {
    if (s.tab === 1) repairsAction(s);
    else if (s.tab === 2) upgradesAction(s);
    else if (s.tab === 3) gadgetsAction(s);
  }
  if (s.tab === 2) displayUpgrade(s);
}

function toggleMusic(s) {
  if (!s.music) {
    s.music = true;
    s.sfx.musicLoop(s.theme);
  } else {
    s.music = false;
    s.sfx.musicStop();
  }
}

function startKey(s, code) {
  if (code === K.UP) {
    s.sely = s.sely > 0 ? s.sely - 1 : 5;
    beep(s);
  } else if (code === K.DOWN) {
    s.sely = s.sely < 5 ? s.sely + 1 : 0;
    beep(s);
  } else if (code === K.LEFT || code === K.RIGHT) {
    if (s.sely === 3) toggleMusic(s);
    else if (s.sely === 4) s.sounds = !s.sounds;
    else if (s.sely === 5) {
      if (code === K.LEFT) s.level = s.level > 1 ? s.level - 1 : 3;
      else s.level = s.level < 3 ? s.level + 1 : 1;
    }
    beep(s);
  } else if (code >= 65 && code <= 90) {
    if (s.inputstr.length < 13) s.inputstr += String.fromCharCode(code + 32);
  } else if (code >= 48 && code <= 57) {
    if (s.inputstr.length < 13) s.inputstr += String.fromCharCode(code);
  } else if (code === K.BACKSPACE && s.inputstr.length > 0) {
    s.inputstr = s.inputstr.substring(0, s.inputstr.length - 1);
  } else if (code === K.ENTER && s.pop_up) {
    s.pop_up = false;
  } else if (code === K.ENTER && !s.pop_up && s.inputstr.length > 2) {
    if (s.sely === 0) {
      s.msgstr = '';
      s.startpage = false;
      s.menu = false;
      genMap(s);
      Object.assign(s.img, { stpage: null, box1: null, box2: null, box3: null });
    } else if (s.sely === 1) {
      const text = s.store.read(s.inputstr);
      // Fix: an erased or damaged save now says "file not found" instead of doing nothing.
      if (text != null && text !== ERASED && (s.msgstr = '', loadSave(s, text))) {
        s.img.stpage = null;
      } else {
        s.inputstr = '';
        s.pop_up = true;
        s.popup = 'file_not_found.jpg';
      }
    } else if (s.sely === 2) {
      const hit = CHEATS.find(([word]) => word === s.inputstr);
      if (hit) {
        s.msgstr = hit[2];
        s.cheat = hit[1];
      } else {
        s.pop_up = true;
        s.popup = 'wrong_password.jpg';
      }
      s.inputstr = '';
    }
    s.moneystr = makeString(s.money);
    s.scorestr = makeString(s.score);
  }
}

/** A mouse click at game coordinates (x, y). */
export function mouseClick(s, x, y) {
  if (s.menu && !s.startpage) {
    const oldx = s.selx;
    const oldy = s.sely;
    if (s.tab === 1 && x > 296 && x < 485) {
      const rows = [[158, 210], [217, 269], [279, 330], [339, 390], [400, 451], [458, 511]];
      const row = rows.findIndex(([a, b]) => y > a && y < b);
      if (row >= 0) s.sely = row;
      beep(s);
      if (oldy === s.sely) repairsAction(s);
    } else if (s.tab === 2) {
      for (let cx = 0; cx < 8; cx++) {
        for (let cy = 0; cy < 7; cy++) {
          if (x > 19 + cx * 83 && x < 19 + cx * 83 + 69 && y > 106 + cy * 69 && y < 106 + cy * 69 + 64) {
            s.selx = cx;
            s.sely = cy;
            beep(s);
          }
        }
      }
      displayUpgrade(s);
      if (oldy === s.sely && oldx === s.selx) upgradesAction(s);
    } else if (s.tab === 3 && x > 330 && x < 720) {
      const tops = [161, 180, 197, 215, 251, 269, 305, 323, 358, 376, 394, 412, 430, 467, 485, 503];
      const row = tops.findIndex((t) => y > t && y < t + 18);
      if (row >= 0 && row < 15) s.sely = row;
      else if (row === 15 && (s.mith >= 150 && s.unob >= 75 && s.adam >= 100 || s.explorer)) {
        s.sely = 15;
      }
      if (oldy === s.sely) gadgetsAction(s);
      beep(s);
    }
  } else if (!s.menu && s.status) {
    if (x > 632 && x < 658 && y > 107 && y < 132) {
      if (s.music) {
        s.music = false;
        s.sfx.musicStop();
      } else {
        s.theme = 'duke_nukem2.mid';
        s.sfx.musicLoop(s.theme);
        s.music = true;
      }
    } else if (x > 632 && x < 658 && y > 150 && y < 176) {
      setSounds(s, !s.sounds);
    }
  }
}

/** The sound switch, as the inventory's sound button sets it: the lava sound follows it. */
function setSounds(s, on) {
  if (!on) {
    s.sounds = false;
    if (s.is_lava) {
      s.is_lava = false;
      s.sfx.stop('lava');
    }
  } else {
    s.sounds = true;
    if (s.posy > 1200) {
      s.is_lava = true;
      s.sfx.loop('lava');
    }
  }
}

/**
 * The page's Game menu: 'restart' ends the game as a game over does and shows the start page;
 * 'music' and 'sounds' set those switches to value, as the start page and inventory do.
 */
export function menuAction(s, item, value) {
  if (item === 'restart') {
    s.sfx.musicStop();
    s.menu = true;
    s.startpage = true;
    restart(s);
  } else if (item === 'music') {
    if (value === s.music) return;
    if (value) {
      // The tune of the current screen: the theme changes only while music is on, so it can be
      // stale when music was off.
      if (s.menu && s.startpage) s.theme = 'descent1.mid';
      else if (s.menu) s.theme = 'shops_theme.mid';
      else s.theme = 'duke_nukem2.mid';
    }
    toggleMusic(s);
  } else if (item === 'sounds') {
    if (value !== s.sounds) setSounds(s, value);
  }
}

/**
 * Makes a game restored from a snapshot (in a base or on the pause screen) play on: no key is
 * held, the tune of its screen plays when music is on, and on the pause screen the lava and
 * earthquake sounds start again as their switches say.
 */
export function resumed(s) {
  Object.assign(s, {
    up_key: false, down_key: false, left_key: false, right_key: false, ctrl: false,
    xkey: false, zkey: false, is_prop: false, is_lava: false, fxLast: {},
  });
  if (s.music) {
    s.music = false;
    menuAction(s, 'music', true);
  }
  if (s.sounds && !s.menu) {
    if (s.posy > 1200) {
      s.is_lava = true;
      s.sfx.loop('lava');
    }
    if (s.earthq) s.sfx.loop('earthquake');
  }
}
