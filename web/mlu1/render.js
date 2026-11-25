// Draws every screen in the original's order. Drawing never changes the game state.
// See "Graphics" and "Frame pacing" in docs/mlu1/specifications.md.
//
// render() draws the state as of the latest tick, with things that move smoothly placed alpha of
// the way between where they were at the previous tick (a snapshot) and where they are now.

import { MAGMA, EMPTY, SHM, RCK, RW, RH, FONTS, mineralName, mineralPrice, mineralWeight,
  upgradeName, upgradeAmount, upgradePrice, UPGRADE_CATEGORIES, TRANSMISSIONS } from './data.js';
import { idiv, toInt } from './jmath.js';
import { makeString } from './shop.js';

const PAGE = '#cc6600';
const RED = '#ff0000';
const GREEN = '#00ff00';
const BLUE = '#0000ff';
const BLACK = '#000000';
const C_BAR = 'rgb(44,16,6)';

/** The positions render interpolates from, taken just before each tick. */
export function snapshot(s) {
  return {
    menu: s.menu, mantle: s.iposy >= 3000, framex: s.framex, framey: s.framey,
    digx: s.digx, digy: s.digy, sky_x: s.sky_x, fallspd: s.fallspd, labl1y: s.labl1y,
    labl1x: s.labl1x, labl1: s.labl1,
    grx: s.grx.slice(), gry: s.gry.slice(), grexists: s.grexists.slice(),
    rockx: s.rockx.slice(), rocky: s.rocky.slice(), rockexists: s.rockexists.slice(),
  };
}

// Builds a read-only view of the state with interpolated positions.
function view(s, prev, alpha) {
  const v = Object.create(s);
  const same = prev && prev.menu === s.menu && prev.mantle === (s.iposy >= 3000)
    && prev.framex === s.framex && prev.framey === s.framey;
  const lerp = (a, b, limit) => (same && Math.abs(b - a) <= limit
    ? Math.round(a + (b - a) * alpha) : b);
  if (!prev) return v;
  v.digx = lerp(prev.digx, s.digx, 25);
  v.digy = lerp(prev.digy, s.digy, 25);
  v.sky_x = lerp(prev.sky_x, s.sky_x, 10);
  if (s.labl1 && prev.labl1) {
    v.labl1y = lerp(prev.labl1y, s.labl1y, 10);
    v.labl1x = lerp(prev.labl1x, s.labl1x, 0);
  }
  if (s.iposy >= 3000) {
    // The mantle background scrolls up; when it wraps it jumps back without sliding.
    const d = prev.fallspd - s.fallspd;
    v.fallspd = same && d >= 0 && d <= 30 ? prev.fallspd - d * alpha : s.fallspd;
  }
  v.grx = s.grx.map((x, i) => (prev.grexists[i] && s.grexists[i] ? lerp(prev.grx[i], x, 40) : x));
  v.gry = s.gry.map((y, i) => (prev.grexists[i] && s.grexists[i] ? lerp(prev.gry[i], y, 40) : y));
  v.rocky = s.rocky.map((y, i) => (prev.rockexists[i] && s.rockexists[i]
    ? lerp(prev.rocky[i], y, 30) : y));
  return v;
}

export function render(g, s, assets, alpha = 1, prev = null) {
  const v = view(s, prev, alpha);
  const d = new Draw(g, assets);
  g.imageSmoothingEnabled = false;
  g.globalAlpha = 1;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  d.color(PAGE);
  g.fillRect(0, 0, RW, RH);

  if (!v.menu) {
    if (v.iposy < 3000) underground(d, v);
    else mantle(d, v);
  } else if (!v.startpage) {
    shop(d, v);
  } else {
    startPage(d, v);
  }
  if (v.pop_up) {
    screenFade(d);
    d.img(v.popup, 166, 200);
  }
}

// Thin drawing helpers with Java's behaviour: missing images and empty or negative rectangles
// draw nothing; text is drawn at its baseline.
class Draw {
  constructor(g, assets) {
    this.g = g;
    this.assets = assets;
  }
  color(c) {
    this.g.fillStyle = c;
    this.g.strokeStyle = c;
  }
  font(f) {
    this.g.font = f;
  }
  image(name) {
    return name ? this.assets.image(name) : null;
  }
  img(name, x, y, w, h) {
    const im = this.image(name);
    if (!im) return;
    if (w === undefined) this.g.drawImage(im, x, y);
    else if (w > 0 && h > 0) this.g.drawImage(im, x, y, w, h);
  }
  part(name, dx, dy, w, sx) {
    const im = this.image(name);
    if (!im || sx >= im.naturalWidth || sx < 0) return;
    const sw = Math.min(w, im.naturalWidth - sx);
    const sh = Math.min(w, im.naturalHeight);
    this.g.drawImage(im, sx, 0, sw, sh, dx, dy, sw, sh);
  }
  rect(x, y, w, h) {
    if (w > 0 && h > 0) this.g.fillRect(x, y, w, h);
  }
  outline(x, y, w, h) {
    this.g.lineWidth = 1;
    this.g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  hline(x1, x2, y) {
    this.g.fillRect(x1, y, x2 - x1 + 1, 1);
  }
  text(str, x, y) {
    if (str != null && str !== '') this.g.fillText(String(str), x, y);
  }
  width(str) {
    return Math.round(this.g.measureText(str).width);
  }
  alpha(a) {
    this.g.globalAlpha = a;
  }
  poly(xs, ys) {
    const g = this.g;
    g.beginPath();
    g.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) g.lineTo(xs[i], ys[i]);
    g.closePath();
    g.fill();
  }
  oval(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    const g = this.g;
    g.beginPath();
    g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    g.fill();
  }
}

