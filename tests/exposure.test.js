import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { revealDestinations } from '../src/rules/exposure.js';
import { isInCheck } from '../src/rules/king.js';
import { index, squareName } from '../src/board.js';

const sq = name => index(8 - Number(name[1]), 'abcdefgh'.indexOf(name[0]));
const piece = (type, owner = 1, revealed = false) => ({ type, owner, revealed, count: 1, moved: false });
function position(entries, player = 1, rules = {}) {
  const state = createGame(rules);
  state.board.fill(null);
  for (const [name, value] of Object.entries(entries)) state.board[sq(name)] = value;
  state.currentPlayer = player;
  return state;
}
const reveal = (from, to) => ({ kind: 'reveal', from: sq(from), to: sq(to) });
const exits = (state, from) => getLegalActions(state).filter(a => a.kind === 'reveal' && a.from === sq(from)).map(a => squareName(a.to)).sort();

test('both starting armies can reveal from each d-file tile onto e, f, g, or h', () => {
  const state = createGame();
  for (const [player, ranks] of [[1, [1, 2, 3, 4]], [2, [5, 6, 7, 8]]]) {
    state.currentPlayer = player;
    for (const rank of ranks) assert.deepEqual(exits(state, `d${rank}`), ['e', 'f', 'g', 'h'].map(file => `${file}${rank}`));
    assert.equal(getLegalActions(state).length, 16);
  }
});

test('right is fixed for both armies; forward is owner-relative and left is one square', () => {
  for (const owner of [1, 2]) {
    const state = position({ c4: piece('bishop', owner) }, owner);
    assert.deepEqual(exits(state, 'c4'), ['b4', owner === 1 ? 'c5' : 'c3', 'd4', 'e4', 'f4', 'g4']);
    for (const to of ['a4', 'h4', owner === 1 ? 'c3' : 'c5', owner === 1 ? 'c6' : 'c2', 'd5', 'b3']) {
      assert.throws(() => applyAction(state, reveal('c4', to)), /not legal/, `Reject ${to} for Player ${owner}`);
    }
  }
});

test('every friendly or enemy blocker stops reveals before its square, without jumping or capturing', () => {
  for (const owner of [1, 2]) {
    for (const revealed of [false, true]) {
      const state = position({ c4: piece('knight'), e4: piece('rook', owner, revealed), b4: piece('pawn', owner, revealed), c5: piece('pawn', owner, revealed) });
      assert.deepEqual(exits(state, 'c4'), ['d4']);
      for (const to of ['b4', 'c5', 'e4', 'f4', 'g4']) assert.throws(() => applyAction(state, reveal('c4', to)), /not legal/);
    }
  }
});

test('reveal rays stop at board edges and never wrap across ranks', () => {
  for (const [owner, from, expected] of [[1, 'h8', ['g8']], [2, 'h1', ['g1']], [1, 'a8', ['b8', 'c8', 'd8', 'e8']], [2, 'a1', ['b1', 'c1', 'd1', 'e1']]]) {
    const state = position({ [from]: piece('rook', owner) }, owner);
    assert.deepEqual(exits(state, from), expected);
    assert.deepEqual(revealDestinations(state, sq(from)).map(squareName).sort(), expected);
  }
});

test('a long reveal flips only at the destination, costs one action, and opens the formation', () => {
  const state = createGame();
  const original = structuredClone(state);
  const type = state.board[sq('d4')].type;
  const next = applyAction(state, reveal('d4', 'h4'));
  assert.deepEqual(state, original);
  for (const empty of ['d4', 'e4', 'f4', 'g4']) assert.equal(next.board[sq(empty)], null);
  assert.equal(next.board[sq('h4')].type, type);
  assert.equal(next.board[sq('h4')].revealed, true);
  assert.equal(next.actionNumber, 1);
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.captured.length, 0);
  next.currentPlayer = 1;
  assert.deepEqual(exits(next, 'c4'), ['d4', 'e4', 'f4', 'g4']);
  assert.deepEqual(exits(next, 'd3'), ['d4', 'e3', 'f3', 'g3', 'h3']);
});

