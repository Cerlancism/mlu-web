// world: The map: new-map generation per difficulty (the eastern layers, hills, volcanoes, magma
// streams and the buried power weapons), clouds, the surface melting and refreezing with the clock,
// the camera scroll jumps and what they bring into view (magma popping, rocks turning to ice and
// back, ash clouds), magma flow, rockfall and earthquakes, explosions, teleports, ship weight, the
// background and sky colours, and the non-drawing part of redraw.
// Specification: docs/mlu2/specifications.md, World (6).

import { MAGMA, SPACE, HILLX, VOLCX, SHM, RCK, VOLC, CLOUD } from './data.js';
import { idiv, toInt, jround, random, rand } from './jmath.js';
import { loadImages, loadGameTiles, loadHull, loadDrill } from './sprites.js';
import { loadCheat } from './savefile.js';
import { enterBase } from './shop.js';
import { getUpgradeWeight } from './stats.js';
import { fieldStep } from './effects.js';
import { restart } from './state.js';

/** Starts a new game: generates the map for the chosen level and leaves the start page. */
export function genMap(s) {
  loadFields(s);
  loadCheat(s);
  s.menu = false;
  s.startpage = false;
  loadImages(s);
  loadGameTiles(s);
  loadHull(s);
  loadDrill(s);
  s.entrytimr = 1;
  s.trans = false;
  if (s.music) {
    s.sfx.musicStop();
    s.sfx.musicLoop('game_theme.mid');
  }

  if (s.sounds) {
    s.sfx.loop('wind');
    s.is_wind = true;
  }

  for (let i = 0; i < 5000; i++) {
    if (s.map[i][5] === SPACE) {
      s.map[i][5] = 0;
      s.mapmode[i][5] = toInt(random() * 6);
    }

    if (s.map[i][6] === SPACE) {
      s.map[i][6] = 0;
      s.mapmode[i][6] = toInt(random() * 6);
    }
  }

  let indx = 0;
  // Quirk: 30 slots for at most 20 base columns; the unused ones stay 0, so explos also restores
  // column 0 again.
  const nodig2 = new Array(30).fill(0);

  for (let bs = 0; bs < s.basex.length; bs++) {
    if (s.baseok[bs]) {
      for (let i = s.basex[bs] - 1; i < s.basex[bs] + 4; i++) {
        if (i >= 0 && i < 5000) {
          nodig2[indx] = i;
          indx++;
        }
      }
    }
  }

  s.nodig = nodig2;
  s.gameid = Math.trunc(Date.now() / 1000);
  setWeight(s);
  redraw(s);
}

/**
 * Fills the whole map for the chosen level: the random minerals and rocks, then the hand-shaped
 * regions from west to east, the eastern layers (load4000), the scattered bombs and the hidden
 * power weapons, and finally each tile's ground style.
 */
