import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView, isPreparationResponse } from '../src/engine.js';
import { index, squareName } from '../src/board.js';
import { ARMY } from '../src/rules/setup.js';
import { isExposed } from '../src/rules/exposure.js';
import { isInCheck } from '../src/rules/king.js';
import { attackedSquares } from '../src/rules/movement.js';
import { positionKey } from '../src/rules/outcome.js';

const sq = name => index(8 - Number(name[1]), 'abcdefgh'.indexOf(name[0]));
const piece = (type, owner = 1, revealed = true, extra = {}) => ({ type, owner, revealed, count: 1, moved: true, ...extra });
function position(entries, overrides = {}, player = 1) {
  const state = createGame(overrides);
  state.board.fill(null);
  for (const [name, value] of Object.entries(entries)) state.board[sq(name)] = value;
  state.currentPlayer = player;
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
const actions = (state, name) => getLegalActions(state).filter(a => a.from === sq(name));
const destinations = (state, name, kind = 'move') => actions(state, name).filter(a => a.kind === kind).map(a => squareName(a.to)).sort();
function act(state, kind, from, to) {
  const action = getLegalActions(state).find(a => a.kind === kind && (from === undefined || a.from === sq(from)) && (to === undefined || a.to === sq(to)));
  assert.ok(action, `Expected ${kind} ${from || ''} ${to || ''}`);
  return applyAction(state, action);
}
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test('each shuffled army has 16 pieces in the first four files and its own corner', () => {
  const state = createGame({}, seeded(10));
  for (const owner of [1, 2]) {
    const army = state.board.filter(p => p?.owner === owner);
    assert.equal(army.length, 16);
    assert.deepEqual(army.map(p => p.type).sort(), [...ARMY].sort());
    assert.ok(army.every(p => !p.revealed));
  }
  for (let s = 0; s < 64; s++) {
    if (s % 8 >= 4) assert.equal(state.board[s], null);
    else assert.equal(state.board[s].owner, Math.floor(s / 8) >= 4 ? 1 : 2);
  }
  assert.notDeepEqual(state.board, createGame({}, seeded(11)).board);
});

test('exactly four tiles in file d are initially exposed for each player', () => {
  const state = createGame();
  assert.deepEqual([...new Set(getLegalActions(state).map(a => squareName(a.from)))].sort(), ['d1', 'd2', 'd3', 'd4']);
  assert.equal(getLegalActions(state).length, 16);
  state.currentPlayer = 2;
  assert.deepEqual([...new Set(getLegalActions(state).map(a => squareName(a.from)))].sort(), ['d5', 'd6', 'd7', 'd8']);
  assert.equal(getLegalActions(state).length, 16);
});

test('revealing slides the tile right, flips it, and exposes the next layer', () => {
  const state = createGame();
  assert.equal(isExposed(state, sq('c4')), false);
  const originalType = state.board[sq('d4')].type;
  const next = act(state, 'reveal', 'd4', 'e4');
  assert.equal(next.board[sq('d4')], null);
  assert.equal(next.board[sq('e4')].type, originalType);
  assert.equal(next.board[sq('e4')].revealed, true);
  assert.equal(next.board[sq('e4')].moved, true);
  assert.equal(isExposed(next, sq('c4')), true);
  assert.equal(next.currentPlayer, 2);
});

test('alternate exposure permits leftward reveals but never vertical ones or board edges', () => {
  const state = position({ a1: piece('rook', 1, false), b1: piece('pawn') }, { exposure: { mode: 'either-horizontal' } });
  assert.equal(isExposed(state, sq('a1')), false);
  state.board[sq('b1')] = null;
  assert.equal(isExposed(state, sq('a1')), true);
  const left = position({ b2: piece('rook', 1, false), c2: piece('pawn') }, { exposure: { mode: 'either-horizontal' } });
  assert.deepEqual(destinations(left, 'b2', 'reveal'), ['a2']);
});

test('every hidden type shares the same opening options, then uses its revealed movement', () => {
  for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
    const state = position({ d4: piece(type, 1, false), a8: piece('king', 2, false) }, { turn: { actionsPerTurn: 2 } });
    assert.deepEqual(destinations(state, 'd4', 'reveal'), ['c4', 'd5', 'e4', 'f4', 'g4', 'h4']);
    assert.ok(actions(state, 'd4').every(a => a.kind === 'reveal'));
    const next = act(state, 'reveal', 'd4', 'e4');
    assert.ok(actions(next, 'e4').every(a => a.kind !== 'reveal'));
    if (type === 'bishop') assert.ok(!destinations(next, 'e4').includes('f4'));
    if (type === 'knight') assert.ok(destinations(next, 'e4').includes('f6'));
    if (type === 'pawn') assert.deepEqual(destinations(next, 'e4'), ['e5']);
  }
});

