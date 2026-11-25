// render: Draws a frame from the state in the original's order, without changing it: the cached
// field layer (ground, sky, volcanoes, clouds, bases, hills, magma, frost), falling rocks, shells,
// labels, particles, explosions, beams, the pod, the transporter, rain, lightning and wind, the
// shield, blasts, the heads-up display with the gadget panel and mission box, the teleport, the
// pop-up panel, the radiation overlay, the laser, fatal messages and transmissions; the pause
// screen; the bases and their tabs with the departure-time dialog; the start page; pop-ups and
// the loading screen.
// Specification: docs/mlu2/specifications.md, Lifecycle and main loop (3), Graphics (11).
//
// The play screen is drawn from the records effects.js keeps in s.fxLast (what the original drew
// in the frame where it also changed the state) and from the state. Things that move smoothly
// are drawn alpha of the way between the previous tick (a snapshot) and the latest one.
//
// The canvas is never cleared, as the original never cleared its frame image: the strip the
// earthquake shake uncovers, and the top row on the start page, keep the previous frame.

import { RW, RH, SHM, RCK, WIND, VOLC, CLOUD, BASE, SPACE, MAGMA, FONTS, COLORS } from './data.js';
import { idiv, toInt, jround } from './jmath.js';
import { getName, getPrice, getWeight, getUpgradeName, getUpgradeAmount2,
  getUpgradePrice } from './stats.js';
import { makeString } from './shop.js';

// The frame image's font before anything sets one (Java's Dialog, plain 12).
const DEFAULT_FONT = '12px Arial, "Liberation Sans", Helvetica, sans-serif';
const BLACK = 'rgb(0,0,0)';
const RED = 'rgb(255,0,0)';
const GREEN = 'rgb(0,255,0)';
const BLUE = 'rgb(0,0,255)';
const ORANGE = 'rgb(255,200,0)';

// The field layer: the original's 800x600 'field' image. redraw() draws into it at once (through
// s.gfx.redrawField), and the M key draws the pause picture into it.
let field = null;
let fieldDrawn = false;
// When a redraw happens while the play frame's updates run, the original had already blitted
// the field for that frame: the picture from before the redraw is kept here for that frame.
let frozen = null;
let frozenFor = null;

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = RW;
  c.height = RH;
  return { c, g: c.getContext('2d') };
}

function resetContext(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.globalAlpha = 1;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.font = DEFAULT_FONT;
  g.fillStyle = BLACK;
  g.strokeStyle = BLACK;
}

/** redraw(): draws drawField into the field layer now. */
export function drawFieldLayer(s, assets) {
  if (!field) field = makeCanvas();
  const fx = s.fxLast;
  if (fx && fx.painting && frozenFor !== fx) {
    if (!frozen) frozen = makeCanvas();
    frozen.g.setTransform(1, 0, 0, 1, 0, 0);
    frozen.g.globalAlpha = 1;
    frozen.g.drawImage(field.c, 0, 0);
    frozenFor = fx;
  }
  resetContext(field.g);
  drawField(new Draw(field.g, assets), s);
  fieldDrawn = true;
}

/** The M key: the pause picture (field, display, pod and the pause or transmission screen). */
export function drawStatusLayer(s, assets) {
  if (!field) field = makeCanvas();
  frozenFor = null;
  resetContext(field.g);
  const d = new Draw(field.g, assets);
  drawField(d, s);
  drawBar1(d, s, s);
  drawDigger(d, s, (s.fxLast && s.fxLast.digger) || diggerFromState(s));
  drawTrans(d, s);
  fieldDrawn = true;
}

function blitField(d, s, ox) {
  if (!fieldDrawn) drawFieldLayer(s, d.assets); // nothing drew it yet: draw it from the state
  const src = frozen && frozenFor === s.fxLast ? frozen.c : field.c;
  d.g.drawImage(src, ox, 0);
}

// ---- Interpolation --------------------------------------------------------------------------

/** The positions render interpolates from, taken just before each tick. */
export function snapshot(s) {
  const fx = s.fxLast && s.fxLast.screen === 'play' ? s.fxLast : null;
  const bullets = new Map();
  if (fx && fx.bullets) for (const e of fx.bullets) bullets.set(e.b, [e.x, e.y]);
  return {
    menu: s.menu, startpage: s.startpage, status: s.status, framex: s.framex, framey: s.framey,
    digx: s.digx, digy: s.digy, labl1: s.labl1, labl1y: s.labl1y,
    grexists: Array.from(s.grexists), grx: Array.from(s.grx), gry: Array.from(s.gry),
    rockexists: Array.from(s.rockexists), rocks: fx && fx.rocks ? fx.rocks.slice() : null,
    bullets, entry: fx && fx.entry ? fx.entry : null,
    windx: Array.from(s.windx),
  };
}

// A read-only view of the state with interpolated positions and this frame's draw record.
function view(s, prev, alpha) {
  const v = Object.create(s);
  const rec = s.fxLast && s.fxLast.screen === 'play' ? s.fxLast : derivedRecord(s);
  v.fx = rec;
  if (!prev || alpha >= 1 || s.menu || s.status) return v;
  // Screen changes, camera jumps and teleports are not interpolated.
  if (prev.menu !== s.menu || prev.startpage !== s.startpage || prev.status !== s.status
      || prev.framex !== s.framex || prev.framey !== s.framey) return v;
  const lerp = (a, b, limit) => (Math.abs(b - a) <= limit ? Math.round(a + (b - a) * alpha) : b);
  v.digx = lerp(prev.digx, s.digx, 30);
  v.digy = lerp(prev.digy, s.digy, 30);
  const fx = Object.assign({}, rec);
  if (rec.rocks && prev.rocks) {
    fx.rocks = rec.rocks.map((r, i) => (r && prev.rocks[i] && prev.rockexists[i]
      ? [r[0], lerp(prev.rocks[i][1], r[1], 30)] : r));
  }
  if (rec.gr) {
    fx.gr = rec.gr.map((p, i) => (p && prev.grexists[i]
      ? [lerp(prev.grx[i], p[0], 40), lerp(prev.gry[i], p[1], 40), p[2], p[3]] : p));
  }
  if (rec.bullets) {
    fx.bullets = rec.bullets.map((e) => {
      const p = prev.bullets.get(e.b);
      return p ? { b: e.b, x: lerp(p[0], e.x, 60), y: lerp(p[1], e.y, 60), angle: e.angle } : e;
    });
  }
  if (rec.labl1 && prev.labl1) {
    const l = rec.labl1;
    fx.labl1 = [l[0], l[1], l[2], lerp(prev.labl1y, l[3], 10)];
  }
  if (rec.entry && prev.entry) fx.entry = [rec.entry[0], lerp(prev.entry[1], rec.entry[1], 10)];
  if (rec.wind) v.windx = Array.from(s.windx, (x, i) => lerp(prev.windx[i], x, 40));
  v.fx = fx;
  return v;
}

