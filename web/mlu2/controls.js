// controls: What each key, click and mouse move does on each screen (play, pause,
// transmissions, the bases and their tabs, the departure-time dialog, pop-ups, the start page
// with new game, loading and cheat codes), given as Java key codes; the gadgets (by key or from
// the gadget panel); the game's menu items.
// Specification: docs/mlu2/specifications.md, Controls (5).

import { SHM, BASE } from './data.js';
import { idiv, toInt, jround, random } from './jmath.js';
import { getPrice, getWeight, getRx } from './stats.js';
import { genMap, explos, makeQuake, checkMagma, redraw, makeBombs, loadSurface, loadClouds,
  backColor } from './world.js';
import { boom } from './pod.js';
import { loadGameTiles, loadGadgetIcon } from './sprites.js';
import { makeString, getMineralProfit, repairsEvent, upgradesEvent, gadgetsEvent, displayEvent,
  recordScore, loadHighScores } from './shop.js';
import { newMission, missionString } from './mission.js';
import { loadMap } from './savefile.js';
import { fieldStep, diggerStep } from './effects.js';
import { restart } from './state.js';

// True while a save is being read from the start page. The original read it inside the key
// handler, so no other key was handled until the game had loaded; key presses meanwhile are
// ignored.
let loading = false;

/** A key press (or key repeat), as a Java key code. */
export function keyDown(s, code) {
  // The original wrote a save inside the key handler, so no other key was handled meanwhile;
  // key presses during a save are ignored.
  if (loading || s.storeBusy) return;
  const key = code;
  s.keynum = key;
  if (!s.status && !s.trans) {
    if (key === 38) {
      s.up_key = true;
    } else if (key === 37) {
      s.left_key = true;
    } else if (key === 39) {
      s.right_key = true;
    } else if (key === 40) {
      s.down_key = true;
    } else if (key === 68 && !s.menu && s.cannon && s.mode === 1) {
      s.laser_bar = true;
      s.cannonx = true;
    }
  }

  // Quirk: Esc always toggles the (never drawn) grid flag as well.
  if (key === 27) {
    s.showgrid = !s.showgrid;
  }

  if (!s.status && !s.trans) {
    if (!s.menu) {
      if (s.msg && s.msgstr.indexOf('OVERHEAT') === -1) {
        return;
      }
      if (s.entrytimr > 0) {
        return;
      }
      if (!playKey(s, key)) return;
      deployGadget(s, key);
    } else if (!s.startpage) {
      shopKey(s, key);
    } else {
      startKey(s, key);
    }
  } else if (key === 27) {
    if (s.trans) {
      s.trans = false;
      s.transc++;
      // A transmission's text panel may still be counting down (timr55); whoever draws it
      // checks for null (Fix, see effects/render).
      s.panel = null;
    }
    if (s.status) {
      s.status = false;
      redraw(s);
    }
  }

  // The high-score tab: scrolling and typing the name.
  if (s.tab === 4) {
    const size = s.highscores.length;
    if (key === 38 && s.scroll > 0) {
      s.scroll--;
    } else if (key === 40 && s.scroll < size - 28) {
      s.scroll++;
    } else if (key >= 65 && key <= 90) {
      if (s.score_name.length < 13) {
        s.score_name = s.score_name + String.fromCharCode(key + 32);
      }
    } else if (key >= 48 && key <= 57) {
      if (s.score_name.length < 13) {
        s.score_name = s.score_name + String.fromCharCode(key);
      }
    } else if (key === 8 && s.score_name.length > 0) {
      s.score_name = s.score_name.substring(0, s.score_name.length - 1);
    }
  }
}

// Map tiles the drill cannot cut without upgrades: 29 and 30 need a drill of 200 or more,
// 33 a drill of 500 and the sonic cannon.
const TOUGH1 = 29;
const TOUGH2 = 30;
const HARDEST = 33;

