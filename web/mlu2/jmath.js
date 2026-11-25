// Java number rules the game depends on. See "Module structure" in docs/mlu2/specifications.md.
//
// The game's rules were written for Java ints and doubles: integer division truncates toward
// zero, casting a double to int truncates (and saturates), and Math.round rounds half up.
// Every integer division in the game goes through idiv, every (int) cast through toInt.

/** Integer division truncating toward zero, as Java's int / int. */
export function idiv(a, b) {
  return Math.trunc(a / b);
}

/** Java's (int) cast of a double: truncates toward zero, saturates, NaN becomes 0. */
export function toInt(x) {
  if (x !== x) return 0;
  if (x >= 2147483647) return 2147483647;
  if (x <= -2147483648) return -2147483648;
  return Math.trunc(x);
}

/** Java's Math.round: the nearest integer, halves rounded up (toward positive infinity). */
export function jround(x) {
  return Math.floor(x + 0.5);
}

/** Wraps to a 32-bit signed int, as Java int addition does. Used only for save checksums. */
export function int32(x) {
  return x | 0;
}

/** Java's (byte) cast. */
export function int8(x) {
  return (x << 24) >> 24;
}

/** Uniform random number in [0, 1), as Java's Math.random. */
export function random() {
  return Math.random();
}

/** Java's rand helpers: n times a random number in [0, 1). */
export function rand(n) {
  return n * Math.random();
}
