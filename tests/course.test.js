import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourse } from '../src/course.js';
import * as italian from '../src/openings/italian.js';
import * as ruy from '../src/openings/ruy-lopez.js';

const course = buildCourse([italian, ruy]);
const openingOf = line => course.openingById.get(line.opening);

test('every line is legal and starts with its opening\'s moves', () => {
  assert.equal(course.lines.length, italian.lines.length + ruy.lines.length);
  for (const line of course.lines) assert.ok(line.sans.join(' ').startsWith(openingOf(line).moves), line.id);
});

test('every move in every line has a coaching note, and no note is orphaned', () => {
  for (const line of course.lines) for (const path of line.paths) assert.ok(course.notes[path], `missing note for ${path}`);
  for (const path of Object.keys(course.notes)) assert.ok(course.nodes.has(path), `note for unknown position ${path}`);
});

test('note arrows and marks name real squares', () => {
  for (const note of Object.values(course.notes)) {
    for (const arrow of note.arrows || []) assert.match(arrow, /^[a-h][1-8][a-h][1-8]$/);
    for (const mark of note.marks || []) assert.match(mark, /^[a-h][1-8]$/);
  }
});

test('the move tree branches at the three main third-move replies', () => {
  const italianNode = course.nodes.get(italian.opening.moves);
  assert.deepEqual(italianNode.children.map(c => c.san).sort(), ['Bc5', 'Nd4', 'Nf6']);
});

test('the Italian and the Ruy Lopez split at move 3', () => {
  assert.deepEqual(course.nodes.get('e4 e5 Nf3 Nc6').children.map(c => c.san).sort(), ['Bb5', 'Bc4']);
  assert.deepEqual(course.nodes.get(ruy.opening.moves).children.map(c => c.san).sort(), ['Nf6', 'a6']);
});

test('each opening has its own intro at the starting position', () => {
  assert.equal(course.noteFor('', 'ruy-lopez').text, ruy.opening.intro);
  assert.equal(course.noteFor('', 'italian').text, italian.opening.intro);
});

test('the Noah\'s Ark trap leaves the b3 bishop attacked', () => {
  const line = course.byId.get('ruy-noahs-ark');
  assert.equal(line.positions.at(-1).board[41], 'B');
});

test('the Shilling trap ends in checkmate', () => {
  assert.equal(course.byId.get('shilling-trap').moves.at(-1).san, 'Nf3#');
});

test('line ids are unique', () => {
  assert.equal(new Set(course.lines.map(l => l.id)).size, course.lines.length);
});
