// The autopilot: a virtual player that plays the game through to the end. It presses and releases
// the same keys a player would, once before each tick, so the game's rules are untouched; it sees
// the whole game state, the map included, and follows the strategy of docs/mlu1/guide.md.
// See "Autopilot" in docs/mlu1/specifications.md.
//
// It keeps its own plans here, never in the game state, so snapshots and saves do not hold them.

import { K, MAP_W, MAGMA, EMPTY, GRANITE, MARBLE, LAVA, GAS, ICE9, RW, RH, mineralPrice,
  mineralWeight, mineralRx, upgradePrice, upgradeAmount, RADIATOR_COST } from './data.js';
import { keyDown, keyUp } from './controls.js';
import { idiv, jround } from './jmath.js';
import { mineralProfit, repairsCost } from './shop.js';
import { ROCK_BOXES } from './mantle.js';

// ---- The game's rules, as the autopilot predicts them ----------------------------------------

const isOpen = (v) => v >= MAGMA;
const isHard = (v) => v === GRANITE || v === MARBLE;
const BOMBS = { 51: 50, 52: 120, 53: 300 };      // tons of explosives in each Martian bomb
const MEGA = { 42: 'engine', 43: 'fueltank', 44: 'cargobay', 45: 'hullx', 46: 'radiator' };

/** Energy a dig uses per tick at a row. */
const digUse = (row) => 0.02 * (0.0077 * row + 0.5);
/** The temperature the game gives a pod at a row. */
const tempAt = (row) => jround(0.5 * row) - 10;
/** Ice9 drained per tick at a row (out of magma). */
const iceDrain = (row) => 1e-6 * row + 3e-4;
/** Energy flying uses per tick, without the jet booster. */
const flyUse = (s, cargo = s.cargo, fuel = s.fuel) => 5e-6 * (2000 + cargo + fuel) + 0.002;
/** Energy driving uses per tick, with or without Up held. */
const driveUse = (s, up) => (up ? 1e-6 * (2000 + s.cargo + s.fuel) + 5e-4
  : 2e-6 * (2000 + s.cargo + s.fuel) + 0.0015);
/** The engine load a tick's energy use gives; above the engine's power the engine fails. */
const load = (use) => jround(5500 * use);
/** The radiator's cost per tick for the next n ticks: nothing while Ice9 lasts. */
const radiator = (s, n, row) => (s.ice9 > iceDrain(row) * n + 0.01 ? 0 : s.radf);
/** Drill wear for collecting a tile at a row. */
function wear(v, row) {
  let w = 0.003 * row + 1;
  if (v === GRANITE) w += 0.3 * row + 100;
  else if (v === MARBLE) w += 0.75 * row + 250;
  return w;
}
/** The deepest row at which a dig keeps the engine load within the engine's power. */
function engineRow(s, radf = s.radf) {
  const r = (((s.engmax - 2) / 5500 - radf) / 0.02 - 0.5) / 0.0077;
  return Math.floor(r);
}
/** The deepest row at which falling and digging down cannot overheat, without Ice9. */
const heatRow = (s) => 2 * s.tempmax + 20;

// ---- A minimal binary heap for the route search ---------------------------------------------

class Heap {
  constructor(n) {
    this.key = new Float64Array(n);
    this.val = new Int32Array(n);
    this.n = 0;
  }

  push(k, v) {
    if (this.n === this.key.length) {
      const key = new Float64Array(2 * this.n);
      const val = new Int32Array(2 * this.n);
      key.set(this.key);
      val.set(this.val);
      this.key = key;
      this.val = val;
    }
    let i = this.n++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.key[p] <= k) break;
      this.key[i] = this.key[p];
      this.val[i] = this.val[p];
      i = p;
    }
    this.key[i] = k;
    this.val[i] = v;
  }

  pop() {
    const top = this.val[0];
    const k = this.key[--this.n];
    const v = this.val[this.n];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= this.n) break;
      if (c + 1 < this.n && this.key[c + 1] < this.key[c]) c++;
      if (this.key[c] >= k) break;
      this.key[i] = this.key[c];
      this.val[i] = this.val[c];
      i = c;
    }
    this.key[i] = k;
    this.val[i] = v;
    return top;
  }
}

// Ways of reaching a tile from its neighbour.
const UP = 1;       // fly up into an open tile
const FALL = 2;     // fall into an open tile
const DRIVE = 3;    // drive sideways on the ground into an open tile
const AIR = 4;      // move sideways in the air into an open tile
const DIG_DOWN = 5;
const DIG_SIDE = 6;
const HOW_NAME = ['', 'up', 'fall', 'drive', 'air', 'dig down', 'dig side'];

// ---- What the upgrades and gadgets are worth buying, in order ---------------------------------

// Tier fields of the eight upgrade categories, as the shop's grid columns.
const TIER = ['engine', 'fueltank', 'cargobay', 'radiator', 'hullx', 'biox', 'drillx', 'batx'];
const E = 0; const F = 1; const C = 2; const R = 3; const H = 4; const B = 5; const D = 6;
const BAT = 7;

// Gadget rows of the shop's gadgets tab.
const G = {
  tel1: 0, tel2: 1, dyn: 2, tnt: 3, hullfix: 4, drillfix: 5, sonb: 6, iceb: 7, coalb: 8,
  petrolr: 9, gasb: 10, nuc: 11, nucx: 12, jet: 13, tractor: 14, ship: 15,
};
const GADGET_PRICE = {
  tel1: 20000, tel2: 100000, hullfix: 20000, drillfix: 100000, iceb: 50000, sonb: 30000,
  gasb: 50000, nuc: 200000, nucx: 1000000, jet: 3000, coalb: 1000, petrolr: 5000,
};

// ---- The mantle --------------------------------------------------------------------------------

// Detonation depths, in order, and the mantle's figures for planning the dive.
const MANTLE_START = 29960;
const MANTLE_END = 162500;
const DIVE_SPEED = 20;
const DIVE_ENERGY = 9500;     // battery and fuel the dive at full speed needs, with a margin
const DIVE_ICE9 = 470;        // Ice9 it needs
const DIVE_NUX = 45000 + 600; // explosives: five detonations and a few TNT blasts

// ---- The autopilot -------------------------------------------------------------------------------

export function createAutopilot() {
  return new Autopilot();
}

class Autopilot {
  constructor() {
    this.on = false;
    this.held = new Set();
    this.status = 'Off';
    this.tickNo = 0;
    this.income = 0.5;     // dollars per tick, a running estimate used to price time
    this.reset();
  }

  /** Forgets every plan, as when switched on or when the game changes under it. */
  reset() {
    this.path = null;
    this.at = 0;
    this.goal = '';
    this.digWait = 0;
    this.lastTile = -1;
    this.stuck = 0;
    this.avoid = new Map();   // tile index -> tick until which the planner avoids it
    this.transWait = 0;
    this.baseWait = 0;
    this.visit = null;        // what has been done in this visit to the base
    this.trip = { money: 0, start: 0 };
    this.screen = '';
    this.field = null;
    this.ends = [];
    this.blocked = { cargo: 0, rad: 0 };
    this.tripEnd = '';
  }