const rgb = ([r, gg, b]) => `rgb(${r},${gg},${b})`;

function screenFade(d) {
  d.alpha(0.5);
  d.color('rgb(70,70,70)');
  d.rect(0, 0, RW, RH);
  d.alpha(1);
}

// ---- Underground ----------------------------------------------------------------------------

function underground(d, v) {
  if (!v.earthq) {
    drawField(d, v, 0);
  } else {
    drawField(d, v, v.eqtimr % 4 < 2 ? -5 : 5);
    for (let i = 0; i < RCK; i++) if (v.rockexists[i]) d.img(v.img.rock, v.rockx[i], v.rocky[i]);
  }
  if (v.framey < 4) {
    d.img(v.img.sky, v.sky_x, -50 * v.framey);
    if (v.framex > 28 && v.framey < 7) {
      d.img(v.img.base, 650 - 50 * (v.framex - 32), (v.globe ? 193 : 213) - 50 * v.framey);
    }
  }
  const fx = v.fxLast;
  drawLabel(d, v);
  drawGr(d, v);
  drawExpl(d, v);
  if (v.tr || fx.tr) drawTr(d, v);
  if (!v.explorer) drawDigger(d, v);
  else drawExplorer(d, v);
  if (v.sbomb) drawSbomb(d, v, v.stimr - 1);
  else if (fx.sonic != null) drawSbomb(d, v, fx.sonic);
  if (v.ibomb) drawIbomb(d, v, v.itimr - 1);
  else if (fx.ice != null) drawIbomb(d, v, fx.ice);
  if (v.nucb) drawNucb(d, v, v.nuctimr - 1);
  else if (fx.nuke != null) drawNucb(d, v, fx.nuke);
  if (v.status) drawStatus(d, v);
  if (!v.explorer) drawBar1(d, v);
  else drawBar2(d, v);
  if (v.trans) drawTrans(d, v);
  if (v.msg) drawMsg(d, v);
}

function drawMsg(d, v) {
  d.font(FONTS.f20);
  d.color(RED);
  d.text(v.msgstr, idiv(RW, 2) - idiv(d.width(v.msgstr), 2), idiv(RH, 2));
}

function drawField(d, v, ox) {
  const g = d.g;
  const m = v.map;
  const img = v.img;
  g.save();
  g.translate(ox, 0);
  d.color(rgb(v.back_color));
  d.rect(0, 0, RW, RH);
  for (let x = v.framex; x < v.framex + 16; x++) {
    for (let y = v.framey; y < v.framey + 12; y++) {
      const px = 50 * (x - v.framex);
      const py = 50 * (y - v.framey);
      const t = m[x][y];
      if (t < MAGMA) d.img(img.ground, px, py);
      if (t < EMPTY && t > 0 && !v.glow[t]) d.img(v.imgs[t], px, py);
      if (t >= MAGMA && y > 4) {
        const up = m[x][y - 1] < MAGMA;
        const down = m[x][y + 1] < MAGMA;
        const left = x > 0 && m[x - 1][y] < MAGMA;
        const right = x < 47 && m[x + 1][y] < MAGMA;
        if (x === 0) {
          d.img(img.grv, px, py);
          if (up) d.img(img.grul2, px + 7, py + 6);
          if (down) d.img(img.grdl2, px + 7, py + 31);
        } else if (x === 47) {
          d.img(img.grv, px + 43, py);
          if (up) d.img(img.grur2, px + 30, py + 6);
          if (down) d.img(img.grdr2, px + 30, py + 31);
        }
        if (left) {
          d.img(img.grv, px, py);
          if (up) d.img(img.grul2, px + 7, py + 6);
        }
        if (x > 0 && m[x - 1][y - 1] < MAGMA) d.img(img.grul1, px, py - 1);
        if (up) {
          d.img(img.grh, px, py);
          if (right) d.img(img.grur2, px + 30, py + 6);
        }
        if (right) {
          d.img(img.grv, px + 43, py);
          if (down) d.img(img.grdr2, px + 30, py + 31);
        }
        if (x < 47 && m[x + 1][y - 1] < MAGMA) d.img(img.grur1, px + 43, py - 1);
        if (x < 47 && m[x + 1][y + 1] < MAGMA) d.img(img.grdr1, px + 43, py + 44);
        if (down) {
          d.img(img.grh, px, py + 44);
          if (left) d.img(img.grdl2, px + 7, py + 31);
        }
        if (x > 0 && m[x - 1][y + 1] < MAGMA) d.img(img.grdl1, px, py + 44);
      }
    }
  }
  // Glowing (radioactive) minerals are drawn last, larger, centred on their tile.
  for (let x = v.framex; x < v.framex + 16; x++) {
    for (let y = v.framey; y < v.framey + 12; y++) {
      const t = m[x][y];
      if (t >= 0 && v.glow[t]) d.img(v.imgs[t], 50 * (x - v.framex) - 25, 50 * (y - v.framey) - 25);
    }
  }
  g.restore();
}