function diggerFromState(s) {
  return {
    drawship: s.drawship, iced: s.iced, hullOk: s.hull <= s.hullmax, bolton: s.bolton,
    cannonx: s.cannonx, beam: s.timr2,
  };
}

// The play frame drawn from the state alone, for a refresh that comes before this screen's first
// tick (the screen changed since the last tick): what the original would draw, without the
// updates. Rain and the laser need the tick, so they are left out.
function derivedRecord(s) {
  const fx = { screen: 'play' };
  fx.rocks = Array.from(s.rockexists, (e, i) => (e ? [s.rockx[i], s.rocky[i]] : null));
  fx.bullets = s.bullets.map((b) => {
    let angle = Math.atan(b.yspeed / b.xspeed);
    if (b.xspeed < 0) angle += Math.PI;
    return { b, x: b.x, y: b.y, angle };
  });
  if (s.labl1) fx.labl1 = [s.labl1str1, s.labl1str2, s.labl1x, s.labl1y];
  if (s.labl2) fx.labl2 = [s.labl2str1, s.labl2str2, s.labl2timr % 4 < 2];
  fx.gr = Array.from(s.grexists, (e, i) => (e ? [s.grx[i], s.gry[i], s.grtype[i], s.grscale[i]] : null));
  if (s.expls) fx.expl = [s.expl, s.explx, s.exply, s.ewidth, s.etimr];
  if (s.tr) fx.tr = s.trdir;
  fx.digger = diggerFromState(s);
  if (s.entrytimr > 0) {
    const t = s.entrytimr;
    const x = s.baseidx < 3 ? 50 : s.digx - 150;
    if (t < 100) fx.entry = [x, t * 3 - 150];
    else if (t < 110) fx.entry = [x, 140];
    else if (t < 170) fx.entry = [x, 140 - (t - 110) * 4];
  }
  if (s.framey < 4) {
    if (s.rain && s.lightningtimr > 1) fx.lightning = s.lightningx;
    if (s.wind && !s.rain) fx.wind = true;
  }
  if (s.shieldx) fx.shield = 200 - s.shieldtimr;
  if (s.sbomb) fx.sbomb = s.stimr;
  if (s.ibomb) fx.ibomb = s.itimr;
  if (s.rbomb) fx.rbomb = s.rtimr;
  if (s.nucb) fx.nucb = s.nuctimr;
  if (s.timr55 > 0) fx.panel55 = s.panel;
  if (s.greentimr > 0) fx.green = Math.min(s.greentimr, 255);
  if (s.msg && s.msgstr) fx.msg = [s.msgstr, s.msgstr.indexOf('FROZEN') >= 0];
  return fx;
}

// ---- The frame ------------------------------------------------------------------------------

/** Draws the frame: alpha of the way from the snapshot prev to the latest tick. */
export function render(g, s, assets, alpha = 1, prev = null) {
  const v = view(s, prev, alpha);
  const d = new Draw(g, assets);
  resetContext(g);

  if (!v.menu) {
    if (v.status) {
      // The pause picture, and nothing else (not even a pop-up).
      blitField(d, s, 0);
      return;
    }
    playScreen(d, v, s);
  } else if (!v.startpage) {
    baseScreen(d, v);
  } else {
    startPage(d, v);
  }

  if (v.pop_up) {
    screenFade(d);
    d.img(v.popup, 166, 200);
    if (v.popuptype === 3) {
      d.color('rgb(127,107,100)');
      d.font(FONTS.font20);
      d.text(String(v.saves), 431, 336);
    }
  }

  if (v.loading) {
    d.color('rgb(139,110,80)');
    d.rect(0, 0, RW, RH);
    d.color(BLACK);
    d.font(FONTS.arial36);
    d.text('Loading... Please wait...', 200, 280);
  }
}

// Drawing helpers with Java's behaviour: missing images and empty or negative rectangles draw
// nothing; text is drawn at its baseline, left aligned.
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
  // Java's drawImage(img, dx1, dy1, dx2, dy2, sx1, sy1, sx2, sy2); the source is clipped to
  // the image, and a source outside it draws nothing.
  sub(name, dx1, dy1, dx2, dy2, sx1, sy1, sx2, sy2) {
    const im = this.image(name);
    if (!im || dx2 <= dx1 || dy2 <= dy1 || sx2 <= sx1 || sy2 <= sy1) return;
    const iw = im.naturalWidth || im.width;
    const ih = im.naturalHeight || im.height;
    const kx = (dx2 - dx1) / (sx2 - sx1);
    const ky = (dy2 - dy1) / (sy2 - sy1);
    const a = Math.max(sx1, 0);
    const b = Math.min(sx2, iw);
    const c = Math.max(sy1, 0);
    const e = Math.min(sy2, ih);
    if (b <= a || e <= c) return;
    this.g.drawImage(im, a, c, b - a, e - c, dx1 + (a - sx1) * kx, dy1 + (c - sy1) * ky,
      (b - a) * kx, (e - c) * ky);
  }
  rect(x, y, w, h) {
    if (w > 0 && h > 0) this.g.fillRect(x, y, w, h);
  }
  outline(x, y, w, h) {
    this.g.lineWidth = 1;
    this.g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  line(x1, y1, x2, y2) {
    if (y1 === y2) {
      this.g.fillRect(Math.min(x1, x2), y1, Math.abs(x2 - x1) + 1, 1);
      return;
    }
    const g = this.g;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x1 + 0.5, y1 + 0.5);
    g.lineTo(x2 + 0.5, y2 + 0.5);
    g.stroke();
  }
  text(str, x, y) {
    if (str != null && str !== '') this.g.fillText(String(str), x, y);
  }
  width(str) {
    return Math.round(this.g.measureText(String(str)).width);
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
    g.fill('evenodd');
  }
  oval(x, y, w, h) {
    if (w <= 0 || h <= 0) return;
    const g = this.g;
    g.beginPath();
    g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
    g.fill();
  }
}

// A colour the state holds: a CSS string, or [r, g, b] / {r, g, b}.
function css(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return `rgb(${c[0]},${c[1]},${c[2]})`;
  if (c && typeof c === 'object') return `rgb(${c.r},${c.g},${c.b})`;
  return BLACK;
}

function screenFade(d) {
  d.alpha(0.5);
  d.color('rgb(70,70,70)');
  d.rect(0, 0, RW, RH);
  d.alpha(1);
}

// A TextPanel: its lines at x, y + i * step.
function drawPanel(d, panel) {
  const n = panel.linecount !== undefined ? panel.linecount : panel.lines.length;
  for (let i = 0; i < n; i++) d.text(panel.lines[i], panel.x, panel.y + i * panel.step);
}

// ---- The field layer ------------------------------------------------------------------------

