// shop: The bases: entering one (and the mission payout), the repairs tab (selling, refuelling,
// repairs, saving), buying upgrades and gadgets, the upgrade details, cargo value and repair
// cost, number formatting, and the high-score table.
// Specification: docs/mlu2/specifications.md, Economy (9), Saved games (13).

import { idiv, jround, random } from './jmath.js';
import { getPrice, getUpgradePrice, getUpgradeName, getUpgradeAmount2 } from './stats.js';
import { isCompleted, getBonus } from './mission.js';
import { loadMenuTiles, loadHull, loadDrill } from './sprites.js';
import { setWeight } from './world.js';
import { gameSave } from './savefile.js';

/**
 * The pod enters a base. Reached from the play tick, so the mission-complete box stops the game
 * until it is closed.
 */
export function enterBase(s) {
  s.flame = false;
  s.eminutes = s.minutes;
  s.ehours = s.hours;
  s.menu = true;
  loadMenuTiles(s);
  s.selx = 0;
  s.sely = 0;
  s.tab = 1;
  s.selymax = 5;
  s.timr1 = 0;
  s.greentimr = 0;
  s.etimr = 0;
  s.scroll = 0;
  s.score_name = '';
  loadHighScores(s);
  if (s.baseidx < 2) {
    s.minprof = getMineralProfit(s);
    s.mineralprofit = makeString(s.minprof);
    s.repairscost = makeString(getRepairsCost(s));
  } else {
    s.minprof = 0;
    s.mineralprofit = '0';
    s.repairscost = '0';
  }

  if (s.sounds) {
    s.sfx.stopAll();
  }

  s.shop = 'images/repairs.jpg';
  s.cursor = 'images/repairs_cursor.png';
  if (s.music) {
    s.sfx.musicStop();
    s.sfx.musicLoop('shops_theme.mid');
  }

  if (s.is_mission && isCompleted(s.mission)) {
    s.money = s.money + getBonus(s.mission);
    s.moneystr = makeString(s.money);
    let msg1 = 'Mission Complete!\nBonus: $' + makeString(getBonus(s.mission));
    if (random() < 0.5) {
      msg1 = msg1 + '\n+1 Save';
      s.saves++;
    }
    s.ui.alert('Mission', msg1, true);
  }

  s.is_mission = false;
  if (s.baseidx === 3) {
    s.tab = 4;
    s.shop = 'images/highscores.jpg';
  }
}

/**
 * Space (or a second click) on the repairs tab. Rows: 0 everything, 1 save, 2 sell, 3 fuel,
 * 4 drill, 5 hull. The third base (baseidx 2) only empties the cargo, without paying for it.
 */
export function repairsEvent(s) {
  if (s.baseidx === 2) {
    if (s.sely === 0 || s.sely === 2) {
      s.cargo = idiv(s.nux, 5);
      s.rx = 0;
      s.mineralprofit = makeString(getMineralProfit(s));
      for (let i = 1; i < 45; i++) {
        s.minerals[i] = 0;
      }
    }
  } else {
    if (s.sely === 2 || s.sely === 0) {
      s.money = s.money + getMineralProfit(s);
      s.moneystr = makeString(s.money);
      s.rx = 0;
      s.cargo = idiv(s.nux, 5);
      for (let i = 1; i < 45; i++) {
        s.minerals[i] = 0;
      }
      s.mineralprofit = makeString(getMineralProfit(s));
    }

    if (s.sely === 3 || s.sely === 0) {
      const amount = 2.5 * (-s.fuel + s.fuelmax);
      if (s.money >= amount) {
        s.fuel = s.fuelmax;
        s.money = s.money - jround(amount);
      } else {
        s.fuel = s.fuel + idiv(2 * s.money, 5);
        s.money = 0;
      }
      s.moneystr = makeString(s.money);
    }

    if (s.sely === 5 || s.sely === 0) {
      const amount = 20 * s.hull;
      if (s.money >= amount) {
        s.hull = 0;
        s.money = s.money - jround(amount);
      } else {
        s.hull = s.hull - idiv(s.money, 20);
        s.money = 0;
      }
      s.moneystr = makeString(s.money);
    }

    if (s.sely === 4 || s.sely === 0) {
      const amount = 3.0 * (-s.drill + s.drillmax);
      if (s.money >= amount) {
        s.drill = s.drillmax;
        s.money = s.money - jround(amount);
      } else {
        s.drill = s.drill + idiv(s.money, 3);
        s.money = 0;
      }
      s.moneystr = makeString(s.money);
    }
  }

  if (s.sely === 1 && s.saves > 0 && s.saveok) {
    s.timr1 = 1;
    const used = s.saves < 999;
    if (used) {
      s.saves--;
    }

    // The save is written asynchronously and the rest happens once it is stored; "Game Saved"
    // appears only if it was.
    const text = gameSave(s);
    s.storeBusy = true;
    s.store.write(s.inputstr, text).then((ok) => {
      s.storeBusy = false;
      // Fix: a save that could not be stored gives its save back.
      if (!ok && used) {
        s.saves++;
      }
      if (ok) {
        s.popup = 'images/game_saved.jpg';
        s.popuptype = 3;
        s.pop_up = true;
      }
      s.repairscost = makeString(getRepairsCost(s));
    });
    return;
  }

  s.repairscost = makeString(getRepairsCost(s));
}

