// Sound effects synthesized with the Web Audio API, so there are no audio files
// to download. The context starts on the first sound, which always follows a click.

const STORAGE_KEY = 'opening-arena.muted';
let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = loadMuted();

function loadMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch { /* setting just won't persist */ }
}

function audio() {
  if (!ctx) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    ctx = new Context();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function envelope(ac, start, dur, gain, attack = 0.004) {
  const node = ac.createGain();
  node.gain.setValueAtTime(0.0001, start);
  node.gain.exponentialRampToValueAtTime(gain, start + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  node.connect(master);
  return node;
}

function tone(ac, { freq, slide, type = 'sine', at = 0, dur = 0.15, gain = 0.2, attack }) {
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
  osc.connect(envelope(ac, start, dur, gain, attack));
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// A filtered burst of noise gives the wooden "tock" of a piece landing.
function knock(ac, { at = 0, dur = 0.06, gain = 0.4, freq = 1800, q = 1.4 }) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const start = ac.currentTime + at;
  const source = ac.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  source.connect(filter).connect(envelope(ac, start, dur, gain, 0.002));
  source.start(start);
  source.stop(start + dur + 0.05);
}

function bell(ac, freq, at, gain = 0.12, dur = 0.7) {
  tone(ac, { freq, at, dur, gain, attack: 0.006 });
  tone(ac, { freq: freq * 2.01, at, dur: dur * 0.45, gain: gain * 0.35, attack: 0.004 });
  tone(ac, { freq: freq * 3.02, at, dur: dur * 0.2, gain: gain * 0.15, attack: 0.003 });
}

// A soft mallet note: a pure tone with a faint high overtone that dies fast.
function marimba(ac, freq, at = 0, gain = 0.16, dur = 0.28) {
  tone(ac, { freq, at, dur, gain, attack: 0.003 });
  tone(ac, { freq: freq * 4, at, dur: dur * 0.25, gain: gain * 0.25, attack: 0.002 });
}

const pop = (ac, at = 0, gain = 0.2, from = 900, to = 260) => tone(ac, { freq: from, slide: to, at, dur: 0.08, gain, attack: 0.002 });

function buzz(ac, { freq, at = 0, dur = 0.2, gain = 0.1 }) {
  const start = ac.currentTime + at;
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, start);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  osc.connect(filter).connect(envelope(ac, start, dur, gain, 0.01));
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const woodTock = ac => {
  knock(ac, {});
  tone(ac, { freq: 190, slide: 120, dur: 0.09, gain: 0.22 });
};

// Each sound event offers a few styles. DEFAULTS picks one for each (or none);
// a student's picks from the sound lab are stored and override it.
const OPTIONS = {
  select: {
    tick: ['Tiny tick', ac => tone(ac, { freq: 1350, dur: 0.045, gain: 0.04 })],
    bubble: ['Bubble', ac => pop(ac, 0, 0.08, 500, 1100)],
    tap: ['Wood tap', ac => knock(ac, { freq: 3000, dur: 0.03, gain: 0.15 })]
  },
  move: {
    bubble: ['Bubble', ac => pop(ac, 0, 0.16, 480, 1100)],
    wood: ['Wooden tock', woodTock],
    pop: ['Soft pop', ac => pop(ac)],
    marimba: ['Marimba note', ac => marimba(ac, 523)]
  },
  capture: {
    thump: ['Thump and crack', ac => {
      knock(ac, { freq: 950, dur: 0.12, gain: 0.55, q: 0.8 });
      tone(ac, { freq: 150, slide: 65, dur: 0.18, gain: 0.38 });
      knock(ac, { at: 0.05, freq: 2600, dur: 0.05, gain: 0.18 });
    }],
    deeper: ['Thump, deeper', ac => {
      knock(ac, { freq: 700, dur: 0.16, gain: 0.55, q: 0.7 });
      tone(ac, { freq: 120, slide: 50, dur: 0.26, gain: 0.45 });
      knock(ac, { at: 0.06, freq: 2200, dur: 0.05, gain: 0.14 });
    }],
    snappier: ['Thump, snappier', ac => {
      knock(ac, { freq: 1100, dur: 0.08, gain: 0.5, q: 0.9 });
      tone(ac, { freq: 170, slide: 80, dur: 0.12, gain: 0.32 });
      knock(ac, { at: 0.03, freq: 3200, dur: 0.06, gain: 0.26 });
    }],
    bonk: ['Cartoon bonk', ac => {
      tone(ac, { freq: 420, slide: 110, dur: 0.22, gain: 0.22, type: 'triangle' });
      knock(ac, { freq: 1200, dur: 0.05, gain: 0.3 });
    }],
    whoosh: ['Pop and whoosh', ac => {
      pop(ac, 0, 0.25, 1100, 300);
      knock(ac, { at: 0.04, freq: 600, dur: 0.25, gain: 0.25, q: 0.5 });
    }]
  },
  castle: {
    double: ['Double tock', ac => {
      woodTock(ac);
      knock(ac, { at: 0.1, freq: 1500 });
      tone(ac, { at: 0.1, freq: 170, slide: 110, dur: 0.09, gain: 0.2 });
    }],
    whistle: ['Slide whistle', ac => tone(ac, { freq: 420, slide: 980, dur: 0.3, gain: 0.08, type: 'triangle' })],
    marimba: ['Marimba pair', ac => { marimba(ac, 523); marimba(ac, 784, 0.1); }]
  },
  check: {
    ding: ['Boxing-ring ding-ding', ac => { bell(ac, 1760, 0, 0.07, 0.35); bell(ac, 1760, 0.14, 0.07, 0.6); }],
    dundun: ['Dramatic dun-dun', ac => { marimba(ac, 220, 0, 0.22, 0.35); marimba(ac, 208, 0.18, 0.22, 0.6); }],
    tremolo: ['Tension tremolo', ac => [0, 0.06, 0.12, 0.18, 0.24].forEach((at, i) => marimba(ac, 880, at, 0.06 + i * 0.015, 0.12))],
    stab: ['Danger stab', ac => { marimba(ac, 494, 0, 0.14, 0.4); marimba(ac, 698, 0, 0.14, 0.4); knock(ac, { freq: 1800, dur: 0.06, gain: 0.25 }); }],
    ping: ['Two-note ping', ac => {
      tone(ac, { freq: 988, dur: 0.16, gain: 0.08, type: 'triangle' });
      tone(ac, { freq: 1319, at: 0.09, dur: 0.26, gain: 0.08, type: 'triangle' });
    }],
    chirp: ['Triple chirp', ac => [0, 0.07, 0.14].forEach(at => tone(ac, { freq: 1568, at, dur: 0.06, gain: 0.07, type: 'triangle' }))],
    gong: ['Low gong', ac => bell(ac, 196, 0, 0.18, 1.4)]
  },
  correct: {
    bells: ['Two bells', ac => {
      bell(ac, 1047, 0, 0.09, 0.5);
      bell(ac, 1568, 0.08, 0.09, 0.6);
    }],
    // A streak raises the coin's pitch one semitone per move, up to an octave.
    coin: ['Game coin', (ac, step = 0) => {
      const lift = 2 ** (Math.min(step, 12) / 12);
      tone(ac, { freq: 988 * lift, dur: 0.08, gain: 0.05, type: 'square' });
      tone(ac, { freq: 1319 * lift, at: 0.07, dur: 0.3, gain: 0.05, type: 'square' });
    }],
    xylophone: ['Xylophone run', ac => [523, 659, 784].forEach((freq, i) => marimba(ac, freq * 2, i * 0.06, 0.12))]
  },
  wrong: {
    uhuh: ['Soft uh-uh', ac => {
      tone(ac, { freq: 240, slide: 170, dur: 0.16, gain: 0.13, type: 'triangle' });
      tone(ac, { freq: 200, slide: 130, at: 0.13, dur: 0.22, gain: 0.13, type: 'triangle' });
    }],
    bonk: ['Single bonk', ac => tone(ac, { freq: 300, slide: 140, dur: 0.2, gain: 0.18 })],
    buzzer: ['Game-show buzzer', ac => { buzz(ac, { freq: 110, dur: 0.32, gain: 0.14 }); buzz(ac, { freq: 116, dur: 0.32, gain: 0.1 }); }]
  },
  hint: {
    blip: ['Rising blip', ac => tone(ac, { freq: 640, slide: 980, dur: 0.18, gain: 0.07, type: 'triangle' })],
    sparkle: ['Sparkle', ac => [2093, 2637, 3136].forEach((freq, i) => tone(ac, { freq, at: i * 0.05, dur: 0.18, gain: 0.03 }))],
    whistle: ['Curious whistle', ac => {
      tone(ac, { freq: 900, slide: 700, dur: 0.12, gain: 0.06 });
      tone(ac, { freq: 700, slide: 1200, at: 0.12, dur: 0.2, gain: 0.06 });
    }]
  },
  done: {
    bells: ['Two bells', ac => {
      bell(ac, 784, 0, 0.1);
      bell(ac, 1047, 0.14, 0.1, 0.9);
    }],
    harp: ['Harp ripple', ac => [392, 494, 587, 784].forEach((freq, i) => marimba(ac, freq, i * 0.08, 0.1, 0.6))],
    tada: ['Ta-da', ac => {
      [523, 659, 784].forEach(freq => tone(ac, { freq, dur: 0.12, gain: 0.05, type: 'triangle' }));
      [587, 740, 880].forEach(freq => tone(ac, { freq, at: 0.14, dur: 0.6, gain: 0.05, type: 'triangle' }));
    }]
  },
  mastered: {
    fanfare: ['Fanfare and sparkle', ac => {
      [523, 659, 784, 1047].forEach((freq, i) => bell(ac, freq, i * 0.1, 0.1, 0.8));
      bell(ac, 1568, 0.42, 0.08, 1.2);
      [2093, 2637, 3136].forEach((freq, i) => tone(ac, { freq, at: 0.5 + i * 0.06, dur: 0.25, gain: 0.025 }));
    }],
    levelup: ['Level up', ac => [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => tone(ac, { freq, at: i * 0.055, dur: i === 5 ? 0.5 : 0.08, gain: 0.04, type: 'square' }))],
    swell: ['Warm chord swell', ac => [262, 330, 392, 523, 659].forEach((freq, i) => bell(ac, freq, i * 0.03, 0.07, 1.8))]
  }
};

const DEFAULTS = { select: 'tap', move: 'bubble', capture: 'snappier', castle: 'marimba', check: 'stab', correct: 'coin', wrong: 'uhuh', hint: 'whistle', done: 'harp', mastered: 'levelup' };

const CHOICE_KEY = 'opening-arena.sound-choices';
let choices = loadChoices();

function loadChoices() {
  try { return JSON.parse(localStorage.getItem(CHOICE_KEY)) || {}; } catch { return {}; }
}

export const SOUND_EVENTS = Object.keys(OPTIONS);
export const soundOptions = name => [...Object.entries(OPTIONS[name]).map(([key, [label]]) => ({ key, label })), { key: 'none', label: 'None' }];
export const getChoice = name => (OPTIONS[name][choices[name]] || choices[name] === 'none') ? choices[name] : DEFAULTS[name];

export function setChoice(name, key) {
  choices = { ...choices, [name]: key };
  try { localStorage.setItem(CHOICE_KEY, JSON.stringify(choices)); } catch { /* picks just won't persist */ }
}

export function resetChoices() {
  choices = {};
  try { localStorage.removeItem(CHOICE_KEY); } catch { /* nothing stored */ }
}

function run(name, key, delay, step) {
  const sound = OPTIONS[name][key]?.[1];
  const ac = sound && audio();
  if (!ac) return;
  if (delay) setTimeout(() => sound(ac, step), delay);
  else sound(ac, step);
}

// `step` lets a sound climb with a streak; most sounds ignore it.
export function play(name, delay = 0, step = 0) {
  if (!muted) run(name, getChoice(name), delay, step);
}

// Auditioning in the sound lab ignores the mute setting.
export const preview = (name, key) => run(name, key, 0);