export function loadFields(s) {
  let n1 = 1600;
  if (s.level === 1) {
    n1 = 1500;
    s.money_factor = 15;
    s.score_factor = 5;
    s.saves = 50;
  } else if (s.level === 2) {
    n1 = 1550;
    s.money_factor = 12;
    s.score_factor = 7;
    s.saves = 30;
  } else if (s.level === 3) {
    n1 = 1600;
    s.money_factor = 10;
    s.score_factor = 10;
    s.saves = 20;
  }

  s.bonus = idiv(1000 * s.score_factor, 10);

  for (let j = 0; j < 100; j++) {
    for (let i = 0; i < 5000; i++) {
      let m = rand(n1);
      if (m > 0 && m < 20 && rand(j) < 50) {
        s.map[i][j] = 1;
      } else if (m > 20 && m < 40 && rand(j) < 60) {
        s.map[i][j] = 2;
      } else if (m > 40 && m < 59 && rand(j) < 70) {
        s.map[i][j] = 3;
      } else if (m > 60 && m < 78 && rand(j) < 80) {
        s.map[i][j] = 4;
      } else if (m > 80 && m < 98 && rand(j) < 100) {
        s.map[i][j] = 5;
      } else if (m > 100 && m < 118 && rand(j) < 100) {
        s.map[i][j] = 6;
      } else if (m > 120 && m < 137 && rand(j) < 150 && rand(j) > 10) {
        s.map[i][j] = 7;
      } else if (m > 140 && m < 157 && rand(j) < 180 && rand(j) > 20) {
        s.map[i][j] = 8;
      } else if (m > 160 && m < 177 && rand(j) < 250 && rand(j) > 40) {
        s.map[i][j] = 9;
      } else if (m > 180 && m < 196 && rand(j) < 300 && rand(j) > 70) {
        s.map[i][j] = 10;
      } else if (m > 200 && m < 216 && rand(j) < 350 && rand(j) > 80) {
        s.map[i][j] = 11;
      } else if (m > 220 && m < 236 && rand(j) < 280 && rand(j) > 90) {
        s.map[i][j] = 12;
      }

      if (m > 760 && m < 900) {
        s.map[i][j] = SPACE;
      }

      if (s.map[i][j] === 0 && j > 40) {
        if (rand(-0.117 * j + 14.7) < 1 && j > 40) {
          s.map[i][j] = 29;
        }

        if (rand(-0.25 * j + 30) < 1 && j > 60) {
          s.map[i][j] = 30;
        }
      }

      if (j < 5) {
        s.map[i][j] = SPACE;
      }
    }
  }

  for (let i = 0; i < 5000; i++) {
    s.map[i][5] = 0;
  }

  for (let i = 0; i < 5000; i++) {
    for (let j = 100; j < 102; j++) {
      s.map[i][j] = 30;
      s.mapmode[i][j] = toInt(random() * 6);
    }
  }

  for (let j = 20; j < 100; j++) {
    for (let i = 100; i < 150; i++) {
      let fact = (-1.6E-4 * i * i + 0.04 * i - 2.4) * (0.0125 * j - 0.25);
      if (random() < fact) {
        s.map[i][j] = 5;
      }
    }
  }

  for (let j = 40; j < 100; j++) {
    for (let i = 200; i < 400; i++) {
      let fact = (-1.0E-5 * i * i + 0.006 * i - 0.8) * (0.016 * j - 0.6);
      if (random() < fact) {
        s.map[i][j] = 11;
      }
    }
  }

  for (let j = 15; j < 40; j++) {
    for (let i = 400; i < 800; i++) {
      let fact = 1.5 * (-7.5E-6 * i * i + 0.009 * i - 2.1) * (0.016 * j + 0.36);
      if (random() < fact) {
        if (random() < 0.3) {
          s.map[i][j] = 30;
        } else {
          s.map[i][j] = 29;
        }
      }
    }
  }

  for (let j = 40; j < 100; j++) {
    for (let i = 400; i < 600; i++) {
      let fact = (-2.0E-5 * i * i + 0.02 * i - 4.8) * (0.01667 * j - 0.6667);
      if (random() < fact) {
        if (random() < 0.6) {
          s.map[i][j] = 9;
        } else {
          s.map[i][j] = 12;
        }
      }
    }
  }

  for (let i = 530; i < 690; i++) {
    s.map[i][5] = 75;
  }

  for (let i = 1000; i < 2000; i++) {
    for (let j = 60; j < 100; j++) {
      let fact = 0.5 * (-2.4E-7 * i * i + 7.2E-4 * i - 0.44) * (0.02 * j - 1);
      if (random() < fact) {
        s.map[i][j] = 28;
      }
    }
  }

  for (let j = 60; j < 100; j++) {
    for (let i = 1100; i < 1400; i++) {
      let fact = (-3.111E-6 * i * i + 0.007777 * i - 4.79) * (0.01 * j);
      let rnd = random();
      if (random() < fact) {
        if (rnd < 0.3) {
          s.map[i][j] = 13;
        } else if (rnd < 0.6) {
          s.map[i][j] = 14;
        } else if (rnd < 0.8) {
          s.map[i][j] = 15;
        } else if (rnd < 0.9) {
          s.map[i][j] = 16;
        }
      }
    }
  }

  for (let i = 1000; i < 1250; i++) {
    let limit = toInt(3.62 * Math.log(-999 + i) + 5);

    for (let j = 5; j < 30; j++) {
      if (j <= limit) {
        s.map[i][j] = 77;
      }
    }
  }

  for (let i = 1250; i < 1500; i++) {
    let limit = toInt(3.62 * Math.log(1501 - i) + 5);

    for (let j = 5; j < 30; j++) {
      if (j <= limit) {
        s.map[i][j] = 78;
      }
    }
  }

  for (let i = 1249; i <= 1251; i++) {
    for (let j = 25; j < 102; j++) {
      s.map[i][j] = 75;
    }
  }

  for (let i = 1500; i < 2100; i++) {
    for (let j = 10; j < 100; j++) {
      let fact = (-3.333E-6 * i * i + 0.012 * i - 10.5) * (0.005555 * j + 0.4444);
      if (random() < fact) {
        if (random() < 0.6) {
          s.map[i][j] = 29;
        } else {
          s.map[i][j] = 30;
        }
      }
    }
  }

  for (let i = 1600; i < 2000; i++) {
    for (let j = 60; j < 100; j++) {
      let fact = (-1.25E-6 * i * i + 0.0045 * i - 4) * (0.01667 * j - 0.6667);
      if (random() < fact) {
        s.map[i][j] = 18;
      }
    }
  }

  let streams = toInt(random() * 15 + 8);
  let divide = toInt(random() * streams);
  let space1 = idiv(400, streams + 1);
  const streampos = new Array(streams).fill(0);
  const streamdep = new Array(streams).fill(0);

  for (let i = 0; i < streampos.length; i++) {
    streampos[i] = 1600 + space1 * (i + 1) + toInt(random() * 8 - 4);
  }

  for (let j = 5; j < 102; j++) {
    for (let i = 1600; i <= 1601; i++) {
      s.map[i][j] = 75;
    }

    for (let i = 1997; i <= 1998; i++) {
      s.map[i][j] = 75;
    }
  }

  s.map[1599][5] = 77;
  s.map[1602][5] = 78;
  s.map[1996][5] = 77;
  s.map[1999][5] = 78;

  for (let i = 0; i < streams; i++) {
    streamdep[i] = toInt(random() * 30 + 30);
    let sx1 = streampos[i];

    for (let j = 5; j <= streamdep[i]; j++) {
      s.map[sx1][j] = 75;
    }
  }

  for (let i = 0; i < streams; i++) {
    let sx1 = streampos[i];
    let sdepth = streamdep[i];
    if (i < divide) {
      for (let x1 = sx1 - 1; x1 > 1600 && s.map[x1][sdepth] !== 75; x1--) {
        s.map[x1][sdepth] = 78;
      }
    } else {
      for (let x1 = sx1 + 1; x1 < 2000 && s.map[x1][sdepth] !== 75; x1++) {
        s.map[x1][sdepth] = 77;
      }
    }
  }

  for (let i = 2000; i < 3000; i++) {
    for (let j = 10; j < 100; j++) {
      let fact = 0.3 * (0.008889 * j + 0.1111);
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.5) {
          s.map[i][j] = 30;
        } else if (rnd < 0.7) {
          s.map[i][j] = 29;
        } else {
          s.map[i][j] = 31;
        }
      }
    }
  }

  for (let i = 2000; i < 3000; i++) {
    for (let j = 60; j < 100; j++) {
      let fact = (4.0E-5 * i - 0.02) * (0.0175 * j - 0.75);
      if (random() < fact) {
        s.map[i][j] = 28;
      }
    }
  }

  for (let i = 2000; i < 3000; i++) {
    for (let j = 50; j < 100; j++) {
      let fact = 0.05 * (0.014 * j - 0.4);
      if (random() < fact) {
        let rnd = random() * 100;
        if (rnd < 30) {
          s.map[i][j] = 13;
        } else if (rnd < 50) {
          s.map[i][j] = 14;
        } else if (rnd < 65) {
          s.map[i][j] = 15;
        } else if (rnd < 85) {
          s.map[i][j] = 16;
        } else if (rnd < 90) {
          s.map[i][j] = 17;
        } else if (rnd < 95) {
          s.map[i][j] = 18;
        } else {
          s.map[i][j] = 19;
        }
      }
    }
  }

  for (let i = 2100; i < 2900; i++) {
    for (let j = 60; j < 95; j++) {
      let fact = (-6.25E-8 * i * i + 3.125E-4 * i - 0.380625) * (0.0125 * j - 0.25);
      if (random() < fact) {
        let minr1 = toInt(random() * 14 + 9);

        for (let x1 = i - 3; x1 < i + 3; x1++) {
          for (let y1 = j - 3; y1 < j + 3; y1++) {
            // Quirk: always sets the centre tile, not x1, y1, so each cluster is one mineral.
            if (random() < 0.8) {
              s.map[i][j] = minr1;
            }
          }
        }
      }
    }
  }

  for (let i = 2100; i < 2800; i++) {
    for (let j = 55; j < 100; j++) {
      let fact = (-2.5E-7 * i * i + 0.001225 * i - 1.47) * (0.01555 * j - 0.555);
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.5) {
          s.map[i][j] = 20;
        } else if (rnd < 0.8) {
          s.map[i][j] = 21;
        } else {
          s.map[i][j] = 22;
        }
      }
    }
  }

  for (let i = 2498; i < 2502; i++) {
    for (let j = 50; j < 102; j++) {
      s.map[i][j] = 75;
    }
  }

  for (let i = 2200; i < 2800; i++) {
    let limit = toInt(-Math.sqrt(400 - 0.004444 * (-2500 + i) * (-2500 + i)) + 60);

    for (let j = 40; j < 60; j++) {
      if (j > limit) {
        s.map[i][j] = 75;
      }
    }

    limit = toInt(Math.sqrt(400 - 0.004444 * (-2500 + i) * (-2500 + i)) + 60);

    for (let j = 60; j < 80; j++) {
      if (j < limit) {
        s.map[i][j] = 75;
      }
    }
  }

  loadHill(s, 2020, 2600);
  loadHill(s, 2650, 2800);
  loadHill(s, 3640, 3995);
  loadHill(s, 4020, 4983);

  for (let j = 15; j < 100; j++) {
    let fact = 0.35 * (0.007 * j + 0.29);

    for (let i = 3000; i < 3600; i++) {
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.2) {
          s.map[i][j] = 29;
        } else if (rnd < 0.7) {
          s.map[i][j] = 30;
        }
      }
    }
  }

  for (let j = 6; j < 60; j++) {
    let fact = 0.3 * (-0.012 * j + 1.07);

    for (let i = 3000; i < 3600; i++) {
      if (random() < fact) {
        if (random() < 0.2) {
          s.map[i][j] = MAGMA;
        } else {
          s.map[i][j] = 31;
        }
      }
    }
  }

  for (let i = 3000; i < 4000; i++) {
    for (let j = 40; j < 60; j++) {
      let fact = 0.1 * (0.01333 * j - 0.3333);
      if (random() < fact) {
        s.map[i][j] = 28;
      }
    }
  }

  for (let i = 3000; i < 3600; i++) {
    for (let j = 60; j < 100; j++) {
      let fact = 0.03 * (0.02 * j - 1);
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.3) {
          s.map[i][j] = 17;
        } else if (rnd < 0.6) {
          s.map[i][j] = 18;
        } else if (rnd < 0.8) {
          s.map[i][j] = 19;
        } else if (rnd < 0.87) {
          s.map[i][j] = 23;
        } else if (rnd < 0.92) {
          s.map[i][j] = 24;
        } else if (rnd < 0.96) {
          s.map[i][j] = 25;
        } else if (rnd < 0.99) {
          s.map[i][j] = 26;
        } else {
          s.map[i][j] = 27;
        }
      }
    }
  }

  for (let i = 3000; i < 3600; i++) {
    for (let j = 70; j < 100; j++) {
      let fact = 0.02 * (0.02 * j - 1);
      if (random() < fact) {
        if (random() < 0.6) {
          s.map[i][j] = 21;
        } else {
          s.map[i][j] = 22;
        }
      }
    }
  }

  for (let i = 3050; i < 3600; i++) {
    let lev1 = toInt(6.6667E-5 * i * i - 0.4433 * i + 767);
    let lev2 = toInt(-6.6667E-5 * i * i + 0.4433 * i - 667);

    for (let j = lev1; j <= lev2; j++) {
      s.map[i][j] = MAGMA;
    }
  }

  for (let i = 3060; i < 3580; i += toInt(random() * 20 + 20)) {
    loadVolcano(s, i);

    for (let j = 5; j < 102; j++) {
      s.map[i][j] = 75;
    }
  }

  for (let j = 15; j < 100; j++) {
    let fact = 0.35 * (0.007 * j + 0.29);

    for (let i = 3600; i < 4000; i++) {
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.2) {
          s.map[i][j] = 29;
        } else if (rnd < 0.7) {
          s.map[i][j] = 30;
        }
      }
    }
  }

  for (let j = 6; j < 60; j++) {
    let fact = 0.3 * (-0.012 * j + 1.07);

    for (let i = 3600; i < 4000; i++) {
      if (random() < fact) {
        if (random() < 0.4) {
          s.map[i][j] = MAGMA;
        } else {
          s.map[i][j] = 31;
        }
      }
    }
  }

  for (let i = 3600; i < 4000; i++) {
    for (let j = 30; j < 100; j++) {
      let fact = 0.15 * (-1.3333E-7 * i * i + 9.8667E-4 * i - 1.74) * (0.0114 * j - 0.14);
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.5) {
          s.map[i][j] = 51;
        } else if (rnd < 0.8) {
          s.map[i][j] = 52;
        } else {
          s.map[i][j] = 53;
        }
      }
    }
  }

  let num1 = toInt(random() * 40 + 80);

  for (let p = 0; p < num1; p++) {
    let posx1 = toInt(random() * 400 + 3600);
    let posy1 = toInt(random() * 80 + 20);
    let rad1 = toInt(random() * 5 + 3);
    if (posy1 + 2 * rad1 > 99) {
      posy1 -= 2 * rad1;
    }

    for (let i = -rad1; i <= rad1; i++) {
      for (let j = -rad1; j <= rad1; j++) {
        if (Math.sqrt(i * i + j * j) <= rad1) {
          s.map[i + posx1][j + posy1] = MAGMA;
        }
      }
    }
  }

  load4000(s);
  let num = toInt(random() * 15 + 30);

  for (let i = 0; i < num; i++) {
    let posx1 = toInt(random() * 5000);
    let posy1 = toInt(random() * 15 + 85);
    if (s.map[posx1][posy1] < 75 || s.map[posx1][posy1] > 79) {
      s.map[posx1][posy1] = 55;
    }
  }

  num = toInt(random() * 30 + 30);

  for (let i = 0; i < num; i++) {
    let posx1 = toInt(random() * 5000);
    let posy1 = toInt(random() * 70 + 30);
    if (s.map[posx1][posy1] < 75 || s.map[posx1][posy1] > 79) {
      s.map[posx1][posy1] = 54;
    }
  }

  let sbx = new Array(5).fill(0);
  let sby = new Array(5).fill(0);

  for (let i = 0; i < 5; i++) {
    sbx[i] = toInt(random() * 1000 + 2000);
    sby[i] = toInt(random() * 40 + 60);
    let b1 = true;

    while (b1) {
      b1 = false;

      // Quirk: the first bomb is never checked for magma.
      for (let j = 0; j < i; j++) {
        if (sbx[j] === sbx[i] || s.map[sbx[i]][sby[i]] >= 75) {
          b1 = true;
          sbx[i] = toInt(random() * 1000 + 2000);
          sby[i] = toInt(random() * 40 + 60);
          break;
        }
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    s.map[sbx[i]][sby[i]] = 42 + i;
  }

  let weap1 = 5;
  const arr11 = new Array(weap1).fill(0);
  const arr12 = new Array(weap1).fill(0);
  sbx = arr11;
  sby = arr12;

  for (let i = 0; i < weap1; i++) {
    sbx[i] = toInt(random() * 450 + 3070);
    sby[i] = toInt(random() * 24 + 75);
    let b1 = true;

    while (b1) {
      b1 = false;

      // Quirk: the first weapon is never checked for magma, and a retry draws rows 60 to 99
      // instead of 75 to 98.
      for (let j = 0; j < i; j++) {
        if (sbx[j] === sbx[i] || s.map[sbx[i]][sby[i]] >= 75) {
          b1 = true;
          sbx[i] = toInt(random() * 450 + 3070);
          sby[i] = toInt(random() * 40 + 60);
          break;
        }
      }
    }
  }

  for (let i = 0; i < weap1; i++) {
    s.map[sbx[i]][sby[i]] = i + 56;
    if (i === 3) {
      s.map[sbx[i]][sby[i]] = 61;
    }
  }

  for (let i = 0; i < 5000; i++) {
    for (let j = 0; j < 102; j++) {
      if (s.map[i][j] === 33) {
        s.mapmode[i][j] = 5;
      } else if (s.map[i][j] < 75) {
        s.mapmode[i][j] = toInt(random() * 6);
      } else if (s.map[i][j] >= 75 && s.map[i][j] <= 79) {
        s.mapmode[i][j] = MAGMA;
      }
    }
  }
}

/** Generates the easternmost thousand columns (4000 to 4999) and their hills. */
export function load4000(s) {
  let dept = 100;
  let n1 = 1600;
  if (s.level === 1) {
    n1 = 1500;
    s.money_factor = 15;
    s.score_factor = 5;
  } else if (s.level === 2) {
    n1 = 1550;
    s.money_factor = 12;
    s.score_factor = 7;
  } else if (s.level === 3) {
    n1 = 1600;
    s.money_factor = 10;
    s.score_factor = 10;
  }

  for (let j = 0; j < dept; j++) {
    for (let i = 4000; i < 5000; i++) {
      let m = rand(n1);
      s.map[i][j] = 0;
      s.mapmode[i][j] = toInt(random() * 6);
      if (m > 0 && m < 20 && rand(j) < 50) {
        s.map[i][j] = 1;
      } else if (m > 20 && m < 40 && rand(j) < 60) {
        s.map[i][j] = 2;
      } else if (m > 40 && m < 59 && rand(j) < 70) {
        s.map[i][j] = 3;
      } else if (m > 60 && m < 78 && rand(j) < 80) {
        s.map[i][j] = 4;
      } else if (m > 80 && m < 98 && rand(j) < 100) {
        s.map[i][j] = 5;
      } else if (m > 100 && m < 118 && rand(j) < 100) {
        s.map[i][j] = 6;
      } else if (m > 120 && m < 137 && rand(j) < 150 && rand(j) > 10) {
        s.map[i][j] = 7;
      } else if (m > 140 && m < 157 && rand(j) < 180 && rand(j) > 20) {
        s.map[i][j] = 8;
      } else if (m > 160 && m < 177 && rand(j) < 250 && rand(j) > 40) {
        s.map[i][j] = 9;
      } else if (m > 180 && m < 196 && rand(j) < 300 && rand(j) > 70) {
        s.map[i][j] = 10;
      } else if (m > 200 && m < 216 && rand(j) < 350 && rand(j) > 80) {
        s.map[i][j] = 11;
      } else if (m > 220 && m < 236 && rand(j) < 280 && rand(j) > 90) {
        s.map[i][j] = 12;
      }

      if (m > 760 && m < 900) {
        s.map[i][j] = SPACE;
      }

      if (s.map[i][j] === 0 && j > 40) {
        if (rand(-0.117 * j + 14.7) < 1 && j > 40) {
          s.map[i][j] = 29;
        }

        if (rand(-0.25 * j + 30) < 1 && j > 60) {
          s.map[i][j] = 30;
        }
      }

      if (j < 5) {
        s.map[i][j] = SPACE;
      }
    }
  }

  for (let i = 4000; i < 5000; i++) {
    s.map[i][5] = 0;
  }

  loadHill(s, 3640, 3995);
  loadHill(s, 4020, 4983);

  for (let i = 4024; i < 4980; i++) {
    for (let j = 0; j < 5; j++) {
      s.map[i][j] = 0;
      s.mapmode[i][j] = toInt(random() * 6);
    }
  }

  for (let i = 4000; i < 5000; i++) {
    for (let j = 6; j < 100; j++) {
      let fact = 0.00421 * j + 0.078;
      if (random() < fact) {
        if (random() < 0.25) {
          s.map[i][j] = 29;
        } else {
          s.map[i][j] = 30;
        }
      }
    }
  }

  for (let i = 4000; i < 5000; i++) {
    for (let j = 10; j < 100; j++) {
      let fact = -5.555E-4 * j + 0.05555;
      if (random() < fact) {
        s.map[i][j] = 28;
      }
    }
  }

  for (let j = 6; j < 25; j++) {
    let fact = -0.015 * j + 0.675;

    for (let i = 4000; i < 5000; i++) {
      if (random() < fact) {
        if (random() < 0.4) {
          s.map[i][j] = MAGMA;
          s.mapmode[i][j] = MAGMA;
        } else {
          s.map[i][j] = 31;
        }
      }
    }
  }

  for (let j = 45; j < 100; j++) {
    let fact = 0.5 * (1.818E-4 * j - 0.00818);

    for (let i = 4000; i < 5000; i++) {
      if (random() < fact) {
        if (random() < 0.6) {
          s.map[i][j] = 21;
        } else {
          s.map[i][j] = 22;
        }

        s.mapmode[i][j] = toInt(random() * 6);
      }
    }
  }

  for (let j = 15; j < 100; j++) {
    let fact = 0.5 * (0.001176 * j + 0.0823);

    for (let i = 4000; i < 5000; i++) {
      if (random() < fact) {
        s.mapmode[i][j] = toInt(random() * 6);
        s.map[i][j] = 33;
      }
    }
  }

  for (let j = 65; j < 100; j++) {
    let fact = 1.5 * (2.857E-4 * j - 0.01857);

    for (let i = 4000; i < 5000; i++) {
      if (random() < fact) {
        s.mapmode[i][j] = toInt(random() * 6);
        s.map[i][j] = 50;
      }
    }
  }

  for (let i = 4650; i < 4850; i++) {
    for (let j = 5; j < 100; j++) {
      if (i > 0.02367 * j * j - 2.462 * j + 4713.9 && i < -0.02367 * j * j + 2.462 * j + 4736) {
        s.map[i][j] = MAGMA;
        s.mapmode[i][j] = MAGMA;
      }
    }
  }

  for (let i = 4100; i < 4300; i++) {
    for (let j = 0; j < 40; j++) {
      if (j < -0.004 * i * i + 33.6 * i - 70520 && random() < -5.0E-5 * i * i + 0.42 * i - 881) {
        s.map[i][j] = 33;
        s.mapmode[i][j] = 5;
      }
    }
  }

  for (let i = 4400; i < 4550; i++) {
    for (let j = 60; j < 100; j++) {
      if (j > 0.008 * i * i - 71.6 * i + 160260 && random() < -8.0E-5 * i * i + 0.716 * i - 1601) {
        s.map[i][j] = 33;
        s.mapmode[i][j] = 5;
      }
    }
  }

  for (let i = 0; i < 500; i++) {
    let type1 = toInt(random() * 3);
    let length1 = toInt(random() * 10 + 15);
    let x1 = toInt(random() * 980 + 4000);
    let y1 = toInt(random() * 99 + 1);
    if (type1 === 2 && random() < 0.5) {
      type1 = 3;
    }

    if (y1 >= 5 || x1 >= 4030 && x1 <= 4945) {
      if (type1 < 2 && y1 + length1 >= 100) {
        y1 -= length1;
      } else if (type1 >= 2 && x1 + length1 >= 4999) {
        x1 -= length1;
      }

      if (type1 < 2) {
        for (let j = y1; j < y1 + length1 - 2; j++) {
          s.map[x1][j] = type1 + 75;
          s.mapmode[x1][j] = MAGMA;
        }
      } else {
        for (let j = x1; j < x1 + length1 - 2; j++) {
          s.map[j][y1] = type1 + 75;
          s.mapmode[j][y1] = MAGMA;
        }
      }
    }
  }

  let rad = 20;

  for (let i = -rad; i < rad; i++) {
    for (let j = -rad; j < rad; j++) {
      let x1x = i + 4978;
      let y1x = j + 72;
      if (s.mapmode[x1x][y1x] === MAGMA) {
        let rand1 = random();
        if (rand1 < 0.3) {
          s.map[x1x][y1x] = 30;
        } else if (rand1 < 0.5) {
          s.map[x1x][y1x] = 33;
        } else {
          s.map[x1x][y1x] = 0;
        }
      }

      if (Math.sqrt(i * i + j * j) <= rad && random() > 0.8) {
        s.map[x1x][y1x] = 34;
      }

      s.mapmode[x1x][y1x] = toInt(random() * 6);
    }
  }

}

/** Spreads the clouds along the sky with random heights and sizes. */
export function loadClouds(s) {
  let vstep = toInt(random() * 170);

  for (let i = 0; i < CLOUD; i++) {
    s.cloudx[i] = vstep;
    s.cloudy[i] = toInt(-80 + random() * 100);
    vstep += toInt(random() * 100 + 200);
    s.cloudscale[i] = toInt(random() * 100 + 250);
  }
}

/**
 * On leaving a base or loading a save: refreezes the open surface, then melts the stretch that
 * the current time of day has melted.
 */
export function loadSurface(s) {
  let lminutes = s.hours * 60 + s.minutes + idiv(60 * s.iposx, 5000);
  let startx1 = s.iposx - idiv((lminutes - 180) * 5000, 60);
  let endx1 = startx1 + 10000;
  if (startx1 < 0) {
    startx1 = 0;
  }

  if (startx1 > 5000) {
    startx1 = 5000;
  }

  if (endx1 < 0) {
    endx1 = 0;
  }

  if (endx1 > 5000) {
    endx1 = 5000;
  }

  for (let i = 0; i < 5000; i++) {
    if (s.map[i][4] === SPACE) {
      if (s.map[i][5] < 75 || s.map[i][5] > 78) {
        s.map[i][5] = 0;
        s.mapmode[i][5] = toInt(random() * 6);
      }

      if (s.map[i][6] === SPACE) {
        s.map[i][6] = 0;
        s.mapmode[i][6] = toInt(random() * 6);
      }
    }
  }

  for (let i = startx1; i < endx1; i++) {
    if (s.map[i][4] === SPACE && s.mapmode[i][5] !== MAGMA) {
      s.map[i][5] = MAGMA;
      s.mapmode[i][5] = MAGMA;
    }
  }
}

/** Places the pod deep underground with a strong kit. Never called in the original. */
export function deepPlace(s) {
  s.dyn = 10;
  s.shield = 20;
  s.transc = 15;
  s.drill = 10000;
  s.drillmax = 10000;
  s.hullmax = 2000;
  s.mode = 1;
  s.iposx = jround(s.posx);
  s.iposy = jround(s.posy);
  s.framex = idiv(s.iposx, 3) * 3 - 3;
  if (s.framex < 0) {
    s.framex = 0;
  }

  s.framey = idiv(s.iposy, 3) * 3 - 6;
  if (s.framey < 0) {
    s.framey = 0;
  }

  s.digx = (s.iposx - s.framex) * 50 - 10;
  s.digy = (s.iposy - s.framey) * 50 + 50;
  s.map[s.iposx][s.iposy] = SPACE;
}

/** Turns on the ash clouds: marks the open surface and volcanoes on screen as ash columns. */
export function loadAsh(s) {
  s.ashon = true;

  for (let i = s.framex; i < s.framex + 16; i++) {
    if (s.map[i][4] !== 80 || (s.map[i][5] < 75 || s.map[i][5] > 78) && s.map[i][4] !== 70) {
      if (s.map[i][4] === 70) {
        s.map[i][2] = 81;
      }
    } else {
      s.map[i][4] = 81;
    }
  }

  redraw(s);
}

/** Places a volcano at a column, with its magma vent and the hill tiles either side. */
export function loadVolcano(s, pos1) {
  s.map[pos1][4] = 70;
  s.mapmode[pos1][4] = VOLCX;
  s.map[pos1][3] = MAGMA;
  s.mapmode[pos1][3] = MAGMA;
  s.map[pos1 - 1][4] = 73;
  s.mapmode[pos1 - 1][4] = HILLX;
  s.map[pos1 - 1][3] = 73;
  s.mapmode[pos1 - 1][3] = HILLX;
  s.map[pos1 + 1][4] = 73;
  s.mapmode[pos1 + 1][4] = HILLX;
  s.map[pos1 + 1][3] = 73;
  s.mapmode[pos1 + 1][3] = HILLX;
}

/** Builds a hill from column start to column end: sloped edges and a flat top five rows deep. */
export function loadHill(s, start, end) {
  for (let i = start; i < start + 4; i++) {
    s.map[i][4] = 73;
    s.mapmode[i][4] = HILLX;
  }

  for (let i = start + 1; i < start + 4; i++) {
    s.map[i][3] = 73;
    s.mapmode[i][3] = HILLX;
  }

  for (let i = start + 2; i < start + 4; i++) {
    s.map[i][2] = 73;
    s.mapmode[i][2] = HILLX;
  }

  for (let i = start + 3; i < start + 4; i++) {
    s.map[i][1] = 73;
    s.mapmode[i][1] = HILLX;
  }

  for (let i = start + 3; i < start + 4; i++) {
    s.map[i][0] = 73;
    s.mapmode[i][0] = HILLX;
  }

  for (let i = start + 4; i < end - 3; i++) {
    for (let j = 0; j < 5; j++) {
      s.map[i][j] = 74;
      s.mapmode[i][j] = HILLX;
    }
  }

  for (let i = end - 3; i < end; i++) {
    s.map[i][4] = 73;
    s.mapmode[i][4] = HILLX;
  }

  for (let i = end - 3; i < end; i++) {
    s.map[i][3] = 73;
    s.mapmode[i][3] = HILLX;
  }

  for (let i = end - 3; i < end - 1; i++) {
    s.map[i][2] = 73;
    s.mapmode[i][2] = HILLX;
  }

  for (let i = end - 3; i < end - 2; i++) {
    s.map[i][1] = 73;
    s.mapmode[i][1] = HILLX;
  }

  for (let i = end - 3; i < end - 2; i++) {
    s.map[i][0] = 73;
    s.mapmode[i][0] = HILLX;
  }

  s.map[start][4] = 71;
  s.map[end][4] = 72;
  s.mapmode[start][4] = HILLX;
  s.mapmode[end][4] = HILLX;
}

/** Picks the tank columns in the east (4010 to 4509). Never called in the original. */
export function layer2(s) {
  let num1 = toInt(random() * 20 + 50);
  const tankarr1 = new Array(num1).fill(0);

  for (let i = 0; i < num1; i++) {
    tankarr1[i] = toInt(random() * 500 + 4010);
  }

  s.tankarr = tankarr1;
}

/** Regenerates columns 3600 to 3999. Never called in the original. */
export function layer1(s) {
  let dept = 100;
  let n1 = 1600;
  const sbx = new Array(5).fill(0);
  const sby = new Array(5).fill(0);
  if (s.level === 1) {
    n1 = 1500;
    s.money_factor = 15;
    s.score_factor = 5;
  } else if (s.level === 2) {
    n1 = 1550;
    s.money_factor = 12;
    s.score_factor = 7;
  } else if (s.level === 3) {
    n1 = 1600;
    s.money_factor = 10;
    s.score_factor = 10;
  }

  for (let j = 0; j < dept; j++) {
    for (let i = 3600; i < 4000; i++) {
      let m = rand(n1);
      s.map[i][j] = 0;
      s.mapmode[i][j] = toInt(random() * 6);
      if (m > 0 && m < 20 && rand(j) < 50) {
        s.map[i][j] = 1;
      } else if (m > 20 && m < 40 && rand(j) < 60) {
        s.map[i][j] = 2;
      } else if (m > 40 && m < 59 && rand(j) < 70) {
        s.map[i][j] = 3;
      } else if (m > 60 && m < 78 && rand(j) < 80) {
        s.map[i][j] = 4;
      } else if (m > 80 && m < 98 && rand(j) < 100) {
        s.map[i][j] = 5;
      } else if (m > 100 && m < 118 && rand(j) < 100) {
        s.map[i][j] = 6;
      } else if (m > 120 && m < 137 && rand(j) < 150 && rand(j) > 10) {
        s.map[i][j] = 7;
      } else if (m > 140 && m < 157 && rand(j) < 180 && rand(j) > 20) {
        s.map[i][j] = 8;
      } else if (m > 160 && m < 177 && rand(j) < 250 && rand(j) > 40) {
        s.map[i][j] = 9;
      } else if (m > 180 && m < 196 && rand(j) < 300 && rand(j) > 70) {
        s.map[i][j] = 10;
      } else if (m > 200 && m < 216 && rand(j) < 350 && rand(j) > 80) {
        s.map[i][j] = 11;
      } else if (m > 220 && m < 236 && rand(j) < 280 && rand(j) > 90) {
        s.map[i][j] = 12;
      }

      if (m > 760 && m < 900) {
        s.map[i][j] = SPACE;
      }

      if (s.map[i][j] === 0 && j > 40) {
        if (rand(-0.117 * j + 14.7) < 1 && j > 40) {
          s.map[i][j] = 29;
        }

        if (rand(-0.25 * j + 30) < 1 && j > 60) {
          s.map[i][j] = 30;
        }
      }

      if (j < 5) {
        s.map[i][j] = SPACE;
      }
    }
  }

  for (let i = 3600; i < 4000; i++) {
    s.map[i][5] = 0;
  }

  for (let j = 15; j < 100; j++) {
    let fact = 0.35 * (0.007 * j + 0.29);

    for (let i = 3600; i < 4000; i++) {
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.2) {
          s.map[i][j] = 29;
        } else if (rnd < 0.7) {
          s.map[i][j] = 30;
        }
      }
    }
  }

  for (let j = 6; j < 60; j++) {
    let fact = 0.3 * (-0.012 * j + 1.07);

    for (let i = 3600; i < 4000; i++) {
      if (random() < fact) {
        if (random() < 0.4) {
          s.map[i][j] = MAGMA;
          s.mapmode[i][j] = MAGMA;
        } else {
          s.map[i][j] = 31;
        }
      }
    }
  }

  for (let i = 3600; i < 4000; i++) {
    for (let j = 30; j < 100; j++) {
      let fact = 0.15 * (-1.3333E-7 * i * i + 9.8667E-4 * i - 1.74) * (0.0114 * j - 0.14);
      if (random() < fact) {
        let rnd = random();
        if (rnd < 0.5) {
          s.map[i][j] = 51;
        } else if (rnd < 0.8) {
          s.map[i][j] = 52;
        } else {
          s.map[i][j] = 53;
        }
      }
    }
  }

  let num1 = toInt(random() * 40 + 80);

  for (let p = 0; p < num1; p++) {
    let posx1 = toInt(random() * 800 + 3600);
    let posy1 = toInt(random() * 80 + 20);
    let rad1 = toInt(random() * 5 + 3);
    if (posy1 + 2 * rad1 > 99) {
      posy1 -= 2 * rad1;
    }

    for (let i = -rad1; i <= rad1; i++) {
      for (let j = -rad1; j <= rad1; j++) {
        if (Math.sqrt(i * i + j * j) <= rad1) {
          s.map[i + posx1][j + posy1] = MAGMA;
          s.mapmode[i + posx1][j + posy1] = MAGMA;
        }
      }
    }
  }

  loadHill(s, 3640, 3995);
}

