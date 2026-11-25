// sprites: Which image each picture slot shows: tile images, hull and drill sprites per tier,
// upgrade and gadget icons, and the in-flight panel images.
// Specification: docs/mlu2/specifications.md, Graphics (11).
//
// The game swaps images in and out of a fixed set of slots as it changes screens and upgrades
// (the same tile slots hold minerals underground and upgrade pictures in the shop). These
// functions only set slots to image file names, exactly as the original passed them to getImage;
// the renderer looks the names up. A mirrored image is the name with '#flip' (flipName).

import { MAGMA } from './data.js';
import { flipName } from './assets.js';

/** The pod hull sprites for the current hull tier, with their drawing offsets. */
export function loadHull(s) {
  if (s.hullx === 1) {
    s.hlx = 0;
    s.hly = 0;
    s.hull_l = 'images/hull_l1.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 2) {
    s.hlx = 0;
    s.hly = 0;
    s.hull_l = 'images/hull_l2.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 3) {
    s.hlx = -3;
    s.hly = 2;
    s.hull_l = 'images/hull_l3.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 4) {
    s.hlx = -3;
    s.hly = 2;
    s.hull_l = 'images/hull_l4.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 5) {
    s.hlx = -3;
    s.hly = 1;
    s.hull_l = 'images/hull_l5.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 6) {
    s.hlx = -1;
    s.hly = 1;
    s.hull_l = 'images/hull_l6.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 7) {
    s.hlx = -1;
    s.hly = 1;
    s.hull_l = 'images/hull_l7.png';
    s.hull_r = flipName(s.hull_l);
  } else if (s.hullx === 8) {
    s.hlx = 0;
    s.hly = 1;
    s.hull_l = 'images/hull_l8.png';
    s.hull_r = flipName(s.hull_l);
  }

  if (s.globe && s.hullx === 1) {
    s.hlx = -1;
    s.hly = 1;
    s.hull_l = 'images/extra/hull_l1.png';
    s.hull_r = 'images/extra/hull_r1.png';
  }

  if (s.globe && s.hullx === 2) {
    s.hlx = -1;
    s.hly = 1;
    s.hull_l = 'images/extra/hull_l2.png';
    s.hull_r = 'images/extra/hull_r2.png';
  }
}

/** The drill sprites (sideways and downward, three frames each) for the current drill tier. */
export function loadDrill(s) {
  s.dig_r0 = 'images/drills/dig_r0_' + s.drillx + '.png';
  s.dig_r1 = 'images/drills/dig_r1_' + s.drillx + '.png';
  s.dig_r2 = 'images/drills/dig_r2_' + s.drillx + '.png';
  s.dig_l0 = flipName(s.dig_r0);
  s.dig_l1 = flipName(s.dig_r1);
  s.dig_l2 = flipName(s.dig_r2);
  s.dig_dr0 = 'images/drills/dig_d0_' + s.drillx + '.png';
  s.dig_dr1 = 'images/drills/dig_d1_' + s.drillx + '.png';
  s.dig_dr2 = 'images/drills/dig_d2_' + s.drillx + '.png';
  s.dig_dl0 = 'images/drills/dig_d0_' + s.drillx + '.png';
  s.dig_dl1 = 'images/drills/dig_d1_' + s.drillx + '.png';
  s.dig_dl2 = 'images/drills/dig_d2_' + s.drillx + '.png';
  if (s.globe && (s.drillx === 2 || s.drillx === 3)) {
    s.dig_r0 = 'images/extra/dig_r0_' + s.drillx + '.png';
    s.dig_r1 = 'images/extra/dig_r1_' + s.drillx + '.png';
    s.dig_r2 = 'images/extra/dig_r2_' + s.drillx + '.png';
    s.dig_l0 = 'images/extra/dig_l0_' + s.drillx + '.png';
    s.dig_l1 = 'images/extra/dig_l1_' + s.drillx + '.png';
    s.dig_l2 = 'images/extra/dig_l2_' + s.drillx + '.png';
    s.dig_dr0 = 'images/extra/dig_d0_' + s.drillx + '.png';
    s.dig_dr1 = 'images/extra/dig_d1_' + s.drillx + '.png';
    s.dig_dr2 = 'images/extra/dig_d2_' + s.drillx + '.png';
    s.dig_dl0 = 'images/extra/dig_d0_' + s.drillx + '.png';
    s.dig_dl1 = 'images/extra/dig_d1_' + s.drillx + '.png';
    s.dig_dl2 = 'images/extra/dig_d2_' + s.drillx + '.png';
  }
}

// The gadget panel icon for each gadget row (sely 0-19).
const GADGET_ICONS = [
  'tel1', 'tel2', 'dyn', 'tnt', 'shield', 'hullfix', 'drillfix', 'sonb', 'iceb', 'radb', 'coalb',
  'petrolr', 'gasb', 'nuc', 'nucx', 'booster', 'tractor1', 'heater2', 'transmitter', 'echarger',
];