function drawLabel(d, v) {
  if (v.labl1 || v.fxLast.labl1) {
    d.color(RED);
    d.font(FONTS.label);
    d.text(v.labl1str1, v.labl1x, v.labl1y - 20);
    d.text(v.labl1str2, v.labl1x, v.labl1y - 8);
  }
  if (v.labl2 || v.fxLast.labl2) {
    d.color(v.labl2timr % 4 < 2 ? RED : GREEN);
    d.font(FONTS.f20);
    d.text(v.labl2str1, idiv(RW, 2) - 150, idiv(RH, 2) - 50);
    d.text(v.labl2str2, idiv(RW, 2) - 150, idiv(RH, 2) - 25);
  }
}

function drawGr(d, v) {
  for (let i = 0; i < SHM; i++) {
    if (!v.grexists[i]) continue;
    const name = [v.img.shmootz, v.img.grans, v.img.marbs][v.grtype[i]];
    d.img(name, v.grx[i], v.gry[i], v.grscale[i], v.grscale[i]);
  }
}

// The explosion frame drawn is the one the tick just stepped past; an explosion that ended this
// tick still shows its last frame.
function drawExpl(d, v) {
  if (v.expls) {
    const frame = Math.max(0, v.etimr - 1);
    d.part(v.expl, v.explx, v.exply, v.ewidth, frame * v.ewidth);
  } else if (v.fxLast.expl) {
    const e = v.fxLast.expl;
    d.part(e.name, e.x, e.y, e.w, e.frame * e.w);
  }
}

function drawTr(d, v) {
  if (v.trdir === 0) d.img(v.img.beamh, v.digx + 45, v.digy - 25);
  else if (v.trdir === 1) d.img(v.img.beamv, v.digx + 30, v.digy - 75);
  else if (v.trdir === 2) d.img(v.img.beamh, v.digx - 25, v.digy - 25);
  else if (v.trdir === 3) d.img(v.img.beamv, v.digx + 30, v.digy - 25);
}

function vert(d, v, x, y) {
  const f = v.timr1 % 3;
  const img = v.img;
  const names = v.right_side ? [img.fly_r0, img.fly_r1, img.fly_r2] : [img.fly_l0, img.fly_l1, img.fly_l2];
  d.img(names[f], x, y);
}

function drawDigger(d, v) {
  const img = v.img;
  if (v.hull > v.hullmax) {
    d.img(img.destroyed, v.damx + 10, v.damy - 33);
    return;
  }
  let ox = 0;
  let oy = 0;
  const f = v.digtimr % 3;
  if (v.mode === 1) {
    if (!v.right_side) {
      d.img(img.dig_l0, v.digx, v.digy - 33);
      ox = 15;
    } else {
      d.img(img.dig_r0, v.digx + 12, v.digy - 33);
      ox = 2;
    }
    if (v.drill <= 0) {
      if (!v.right_side) {
        d.img(img.nodrill_l, v.digx, v.digy - 33);
        ox = 15;
      } else {
        d.img(img.nodrill_r, v.digx + 12, v.digy - 33);
        ox = 2;
      }
    }
  } else if (v.mode === 4) {
    oy = 1;
    if (!v.right_side) {
      ox = 9;
      d.img([img.dig_dl0, img.dig_dl1, img.dig_dl2][f], v.digx + 12, v.digy - 33);
    } else {
      ox = -1;
      d.img([img.dig_dr0, img.dig_dr1, img.dig_dr2][f], v.digx + 12, v.digy - 33);
    }
  } else if (v.mode === 2) {
    if (!v.right_side) {
      ox = 15;
      d.img([img.dig_l0, img.dig_l1, img.dig_l2][f], v.digx, v.digy - 33);
    } else {
      ox = 3;
      d.img([img.dig_r0, img.dig_r1, img.dig_r2][f], v.digx + 13, v.digy - 33);
    }
  } else if (v.mode === 3 || v.mode === 5) {
    if (!v.flame || v.mode === 5) {
      vert(d, v, v.digx + 10, v.digy - 44);
      if (v.right_side) oy = 6;
      else {
        oy = 5;
        ox = 11;
      }
    } else if (v.right_side) {
      d.img(img.flame_r, v.digx + 10, v.digy - 44);
      ox = -3;
      oy = -11;
    } else {
      d.img(img.flame_l, v.digx + 10, v.digy - 44);
      ox = 8;
      oy = -11;
    }
  }
  if (v.right_side) d.img(img.hull_r, v.digx + 12 + ox + v.hlx, v.digy - 33 + oy + v.hly);
  else d.img(img.hull_l, v.digx + ox + v.hlx, v.digy - 33 + oy + v.hly);
  if (v.rx > v.biomax) d.img(img.radiation, v.digx - 15, v.digy - 70);
}