// Keys in play. Returns false where the original returned from the key handler (no gadget, no
// high-score typing).
function playKey(s, key) {
  const map = s.map;
  if (key === 38) {
    s.fallspd = 7.0;
  } else if (key === 37) {
    if (s.flame && s.right_side) {
      s.glidespd = 0.0;
    }
    if (s.mode !== 2) {
      s.right_side = false;
    }
  } else if (key === 39) {
    if (s.flame && !s.right_side) {
      s.glidespd = 0.0;
    }
    if (s.mode !== 2) {
      s.right_side = true;
    }
  } else if (key === 40) {
    // Drill down.
    if (s.digtimr === 0 && s.mode === 1 && !s.ctrl && s.drill > 0.0 && !s.flame && s.posy < 99.0
        && s.iposy > 3) {
      let b1 = true;
      if (s.drill < 200.0 && (map[s.iposx][s.iposy + 1] === TOUGH1
          || map[s.iposx][s.iposy + 1] === TOUGH2)) {
        b1 = false;
      }
      if (s.drill < 500.0 && map[s.iposx][s.iposy + 1] === HARDEST) {
        b1 = false;
      }
      if (s.iposy < 5 && (s.iposx > 4998 || s.iposx < 4)) {
        b1 = false;
      }
      if (s.iposy === 4) {
        for (let i = 0; i < s.nodig.length; i++) {
          if (s.iposx === s.nodig[i]) {
            b1 = false;
            break;
          }
        }
      }
      if (s.iposy === 4 && s.iposx < 4998 && (map[s.iposx + 2][s.iposy] === 71
          || map[s.iposx + 1][s.iposy] === 71)) {
        b1 = false;
      }
      if (s.iposy === 4 && s.iposx > 1 && (map[s.iposx - 1][s.iposy] === 72
          || map[s.iposx - 2][s.iposy] === 72)) {
        b1 = false;
      }
      if (map[s.iposx][s.iposy + 1] === HARDEST && !s.scannon) {
        b1 = false;
      }
      if (s.cannonx) {
        b1 = false;
      }
      if (b1) {
        s.digx = 50 * (s.iposx - s.framex) - 10;
        s.posx = 0.02 * (s.digx + 10) + s.framex;
        s.mode = 4;
        if (s.scannon) {
          s.timr2 = 1;
          s.dir2 = 3;
          boom(s, s.dir2);
        } else if (s.sounds) {
          s.sfx.loop('drill');
        }
      }
    }
  } else if (key === 32) {
    // Drill sideways in the facing direction.
    if (s.digtimr === 0 && s.mode === 1 && s.drill > 0.0 && !s.flame && s.iposy > 4 && !s.cannonx) {
      const dx = s.digx;
      if (s.right_side && s.iposy === 5) {
        for (let ix = 0; ix < s.nodig.length; ix++) {
          if (s.iposx + 1 === s.nodig[ix]) {
            return false;
          }
        }
      } else if (!s.right_side && s.iposy === 5) {
        for (let ixx = 0; ixx < s.nodig.length; ixx++) {
          if (s.iposx - 1 === s.nodig[ixx]) {
            return false;
          }
        }
      }

      s.digx = (s.iposx - s.framex) * 50 - 10;
      s.digy = (s.iposy - s.framey) * 50 + 50;
      if (Math.abs(s.digx - dx) >= 20) {
        if (s.digx - dx > 0) {
          s.digx = s.digx - idiv(Math.abs(s.digx - dx), 2);
        } else {
          s.digx = s.digx + idiv(Math.abs(s.digx - dx), 2);
        }
      }

      s.posx = 0.02 * (s.digx + 10) + s.framex;
      if (!s.right_side && s.iposx > 0 && map[s.iposx - 1][s.iposy] < 75) {
        s.mode = 2;
        if (s.drill < 200.0 && (map[s.iposx - 1][s.iposy] === TOUGH1
            || map[s.iposx - 1][s.iposy] === TOUGH2)) {
          s.mode = 1;
        }
        if (s.drill < 500.0 && map[s.iposx - 1][s.iposy] === HARDEST) {
          s.mode = 1;
        }
        if (s.scannon) {
          s.timr2 = 1;
          s.dir2 = 2;
          boom(s, s.dir2);
        } else if (s.mode === 2 && s.sounds) {
          s.sfx.loop('drill');
        }
        if (s.mode === 2 && !s.scannon && map[s.iposx - 1][s.iposy] === HARDEST) {
          s.mode = 1;
        }
      } else if (s.right_side && s.iposx < 4999 && map[s.iposx + 1][s.iposy] < 75) {
        s.mode = 2;
        if (s.drill < 200.0 && (map[s.iposx + 1][s.iposy] === TOUGH1
            || map[s.iposx + 1][s.iposy] === TOUGH2)) {
          s.mode = 1;
        }
        if (s.drill < 500.0 && map[s.iposx + 1][s.iposy] === HARDEST) {
          s.mode = 1;
        }
        if (s.scannon) {
          s.timr2 = 1;
          s.dir2 = 1;
          boom(s, s.dir2);
        } else if (s.mode === 2 && s.sounds) {
          s.sfx.loop('drill');
        }
        if (s.mode === 2 && !s.scannon && map[s.iposx + 1][s.iposy] === HARDEST) {
          s.mode = 1;
        }
      }
    }
  } else if (key === 17) {
    s.ctrl = true;
  } else if (key === 10) {
    if (s.pop_up) {
      s.pop_up = false;
    }
  } else if (key === 16 && s.jet === 1) {
    // The jet glider on or off; it starts only on the surface.
    if (s.flame) {
      s.flame = false;
      s.glidespd = 0.0;
      s.posx = jround(s.posx);
      s.iposx = toInt(s.posx);
      s.digx = 50 * (s.iposx - s.framex) - 10;
      if (s.sounds) {
        s.sfx.stop('jet');
      }
    } else if (s.iposy === 4) {
      s.flame = true;
      if (s.sounds) {
        s.sfx.loop('jet');
      }
    }
  } else if (key === 77) {
    // Pause: the field, status bar, pod and transmission are drawn once into the field layer,
    // which is all the pause screen shows.
    s.status = true;
    s.mineralprofit = makeString(getMineralProfit(s));
    fieldStep(s);
    diggerStep(s);
    s.gfx.drawStatus();
  } else if (key === 67) {
    // The mineral converter on or off.
    if (s.processor) {
      s.processor = false;
      s.cursor = 'images/black_light.png';
    } else {
      s.processor = true;
      s.cursor = 'images/green_light.png';
    }
  }
  // The original's game-speed keys (- lengthened, = shortened the frame delay) are removed: the
  // web version runs at a fixed 60 ticks a second.
  return true;
}

