// state: The game state object and restart(). See "Start-up, pausing and restarting" in
// docs/mlu2/specifications.md.
//
// One plain object holds everything the game knows. Field names are the original game's, so the
// rules read the same; images are held as file names (null draws nothing). Sounds go through
// s.sfx, message boxes through s.ui, saves through s.store and drawing the cached field layer
// through s.gfx, which the page supplies; the logic never touches the page itself.

import {
  MAP_W, MAP_H, SHM, RCK, VOLC, CLOUD, WIND, BASE, BASEX, GADGETSTR, GPANELSTR, GADGETPRICE,
  TRANSARR, CHEATS,
} from './data.js';
import { getUpgradeAmount2 } from './stats.js';
import { backColor, loadClouds } from './world.js';
import { jround, toInt, random } from './jmath.js';

const SILENT = {
  play() {}, loop() {}, stop() {}, stopAll() {}, musicLoad() {}, musicLoop() {}, musicStop() {},
};
const NO_UI = { alert() {} };
const NO_GFX = { redrawField() {}, drawStatus() {} };
const NO_STORE = {
  read: async () => null,
  write: async () => false,
  readScores: async () => [],
  writeScores: async () => false,
};

const ints = (n) => new Array(n).fill(0);
const bools = (n) => new Array(n).fill(false);