/** Space (or a second click) on the upgrades tab: buys the selected tier and every tier below. */
export function upgradesEvent(s) {
  const idx = 7 * s.selx + s.sely;
  s.selprice = getUpgradePrice(idx);
  if (s.money >= s.selprice && !s.upgrades[s.selx][s.sely]) {
    if (s.selx === 0) {
      s.engmax = s.selamount;
      s.engine = s.sely + 1;
    } else if (s.selx === 1) {
      s.fuelmax = s.selamount;
      s.fuel = s.fuelmax;
      s.fueltank = s.sely + 1;
    } else if (s.selx === 2) {
      s.cargomax = s.selamount;
      s.cargobay = s.sely + 1;
    } else if (s.selx === 3) {
      s.tempmax = s.selamount;
      s.radiator = s.sely + 1;
      if (s.sely === 1) {
        s.radf = 0.002;
      } else if (s.sely === 2) {
        s.radf = 0.003;
      } else if (s.sely === 3) {
        s.radf = 0.006;
      } else if (s.sely === 4) {
        s.radf = 0.01;
      } else if (s.sely === 5) {
        s.radf = 0.02;
      } else if (s.sely === 6) {
        s.radf = 0.03;
      }
    } else if (s.selx === 4) {
      s.hullmax = s.selamount;
      s.hull = 0;
      s.hullx = s.sely + 1;
      loadHull(s);
    } else if (s.selx === 5) {
      s.biomax = s.selamount;
      s.biox = s.sely + 1;
    } else if (s.selx === 6) {
      s.drillmax = s.selamount;
      s.drill = s.drillmax;
      s.drillx = s.sely + 1;
      loadDrill(s);
    } else {
      s.batmax = s.selamount;
      s.batx = s.sely + 1;
    }

    s.money = s.money - s.selprice;
    s.moneystr = makeString(s.money);
    for (let i = 0; i <= s.sely; i++) {
      s.upgrades[s.selx][i] = true;
    }
    setWeight(s);
  } else if (s.money < getUpgradePrice(idx) && !s.upgrades[s.selx][s.sely]) {
    s.popup = 'images/not_enough_cash.jpg';
    s.popuptype = 1;
    s.pop_up = true;
  }
}

/** Space (or a second click) on the gadgets tab: buys one of the selected gadget. */
export function gadgetsEvent(s) {
  const pr = s.gadgetprice[s.sely];
  if (s.money < pr) {
    s.popup = 'images/not_enough_cash.jpg';
    s.popuptype = 1;
    s.pop_up = true;
  } else if (s.sely === 0) {
    s.tel1++;
    s.money -= pr;
  } else if (s.sely === 1) {
    s.tel2++;
    s.money -= pr;
  } else if (s.sely === 2 && s.dyn < 50) {
    s.dyn++;
    s.money -= pr;
  } else if (s.sely === 3 && s.tnt < 30) {
    s.tnt++;
    s.money -= pr;
  } else if (s.sely === 4 && s.shield < 20) {
    s.shield++;
    s.money -= pr;
  } else if (s.sely === 5 && s.hullfix < 20) {
    s.hullfix++;
    s.money -= pr;
  } else if (s.sely === 6 && s.drillfix < 20) {
    s.drillfix++;
    s.money -= pr;
  } else if (s.sely === 7 && s.sonb < 20) {
    s.sonb++;
    s.money -= pr;
  } else if (s.sely === 8 && s.iceb < 20) {
    s.iceb++;
    s.money -= pr;
  } else if (s.sely === 9 && s.radb < 20) {
    s.radb++;
    s.money -= pr;
  } else if (s.sely === 10 && s.coalb === 0) {
    s.coalb = 1;
    s.money -= pr;
  } else if (s.sely === 11 && s.petrolr === 0) {
    s.petrolr = 1;
    s.money -= pr;
  } else if (s.sely === 12 && s.gasb === 0) {
    s.gasb = 1;
    s.money -= pr;
  } else if (s.sely === 13 && s.nuc === 0) {
    s.nuc = 1;
    s.money -= pr;
  } else if (s.sely === 14 && s.nucx === 0) {
    s.nucx = 1;
    s.money -= pr;
  } else if (s.sely === 15 && s.jet === 0) {
    s.jet = 1;
    s.money -= pr;
  } else if (s.sely === 16 && s.tractor === 0) {
    s.tractor = 1;
    s.money -= pr;
  } else if (s.sely === 17 && s.heater < 5) {
    s.heater++;
    s.money -= pr;
    s.heatf += 0.005;
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
  } else if (s.sely === 18) {
    s.mtrans++;
    s.money -= pr;
  } else if (s.sely === 19 && s.echarger === 0) {
    s.echarger = 1;
    s.money -= pr;
  } else {
    s.popup = 'images/limit_reached.jpg';
    s.popuptype = 1;
    s.pop_up = true;
  }

  s.moneystr = makeString(s.money);
}