// Keys in a base.
function shopKey(s, key) {
  if (key === 38) {
    if (s.sely > 0) {
      s.sely--;
    } else {
      s.sely = s.selymax;
    }
    if (s.tab === 3) {
      loadGadgetIcon(s);
    }
    if (s.sounds) {
      s.sfx.play('beep');
    }
  } else if (key === 37) {
    if (s.leave) {
      // Departure time one minute earlier, wrapping within the 8-hour day.
      if (s.xminutes >= 0) {
        s.xminutes--;
      }
      if (s.xminutes < 0) {
        s.xhours--;
        s.xminutes = 59;
      }
      if (s.xhours < 0) {
        s.xhours = 7;
      }
    } else {
      if (s.selx > 0) {
        s.selx--;
      } else {
        s.selx = 7;
      }
      if (s.sounds) {
        s.sfx.play('beep');
      }
    }
  } else if (key === 39) {
    if (s.leave) {
      if (s.xminutes < 60) {
        s.xminutes++;
      }
      if (s.xminutes === 60) {
        s.xhours++;
        s.xminutes = 0;
      }
      if (s.xhours === 8) {
        s.xhours = 0;
      }
    } else {
      if (s.selx < 7) {
        s.selx++;
      } else {
        s.selx = 0;
      }
      if (s.sounds) {
        s.sfx.play('beep');
      }
    }
  } else if (key === 40 && !s.leave) {
    if (s.sely < s.selymax) {
      s.sely++;
    } else {
      s.sely = 0;
    }
    if (s.tab === 3) {
      loadGadgetIcon(s);
    }
    if (s.sounds) {
      s.sfx.play('beep');
    }
  } else if (key === 10 && !s.pop_up && !s.end && !s.leave) {
    // Next tab. The first two bases have all four; the third has repairs and high scores; the
    // last only high scores.
    s.selx = 0;
    s.sely = 0;
    if (s.baseidx < 2) {
      if (s.tab < 4) {
        s.tab++;
      } else {
        s.tab = 1;
      }
    } else if (s.baseidx === 2) {
      if (s.tab === 1) {
        s.tab = 4;
      } else {
        s.tab = 1;
      }
    }
    if (s.baseidx === 3) {
      s.tab = 4;
    }

    if (s.tab === 1) {
      s.selymax = 5;
    } else if (s.tab === 2) {
      s.selymax = 6;
    } else if (s.tab === 3) {
      s.selymax = s.gadgetstr.length - 1;
    }

    if (s.tab === 1) {
      s.shop = 'images/repairs.jpg';
      s.cursor = 'images/repairs_cursor.png';
    } else if (s.tab === 2) {
      displayEvent(s);
      s.shop = 'images/upgrades.jpg';
      s.cursor = 'images/upgrades_cursor.png';
      s.ximgs[0] = 'images/upgrades_avail.png';
      s.ximgs[1] = 'images/upgrades_unav.png';
      s.ximgs[2] = 'images/upgrades_big.png';
    } else if (s.tab === 3) {
      s.shop = 'images/gadgets.jpg';
      s.cursor = 'images/blue_light.png';
      s.cursor1 = 'images/green_light.png';
      s.ximgs[0] = 'images/black_light.png';
      loadGadgetIcon(s);
      s.box1 = 'images/gadget_highlight.png';
    } else if (s.tab === 4) {
      s.shop = 'images/highscores.jpg';
    }
  } else if ((key === 10 || key === 27) && s.pop_up) {
    // Fix: Esc closes a pop-up as Enter does, instead of opening the departure-time dialog
    // behind it (see docs/mlu2/fixes.md, "Esc left the base with a pop-up still open").
    s.pop_up = false;
    s.popup = null;
  } else if (key === 27 && s.leave) {
    leaveBase(s);
  } else if (key === 27 && !s.end && !s.leave) {
    // Open the departure-time dialog, the clock rounded down to a whole step of 50 ticks.
    s.leave = true;
    s.time = jround(idiv(s.time, 50)) * 50;
  } else if (key === 32 && !s.leave) {
    if (s.tab === 1) {
      repairsEvent(s);
    } else if (s.tab === 2) {
      upgradesEvent(s);
    } else if (s.tab === 3) {
      gadgetsEvent(s);
    } else if (s.tab === 4 && s.score_name.length > 4) {
      recordScore(s);
    }
  }

  if (s.tab === 2) {
    displayEvent(s);
  }
}