/** Melts 500 columns of open surface from a column into magma (the hot hours). */
export function meltSurface(s, pos1) {
  let start1 = jround(pos1);

  for (let i = start1; i < start1 + 500; i++) {
    if (s.map[i][4] === SPACE && (s.map[i][5] < 75 || s.map[i][5] > 78)) {
      s.map[i][5] = MAGMA;
      s.mapmode[i][5] = MAGMA;
    }

    if (s.map[i][6] === SPACE && s.map[i][5] === MAGMA && s.map[i][4] === SPACE) {
      s.map[i][6] = 0;
      s.mapmode[i][6] = toInt(random() * 6);
    }
  }

  if (s.framey < 6) {
    redraw(s);
  }
}

/** Refreezes 500 columns of surface magma from a column back into ground (the cold hours). */
export function freezeSurface(s, pos1) {
  let start1 = jround(pos1);

  for (let i = start1; i < start1 + 500; i++) {
    if (s.map[i][5] === MAGMA && s.map[i][4] === SPACE) {
      s.map[i][5] = 0;
      s.mapmode[i][5] = toInt(random() * 6);
    }
  }

  if (s.framey < 6) {
    redraw(s);
  }
}

/**
 * Scrolls the camera sideways by num pixels (a jump of columns): moves everything drawn in
 * screen coordinates, scrolls the sky, turns rocks to ice or back in the columns coming into
 * view, pops magma ahead, freezes magma in deep cold, then refreshes ash, magma and the field.
 */
