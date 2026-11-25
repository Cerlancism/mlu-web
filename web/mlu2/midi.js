// A small General MIDI player for the game's three music files. See "Sound" in
// docs/mlu2/specifications.md.
//
// Browsers cannot play MIDI files, so this reads the file and plays it with simple synthesised
// voices: one oscillator per note, its waveform chosen by the instrument family, with an
// envelope; the percussion channel plays short filtered noise bursts. It is not a sampled
// General MIDI sound bank, so the music sounds simpler than in the original.

/** Parses a Standard MIDI File into note events with times in seconds. */
export function parseMidi(buffer) {
  const data = new DataView(buffer);
  let p = 0;
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(data.getUint8(p++)); return s; };
  const u32 = () => { const v = data.getUint32(p); p += 4; return v; };
  const u16 = () => { const v = data.getUint16(p); p += 2; return v; };
  const vlq = () => { let v = 0; let b; do { b = data.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };

  if (str(4) !== 'MThd') throw new Error('not a MIDI file');
  const hlen = u32();
  const hstart = p;
  u16(); // format
  const ntracks = u16();
  const division = u16();
  p = hstart + hlen;

  const raw = []; // [tick, order, event]
  let order = 0;
  for (let t = 0; t < ntracks && p < data.byteLength; t++) {
    if (str(4) !== 'MTrk') break;
    const len = u32();
    const end = p + len;
    let tick = 0;
    let status = 0;
    while (p < end) {
      tick += vlq();
      let b = data.getUint8(p);
      if (b & 0x80) { status = b; p++; } else { b = status; }
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (status === 0xff) {
        const meta = data.getUint8(p++);
        const mlen = vlq();
        if (meta === 0x51) {
          const us = (data.getUint8(p) << 16) | (data.getUint8(p + 1) << 8) | data.getUint8(p + 2);
          raw.push([tick, order++, { type: 'tempo', us }]);
        }
        p += mlen;
      } else if (status === 0xf0 || status === 0xf7) {
        p += vlq();
      } else if (type === 0x90 || type === 0x80) {
        const note = data.getUint8(p++);
        const vel = data.getUint8(p++);
        raw.push([tick, order++, { type: type === 0x90 && vel > 0 ? 'on' : 'off', ch, note, vel }]);
      } else if (type === 0xb0) {
        const cc = data.getUint8(p++);
        const val = data.getUint8(p++);
        raw.push([tick, order++, { type: 'cc', ch, cc, val }]);
      } else if (type === 0xc0) {
        raw.push([tick, order++, { type: 'program', ch, program: data.getUint8(p++) }]);
      } else if (type === 0xe0) {
        const lsb = data.getUint8(p++);
        const msb = data.getUint8(p++);
        raw.push([tick, order++, { type: 'bend', ch, value: ((msb << 7) | lsb) - 8192 }]);
      } else if (type === 0xa0) {
        p += 2;
      } else if (type === 0xd0) {
        p += 1;
      } else {
        break; // unknown data: stop reading this track
      }
    }
    p = end;
  }

  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const events = [];
  let usPerBeat = 500000;
  let lastTick = 0;
  let time = 0;
  for (const [tick, , ev] of raw) {
    time += ((tick - lastTick) * usPerBeat) / 1e6 / division;
    lastTick = tick;
    if (ev.type === 'tempo') usPerBeat = ev.us;
    else events.push({ ...ev, time });
  }
  return { events, duration: time };
}

// Waveform per General MIDI instrument family (program / 8).
const FAMILY_WAVE = ['triangle', 'triangle', 'square', 'sawtooth', 'sawtooth', 'sawtooth',
  'sawtooth', 'square', 'sawtooth', 'triangle', 'square', 'sawtooth', 'sawtooth', 'triangle',
  'square', 'square'];

