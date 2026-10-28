import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { positionKey } from '../src/rules/outcome.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = true) => ({ type, owner, revealed, count: 1, moved: true });
function position(entries, turn = {}) {
  const state = createGame({ turn });
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
const rooks = () => ({ a1: piece('rook'), h8: piece('rook', 2), a8: piece('king', 2, false), h1: piece('king', 1, false) });
const steps = { 1: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], 2: ['h8', 'h7', 'h6', 'h5', 'h4', 'h3'] };

// Spend one rook step, then end the turn early if actions remain.
function playTurn(state, at) {
  const player = state.currentPlayer;
  const from = steps[player][at[player]];
  const to = steps[player][++at[player]];
  let next = applyAction(state, { kind: 'move', from: sq(from), to: sq(to) });
  if (next.currentPlayer === player) next = applyAction(next, { kind: 'end-turn' });
  return next;
}

test('the opening ramp defaults off and rejects bad counts', () => {
  assert.deepEqual(createGame().rules.turn.openingRamp, []);
  assert.equal(createGame().actionsLeft, 1);
  assert.throws(() => createGame({ turn: { openingRamp: [4] } }), /openingRamp/);
  assert.throws(() => createGame({ turn: { openingRamp: '3,2' } }), /openingRamp/);
});

test('each player gets 3 actions, then 2, then the normal allowance', () => {
  let state = position(rooks(), { openingRamp: [3, 2] });
  const at = { 1: 0, 2: 0 };
  const seen = [];
  for (let turn = 0; turn < 6; turn++) {
    seen.push([state.currentPlayer, state.actionsLeft, publicView(state).turnAllowance]);
    state = playTurn(state, at);
  }
  assert.deepEqual(seen, [[1, 3, 3], [2, 3, 3], [1, 2, 2], [2, 2, 2], [1, 1, 1], [2, 1, 1]]);
});

test('all ramp actions can be spent in one turn', () => {
  let state = position(rooks(), { openingRamp: [3, 2] });
  for (const [from, to] of [['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4']]) {
    assert.equal(state.currentPlayer, 1);
    state = applyAction(state, { kind: 'move', from: sq(from), to: sq(to) });
  }
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.actionsLeft, 3);
});

test('Owen’s Rules games use the ramp when asked', () => {
  const state = createGame({ chaos: { enabled: true }, turn: { openingRamp: [3, 2] } }, () => 0.5);
  assert.equal(state.actionsLeft, 3);
  assert.ok(getLegalActions(state).some(a => a.kind === 'reveal'));
});
