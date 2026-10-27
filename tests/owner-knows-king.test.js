import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView, privateView } from '../src/engine.js';
import { positionKey } from '../src/rules/outcome.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = false) => ({ type, owner, revealed, count: 1, moved: false });
function position(entries, ownerKnows = true) {
  const state = createGame({ king: { ownerKnows } });
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}

test('know your own crown defaults off and rejects nonboolean configuration', () => {
  assert.equal(createGame().rules.king.ownerKnows, false);
  assert.throws(() => createGame({ king: { ownerKnows: 'yes' } }), /boolean/);
  const state = createGame();
  assert.deepEqual(privateView(state, 1), { kingSquare: null });
  assert.deepEqual(privateView(state, 2), { kingSquare: null });
});

test('each player privately sees only their own hidden king', () => {
  const state = createGame({ king: { ownerKnows: true } });
  for (const player of [1, 2]) {
    const { kingSquare } = privateView(state, player);
    assert.equal(state.board[kingSquare].type, 'king');
    assert.equal(state.board[kingSquare].owner, player);
    assert.equal(state.board[kingSquare].revealed, false);
  }
});

test('the public projection and legal actions are identical with the rule on or off', () => {
  const entries = () => ({ d4: piece('king'), c4: piece('queen'), d5: piece('king', 2), c5: piece('rook', 2), a1: piece('pawn') });
  const on = position(entries(), true);
  const off = position(entries(), false);
  const { rules: onRules, ...onView } = publicView(on);
  const { rules: offRules, ...offView } = publicView(off);
  assert.deepEqual(onView, offView);
  assert.equal(onRules.king.ownerKnows, true);
  assert.deepEqual(getLegalActions(on), getLegalActions(off));
  assert.ok(publicView(on).board.every(tile => !tile || tile.revealed || !('type' in tile)), 'no hidden type in the public board');
});

test('swapping which hidden tile is the king changes only the owner’s private view', () => {
  const a = position({ d4: piece('king'), d3: piece('pawn'), d8: piece('king', 2) });
  const b = position({ d4: piece('pawn'), d3: piece('king'), d8: piece('king', 2) });
  assert.deepEqual(publicView(a), publicView(b));
  assert.deepEqual(getLegalActions(a), getLegalActions(b));
  assert.deepEqual(privateView(a, 2), privateView(b, 2));
  assert.equal(privateView(a, 1).kingSquare, sq('d4'));
  assert.equal(privateView(b, 1).kingSquare, sq('d3'));
});

test('the private view follows a slid king and clears once it is revealed', () => {
  const state = position({ d4: piece('king'), a8: piece('king', 2) });
  assert.equal(privateView(state, 1).kingSquare, sq('d4'));
  const next = applyAction(state, { kind: 'reveal', from: sq('d4'), to: sq('h4') });
  assert.equal(next.board[sq('h4')].revealed, true);
  assert.equal(privateView(next, 1).kingSquare, null);
  assert.equal(privateView(next, 2).kingSquare, sq('a8'));
});