test('revealing a blocker must keep the known king safe, including a forward reveal', () => {
  const state = position({ a1: piece('king'), a2: piece('bishop', 1, false), a8: piece('rook', 2), h8: piece('king', 2) });
  assert.equal(isExposed(state, sq('a2')), true);
  assert.deepEqual(destinations(state, 'a2', 'reveal'), ['a3']);
});

test('hidden tiles cannot move or attack', () => {
  const state = position({ d4: piece('queen', 1, false) });
  assert.deepEqual(attackedSquares(state, sq('d4')), []);
  assert.ok(actions(state, 'd4').length > 0);
  assert.ok(actions(state, 'd4').every(a => a.kind === 'reveal'));
});

test('rook rays stop at either army and challenge a hidden enemy without seeing its type', () => {
  const state = position({ d4: piece('rook'), d6: piece('pawn'), f4: piece('king', 2, false) });
  assert.ok(destinations(state, 'd4').includes('d5'));
  assert.ok(!destinations(state, 'd4').includes('d7'));
  assert.deepEqual(destinations(state, 'd4', 'challenge'), ['f4']);
  assert.ok(!destinations(state, 'd4').includes('g4'));
});

test('bishop and queen follow diagonals without wrapping', () => {
  const state = position({ a1: piece('bishop'), h1: piece('queen') });
  assert.deepEqual(destinations(state, 'a1'), ['b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8']);
  assert.ok(destinations(state, 'h1').includes('h8'));
  assert.ok(destinations(state, 'h1').includes('a8'));
});

test('knights can jump over occupied tiles', () => {
  const state = position({ a1: piece('knight'), a2: piece('pawn'), b1: piece('pawn'), b2: piece('pawn') });
  assert.deepEqual(destinations(state, 'a1'), ['b3', 'c2']);
});

test('pawns move in opposite rank directions and capture only diagonally', () => {
  let state = position({ c3: piece('pawn'), b4: piece('rook', 2), d4: piece('bishop', 2, false), c5: piece('pawn', 2) });
  assert.deepEqual(destinations(state, 'c3'), ['b4', 'c4']);
  assert.deepEqual(destinations(state, 'c3', 'challenge'), ['d4']);
  state.currentPlayer = 2;
  assert.deepEqual(destinations(state, 'c5'), ['c4']);
});

test('pawns promote on the far rank and cannot advance through a blocker', () => {
  const state = position({ g7: piece('pawn'), a2: piece('pawn'), a3: piece('rook', 2), h8: piece('king', 2, false) });
  assert.deepEqual(destinations(state, 'a2'), []);
  const next = act(state, 'move', 'g7', 'g8');
  assert.equal(next.board[sq('g8')].type, 'queen');
  assert.match(next.history.at(-1).text, /Promoted to queen/);
});

test('a challenge flips but captures and relocates neither tile', () => {
  const state = position({ d4: piece('rook'), f4: piece('pawn', 2, false), a8: piece('king', 2, false) });
  const next = act(state, 'challenge', 'd4', 'f4');
  assert.equal(next.board[sq('d4')].type, 'rook');
  assert.equal(next.board[sq('f4')].revealed, true);
  assert.equal(next.captured.length, 0);
  assert.equal(next.currentPlayer, 2);
});

test('legal actions and public views cannot distinguish hidden identities', () => {
  const state = position({ d4: piece('rook'), a1: piece('king'), f4: piece('pawn', 2, false) });
  const baselineActions = getLegalActions(state);
  const baselineView = publicView(state);
  for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
    state.board[sq('f4')].type = type;
    assert.deepEqual(getLegalActions(state), baselineActions);
    assert.deepEqual(publicView(state), baselineView);
  }
  assert.deepEqual(baselineView.board[sq('f4')], { owner: 2, revealed: false });
});

test('hidden kings are not checked or captured by a challenge', () => {
  const state = position({ d4: piece('rook'), f4: piece('king', 2, false) });
  assert.equal(isInCheck(state, 2), false);
  const next = act(state, 'challenge', 'd4', 'f4');
  assert.equal(next.board[sq('f4')].type, 'king');
  assert.equal(next.captured.length, 0);
  assert.equal(isInCheck(next, 2), true);
  assert.equal(next.response.player, 2);
  assert.equal(next.result, null);
});

test('revealed kings are threatened but never capture destinations', () => {
  const state = position({ d4: piece('rook'), f4: piece('king', 2) });
  assert.equal(isInCheck(state, 2), true);
  assert.ok(!actions(state, 'd4').some(a => a.to === sq('f4')));
});

