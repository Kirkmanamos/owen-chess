import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction } from '../src/engine.js';
import { chooseAction } from '../src/ai.js';
import { positionKey } from '../src/rules/outcome.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = true, count = 1) => ({ type, owner, revealed, count, moved: true });
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
function position(entries, overrides = {}, player = 1) {
  const state = createGame(overrides);
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.currentPlayer = player;
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
const isLegal = (state, action) => getLegalActions(state).some(legal => JSON.stringify(legal) === JSON.stringify(action));

test('rejects unknown levels and returns null when the game is over', () => {
  assert.throws(() => chooseAction(createGame(), { level: 'grandmaster' }), /Unknown computer level/);
  const over = { ...createGame(), result: { winner: 1, reason: 'Checkmate' } };
  assert.equal(chooseAction(over), null);
});

test('both levels choose a legal opening action without mutating the state', () => {
  for (const level of ['easy', 'normal']) {
    const state = createGame({}, seeded(4));
    const snapshot = structuredClone(state);
    const action = chooseAction(state, { level, random: seeded(9) });
    assert.ok(isLegal(state, action), `${level} chose an illegal action`);
    assert.deepEqual(state, snapshot);
  }
});

test('the choice never depends on hidden identities', () => {
  for (const level of ['easy', 'normal']) {
    for (let seed = 1; seed <= 5; seed++) {
      const a = createGame({}, seeded(seed));
      const b = createGame({}, seeded(seed + 100));
      // Same public position, different secrets underneath every tile.
      assert.notDeepEqual(a.board, b.board);
      assert.deepEqual(chooseAction(a, { level, random: seeded(77) }), chooseAction(b, { level, random: seeded(77) }));
    }
  }
});

test('hidden identities stay irrelevant in a developed position', () => {
  const entries = types => ({
    e4: piece('rook'), a1: piece(types[0], 1, false), b1: piece(types[1], 1, false), h1: piece('king', 1, false),
    e7: piece('bishop', 2), a8: piece(types[2], 2, false), b8: piece(types[3], 2, false), h8: piece('king', 2, false)
  });
  const a = position(entries(['knight', 'pawn', 'queen', 'pawn']));
  const b = position(entries(['pawn', 'knight', 'pawn', 'queen']));
  // Kings swapped too: identical public facts, different secrets.
  b.board[sq('h1')].type = 'pawn'; b.board[sq('a1')].type = 'king';
  b.board[sq('h8')].type = 'queen'; b.board[sq('a8')].type = 'king';
  for (const level of ['easy', 'normal']) {
    assert.deepEqual(chooseAction(a, { level, random: seeded(3) }), chooseAction(b, { level, random: seeded(3) }));
  }
});

test('normal takes a free queen and delivers a known checkmate', () => {
  const free = position({ a1: piece('rook'), a7: piece('queen', 2), h1: piece('king', 1), h8: piece('king', 2) });
  assert.deepEqual(chooseAction(free, { random: seeded(1) }), { kind: 'move', from: sq('a1'), to: sq('a7') });

  // Back-rank mate: the black king is boxed in by its own pawns.
  const mate = position({ a1: piece('rook'), h1: piece('king', 1), g8: piece('king', 2), f7: piece('pawn', 2), g7: piece('pawn', 2), h7: piece('pawn', 2) });
  const action = chooseAction(mate, { random: seeded(1) });
  assert.deepEqual(action, { kind: 'move', from: sq('a1'), to: sq('a8') });
  assert.equal(applyAction(mate, action).result?.winner, 1);
  assert.deepEqual(chooseAction(mate, { level: 'easy', random: seeded(1) }), action);
});

test('normal avoids moving its queen onto a defended square', () => {
  const state = position({ d1: piece('queen'), h1: piece('king', 1), d6: piece('pawn', 2), c7: piece('pawn', 2), h8: piece('king', 2) });
  const action = chooseAction(state, { random: seeded(2) });
  assert.notDeepEqual(action, { kind: 'move', from: sq('d1'), to: sq('d6') });
  assert.ok(isLegal(state, action));
});

test('computer self-play stays legal across rule variants', () => {
  const variants = [
    {},
    { turn: { bonusReveal: true } },
    { turn: { actionsPerTurn: 2 } },
    { stack: { anyAdjacent: true, stackAndStep: true, scouting: true } }
  ];
  for (const [i, overrides] of variants.entries()) {
    const random = seeded(500 + i);
    let state = createGame(overrides, random);
    for (let step = 0; step < 60 && !state.result; step++) {
      const level = state.currentPlayer === 1 ? 'normal' : 'easy';
      const action = chooseAction(state, { level, random, samples: 2 });
      state = applyAction(state, action);
      const tiles = state.board.reduce((n, p) => n + (p?.count ?? 0), 0) + state.captured.reduce((n, p) => n + p.count, 0);
      assert.equal(tiles, 32);
    }
  }
});
