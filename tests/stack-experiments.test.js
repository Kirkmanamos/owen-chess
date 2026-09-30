import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { index, squareName } from '../src/board.js';
import { isInCheck } from '../src/rules/king.js';

const sq = name => index(8 - Number(name[1]), 'abcdefgh'.indexOf(name[0]));
const piece = (type, owner = 1, revealed = true, count = 1) => ({ type, owner, revealed, count, moved: true });
const allOn = { anyAdjacent: true, stackAndStep: true, scouting: true };
function position(entries, stack = {}, turn = {}) {
  const state = createGame({ stack, turn });
  state.board.fill(null);
  for (const [name, value] of Object.entries(entries)) state.board[sq(name)] = value;
  return state;
}
const request = (kind, from, to, extra = {}) => ({ kind, from: sq(from), to: sq(to), ...Object.fromEntries(Object.entries(extra).map(([key, name]) => [key, sq(name)])) });
const legal = (state, action) => getLegalActions(state).some(a => ['kind', 'from', 'to', 'step', 'scout'].every(key => a[key] === action[key]));
const entries = () => ({ c3: piece('pawn'), d4: piece('pawn'), f5: piece('bishop', 2, false), a1: piece('king'), h8: piece('king', 2, false) });

test('all eight toggle combinations independently control adjacency, stepping, and scouting', () => {
  for (let mask = 0; mask < 8; mask++) {
    const stack = { anyAdjacent: Boolean(mask & 1), stackAndStep: Boolean(mask & 2), scouting: Boolean(mask & 4) };
    const state = position({ ...entries(), c4: piece('pawn'), a6: piece('pawn', 1, true, 2), c6: piece('rook', 2, false) }, stack);
    assert.equal(legal(state, request('stack', 'c3', 'd4')), stack.anyAdjacent);
    assert.equal(legal(state, request('stack', 'c4', 'd4', { step: 'e4' })), stack.stackAndStep);
    assert.equal(legal(state, request('move', 'a6', 'b6', { scout: 'c6' })), stack.scouting);
    assert.equal(legal(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' })), mask === 7);
  }
  assert.deepEqual(createGame().rules.stack, { enabled: true, unstack: 'orthogonal', ...Object.fromEntries(Object.keys(allOn).map(key => [key, false])) });
});

test('any-adjacent stacking works in all eight directions for both players without wrapping', () => {
  for (const owner of [1, 2]) {
    for (const neighbor of ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5']) {
      const state = position({ d4: piece('pawn', owner), [neighbor]: piece('pawn', owner) }, { anyAdjacent: true });
      state.currentPlayer = owner;
      assert.ok(legal(state, request('stack', 'd4', neighbor)));
      assert.ok(legal(state, request('stack', neighbor, 'd4')));
      const next = applyAction(state, request('stack', 'd4', neighbor));
      assert.equal(next.board[sq(neighbor)].count, 2);
      assert.equal(next.board[sq(neighbor)].owner, owner);
    }
  }
  const edge = position({ a4: piece('pawn'), h5: piece('pawn'), b4: piece('pawn', 1, false), b5: piece('pawn', 2), a5: piece('pawn', 1, true, 2) }, allOn);
  assert.equal(getLegalActions(edge).some(a => a.kind === 'stack'), false);
});

test('stack-and-step is noncapturing, stays adjacent, and may reuse the vacated square', () => {
  const state = position({ c3: piece('pawn'), d3: piece('pawn'), e3: piece('rook', 2), e4: piece('bishop', 2, false), d4: piece('rook') }, allOn);
  for (const name of ['c3', 'c4', 'c2', 'd2', 'e2']) assert.ok(legal(state, request('stack', 'c3', 'd3', { step: name })));
  for (const name of ['d3', 'd4', 'e3', 'e4', 'f3']) assert.throws(() => applyAction(state, request('stack', 'c3', 'd3', { step: name })), /not legal/);
  const back = applyAction(state, request('stack', 'c3', 'd3', { step: 'c3' }));
  assert.equal(back.board[sq('c3')].count, 2);
  assert.equal(back.board[sq('d3')], null);
});

test('stack, step, and scout resolve immutably as one paid action and one history entry', () => {
  const state = position(entries(), allOn, { actionsPerTurn: 2, revealCostsAction: false });
  const snapshot = structuredClone(state);
  const next = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' }));
  assert.deepEqual(state, snapshot);
  assert.equal(next.board[sq('c3')], null);
  assert.equal(next.board[sq('d4')], null);
  assert.equal(next.board[sq('e4')].count, 2);
  assert.equal(next.board[sq('f5')].revealed, true);
  assert.equal(next.captured.length, 0);
  assert.equal(next.actionNumber, 1);
  assert.equal(next.actionsLeft, 1);
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].text, 'Stacked pawns from c3 onto d4, then stepped to e4. Scouted f5: bishop revealed.');
});