export function createState({
  sfx = SILENT, ui = NO_UI, store = NO_STORE, gfx = NO_GFX, settings = {},
} = {}) {
  const s = {
    sfx, ui, store, gfx,
    gamespd: 26, rw: 800, rh: 600,
    imgs: new Array(80).fill(null),
    map: Array.from({ length: MAP_W }, () => new Int8Array(MAP_H)),
    mapmode: Array.from({ length: MAP_W }, () => new Int8Array(MAP_H)),
    digx: 390, digy: 250, hspd: 5, vspd: 5, mode: 1,
    iposx: 0, iposy: 0, cposx: 0, fposx: 0, fposy: 0, cposy: 0, termspd: 10,
    posx: 23.0, posy: 4.0, fallspd: 7.0, hspeed: 0, vspeed: 0,
    framex: 15, framey: 0, score: 0, bonus: 1000, cheat: 0, nux: 0, time: 0,
    skyx1: 0, skyx2: 0, damx: 0, damy: 0, hours: 0, minutes: 0, days: 0,

    // images (file names)
    dig_r0: null, dig_r1: null, dig_r2: null, dig_l0: null, dig_l1: null, dig_l2: null,
    dig_dl0: null, dig_dl1: null, dig_dl2: null, dig_dr0: null, dig_dr1: null, dig_dr2: null,
    flame_r: null, flame_l: null,
    fly_r0: null, fly_r1: null, fly_r2: null, fly_r3: null,
    fly_l0: null, fly_l1: null, fly_l2: null, fly_l3: null,
    hull_l: null, hull_r: null, ground: new Array(6).fill(null),
    bar1: null, bar2: null, shmootz: null, base: null, field: null, expl: null, marbs: null,
    grans: null, beamh: null, beamv: null, rock: null, nodrill_r: null, nodrill_l: null,
    grv: null, grh: null, grul1: null, grur1: null, grdl1: null, grdr1: null,
    grul2: null, grur2: null, grdl2: null, grdr2: null,
    stpage: null, box1: null, box2: null, box3: null, inventory: null, sky: null,
    radiation: null, destroyed: null, bomblamp: null, shop: null, cursor: null, cursor1: null,
    popup: null, ximgs: new Array(6).fill(null), shield_img: null, telimg: null, gate: null,
    tracks: null, imagmax: null, imagmay: null, mission_img: null, sky2: null, rough: null,
    volcano: new Array(4).fill(null), cloud3: null, volcano_x: null, lightning: null,
    leaveframe: null, hillimg1: null, hillimg2: null, scannonr: null, scannonl: null,
    lcannonr: null, lcannonl: null, basedestroyed: null, bulletimg: new Array(6).fill(null),
    tankl: null, tankr: null, tankshootl: null, tankshootr: null, expl2: null, frost: null,
    frostpiece: null, ash: null, antenna: null, bolt: null, icedship: null, transporter: null,
    gadgetpanel: null, gbutton: null, gbuttonon: null,

    hlx: 0, hly: 0, money_factor: 0, score_factor: 0, trans_cur: 0, transc: 0, datalog: 0,
    logc: 0, minprof: 0,
    transarr: TRANSARR.slice(), gadgetprice: GADGETPRICE.slice(),
    xmax: 0, lightningx: 0, lightningtimr: 0, eminutes: 0, ehours: 0, windspd: 0,
    tankarr: null,
    volcanox: ints(VOLC), volcanotype: ints(VOLC), volcanoscale: ints(VOLC),
    cloudx: ints(CLOUD), cloudy: ints(CLOUD), cloudscale: ints(CLOUD),
    grx: ints(SHM), gry: ints(SHM), grscale: ints(SHM), grtype: ints(SHM),
    grxspd: ints(SHM), gryspd: ints(SHM),
    raindamage: 0,
    grexists: bools(SHM),
    upgrades: Array.from({ length: 8 }, () => bools(7)),
    rockexists: bools(RCK), rockx: ints(RCK), rocky: ints(RCK), rockyspd: ints(RCK), rocks: 0,
    rockscale: ints(RCK), rockxspd: ints(RCK),
    logarr: ints(6), log_cur: 0,
    greentimr: 0, timr55: 0, freezetimr: 0, magmatimr: 0, digtimr: 0, timr1: 0,
    mouse_x: 0, mouse_y: 0, etimr: 0, eframes: 150, ewidth: 150, explx: 0, exply: 0,
    trdir: 0, trtimr: 0, saves: 0, popuptype: 0,
    expls: false, tr: false, startpage: true, menu: true, ibomb: false, sbomb: false,
    rbomb: false, status: false, nucb: false, flg1: false, shieldx: false,
    right_key: false, left_key: false, up_key: false, down_key: false, right_side: true,
    // music and sound start on in the web port, or as the player last left them (settings.js);
    // the original started them off
    ctrl: false, end: false, pop_up: false, globe: false,
    sounds: settings.sounds ?? true, music: settings.music ?? true,
    processor: true, is_mission: false, magmaex: false, rain: false, raininc: false,
    leave: false, xlightning: false, converter: false, cannon: false, extractor: false,
    cannonx: false, scannon: false, laser_bar: false, wind: false, windincr: false,
    nanobots: false, newbar: false, iceconverter: false, saveok: false, showgrid: false,
    loading: false, rockfall: false, ashon: false, charged: false, bolton: false, iced: false,
    drawship: false, gpanel: false,
    nucbx: 0, nucby: 0, nuctimr: 0, nucrad: 0, detd: 0, gastimr: 0, level: 0, shieldtimr: 0,
    telmode: 0, rainmode: 0, raintimr: 0,
    labl1x: 0, labl1y: 0, labl2x: 0, labl2y: 0, labl2timr: 0, labl1timr: 0,
    keynum: 0, msgtimr: 0, prev: 0, transtimr: 0, transy: 0,
    labl2str1: null, labl1str1: null, labl1str2: null, labl2str2: null, msgstr: null,
    inputstr: null, moneystr: null, scorestr: null, mineralprofit: null, repairscost: null,
    selstr3: null,
    gadgetstr: GADGETSTR.slice(), cheats: CHEATS.slice(), gpanelstr: GPANELSTR.slice(),
    bullets: [],
    labl1: false, labl2: false, msg: false, display: false, flame: false, trans: false,
    earthq: false, rdr: false,
    itimr: 0, stimr: 0, ibombx: 0, ibomby: 0, sbombx: 0, sbomby: 0, radx: 0, sonb: 0,
    iceb: 0, eqtimr: 0, timr2: 0, dir2: 0, gspdtimr: 0, rtimr: 0, rbombx: 0, rbomby: 0,
    radb: 0, teltimr: 0, weight: 0,
    basex: BASEX.slice(), baseidx: 0, xminutes: 0, xhours: 0, lasertimr: 0, laserpos: 0,
    gameid: 0, scroll: 0, score_name: '', highscores: [],
    windx: ints(WIND), windy: ints(WIND), windtimr: 0, rainbegin: 0, rainend: 0,
    base4day: 0, frostlevel: 0, redrawtime: 0, heater: 0, tempmin: 0, mtrans: 0,
    lablspeed: 0, echarger: 0, cheattimr: 0, entrytimr: 0,
    temp: 0, depth: 0, cargo: 0, rx: 0, rpm: 0, hull: 0, money: 0,
    fuel: 0, battery: 0, drill: 0,
    radiator: 0, cargobay: 0, biox: 0, engine: 0, hullx: 0, fueltank: 0, batx: 0, drillx: 0,
    tempmax: 0, cargomax: 0, biomax: 0, engmax: 0, hullmax: 0, fuelmax: 0, batmax: 0,
    drillmax: 0, ice9max: 0, shield: 0,
    dyn: 0, tnt: 0, tel1: 0, tel2: 0, drillfix: 0, hullfix: 0, tractor: 0, coalb: 0,
    petrolr: 0, gasb: 0, jet: 0, nuc: 0, nucx: 0,
    ff: 0, radf: 0, ice9: 0, glidespd: 0, glidemax: 0, heatf: 0,
    // Fix: counts do not wrap after 127 as the original's bytes did (see docs/mlu2/fixes.md).
    minerals: ints(45),
    mith: 0, unob: 0, adam: 0, bomb1: 0, bomb2: 0, bomb3: 0,
    glow: bools(100), xkey: false, zkey: false, baseok: bools(BASE),
    selx: 0, sely: 0, tab: 0, selymax: 0, selprice: 0, selamount: 0,
    nodig: null, timelast: 0, selstr1: null, selstr2: null,
    panel: null, mission: null,
    back_color: 'rgb(145,120,87)', c_sky: null,
    is_prop: false, is_lava: false, is_drill: false, is_wind: false,

    // Not in the original: bumped by redraw() each time the field layer is drawn.
    fieldVersion: 0,
    // Not in the original: true while a save is being written; key presses wait for it.
    storeBusy: false,
    // Effects that ended this tick but are still drawn once more, as the original drew them.
    fxLast: {},
  };

  // The constructor places the volcanoes and clouds once per session; restart() keeps them.
  let vstep = 200 + toInt(random() * 200.0);
  for (let i = 0; i < VOLC; i++) {
    s.volcanox[i] = vstep;
    vstep += toInt(random() * 100.0 + 300.0);
    s.volcanotype[i] = toInt(random() * 3.0) + 1;
    s.volcanoscale[i] = 200 + toInt(random() * 100.0);
  }
  loadClouds(s);
  restart(s);
  return s;
}