function drawExplorer(d, v) {
  const img = v.img;
  const t2 = v.timr2 || v.fxLast.laser || 0;
  if (t2 > 0) {
    if (t2 < 6) {
      d.alpha(0.5);
      d.color('rgb(150,150,100)');
      if (v.dir2 === 1) d.rect(v.digx + 30 + t2 * 10, v.digy - 60, 15, 60);
      else if (v.dir2 === 2) d.rect(v.digx - t2 * 10 + 10, v.digy - 60, 15, 60);
      else if (v.dir2 === 3) d.rect(v.digx, v.digy - 15 + t2 * 10, 60, 15);
      d.alpha(1);
    }
    if (v.dir2 === 1) d.img(img.beamh, v.digx + 45, v.digy - 25);
    else if (v.dir2 === 2) d.img(img.beamh, v.digx - 25, v.digy - 25);
    else if (v.dir2 === 3) d.img(img.beamv, v.digx + 30, v.digy - 25);
  }
  const inMagma = v.map[v.iposx][v.iposy] === MAGMA;
  if (v.mode === 1) {
    if (!v.right_side) d.img(img.dig_l0, v.digx, v.digy - 33);
    else d.img(img.dig_r0, v.digx + 12, v.digy - 33);
  } else if (v.mode === 3) {
    if (!inMagma) d.img(v.right_side ? img.flame_r : img.flame_l, v.digx + 10, v.digy - 44);
    else vert(d, v, v.digx + 10, v.digy - 44);
  } else if (v.mode === 5) {
    if (!inMagma) {
      if (v.right_side) d.img(img.dig_r0, v.digx + 10, v.digy - 44);
      else d.img(img.dig_l0, v.digx, v.digy - 44);
    } else {
      vert(d, v, v.digx + 10, v.digy - 44);
    }
  }
}

// The sonic and ice blasts: a ring of 18 segments, 20 degrees each.
function ring(d, cx, cy, outer, inner) {
  const rad = Math.PI / 180;
  for (let a = 0; a < 360; a += 20) {
    const xs = [
      cx + Math.round(outer * Math.cos(a * rad)), cx + Math.round(outer * Math.cos((a + 20) * rad)),
      cx + Math.round(inner * Math.cos((a + 20) * rad)), cx + Math.round(inner * Math.cos(a * rad)),
    ];
    const ys = [
      cy - Math.round(outer * Math.sin(a * rad)), cy - Math.round(outer * Math.sin((a + 20) * rad)),
      cy - Math.round(inner * Math.sin((a + 20) * rad)), cy - Math.round(inner * Math.sin(a * rad)),
    ];
    d.poly(xs, ys);
  }
}

function drawSbomb(d, v, ring0) {
  const t = Math.max(0, ring0);
  d.alpha(0.5);
  d.color('rgb(150,150,100)');
  ring(d, v.sbombx, v.sbomby, 20 * t, 20 * (t - 1));
  d.alpha(1);
}

function drawIbomb(d, v, ring0) {
  const t = Math.max(0, ring0);
  d.color('rgb(0,255,255)');
  ring(d, v.ibombx, v.ibomby, 15 * t, 15 * (t - 2));
}

function drawNucb(d, v, ring0) {
  const t = Math.max(0, ring0);
  d.alpha(0.5);
  d.color('rgb(255,255,70)');
  d.oval(v.nucbx - t * 15, v.nucby - t * 15, t * 30, t * 30);
  d.alpha(1);
}

function clock(v) {
  const sec = idiv(v.time, 1000) % 60;
  const hr = idiv(v.time, 60000) % 24;
  return [String(idiv(v.time, 1440000)), (hr < 10 ? '0' : '') + hr, (sec < 10 ? '0' : '') + sec];
}

// Fix: the original meant to show Ice9 to two decimals but divided as whole numbers.
function ice9Text(x) {
  const r = Math.round(x * 100) / 100;
  return Number.isInteger(r) ? r.toFixed(1) : String(r);
}