// Esc in the departure-time dialog: back to the surface at the chosen time.
function leaveBase(s) {
  // Weather may clear while the pod was inside.
  if (s.xmax > 300 && s.rain && random() < 0.5) {
    s.rain = false;
  }
  if (s.xmax > 500) {
    // Quirk: wind clearing turns off the rain, not the wind.
    if (s.wind && random() < 0.5) {
      s.rain = false;
    }
    if (s.ashon && random() < 0.5) {
      s.ashon = false;
    }
  }

  s.skyx2 = -5;
  s.glidespd = 0.0;
  s.frostlevel = 0;
  s.posx = s.basex[s.baseidx] + 2;
  s.leave = false;
  s.iposx = jround(s.posx);
  s.digx = 50 * (s.iposx - s.framex) - 10;
  s.minutes = s.xminutes;
  s.hours = s.xhours;
  s.menu = false;
  s.timr1 = 0;
  s.etimr = 0;
  if (s.processor) {
    s.cursor = 'images/green_light.png';
  } else {
    s.cursor = 'images/black_light.png';
  }

  if (s.music) {
    s.sfx.musicStop();
    s.sfx.musicLoop('game_theme.mid');
  }
  if (s.sounds) {
    s.sfx.loop('wind');
  }

  s.shop = null;
  s.tab = 1;
  // Leaving at an earlier time of day than arriving starts a new day.
  if (s.ehours > s.hours || s.ehours === s.hours && s.eminutes > s.minutes) {
    s.days++;
  }

  loadSurface(s);
  loadGameTiles(s);
  loadClouds(s);
  backColor(s, s.temp);
  redraw(s);
  if (s.baseidx === 3) {
    s.entrytimr = 1;
    s.transporter = 'images/transporter.png';
  }

  // A mission is offered one time in five after selling at least $200 of cargo at the first two
  // bases.
  if (s.baseidx < 2 && s.minprof - getMineralProfit(s) >= 200 && random() < 0.2 && !s.is_mission) {
    newMission(s);
  }
}

