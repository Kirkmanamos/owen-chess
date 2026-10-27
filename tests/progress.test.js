import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, INTERVALS, progressKey, recordRun, dueKeys, whenDue, buildDrill } from '../src/progress.js';
import { buildCourse } from '../src/course.js';
import * as italian from '../src/openings/italian.js';

const course = buildCourse([italian]);
const key = progressKey('evans', 'w');
const now = 1_000_000_000_000;

test('a first clean run masters the line and schedules a review tomorrow', () => {
  const progress = recordRun({}, key, true, now);
  assert.deepEqual(progress[key], { box: 0, due: now + DAY });
  assert.equal(whenDue(progress[key], now), 'tomorrow');
});

test('a run with mistakes does not master a new line', () => {
  assert.deepEqual(recordRun({}, key, false, now), {});
});

test('clean reviews that are due climb the intervals and stop at the last one', () => {
  let progress = recordRun({}, key, true, now);
  let time = now;
  for (const days of INTERVALS.slice(1)) {
    time = progress[key].due;
    progress = recordRun(progress, key, true, time);
    assert.equal(progress[key].due, time + days * DAY);
  }
  time = progress[key].due;
  progress = recordRun(progress, key, true, time);
  assert.equal(progress[key].box, INTERVALS.length - 1);
});

test('practicing early does not move the review date', () => {
  const progress = recordRun({}, key, true, now);
  assert.equal(recordRun(progress, key, true, now + 1000), progress);
});

test('a mistake on a tracked line makes it due again now', () => {
  const progress = recordRun(recordRun({}, key, true, now), key, false, now + 5);
  assert.deepEqual(progress[key], { box: 0, due: now + 5 });
  assert.deepEqual(dueKeys(progress, now + 5), [key]);
});

test('drills put due reviews first, then positions where the student is to move', () => {
  let progress = recordRun({}, progressKey('evans', 'w'), true, now);
  progress = recordRun(progress, progressKey('fried-liver', 'w'), true, now);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const items = buildDrill(course, progress, { now: now + 2 * DAY, random });
  assert.equal(items.length, 8);
  assert.deepEqual(items.slice(0, 2).map(i => i.kind), ['review', 'review']);
  for (const item of items.slice(2)) {
    const line = course.byId.get(item.lineId);
    assert.equal(item.kind, 'position');
    assert.ok(item.start >= 2 && item.start < item.end && item.end <= line.moves.length);
    assert.equal(line.positions[item.start].turn, item.side);
  }
  assert.ok(items.slice(2).every((item, i, all) => i === 0 || item.lineId !== all[i - 1].lineId));
});

test('a drill uses each line once before repeating', () => {
  const items = buildDrill(course, {}, { now, size: 8 });
  assert.equal(new Set(items.map(i => i.lineId)).size, 8);
});

test('Black positions only appear for lines mastered from their main side', () => {
  const items = buildDrill(course, {}, { now, size: 40 });
  for (const item of items) assert.equal(item.side, course.byId.get(item.lineId).side);
});