export function shiftx(s, num) {
  s.digx += num;
  s.rdr = false;
  s.labl1x += num;
  s.labl2x += num;
  s.explx += num;

  for (let i = 0; i < SHM; i++) {
    s.grx[i] = s.grx[i] + num;
  }

  for (let i = 0; i < RCK; i++) {
    s.rockx[i] = s.rockx[i] + num;
  }

  for (let i = 0; i < s.bullets.length; i++) {
    s.bullets[i].x += num;
  }

  s.ibombx += num;
  s.sbombx += num;
  s.nucbx += num;
  s.rbombx += num;
  s.skyx1 += idiv(num, 5);
  if (num > 0 && s.skyx1 > 0) {
    s.skyx1 = -900 + idiv(num, 5);
  } else if (num < 0 && s.skyx1 < -900) {
    s.skyx1 = idiv(num, 5);
  }

  for (let i = 0; i < VOLC; i++) {
    s.volcanox[i] = s.volcanox[i] + idiv(num, 50);
  }

  for (let i = 0; i < CLOUD; i++) {
    s.cloudx[i] = s.cloudx[i] + idiv(num, 110);
  }

  if (s.iposx > s.xmax) {
    s.xmax = s.iposx;
  }

  if (s.iposx % 15 === 0) {
    s.skyx2 = s.skyx2 + idiv(num, Math.abs(num));
  }

  let minr1 = -1;
  let minr2 = -1;
  let fact = -1;
  if (s.temp > 300) {
    minr1 = 30;
    minr2 = 31;
    fact = 6.667E-4 * s.temp - 0.1;
  } else if (s.temp < -100) {
    minr1 = 31;
    minr2 = 30;
    fact = -0.002667 * s.temp - 0.0667;
  }

  if (minr1 !== -1 && s.iposx < 3000) {
    if (num > 0) {
      for (let i = s.framex; i < s.framex + 3; i++) {
        for (let j = s.framey; j < s.framey + 12; j++) {
          if (j < 102 && s.map[i][j] === minr1 && random() < fact) {
            s.map[i][j] = minr2;
          }
        }
      }
    } else {
      for (let i = s.framex + 13; i < s.framex + 16; i++) {
        for (let j = s.framey; j < s.framey + 12; j++) {
          if (j < 102 && i < 5000 && s.map[i][j] === minr1 && random() < fact) {
            s.map[i][j] = minr2;
          }
        }
      }
    }
  }

  if (num > 0) {
    popMagma(s, 'left');
  } else {
    popMagma(s, 'right');
  }

  if (s.temp < -200 && s.posx < 3000) {
    for (let i = s.framex - 20; i < s.framex + 36; i++) {
      for (let j = s.framey; j < s.framey + 12; j++) {
        if (i >= 0 && i < 5000 && j < 100 && s.map[i][j] === MAGMA && (i !== s.iposx || j !== s.iposy)) {
          s.map[i][j] = 0;
          s.mapmode[i][j] = toInt(random() * 6);
        }
      }
    }
  }

  if (s.posx > 5000) {
    let msg1 = 'Thank you for playing this betta version of MLU2: Crematoria.\nPlease check http://mlu.aceboard.com for info about new version.';
    s.ui.alert('MLU2', msg1, true);
    // Fix: the original quit the program here. A page cannot quit, so the game goes back to the
    // start page instead and the rest of the scroll is skipped.
    s.menu = true;
    s.startpage = true;
    restart(s);
    return;
  }

  if (s.ashon) {
    loadAsh(s);
  } else {
    for (let i = s.framex; i < s.framex + 16; i++) {
      if (s.map[i][4] === 81) {
        s.map[i][4] = 80;
      }

      if (s.map[i][2] === 81) {
        s.map[i][2] = 80;
      }
    }
  }

  checkMagma(s);
  backColor(s, s.temp);
  redraw(s);
}