  /** Switches the autopilot on or off. Its keys are released either way. */
  setOn(s, on) {
    if (on === this.on) return;
    this.releaseAll(s);
    this.on = on;
    this.reset();
    this.status = on ? 'On' : 'Off';
  }

  /** True while the autopilot is playing, when the player's keys are not passed to the game. */
  driving(s) {
    return this.on && !s.startpage;
  }

  // ---- keys ----

  hold(s, code, want) {
    if (want && !this.held.has(code)) {
      this.held.add(code);
      keyDown(s, code);
    } else if (!want && this.held.has(code)) {
      this.held.delete(code);
      keyUp(s, code);
    }
  }

  keys(s, { up = false, left = false, right = false, down = false, x = false, z = false } = {}) {
    // Releases come first, so that a direction change never holds both arrows.
    if (!left) this.hold(s, K.LEFT, false);
    if (!right) this.hold(s, K.RIGHT, false);
    if (!up) this.hold(s, K.UP, false);
    if (!down) this.hold(s, K.DOWN, false);
    if (!x) this.hold(s, K.X, false);
    if (!z) this.hold(s, K.Z, false);
    this.hold(s, K.LEFT, left);
    this.hold(s, K.RIGHT, right);
    this.hold(s, K.UP, up);
    this.hold(s, K.DOWN, down);
    this.hold(s, K.X, x);
    this.hold(s, K.Z, z);
  }

  /** A press and release before the tick, as a quick key stroke. */
  tap(s, code) {
    if (this.held.has(code)) this.hold(s, code, false);
    keyDown(s, code);
    keyUp(s, code);
  }

  releaseAll(s) {
    for (const code of [...this.held]) this.hold(s, code, false);
  }

  // ---- each tick ----

  step(s) {
    if (!this.on) return;
    this.tickNo++;
    const screen = s.startpage ? 'start' : s.menu ? 'base' : s.iposy >= 3000 ? 'mantle' : 'play';
    if (screen !== this.screen) {
      this.releaseAll(s);
      this.path = null;
      if (screen === 'base') this.visit = { sold: false, saved: false, updated: false, n: 0 };
      if (this.screen === 'base' && screen === 'play') this.trip = { money: s.money, start: s.time };
      this.screen = screen;
    }
    if (screen === 'start') {
      this.status = 'Waiting for a game';
    } else if (s.msg) {
      this.releaseAll(s);
      this.status = `Lost: ${s.msgstr}`;
    } else if (screen === 'base') {
      this.base(s);
    } else if (screen === 'mantle') {
      this.mantle(s);
    } else {
      this.play(s);
    }
  }

  // ---- play ------------------------------------------------------------------------------------

  play(s) {
    const m = s.map;
    // Transmissions: read for a moment, then closed. The victory one is left for the player,
    // because closing it ends the game.
    if (s.trans) {
      if (s.transy === 20000) {
        this.releaseAll(s);
        this.status = 'Won: close the transmission to end the game';
        return;
      }
      if (++this.transWait > 120) {
        this.transWait = 0;
        this.tap(s, K.ENTER);
      }
    }

    const x = Math.min(47, Math.max(0, jround(s.posx)));
    const y = jround(s.posy);
    const fy = Math.floor(s.posy + 0.01);

    // Falls are kept slow by pressing Up, which resets the fall speed, so landings never hurt.
    if (!this.held.has(K.UP) && s.fallspd > 7.5 && isOpen(m[x][fy + 1])) this.tap(s, K.UP);

    // A dig, or the super-ship's laser, runs on by itself.
    if (s.digtimr > 0 || s.mode === 2 || s.mode === 4 || s.timr2 > 0) {
      this.keys(s);
      return;
    }

    this.repairs(s, x, y);

    const tile = y * MAP_W + x;
    if (tile !== this.lastTile) {
      this.lastTile = tile;
      this.stuck = 0;
    } else if (++this.stuck > 240) {
      // No progress for four seconds: the plan is wrong. Avoid the next tile for a while.
      this.stuck = 0;
      const next = this.path?.[this.at];
      if (next) this.avoid.set(next.y * MAP_W + next.x, this.tickNo + 3000);
      this.path = null;
    }

    if (!this.path || this.at >= this.path.length) this.decide(s, x, y);
    if (this.path) this.follow(s, x, y, fy);
  }

  /** Repair kits and teleports that need no plan. */
  repairs(s, x, y) {
    if (s.explorer) return;
    if (s.hullfix > 0 && s.hullmax - s.hull < Math.min(250, this.hullReserve(s, y)) + 10
        && s.hull > 0) {
      this.tap(s, K.A);
    }
    if (s.drillfix > 0 && s.drill < wear(MARBLE, y) + 5 && s.drill < s.drillmax) {
      this.tap(s, K.S);
    }
  }

  /** Damage the pod should be able to take at a row before it turns back. */
  hullReserve(s, y) {
    let r = 4;
    if (y > 1000) r += 170;  // earthquake rocks hit for 80
    return r;
  }

  // ---- deciding ----

  /** The deepest row the pod can work at with what it has now. */
  floorRow(s) {
    if (s.explorer) return this.diveReady(s) ? 3000 : 2999;
    return this.limits(s).floor;
  }

  /**
   * The rows the pod's engine, radiator and fuel tank let it work down to, as they are or with
   * the capacities given in o: the engine must carry a dig, the radiator must keep it from
   * overheating, and without a teleporter the climb home must take no more than a third of the
   * tank. Below 10,000 ft earthquakes can close the way up, so the pod goes there only with two
   * teleporters and a hull that takes their rocks.
   */
  limits(s, o = {}) {
    const engmax = o.engmax ?? s.engmax;
    const radf = o.radf ?? s.radf;
    const tempmax = o.tempmax ?? s.tempmax;
    const fuelmax = o.fuelmax ?? s.fuelmax;
    const engine = Math.min(2998, engineRow({ engmax, radf }));
    const heat = s.ice9 > 30 ? 2998 : 2 * tempmax + 20;
    // Teleporter 1 brings the pod home from down to 8,000 ft, Teleporter 2 from anywhere.
    const tel1 = o.tel1 ?? s.tel1;
    const tel2 = o.tel2 ?? s.tel2;
    let tank = 2998;
    if (tel2 === 0) {
      const use = flyUse(s, 0.5 * s.cargomax, fuelmax) + radf;
      const lift = Math.max(1, Math.min(5, jround(-0.04 * idiv(100 * load(use), engmax) + 7)));
      // When everything above that is mined out and nothing deeper is affordable, half the tank.
      const share = this.minedOut(s) ? 0.5 : 0.33;
      tank = 4 + Math.floor((share * fuelmax) / (use * (50 / lift + 7) * 1.35));
      if (tel1 > 0) tank = Math.max(tank, 804);
    }
    const open = Math.max(6, Math.min(engine, heat, tank));
    let floor = open;
    if (floor > 1000 && (tel2 < 2 || s.hullmax < 300)) floor = 1000;
    // open: how deep the engine, radiator and tank alone would let it work.
    return { engine, heat, tank, open, floor: Math.max(floor, 6) };
  }