/** The icon of the selected gadget (sely) in the gadget panel slot ximgs[3]. */
export function loadGadgetIcon(s) {
  // Rows outside 0-19 leave the slot unchanged.
  if (s.sely >= 0 && s.sely <= 19) {
    s.ximgs[3] = 'images/igadgets/' + GADGET_ICONS[s.sely] + '.png';
  }
}

/** The underground sprites, sky, panel and weather images, when a game starts or loads. */
export function loadImages(s) {
  for (let i = 1; i <= 3; i++) {
    s.volcano[i] = 'images/volcano' + i + '.png';
  }

  s.gbutton = 'images/gbutton.png';
  s.gbuttonon = 'images/gbuttonon.png';
  s.icedship = 'images/icedship.png';
  s.gadgetpanel = 'images/gadgetpanel.png';
  s.antenna = 'images/antenna.png';
  s.bolt = 'images/bolt.png';
  s.ash = 'images/ash.png';
  s.frost = 'images/frost.jpg';
  s.frostpiece = 'images/frostpiece.png';
  s.volcano_x = 'images/volcano_x.png';
  s.hillimg1 = 'images/slope2.png';
  s.hillimg2 = flipName(s.hillimg1);
  s.bulletimg[4] = 'images/meteorite.png';
  s.lightning = 'images/light2.png';
  s.cloud3 = 'images/cloud3.png';
  s.tracks = 'images/tracks.png';
  s.destroyed = 'images/destroyed.png';
  s.radiation = 'images/radiation.png';
  s.sky = 'images/sky.png';
  s.sky2 = 'images/sky2.png';
  s.rough = 'images/rough.png';
  s.bar1 = 'images/barbot.png';
  if (!s.newbar) {
    s.bar2 = 'images/bartop.png';
  } else {
    s.bar2 = 'images/bartop2.png';
  }

  for (let i = 0; i < 6; i++) {
    s.ground[i] = 'images/ground' + i + '.JPG';
  }

  s.imagmay = 'images/magma1.jpg';
  s.imagmax = 'images/magma2.jpg';
  s.mission_img = 'images/mission.png';
  s.rock = 'images/rock.png';
  s.shmootz = 'images/shmootz.png';
  s.marbs = 'images/marbs.png';
  s.grans = 'images/grans.png';
  s.base = 'images/base1.png';
  s.basedestroyed = 'images/basedestroyed.png';
  s.beamh = 'images/beamh.png';
  s.beamv = 'images/beamv.png';
  s.inventory = 'images/inventory.png';
  s.shield_img = 'images/shield.png';
  s.fly_r0 = 'images/fly_0.png';
  s.fly_r1 = 'images/fly_1.png';
  s.fly_r2 = 'images/fly_2.png';
  s.fly_r3 = 'images/fly_3.png';
  // Quirk: the left-facing propeller frames are the same, unmirrored images.
  s.fly_l0 = 'images/fly_0.png';
  s.fly_l1 = 'images/fly_1.png';
  s.fly_l2 = 'images/fly_2.png';
  s.fly_l3 = 'images/fly_3.png';
  s.flame_r = 'images/gliderr.png';
  s.flame_l = flipName(s.flame_r);
  s.nodrill_l = 'images/nodrill_l.png';
  s.nodrill_r = 'images/nodrill_r.png';
  s.lcannonl = 'images/lasercannon.png';
  s.lcannonr = flipName(s.lcannonl);
  s.grh = 'images/grh.png';
  s.grv = 'images/grv.png';
  s.grul1 = 'images/grul1.png';
  s.grul2 = 'images/grul2.png';
  s.grur1 = 'images/grur1.png';
  s.grur2 = 'images/grur2.png';
  s.grdl1 = 'images/grdl1.png';
  s.grdl2 = 'images/grdl2.png';
  s.grdr1 = 'images/grdr1.png';
  s.grdr2 = 'images/grdr2.png';
  s.leaveframe = 'images/leave.jpg';
  if (s.scannon) {
    s.scannonl = 'images/soniccannon.png';
    s.scannonr = flipName(s.scannonl);
  }

  if (s.xmax > 3000) {
    s.bulletimg[4] = 'images/meteorite.png';
  }
}