/**
 * Scrolls the camera up or down by num pixels (a jump of rows), with the same follow-up as
 * shiftx, and starts or stops the surface wind sound.
 */
export function shifty(s, num) {
  s.digy += num;
  s.ibomby += num;
  s.sbomby += num;
  s.nucby += num;
  s.rbomby += num;
  s.labl1y += num;
  s.labl2y += num;
  s.exply += num;

  for (let i = 0; i < SHM; i++) {
    s.gry[i] = s.gry[i] + num;
  }

  for (let i = 0; i < RCK; i++) {
    s.rocky[i] = s.rocky[i] + num;
  }

  for (let i = 0; i < s.bullets.length; i++) {
    s.bullets[i].y += num;
  }

  let minr1 = -1;
  let minr2 = -1;
  let fact = -1;
  if (s.temp > 300) {
    minr1 = 30;
    minr2 = 31;
    fact = 6.667E-4 * s.temp - 0.1;
  } else if (s.temp < -100) {
    minr1 = 31;
    minr2 = 30;
    fact = -0.002667 * s.temp - 0.0667;
  }

  if (minr1 !== -1 && s.iposx < 3000) {
    if (num < 0) {
      for (let i = s.framex; i < s.framex + 16; i++) {
        for (let j = s.framey; j < s.framey + 3; j++) {
          if (j < 100 && s.map[i][j] === minr1 && random() < fact) {
            s.map[i][j] = minr2;
          }
        }
      }
    } else if (num > 0) {
      for (let i = s.framex; i < s.framex + 16; i++) {
        for (let j = s.framey + 9; j < s.framey + 12; j++) {
          if (j >= 0 && s.map[i][j] === minr1 && random() < fact) {
            s.map[i][j] = minr2;
          }
        }
      }
    }
  }

  if (num < 0) {
    popMagma(s, 'down');
  } else {
    popMagma(s, 'up');
  }

  if (s.temp < -200 && s.posx < 3000) {
    for (let i = s.framex - 20; i < s.framex + 36; i++) {
      for (let j = s.framey; j < s.framey + 12; j++) {
        if (i >= 0 && i < 5000 && j < 100 && j >= 0 && s.map[i][j] === MAGMA && (i !== s.iposx || j !== s.iposy)) {
          s.map[i][j] = 0;
          s.mapmode[i][j] = toInt(random() * 6);
        }
      }
    }
  }

  checkMagma(s);
  backColor(s, s.temp);
  redraw(s);
  if (s.sounds) {
    if (num < 0 && s.posy > 10 && s.is_wind) {
      s.sfx.stop('wind');
      s.is_wind = false;
    } else if (num > 0 && s.posy <= 10 && !s.is_wind) {
      s.sfx.loop('wind');
      s.is_wind = true;
    }
  }
}

