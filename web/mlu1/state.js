// The game state and restart. See "Start-up, pausing and restarting" in
// docs/mlu1/specifications.md.
//
// One plain object holds everything the game knows. Field names follow the original game's
// variables so the rules read the same; images are held as file names (null = draws nothing).
// Sounds go through s.sfx, an object the page supplies (see audio.js); the logic never touches
// the page itself.

import { MAP_W, MAP_H, MAGMA, SHM, RCK } from './data.js';
import { startPageImages } from './sprites.js';
import { backColor } from './world.js';
import { idiv, jround } from './jmath.js';

const SILENT = {
  play() {}, loop() {}, stop() {}, musicLoop() {}, musicStop() {},
};

export function createState(sfx = SILENT, settings = {}) {
  const s = {
    sfx,
    // screens
    menu: true, startpage: true, status: false, pop_up: false, popup: null, trans: false,
    msg: false, msgstr: '', msgtimr: 0, end: false,
    // map and camera
    map: Array.from({ length: MAP_W }, () => new Int8Array(MAP_H)),
    framex: 15, framey: 0, sky_x: 0, back_color: [145, 120, 87],
    // pod position: tile units (posx, posy) and screen pixels (digx, digy)
    posx: 23, posy: 4, iposx: 0, iposy: 0, cposx: 0, cposy: 0, fposx: 0, fposy: 0,
    digx: 390, digy: 250, prev: 0, hspd: 5, vspd: 5, termspd: 10, fallspd: 7,
    hspeed: 0, vspeed: 0, mode: 1, right_side: true, digtimr: 0, timr1: 0, timr2: 0, dir2: 0,
    gastimr: 0, flame: false,
    // keys
    right_key: false, left_key: false, up_key: false, down_key: false, ctrl: false,
    xkey: false, zkey: false, keynum: 0,
    // gauges
    temp: 0, depth: 0, cargo: 0, rx: 0, rpm: 0, hull: 0, money: 0, fuel: 30, battery: 0,
    drill: 50, ice9: 0, ice9max: 0, nux: 0, radf: 0.001, time: 0,
    s_fuel: 0, s_battery: 0, s_ice9: 0, s_time: 0,
    // upgrade levels (1..8) and capacities
    radiator: 1, cargobay: 1, biox: 1, engine: 1, hullx: 1, fueltank: 1, batx: 1, drillx: 1,
    tempmax: 50, cargomax: 500, biomax: 10, engmax: 100, hullmax: 5, fuelmax: 30, batmax: 50,
    drillmax: 50,
    upgrades: Array.from({ length: 8 }, () => new Array(7).fill(false)),
    // gadgets
    dyn: 0, tnt: 0, tel1: 0, tel2: 0, drillfix: 0, hullfix: 0, tractor: 0, coalb: 0, petrolr: 0,
    gasb: 0, jet: 0, nuc: 0, nucx: 0, sonb: 0, iceb: 0, processor: true, explorer: false,
    // cargo
    minerals: new Array(45).fill(0), mith: 0, unob: 0, adam: 0, bomb1: 0, bomb2: 0, bomb3: 0,
    // score
    score: 0, bonus: 1000, cheat: 0, level: 1, money_factor: 10, score_factor: 10,
    moneystr: '0', scorestr: '0', mineralprofit: '0', repairscost: '0',
    // tile rendering
    glow: new Array(100).fill(false),
    // particles (dirt, granite and marble chips; mantle rocks use types 1..3)
    grx: new Array(SHM).fill(0), gry: new Array(SHM).fill(0), grscale: new Array(SHM).fill(0),
    grtype: new Array(SHM).fill(0), grxspd: new Array(SHM).fill(0), gryspd: new Array(SHM).fill(0),
    grexists: new Array(SHM).fill(false),
    // earthquake rocks
    rockexists: new Array(RCK).fill(false), rockx: new Array(RCK).fill(0),
    rocky: new Array(RCK).fill(0), rockyspd: new Array(RCK).fill(0), rocks: 0,
    // explosion animation
    expls: false, expl: null, etimr: 0, eframes: 150, ewidth: 150, explx: 0, exply: 0,
    damx: 0, damy: 0,
    // tractor beam
    tr: false, trdir: 0, trtimr: 0,
    // bombs
    sbomb: false, stimr: 0, stimr0: 0, sbombx: 0, sbomby: 0,
    ibomb: false, itimr: 0, ibombx: 0, ibomby: 0,
    nucb: false, nucbx: 0, nucby: 0, nuctimr: 0, nucrad: 0, detd: 85200,
    // earthquake
    earthq: false, eqtimr: 0,
    // floating labels
    labl1: false, labl1x: 0, labl1y: 0, labl1timr: 0, labl1str1: '', labl1str2: '',
    labl2: false, labl2x: 0, labl2y: 0, labl2timr: 0, labl2str1: '', labl2str2: '',
    // transmissions
    transy: 5, globe: false,
    // shop
    selx: 0, sely: 0, tab: 1, selymax: 5, selprice: 0, selamount: 0,
    selstr1: '', selstr2: '', selstr3: '',
    // start page
    // music and sound start on in the web port, or as the player last left them (settings.js);
    // the original started them off
    inputstr: '', sounds: settings.sounds ?? true, music: settings.music ?? true,
    theme: 'descent1.mid',
    // sound state
    is_prop: false, is_lava: false,
    // mantle
    flg1: false, swimTiles: [],
    // images: named slots and the numbered tile slots
    img: {},
    imgs: new Array(70).fill(null),
    // hull overlay offset, victory reward, base scroll (unused)
    hlx: 0, hly: 0, reward: null, scroll: 0,
    // effects that ended this tick, still drawn once more as the original drew them (drawing only)
    fxLast: {},
    // saved games, supplied by the page (see storage.js)
    store: { read: () => null, write() {}, remove() {} },
  };
  restart(s);
  return s;
}