/** The underground tile images (minerals, artifacts, bombs, magma) in the tile slots imgs. */
export function loadGameTiles(s) {
  s.imgs[1] = 'images/coal.png';
  s.imgs[2] = 'images/petrol.png';
  s.imgs[3] = 'images/iron.png';
  s.imgs[4] = 'images/copper.png';
  s.imgs[5] = 'images/quartz.png';
  s.imgs[6] = 'images/lead.png';
  s.imgs[7] = 'images/bronze.png';
  s.imgs[8] = 'images/silver.png';
  s.imgs[9] = 'images/gold.png';
  s.imgs[10] = 'images/palladium.png';
  s.imgs[11] = 'images/cesium.png';
  s.imgs[12] = 'images/platinum.png';
  s.imgs[13] = 'images/opal.png';
  s.imgs[14] = 'images/topaz.png';
  s.imgs[15] = 'images/emerald.png';
  s.imgs[16] = 'images/saphire.png';
  s.imgs[17] = 'images/ruby.png';
  s.imgs[18] = 'images/diamond.png';
  s.imgs[19] = 'images/amazonite.png';
  s.imgs[20] = 'images/thorium.png';
  s.imgs[21] = 'images/uranium.png';
  s.imgs[22] = 'images/plutonium.png';
  s.imgs[23] = 'images/moonstone.png';
  s.imgs[24] = 'images/starstone.png';
  s.imgs[25] = 'images/sunstone.png';
  s.imgs[26] = 'images/kryptonite.png';
  s.imgs[27] = 'images/dark matter.png';
  s.imgs[28] = 'images/gas.jpg';
  s.imgs[29] = 'images/granite.png';
  s.imgs[30] = 'images/marble.png';
  s.imgs[31] = 'images/lava.png';
  s.imgs[33] = 'images/obsidian2.png';
  s.imgs[34] = 'images/alexxzandrite.png';
  s.imgs[42] = 'images/eng8.png';
  s.imgs[43] = 'images/fuel8.png';
  s.imgs[44] = 'images/cargo8.png';
  s.imgs[45] = 'images/hull8.png';
  s.imgs[46] = 'images/rad8.jpg';
  s.imgs[50] = 'images/ice9.png';
  s.imgs[51] = 'images/bomb1.png';
  s.imgs[52] = 'images/bomb2.png';
  s.imgs[53] = 'images/bomb3.png';
  s.imgs[54] = 'images/fueltank.png';
  s.imgs[55] = 'images/pod.jpg';
  s.imgs[56] = 'images/cannon.png';
  s.imgs[57] = 'images/extractor.png';
  s.imgs[58] = 'images/converter.png';
  s.imgs[59] = 'images/scannon.png';
  s.imgs[60] = 'images/nanobots.png';
  s.imgs[61] = 'images/iceconverter.png';
  s.imgs[74] = 'images/ground0.JPG';
  s.imgs[MAGMA] = 'images/magma.jpg';
  if (s.globe) {
    s.imgs[7] = 'images/extra/bronze.png';
    s.imgs[11] = 'images/extra/cesium.png';
    s.imgs[1] = 'images/extra/coal.png';
    s.imgs[5] = 'images/extra/quartz.png';
    s.imgs[15] = 'images/extra/emerald.png';
    s.imgs[9] = 'images/extra/gold.png';
    s.imgs[4] = 'images/extra/copper.png';
    s.imgs[8] = 'images/extra/silver.png';
    s.imgs[17] = 'images/extra/ruby.png';
    s.imgs[3] = 'images/extra/iron.png';
    s.imgs[13] = 'images/extra/opal.png';
    s.imgs[2] = 'images/extra/petrol.png';
    s.imgs[21] = 'images/extra/uranium.png';
  }

  s.ximgs[4] = 'images/gadgets_cursor.png';
}

// The upgrade pictures of the shop, tile slots 0-55: seven tiers of each of the eight upgrades.
const MENU_TILE_GROUPS = ['eng', 'fuel', 'cargo', 'rad', 'hull', 'bio', 'drill', 'bat'];

/** The shop's upgrade pictures in the tile slots imgs[0..55]. */
export function loadMenuTiles(s) {
  for (let g = 0; g < 8; g++) {
    for (let t = 1; t <= 7; t++) {
      s.imgs[g * 7 + t - 1] = 'images/upgrades/' + MENU_TILE_GROUPS[g] + t + '.jpg';
    }
  }
  // Quirk: the first two drill pictures are swapped.
  s.imgs[42] = 'images/upgrades/drill2.jpg';
  s.imgs[43] = 'images/upgrades/drill1.jpg';
  if (s.globe) {
    s.imgs[43] = 'images/extra/drill2.png';
    s.imgs[44] = 'images/extra/drill3.png';
    s.imgs[28] = 'images/extra/hull1.png';
    s.imgs[29] = 'images/extra/hull2.png';
  }
}

/** The transmitter screen's icons in ximgs, and silences the pod's engine sounds. */
export function transImages(s) {
  s.ximgs[0] = 'images/music_on.png';
  s.ximgs[1] = 'images/sounds_on.png';
  s.ximgs[2] = 'images/stop.png';
  s.ximgs[3] = 'images/datalog_green.png';
  s.ximgs[4] = 'images/datalog_red.png';
  s.ximgs[5] = 'images/datalog_yellow.png';
  if (s.sounds) {
    s.sfx.stop('drill');
    s.sfx.stop('prop');
    s.sfx.stop('jet');
  }
}