test('either bonus may be declined, and a completed combined action normally passes the turn', () => {
  const state = position(entries(), allOn);
  const plain = applyAction(state, request('stack', 'c3', 'd4'));
  assert.equal(plain.board[sq('d4')].count, 2);
  assert.equal(plain.board[sq('f5')].revealed, false);
  const step = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4' }));
  assert.equal(step.board[sq('e4')].count, 2);
  assert.equal(step.board[sq('f5')].revealed, false);
  assert.equal(step.currentPlayer, 2);
  const scout = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' }));
  assert.equal(scout.currentPlayer, 2);
  assert.equal(scout.turnNumber, 2);
});

test('scouting offers exactly adjacent hidden enemies after a noncapturing stack move', () => {
  const state = position({ d4: piece('pawn', 1, true, 2), f5: piece('rook', 2, false), e5: piece('pawn', 2, false), f4: piece('pawn', 2), f3: piece('pawn', 1, false), g4: piece('rook', 2, false) }, { scouting: true });
  const targets = getLegalActions(state).filter(a => a.kind === 'move' && a.from === sq('d4') && a.to === sq('e4') && a.scout !== undefined).map(a => squareName(a.scout)).sort();
  assert.deepEqual(targets, ['e5', 'f5']);
  const next = applyAction(state, request('move', 'd4', 'e4', { scout: 'f5' }));
  assert.equal(next.board[sq('e4')].count, 2);
  assert.equal(next.board[sq('f5')].revealed, true);
  assert.equal(next.board[sq('e5')].revealed, false);
  assert.equal(next.captured.length, 0);
  assert.match(next.history[0].text, /Moved d4 → e4\. Scouted f5: rook revealed/);
});

test('scouting is unavailable after captures, stationary stacking, challenges, or splitting', () => {
  const state = position({ c3: piece('pawn'), d3: piece('pawn'), f4: piece('pawn', 1, true, 2), f5: piece('rook', 2), g5: piece('bishop', 2, false) }, allOn);
  for (const action of [request('move', 'f4', 'f5', { scout: 'g5' }), request('stack', 'c3', 'd3', { scout: 'g5' }), request('challenge', 'f4', 'g5', { scout: 'g5' }), request('unstack', 'f4', 'g4', { scout: 'g5' })]) assert.throws(() => applyAction(state, action), /not legal/);
  assert.ok(getLegalActions(state).filter(a => a.scout !== undefined).every(a => a.kind === 'move' || (a.kind === 'stack' && a.step !== undefined)));
});

test('disabled flags cannot be bypassed with forged action fields, and the master switch disables every experiment', () => {
  for (const key of Object.keys(allOn)) {
    const state = position(entries(), { ...allOn, [key]: false });
    assert.throws(() => applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' })), /not legal/);
    assert.throws(() => createGame({ stack: { [key]: 'true' } }), /boolean/);
  }
  const disabled = position({ ...entries(), b3: piece('pawn', 1, true, 2) }, { ...allOn, enabled: false });
  assert.ok(getLegalActions(disabled).every(a => !['stack', 'unstack'].includes(a.kind) && a.step === undefined && a.scout === undefined));
});

test('scout highlights and public views never disclose hidden identities', () => {
  const state = position(entries(), allOn);
  const baselineActions = getLegalActions(state);
  const baselineView = publicView(state);
  for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
    state.board[sq('f5')].type = type;
    assert.deepEqual(getLegalActions(state), baselineActions);
    assert.deepEqual(publicView(state), baselineView);
  }
});