function drawBar1(d, v) {
  const o = 7;
  d.img(v.img.bar1, 0, 483 + o);
  d.color(RED);
  if (v.hull < v.hullmax) d.rect(587, 567 + o - idiv(49 * v.hull, v.hullmax), 52, idiv(49 * v.hull, v.hullmax));
  else d.rect(587, 567 + o - 49, 52, 49);
  const drillH = toInt(49 * v.drill / v.drillmax);
  d.rect(289, 567 + o - drillH, 52, drillH);
  if (v.rx < v.biomax) d.rect(443, 567 + o - idiv(49 * v.rx, v.biomax), 61, idiv(49 * v.rx, v.biomax));
  else d.rect(443, 567 + o - 49, 61, 49);
  d.rect(381, 567 + o - idiv(49 * v.cargo, v.cargomax), 52, idiv(49 * v.cargo, v.cargomax));
  d.rect(514, 567 + o - idiv(49 * v.rpm, v.engmax), 63, idiv(49 * v.rpm, v.engmax));
  const fuelH = toInt(49 * v.fuel / v.fuelmax);
  d.rect(236, 567 + o - fuelH, 47, fuelH);
  const batH = toInt(49 * v.battery / v.batmax);
  d.rect(161, 567 + o - batH, 67, batH);
  if (v.temp < 1200) d.rect(351, 563 + o - idiv(52 * v.temp, v.tempmax), 20, idiv(52 * v.temp, v.tempmax));
  else d.rect(351, 563 + o - 52, 20, 52);
  d.img(v.img.bar2, 0, 483 + o);

  d.color(BLACK);
  d.font(FONTS.bardraw);
  d.text(`${idiv(100 * v.rpm, v.engmax)}%`, 524, 590 + o);
  d.text(String(v.cargo), 388, 590 + o);
  d.text(String(Math.round(v.drill)), 294, 590 + o);
  d.text(String(v.hull), 589, 590 + o);
  d.text(String(Math.round(v.fuel)), 239, 590 + o);
  d.text(String(Math.round(v.battery)), 168, 590 + o);
  d.text(String(v.temp), 346, 590 + o);
  d.text(`${idiv(100 * v.rx, v.biomax)}%`, 452, 590 + o);
  d.color(C_BAR);
  d.text(v.moneystr, 41, 552 + o);
  d.text(String(v.depth), 73, 582 + o);
  const [days, hrs, secs] = clock(v);
  d.text(days, 695, 583 + o);
  d.text(hrs, 727, 583 + o);
  d.text(secs, 756, 583 + o);
  d.font(FONTS.bar);
  d.color(BLACK);
  d.text(v.scorestr, 10, 20);
  if (v.ice9 > 0) {
    d.color(BLACK);
    d.outline(759, 399, 22, 102);
    d.color(BLUE);
    const h = Math.round(v.ice9 * 100 / v.ice9max);
    d.rect(760, 501 - h, 21, h);
    d.text('Ice9', 750, 390);
    d.text(ice9Text(v.ice9), 750, 520);
  }
  d.img(v.img.cursor, 655, 529);
}

function drawBar2(d, v) {
  const o = 7;
  d.img(v.img.bar1, 0, 483 + o);
  d.color(RED);
  d.rect(429, 565 + o - idiv(47 * v.cargo, v.cargomax), 50, idiv(47 * v.cargo, v.cargomax));
  const fuelH = toInt(49 * v.fuel / v.fuelmax);
  d.rect(343, 566 + o - fuelH, 43, fuelH);
  const batH = toInt(47 * v.battery / v.batmax);
  d.rect(268, 565 + o - batH, 65, batH);
  if (v.temp < 1200) d.rect(399, 563 + o - idiv(48 * v.temp, v.tempmax), 19, idiv(48 * v.temp, v.tempmax));
  else d.rect(399, 563 + o - 48, 19, 48);
  if (v.nux < 45000) d.rect(492, 566 + o - idiv(48 * v.nux, 45000), 63, idiv(48 * v.nux, 45000));
  else d.rect(492, 566 + o - 48, 63, 48);
  d.color(BLUE);
  const iceH = toInt(47 * v.ice9 / v.ice9max);
  d.rect(567, 565 + o - iceH, 50, iceH);
  d.img(v.img.bar2, 0, 483 + o);
  d.color(BLACK);
  d.font(FONTS.bardraw);
  d.text(String(v.cargo), 435, 590 + o);
  d.text(String(Math.round(v.fuel)), 348, 590 + o);
  d.text(String(Math.round(v.battery)), 278, 590 + o);
  d.text(String(v.temp), 393, 590 + o);
  d.text(ice9Text(v.ice9), 580, 590 + o);
  d.text(String(v.nux), 502, 590 + o);
  d.color(C_BAR);
  d.text(v.moneystr, 40, 553 + o);
  d.text(String(v.depth), 74, 582 + o);
  const [days, hrs, secs] = clock(v);
  d.text(days, 695, 590);
  d.text(hrs, 726, 590);
  d.text(secs, 757, 590);
  if (v.depth > v.detd - 200 && v.depth < v.detd + 200) {
    d.img(v.img.bomblamp, 170, 500);
    d.color(RED);
    d.text('LAUNCH!', 192, 590 + o);
  }
  d.font(FONTS.bar);
  d.color(BLACK);
  d.text(v.scorestr, 10, 20);
}