test('revealing your king in check grants an immediate response, then passes normally', () => {
  const state = position({ e4: piece('king', 1, false), f8: piece('rook', 2), a8: piece('king', 2) });
  const revealed = act(state, 'reveal', 'e4');
  assert.equal(revealed.currentPlayer, 1);
  assert.equal(revealed.response.player, 1);
  assert.equal(revealed.actionsLeft, 1);
  assert.equal(revealed.result, null);
  assert.equal(revealed.board[sq('e4')], null);
  const escaped = act(revealed, 'move', 'f4', 'g4');
  assert.equal(escaped.response, null);
  assert.equal(escaped.currentPlayer, 2);
  assert.equal(isInCheck(escaped, 1), false);
});

test('a trapped revealed king gets one preparation action before losing', () => {
  const state = position({ e4: piece('king', 1, false), a1: piece('knight'), e8: piece('rook', 2), f8: piece('rook', 2), g8: piece('rook', 2), h8: piece('king', 2) });
  const next = act(state, 'reveal', 'e4');
  assert.equal(isPreparationResponse(next), true);
  assert.equal(next.result, null);
  const prepared = act(next, 'move', 'a1', 'b3');
  assert.equal(prepared.result.winner, 2);
  assert.equal(getLegalActions(prepared).length, 0);
});

test('a challenge ambush gives the acting king a response without leaking legality', () => {
  const state = position({ a1: piece('king'), c1: piece('rook'), c2: piece('knight', 2, false), h8: piece('king', 2) });
  const baseline = getLegalActions(state);
  state.board[sq('c2')].type = 'pawn';
  assert.deepEqual(getLegalActions(state), baseline);
  state.board[sq('c2')].type = 'knight';
  const next = act(state, 'challenge', 'c1', 'c2');
  assert.equal(next.response.player, 1);
  assert.equal(next.currentPlayer, 1);
  assert.equal(isInCheck(next, 1), true);
});

test('challenging adjacent kings responds with the acting king first', () => {
  const state = position({ e4: piece('king'), f4: piece('king', 2, false) });
  const next = act(state, 'challenge', 'e4', 'f4');
  assert.equal(next.response.player, 1);
  assert.equal(next.responseQueue[0].player, 2);
  const escaped = act(next, 'move', 'e4', 'd4');
  assert.equal(escaped.currentPlayer, 2);
  assert.equal(escaped.response, null);
  assert.equal(escaped.result, null);
});

test('a pinned piece cannot expose its revealed king', () => {
  const state = position({ a1: piece('king'), a2: piece('rook'), a8: piece('rook', 2), h8: piece('king', 2) });
  assert.ok(destinations(state, 'a2').includes('a3'));
  assert.ok(!destinations(state, 'a2').includes('b2'));
});

test('ordinary check requires resolving it; unrelated reveals are illegal', () => {
  const state = position({ a1: piece('king'), a8: piece('rook', 2), d4: piece('pawn', 1, false), h8: piece('king', 2) });
  assert.equal(isInCheck(state, 1), true);
  assert.deepEqual(actions(state, 'd4'), []);
  assert.ok(destinations(state, 'a1').includes('b1'));
});

test('side-by-side pawns stack and unstack without losing material', () => {
  const state = position({ c3: piece('pawn'), d3: piece('pawn'), h8: piece('king', 2, false) }, { turn: { actionsPerTurn: 2 } });
  const stacked = act(state, 'stack', 'c3', 'd3');
  assert.equal(stacked.board[sq('c3')], null);
  assert.equal(stacked.board[sq('d3')].count, 2);
  const split = act(stacked, 'unstack', 'd3', 'e3');
  assert.equal(split.board[sq('d3')].count, 1);
  assert.equal(split.board[sq('e3')].count, 1);
  assert.equal(split.captured.length, 0);
});

test('hidden or diagonally adjacent pawns cannot stack; stacks cap at two', () => {
  const state = position({ c3: piece('pawn'), d3: piece('pawn', 1, false), b4: piece('pawn'), c4: piece('pawn', 1, true, { count: 2 }) });
  assert.equal(actions(state, 'c3').some(a => a.kind === 'stack'), false);
});