// Keys on the start page: rows 0 new game, 1 load game, 2 cheat code, 3 level, 4 music,
// 5 sounds; letters and digits type the name or code.
function startKey(s, key) {
  if (key === 38) {
    if (s.sely > 0) {
      s.sely--;
    } else {
      s.sely = 5;
    }
    if (s.sounds) {
      s.sfx.play('beep');
    }
  } else if (key === 40) {
    if (s.sely < 5) {
      s.sely++;
    } else {
      s.sely = 0;
    }
    if (s.sounds) {
      s.sfx.play('beep');
    }
  } else if (key === 37) {
    if (s.sely === 4) {
      if (!s.music) {
        s.music = true;
        s.sfx.musicLoop('start_theme.mid');
      } else {
        s.music = false;
        s.sfx.musicStop();
      }
    } else if (s.sely === 5) {
      s.sounds = !s.sounds;
    } else if (s.sely === 3) {
      if (s.level > 1) {
        s.level--;
      } else {
        s.level = 3;
      }
    }
    // Quirk: the original beeped here only the one time it loaded its sounds; sounds are
    // preloaded, so that beep never comes.
  } else if (key === 39) {
    if (s.sely === 4) {
      if (!s.music) {
        s.music = true;
        s.sfx.musicLoop();
      } else {
        s.music = false;
        s.sfx.musicStop();
      }
    } else if (s.sely === 5) {
      s.sounds = !s.sounds;
    } else if (s.sely === 3) {
      if (s.level < 3) {
        s.level++;
      } else {
        s.level = 1;
      }
    }
  } else if (key >= 65 && key <= 90) {
    if (s.inputstr.length < 13) {
      s.inputstr = s.inputstr + String.fromCharCode(key + 32);
    }
  } else if (key >= 48 && key <= 57) {
    if (s.inputstr.length < 13) {
      s.inputstr = s.inputstr + String.fromCharCode(key);
    }
  } else if (key === 8 && s.inputstr.length > 0) {
    s.inputstr = s.inputstr.substring(0, s.inputstr.length - 1);
  } else if (key === 10 && s.pop_up) {
    s.pop_up = false;
  } else if (key === 10 && !s.pop_up && s.inputstr.length > 2) {
    if (s.sely === 0) {
      s.loading = true;
      s.msgstr = '';
      s.startpage = false;
      s.menu = false;
      genMap(s);
      s.loading = false;
      s.stpage = null;
      s.box1 = null;
      s.box2 = null;
      s.box3 = null;
    } else if (s.sely === 1) {
      loadGame(s);
      return;
    } else if (s.sely === 2) {
      cheatCode(s);
    }

    s.moneystr = makeString(s.money);
    s.scorestr = makeString(s.score);
  }
}

// Load game: reads the save named inputstr, then does what the original did after its
// synchronous read (a missing save gives the "file not found" pop-up).
function loadGame(s) {
  loading = true;
  const done = (text) => {
    loading = false;
    if (text !== null) {
      s.loading = true;
      s.msgstr = '';
      let ok = false;
      try {
        ok = loadMap(s, text);
      } catch (err) {
        ok = false;
      }
      if (ok) {
        s.stpage = null;
      } else {
        // Fix: a save that fails to load leaves nothing behind. The original kept the half-loaded
        // map and values and a pending "Error loading data!" that ended the next new game
        // after about two seconds (see docs/mlu2/fixes.md).
        const name = s.inputstr;
        const row = s.sely;
        const level = s.level;
        restart(s);
        s.inputstr = name;
        s.sely = row;
        s.level = level;
        s.ui.alert('Error', 'Invalid save-file!', false);
      }
      s.loading = false;
    } else {
      s.inputstr = '';
      s.pop_up = true;
      s.popup = 'images/file_not_found.jpg';
      s.popuptype = 2;
    }
    s.moneystr = makeString(s.money);
    s.scorestr = makeString(s.score);
  };
  s.store.read(s.inputstr).then(done, () => {
    // The browser could not read the save at all.
    loading = false;
    s.ui.alert('Error', 'Invalid save-file!', false);
    s.moneystr = makeString(s.money);
    s.scorestr = makeString(s.score);
  });
}

const CHEAT_MESSAGES = [
  '$1,000,000', 'Turbo-X Engine', 'Super Fuel Tank', 'Gigantic Cargo Bay',
  'Liquid Nitrogen Radiator', 'Energy-Shielded Hull', 'Super-Shield BioX', 'NanoTube Drill',
  'Kryptonite Battery', 'Unlimited Saves',
];

// Cheat code: the typed code picks cheat 1 to 10 for the next game, or the "wrong password"
// pop-up.
function cheatCode(s) {
  s.msgstr = '';
  const i = s.cheats.indexOf(s.inputstr);
  if (i >= 0 && i < 10) {
    s.msgstr = CHEAT_MESSAGES[i];
    s.cheat = i + 1;
  } else {
    s.pop_up = true;
    s.popup = 'images/wrong_password.jpg';
    s.popuptype = 4;
  }

  s.inputstr = '';
  if (s.msgstr !== '') {
    s.cheattimr = 1;
  } else {
    s.cheattimr = 0;
  }
}

/** A key release. */
export function keyUp(s, code) {
  const key = code;
  if (key === 38) {
    s.up_key = false;
    s.gastimr = 0;
    if (s.sounds) {
      s.sfx.stop('prop');
      s.sfx.stop('jet');
    }
  } else if (key === 37) {
    s.left_key = false;
  } else if (key === 39) {
    s.right_key = false;
  } else if (key === 40) {
    s.down_key = false;
  } else if (key === 17) {
    s.ctrl = false;
  } else if (key === 90) {
    s.zkey = false;
  } else if (key === 88) {
    s.xkey = false;
  } else if (key === 68) {
    s.laser_bar = false;
  }
}