test('a scouted hidden king is never captured and receives its immediate check response', () => {
  const state = position({ c3: piece('pawn'), d4: piece('pawn'), f5: piece('king', 2, false), a1: piece('king') }, allOn);
  const next = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' }));
  assert.equal(next.board[sq('f5')].type, 'king');
  assert.equal(next.captured.length, 0);
  assert.equal(next.response.player, 2);
  assert.equal(next.actionsLeft, 1);
  assert.equal(next.result, null);
  assert.equal(isInCheck(next, 2), true);
});

test('scouting an ambushing knight grants the actor a king response', () => {
  const state = position({ c3: piece('pawn'), d4: piece('pawn'), f5: piece('knight', 2, false), h4: piece('king'), a8: piece('king', 2, false) }, allOn);
  const next = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' }));
  assert.equal(next.response.player, 1);
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.result, null);
  assert.equal(isInCheck(next, 1), true);
});

test('scouting that checks both kings preserves the actor-first response queue', () => {
  const state = position({ c3: piece('pawn'), d4: piece('pawn'), f5: piece('king', 2, false), f4: piece('king') }, allOn);
  const next = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4', scout: 'f5' }));
  assert.equal(next.response.player, 1);
  assert.equal(next.responseQueue[0].player, 2);
  const escaped = applyAction(next, request('move', 'f4', 'g3'));
  assert.equal(escaped.response.player, 2);
  assert.equal(escaped.currentPlayer, 2);
  assert.equal(escaped.result, null);
});

test('resolving an existing check before a scout ambush still grants a response', () => {
  const state = position({ a1: piece('king'), b3: piece('pawn', 1, true, 2), a8: piece('rook', 2), b2: piece('bishop', 2, false), h8: piece('king', 2, false) }, { scouting: true });
  assert.equal(isInCheck(state, 1), true);
  const next = applyAction(state, request('move', 'b3', 'a3', { scout: 'b2' }));
  assert.equal(next.response.player, 1);
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.result, null);
});

test('compound actions must leave the known king safe; the final position determines safety', () => {
  const state = position({ a1: piece('king'), a2: piece('pawn'), b2: piece('pawn'), a8: piece('rook', 2), h8: piece('king', 2, false) }, allOn);
  assert.equal(legal(state, request('stack', 'a2', 'b2')), false);
  assert.equal(legal(state, request('stack', 'a2', 'b2', { step: 'c3' })), false);
  // Combining would open the a-file, but the bonus step blocks it again.
  const next = applyAction(state, request('stack', 'a2', 'b2', { step: 'a3' }));
  assert.equal(isInCheck(next, 1), false);
  assert.equal(next.board[sq('a3')].count, 2);
});

test('stack-and-step checking a known king ends a multi-action turn', () => {
  const state = position({ c3: piece('pawn'), d4: piece('pawn'), f5: piece('king', 2), a1: piece('king') }, allOn, { actionsPerTurn: 3 });
  const next = applyAction(state, request('stack', 'c3', 'd4', { step: 'e4' }));
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.response, null);
  assert.equal(isInCheck(next, 2), true);
});

test('all eight experiment combinations preserve material and kings in seeded play', () => {
  for (let mask = 0; mask < 8; mask++) {
    let seed = 381 + mask;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
    let state = createGame({ stack: { anyAdjacent: Boolean(mask & 1), stackAndStep: Boolean(mask & 2), scouting: Boolean(mask & 4) } }, random);
    for (let step = 0; step < 200 && !state.result; step++) {
      const options = getLegalActions(state);
      assert.ok(options.length);
      state = applyAction(state, options[Math.floor(random() * options.length)]);
      assert.equal(state.board.reduce((n, p) => n + (p?.count || 0), 0) + state.captured.reduce((n, p) => n + p.count, 0), 32);
      assert.equal(state.board.filter(p => p?.type === 'king').length, 2);
      assert.ok(state.captured.every(p => p.type !== 'king'));
    }
  }
});