  /**
   * Whether the last two trips found nothing left to dig and the money buys nothing that goes
   * deeper.
   */
  minedOut(s) {
    const e = this.ends;
    return e.length >= 2 && e.slice(-2).every((t) => t.why === 'nothing left in reach')
      && s.money < (this.saving || Infinity) && s.money < GADGET_PRICE.tel1 + 5 * s.fuelmax;
  }

  diveReady(s) {
    return s.explorer && s.nux >= DIVE_NUX && s.ice9 >= DIVE_ICE9
      && s.fuel + s.battery >= DIVE_ENERGY;
  }

  /** Energy needed to get home from (x, y), with a margin. */
  homeEnergy(s, x, y) {
    if (this.canTeleport(s, y)) return this.teleportEnergy(s);
    return 1.35 * this.homeWay(s, x, y).energy + 0.08 * s.fuelmax + 2;
  }

  /** Ticks home from (x, y). */
  homeTicks(s, x, y) {
    return this.homeWay(s, x, y).ticks;
  }

  /**
   * Ticks and energy home from (x, y) along open tiles, from a map of every open tile's way
   * home, made again every few seconds.
   */
  homeWay(s, x, y) {
    const f = this.field;
    if (!f || this.tickNo - f.tick > 300 || y > f.bottom - 2) this.field = this.homeField(s, y + 120);
    const { dist, energy, bottom } = this.field;
    let i = y <= bottom ? y * MAP_W + x : -1;
    if (i < 0 || dist[i] === Infinity) {
      // A tile opened since the map was made: from its open neighbours.
      i = -1;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny > bottom) continue;
        const j = ny * MAP_W + nx;
        if (dist[j] < Infinity && (i < 0 || dist[j] < dist[i])) i = j;
      }
      if (i >= 0) return { ticks: dist[i] + 20, energy: energy[i] + 20 * (flyUse(s) + s.radf) };
      const ticks = (y - 4) * this.flyTicks(s) * 1.5 + Math.abs(x - 44) * 12;
      return { ticks, energy: ticks * (flyUse(s) + s.radf) };
    }
    return { ticks: dist[i], energy: energy[i] };
  }

  /**
   * Ticks from every open tile of rows 0..bottom to the base, flying, falling and driving
   * through open tiles only: a search from the base backwards.
   */
  homeField(s, bottom) {
    const m = s.map;
    bottom = Math.min(2999, bottom);
    const n = (bottom + 1) * MAP_W;
    const dist = new Float64Array(n).fill(Infinity);
    const energy = new Float64Array(n);
    const heap = new Heap(n + 16);
    const fly = this.flyTicks(s);
    const ex = s.explorer;
    const ok = (v) => isOpen(v) && (ex || v !== MAGMA);
    for (let tx = 45; tx < MAP_W; tx++) {
      dist[4 * MAP_W + tx] = 0;
      heap.push(0, 4 * MAP_W + tx);
    }
    // Energy per move, flying with at least half a cargo bay: it may have filled by then.
    const cargo = Math.max(s.cargo, 0.5 * s.cargomax);
    const up = (flyUse(s, cargo) + s.radf) * fly;
    const side = (2e-6 * (2000 + cargo + s.fuel) + 0.0015 + s.radf) * 11;
    const air = (0.8 * flyUse(s, cargo) + 1e-6 * (2000 + cargo + s.fuel) + 5e-4 + s.radf) * 18;
    let from = 0;
    const relax = (i, d, e) => {
      if (d < dist[i]) {
        dist[i] = d;
        energy[i] = energy[from] + e;
        heap.push(d, i);
      }
    };
    while (heap.n > 0) {
      const b = heap.pop();
      const bx = b % MAP_W;
      const by = (b - bx) / MAP_W;
      const db = dist[b];
      from = b;
      // Tiles from which the pod moves into b: below it (flying up), above it (falling), beside
      // it (driving or in the air).
      if (by + 1 <= bottom && ok(m[bx][by + 1]) && by >= 3) relax(b + MAP_W, db + fly, up);
      if (by - 1 >= 0 && ok(m[bx][by - 1])) relax(b - MAP_W, db + 4, 4 * s.radf);
      for (const dx of [-1, 1]) {
        const ax = bx + dx;
        if (ax < 0 || ax >= MAP_W || !ok(m[ax][by])) continue;
        const inAir = isOpen(m[ax][by + 1] ?? 0);
        relax(b + dx, db + (inAir ? 18 : 11), inAir ? air : side);
      }
    }
    return { dist, energy, bottom, tick: this.tickNo };
  }

  /** Energy to drive from the teleporters' landing place on the surface to the base, and more. */
  teleportEnergy(s) {
    return 1.5 * 260 * (driveUse(s, false) + s.radf) + 0.03 * s.fuelmax + 3;
  }

  canTeleport(s, y) {
    return (s.tel1 > 0 && (y - 4) * 10 <= 8000) || s.tel2 > 0;
  }

  /**
   * Ticks to fly up one row, on average over climbs of a few rows: each climb starts slowly, as
   * the lift builds up while Up is held. The jet booster is not counted on.
   */
  flyTicks(s) {
    const use = flyUse(s, Math.max(s.cargo, 0.5 * s.cargomax)) + s.radf;
    const lift = Math.max(1, Math.min(5, jround(-0.04 * idiv(100 * load(use), s.engmax) + 7)));
    return 50 / lift + 7;
  }

  /** Why the pod should head home now, or '' if it need not. */
  homeReason(s, x, y) {
    if (s.explorer) {
      if (s.fuel + s.battery < 300 && !this.diveReady(s)) return 'refuel';
      return '';
    }
    if (s.fuel + s.battery < this.homeEnergy(s, x, y) + 50 * digUse(y + 1) * 1.2) return 'fuel';
    if (s.hullmax - s.hull < this.hullReserve(s, y) && s.hullfix === 0) return 'hull';
    if (s.drill < wear(0, y + 1) * 2 && s.drillfix === 0) return 'drill';
    if (y > heatRow(s) && s.ice9 < iceDrain(y) * (y - heatRow(s)) * this.flyTicks(s) * 2 + 1) {
      return 'ice9';
    }
    if (y > this.floorRow(s) + 2 && y > heatRow(s)) return 'too deep';
    return '';
  }

  decide(s, x, y) {
    this.path = null;
    this.at = 0;
    const why = this.homeReason(s, x, y);
    if (why) {
      this.goHome(s, x, y, why);
      return;
    }
    // The whole map from a little above the pod to the deepest row it can work at.
    const floor = this.floorRow(s);
    // Deep down, an ice bomb freezes the magma round the pod into earth, opening the tiles beside
    // it to digging.
    if (this.iceBomb(s, x, y)) return;
    // The super-ship, with all it needs for the mantle: straight down into it.
    if (this.diveReady(s)) {
      const plan = this.search(s, x, y, Math.max(3, y - 40), 3000, (i, tx, ty) => ty >= 3000);
      if (plan.found >= 0) {
        this.path = this.route(plan, plan.found);
        this.at = 1;
        this.goal = 'Diving into the mantle';
        this.status = this.goal;
        return;
      }
    }
    // Near the pod first; the whole of the rows it can work at if nothing near pays.
    let top = Math.max(3, y - 60);
    let bottom = Math.max(y, Math.min(floor, y + 120));
    let plan = this.search(s, x, y, top, bottom);
    let best = this.bestTarget(s, plan, x, y);
    if (!best && (top > 3 || bottom < floor) && this.tickNo >= (this.emptyUntil ?? 0)) {
      top = 3;
      bottom = Math.max(y, floor);
      plan = this.search(s, x, y, top, bottom);
      best = this.bestTarget(s, plan, x, y);
      // Nothing anywhere: no need to look again for a while.
      if (!best) this.emptyUntil = this.tickNo + 1200;
    }
    this.last = { x, y, floor, top, bottom, best };
    if (best) {
      this.path = this.route(plan, best.i);
      this.at = 1;
      this.goal = best.goal;
      this.status = best.goal;
      return;
    }
    // Nothing worth digging in reach: home.
    this.goHome(s, x, y, this.blocked.cargo > 0 && s.cargo > 0 ? 'cargo bay full'
      : 'nothing left in reach');
  }

  /** Sets off an ice bomb if there is much magma on the screen near the pod. */
  iceBomb(s, x, y) {
    if (s.explorer || y <= 1190 || s.iceb === 0 || s.ibomb || s.battery + s.fuel < 100
        + this.homeEnergy(s, x, y) || this.tickNo < (this.iceUntil ?? 0)) return false;
    const m = s.map;
    let magma = 0;
    for (let ty = Math.max(s.framey, y - 6); ty < Math.min(s.framey + 12, y + 7); ty++) {
      for (let tx = Math.max(s.framex, x - 6); tx < Math.min(s.framex + 16, x + 7); tx++) {
        if (m[tx][ty] === MAGMA) magma++;
      }
    }
    if (magma < 8) return false;
    this.iceUntil = this.tickNo + 400;
    this.tap(s, K.D2);
    this.status = 'Freezing the magma with an ice bomb';
    return true;
  }

  goHome(s, x, y, why) {
    if (s.explorer && this.diveReady(s)) why = '';
    if (s.explorer && !why) return;
    this.tripEnd = why;
    // A teleporter is quicker than any route, but costs money: it is used when the cargo pays
    // for it many times over, or when the fuel cannot fly the pod home.
    const fly = 1.35 * this.homeWay(s, x, y).energy + 0.08 * s.fuelmax + 2;
    const cargo = mineralProfit(s);
    const t1 = s.tel1 > 0 && (y - 4) * 10 <= 8000 && y > 6;
    const t2 = s.tel2 > 0 && y > 30;
    const need = fly > s.fuel + s.battery;
    if (t1 && (need || cargo > 5 * GADGET_PRICE.tel1 || s.money > 5e6)) {
      this.tap(s, K.Q);
      this.status = `Teleporting home (${why})`;
      return;
    }
    if (t2 && (need || cargo > 5 * GADGET_PRICE.tel2 || s.money > 2e7 || y > 1000)) {
      this.tap(s, K.W);
      this.status = `Teleporting home (${why})`;
      return;
    }
    const plan = this.search(s, x, y, 3, Math.min(2999, y + 3), (i, tx, ty) => ty === 4 && tx >= 45);
    if (plan.found >= 0) {
      this.path = this.route(plan, plan.found);
      this.at = 1;
      this.goal = `Going home (${why})`;
      this.status = this.goal;
      return;
    }
    this.status = `No way home (${why})`;
  }

  /** What a tile is worth to collect now, in dollars. */
  value(s, v) {
    const w = mineralWeight(v);
    if (w > 0 && v !== ICE9) {
      if (w + s.cargo > s.cargomax) return 0;
      if (s.rx + mineralRx(v) > s.biomax) return 0;
    }
    if (v >= 1 && v <= 41 && (v < 28 || v > 31)) return idiv(mineralPrice(v) * s.money_factor, 10);
    if (v in MEGA) return s[MEGA[v]] < 8 ? 5e7 : 1;
    if (v === ICE9) {
      if (s.explorer) return s.nux >= DIVE_NUX && s.ice9 < DIVE_ICE9 + 40 ? 3e6 : 0;
      return 2e4;
    }
    if (v === 47) return s.explorer || s.mith >= 150 ? 0 : 1.5e6;
    if (v === 48) return s.explorer || s.unob >= 75 ? 0 : 3e6;
    if (v === 49) return s.explorer || s.adam >= 100 ? 0 : 2e6;
    if (v in BOMBS) return s.nux < DIVE_NUX + 2000 ? BOMBS[v] * 4000 : 0;
    if (v === LAVA && s.explorer) {
      return s.battery < s.batmax - 110 && s.nux >= DIVE_NUX ? 1e6 : 0;
    }
    return 0;
  }

  /**
   * The best tile to dig for, from the search: the map is known, so every collectable tile in
   * reach is weighed by its value per tick, counting the way back. A tile counts only if the fuel
   * takes the pod there and home again.
   */
  bestTarget(s, plan, x, y) {
    const m = s.map;
    const { dist, energy, top, rows } = plan;
    const fly = this.flyTicks(s);
    const have = s.fuel + s.battery;
    const home0 = this.homeWay(s, x, y).energy;
    const perTick = 5e-6 * (2000 + Math.max(s.cargo, 0.5 * s.cargomax) + s.fuel) + 0.002 + s.radf;
    const tele = this.canTeleport(s, top + rows);
    this.blocked = { cargo: 0, rad: 0 };
    let best = null;
    for (let r = 0; r < rows; r++) {
      const ty = top + r;
      for (let tx = 0; tx < MAP_W; tx++) {
        const i = r * MAP_W + tx;
        const d = dist[i];
        // Minerals the shielding cannot take, wherever they are: a reason to buy more of it.
        const rv = m[tx][ty];
        if (rv >= 6 && rv <= 27 && mineralRx(rv) > s.biomax - s.rx) {
          this.blocked.rad += idiv(mineralPrice(rv) * s.money_factor, 10);
        }
        if (d === Infinity || plan.how[i] < DIG_DOWN) continue;
        const v = m[tx][ty];
        const worth = this.value(s, v);
        if (worth <= 0) {
          if (mineralWeight(v) + s.cargo > s.cargomax && v <= 41) this.blocked.cargo++;
          continue;
        }
        const back = Math.max(0, ty - y) * fly;
        const home = tele ? this.teleportEnergy(s)
          : 1.35 * (home0 + perTick * (back + Math.abs(tx - x) * 12)) + 0.08 * s.fuelmax + 2;
        if (energy[i] + home > have) continue;
        const score = worth / (d + 40 + back);
        if (!best || score > best.score) best = { i, score };
      }
    }
    if (best) best.goal = this.describe(s, m, best, plan);
    return best;
  }

  describe(s, m, best, plan) {
    const tx = best.i % MAP_W;
    const ty = plan.top + Math.floor(best.i / MAP_W);
    const v = m[tx][ty];
    const names = { 42: 'the Mega engine', 43: 'the Mega fuel tank', 44: 'the Mega cargo bay',
      45: 'the Mega hull', 46: 'the Mega cooling system', 47: 'mithril', 48: 'unobtainium',
      49: 'adamantium', 50: 'Ice9', 51: 'a small bomb', 52: 'a medium bomb', 53: 'a large bomb',
      31: 'lava' };
    const what = names[v] ?? 'minerals';
    return `Digging for ${what} at ${((ty - 4) * 10).toLocaleString('en')} ft`;
  }

  // ---- the route search ----

  /**
   * Cheapest routes in ticks from (x0, y0) to every tile of rows top..bottom, digging where the
   * pod can dig safely. Returns the distances and the way each tile is reached; with a goal test,
   * it stops at the first tile that passes it.
   */
  search(s, x0, y0, top, bottom, goal = null) {
    const m = s.map;
    top = Math.max(0, Math.min(top, y0));
    bottom = Math.max(bottom, y0);
    const rows = bottom - top + 1;
    const n = rows * MAP_W;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const how = new Int8Array(n);
    const energy = new Float64Array(n);
    const heap = new Heap(n + 16);
    const start = (y0 - top) * MAP_W + x0;
    dist[start] = 0;
    heap.push(0, start);
    const fly = this.flyTicks(s);
    const tpd = 1 / Math.max(0.05, this.income);
    const ex = s.explorer;
    let found = -1;
    const fallOk = new Int8Array(n); // 0 unknown, 1 safe, 2 unsafe
    const safeFall = (tx, ty) => {
      // Landing after a tile with nothing under it: the fall must not end in magma or overheat.
      const i = (ty - top) * MAP_W + tx;
      if (fallOk[i]) return fallOk[i] === 1;
      let ok = true;
      for (let yy = ty + 1; yy < m[tx].length; yy++) {
        const v = m[tx][yy];
        if (!isOpen(v)) break;
        if ((v === MAGMA && !ex) || yy >= 3000 || !this.heatOk(s, yy, 0, 200)) { ok = false; break; }
      }
      fallOk[i] = ok ? 1 : 2;
      return ok;
    };
    // The surface above the base enters it: only a way home may go there.
    const baseRow = (4 - top) * MAP_W;
    // Energy for each way of moving, per tile: flying, falling, driving, in the air, digging.
    const fe = (flyUse(s) + s.radf) * fly;
    const de = (driveUse(s, false) + s.radf) * 11;
    const ae = (driveUse(s, true) + flyUse(s) + s.radf) * 18;
    const visit = (i, d, h, from) => {
      if (!goal && i >= baseRow + 45 && i < baseRow + MAP_W) return;
      if (d < dist[i]) {
        dist[i] = d;
        prev[i] = from;
        how[i] = h;
        const ry = top + Math.floor(i / MAP_W);
        energy[i] = energy[from] + (h === UP ? fe : h === FALL ? 4 * s.radf : h === DRIVE ? de
          : h === AIR ? ae : ex ? 30 + 26 * s.radf : 50 * (digUse(ry) + s.radf));
        heap.push(d, i);
      }
    };
    while (heap.n > 0) {
      const u = heap.pop();
      const ux = u % MAP_W;
      const uy = top + ((u - ux) / MAP_W);
      const du = dist[u];
      if (goal && goal(u, ux, uy)) { found = u; break; }
      const below = uy + 1 < m[ux].length ? m[ux][uy + 1] : 0;
      const support = !isOpen(below);
      // up
      if (uy - 1 >= top && uy - 1 >= 3) {
        const v = m[ux][uy - 1];
        if (isOpen(v) && (ex || v !== MAGMA) && !this.avoided(ux, uy - 1)) {
          visit(u - MAP_W, du + fly, UP, u);
        }
      }
      // down
      if (uy + 1 <= bottom) {
        const v = below;
        if (isOpen(v)) {
          if ((ex || v !== MAGMA) && (uy + 1 < 3000 || ex) && this.heatOk(s, uy + 1, 0, 100)) {
            visit(u + MAP_W, du + 4, FALL, u);
          }
        } else if (!this.avoided(ux, uy + 1)) {
          const c = this.digCost(s, ux, uy + 1, v, true, tpd);
          if (c < Infinity && (support || true) && (isOpen(m[ux][uy + 2] ?? 0)
              ? safeFall(ux, uy + 1) : true)) {
            visit(u + MAP_W, du + c, DIG_DOWN, u);
          }
        }
      }
      // sideways
      for (const dx of [-1, 1]) {
        const nx = ux + dx;
        if (nx < 0 || nx >= MAP_W || this.avoided(nx, uy)) continue;
        const v = m[nx][uy];
        const nOpenBelow = isOpen(m[nx][uy + 1] ?? 0);
        if (isOpen(v)) {
          if (!ex && v === MAGMA) continue;
          if (nOpenBelow && !safeFall(nx, uy)) continue;
          visit(u + dx, du + (support ? 11 : 18), support ? DRIVE : AIR, u);
        } else if (support && !(uy === 5 && nx >= 42) && uy >= 5) {
          if (nOpenBelow && !safeFall(nx, uy)) continue;
          const c = this.digCost(s, nx, uy, v, false, tpd);
          if (c < Infinity) visit(u + dx, du + c, DIG_SIDE, u);
        }
      }
    }
    return { dist, prev, how, energy, top, rows, found };
  }

  avoided(x, y) {
    const t = this.avoid.get(y * MAP_W + x);
    return t !== undefined && t > this.tickNo;
  }

  heatOk(s, row, extra, ticks) {
    if (s.ice9 > iceDrain(row) * ticks + 0.5) return true;
    return tempAt(row + 0.2) + extra <= s.tempmax;
  }

  /**
   * Ticks a dig into tile v at (x, y) costs, time and money together, or Infinity if it is not
   * safe now. Downward digs are checked for heat; every dig for the engine, the drill, damage,
   * radiation and magma flooding in.
   */
  digCost(s, x, y, v, down, tpd) {
    const m = s.map;
    if (y >= 3000) return s.explorer && this.diveReady(s) ? 25 : Infinity;
    if (s.explorer) {
      if (s.fuel + s.battery < 40) return Infinity;
      const w = mineralWeight(v);
      if (w > 0 && w + s.cargo <= s.cargomax && s.rx + mineralRx(v) > s.biomax) return Infinity;
      return 26;
    }
    if (s.drill <= 0 || (isHard(v) && s.drill < 200)) return Infinity;
    const dw = wear(v, y);
    if (s.drill - dw < 1) return Infinity;
    // The engine: digging, and also flying with the extra weight.
    let radf = radiator(s, 50, y);
    if (v === 46 && radf > 0) radf = 0.06;
    if (load(digUse(y) + radf) > s.engmax - 2) return Infinity;
    const w = mineralWeight(v);
    const takes = w > 0 && w + s.cargo <= s.cargomax && v !== ICE9;
    const cargo = s.cargo + (takes ? w : 0);
    if (load(flyUse(s, cargo) + driveUse(s, true) + Math.max(radf, s.radf)) > s.engmax - 2) {
      return Infinity;
    }
    // Heat: a downward dig is checked as it finishes.
    let extra = 0;
    if (v === LAVA) extra = 100;
    if (down && !this.heatOk(s, y, extra, 60)) return Infinity;
    // Damage.
    let dmg = 0;
    if (v === GAS && s.gasb === 0) dmg = 20;
    if (v === LAVA) dmg = 100;
    if (s.hull + dmg > s.hullmax - this.hullReserve(s, y)) return Infinity;
    // Radiation.
    if (takes && s.rx + mineralRx(v) > s.biomax) return Infinity;
    // Magma pours into a tile opened beside it or below it.
    if (y > 1190) {
      if ((x > 0 && m[x - 1][y] === MAGMA) || (x < 47 && m[x + 1][y] === MAGMA)
          || m[x][y - 1] === MAGMA) return Infinity;
    }
    // A Mega part the engine cannot take, or one that is no use.
    if (v === 46 && s.engmax < 1500) return Infinity;
    const dollars = dw * 3 + 50 * digUse(y) * 2.5 + dmg * 40 + (v === LAVA ? 3000 : 0);
    return 52 + dollars * tpd * 0.5;
  }

  /** The tiles of the route to tile i, from the pod's own. */
  route(plan, i) {
    const out = [];
    for (let j = i; j >= 0; j = plan.prev[j]) {
      const x = j % MAP_W;
      out.push({ x, y: plan.top + (j - x) / MAP_W, how: plan.how[j] });
      if (plan.prev[j] < 0) break;
    }
    return out.reverse();
  }

  // ---- following a route ----

  follow(s, x, y, fy) {
    const m = s.map;
    const P = this.path;
    // Catch up with the route: the pod may already be further along it.
    let j = -1;
    for (let k = this.at; k < Math.min(P.length, this.at + 6); k++) {
      if (P[k].x === x && P[k].y === y && this.arrived(s, P, k)) j = k;
    }
    if (j >= 0) this.at = j + 1;
    if (this.at >= P.length) {
      this.keys(s);
      this.path = null;
      return;
    }
    const prev = P[this.at - 1];
    if (prev.x !== x || prev.y !== y) {
      // Off the route: the move into the next tile may still be under way.
      const next = P[this.at];
      const near = Math.abs(next.x - x) + Math.abs(next.y - y) <= 1
        && Math.abs(prev.x - x) + Math.abs(prev.y - y) <= 1;
      if (!near) {
        this.path = null;
        this.keys(s);
        return;
      }
    }
    const next = P[this.at];
    const tv = m[next.x][next.y];
    switch (next.how) {
      case UP: this.flyUp(s, P); break;
      case FALL: this.keys(s); break;
      case DRIVE:
      case AIR: this.sideways(s, next, fy); break;
      case DIG_DOWN:
      case DIG_SIDE:
        if (isOpen(tv)) {
          // Already open (the laser, or magma flowing): move into it instead.
          next.how = next.how === DIG_DOWN ? FALL : isOpen(m[x][fy + 1]) ? AIR : DRIVE;
          this.keys(s);
          break;
        }
        this.dig(s, next, x, y, fy);
        break;
      default: this.path = null;
    }
  }

  /** Whether the pod has reached route tile k well enough to go on from it. */
  arrived(s, P, k) {
    const t = P[k];
    if (t.how === DRIVE || t.how === AIR || t.how === DIG_SIDE) {
      const n = P[k + 1];
      const same = n && (n.how === DRIVE || n.how === AIR) && n.y === t.y
        && Math.sign(n.x - t.x) === Math.sign(t.x - P[k - 1].x);
      return same || Math.abs(s.posx - t.x) <= 0.12;
    }
    return true;
  }

  flyUp(s, P) {
    // The jet booster for long climbs, off for the last rows and whenever the engine would fail.
    let run = 0;
    for (let k = this.at; k < P.length && P[k].how === UP; k++) run++;
    const base = flyUse(s) + radiator(s, 60, s.posy);
    const jetOk = s.jet === 1 && load(2 * flyUse(s) + radiator(s, 60, s.posy)) <= s.engmax - 2;
    const want = jetOk && run >= 3;
    if (s.flame !== want) this.tap(s, K.SHIFT);
    if (load(base) > s.engmax - 2) {
      // The engine cannot lift this load: wait for a teleport instead.
      this.keys(s);
      this.path = null;
      this.status = 'Too heavy to fly';
      return;
    }
    // Stay in the column's middle.
    const t = P[this.at];
    const dx = t.x - s.posx;
    this.keys(s, { up: true, left: dx < -0.3, right: dx > 0.3 });
  }

  sideways(s, t, fy) {
    const m = s.map;
    if (s.flame) this.tap(s, K.SHIFT);
    const x = Math.min(47, Math.max(0, jround(s.posx)));
    const air = isOpen(m[x][fy + 1]);
    // In the air the height is held by pressing Up in bursts: it rises slowly and falls fast.
    const up = air && s.posy > t.y + 0.1;
    const dx = t.x - s.posx;
    const dir = Math.abs(dx) > 0.06 ? Math.sign(dx) : 0;
    const use = (up ? flyUse(s) : 0) + (dir ? driveUse(s, up) : 0) + radiator(s, 20, s.posy);
    const ok = load(use) <= s.engmax - 2;
    this.keys(s, { up, left: ok && dir < 0, right: ok && dir > 0 });
  }

  dig(s, t, x, y, fy) {
    const m = s.map;
    if (s.flame) this.tap(s, K.SHIFT);
    const standing = s.mode === 1 && !isOpen(m[x][fy + 1]) && !this.held.has(K.UP);
    if (!standing) {
      // Wait to land, holding nothing.
      this.keys(s);
      return;
    }
    // Check again with the state as it is now.
    const down = t.how === DIG_DOWN;
    const v = m[t.x][t.y];
    const c = this.digCost(s, t.x, t.y, v, down, 1 / Math.max(0.05, this.income));
    if (c === Infinity || (!this.goal.startsWith('Going home') && this.homeReason(s, x, y))) {
      this.path = null;
      this.keys(s);
      return;
    }
    this.keys(s);
    if (this.digWait > 0) {
      // The last press did not start a dig: something blocks it.
      if (--this.digWait === 0) {
        this.avoid.set(t.y * MAP_W + t.x, this.tickNo + 2000);
        this.path = null;
      }
      return;
    }
    if (down) {
      this.tap(s, K.DOWN);
    } else {
      const right = t.x > x;
      if (s.right_side !== right) this.tap(s, right ? K.RIGHT : K.LEFT);
      this.tap(s, K.SPACE);
    }
    // If the dig starts, the next tick waits for it; if not, give up on this tile after a few.
    this.digWait = s.digtimr === 0 && s.mode === 1 && !s.explorer ? 0 : 0;
    if (s.mode !== 2 && s.mode !== 4 && !s.explorer) this.digWait = 4;
    if (s.explorer && s.timr2 === 0) this.digWait = 4;
  }

  // ---- the base ----------------------------------------------------------------------------------

  base(s) {
    if (this.baseWait > 0) {
      this.baseWait--;
      return;
    }
    this.baseWait = 3;
    if (s.pop_up) {
      this.tap(s, K.ENTER);
      return;
    }
    const v = this.visit;
    if (++v.n > 400) {
      // Something went wrong in the shop: leave.
      this.tap(s, K.ESC);
      return;
    }
    const act = this.shopping(s);
    this.status = act.label;
    if (act.kind === 'leave') {
      this.tap(s, K.ESC);
      this.recordTrip(s);
      return;
    }
    // Go to the tab, then the row and column, then buy.
    if (s.tab !== act.tab) {
      this.tap(s, K.ENTER);
      return;
    }
    if (act.tab === 2 && s.selx !== act.col) {
      const right = (act.col - s.selx + 8) % 8;
      this.tap(s, right <= 4 ? K.RIGHT : K.LEFT);
      return;
    }
    if (s.sely !== act.row) {
      const n = s.selymax + 1;
      const downs = (act.row - s.sely + n) % n;
      this.tap(s, downs <= n / 2 ? K.DOWN : K.UP);
      return;
    }
    this.tap(s, K.SPACE);
    if (act.done) act.done();
  }

  recordTrip(s) {
    this.ends.push({ why: this.tripEnd ?? '', rad: this.blocked?.rad ?? 0 });
    if (this.ends.length > 4) this.ends.shift();
    const t = this.trip;
    const ticks = Math.max(1, s.time - t.start);
    if (t.start > 0 || t.money > 0) {
      const rate = Math.max(0, s.money - t.money) / ticks;
      this.income = 0.7 * this.income + 0.3 * Math.max(0.05, rate);
    }
  }

  /** The next thing to do in the base. */
  shopping(s) {
    const v = this.visit;
    const repair = (row, label, done) => ({ kind: 'buy', tab: 1, row, label, done });
    if (!v.sold && (s.cargo > 0 || mineralProfit(s) > 0)) {
      return repair(2, 'Selling the cargo', () => { v.sold = true; });
    }
    v.sold = true;
    // The super-ship, once its materials are in.
    if (!s.explorer && s.mith >= 150 && s.unob >= 75 && s.adam >= 100 && s.money >= 100000000) {
      return { kind: 'buy', tab: 3, row: G.ship, label: 'Buying the super-ship' };
    }
    // Money for two refills is always kept back.
    const reserve = repairsCost(s) + 5 * s.fuelmax + 50 + (s.money > 2e6 ? 2e5 : 0);
    const spare = s.money - reserve;
    const lim = this.limits(s);
    if (lim.floor === lim.tank && !s.explorer) {
      const gadget = this.nextGadget(s, spare);
      if (gadget === 'tel1' || gadget === 'tel2') {
        return { kind: 'buy', tab: 3, row: G[gadget], label: `Buying ${gadget}` };
      }
    }
    const up = this.nextUpgrade(s, spare);
    if (up) {
      return { kind: 'buy', tab: 2, col: up[0], row: up[1] - 1,
        label: `Buying an upgrade (${['engine', 'fuel tank', 'cargo bay', 'radiator', 'hull',
          'Bio-X shielding', 'drill', 'battery'][up[0]]})` };
    }
    const gadget = this.nextGadget(s, spare);
    if (gadget) return { kind: 'buy', tab: 3, row: G[gadget], label: `Buying ${gadget}` };
    if (!v.updated && repairsCost(s) > 0 && s.money > 0) {
      return repair(0, 'Refuelling and repairing', () => { v.updated = true; });
    }
    v.updated = true;
    if (!v.saved) return repair(1, 'Saving the game', () => { v.saved = true; });
    return { kind: 'leave', label: 'Leaving the base' };
  }

  /**
   * The next upgrade to buy now, as [category, tier], or null to save up. First the hull the
   * working depth needs; then whatever lets the pod work deepest per dollar, since deeper rows
   * pay more; then what made the last trips end early: a full cargo bay, a worn drill,
   * radioactive minerals left behind for want of shielding.
   */
  nextUpgrade(s, spare) {
    const next = (c) => (s[TIER[c]] >= 7 ? 0 : s[TIER[c]] + 1);
    const price = (c, t) => upgradePrice(7 * c + t - 1);
    const amount = (c, t) => upgradeAmount(7 * c + t - 1);
    const fits = (c, t) => {
      // A bigger cargo bay or fuel tank must not overload the engine when full.
      const cargo = c === C ? amount(c, t) : s.cargomax;
      const fuel = c === F ? amount(c, t) : s.fuelmax;
      return load(flyUse(s, cargo, fuel) + driveUse(s, true) + s.radf) <= s.engmax - 5;
    };
    const capacities = (buy) => {
      const o = {};
      for (const [c, t] of buy) {
        if (c === E) o.engmax = amount(c, t);
        if (c === R) { o.tempmax = amount(c, t); o.radf = RADIATOR_COST[t]; }
        if (c === F) o.fuelmax = amount(c, t);
      }
      return o;
    };
    // The super-ship needs a big battery for the mantle's dive.
    if (s.explorer) {
      if (s.batx < 6) return upgradePrice(7 * BAT + 5) <= spare ? [BAT, 6] : null;
      if (s.batx < 7 && s.money > 3e7) return [BAT, 7];
      return null;
    }
    const now = this.limits(s);
    // The hull the working depth needs: gas and lava from 6,000 ft, earthquakes below 10,000.
    const hullNeed = now.open > 1000 ? 600 : now.open > 600 ? 200 : now.open > 150 ? 30 : 10;
    if (s.hullmax < hullNeed && next(H)) {
      return price(H, next(H)) <= spare ? [H, next(H)] : null;
    }
    // Deeper: the set of engine, radiator and fuel tank upgrades that gains most rows per dollar.
    const sets = [[E], [R], [F], [E, R], [E, F], [R, F], [E, R, F]];
    const options = [];
    for (const set of sets) {
      const buy = set.map((c) => [c, next(c)]);
      if (buy.some(([c, t]) => !t || (c === F && !fits(c, t)))) continue;
      const cost = buy.reduce((a, [c, t]) => a + price(c, t), 0);
      const gain = this.limits(s, capacities(buy)).floor - now.floor;
      if (gain > 0) options.push({ buy, cost, gain, ratio: gain / cost });
    }
    const worthwhile = options.filter((o) => o.gain >= Math.max(8, 0.08 * now.floor));
    const deeper = worthwhile.sort((a, b) => b.ratio - a.ratio)[0] ?? null;
    this.saving = deeper ? deeper.cost : 0;
    if (deeper && deeper.cost <= spare) return deeper.buy[0];
    // Upgrades for the way trips have been ending, while saving for the deeper set, if they
    // leave the savings on course.
    const ends = this.ends.map((e) => e.why);
    const count = (w) => ends.filter((e) => e === w).length;
    const extra = [];
    // A bigger cargo bay must still leave the engine room for the next fuel tank.
    const roomy = (t) => fits(C, t) && (!next(F) || load(flyUse(s, amount(C, t), amount(F, next(F)))
      + driveUse(s, true) + s.radf) <= s.engmax - 5);
    if (count('cargo bay full') >= 1 && next(C) && roomy(next(C))) extra.push([C, next(C)]);
    if (count('drill') >= 1 && next(D)) extra.push([D, next(D)]);
    if (this.ends.some((e) => e.rad > 0) && next(B)) extra.push([B, next(B)]);
    if (s.drillmax < 200 && now.floor > 120 && next(D)) extra.push([D, next(D)]);
    for (const [c, t] of extra) {
      const p = price(c, t);
      if (p <= spare && this.leaves(s, spare - p)) return [c, t];
    }
    // Nothing left to mine above the floor: whatever goes deeper that the money buys now.
    if (count('nothing left in reach') >= 1) {
      const cheap = options.filter((o) => o.cost <= spare).sort((a, b) => b.ratio - a.ratio)[0];
      if (cheap) return cheap.buy[0];
    }
    return null;
  }

  /**
   * Whether spending down to spare dollars still leaves the deeper upgrades within reach: what
   * is left to mine above the floor, with what remains, must pay for them.
   */
  leaves(s, spare) {
    if (!this.saving || spare >= this.saving) return true;
    if (this.visit.left === undefined) {
      const m = s.map;
      let sum = 0;
      for (let y = 5; y <= this.floorRow(s); y++) {
        for (let x = 0; x < MAP_W; x++) {
          const v = m[x][y];
          if (v >= 1 && v <= 41 && (v < 28 || v > 31) && mineralRx(v) <= s.biomax) {
            sum += idiv(mineralPrice(v) * s.money_factor, 10);
          }
        }
      }
      this.visit.left = sum;
    }
    return spare + 0.6 * this.visit.left >= this.saving;
  }

  /** The next gadget to buy now, or null. */
  nextGadget(s, spare) {
    const want = [];
    // Teleporters when the climb home is what keeps the pod from going deeper.
    const now = this.limits(s);
    if (now.floor === now.tank) {
      const t1 = this.limits(s, { tel1: 2 }).floor;
      const t2 = this.limits(s, { tel2: 2 }).floor;
      if (t1 > now.floor && t1 >= t2 - 20) want.push(['tel1', 2, true]);
      else if (t2 > now.floor) want.push(['tel2', 2, true]);
    }
    if (s.jet === 0 && s.engine >= 3) want.push(['jet', 1]);
    if (s.money > 3e5 && now.floor <= 804) want.push(['tel1', 3]);
    if (s.engine >= 6 || s.engine === 8) want.push(['gasb', 1]);
    if (now.open > 1000 && s.hullmax >= 300) want.push(['tel2', s.money > 5e6 ? 4 : 2]);
    if (s.hullmax >= 600 && s.money > 1e6) want.push(['hullfix', 3]);
    if (s.drillmax >= 2000 && s.money > 5e6) want.push(['drillfix', 2]);
    if (now.floor > 1190 && s.money > 2e6) want.push(['iceb', s.money > 2e7 ? 12 : 5]);
    for (const [g, n, deeper] of want) {
      if (s[g] >= n || GADGET_PRICE[g] > spare) continue;
      // A teleporter that lets the pod work deeper is itself the way to earn more.
      if (deeper || this.leaves(s, spare - GADGET_PRICE[g])) return g;
    }
    return null;
  }

  // ---- the mantle --------------------------------------------------------------------------------

  mantle(s) {
    const keys = {};
    // Dive at full speed.
    if (s.vspeed < DIVE_SPEED - 0.05) keys.x = true;
    // Detonate within 150 ft of each target depth.
    if (!s.nucb && s.nux >= 9000 && s.detd !== 0 && Math.abs(s.depth - s.detd) < 150) {
      this.tap(s, K.ENTER);
    }
    // Dodge the rocks: the best of nine steady moves over the next ticks.
    const move = this.dodge(s);
    keys.left = move.dx < 0;
    keys.right = move.dx > 0;
    keys.up = move.dy < 0;
    keys.down = move.dy > 0;
    if (move.hit < 6 && s.nux >= 9000 * this.detonationsLeft(s) + 100 && !s.expls) {
      this.tap(s, K.SPACE);
    }
    this.keys(s, keys);
    const left = this.detonationsLeft(s);
    this.status = left ? `Diving: ${left} detonations to go` : 'Diving: the core restarts';
  }

  detonationsLeft(s) {
    const order = [85200, 102300, 105000, 147300, 162500];
    const i = order.indexOf(s.detd);
    return i < 0 ? 0 : 5 - i;
  }

  /** The steady move that keeps the ship clear of the rocks longest, nearest its station. */
  dodge(s) {
    const H = 45;
    let best = null;
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        let px = s.digx;
        let py = s.digy;
        const ry = s.gry.slice();
        let hit = H + 1;
        for (let t = 1; t <= H && hit > H; t++) {
          if (dx > 0 && px < RW) px += 5;
          else if (dx < 0 && px > 0) px -= 5;
          if (dy < 0 && py > 0) py -= 5;
          else if (dy > 0 && py < RH) py += 5;
          for (let i = 0; i < ry.length; i++) {
            if (!s.grexists[i]) continue;
            ry[i] = Math.trunc(ry[i] + (s.gryspd[i] - s.vspeed));
            const boxes = ROCK_BOXES[s.grtype[i]];
            if (!boxes) continue;
            const k = s.grscale[i];
            for (const [l, r, tp, b] of boxes) {
              if (px > s.grx[i] + idiv(l * k, 100) && px < s.grx[i] + idiv(r * k, 100)
                  && py > ry[i] + idiv(tp * k, 100) && py < ry[i] + idiv(b * k, 100)) {
                hit = t;
                break;
              }
            }
            if (hit <= H) break;
          }
        }
        // Prefer no hit, then the station near the top middle of the screen, then stillness.
        const cost = (hit > H ? 0 : 1e6 * (H + 1 - hit)) + Math.abs(px - 400) * 0.5
          + Math.abs(py - 60) + (dx || dy ? 5 : 0);
        if (!best || cost < best.cost) best = { dx, dy, cost, hit };
      }
    }
    return best;
  }
}

export { HOW_NAME };
