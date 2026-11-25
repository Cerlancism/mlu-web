// The base: its three tabs (repairs, upgrades, gadgets) and their actions.
// See "Economy" in docs/mlu1/specifications.md.

import { mineralPrice, upgradePrice, upgradeName, upgradeAmount, UPGRADE_UNITS,
  RADIATOR_COST } from './data.js';
import { idiv, jround } from './jmath.js';
import { loadHull, loadDrill, loadImages2, loadGameTiles } from './sprites.js';
import { serialise } from './savefile.js';

/** Formats a whole number with thousands separators, as the game does everywhere. */
export function makeString(n) {
  const digits = String(n);
  let rev = '';
  let count = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    rev += digits[i];
    if (++count % 3 === 0) {
      count = 0;
      rev += ',';
    }
  }
  let out = '';
  for (let i = rev.length - 1; i >= 0; i--) out += rev[i];
  if (out[0] === ',') out = out.substring(1);
  return out;
}

/** What the cargo sells for. */
export function mineralProfit(s) {
  let sum = 0;
  for (let v = 1; v < 45; v++) sum += idiv(s.minerals[v] * mineralPrice(v) * s.money_factor, 10);
  return sum;
}

/** What refuelling and repairing everything costs. */
export function repairsCost(s) {
  return jround(2.5 * (-s.fuel + s.fuelmax) + 3 * (-s.drill + s.drillmax) + 20 * s.hull);
}

/** Repairs tab: 0 everything, 1 save, 2 sell, 3 fuel, 4 drill, 5 hull. */
export function repairsAction(s) {
  const row = s.sely;
  if (row === 2 || row === 0) {
    s.money += mineralProfit(s);
    s.moneystr = makeString(s.money);
    s.cargo = 0;
    s.rx = 0;
    for (let v = 1; v < 45; v++) s.minerals[v] = 0;
    if (s.explorer) s.cargo = s.bomb1 * 10 + s.bomb2 * 20 + s.bomb3 * 40;
    s.mineralprofit = makeString(mineralProfit(s));
  }
  if (row === 3 || row === 0) {
    const cost = 2.5 * (-s.fuel + s.fuelmax);
    if (s.money >= cost) {
      s.fuel = s.fuelmax;
      s.money -= jround(cost);
    } else {
      s.fuel += idiv(2 * s.money, 5);
      s.money = 0;
    }
    s.moneystr = makeString(s.money);
  }
  if (row === 5 || row === 0) {
    const cost = 20 * s.hull;
    if (s.money >= cost) {
      s.hull = 0;
      s.money -= jround(cost);
    } else {
      s.hull -= idiv(s.money, 20);
      s.money = 0;
    }
    s.moneystr = makeString(s.money);
  }
  if (row === 4 || row === 0) {
    const cost = 3 * (-s.drill + s.drillmax);
    if (s.money >= cost) {
      s.drill = s.drillmax;
      s.money -= jround(cost);
    } else {
      s.drill += idiv(s.money, 3);
      s.money = 0;
    }
    s.moneystr = makeString(s.money);
  }
  if (row === 1) {
    s.timr1 = 1;
    // The "game saved" pop-up appears only if the browser stored it; otherwise the page reports
    // the failure.
    if (s.store.write(s.inputstr, serialise(s)) !== false) {
      s.popup = 'game_saved.jpg';
      s.pop_up = true;
    }
  }
  s.repairscost = makeString(repairsCost(s));
}

/** Upgrades tab: buys the selected tier, which also marks every lower tier as owned. */
export function upgradesAction(s) {
  const i = 7 * s.selx + s.sely;
  s.selprice = upgradePrice(i);
  if (s.money >= s.selprice && !s.upgrades[s.selx][s.sely]) {
    const amount = s.selamount;
    switch (s.selx) {
      case 0: s.engmax = amount; s.engine = s.sely + 1; break;
      case 1: s.fuelmax = amount; s.fuel = s.fuelmax; s.fueltank = s.sely + 1; break;
      case 2: s.cargomax = amount; s.cargobay = s.sely + 1; break;
      case 3:
        s.tempmax = amount;
        s.radiator = s.sely + 1;
        if (s.sely >= 1) s.radf = RADIATOR_COST[s.sely + 1];
        break;
      case 4: s.hullmax = amount; s.hull = 0; s.hullx = s.sely + 1; loadHull(s); break;
      case 5: s.biomax = amount; s.biox = s.sely + 1; break;
      case 6: s.drillmax = amount; s.drill = s.drillmax; s.drillx = s.sely + 1; loadDrill(s); break;
      default: s.batmax = amount; s.batx = s.sely + 1; break;
    }
    s.money -= s.selprice;
    s.moneystr = makeString(s.money);
    for (let t = 0; t <= s.sely; t++) s.upgrades[s.selx][t] = true;
  } else if (s.money < upgradePrice(i) && !s.upgrades[s.selx][s.sely]) {
    s.popup = 'not_enough_cash.jpg';
    s.pop_up = true;
  }
}

