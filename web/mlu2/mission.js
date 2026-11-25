// mission: Missions: the list of minerals to collect, picked by how far the pod has been
// (xmax), the bonus, counting off collected minerals, completion and the mission text; and
// offering a new mission when leaving a base.
// Specification: docs/mlu2/specifications.md, Missions (10).

import { idiv, toInt, random } from './jmath.js';
import { getPrice, getName } from './stats.js';

/**
 * A new mission for a pod that has been as far as column posx. Draws its random numbers in the
 * original's order.
 */
export function createMission(posx) {
  const m = {
    minarray: new Array(10).fill(0),
    quantity: new Array(10).fill(0),
    number: 0,
    bonus: 0,
    complete: false,
  };
  let ex0 = 1;
  let ex1 = 6;
  let q0 = 1;
  let q1 = 3;
  let mtype = 0;
  // Quirk: this first draw is always made, and replaced by the branch below unless posx >= 3600.
  m.number = toInt(random() * 3.0 + 3.0);
  if (posx < 100) {
    ex1 = 6;
    m.number = toInt(random() * 3.0 + 3.0);
    q0 = 1;
    q1 = 3;
  } else if (posx < 150) {
    ex1 = 6;
    m.number = toInt(random() * 4.0 + 2.0);
    q0 = 1;
    q1 = 5;
    if (random() < 0.5) {
      m.number = 1;
      ex0 = 5;
      ex1 = 5;
      q0 = 12;
      q1 = 20;
    }
  } else if (posx < 200) {
    ex0 = 1;
    ex1 = 8;
    m.number = toInt(random() * 4.0 + 3.0);
    q0 = 2;
    q1 = 5;
  } else if (posx < 400) {
    m.number = toInt(random() * 5.0 + 3.0);
    ex0 = 2;
    ex1 = 9;
    q0 = 2;
    q1 = 6;
    if (random() < 0.6) {
      m.number = 1;
      ex0 = 11;
      ex1 = 11;
      q0 = 15;
      q1 = 25;
    }
  } else if (posx < 1000) {
    m.number = toInt(random() * 6.0 + 4.0);
    ex0 = 3;
    ex1 = 12;
    q0 = 3;
    q1 = 10;
    if (random() < 0.6) {
      m.number = 2;
      ex0 = 9;
      ex1 = 12;
      q0 = 15;
      q1 = 25;
      mtype = 1;
    } else if (random() < 0.2) {
      m.number = 1;
      ex0 = 11;
      ex1 = 11;
      q0 = 10;
      q1 = 15;
    }
  } else if (posx < 1500) {
    m.number = toInt(random() * 6.0 + 4.0);
    ex0 = 7;
    ex1 = 16;
    q0 = 3;
    q1 = 8;
    if (random() < 0.4) {
      m.number = 4;
      ex0 = 7;
      ex1 = 16;
      q0 = 8;
      q1 = 15;
    }
  } else if (posx < 2000) {
    m.number = 1;
    ex0 = 18;
    ex1 = 18;
    q0 = 25;
    q1 = 40;
  } else if (posx < 3000) {
    m.number = toInt(random() * 7.0 + 3.0);
    ex0 = 13;
    ex1 = 22;
    q0 = 8;
    q1 = 15;
  } else if (posx < 3600) {
    m.number = toInt(random() * 2.0 + 3.0);
    ex0 = 23;
    ex1 = 27;
    q0 = 1;
    q1 = 4;
  }

  for (let i = 0; i < m.number; i++) {
    m.minarray[i] = toInt(random() * (ex1 - ex0 + 1) + ex0);
    // The gold and platinum mission: the draw above is still made, then replaced.
    if (mtype === 1) {
      if (i === 0) {
        m.minarray[i] = 9;
      } else {
        m.minarray[i] = 12;
      }
    }

    // Redraw a mineral already on the list. Quirk: the redraw never picks ex1, the top of the
    // range.
    let rept = true;
    while (rept) {
      rept = false;
      for (let j = 0; j < i; j++) {
        if (m.minarray[i] === m.minarray[j]) {
          m.minarray[i] = toInt(random() * (ex1 - ex0) + ex0);
          rept = true;
          break;
        }
      }
    }

    // Quirk: the quantity never reaches q1.
    m.quantity[i] = toInt(random() * (q1 - q0) + q0);
  }

  let amount = 0;
  for (let i = 0; i < m.number; i++) {
    amount += m.quantity[i] * getPrice(m.minarray[i]);
  }
  amount *= 3;
  m.bonus = idiv(amount, 100) * 100;
  if (amount < 500) {
    m.bonus = 500;
  }
  return m;
}

/** True when every mineral on the list has been collected. */
export function isCompleted(m) {
  for (let i = 0; i < m.number; i++) {
    if (m.quantity[i] > 0) {
      m.complete = false;
      return false;
    }
  }
  m.complete = true;
  return true;
}

export function getBonus(m) {
  return m.bonus;
}

/** Clamps counts that went below zero (minerals is unused, as in the original). */
export function missionUpdate(m, minerals) {
  for (let i = 0; i < m.number; i++) {
    for (let j = 1; j < 42; j++) {
      if (m.minarray[i] === j) {
        if (m.quantity[i] < 0) {
          m.quantity[i] = 0;
        }
        break;
      }
    }
  }
}

/** One mineral of type min collected: counts it off the list if the mission wants it. */
export function missionUpdateOne(m, min) {
  for (let i = 0; i < m.number; i++) {
    if (m.minarray[i] === min) {
      m.quantity[i]--;
      break;
    }
  }
}

/** The mission text: the bonus and what is still to collect, one mineral per line. */
export function missionString(m, minerals) {
  let msg1 = 'Collect the following minerals and get\n$' + makeString(m.bonus) + ' bonus.\n';
  missionUpdate(m, minerals);
  for (let i = 0; i < m.number; i++) {
    msg1 = msg1 + m.quantity[i] + ' ' + getName(m.minarray[i]) + '\n';
  }
  return msg1;
}

// The mission's own copy of the game's thousands-separator formatting.
function makeString(num) {
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
  if (str.charAt(0) === ',') {
    str = str.substring(1, str.length);
  }
  return str;
}

/** Offers a new mission on leaving a base (from a key press, so the box does not stop play). */
export function newMission(s) {
  s.mission = createMission(s.xmax);
  s.is_mission = true;
  const msg1 = missionString(s.mission, s.minerals);
  s.ui.alert('Mission', msg1, false);
}