/**
 * Uses a gadget: Z dynamite, X TNT, A hull repair, S drill repair, Q/W teleporters, T matter
 * transmitter, 1 sonic, 2 ice, 3 radiation bomb, V shield. Every key in play comes here, as do
 * clicks on the gadget panel.
 */
export function deployGadget(s, key) {
  if (key === 90 && s.digtimr === 0 && s.iposy > 2 && s.dyn > 0) {
    s.expl = 'images/dynomite.png';
    if (s.sounds) {
      s.sfx.play('dynamite');
    }
    s.ewidth = 150;
    s.eframes = 20;
    s.explx = s.digx - 40;
    s.exply = s.digy - 100;
    s.expls = true;
    s.etimr = 0;
    if (s.dyn > 0) {
      s.dyn--;
    }

    for (let i = 0; i < SHM; i++) {
      if (!s.grexists[i]) {
        s.grexists[i] = true;
        s.grxspd[i] = 16.0 * random() - 8.0;
        s.gryspd[i] = 16.0 * random() - 8.0;
        s.grx[i] = s.digx;
        s.gry[i] = s.digy;
        s.grscale[i] = jround(10.0 * random() + 10.0);
        s.grtype[i] = 0;
      }
    }

    let stx = s.iposx;
    let endx = s.iposx;
    if (s.iposx > 0) {
      stx = s.iposx - 1;
    }
    if (s.iposx < 4999) {
      endx = s.iposx + 1;
    }

    makeQuake(s);
    // Blasting at a base's door wrecks the base.
    for (let ix = 0; ix < BASE; ix++) {
      if (s.iposx < s.basex[ix] + 3 && s.iposx >= s.basex[ix] && s.iposy === 4) {
        s.baseok[ix] = false;
      }
    }

    explos(s, 1, stx, endx);
    checkMagma(s);
    redraw(s);
  } else if (key === 88 && s.digtimr === 0 && s.iposy > 2 && s.tnt > 0) {
    s.expl = 'images/tnt.png';
    if (s.sounds) {
      s.sfx.play('tnt');
    }
    s.ewidth = 250;
    s.eframes = 40;
    s.explx = s.digx - 90;
    s.exply = s.digy - 150;
    s.expls = true;
    s.etimr = 0;
    if (s.tnt > 0) {
      s.tnt--;
    }

    for (let ixx = 0; ixx < SHM; ixx++) {
      if (!s.grexists[ixx]) {
        s.grexists[ixx] = true;
        s.grxspd[ixx] = 20.0 * random() - 10.0;
        s.gryspd[ixx] = 20.0 * random() - 10.0;
        s.grx[ixx] = s.digx;
        s.gry[ixx] = s.digy;
        s.grscale[ixx] = jround(10.0 * random() + 10.0);
        s.grtype[ixx] = 0;
      }
    }

    let stxx = s.iposx;
    let endxx = s.iposx;
    if (s.iposx > 0) {
      stxx = s.iposx - 1;
    }
    if (s.iposx > 1) {
      stxx = s.iposx - 2;
    }
    if (s.iposx < 4999) {
      endxx = s.iposx + 1;
    }
    if (s.iposx < 4998) {
      endxx = s.iposx + 2;
    }

    makeQuake(s);
    // Quirk: "iposx <= 5" (not iposy) means TNT wrecks only the first base, and only when used
    // in its first columns.
    for (let ixxx = 0; ixxx < BASE; ixxx++) {
      if (s.iposx < s.basex[ixxx] + 4 && s.iposx >= s.basex[ixxx] - 1 && s.iposy >= 3
          && s.iposx <= 5) {
        s.baseok[ixxx] = false;
      }
    }

    explos(s, 2, stxx, endxx);
    checkMagma(s);
    redraw(s);
  } else if (key === 65 && s.hullfix > 0 && s.hull > 0 && s.digtimr === 0) {
    s.hullfix--;
    if (s.hull < 250) {
      s.hull = 0;
    } else {
      s.hull -= 250;
    }
  } else if (key === 83 && s.drillfix > 0 && s.drill < s.drillmax && s.digtimr === 0) {
    s.drillfix--;
    s.drill = s.drillmax;
  } else if (key === 81 && s.tel1 > 0 && s.digtimr === 0) {
    s.teltimr = 1;
    s.telmode = 1;
    s.telimg = 'images/tel1.png';
    s.tel1--;
    if (s.sounds) {
      s.sfx.play('teleport');
    }
  } else if (key === 87 && s.tel2 > 0 && s.digtimr === 0) {
    s.teltimr = 1;
    s.telmode = 2;
    s.telimg = 'images/tel2.png';
    s.tel2--;
    if (s.sounds) {
      s.sfx.play('teleport');
    }
  } else if (key === 84 && s.mtrans > 0 && s.baseidx < 2 && s.baseok[s.baseidx]) {
    // Matter transmitter: sends up to 500 lbs of cargo, lowest ids first, to the base for cash.
    s.mtrans--;
    let wtotal = 0;
    let mtotal = 0;
    let rxtotal = 0;
    for (let ixxxx = 0; ixxxx < s.minerals.length; ixxxx++) {
      const price1 = getPrice(ixxxx);
      const weight1 = getWeight(ixxxx);
      let cnt1 = 0;
      const rx1 = getRx(ixxxx);
      for (let j = 0; j < s.minerals[ixxxx] && wtotal + weight1 <= 500; j++) {
        wtotal += weight1;
        mtotal += price1;
        rxtotal += rx1;
        cnt1++;
      }
      s.minerals[ixxxx] = s.minerals[ixxxx] - cnt1;
    }

    // Quirk: the transmitted value ignores the difficulty's money factor.
    const str1 = '' + makeString(wtotal) + ' lbs worth ' + makeString(mtotal) + '$';
    const str2 = 'transmitted to the base';
    s.cargo -= wtotal;
    s.rx -= rxtotal;
    s.money += mtotal;
    s.moneystr = makeString(s.money);
    s.labl1 = true;
    s.labl1x = s.digx;
    s.labl1y = s.digy - 25;
    s.labl1timr = 0;
    s.lablspeed = 0;
    s.labl1str1 = str1;
    s.labl1str2 = str2;
  } else if (key === 49 && !s.sbomb && s.sonb > 0 && s.battery + s.fuel >= 70.0) {
    s.sonb--;
    s.sbomb = true;
    s.stimr = 0;
    s.sbombx = s.digx + 40;
    s.sbomby = s.digy - 10;
    if (s.battery >= 70.0) {
      s.battery -= 70.0;
    } else {
      s.fuel = s.fuel - (70.0 - s.battery);
      s.battery = 0.0;
    }
    if (s.sounds) {
      s.sfx.play('sonicbomb');
    }
  } else if (key === 50 && !s.ibomb && s.iceb > 0 && s.battery + s.fuel >= 100.0) {
    s.iceb--;
    s.ibomb = true;
    s.itimr = 0;
    s.ibombx = s.digx + 40;
    s.ibomby = s.digy - 10;
    if (s.battery >= 100.0) {
      s.battery -= 100.0;
    } else {
      s.fuel = s.fuel - (100.0 - s.battery);
      s.battery = 0.0;
    }
    if (s.sounds) {
      s.sfx.play('icebomb');
    }
    makeBombs(s);
  } else if (key === 51 && !s.rbomb && s.radb > 0 && s.battery + s.fuel >= 150.0) {
    s.radb--;
    s.rbomb = true;
    s.rtimr = 0;
    s.rbombx = s.digx + 40;
    s.rbomby = s.digy - 10;
    if (s.battery >= 150.0) {
      s.battery -= 150.0;
    } else {
      s.fuel = s.fuel - (150.0 - s.battery);
      s.battery = 0.0;
    }
  } else if (key === 86 && !s.shieldx && s.shield > 0) {
    s.shieldx = true;
    s.shield--;
  }
}

