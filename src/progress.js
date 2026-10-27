// Spaced review for opening lines. A line is tracked per side (White or Black)
// once the student plays it through cleanly. Each clean review that was due
// moves it to a longer interval; a run with mistakes brings it back right away.

export const DAY = 24 * 60 * 60 * 1000;
export const INTERVALS = [1, 3, 7, 14, 30];

export const progressKey = (lineId, side) => `${lineId}:${side}`;
export const isMastered = (progress, key) => Boolean(progress[key]);

export function recordRun(progress, key, clean, now = Date.now()) {
  const entry = progress[key];
  if (clean) {
    if (!entry) return { ...progress, [key]: { box: 0, due: now + INTERVALS[0] * DAY } };
    // Practicing early is fine, but only a review that was due earns a longer gap.
    if (entry.due > now) return progress;
    const box = Math.min(entry.box + 1, INTERVALS.length - 1);
    return { ...progress, [key]: { box, due: now + INTERVALS[box] * DAY } };
  }
  if (!entry) return progress;
  return { ...progress, [key]: { box: 0, due: now } };
}

export function dueKeys(progress, now = Date.now()) {
  return Object.entries(progress)
    .filter(([, entry]) => entry.due <= now)
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([key]) => key);
}

export function whenDue(entry, now = Date.now()) {
  if (!entry) return null;
  const days = Math.ceil((entry.due - now) / DAY);
  if (days <= 0) return 'now';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

// A drill session: due reviews first (whole lines), then quick positions from
// the middle of random lines where the student finds their next two moves.
export function buildDrill(course, progress, { now = Date.now(), size = 8, maxReviews = 3, random = Math.random } = {}) {
  const items = dueKeys(progress, now).slice(0, maxReviews).map(key => {
    const [lineId, side] = key.split(':');
    return { kind: 'review', lineId, side, start: 0, end: course.byId.get(lineId).moves.length };
  });
  const pool = course.lines.flatMap(line => {
    const other = line.side === 'w' ? 'b' : 'w';
    const sides = isMastered(progress, progressKey(line.id, line.side)) ? [line.side, other] : [line.side];
    return sides.map(side => ({ line, side }));
  });
  // Use each line and side once before any repeats, and never the same line twice in a row.
  const used = new Set();
  let previous = items.at(-1)?.lineId;
  for (let tries = 0; items.length < size && tries < size * 20; tries++) {
    if (used.size >= pool.length) used.clear();
    const { line, side } = pool[Math.floor(random() * pool.length)];
    if (used.has(progressKey(line.id, side)) || (line.id === previous && pool.length > 1)) continue;
    used.add(progressKey(line.id, side));
    // Start after the first two moves, on a ply where the student is to move.
    const starts = line.positions.map((pos, ply) => ply).filter(ply => ply >= 2 && ply < line.moves.length && line.positions[ply].turn === side);
    if (!starts.length) continue;
    const start = starts[Math.floor(random() * starts.length)];
    items.push({ kind: 'position', lineId: line.id, side, start, end: Math.min(line.moves.length, start + 3) });
    previous = line.id;
  }
  return items;
}