function drawField(d, s) {
  const magmatimr = s.magmatimr;
  const map = s.map;
  const mapmode = s.mapmode;
  const fx0 = s.framex;
  const fy0 = s.framey;
  d.color(css(s.back_color));
  d.rect(0, 0, RW, RH);
  if (fy0 < 4) {
    if (s.c_sky != null) d.color(css(s.c_sky)); // Java ignores setColor(null)
    d.rect(0, 0, RW, -50 * fy0 + 250);
    d.img(s.sky2, s.skyx2, -50 * fy0 + 115);
    for (let i = 0; i < VOLC; i++) {
      const dif = idiv(s.volcanoscale[i], 2);
      // Quirk: || makes this always true.
      if (s.volcanox[i] + dif > 0 || s.volcanox[i] - dif < 800) {
        d.img(s.volcano[s.volcanotype[i]], s.volcanox[i] - dif, -50 * fy0 + 100, dif * 2, 150);
      }
    }
    d.img(s.sky, s.skyx1, -50 * fy0 + 100);
    d.img(s.sky, s.skyx1 + 900, -50 * fy0 + 100);
    if (fy0 < 7) {
      for (let ix = 0; ix < BASE; ix++) {
        const basex1 = 50 * (s.basex[ix] - fx0);
        if (basex1 > -100 && basex1 < 850) {
          d.img(s.baseok[ix] ? s.base : s.basedestroyed, basex1 - 60, 150 - 50 * fy0);
        }
      }
    }
    for (let i = 0; i < CLOUD; i++) {
      const dif = idiv(s.cloudscale[i], 2);
      if (s.cloudx[i] + dif > 0 || s.cloudx[i] - dif < 800) {
        d.img(s.cloud3, s.cloudx[i] - dif, s.cloudy[i] - 50 * fy0, dif * 2, dif);
      }
    }
    d.color(css(s.back_color));
    for (let x = fx0; x < fx0 + 16; x++) {
      if (map[x][4] === 81 || map[x][2] === 81) {
        // Volcanic ash falling.
        const x1 = 50 * (x - fx0) - 7;
        const y1 = -(magmatimr % 15) * 10 - 50 * fy0;
        d.img(s.ash, x1, y1);
        d.img(s.ash, x1, y1 + 200);
        d.rect(x1, 250 - 50 * fy0, 70, 200);
      }
    }
    for (let x = fx0; x < fx0 + 16; x++) {
      if (map[x][5] < 75) d.img(s.rough, 50 * (x - fx0), -50 * fy0 + 246);
    }
  }

  for (let x = fx0; x < fx0 + 16; x++) {
    for (let j = fy0; j < fy0 + 12; j++) {
      const x1 = 50 * (x - fx0);
      const y1 = 50 * (j - fy0);
      if (j < 102) {
        const idx = map[x][j];
        let md = mapmode[x][j];
        if (idx !== 73 && idx !== 71 && idx !== 72) {
          if (idx === 74) {
            d.img(s.imgs[74], x1, y1);
          } else {
            if (idx < 75) {
              if (md > 5) md = 5;
              d.img(s.ground[md], x1, y1);
            }
            if (idx < SPACE && idx > 0 && !s.glow[idx]) {
              if (md !== MAGMA) {
                d.img(s.imgs[idx], x1, y1);
              } else if (idx === MAGMA) {
                d.img(s.imgs[MAGMA], x1, y1);
              } else if (idx === 75) {
                // Flowing magma, down, up, right and left.
                let y11 = magmatimr * 5 + (j - fy0) * 50;
                while (y11 > 150) y11 -= 150;
                d.sub(s.imagmay, x1, y1, x1 + 50, y1 + 50, 0, y11, 50, y11 + 50);
              } else if (idx === 76) {
                let y11 = (j - fy0) * 50 - magmatimr * 5 + 150;
                while (y11 < 0) y11 += 150;
                while (y11 > 150) y11 -= 150;
                d.sub(s.imagmay, x1, y1, x1 + 50, y1 + 50, 0, y11, 50, y11 + 50);
              } else if (idx === 77) {
                let x11 = magmatimr * 5 + (x - fx0) * 50;
                while (x11 > 150) x11 -= 150;
                d.sub(s.imagmax, x1, y1, x1 + 50, y1 + 50, x11, 0, x11 + 50, 50);
              } else if (idx === 78) {
                let x11 = (x - fx0) * 50 - magmatimr * 5 + 150;
                while (x11 < 0) x11 += 150;
                while (x11 > 150) x11 -= 150;
                d.sub(s.imagmax, x1, y1, x1 + 50, y1 + 50, x11, 0, x11 + 50, 50);
              }
            }
            if (idx >= 75 && j > 0) {
              // Rims round a dug-out tile, against each solid neighbour.
              if (x === 0 && j > 4) {
                d.img(s.grv, x1 - 3, y1);
                if (map[x][j - 1] < 70) d.img(s.grul2, x1 + 6, y1 + 6);
                if (map[x][j + 1] < 70) d.img(s.grdl2, x1 + 6, y1 + 31);
              } else if (x === 4999 && j > 4) {
                d.img(s.grv, x1 + 40, y1);
                if (map[x][j - 1] < 70) d.img(s.grur2, x1 + 30, y1 + 6);
                if (map[x][j + 1] < 70) d.img(s.grdr2, x1 + 30, y1 + 31);
              }
              if (x > 0 && map[x - 1][j] < 70) {
                d.img(s.grv, x1 - 3, y1);
                if (map[x][j - 1] < 70) d.img(s.grul2, x1 + 6, y1 + 6);
              }
              if (x > 0 && map[x - 1][j - 1] < 70) d.img(s.grul1, x1 - 2, y1 - 1);
              if (map[x][j - 1] < 70) {
                d.img(s.grh, x1, y1 - 2);
                if (x < 4999 && map[x + 1][j] < 70) d.img(s.grur2, x1 + 30, y1 + 6);
              }
              if (x < 4999 && map[x + 1][j] < 70) {
                d.img(s.grv, x1 + 41, y1);
                if (j < 101 && map[x][j + 1] < 70) d.img(s.grdr2, x1 + 30, y1 + 31);
              }
              if (x < 4999 && map[x + 1][j - 1] < 70) d.img(s.grur1, x1 + 43, y1 - 1);
              if (x < 4999 && j < 101 && map[x + 1][j + 1] < 70) d.img(s.grdr1, x1 + 43, y1 + 44);
              if (j < 101 && map[x][j + 1] < 70) {
                d.img(s.grh, x1, y1 + 42);
                if (x > 0 && map[x - 1][j] < 70) d.img(s.grdl2, x1 + 6, y1 + 31);
              }
              if (x > 0 && j < 101 && map[x - 1][j + 1] < 70) d.img(s.grdl1, x1 - 2, y1 + 44);
            }
          }
        }
      } else if (j >= 102) {
        // Below the map.
        if (map[x][101] === 75) {
          d.img(s.imagmay, x1, y1);
        } else {
          d.img(s.ground[0], x1, y1);
          d.img(s.imgs[30], x1, y1);
        }
      }
    }
  }

  // Glowing minerals: drawn last, larger, centred on their tile.
  for (let x = fx0; x < fx0 + 16; x++) {
    for (let j = fy0; j < fy0 + 12; j++) {
      if (j < 102) {
        const idx = map[x][j];
        if (s.glow[idx]) d.img(s.imgs[idx], 50 * (x - fx0) - 25, 50 * (j - fy0) - 25);
      }
    }
  }

  if (fy0 < 4) {
    // Volcanoes and hills, from a few columns either side of the screen.
    let x1 = fx0;
    let x2 = fx0 + 16;
    if (fx0 > 6) x1 = fx0 - 6;
    if (fx0 < 4978) x2 = fx0 + 22;
    for (let x = x1; x < x2; x++) {
      if (map[x][4] === 70) d.img(s.volcano_x, 50 * (x - fx0) - 93, 50 * (4 - fy0) - 61);
      else if (map[x][4] === 71) d.img(s.hillimg1, 50 * (x - fx0) - 70, 50 * (4 - fy0) - 200);
      else if (map[x][4] === 72) d.img(s.hillimg2, 50 * (x - fx0) - 150, 50 * (4 - fy0) - 200);
    }
  }

  const fl = s.frostlevel;
  if (fl > 0) {
    // Frost creeping in from the edges.
    d.sub(s.frost, 0, 0, fl, 600, 0, 0, fl, 600);
    d.sub(s.frost, 800 - fl, 0, 800, 600, 800 - fl, 0, 800, 600);
    d.sub(s.frost, 0, 0, 800, fl, 0, 0, 800, fl);
    d.sub(s.frost, 0, 600 - fl, 800, 600, 0, 600 - fl, 800, 600);
    for (let i = fl - 60; i < 800 - fl; i += 43) {
      d.img(s.frostpiece, i, fl - 60);
      d.img(s.frostpiece, i, 580 - fl);
    }
    for (let i = fl - 60; i < 620 - fl; i += 39) {
      d.img(s.frostpiece, fl - 60, i);
      d.img(s.frostpiece, 780 - fl, i);
    }
  }
}