/** The details of the selected upgrade: price, name, amount with its unit. */
export function displayEvent(s) {
  s.selstr3 = '$' + makeString(getUpgradePrice(7 * s.selx + s.sely));
  s.selstr1 = getUpgradeName(7 * s.selx + s.sely);
  s.selamount = getUpgradeAmount2(7 * s.selx + s.sely);
  if (s.selx === 0) {
    s.selstr2 = '' + s.selamount + ' HP';
  } else if (s.selx === 1) {
    s.selstr2 = '' + s.selamount + ' L';
  } else if (s.selx === 2) {
    s.selstr2 = '' + s.selamount + ' lbs.';
  } else if (s.selx === 3) {
    s.selstr2 = '' + s.selamount + ' F';
  } else if (s.selx === 4) {
    s.selstr2 = '' + s.selamount + ' Hits';
  } else if (s.selx === 5) {
    s.selstr2 = '' + s.selamount + ' Rx';
  } else if (s.selx === 6) {
    s.selstr2 = '' + s.selamount + ' DL';
  } else if (s.selx === 7) {
    s.selstr2 = '' + s.selamount + ' MW';
  }
}

/** What refuelling, repairing the drill and repairing the hull all cost. */
export function getRepairsCost(s) {
  const tot1 = 2.5 * (-s.fuel + s.fuelmax) + 3.0 * (-s.drill + s.drillmax) + 20.0 * s.hull;
  return jround(tot1);
}

/** What the cargo sells for. */
export function getMineralProfit(s) {
  let tot1 = 0;
  for (let i = 1; i < 45; i++) {
    // Fix: no 32-bit wrap-around (see docs/mlu2/fixes.md, "Money and score wrapped around").
    tot1 += idiv(s.minerals[i] * getPrice(i) * s.money_factor, 10);
  }
  return tot1;
}

/** Formats a whole number with thousands separators. */
export function makeString(num) {
  let str = '' + num;
  let str2 = '';
  let idx = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    str2 = str2 + str.charAt(i);
    if (++idx % 3 === 0) {
      idx = 0;
      str2 = str2 + ',';
    }
  }
  str = '';
  for (let ix = str2.length - 1; ix >= 0; ix--) {
    str = str + str2.charAt(ix);
  }
  // Quirk: a negative number with a multiple of three digits comes out as '-,123'.
  if (str.charAt(0) === ',') {
    str = str.substring(1, str.length);
  }
  return str;
}

/**
 * Reads the high-score table: s.highscores is empty at once and fills when the stored table has
 * been read. Entries are {name, score, days, date, id}, highest score first.
 */
export function loadHighScores(s) {
  const list = [];
  s.highscores = list;
  const token = ++scoresToken;
  s.store.readScores().then((scores) => {
    // A read that arrives after a newer read, or after recordScore changed the list, is dropped.
    if (token !== scoresToken || s.highscores !== list) return;
    for (const sc of scores) {
      list.push({ name: sc.name, score: sc.score, days: sc.days, date: sc.date, id: sc.id });
    }
  });
}

// Bumped by every read and every recorded score; see loadHighScores.
let scoresToken = 0;

/**
 * Records this game's score under score_name: replaces any entry of the same game, inserts it
 * after every entry with an equal or higher score, and stores the table.
 */
export function recordScore(s) {
  scoresToken++;
  for (let i = s.highscores.length - 1; i >= 0; i--) {
    if (s.highscores[i].id === s.gameid) {
      s.highscores.splice(i, 1);
    }
  }

  const d = new Date();
  const date1 = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
  const entry = { name: s.score_name, score: s.score, days: s.days, date: date1, id: s.gameid };
  let at = 0;
  while (at < s.highscores.length && s.highscores[at].score >= s.score) {
    at++;
  }
  s.highscores.splice(at, 0, entry);

  s.store.writeScores(s.highscores.slice());
}