// Gadgets tab rows: price, the state field it adds to, and the most you can carry.
const GADGETS = [
  [20000, 'tel1', Infinity], [100000, 'tel2', Infinity], [2000, 'dyn', 50], [10000, 'tnt', 30],
  [20000, 'hullfix', 20], [100000, 'drillfix', 20], [30000, 'sonb', 20],
  // Fix: the Ice Bomb is listed at $50,000 and now costs that; the original took $30,000
  // (see docs/mlu1/fixes.md).
  [50000, 'iceb', 20],
  [1000, 'coalb', 1], [5000, 'petrolr', 1], [50000, 'gasb', 1], [200000, 'nuc', 1],
  [1000000, 'nucx', 1], [3000, 'jet', 1], [150000, 'tractor', 1],
];

/** Gadgets tab: buys one of the selected gadget, or the super-ship on row 15. */
export function gadgetsAction(s) {
  const row = GADGETS[s.sely];
  if (row && s.money >= row[0] && s[row[1]] < row[2]) {
    s[row[1]]++;
    s.money -= row[0];
  } else if (s.sely === 15 && s.money >= 100000000 && !s.explorer) {
    s.money -= 100000000;
    s.explorer = true;
    loadImages2(s);
    s.cargomax = 20000;
    s.fuelmax = 6000;
    s.engmax = 5000;
    s.fuel = 6000;
    s.mith = 0;
    s.unob = 0;
    s.adam = 0;
    s.img.msgscreen = 'msgscreen.png';
  } else {
    s.popup = 'limit_reached.JPG';
    s.pop_up = true;
  }
  s.moneystr = makeString(s.money);
}

/** Updates the upgrade details shown for the selected tile. */
export function displayUpgrade(s) {
  const i = 7 * s.selx + s.sely;
  s.selstr3 = `$${makeString(upgradePrice(i))}`;
  s.selstr1 = upgradeName(i);
  s.selamount = upgradeAmount(i);
  s.selstr2 = `${s.selamount}${UPGRADE_UNITS[s.selx]}`;
}

/** Enter in the base: the next tab, with its pictures. */
export function nextTab(s) {
  s.selx = 0;
  s.sely = 0;
  s.tab = s.tab < 3 ? s.tab + 1 : 1;
  if (s.tab === 1) s.selymax = 5;
  else if (s.tab === 2) s.selymax = 6;
  else {
    s.selymax = 14;
    if (s.mith >= 150 && s.unob >= 75 && s.adam >= 100) s.selymax = 15;
  }
  const img = s.img;
  if (s.tab === 1) {
    img.shop = 'repairs.jpg';
    img.cursor = 'repairs_cursor.png';
  } else if (s.tab === 2) {
    img.shop = 'upgrades.png';
    img.cursor = 'upgrades_cursor.png';
    img.cursor1 = 'upgrades_cursor1.png';   // does not exist
    img.shopimg0 = 'upgrades_avail.png';
    img.shopimg1 = 'upgrades_unav.png';
    img.shopimg2 = 'upgrades_big.png';
  } else {
    img.shop = 'gadgets.jpg';
    img.cursor = 'blue_light.png';
    img.cursor1 = 'green_light.png';
    img.shopimg0 = 'black_light.png';
    img.shopimg1 = 'ship_row.png';
    img.shopimg2 = 'x_minerals.png';
    img.box1 = 'gadget_highlight.png';
  }
}

/** Esc in the base: back to the surface beside it. */
export function leaveBase(s) {
  s.digx = 570;
  s.posx = 43.6;
  s.menu = false;
  loadGameTiles(s);
  s.timr1 = 0;
  s.etimr = 0;
  if (s.explorer && s.transy < 18000) {
    s.trans = true;
    s.transy = 10000;
  }
  s.img.cursor = s.processor ? 'green_light.png' : 'black_light.png';
  if (s.music) {
    s.theme = 'duke_nukem2.mid';
    s.sfx.musicLoop(s.theme);
  }
  s.img.shop = null;
}