/** Puts the game back to a fresh start page, as at launch, after Restart and after a game ends. */
export function restart(s) {
  Object.assign(s, {
    money: 0, temp: 0, depth: 0, cargo: 0, rx: 0, rpm: 0, hull: 0, battery: 0.0, msgtimr: 0,
    radiator: 1, cargobay: 1, biox: 1, engine: 1, hullx: 1, fueltank: 1, batx: 1, drillx: 1,
    timr1: 0, timr55: 0, dyn: 0, tnt: 0, tel1: 0, tel2: 0, drillfix: 0, hullfix: 0,
    tractor: 0, coalb: 0, petrolr: 0, gasb: 0, jet: 0, nuc: 0, nucx: 0, radf: 0.001,
    flame: false, msg: false, digx: 240, digy: 250, posx: 5.0, posy: 4.0, mode: 1,
    framex: 0, framey: 0, score: 0, bonus: 1000, transtimr: 0, trans: false,
    ibomb: false, sbomb: false, itimr: 0, stimr: 0, ibombx: 0, ibomby: 0, sbombx: 0,
    sbomby: 0, flg1: false, time: 0, gastimr: 0, rbomb: false, shieldx: false, radx: 0,
    sonb: 0, iceb: 0, msgstr: '', cheat: 0, rdr: false, status: false, eqtimr: 0,
    earthq: false, mith: 0, unob: 0, adam: 0, ice9: 0.0, bomb1: 0, bomb2: 0, bomb3: 0,
    timr2: 0, ice9max: 0, nux: 0, nucb: false, detd: 85200, gspdtimr: 0, moneystr: '0',
    scorestr: '0', end: false, pop_up: false, selstr3: '', globe: false, is_prop: false,
    money_factor: 10, score_factor: 10, processor: true, digtimr: 0, is_lava: false,
    is_drill: false, shieldtimr: 0, shield: 0, radb: 0, teltimr: 0, transc: 0,
  });
  s.transy = s.transarr[s.transc];
  Object.assign(s, {
    logc: 0, greentimr: 0, is_wind: true, level: 1, is_mission: false, days: 0, hours: 1,
    minutes: 30, baseidx: 0,
  });
  s.xminutes = s.minutes;
  s.xhours = s.hours;
  Object.assign(s, {
    glidespd: 0.0, glidemax: 12.0, freezetimr: 0, magmaex: false, skyx1: 0, skyx2: -5,
    rain: false, newbar: false, raindamage: 0.0, timelast: 0, leave: false, xmax: 0,
    xlightning: false, lightningtimr: 0, converter: false, cannon: false, extractor: false,
    cannonx: false, lasertimr: 0, laser_bar: false, wind: false, saveok: true, etimr: 0,
    base4day: 0, frostlevel: 0, redrawtime: 0, heater: 0, heatf: 0.0, tempmin: -100,
    echarger: 0, ashon: false, charged: false, bolton: false, iced: false, cheattimr: 0,
    drawship: true, mtrans: 0, gpanel: false,
    // Fix: a new game no longer keeps the previous game's nanobots, sonic cannon and ice
    // converter, meteors in flight, explosion, labels or open panel (see docs/mlu2/fixes.md,
    // "A new game inherited parts of the previous one").
    nanobots: false, scannon: false, iceconverter: false, expls: false, labl1: false,
    labl2: false, panel: null,
  });
  s.bullets.length = 0;
  s.transporter = 'images/transporter.png';
  s.engmax = getUpgradeAmount2(0);
  s.tempmax = getUpgradeAmount2(21);
  s.cargomax = getUpgradeAmount2(14);
  s.biomax = getUpgradeAmount2(35);
  s.hullmax = getUpgradeAmount2(28);
  s.fuelmax = getUpgradeAmount2(7);
  s.batmax = getUpgradeAmount2(49);
  s.drillmax = getUpgradeAmount2(42);
  s.fuel = s.fuelmax;
  s.drill = s.drillmax;

  s.baseok.fill(true);
  for (let i = 0; i < MAP_W; i++) {
    s.map[i].fill(0, 0, 100);
    s.map[i].fill(30, 100, 102);
  }
  for (let i = 0; i < 8; i++) {
    s.upgrades[i][0] = true;
    for (let j = 1; j < 7; j++) s.upgrades[i][j] = false;
  }
  s.grexists.fill(false);
  s.rockexists.fill(false);
  s.minerals.fill(0);
  s.glow.fill(false);
  for (let i = 0; i < WIND; i++) {
    s.windx[i] = toInt(random() * 800.0);
    s.windy[i] = toInt(random() * 250.0);
  }
  s.glow[6] = true;
  for (let i = 8; i <= 12; i++) s.glow[i] = true;
  for (let i = 20; i <= 26; i++) s.glow[i] = true;

  s.iposy = jround(s.posy);
  backColor(s, s.temp);
  s.skyx1 = 0;
  s.inputstr = '';
  s.selx = 0;
  s.sely = 0;
  s.tab = 1;
  s.stpage = 'images/startpage2.jpg';
  s.box1 = 'images/box_on3.png';
  s.box2 = 'images/box_off3.png';
  s.cursor = 'images/green_light.png';
  s.cursor1 = 'images/black_light.png';
  s.imgs[4] = 'images/level_on.png';
  s.imgs[5] = 'images/music_on.png';
  s.imgs[6] = 'images/sounds_on.png';
  s.sfx.musicLoad('start_theme.mid');
  s.fxLast = {};

  if (s.music) {
    s.sfx.musicStop();
    s.sfx.musicLoop('start_theme.mid');
  }
  if (s.sounds) s.sfx.stopAll();
}
