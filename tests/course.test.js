import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCourse } from '../src/course.js';
import { moveFromSan, toSan } from '../src/chess.js';
import * as italian from '../src/openings/italian.js';
import * as ruy from '../src/openings/ruy-lopez.js';
import * as queensGambit from '../src/openings/queens-gambit.js';
import * as caroKann from '../src/openings/caro-kann.js';
import * as scotch from '../src/openings/scotch.js';
import * as london from '../src/openings/london.js';

const modules = [italian, ruy, scotch, caroKann, queensGambit, london];
const course = buildCourse(modules);
const openingOf = line => course.openingById.get(line.opening);

test('every line is legal and starts with its opening\'s moves', () => {
  assert.equal(course.lines.length, modules.reduce((sum, m) => sum + m.lines.length, 0));
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

test('the Italian, Ruy Lopez, and Scotch split at move 3', () => {
  assert.deepEqual(course.nodes.get('e4 e5 Nf3 Nc6').children.map(c => c.san).sort(), ['Bb5', 'Bc4', 'd4']);
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

test('the Queen\'s Gambit starts a separate 1.d4 tree with three answers to 2.c4', () => {
  assert.deepEqual(course.root.children.map(c => c.san), ['e4', 'd4']);
  assert.deepEqual(course.nodes.get(queensGambit.opening.moves).children.map(c => c.san).sort(), ['c6', 'dxc4', 'e6']);
});

test('the Elephant Trap leaves Black a knight ahead', () => {
  const board = course.byId.get('qgd-elephant').positions.at(-1).board;
  const count = (pieces) => board.filter(p => p && pieces.includes(p)).length;
  assert.equal(count('nbrq'.split('')) - count('NBRQ'.split('')), 1);
});

test('the Caro-Kann branches off 1.e4 beside 1...e5', () => {
  assert.deepEqual(course.nodes.get('e4').children.map(c => c.san).sort(), ['c6', 'e5']);
  assert.deepEqual(course.nodes.get('e4 c6 d4 d5').children.map(c => c.san).sort(), ['Nc3', 'e5', 'exd5']);
});

test('the Caro-Kann smothered trap ends in checkmate', () => {
  assert.equal(course.byId.get('ck-smothered').moves.at(-1).san, 'Nd6#');
});

test('the Shilling trap ends in checkmate', () => {
  assert.equal(course.byId.get('shilling-trap').moves.at(-1).san, 'Nf3#');
});

test('line ids are unique', () => {
  assert.equal(new Set(course.lines.map(l => l.id)).size, course.lines.length);
});

test('in the Scotch 3...Nxd4 line, Qd5 threatens mate on f7', () => {
  const line = course.byId.get('scotch-nxd4');
  const after = line.positions.at(-1);
  // Give White the move again: Qxf7 should then be checkmate.
  const threat = moveFromSan({ ...after, turn: 'w' }, 'Qxf7');
  assert.equal(toSan({ ...after, turn: 'w' }, threat), 'Qxf7#');
});

test('the London shares the 1.d4 tree with the Queen\'s Gambit', () => {
  assert.deepEqual(course.nodes.get('d4').children.map(c => c.san).sort(), ['Nf6', 'd5']);
  assert.deepEqual(course.nodes.get('d4 d5').children.map(c => c.san).sort(), ['Bf4', 'c4']);
  for (const line of course.lines.filter(l => l.opening === 'london')) assert.ok(line.sans.includes('Bf4'), line.id);
});