/**
 * Pops magma bubbles in the band just off screen in the scroll direction: normally magma
 * pockets enclosed by solid ground open into empty space; above 500 degrees empty pockets fill
 * with magma instead. Not between columns 3000 and 3600.
 */
export function popMagma(s, dir) {
  if (s.iposx <= 3000 || s.iposx >= 3600) {
    let minr1 = MAGMA;
    let minr2 = SPACE;
    let mpmode = 0;
    if (s.temp > 500) {
      minr1 = SPACE;
      minr2 = MAGMA;
      mpmode = MAGMA;
    }

    let fact = -0.0014 * s.temp + 0.714;
    if (s.temp > 500) {
      fact = 0.001 * s.temp - 0.4;
    }

    if (dir === 'up') {
      for (let i = s.framex + 1; i < s.framex + 15; i++) {
        for (let j = s.framey - 16; j < s.framey; j++) {
          if (j > 0
            && s.map[i][j] === minr1
            && s.map[i - 1][j] < 75
            && s.map[i][j - 1] < 75
            && s.map[i + 1][j] < 75
            && s.map[i][j + 1] < 75
            && random() < fact) {
            s.map[i][j] = minr2;
            s.mapmode[i][j] = mpmode;
          }
        }
      }
    } else if (dir === 'down') {
      for (let i = s.framex + 1; i < s.framex + 15; i++) {
        for (let j = s.framey + 16; j < s.framey + 31; j++) {
          if (j < 100
            && s.map[i][j] === minr1
            && s.map[i - 1][j] < 75
            && s.map[i][j - 1] < 75
            && s.map[i + 1][j] < 75
            && s.map[i][j + 1] < 75
            && random() < fact) {
            s.map[i][j] = minr2;
            s.mapmode[i][j] = mpmode;
          }
        }
      }
    } else if (dir === 'left') {
      for (let i = s.framex - 16; i < s.framex; i++) {
        for (let j = s.framey + 1; j < s.framey + 16; j++) {
          if (i > 0
            && j < 100
            && s.map[i][j] === minr1
            && s.map[i - 1][j] < 75
            && s.map[i][j - 1] < 75
            && j < 100
            && s.map[i + 1][j] < 75
            && s.map[i][j + 1] < 75
            && random() < fact) {
            s.map[i][j] = minr2;
            s.mapmode[i][j] = mpmode;
          }
        }
      }
    } else if (dir === 'right') {
      for (let i = s.framex + 16; i < s.framex + 32; i++) {
        for (let j = s.framey + 1; j < s.framey + 16; j++) {
          if (i < 4999
            && j < 100
            && s.map[i][j] === minr1
            && s.map[i - 1][j] < 75
            && s.map[i][j - 1] < 75
            && s.map[i + 1][j] < 75
            && s.map[i][j + 1] < 75
            && random() < fact) {
            s.map[i][j] = minr2;
            s.mapmode[i][j] = mpmode;
          }
        }
      }
    }
  }
}

