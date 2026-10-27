import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourse } from '../src/course.js';
import * as italian from '../src/openings/italian.js';

const course = buildCourse(italian);

test('every Italian line is legal and starts with the Italian Game', () => {
  assert.ok(course.lines.length >= 8);
  for (const line of course.lines) assert.ok(line.moves.length && line.sans.join(' ').startsWith(italian.opening.moves), line.id);
});

test('every move in every line has a coaching note, and no note is orphaned', () => {
  for (const line of course.lines) for (const path of line.paths) assert.ok(italian.notes[path], `missing note for ${path}`);
  for (const path of Object.keys(italian.notes)) assert.ok(course.nodes.has(path), `note for unknown position ${path}`);
});

test('note arrows and marks name real squares', () => {
  for (const note of Object.values(italian.notes)) {
    for (const arrow of note.arrows || []) assert.match(arrow, /^[a-h][1-8][a-h][1-8]$/);
    for (const mark of note.marks || []) assert.match(mark, /^[a-h][1-8]$/);
  }
});

test('the move tree branches at the three main third-move replies', () => {
  const italianNode = course.nodes.get(italian.opening.moves);
  assert.deepEqual(italianNode.children.map(c => c.san).sort(), ['Bc5', 'Nd4', 'Nf6']);
});

test('the Shilling trap ends in checkmate', () => {
  assert.equal(course.byId.get('shilling-trap').moves.at(-1).san, 'Nf3#');
});

test('line ids are unique', () => {
  assert.equal(new Set(course.lines.map(l => l.id)).size, course.lines.length);
});