test('stacks move one square in all eight directions for either player', () => {
  for (const owner of [1, 2]) {
    const state = position({ d4: piece('pawn', owner, true, { count: 2 }) }, {}, owner);
    assert.deepEqual(destinations(state, 'd4'), ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5']);
    assert.deepEqual(attackedSquares(state, sq('d4')).map(squareName).sort(), destinations(state, 'd4'));
    for (const to of destinations(state, 'd4')) {
      const next = act(state, 'move', 'd4', to);
      assert.equal(next.board[sq('d4')], null);
      assert.equal(next.board[sq(to)].count, 2);
      assert.equal(next.board[sq(to)].owner, owner);
      assert.equal(next.currentPlayer, owner === 1 ? 2 : 1);
    }
  }
});

test('a stack captures on only one adjacent square and cannot leap over it', () => {
  const state = position({ c3: piece('pawn', 1, true, { count: 2 }), d4: piece('bishop', 2), e5: piece('rook', 2), h8: piece('king', 2, false) });
  assert.equal(actions(state, 'c3').some(a => a.to === sq('e5')), false);
  assert.throws(() => applyAction(state, { kind: 'leap', from: sq('c3'), to: sq('e5'), over: sq('d4') }), /not legal/);
  const next = act(state, 'move', 'c3', 'd4');
  assert.equal(next.board[sq('c3')], null);
  assert.equal(next.board[sq('d4')].count, 2);
  assert.equal(next.board[sq('e5')].type, 'rook');
  assert.equal(next.captured.length, 1);
});

test('stacks capture or challenge in every direction without revealing hidden identities in highlights', () => {
  for (const owner of [1, 2]) {
    const enemy = owner === 1 ? 2 : 1;
    for (const to of ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5']) {
      const state = position({ d4: piece('pawn', owner, true, { count: 2 }), [to]: piece('rook', enemy) }, {}, owner);
      const next = act(state, 'move', 'd4', to);
      assert.equal(next.captured.length, 1);
      assert.equal(next.board[sq(to)].count, 2);
      state.board[sq(to)].revealed = false;
      const baseline = actions(state, 'd4');
      state.board[sq(to)].type = 'king';
      assert.deepEqual(actions(state, 'd4'), baseline);
      const challenged = act(state, 'challenge', 'd4', to);
      assert.equal(challenged.board[sq('d4')].count, 2);
      assert.equal(challenged.board[sq(to)].revealed, true);
      assert.equal(challenged.captured.length, 0);
      assert.equal(challenged.response.player, enemy);
    }
  }
});

test('stacks block on friendlies and threaten adjacent kings without capturing them', () => {
  const state = position({ c3: piece('pawn', 1, true, { count: 2 }), c4: piece('rook'), b2: piece('king', 2) });
  assert.equal(destinations(state, 'c3').includes('c4'), false);
  assert.equal(actions(state, 'c3').some(a => a.to === sq('b2')), false);
  assert.equal(isInCheck(state, 2), true);
});

test('stack movement must protect its own king, but the stack itself is not royal', () => {
  const state = position({ a2: piece('pawn', 1, true, { count: 2 }), a1: piece('king'), a8: piece('rook', 2), h8: piece('king', 2) });
  assert.equal(isInCheck(state, 1), false);
  assert.deepEqual(destinations(state, 'a2'), ['a3']);
  const nonRoyal = position({ d4: piece('pawn', 1, true, { count: 2 }), a1: piece('king'), e8: piece('rook', 2), h8: piece('king', 2) });
  assert.ok(destinations(nonRoyal, 'd4').includes('e5'), 'A stack may enter an attacked square');
});

test('stacking can still be disabled without enabling legacy jump rules', () => {
  const state = position({ c3: piece('pawn'), d3: piece('pawn') }, { stack: { enabled: false } });
  assert.equal(actions(state, 'c3').some(a => a.kind === 'stack'), false);
  assert.throws(() => createGame({ stack: { leap: true } }), /Unknown rule/);
});

test('unstacking can block check while preserving the original pawn', () => {
  const state = position({ a1: piece('king'), b4: piece('pawn', 1, true, { count: 2 }), a8: piece('rook', 2), h8: piece('king', 2) });
  assert.equal(isInCheck(state, 1), true);
  const next = act(state, 'unstack', 'b4', 'a4');
  assert.equal(isInCheck(next, 1), false);
  assert.equal(next.board[sq('b4')].count, 1);
  assert.equal(next.board[sq('a4')].count, 1);
});

test('capturing a stack accounts for two captured tiles', () => {
  const state = position({ a1: piece('rook'), a4: piece('pawn', 2, true, { count: 2 }), h8: piece('king', 2, false) });
  const next = act(state, 'move', 'a1', 'a4');
  assert.equal(next.captured[0].count, 2);
  assert.equal(next.board[sq('a4')].type, 'rook');
});

test('stacks can reach any edge without wrapping or promoting until unstacked', () => {
  for (const [owner, from, to, exits] of [[1, 'a7', 'a8', ['a7', 'b7', 'b8']], [2, 'h2', 'h1', ['g1', 'g2', 'h2']]]) {
    let state = position({ [from]: piece('pawn', owner, true, { count: 2 }) }, { turn: { actionsPerTurn: 2 } }, owner);
    state = act(state, 'move', from, to);
    assert.equal(state.board[sq(to)].type, 'pawn');
    assert.equal(state.board[sq(to)].count, 2);
    assert.deepEqual(destinations(state, to), exits);
    const next = act(state, 'unstack', to, from);
    assert.equal(next.board[sq(to)].type, 'queen');
    assert.equal(next.board[sq(from)].type, 'pawn');
    assert.equal(next.board[sq(to)].count + next.board[sq(from)].count, 2);
  }
});

test('unstacking onto the far rank still promotes the separated pawn', () => {
  const state = position({ c7: piece('pawn', 1, true, { count: 2 }), h8: piece('king', 2, false) });
  const next = act(state, 'unstack', 'c7', 'c8');
  assert.equal(next.board[sq('c8')].type, 'queen');
  assert.equal(next.board[sq('c7')].type, 'pawn');
});

test('multi-action turns and free reveals are independent options', () => {
  let state = position({ d3: piece('rook', 1, false), a8: piece('king', 2, false) }, { turn: { actionsPerTurn: 2, revealCostsAction: false } });
  state = act(state, 'reveal', 'd3');
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.actionsLeft, 2);
  state = act(state, 'move', 'e3', 'f3');
  assert.equal(state.actionsLeft, 1);
  assert.equal(state.currentPlayer, 1);
  state = act(state, 'end-turn');
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.actionsLeft, 2);
});