/** Looks for magma on screen, lets it flow, and starts or stops the lava sound. */
export function checkMagma(s) {
  let fl = false;
  s.magmaex = false;

  for (let i = s.framex; i < s.framex + 16; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      if (j < 102) {
        if (s.map[i][j] >= 75 && s.map[i][j] < 79) {
          s.magmaex = true;
        }

        if (s.mapmode[i][j] === MAGMA) {
          fl = true;
        }
      }
    }
  }

  if (fl || s.magmaex) {
    magmaFlow(s);
  }

  if (s.sounds) {
    if (s.magmaex && !s.is_lava) {
      s.sfx.loop('lava');
      s.is_lava = true;
    } else if (!s.magmaex) {
      s.sfx.stop('lava');
      s.is_lava = false;
    }
  }
}

/**
 * Blasts the tiles from column stx to endx within type rows of the pod. Ice bombs and nuclear
 * bombs caught in the blast go off; rocks resist all but type 2 and ice mostly resists. The
 * base columns are restored, then explosives are rebuilt from nux.
 */
export function explos(s, type, stx, endx) {
  for (let i = stx; i <= endx; i++) {
    for (let j = s.iposy - type; j <= s.iposy + type; j++) {
      if (j < 100 && j > 4) {
        let spc = false;
        if ((s.map[i][j] < 75 || s.map[i][j] >= 79) && s.mapmode[i][j] !== HILLX && (s.mapmode[i][j] !== MAGMA || j >= 5)) {
          if (s.map[i][j] === 50) {
            s.ibomb = true;
            s.itimr = 0;
            s.ibombx = (i - s.framex) * 50 + 25;
            s.ibomby = (j - s.framey) * 50 + 25;
          } else if (s.map[i][j] >= 51 && s.map[i][j] <= 53) {
            s.nucb = true;
            s.nucbx = (i - s.framex) * 50 + 25;
            s.nucby = (j - s.framey) * 50 + 25;
            s.nuctimr = 0;
            if (s.map[i][j] === 51) {
              s.nucrad = 10;
              s.hull += 200;
            } else if (s.map[i][j] === 52) {
              s.nucrad = 14;
              s.hull += 500;
            } else if (s.map[i][j] === 53) {
              s.nucrad = 20;
              s.hull += 1500;
            }
            // Fix: damage from a nuclear blast wrecks the pod like any other damage; the original
            // let it drive on over the hull's limit (see docs/mlu2/fixes.md).
            if (s.hull > s.hullmax) {
              s.msg = true;
              s.msgstr = 'SHIP DAMAGED!';
              s.damx = s.digx;
              s.damy = s.digy;
            }
          } else if (s.map[i][j] === 30 && type === 2) {
            spc = true;
          } else if (s.map[i][j] === 33 && type === 2 && random() > 0.8) {
            spc = true;
          }

          if (s.map[i][j] !== 30 && s.map[i][j] !== 33) {
            spc = true;
          }

          if (spc) {
            s.map[i][j] = SPACE;
            s.mapmode[i][j] = toInt(random() * 6);
          }
        }
      }
    }
  }

  for (let i = 0; i < s.nodig.length; i++) {
    s.map[s.nodig[i]][5] = 0;
  }

  makeBombs(s);
}

/** Below row 15, starts an earthquake now and then, more often further east. */
export function makeQuake(s) {
  if (s.posy > 15 && !s.earthq && random() < 0.01 * Math.log(0.005 * s.posx + 0.001)) {
    s.rockfall = false;

    for (let i = s.framex; i < s.framex + 16; i++) {
      for (let j = s.iposy; j > 4; j--) {
        if (s.map[i][j] === 30) {
          s.rockfall = true;
          break;
        }
      }
    }

    s.eqtimr = 0;
    s.earthq = true;
    EarthQuake(s);
  }
}

/** The extractor turns nux into TNT and dynamite; the ice converter turns ice-9 into ice bombs. */
export function makeBombs(s) {
  if (s.extractor) {
    while (s.tnt < 30 && s.nux >= 150) {
      s.nux -= 150;
      s.tnt++;
      s.cargo -= 30;
    }

    while (s.dyn < 50 && s.nux >= 30) {
      s.nux -= 30;
      s.dyn++;
      s.cargo -= 6;
    }
  }

  if (s.iceconverter) {
    while (s.ice9 >= 30 && s.iceb < 20) {
      s.ice9 -= 30;
      s.iceb++;
    }
  }
}

/** Magma near the screen spreads into empty space beside and below it, until it stops. */
export function magmaFlow(s) {
  let flow = false;
  let x1 = s.framex;
  let x2 = s.framex + 16;
  if (s.framex > 5) {
    x1 = s.framex - 5;
  }

  if (s.framex < 4980) {
    x2 = s.framex + 21;
  }

  for (let i = x1; i < x2; i++) {
    for (let j = s.framey; j < s.framey + 12; j++) {
      if (j < 102 && s.mapmode[i][j] === MAGMA) {
        if (i > 0 && s.map[i - 1][j] === SPACE) {
          flow = true;
          s.map[i - 1][j] = MAGMA;
          s.mapmode[i - 1][j] = MAGMA;
        }

        if (i < 4999 && s.map[i + 1][j] === SPACE) {
          flow = true;
          s.map[i + 1][j] = MAGMA;
          s.mapmode[i + 1][j] = MAGMA;
        }

        if (j < 101 && s.map[i][j + 1] === SPACE) {
          flow = true;
          s.map[i][j + 1] = MAGMA;
          s.mapmode[i][j + 1] = MAGMA;
        }
      }
    }
  }

  if (flow) {
    magmaFlow(s);
    if (s.temp < -300) {
      s.freezetimr = 5;
    }
  }
}

/** One earthquake: 500 random swaps of neighbouring tiles deep down, away from the screen. */
export function EarthQuake(s) {
  for (let i = 0; i < 500; i++) {
    let x1 = toInt(random() * 500 + s.framex - 250);
    let y1 = toInt(random() * 50 + 45);
    if (x1 >= 0
      && x1 <= 4998
      && (x1 < s.framex || x1 > s.framex + 16)
      && (s.map[x1 + 1][y1] < 75 || s.map[x1 + 1][y1] > 78)
      && (s.map[x1][y1] < 75 || s.map[x1][y1] > 78)) {
      let temp = s.map[x1][y1];
      s.map[x1][y1] = s.map[x1 + 1][y1];
      s.map[x1 + 1][y1] = temp;
      let tmode = s.mapmode[x1][y1];
      s.mapmode[x1][y1] = s.mapmode[x1 + 1][y1];
      s.mapmode[x1 + 1][y1] = tmode;
    }
  }
}