// The gadget panel's rows, as the keys that use them: Q W Z X V A S 1 2 3 T.
const GPANEL_KEYS = [81, 87, 90, 88, 86, 65, 83, 49, 50, 51, 84];

/** A click, at x, y in the 800 x 600 game picture. */
export function mouseClick(s, x, y) {
  if (loading || s.storeBusy) return;
  s.mouse_x = x;
  s.mouse_y = y;
  if (!s.menu) {
    if (s.is_mission && x > 512 && y > 450 && x < 526 && y < 464) {
      // The mission box's close button cancels the mission.
      s.is_mission = false;
    } else if (s.gpanel) {
      const key = s.sely >= 0 && s.sely < GPANEL_KEYS.length ? GPANEL_KEYS[s.sely] : 0;
      if (key !== 0) {
        deployGadget(s, key);
      }
    }
  } else if (s.menu && !s.startpage) {
    // In a base: the first click selects, a click on the selected item buys it.
    const memx = s.selx;
    const memy = s.sely;
    if (s.tab === 1 && x > 296 && x < 485) {
      if (y > 158 && y < 210) {
        s.sely = 0;
      } else if (y > 217 && y < 269) {
        s.sely = 1;
      } else if (y > 279 && y < 330) {
        s.sely = 2;
      } else if (y > 339 && y < 390) {
        s.sely = 3;
      } else if (y > 400 && y < 451) {
        s.sely = 4;
      } else if (y > 458 && y < 511) {
        s.sely = 5;
      }
      if (s.sounds) {
        s.sfx.play('beep');
      }
      if (memy === s.sely) {
        repairsEvent(s);
      }
    } else if (s.tab === 2) {
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 7; j++) {
          if (x > 19 + i * 83 && x < 19 + i * 83 + 69 && y > 106 + j * 69
              && y < 106 + j * 69 + 64) {
            s.selx = i;
            s.sely = j;
            if (s.sounds) {
              s.sfx.play('beep');
            }
          }
        }
      }
      displayEvent(s);
      if (memy === s.sely && memx === s.selx) {
        upgradesEvent(s);
      }
    } else if (s.tab === 3 && x > 313 && x < 720) {
      // Fix: all 20 gadget rows can be clicked; the original stopped at 17.
      for (let i = 0; i < 20; i++) {
        if (y > 146 + i * 18 && y <= 164 + i * 18) {
          s.sely = i;
        }
      }
      if (memy === s.sely) {
        gadgetsEvent(s);
      }
      if (s.sounds) {
        s.sfx.play('beep');
      }
    }
  }
}

