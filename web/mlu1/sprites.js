// Which image each named slot shows. See "Graphics" in docs/mlu1/specifications.md.
//
// The game swaps images in and out of a fixed set of slots as it changes screens and upgrades
// (the same tile slots hold minerals underground, upgrade pictures in the shop and rocks in the
// mantle). These functions set slots to image file names; the renderer looks the names up.

import { GAME_TILES, GAME_TILES_XMAS, MENU_TILES, MENU_TILES_XMAS, MAGMA } from './data.js';

/** The start page's images, set at launch and on every restart. */
export function startPageImages(s) {
  Object.assign(s.img, {
    stpage: 'startpage.jpg', box1: 'box_on.PNG', box2: 'box_off.PNG', box3: null,
    cursor: 'green_light.png', cursor1: 'black_light.png',
  });
  s.imgs[1] = 'music_off.png';   // these three files do not exist and so never draw
  s.imgs[2] = 'sounds_off.png';
  s.imgs[3] = 'level_off.png';
  s.imgs[4] = 'music_on.png';
  s.imgs[5] = 'sounds_on.png';
  s.imgs[6] = 'level_on.png';
}

/** The underground sprites and the panel, when a game starts or loads. */
export function loadImages(s) {
  Object.assign(s.img, {
    destroyed: 'destroyed.png', radiation: 'radiation.png', sky: 'sky.png',
    bar1: 'barbot.png', bar2: 'bartop.png', ground: 'ground.png', rock: 'rock.PNG',
    shmootz: 'shmootz.png', marbs: 'marbs.png', grans: 'grans.png', base: 'base1.png',
    beamh: 'beamh.png', beamv: 'beamv.png', inventory: 'inventory.jpg',
    fly_r0: 'fly_0.png', fly_r1: 'fly_1.png', fly_r2: 'fly_2.png', fly_r3: 'fly_3.png',
    fly_l0: 'fly_0.png', fly_l1: 'fly_1.png', fly_l2: 'fly_2.png', fly_l3: 'fly_3.png',
    flame_r: 'flame.png', flame_l: 'flame.png',
    nodrill_l: 'nodrill_l.PNG', nodrill_r: 'nodrill_r.PNG',
    grh: 'grh.png', grv: 'grv.png', grul1: 'grul1.png', grul2: 'grul2.png',
    grur1: 'grur1.png', grur2: 'grur2.png', grdl1: 'grdl1.png', grdl2: 'grdl2.png',
    grdr1: 'grdr1.png', grdr2: 'grdr2.png',
  });
  if (s.globe) s.img.base = 'Xmass/base.png';
}

/** The super-ship's sprites and panel. */
export function loadImages2(s) {
  Object.assign(s.img, {
    bar1: 'bar2bot.png', bar2: 'bar2top.png', bomblamp: 'bomblamp.png',
    dig_r0: 'ship_r.png', dig_l0: 'ship_l.png', flame_r: 'ship_ur.png', flame_l: 'ship_ul.png',
    fly_r0: 'swim_r0.png', fly_r1: 'swim_r1.png', fly_r2: 'swim_r2.png', fly_r3: 'swim_r3.png',
    fly_l0: 'swim_l0.png', fly_l1: 'swim_l1.png', fly_l2: 'swim_l2.png', fly_l3: 'swim_l3.png',
  });
}

const HULL_OFFSETS = [null, [0, 0], [0, 0], [-3, 1], [-3, 1], [-3, 1], [-1, 1], [-1, 1], [0, 1]];

/** The hull overlay for the current hull level. */
export function loadHull(s) {
  const n = s.hullx;
  if (n >= 1 && n <= 8) {
    [s.hlx, s.hly] = HULL_OFFSETS[n];
    const ext = n === 8 ? 'png' : 'PNG';
    s.img.hull_l = `hull_l${n}.${ext}`;
    s.img.hull_r = `hull_r${n}.${ext}`;
  }
  if (s.globe && n === 1) {
    s.hlx = -1;
    s.hly = 1;
    s.img.hull_l = 'Xmass/hull_l1.png';
    s.img.hull_r = 'Xmass/hull_r1.png';
  }
}

/** The drill frames for the current drill level. */
export function loadDrill(s) {
  const n = s.drillx;
  const set = (dir) => {
    const d = dir === '' ? '' : dir;
    s.img.dig_r0 = `${d}dig_r0_${n}.png`;
    s.img.dig_r1 = `${d}dig_r1_${n}.png`;
    s.img.dig_r2 = `${d}dig_r2_${n}.png`;
    s.img.dig_l0 = `${d}dig_l0_${n}.png`;
    s.img.dig_l1 = `${d}dig_l1_${n}.png`;
    s.img.dig_l2 = `${d}dig_l2_${n}.png`;
    s.img.dig_dr0 = s.img.dig_dl0 = `${d}dig_d0_${n}.png`;
    s.img.dig_dr1 = s.img.dig_dl1 = `${d}dig_d1_${n}.png`;
    s.img.dig_dr2 = s.img.dig_dl2 = `${d}dig_d2_${n}.png`;
  };
  set('');
  if (n === 1) s.img.dig_dl0 = s.img.dig_dr0 = 'dig_d0_1.PNG';
  if (s.globe && n === 1) set('Xmass/');
}

/** Tile slots for underground play. */
export function loadGameTiles(s) {
  for (const [v, name] of Object.entries(GAME_TILES)) s.imgs[v] = name;
  if (s.globe) for (const [v, name] of Object.entries(GAME_TILES_XMAS)) s.imgs[v] = name;
}

/** Tile slots for the upgrades shop. */
export function loadMenuTiles(s) {
  MENU_TILES.forEach((name, i) => { s.imgs[i] = name; });
  if (s.globe) for (const [i, name] of Object.entries(MENU_TILES_XMAS)) s.imgs[i] = name;
}

/** Tile slots for the mantle: three rock pictures. Magma keeps its slot. */
export function loadSwimTiles(s) {
  s.imgs[1] = 'rock1.png';
  s.imgs[2] = 'rock2.png';
  s.imgs[3] = 'rock3.png';
  s.imgs[MAGMA] = s.imgs[MAGMA] ?? 'magma.png';
}