/** Puts the game back to a fresh start page, as at launch and after every game over. */
export function restart(s) {
  Object.assign(s, {
    money: 0, temp: 0, depth: 0, cargo: 0, rx: 0, rpm: 0, hull: 0, fuel: 30, battery: 0,
    drill: 50, msgtimr: 0, radiator: 1, cargobay: 1, biox: 1, engine: 1, hullx: 1, fueltank: 1,
    batx: 1, drillx: 1, timr1: 0, tempmax: 50, cargomax: 500, biomax: 10, engmax: 100,
    hullmax: 5, fuelmax: 30, batmax: 50, drillmax: 50, dyn: 0, tnt: 0, tel1: 0, tel2: 0,
    drillfix: 0, hullfix: 0, tractor: 0, coalb: 0, petrolr: 0, gasb: 0, jet: 0, nuc: 0, nucx: 0,
    radf: 0.001, flame: false, msg: false, digx: 390, digy: 250, posx: 23, posy: 4, mode: 1,
    framex: 15, framey: 0, score: 0, bonus: 1000, transtimr: 0, transy: 5, trans: false,
    ibomb: false, sbomb: false, itimr: 0, stimr: 0, ibombx: 0, ibomby: 0, sbombx: 0, sbomby: 0,
    flg1: false, time: 0, gastimr: 0, radx: 0, sonb: 0, iceb: 0, msgstr: '', cheat: 0,
    status: false, eqtimr: 0, earthq: false, explorer: false, mith: 0, unob: 0, adam: 0,
    ice9: 0, bomb1: 0, bomb2: 0, bomb3: 0, timr2: 0, ice9max: 0, nux: 0, nucb: false,
    detd: 85200, moneystr: '0', scorestr: '0', end: false, pop_up: false, selstr3: '',
    globe: false, is_prop: false, money_factor: 10, score_factor: 10, processor: true,
    digtimr: 0, is_lava: false, level: 1,
    // Fix: transient effects of the previous game no longer carry into the next one
    // (see docs/mlu1/fixes.md, "A new game inherited effects from the previous one").
    fallspd: 7, expls: false, expl: null, etimr: 0, labl1: false, labl2: false, tr: false,
    trtimr: 0, vspeed: 0, hspeed: 0, damx: 0, damy: 0,
  });
  s.sfx.stop('prop');
  s.sfx.stop('jet');
  // Fix: an earthquake cut short no longer leaves its sound looping.
  s.sfx.stop('earthquake');

  for (let x = 0; x < MAP_W; x++) {
    const col = s.map[x];
    col.fill(0, 0, 3000);
    col.fill(MAGMA, 3000, MAP_H);
  }
  for (let c = 0; c < 8; c++) {
    s.upgrades[c][0] = true;
    for (let t = 1; t < 7; t++) s.upgrades[c][t] = false;
  }
  s.grexists.fill(false);
  s.rockexists.fill(false);
  s.minerals.fill(0);
  s.glow.fill(false);
  s.glow[6] = true;
  for (let v = 8; v <= 12; v++) s.glow[v] = true;
  for (let v = 20; v <= 26; v++) s.glow[v] = true;

  s.iposy = jround(s.posy);
  backColor(s);
  s.sky_x = idiv(-s.iposx * 100, 47);
  s.inputstr = '';
  s.selx = 0;
  s.sely = 0;
  s.tab = 1;
  startPageImages(s);
  s.theme = 'descent1.mid';
  if (s.music) s.sfx.musicLoop(s.theme);
  if (s.sounds) {
    s.sfx.stop('prop');
    s.sfx.stop('jet');
    s.sfx.stop('lava');
  }
}