test('giving check ends a multi-action turn immediately', () => {
  const state = position({ a1: piece('rook'), h8: piece('king', 2), a2: piece('king') }, { turn: { actionsPerTurn: 3 } });
  const next = act(state, 'move', 'a1', 'h1');
  assert.equal(next.currentPlayer, 2);
  assert.equal(isInCheck(next, 2), true);
});

test('ordinary checkmate wins without capturing a king', () => {
  const state = position({ c6: piece('king'), b6: piece('queen'), a8: piece('king', 2) });
  const next = act(state, 'move', 'b6', 'b7');
  assert.deepEqual(next.result, { winner: 1, reason: 'Checkmate' });
  assert.equal(next.board[sq('a8')].type, 'king');
});

test('no actions without check is stalemate', () => {
  const state = position({ c6: piece('king'), b6: piece('queen'), a8: piece('king', 2) });
  const next = act(state, 'move', 'c6', 'c7');
  assert.equal(next.result.winner, null);
  assert.match(next.result.reason, /Stalemate/);
});

test('threefold repetition and the quiet-action limit prevent endless games', () => {
  let state = position({ a1: piece('king'), h8: piece('king', 2) });
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const [from, to] of [['a1', 'b1'], ['h8', 'g8'], ['b1', 'a1'], ['g8', 'h8']]) state = act(state, 'move', from, to);
  }
  assert.match(state.result.reason, /repetition/);
  const quiet = position({ a1: piece('king'), h8: piece('king', 2) }, { outcome: { quietActionLimit: 1 } });
  assert.match(act(quiet, 'move', 'a1', 'b1').result.reason, /quiet actions/);
});

test('applying an action is immutable; malformed actions are rejected', () => {
  const state = createGame({}, seeded(7));
  const snapshot = structuredClone(state);
  applyAction(state, getLegalActions(state)[0]);
  assert.deepEqual(state, snapshot);
  assert.throws(() => applyAction(state, { kind: 'move', from: sq('a1'), to: sq('h8') }), /not legal/);
});

test('seeded legal play preserves tile totals and both kings across rule variants', () => {
  for (const overrides of [{}, { turn: { actionsPerTurn: 2, revealCostsAction: false } }, { exposure: { mode: 'either-horizontal' }, stack: { enabled: false } }]) {
    const random = seeded(2026);
    let state = createGame(overrides, random);
    for (let step = 0; step < 250 && !state.result; step++) {
      const legal = getLegalActions(state);
      assert.ok(legal.length, 'A live game must offer at least one action');
      state = applyAction(state, legal[Math.floor(random() * legal.length)]);
      const tiles = state.board.reduce((sum, p) => sum + (p?.count || 0), 0) + state.captured.reduce((sum, p) => sum + p.count, 0);
      assert.equal(tiles, 32);
      assert.equal(state.board.filter(p => p?.type === 'king').length, 2);
      assert.equal(state.captured.some(p => p.type === 'king'), false);
    }
  }
});