/** Plays parsed songs on a Web Audio context, looping, one song at a time. */
export class MidiPlayer {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.18;
    this.out.connect(destination);
    this.song = null;
    this.timer = 0;
    this.noise = null;
  }

  play(song) {
    this.stop();
    this.song = song;
    this.channels = Array.from({ length: 16 }, () => ({ program: 0, volume: 100 / 127, expr: 1, bend: 0 }));
    this.voices = new Map();
    this.start = this.ctx.currentTime + 0.1;
    this.index = 0;
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = 0;
    if (this.voices) for (const v of this.voices.values()) this.release(v, this.ctx.currentTime);
    this.voices = new Map();
    this.song = null;
  }

  pump() {
    const song = this.song;
    if (!song || song.events.length === 0) return;
    const horizon = this.ctx.currentTime + 0.2;
    for (;;) {
      if (this.index >= song.events.length) {
        // Loop: start again after the last event.
        this.start += Math.max(song.duration, 0.5);
        this.index = 0;
        for (const v of this.voices.values()) this.release(v, this.start);
        this.voices = new Map();
      }
      const ev = song.events[this.index];
      const at = this.start + ev.time;
      if (at > horizon) break;
      // Notes that are already well overdue (the page was busy) are skipped, not bunched up.
      if (ev.type !== 'on' || at > this.ctx.currentTime - 0.1) {
        this.handle(ev, Math.max(at, this.ctx.currentTime));
      }
      this.index++;
    }
  }

  handle(ev, at) {
    const ch = this.channels[ev.ch];
    const key = ev.ch * 128 + ev.note;
    if (ev.type === 'program') ch.program = ev.program;
    else if (ev.type === 'cc') {
      if (ev.cc === 7) ch.volume = ev.val / 127;
      else if (ev.cc === 11) ch.expr = ev.val / 127;
      else if (ev.cc === 123 || ev.cc === 120) {
        for (const [k, v] of this.voices) if (Math.floor(k / 128) === ev.ch) { this.release(v, at); this.voices.delete(k); }
      }
    } else if (ev.type === 'bend') ch.bend = ev.value / 8192 * 2;
    else if (ev.type === 'on') {
      const old = this.voices.get(key);
      if (old) this.release(old, at);
      const v = ev.ch === 9 ? this.drum(ev, ch, at) : this.tone(ev, ch, at);
      if (v) this.voices.set(key, v);
    } else if (ev.type === 'off') {
      const v = this.voices.get(key);
      if (v) {
        this.release(v, at);
        this.voices.delete(key);
      }
    }
  }

  tone(ev, ch, at) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = FAMILY_WAVE[ch.program >> 3];
    osc.frequency.value = 440 * 2 ** ((ev.note - 69 + ch.bend) / 12);
    const gain = ctx.createGain();
    const level = (ev.vel / 127) * ch.volume * ch.expr * (osc.type === 'triangle' ? 1 : 0.45);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.01);
    gain.gain.setTargetAtTime(level * 0.6, at + 0.01, 0.3);
    osc.connect(gain).connect(this.out);
    osc.start(at);
    return { osc, gain };
  }

  drum(ev, ch, at) {
    const ctx = this.ctx;
    if (!this.noise) {
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    const n = ev.note;
    const kick = n === 35 || n === 36;
    const cymbal = n >= 42 && n !== 45 && n !== 47 && n !== 48 && n !== 50;
    filter.type = kick ? 'lowpass' : cymbal ? 'highpass' : 'bandpass';
    filter.frequency.value = kick ? 150 : cymbal ? 7000 : 1800;
    const gain = ctx.createGain();
    const level = (ev.vel / 127) * ch.volume * (kick ? 2.5 : 1.2);
    const length = cymbal ? 0.12 : kick ? 0.18 : 0.1;
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(at);
    src.stop(at + length + 0.05);
    return null;
  }

  release(v, at) {
    if (!v) return;
    try {
      v.gain.gain.cancelScheduledValues(at);
      v.gain.gain.setTargetAtTime(0, at, 0.05);
      v.osc.stop(at + 0.4);
    } catch {
      // already stopped
    }
  }
}