/** Teleporter 1: on the open surface, jumps about 500 columns ahead in the facing direction. */
export function randomTel(s) {
  if (s.iposy <= 4 && s.map[s.iposx][s.iposy] === SPACE) {
    let x1 = jround(s.posx + 500 + random() * 50);
    let y1 = 2;
    if (x1 >= 5000) {
      x1 = 5000 - toInt(random() * 50);
    }

    if (!s.right_side) {
      x1 = toInt(s.posx - 500 + random());
      if (x1 < 0) {
        x1 = toInt(random() * 50);
      }
    }

    // Fix: facing east near the end, x1 can be 5000, past the map. The original's read of that
    // column threw in the game loop and stopped the game for good; the teleport is dropped
    // instead, with nothing changed.
    if (x1 >= 5000) {
      return;
    }

    if (s.map[x1][2] === SPACE) {
      s.posx = x1;
      s.iposx = x1;
      s.posy = y1;
      s.mode = 1;
      s.iposy = y1;
      s.framex = idiv(s.iposx, 3) * 3 - 3;
      if (s.framex < 0) {
        s.framex = 0;
      }

      if (s.framex > 4984) {
        s.framex = 4984;
      }

      s.framey = idiv(s.iposy, 3) * 3 - 6;
      if (s.framey < 0) {
        s.framey = 0;
      }

      s.digx = (s.iposx - s.framex) * 50 - 10;
      s.digy = (s.iposy - s.framey) * 50 + 50;
      checkMagma(s);
      loadAsh(s);
    }
  }
}

/**
 * Teleporter 2: underground, enters the current base and comes out at it (unless it is
 * destroyed); on the surface, drops into the first open tile of the easternmost column reached.
 */
export function baseTel(s) {
  let x1 = -1;
  let y1 = 4;
  if (s.iposy > 4) {
    if (!s.baseok[s.baseidx]) {
      return;
    }

    enterBase(s);
    x1 = s.basex[s.baseidx];
  } else if (s.iposy <= 4) {
    for (let j = 5; j < 100; j++) {
      if (s.map[s.xmax][j] === SPACE) {
        x1 = s.xmax;
        y1 = j;
        break;
      }
    }
  }

  // Fix: with no open tile below the furthest column reached, the teleport does not happen.
  // The original put the pod at column -1, outside the map, and stopped the game for good (see
  // docs/mlu2/fixes.md, "Teleporter 2 from the surface").
  if (x1 < 0) {
    return;
  }

  s.posx = x1;
  s.iposx = x1;
  s.posy = y1;
  s.mode = 1;
  s.iposy = y1;
  s.framex = idiv(s.iposx, 3) * 3 - 3;
  if (s.framex < 0) {
    s.framex = 0;
  }

  if (s.framex > 4984) {
    s.framex = 4984;
  }

  s.framey = idiv(s.iposy, 3) * 3 - 6;
  if (s.framey < 0) {
    s.framey = 0;
  }

  s.digx = (s.iposx - s.framex) * 50 - 10;
  s.digy = (s.iposy - s.framey) * 50 + 50;
  checkMagma(s);
  redraw(s);
}

/** Sums the pod's weight from its parts and gadgets and sets the terminal falling speed. */
export function setWeight(s) {
  let w = getUpgradeWeight(s.biox + 34) + getUpgradeWeight(s.drillx + 41) + getUpgradeWeight(s.batx + 48);
  if (s.engine === 8) {
    w += 700;
  } else {
    w += getUpgradeWeight(s.engine - 1);
  }

  if (s.fueltank === 8) {
    w += 200;
  } else {
    w += getUpgradeWeight(s.fueltank + 6);
  }

  if (s.cargobay === 8) {
    w += 1000;
  } else {
    w += getUpgradeWeight(s.cargobay + 13);
  }

  if (s.radiator === 8) {
    w += 175;
  } else {
    w += getUpgradeWeight(s.radiator + 20);
  }

  if (s.hullx === 8) {
    w += 1000;
  } else {
    w += getUpgradeWeight(s.hullx + 27);
  }

  w += 5 * s.tel1
    + 5 * s.tel2
    + 10 * s.dyn
    + 15 * s.tnt
    + 5 * s.shield
    + 5 * s.hullfix
    + 5 * s.drillfix
    + 5 * s.sonb
    + 5 * s.iceb
    + 3 * s.radb
    + 70 * s.coalb
    + 120 * s.petrolr
    + 100 * s.gasb
    + 200 * s.nuc
    + 300 * s.nucx
    + 250 * s.jet
    + 175 * s.tractor
    + 200 * s.heater
    + 5 * s.mtrans
    + 10 * s.echarger;
  s.weight = w + 8;
  s.termspd = toInt(6.5E-4 * (s.weight + s.cargo + s.fuel) + 8.7);
}

/** Drops the first rock above the pod in its column, one time in five. */
export function rockfall(s) {
  for (let j = s.framey; j < s.iposy; j++) {
    if (s.map[s.iposx][j] === 30) {
      if (random() < 0.2) {
        s.map[s.iposx][j] = 0;

        for (let i = 0; i < RCK; i++) {
          if (!s.rockexists[i]) {
            s.rockexists[i] = true;
            s.rocky[i] = (j - s.framey) * 50 + 25;
            s.rockx[i] = (s.iposx - s.framex) * 50 + 25;
            s.rockyspd[i] = 9;
            s.rockxspd[i] = 0;
            return;
          }
        }
      }
      break;
    }
  }
}

/**
 * Redraws the cached field layer: notes the redraw time and the span of open sky on screen
 * where rain falls, has the page draw the field into its cached picture right away, as the
 * original did, then applies drawField's state changes (fieldStep).
 */
export function redraw(s) {
  s.redrawtime = s.time;
  let begin1 = s.framex;
  let end1 = s.framex + 17;
  let i = s.framex;

  while (i < s.framex + 16 && s.map[i][0] !== 80) {
    begin1 = i++;
  }

  if (begin1 === s.framex + 15) {
    begin1 = s.framex + 18;
  }

  for (let ix = s.framex + 15; ix >= s.framex; ix--) {
    if (s.map[ix][0] === 80) {
      end1 = ix;
      break;
    }
  }

  if (begin1 === s.framex) {
    s.rainbegin = -50;
  } else {
    s.rainbegin = 50 * (begin1 - s.framex);
  }

  if (end1 === s.framex + 15) {
    s.rainend = 850;
  } else {
    s.rainend = 50 * (end1 - s.framex);
  }

  // The field is drawn first and drawField's own state changes (fieldStep) follow, as in the
  // original, where they happened at the end of drawing it.
  s.fieldVersion++;
  s.gfx.redrawField();
  fieldStep(s);
}

/**
 * Sets the ground background and sky colours from the temperature.
 * Quirk: the first test reads s.temp but the colours use temp1; every caller passes s.temp.
 */
export function backColor(s, temp1) {
  if (s.temp < 0) {
    s.back_color = rgb(toInt(0.03 * temp1 + 112), toInt(0.075 * temp1 + 130), toInt(-0.125 * temp1 + 130));
    s.c_sky = rgb(toInt(0.15 * temp1 + 130), toInt(0.15 * temp1 + 130), toInt(0.05 * temp1 + 95));
  } else if (temp1 < 800) {
    s.back_color = rgb(toInt(0.11 * temp1 + 112), toInt(-0.106 * temp1 + 130), toInt(-0.106 * temp1 + 130));
  } else {
    s.back_color = rgb(200, 45, 45);
  }

  if (s.temp >= 0) {
    s.c_sky = rgb(toInt(0.079 * temp1 + 130), toInt(0.05 * temp1 + 130), toInt(0.029 * temp1 + 95));
  }
}

/** A colour as a canvas colour string, as Java's new Color(r, g, b). */
function rgb(r, g, b) {
  return `rgb(${r},${g},${b})`;
}