function drawStatus(d, v) {
  screenFade(d);
  d.img(v.img.inventory, 100, 50);
  let x = 120;
  let y = 105;
  const step = 12;
  d.font(FONTS.f20);
  d.color(BLACK);
  d.text('Minerals', x, y);
  y += step;
  d.font(FONTS.d);
  d.text(`Mineral Profit: $${v.mineralprofit}`, 232, 104);
  d.text('Mineral', x, y);
  d.text('Amount', x + 100, y);
  d.text('Weight', x + 160, y);
  d.hline(x, x + 200, y + 1);
  y += step;
  for (let m = 1; m < 42; m++) {
    if (v.minerals[m] > 0) {
      d.text(mineralName(m), x, y);
      d.text(String(v.minerals[m]), x + 100, y);
      d.text(`${v.minerals[m] * mineralWeight(m)} lbs`, x + 160, y);
      y += step;
    }
  }
  if (v.mith > 0) {
    d.text('Mithril', x, y);
    d.text(String(v.mith), x + 100, y);
    d.text(`${idiv(100 * v.mith, 150)} %`, x + 160, y);
    y += step;
  }
  if (v.unob > 0) {
    d.text('Unobtainium', x, y);
    d.text(String(v.unob), x + 100, y);
    // Fix: the original showed the count here instead of the share of the 75 needed.
    d.text(`${idiv(100 * v.unob, 75)} %`, x + 160, y);
    y += step;
  }
  if (v.adam > 0) {
    d.text('Adamantium', x, y);
    d.text(String(v.adam), x + 100, y);
    d.text(`${v.adam} %`, x + 160, y);
    y += step;
  }

  x = 400;
  y = 105;
  d.font(FONTS.f20);
  d.text('Gadgets', x, y);
  y += step;
  d.font(FONTS.d);
  d.text('Gadget', x, y);
  d.text('Amount', x + 100, y);
  d.hline(x, x + 210, y + 1);
  y += step;
  const counts = [['Teleport 1', v.tel1], ['Teleport 2', v.tel2], ['Drill Repair', v.drillfix],
    ['Hull Repair', v.hullfix], ['Dynamite', v.dyn], ['TNT', v.tnt], ['Sonic Bomb', v.sonb],
    ['Ice Bomb', v.iceb]];
  counts.forEach(([name, n], i) => {
    d.text(name, x, y);
    d.text(String(n), x + 100, y);
    if (i === counts.length - 1) d.hline(x, x + 210, y + 1);
    y += step;
  });
  for (const [owned, name] of [[v.coalb, 'Coal Burner'], [v.petrolr, 'Petroleum Refinery'],
    [v.gasb, 'Natural Gas Burner'], [v.nuc, 'Nuclear Reactor'], [v.nucx, 'Nuclear Reactor X']]) {
    if (owned === 1) {
      d.text(name, x, y);
      y += step;
    }
  }

  const rows = [
    ['Engine', v.engine - 1, v.engine, 3000, ' HP'],
    ['Fuel Tank', v.fueltank + 6, v.fueltank, 6000, ' L'],
    ['Cargo Bay', v.cargobay + 13, v.cargobay, 15000, ' lbs'],
    ['Radiator', v.radiator + 20, v.radiator, 1200, ' F'],
    ['Hull', v.hullx + 27, v.hullx, 2000, ' Hits'],
    ['Bio-X', v.biox + 34, v.biox, null, ' Rx'],
    ['Drill', v.drillx + 41, v.drillx, null, ' DL'],
    ['Battery', v.batx + 48, v.batx, null, ' MW'],
  ];
  y += 10;
  d.font(FONTS.f20);
  d.text('Current Upgrades', x, y);
  y += step;
  d.font(FONTS.d);
  d.text('Upgrade', x, y);
  d.text('Name', x + 80, y);
  d.text('Amount', x + 170, y);
  d.hline(x, x + 210, y + 1);
  y += step;
  for (const [label, index, level, mega, unit] of rows) {
    let name = upgradeName(index);
    let amount = upgradeAmount(index);
    if (mega !== null && level === 8) {
      name = 'Mega';
      amount = mega;
    }
    d.text(label, x, y);
    d.text(name, x + 80, y);
    d.text(`${amount}${unit}`, x + 170, y);
    y += step;
  }
  d.img(v.img.shopimg0, 636, 104);
  d.img(v.img.shopimg1, 630, 150);
  if (!v.music) d.img(v.img.shopimg2, 633, 107);
  if (!v.sounds) d.img(v.img.shopimg2, 633, 150);
}