/** The mouse moved to x1, y1 in the game picture: opens, closes and highlights the gadget panel. */
export function mouseMove(s, x1, y1) {
  if (!s.menu) {
    if (x1 > 10 && x1 < 60 && y1 > 25 && y1 < 45) {
      s.gpanel = true;
    }
    if (s.gpanel && (x1 > 92 || y1 > 435)) {
      s.gpanel = false;
    }
    if (s.gpanel) {
      const ystart = 60;
      s.sely = -1;
      for (let i = 0; i < 11; i++) {
        if (y1 > ystart + 12 + idiv(100 * i, 3) && y1 < ystart + 42 + idiv(100 * i, 3)) {
          s.sely = i;
          break;
        }
      }
    }
  }
}

/**
 * The game's menu items that change the game. 'restart' runs after the page's own "quit this
 * game?" Yes; 'music' and 'sounds' get the checkbox's new state as value; 'mission' returns the
 * mission text for the page to show, or null when there is no mission.
 */
export function menuAction(s, item, value) {
  if (item === 'restart') {
    s.menu = true;
    s.startpage = true;
    restart(s);
  } else if (item === 'mission') {
    if (s.is_mission) {
      return missionString(s.mission, s.minerals);
    }
    return null;
  } else if (item === 'music') {
    // Fix: the menu's check box sets the music switch, as the start page does; the original left
    // the switch alone (see docs/mlu2/fixes.md, "The menu's check boxes disagreed with the start
    // page").
    s.music = value;
    if (value) {
      if (s.menu && s.startpage) {
        s.sfx.musicLoop('start_theme.mid');
      } else if (s.menu && !s.startpage) {
        s.sfx.musicLoop('shops_theme.mid');
      } else if (!s.menu) {
        s.sfx.musicLoop('game_theme.mid');
      }
    } else {
      s.sfx.musicStop();
    }
  } else if (item === 'sounds') {
    s.sounds = value;
  }
  return null;
}

/**
 * Makes a game restored from a snapshot (in a base or on the pause screen) play on: no key is
 * held, the field layer (or the pause picture) is drawn from the restored game, the high-score
 * list is read from the store again, the tune of its screen plays when music is on, and on the
 * pause screen the wind, lava, rain and jet sounds start again as their switches say.
 */
export function resumed(s) {
  Object.assign(s, {
    up_key: false, down_key: false, left_key: false, right_key: false, ctrl: false,
    xkey: false, zkey: false, is_prop: false, fxLast: {},
  });
  if (s.status) s.gfx.drawStatus();
  else s.gfx.redrawField();
  loadHighScores(s);
  if (s.music) menuAction(s, 'music', true);
  if (s.sounds && !s.menu) {
    if (s.is_wind) s.sfx.loop('wind');
    if (s.is_lava) s.sfx.loop('lava');
    if (s.rain) s.sfx.loop('rain');
    if (s.flame) s.sfx.loop('jet');
  }
}