// ---- The play screen ------------------------------------------------------------------------

function playScreen(d, v, s) {
  const fx = v.fx;
  if (!v.earthq) {
    if (v.rdr) drawField(d, v);
    else blitField(d, s, 0);
  } else if (v.eqtimr % 4 < 2) {
    blitField(d, s, -5);
  } else {
    blitField(d, s, 5);
  }

  if (fx.rocks) {
    for (let i = 0; i < RCK; i++) {
      const r = fx.rocks[i];
      if (r) d.img(v.rock, r[0] - 25, r[1] - 25);
    }
  }

  if (fx.bullets) {
    for (const e of fx.bullets) {
      const b = e.b;
      if (!Number.isFinite(e.angle)) continue; // a shell with no speed: Java's NaN rotation
      const im = d.image(v.bulletimg[b.mode]);
      if (!im) continue;
      const cx = e.x + idiv(b.width, 2);
      const cy = e.y + idiv(b.height, 2);
      d.g.translate(cx, cy);
      d.g.rotate(e.angle);
      d.g.drawImage(im, 0, 0);
      d.g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // Floating labels.
  if (fx.labl1) {
    d.color(COLORS.c_red);
    d.font(FONTS.labelfont);
    d.text(fx.labl1[0], fx.labl1[2], fx.labl1[3] - 20);
    d.text(fx.labl1[1], fx.labl1[2], fx.labl1[3] - 8);
  }
  if (fx.labl2) {
    d.color(fx.labl2[2] ? COLORS.c_red : GREEN);
    d.font(FONTS.font20);
    d.text(fx.labl2[0], idiv(RW, 2) - 150, idiv(RH, 2) - 50);
    d.text(fx.labl2[1], idiv(RW, 2) - 150, idiv(RH, 2) - 25);
  }

  // Particles.
  if (fx.gr) {
    for (let i = 0; i < SHM; i++) {
      const p = fx.gr[i];
      if (!p) continue;
      const name = p[2] === 0 ? v.shmootz : p[2] === 1 ? v.grans : p[2] === 2 ? v.marbs : null;
      d.img(name, p[0], p[1], p[3], p[3]);
    }
  }

  if (fx.expl) {
    const [name, x, y, w, f] = fx.expl;
    d.sub(name, x, y, x + w, y + w, f * w, 0, f * w + w, w);
  }

  if (fx.tr !== undefined) drawBeam(d, v, fx.tr);

  if (fx.digger) drawDigger(d, v, fx.digger);

  if (fx.entry) d.img(v.transporter, fx.entry[0], fx.entry[1]);

  if (fx.rain) {
    d.color(COLORS.c_rain);
    for (const i of fx.rain.lines) d.line(i, 0, i - fx.rain.angle1, 250 - v.framey * 50);
  }
  if (fx.lightning !== undefined) d.img(v.lightning, fx.lightning - 100, -50 * v.framey - 18);
  if (fx.wind) {
    d.color('rgb(100,100,100)');
    for (let i = 0; i < WIND; i++) {
      if (v.windx[i] > v.rainbegin && v.windx[i] < v.rainend) {
        d.rect(v.windx[i], v.windy[i] - v.framey * 50, 2, 2);
      }
    }
  }

  if (fx.shield !== undefined) {
    d.img(v.shield_img, v.digx - 40, v.digy - 70);
    d.color('rgb(255,130,160)');
    // In whatever font was set last this frame, as in the original.
    d.text(String(fx.shield), v.digx + 15, v.digy - 55);
  }

  if (fx.sbomb !== undefined) {
    d.alpha(0.5);
    d.color('rgb(150,150,100)');
    ring(d, v.sbombx, v.sbomby, 20 * fx.sbomb, 20 * (fx.sbomb - 1));
    d.alpha(1);
  }
  if (fx.ibomb !== undefined) {
    d.color('rgb(0,255,255)');
    ring(d, v.ibombx, v.ibomby, 15 * fx.ibomb, 15 * (fx.ibomb - 2));
  }
  if (fx.rbomb !== undefined) {
    const t = fx.rbomb;
    d.alpha(0.5);
    d.color('rgb(150,255,150)');
    d.oval(v.rbombx - t * 12, v.rbomby - t * 12, t * 24, t * 24);
    d.alpha(1);
  }
  if (fx.nucb !== undefined) {
    const t = fx.nucb;
    d.alpha(0.5);
    d.color('rgb(255,255,70)');
    d.oval(v.nucbx - t * 15, v.nucby - t * 15, t * 30, t * 30);
    d.alpha(1);
  }

  drawBar1(d, v, fx.bar || v);

  if (v.teltimr > 0) {
    // The teleport's sparkle, 2 ticks a frame.
    const f = 60 * idiv(v.teltimr, 2);
    d.sub(v.telimg, v.digx + 10, v.digy - 60, v.digx + 70, v.digy + 40, f, 0, f + 60, 100);
  }

  // (The speed readout of gspdtimr never shows: the speed keys are removed.)

  if (fx.panel55 !== undefined) {
    d.img(v.ximgs[3], 200, 200);
    d.color(BLACK);
    d.font(FONTS.labelfont);
    // Fix: the original threw here when the panel had been cleared (Esc on a transmission).
    if (fx.panel55) drawPanel(d, fx.panel55);
  }

  if (fx.green !== undefined) {
    d.color(`rgba(0,255,0,${fx.green / 255})`);
    d.rect(0, 0, RW, RH);
  }

  if (fx.laserBar !== undefined) {
    d.color('rgb(200,0,200)');
    d.rect(300, 10, fx.laserBar, 20);
  }
  if (fx.laser) {
    const l = fx.laser;
    d.color(COLORS.c_laser1);
    if (l.surface) {
      if (l.right) d.rect(v.digx + 79, v.digy - 20, 1000, 6);
      else d.rect(-20, v.digy - 20, 20 + v.digx - 5, 6);
    } else if (l.right) {
      d.rect(v.digx + 79, v.digy - 20, l.pos1 - v.digx - 65, 6);
    } else {
      d.rect(l.pos1 - 15, v.digy - 20, v.digx - l.pos1 + 12, 6);
    }
  }

  if (fx.msg) {
    d.font(FONTS.font20);
    d.color(fx.msg[1] ? BLUE : COLORS.c_red);
    const width = d.width(fx.msg[0]);
    d.text(fx.msg[0], idiv(RW, 2) - idiv(width, 2), idiv(RH, 2));
  }

  d.color(BLACK);
  d.font(FONTS.barfont);
  d.text(String(v.iposx), 758, 20);
  d.text(v.scorestr, 10, 20);
  if (v.trans) drawTrans(d, v);
}

// The tractor beam.
function drawBeam(d, v, dir) {
  if (dir === 0) d.img(v.beamh, v.digx + 45, v.digy - 25);
  else if (dir === 1) d.img(v.beamv, v.digx + 30, v.digy - 75);
  else if (dir === 2) d.img(v.beamh, v.digx - 25, v.digy - 25);
  else if (dir === 3) d.img(v.beamv, v.digx + 30, v.digy - 25);
}

// The sonic and ice blasts: a ring of 18 segments of 20 degrees.
function ring(d, cx, cy, outer, inner) {
  for (let ang = 0; ang < 360; ang += 20) {
    const a0 = ang * Math.PI / 180.0;
    const a1 = (ang + 20) * Math.PI / 180.0;
    d.poly(
      [cx + jround(outer * Math.cos(a0)), cx + jround(outer * Math.cos(a1)),
        cx + jround(inner * Math.cos(a1)), cx + jround(inner * Math.cos(a0))],
      [cy - jround(outer * Math.sin(a0)), cy - jround(outer * Math.sin(a1)),
        cy - jround(inner * Math.sin(a1)), cy - jround(inner * Math.sin(a0))],
    );
  }
}

// The pod. dg holds what the frame drew it with (see diggerStep in effects.js).
function drawDigger(d, v, dg) {
  if (!dg.drawship) return;
  if (dg.iced) {
    d.img(v.icedship, v.digx, v.digy - 70);
    return;
  }
  if (!dg.hullOk) {
    d.img(v.destroyed, v.damx + 10, v.damy - 33);
    return;
  }
  const x = v.digx;
  const y = v.digy;
  const f = v.digtimr % 3;
  let hx = 0;
  let hy = 0;
  if (dg.cannonx && !v.flame && v.mode === 1) {
    // The laser cannon.
    if (!v.right_side) {
      hx = 15;
      d.img(v.lcannonl, x - 4, y - 22);
    } else {
      hx = 2;
      d.img(v.lcannonr, x + 59, y - 22);
    }
    if (v.mode === 1) d.img(v.tracks, x + 12, y - 11);
  }
  if (!v.scannon && !dg.cannonx) {
    if (v.mode === 1) {
      if (!v.flame) {
        if (!v.right_side) {
          d.img(v.dig_l0, x, y - 30);
          hx = 15;
        } else {
          d.img(v.dig_r0, x + 49, y - 30);
          hx = 2;
        }
        d.img(v.tracks, x + 12, y - 11);
        if (v.drill <= 0.0) {
          if (!v.right_side) {
            d.img(v.nodrill_l, x, y - 33);
            hx = 15;
          } else {
            d.img(v.nodrill_r, x + 12, y - 33);
            hx = 2;
          }
        }
      }
    } else if (v.mode === 4) {
      hy = 1;
      if (!v.right_side) {
        hx = 9;
        d.img([v.dig_dl0, v.dig_dl1, v.dig_dl2][f], x + 12, y - 33);
      } else {
        hx = -1;
        d.img([v.dig_dr0, v.dig_dr1, v.dig_dr2][f], x + 12, y - 33);
      }
    } else if (v.mode === 2) {
      if (!v.right_side) {
        hx = 15;
        d.img([v.dig_l0, v.dig_l1, v.dig_l2][f], x, y - 30);
      } else {
        hx = 3;
        d.img([v.dig_r0, v.dig_r1, v.dig_r2][f], x + 49, y - 30);
      }
    }
    if (v.mode < 3 && !v.flame) d.img(v.tracks, x + 12, y - 11);
  } else if (!dg.cannonx) {
    // The sonic cannon and its shot.
    const t2 = dg.beam;
    if (t2 > 0) {
      if (t2 < 6) {
        d.color('rgb(150,150,100)');
        if (v.dir2 === 1) d.rect(x + 30 + t2 * 10, y - 50, 10, 60);
        else if (v.dir2 === 2) d.rect(x - t2 * 10 + 10, y - 50, 10, 60);
        else if (v.dir2 === 3) d.rect(x + 7, y - 15 + t2 * 10, 60, 10);
      }
      if (v.dir2 === 1) d.img(v.beamh, x + 45, y - 25);
      else if (v.dir2 === 2) d.img(v.beamh, x - 25, y - 25);
      else if (v.dir2 === 3) d.img(v.beamv, x + 30, y - 25);
    }
    if (v.mode === 1 && !v.flame) {
      const shown = v.timr2 === 0 || (v.timr2 > 0 && v.dir2 !== 3);
      if (!v.right_side) {
        hx = 15;
        if (shown) d.img(v.scannonl, x - 3, y - 24);
      } else {
        hx = 2;
        if (shown) d.img(v.scannonr, x + 59, y - 24);
      }
      d.img(v.tracks, x + 12, y - 11);
    }
  }
  if (v.mode === 3 || v.mode === 5) {
    if (v.echarger > 0) {
      d.img(v.antenna, x + 28, y - 58);
      if (dg.bolton) d.img(v.bolt, x + 25, y - 53);
    }
    if (!v.flame || v.mode === 5) {
      vert(d, v);
      if (v.right_side) hy = 6;
      else {
        hy = 5;
        hx = 11;
      }
    } else if (v.right_side) {
      d.img(v.flame_r, x + 10, y - 44);
      hx = -3;
      hy = -11;
    } else {
      d.img(v.flame_l, x + 10, y - 44);
      hx = 8;
      hy = -11;
    }
  }
  if (idiv(v.rpm * 100, v.engmax) > 92) {
    // The engine shakes the hull at full load.
    if (v.mode === 4) hy += v.time % 2 === 0 ? -1 : 1;
    else hx += v.time % 2 === 0 ? -1 : 1;
  }
  if (v.right_side) {
    d.img(v.hull_r, x + 12 + hx + v.hlx, y - 33 + hy + v.hly);
    if (v.flame) d.img(v.flame_r, x - 26, y - 33);
  } else {
    d.img(v.hull_l, x + hx + v.hlx, y - 33 + hy + v.hly);
    if (v.flame) d.img(v.flame_l, x - 7, y - 33);
  }
  if (v.rx > v.biomax) d.img(v.radiation, x - 15, y - 70);
}

// The propeller, 3 frames.
function vert(d, v) {
  const f = v.timr1 % 3;
  const names = v.right_side ? [v.fly_r0, v.fly_r1, v.fly_r2] : [v.fly_l0, v.fly_l1, v.fly_l2];
  d.img(names[f], v.digx + 10, v.digy - 44);
}

// The heads-up display. b gives the hull, fuel and battery as they were when it was drawn.
function drawBar1(d, v, b) {
  const dy = 7;
  if (v.is_mission && v.mission) {
    const xarr = [543, 568, 594, 619, 645, 671, 696, 722, 747, 772];
    const yarr = [473, 473, 473, 474, 474, 479, 481, 484, 489, 492];
    d.img(v.mission_img, 512, 450);
    for (let i = 0; i < v.mission.number; i++) {
      if (v.mission.quantity[i] > 0) d.img(v.imgs[v.mission.minarray[i]], xarr[i], yarr[i], 25, 25);
    }
  }

  if (v.gpanel) {
    const ystart = 60;
    d.img(v.gbuttonon, 10, 25);
    d.img(v.gadgetpanel, 0, ystart);
    if (v.sely >= 0) {
      d.img(v.ximgs[4], 11, ystart + 12 + idiv(100 * v.sely, 3));
      d.color(ORANGE);
      d.font(FONTS.barfont);
      d.text(v.gpanelstr[v.sely], 15, ystart + 33 + idiv(100 * v.sely, 3));
    }
  } else {
    d.img(v.gbutton, 10, 25);
  }

  d.img(v.bar1, 0, 483 + dy);
  d.color(RED);
  if (b.hull < v.hullmax) {
    d.rect(587, 567 + dy - idiv(49 * b.hull, v.hullmax), 52, idiv(49 * b.hull, v.hullmax));
  } else {
    d.rect(587, 567 + dy - 49, 52, 49);
  }
  const drillH = toInt(49.0 * v.drill / v.drillmax);
  d.rect(289, 567 + dy - drillH, 52, drillH);
  if (v.rx < v.biomax) {
    d.rect(443, 567 + dy - idiv(49 * v.rx, v.biomax), 61, idiv(49 * v.rx, v.biomax));
  } else {
    d.rect(443, 567 + dy - 49, 61, 49);
  }
  d.rect(381, 567 + dy - idiv(49 * v.cargo, v.cargomax), 52, idiv(49 * v.cargo, v.cargomax));
  if (!v.newbar) {
    d.rect(514, 567 + dy - idiv(49 * v.rpm, v.engmax), 63, idiv(49 * v.rpm, v.engmax));
  } else if (v.nux < 40000) {
    d.rect(514, 567 + dy - idiv(49 * v.nux, 40000), 63, idiv(49 * v.nux, 40000));
  } else {
    d.rect(514, 567 + dy - 49, 63, 49);
  }
  const fuelH = toInt(49.0 * b.fuel / v.fuelmax);
  d.rect(236, 567 + dy - fuelH, 47, fuelH);
  const batH = toInt(49.0 * b.battery / v.batmax);
  d.rect(161, 567 + dy - batH, 67, batH);
  if (v.temp < 0) d.color(BLUE);
  if (v.temp < v.tempmax && v.temp >= 0) {
    d.rect(351, 568 + dy - idiv(52 * v.temp, v.tempmax), 20, idiv(52 * v.temp, v.tempmax));
  } else if (v.temp < 0 && v.temp > v.tempmin) {
    d.rect(351, 568 + dy - idiv(52 * v.temp, v.tempmin), 20, idiv(52 * v.temp, v.tempmin));
  } else {
    d.rect(351, 563 + dy - 52, 20, 52);
  }
  if (v.temp < 0) d.color(RED);
  d.img(v.bar2, 0, 483 + dy);

  d.color(BLACK);
  d.font(FONTS.bardraw);
  if (!v.extractor) d.text(`${idiv(100 * v.rpm, v.engmax)}%`, 524, 590 + dy);
  else d.text(String(v.nux), 524, 590 + dy);
  d.text(String(v.cargo), 388, 590 + dy);
  d.text(String(jround(v.drill)), 294, 590 + dy);
  d.text(String(b.hull), 589, 590 + dy);
  d.text(String(jround(b.fuel)), 239, 590 + dy);
  d.text(String(jround(b.battery)), 168, 590 + dy);
  d.text(String(v.temp), 346, 590 + dy);
  d.text(`${idiv(100 * v.rx, v.biomax)}%`, 452, 590 + dy);
  d.color(COLORS.c_bar);
  d.text(v.moneystr, 41, 552 + dy);
  d.text(String(v.depth), 73, 582 + dy);
  const mint = v.minutes < 10 ? `0${v.minutes}` : `${v.minutes}`;
  const hrs = v.hours < 10 ? `0${v.hours}` : `${v.hours}`;
  d.text(String(v.days), 692, 583 + dy);
  d.text(hrs, 729, 583 + dy);
  d.text(mint, 756, 583 + dy);
  if (v.ice9 > 0.0) {
    d.color(COLORS.c_black);
    d.outline(759, 399, 22, 102);
    d.color(COLORS.c_blue);
    const ht = jround(v.ice9 * 100.0 / v.ice9max);
    d.rect(760, 501 - ht, 21, ht);
    d.text('Ice9', 750, 390);
    // Quirk: meant to show two decimals, but the division is a whole-number one.
    d.text(String(idiv(jround(v.ice9 * 100.0), 100)), 750, 520);
  }
  d.img(v.cursor, 655, 529);
  d.color(RED);
}

// A transmission (with a panel) or the pause screen's inventory.
function drawTrans(d, v) {
  d.img(v.inventory, 90, 20);
  d.color('rgb(100,75,0)');
  if (v.panel != null) {
    d.font(FONTS.barfont);
    d.text('TRANSMISSION', 300, 125);
    drawPanel(d, v.panel);
    return;
  }
  const x1 = 120;
  let y1 = 160;
  const inc = 12;
  d.font(FONTS.barfont);
  d.text('Game Paused', 300, 125);
  d.font(FONTS.dfont);
  d.text('MINERALS', x1, 145);
  d.font(FONTS.labelfont);
  d.text('Mineral', x1, y1);
  d.text('Amount', x1 + 100, y1);
  d.text('Weight', x1 + 160, y1);
  d.line(x1, y1 + 1, x1 + 200, y1 + 1);
  y1 += inc;
  for (let i = 1; i < 42; i++) {
    if (v.minerals[i] > 0) {
      d.text(getName(i), x1, y1);
      d.text(String(v.minerals[i]), x1 + 120, y1);
      d.text(`${v.minerals[i] * getWeight(i)} lbs`, x1 + 160, y1);
      y1 += inc;
      if (y1 > 470) break;
    }
  }
  d.line(x1, y1 + 1 - inc, x1 + 200, y1 + 1 - inc);
  d.text(`Mineral Profit: $${v.mineralprofit}`, x1, y1);
  y1 += inc;
  d.text(`Ships Total Weight: ${toInt(v.weight + v.cargo + v.fuel)} lbs.`, x1, y1);
  y1 += inc;
  const hrs = 1.0 * v.hours + 1.0 * v.minutes / 60.0 + 1.0 * (v.time % 300) / 19000.0;
  const surface = toInt((800.0 * Math.sin(0.83 * (hrs - v.posx / 5000.0) + 4.5) + 400.0) * 0.972 - 8.0);
  d.text(`Surface Temperature: ${surface}F`, x1, y1);
  y1 += inc;
  const baseT = toInt((800.0 * Math.sin(0.83 * (hrs - v.basex[v.baseidx] / 5000.0) + 4.5) + 400.0)
    * 0.972 - 8.0);
  d.text(`Base Temperature: ${baseT}F`, x1, y1);

  const gx = 360;
  let gy = 160;
  d.font(FONTS.dfont);
  d.text('GADGETS', gx, 145);
  d.font(FONTS.labelfont);
  d.text('Gadget', gx, gy);
  d.text('Amount', gx + 150, gy);
  d.line(gx, gy + 1, gx + 200, gy + 1);
  gy += inc;
  const counts = [['Teleport 1', v.tel1], ['Teleport 2', v.tel2], ['Protective Shield', v.shield],
    ['Drill Repair', v.drillfix], ['Hull Repair', v.hullfix], ['Dynamite', v.dyn], ['TNT', v.tnt],
    ['Sonic Bomb', v.sonb], ['Ice Bomb', v.iceb], ['Radiation Bomb', v.radb],
    ['Heating Unit', v.heater], ['Matter Transmitter', v.mtrans]];
  for (let k = 0; k < counts.length; k++) {
    d.text(counts[k][0], gx, gy);
    d.text(String(counts[k][1]), gx + 150, gy);
    if (k === counts.length - 1) d.line(gx, gy + 1, gx + 200, gy + 1);
    gy += inc;
  }
  for (const [owned, name] of [[v.coalb, 'Coal Burner'], [v.petrolr, 'Petroleum Refinery'],
    [v.tractor, 'Tractor Beam'], [v.gasb, 'Natural Gas Burner'], [v.nuc, 'Nuclear Reactor'],
    [v.nucx, 'Nuclear Reactor X'], [v.echarger, 'Lightning Charger']]) {
    if (owned === 1) {
      d.text(name, gx, gy);
      gy += inc;
    }
  }

  // The power weapons and converters carried.
  let y2 = 120;
  for (const [has, idx] of [[v.scannon, 59], [v.cannon, 56], [v.converter, 58], [v.extractor, 57],
    [v.nanobots, 60], [v.iceconverter, 61]]) {
    if (has) {
      d.img(v.imgs[idx], 600, y2);
      y2 += 50;
    }
  }

  d.line(gx, gy + 1 - inc, gx + 200, gy + 1 - inc);
  d.text('Saves', gx, gy);
  d.text(String(v.saves), gx + 150, gy);
  gy += inc;
  gy += 15;
  d.font(FONTS.dfont);
  d.text('UPGRADES', gx, gy);
  d.font(FONTS.labelfont);
  gy += inc;
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
  d.text('Upgrade', gx, gy);
  d.text('Name', gx + 80, gy);
  d.text('Amount', gx + 210, gy);
  d.line(gx, gy + 1, gx + 240, gy + 1);
  gy += inc;
  for (const [label, index, level, mega, unit] of rows) {
    let name = getUpgradeName(index);
    let amount = getUpgradeAmount2(index);
    if (mega !== null && level === 8) {
      name = 'Mega';
      amount = mega;
    }
    d.text(label, gx, gy);
    d.text(name, gx + 80, gy);
    d.text(`${amount}${unit}`, gx + 210, gy);
    gy += inc;
  }
}

// ---- The bases ------------------------------------------------------------------------------

const UPGRADE_KINDS = ['Engine', 'Fuel Tank', 'Cargo Bay', 'Radiator', 'Hull', 'Bio-X Shielding',
  'Drill'];

function baseScreen(d, v) {
  d.font(FONTS.barfont);
  d.color(COLORS.c_black);
  if (v.tab === 1) {
    // Repairs, refuelling and selling.
    d.color('rgb(184,156,61)');
    d.img(v.shop, 0, 0);
    const x = 37;
    let y = 173;
    for (let ix = 1; ix < 42; ix++) {
      if (v.minerals[ix] > 0) {
        d.text(getName(ix), x, y);
        d.text(String(v.minerals[ix]), x + 110, y);
        d.text(`$ ${idiv(v.minerals[ix] * getPrice(ix) * v.money_factor, 10)}`, x + 145, y);
        y += 16;
      }
    }
    d.img(v.cursor, 286, 150 + v.sely * 59);
    d.text(`${v.cargo} lbs`, 382, 324);
    d.text(v.mineralprofit, 639, 198);
    d.text(`${jround(v.fuel)} lbs`, 382, 383);
    d.text(String(jround(v.drill)), 382, 442);
    d.text(String(v.hull), 382, 501);
    d.text(v.repairscost, 639, 262);
    d.text(v.moneystr, 639, 324);
  } else if (v.tab === 2) {
    // Upgrades.
    d.img(v.shop, 0, 0);
    for (let ix = 0; ix < 8; ix++) {
      for (let j = 0; j < 7; j++) {
        d.img(v.imgs[7 * ix + j], 19 + ix * 83, 106 + j * 69, 69, 64);
        d.img(v.upgrades[ix][j] ? v.ximgs[1] : v.ximgs[0], 5 + ix * 83, 95 + j * 69);
      }
    }
    d.img(v.cursor, 5 + v.selx * 83, 95 + v.sely * 69);
    d.img(v.imgs[7 * v.selx + v.sely], 685, 47, 100, 100);
    d.img(v.ximgs[2], 678, 40);
    d.font(FONTS.narrowfont);
    d.color('rgb(218,174,184)');
    d.text(v.selstr1, 690, 200);
    d.text(UPGRADE_KINDS[v.selx] !== undefined ? UPGRADE_KINDS[v.selx] : 'Battery', 690, 216);
    d.text(v.selstr2, 690, 232);
    d.font(FONTS.barfont);
    d.text(v.selstr3, 690, 248);
    if (v.upgrades[v.selx][v.sely]) {
      d.text('Already', 690, 280);
      d.text('Purchased', 690, 296);
    } else if (getUpgradePrice(v.selx * 7 + v.sely) > v.money) {
      d.text('Unavailable', 690, 280);
    } else {
      d.text('Available', 690, 280);
    }
    d.color(COLORS.c_bar);
    d.font(FONTS.bardraw);
    d.text(v.moneystr, 41, 29);
  } else if (v.tab === 3) {
    // Gadgets.
    const cx = 688;
    d.font(FONTS.barfont);
    d.color('rgb(180,255,180)');
    d.img(v.shop, 0, 0);
    for (let ix = 0; ix < v.gadgetstr.length; ix++) {
      d.img(v.ximgs[0], 307, 141 + 18 * ix);
      d.img(v.ximgs[0], 539, 141 + 18 * ix);
      d.img(v.ximgs[0], cx, 141 + 18 * ix);
      d.text(v.gadgetstr[ix], 350, 161 + 18 * ix);
      d.text(`$   ${makeString(v.gadgetprice[ix])}`, 575, 161 + 18 * ix);
    }
    d.img(v.box1, 328, 145 + 18 * v.sely);
    d.img(v.cursor1, 307, 141 + 18 * v.sely);
    d.img(v.cursor1, 539, 141 + 18 * v.sely);
    const counts = [[v.tel1, 141], [v.tel2, 159], [v.dyn, 177], [v.tnt, 195], [v.shield, 213],
      [v.hullfix, 231], [v.drillfix, 249], [v.sonb, 267], [v.iceb, 285], [v.radb, 303],
      [v.heater, 447], [v.mtrans, 465]];
    for (const [n, top] of counts) {
      if (n > 0) {
        d.img(v.cursor, cx, top);
        d.text(String(n), 735, top + 20);
      }
    }
    for (const [owned, top] of [[v.coalb, 321], [v.petrolr, 339], [v.gasb, 357], [v.nuc, 375],
      [v.nucx, 393], [v.jet, 411], [v.tractor, 429], [v.echarger, 483]]) {
      if (owned === 1) d.img(v.cursor, cx, top);
    }
    d.text(v.moneystr, 614, 64);
    d.img(v.ximgs[3], 69, 32);
  } else if (v.tab === 4) {
    // High scores, and the name being typed.
    d.img(v.shop, 0, 0);
    d.font(FONTS.labelfont);
    const list = v.highscores || [];
    const size = list.length;
    const y0 = 162;
    let yscroll = y0;
    let lowentry = size;
    const x0 = 273;
    if (size > 28) {
      yscroll = idiv(v.scroll * 390, size - 28) + y0;
      lowentry = 28;
    }
    d.color('rgb(44,14,12)');
    d.rect(759, yscroll, 15, 20);
    d.color(BLACK);
    d.outline(759, yscroll, 15, 15);
    for (let ix = v.scroll; ix < v.scroll + lowentry; ix++) {
      const sc = list[ix];
      if (!sc) continue;
      const y = 182 + (ix - v.scroll) * 14;
      d.text(String(ix + 1), x0, y);
      d.text(sc.name, x0 + 54, y);
      d.text(String(sc.score), x0 + 162, y);
      d.text(sc.date, x0 + 281, y);
      d.text(String(sc.days), x0 + 375, y);
    }
    d.font(FONTS.font20);
    d.color('rgb(250,60,60)');
    // etimr was stepped before this frame was drawn, as in the original.
    if (v.etimr % 50 < 25) d.text(v.score_name, 54, 86);
    else d.text(`${v.score_name}|`, 54, 86);
    d.text(v.scorestr, 539, 86);
  }

  if (v.leave) {
    // The departure-time dialog, with the base temperature at that hour.
    screenFade(d);
    d.img(v.leaveframe, 163, 111);
    d.font(FONTS.ultra24);
    d.color('rgb(200,70,0)');
    const mint = v.xminutes < 10 ? `0${v.xminutes}` : `${v.xminutes}`;
    d.text(`${v.xhours}:${mint}`, 356, 192);
    const hrs = v.xhours + v.xminutes / 60.0;
    const base11 = v.basex[v.baseidx];
    const temp1 = toInt((800.0 * Math.sin(0.83 * (hrs - base11 / 5000.0) + 4.5) + 400.0)
      * (-0.007 * v.posy + 1.0) - 2.0 * v.posy);
    d.text(String(temp1), 356, 319);
  }
}

// ---- The start page -------------------------------------------------------------------------

function startPage(d, v) {
  const rec = v.fxLast && v.fxLast.screen === 'start' ? v.fxLast : null;
  // The blink step as drawn: stepped, then wrapped at 30 after drawing.
  const timr1 = rec ? rec.timr1 : v.timr1;
  const cheatShown = rec ? rec.cheat === true : v.cheattimr > 0;
  d.img(v.stpage, 0, 1);
  d.img(v.box2, 250, 106);
  d.img(v.box2, 250, 131);
  d.img(v.box2, 250, 156);
  if (v.sely === 0) d.img(v.box1, 250, 106);
  else if (v.sely === 1) d.img(v.box1, 250, 131);
  else if (v.sely === 2) d.img(v.box1, 250, 156);
  else if (v.sely === 3) d.img(v.imgs[4], 270, 181);
  else if (v.sely === 4) d.img(v.imgs[5], 270, 206);
  else if (v.sely === 5) d.img(v.imgs[6], 270, 231);

  d.font(FONTS.arial13);
  d.color('rgb(158,122,92)');
  const caret = timr1 < 15 ? '|' : '';
  if (v.sely === 0) d.text(v.inputstr + caret, 272, 121);
  else if (v.sely === 1) d.text(v.inputstr + caret, 272, 146);
  else if (v.sely === 2) d.text(v.inputstr + caret, 272, 171);

  if (cheatShown) {
    d.font(FONTS.font20);
    d.color(timr1 % 10 < 5 ? RED : BLUE);
    d.text(v.msgstr, 496, 115);
  }

  if (!v.music) {
    d.img(v.cursor1, 345, 205);
    d.img(v.cursor, 472, 205);
  } else {
    d.img(v.cursor, 345, 205);
    d.img(v.cursor1, 472, 205);
  }
  if (!v.sounds) {
    d.img(v.cursor1, 345, 230);
    d.img(v.cursor, 472, 230);
  } else {
    d.img(v.cursor, 345, 230);
    d.img(v.cursor1, 472, 230);
  }
  d.img(v.cursor1, 345, 180);
  d.img(v.cursor1, 472, 180);
  d.img(v.cursor1, 607, 180);
  if (v.level === 1) d.img(v.cursor, 345, 180);
  else if (v.level === 2) d.img(v.cursor, 472, 180);
  else d.img(v.cursor, 607, 180);

  d.color('rgb(200,184,168)');
  d.font(FONTS.impact14);
  d.text('Created by Alexxz4. Summer 2009 Release.', 70, 93);
}