function drawTrans(d, v) {
  d.img(v.img.msgscreen, 0, 0);
  d.color('rgb(100,60,0)');
  d.font(FONTS.bar);
  const t = TRANSMISSIONS[v.transy];
  if (t) {
    let y = t.y;
    for (const line of t.lines) {
      d.text(line, t.x, y);
      y += t.step;
    }
    for (const [slot, px, py] of t.pics) d.img(slot === 'base' ? v.img.base : v.imgs[slot], px, py);
    for (const [str, px, py] of t.captions) d.text(str, px, py);
  } else if (v.transy === 20000 && v.reward) {
    const x = 130;
    let y = 130;
    const step = 18;
    d.text("Congratulation! You did it! You've saved Mars!", x, y); y += step;
    d.text('Here is the reward: You can enter this cheat:', x, y); y += step;
    d.text(v.reward[0], x, y); y += step;
    d.text(`${v.reward[1]}.`, x, y); y += 2 * step;
    d.text('All game data is erased.', x + 100, y);
    d.text('Game Over.', x, y); y += step;
    d.text('Current Score:', x, y);
    d.text(makeString(v.cheat), x + 300, y); y += step;
    d.text('Money Bonus:', x, y);
    d.text(makeString(idiv(v.money, 2)), x + 300, y); y += step;
    d.text('Time Bonus:', x, y);
    d.text(makeString(v.bonus), x + 300, y); y += step;
    d.text('Final Score:', x, y);
    d.text(v.scorestr, x + 300, y);
  }
}

// ---- Mantle ---------------------------------------------------------------------------------

function mantle(d, v) {
  const scroll = Math.round(v.fallspd);
  for (const off of [scroll, scroll - RH]) {
    for (const [x, y] of v.swimTiles) d.img(v.imgs[MAGMA], x, y + off);
  }
  drawExpl(d, v);
  const sizes = { 1: [268, 369], 2: [241, 300], 3: [404, 346] };
  for (let i = 0; i < 15; i++) {
    if (!v.grexists[i]) continue;
    const sz = sizes[v.grtype[i]];
    if (sz) {
      d.img(v.imgs[v.grtype[i]], v.grx[i], v.gry[i], idiv(sz[0] * v.grscale[i], 100),
        idiv(sz[1] * v.grscale[i], 100));
    }
  }
  if (v.explorer) {
    vert(d, v, v.digx - 20, v.digy - 20);
  } else {
    vert(d, v, v.digx + 10, v.digy - 44);
    if (v.right_side) d.img(v.img.hull_r, v.digx + 12 + 0 + v.hlx, v.digy - 33 + 6 + v.hly);
    else d.img(v.img.hull_l, v.digx + 11 + v.hlx, v.digy - 33 + 5 + v.hly);
  }
  const nuke = v.nucb ? v.nuctimr - 1 : v.fxLast.nuke;
  if (nuke != null) {
    const t = Math.max(0, nuke);
    d.alpha(0.5);
    d.color('rgb(255,200,70)');
    d.oval(v.nucbx - t * 20, v.nucby - t * 20, t * 40, t * 40);
    d.alpha(1);
  }
  if (v.msg) drawMsg(d, v);
  drawBar2(d, v);
}

// ---- The base -------------------------------------------------------------------------------

