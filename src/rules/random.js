// Mulberry32. The seed lives in the chaos state, so transitions stay pure and replayable.
export function roll(chaos) {
  let t = (chaos.seed = (chaos.seed + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const pick = (chaos, items) => items[Math.floor(roll(chaos) * items.length)];