test('new opening directions keep the free-reveal and multi-action options', () => {
  for (const to of ['h4', 'c4', 'd5']) {
    for (const free of [false, true]) {
      const state = position({ d4: piece('bishop'), a8: piece('king', 2) }, 1, { turn: { actionsPerTurn: 2, revealCostsAction: !free } });
      const next = applyAction(state, reveal('d4', to));
      assert.equal(next.actionsLeft, free ? 2 : 1);
      assert.equal(next.currentPlayer, 1);
      assert.equal(next.board[sq(to)].revealed, true);
      assert.equal(next.board[sq('d4')], null);
    }
  }
});

test('forward and left openings stay available for all hidden identities without leaking the king', () => {
  const state = position({ c7: piece('pawn'), c1: piece('rook', 2, true), a1: piece('king'), h8: piece('king', 2) });
  const baselineActions = getLegalActions(state);
  const baselineView = publicView(state);
  for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
    state.board[sq('c7')].type = type;
    assert.deepEqual(getLegalActions(state), baselineActions);
    assert.deepEqual(publicView(state), baselineView);
  }
});

test('a king revealed in check after a long, left, or forward opening gets a response', () => {
  for (const [from, to, attacker] of [['d4', 'h4', 'h8'], ['d4', 'c4', 'c8'], ['d4', 'd5', 'd8']]) {
    const state = position({ [from]: piece('king'), [attacker]: piece('rook', 2, true), a8: piece('king', 2) });
    const next = applyAction(state, reveal(from, to));
    assert.equal(next.response.player, 1);
    assert.equal(next.currentPlayer, 1);
    assert.equal(next.actionsLeft, 1);
    assert.equal(next.result, null);
    assert.equal(isInCheck(next, 1), true);
  }
});

test('a pawn revealed onto the far rank promotes for either player, including a sideways opening', () => {
  for (const [owner, from, to] of [[1, 'c7', 'c8'], [2, 'c2', 'c1'], [1, 'c8', 'b8'], [2, 'c1', 'g1']]) {
    const state = position({ [from]: piece('pawn', owner) }, owner);
    const next = applyAction(state, reveal(from, to));
    assert.equal(next.board[sq(to)].type, 'queen');
    assert.equal(next.board[sq(to)].count, 1);
    assert.match(next.history[0].text, /revealing pawn\. Promoted to queen\./);
  }
});

test('a leftward reveal can block an existing check; a long reveal cannot expose your known king', () => {
  const checked = position({ a1: piece('king', 1, true), a8: piece('rook', 2, true), b4: piece('bishop'), h8: piece('king', 2) });
  assert.deepEqual(exits(checked, 'b4'), ['a4']);
  const next = applyAction(checked, reveal('b4', 'a4'));
  assert.equal(isInCheck(next, 1), false);
  const pinned = position({ a1: piece('king', 1, true), a2: piece('bishop'), a8: piece('rook', 2, true), h8: piece('king', 2) });
  assert.deepEqual(exits(pinned, 'a2'), ['a3']);
  assert.throws(() => applyAction(pinned, reveal('a2', 'e2')), /not legal/);
});

test('legacy reveal modes remain selectable and the flexible distances are configurable', () => {
  const entries = { c4: piece('bishop') };
  assert.deepEqual(exits(position(entries, 1, { exposure: { mode: 'right-empty' } }), 'c4'), ['d4']);
  assert.deepEqual(exits(position(entries, 1, { exposure: { mode: 'either-horizontal' } }), 'c4'), ['b4', 'd4']);
  assert.deepEqual(exits(position(entries, 1, { exposure: { rightRange: 2, leftRange: 0, forwardRange: 1 } }), 'c4'), ['c5', 'd4', 'e4']);
  for (const key of ['rightRange', 'leftRange', 'forwardRange']) {
    for (const value of [-1, 8, 1.5, '4']) assert.throws(() => createGame({ exposure: { [key]: value } }), /integer from 0 to 7/);
  }
});