function shop(d, v) {
  const img = v.img;
  d.font(FONTS.bar);
  d.color(BLACK);
  if (v.tab === 1) {
    d.color('rgb(184,156,61)');
    d.img(img.shop, 0, 0);
    let y = 173;
    for (let m = 1; m < 42; m++) {
      if (v.minerals[m] > 0) {
        d.text(mineralName(m), 37, y);
        d.text(String(v.minerals[m]), 147, y);
        d.text(`$ ${idiv(v.minerals[m] * mineralPrice(m) * v.money_factor, 10)}`, 182, y);
        y += 16;
      }
    }
    d.img(img.cursor, 286, 150 + v.sely * 59);
    d.text(`${v.cargo} lbs`, 382, 324);
    d.text(v.mineralprofit, 639, 198);
    d.text(`${Math.round(v.fuel)} lbs`, 382, 383);
    d.text(String(Math.round(v.drill)), 382, 442);
    d.text(String(v.hull), 382, 501);
    d.text(v.repairscost, 639, 262);
    d.text(v.moneystr, 639, 324);
  } else if (v.tab === 2) {
    d.img(img.shop, 0, 0);
    for (let cx = 0; cx < 8; cx++) {
      for (let cy = 0; cy < 7; cy++) {
        d.img(v.imgs[7 * cx + cy], 19 + cx * 83, 106 + cy * 69, 69, 64);
        d.img(v.upgrades[cx][cy] ? img.shopimg1 : img.shopimg0, 5 + cx * 83, 95 + cy * 69);
      }
    }
    d.img(img.cursor, 5 + v.selx * 83, 95 + v.sely * 69);
    d.img(v.imgs[7 * v.selx + v.sely], 685, 47, 100, 100);
    d.img(img.shopimg2, 678, 40);
    d.font(FONTS.narrow);
    d.color('rgb(218,174,184)');
    d.text(v.selstr1, 690, 200);
    d.text(UPGRADE_CATEGORIES[v.selx] ?? 'Battery', 690, 216);
    d.text(v.selstr2, 690, 232);
    d.font(FONTS.bar);
    d.text(v.selstr3, 690, 248);
    if (v.upgrades[v.selx][v.sely]) {
      d.text('Already', 690, 280);
      d.text('Purchased', 690, 296);
    } else if (upgradePrice(v.selx * 7 + v.sely) > v.money) {
      d.text('Unavailable', 690, 280);
    } else {
      d.text('Available', 690, 280);
    }
    d.color(C_BAR);
    d.font(FONTS.bardraw);
    d.text(v.moneystr, 41, 29);
  } else if (v.tab === 3) {
    const cx = 688;
    d.font(FONTS.bar);
    d.color('rgb(180,255,180)');
    d.img(img.shop, 0, 0);
    if (v.mith >= 150 && v.unob >= 75 && v.adam >= 100 || v.explorer) {
      d.img(img.shopimg1, 340, 501);
      d.img(img.shopimg2, 20, 320);
      d.img(img.shopimg0, 307, 498);
      d.img(img.shopimg0, 539, 498);
      d.img(img.shopimg0, cx, 498);
      d.text(String(10 * v.mith), 192, 432);
      d.text(String(40 * v.unob), 192, 475);
      d.text(String(50 * v.adam), 192, 514);
    }
    // Indicator lights for each row, in groups; the last group's third column is 1 pixel lower.
    const groups = [[0, 4, 155], [4, 6, 246], [6, 8, 299], [8, 13, 355], [13, 15, 462]];
    for (const [from, to, top] of groups) {
      for (let r = from; r < to; r++) {
        const y = top + 18 * (r - from);
        d.img(img.shopimg0, 307, y);
        d.img(img.shopimg0, 539, y);
        d.img(img.shopimg0, cx, from === 13 ? y + 1 : y);
      }
    }
    const boxTops = [[4, 159, 155, 0], [6, 250, 246, 4], [8, 303, 299, 6], [13, 359, 355, 8],
      [Infinity, 468, 462, 13]];
    for (const [below, boxTop, lightTop, from] of boxTops) {
      if (v.sely < below) {
        d.img(img.box1, 328, boxTop + 18 * (v.sely - from));
        d.img(img.cursor1, 307, lightTop + 18 * (v.sely - from));
        d.img(img.cursor1, 539, lightTop + 18 * (v.sely - from));
        break;
      }
    }
    const owned = [
      [v.tel1, 155, 176], [v.tel2, 173, 194], [v.dyn, 191, 213], [v.tnt, 209, 229],
      [v.hullfix, 246, 266], [v.drillfix, 264, 284], [v.sonb, 299, 319], [v.iceb, 317, 336],
    ];
    for (const [n, top, base] of owned) {
      if (n > 0) {
        d.img(img.cursor, cx, top);
        d.text(String(n), 735, base);
      }
    }
    for (const [has, top] of [[v.coalb === 1, 355], [v.petrolr === 1, 373], [v.gasb === 1, 391],
      [v.nuc === 1, 409], [v.nucx === 1, 427], [v.jet === 1, 462], [v.tractor === 1, 480],
      [v.explorer, 498]]) {
      if (has) d.img(img.cursor, cx, top);
    }
    d.text(v.moneystr, 614, 64);
  }
}

// ---- Start page -----------------------------------------------------------------------------

function startPage(d, v) {
  const img = v.img;
  d.img(img.stpage, 0, 0);
  d.img(img.box2, 225, 88);
  d.img(img.box2, 225, 113);
  d.img(img.box2, 225, 137);
  if (v.sely === 0) d.img(img.box1, 225, 88);
  else if (v.sely === 1) d.img(img.box1, 225, 113);
  else if (v.sely === 2) d.img(img.box1, 225, 137);
  else if (v.sely === 3) d.img(v.imgs[4], 273, 163);
  else if (v.sely === 4) d.img(v.imgs[5], 266, 186);
  else if (v.sely === 5) d.img(v.imgs[6], 260, 210);

  d.font(FONTS.start);
  d.color('rgb(236,88,0)');
  const ys = [102, 128, 152];
  if (v.sely <= 2) {
    // The text cursor blinks: shown for 14 of every 30 ticks.
    const caret = v.timr1 !== 0 && v.timr1 < 15 ? '|' : '';
    d.text(v.inputstr + caret, 247, ys[v.sely]);
  }
  d.font(FONTS.bar);
  d.color(BLUE);
  d.text(v.msgstr, 496, 105);

  d.img(v.music ? img.cursor1 : img.cursor, 318, 167);
  d.img(v.music ? img.cursor : img.cursor1, 466, 167);
  d.img(v.sounds ? img.cursor1 : img.cursor, 318, 189);
  d.img(v.sounds ? img.cursor : img.cursor1, 466, 188);
  d.img(v.level === 1 ? img.cursor : img.cursor1, 318, 210);
  d.img(v.level === 2 ? img.cursor : img.cursor1, 466, 210);
  d.img(v.level === 3 ? img.cursor : img.cursor1, 625, 210);
}
