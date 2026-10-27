import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { positionKey } from '../src/rules/outcome.js';
import { GOALS } from '../src/rules/chaos.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = true, count = 1) => ({ type, owner, revealed, count, moved: true });
function seeded(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function position(entries, goal, chaos = {}) {
  const state = createGame({ chaos: { enabled: true, ...chaos } }, seeded());
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.chaos.goal = goal;
  state.chaos.recent = [goal];
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
const act = (state, kind, from, to) => applyAction(state, { kind, ...(from ? { from: sq(from) } : {}), ...(to ? { to: sq(to) } : {}) });
const kings = { h1: piece('king', 1, false), h8: piece('king', 2, false) };

test("Owen's Rules default off, validate, and keep seeded armies unchanged", () => {
  assert.equal(createGame().chaos, undefined);
  assert.equal(publicView(createGame()).chaos, null);
  assert.throws(() => createGame({ chaos: { enabled: 'yes' } }), /boolean/);
  assert.throws(() => createGame({ chaos: { nuhUhChance: 2 } }), /0 to 1/);
  assert.throws(() => createGame({ chaos: { crownsToWin: 0 } }), /integer/);
  const plain = createGame({}, seeded(3));
  const owen = createGame({ chaos: { enabled: true } }, seeded(3));
  assert.deepEqual(owen.board, plain.board);
  assert.ok(GOALS.some(goal => goal.id === owen.chaos.goal));
  assert.deepEqual(owen.chaos.crowns, { 1: 0, 2: 0 });
});

test('finishing a board goal awards a crown and draws a different goal immediately', () => {
  const state = position({ ...kings, a5: piece('rook'), b5: piece('rook'), c5: piece('knight'), h2: piece('bishop') }, 'sleepover', { nuhUhChance: 0 });
  assert.equal(publicView(state).chaos.progress[1], 3);
  assert.equal(publicView(state).chaos.near[1], true);
  const snapshot = structuredClone(state);
  const next = act(state, 'move', 'h2', 'g3');
  assert.equal(next.chaos.crowns[1], 0, 'g3 is still on your own half');
  assert.equal(next.chaos.goal, 'sleepover');
  const done = act(state, 'move', 'h2', 'e5');
  assert.deepEqual(state, snapshot);
  assert.equal(done.chaos.crowns[1], 1);
  assert.notEqual(done.chaos.goal, 'sleepover');
  assert.equal(done.chaos.events[0].type, 'crown');
  assert.equal(done.chaos.events[0].player, 1);
  assert.ok(done.history.some(item => item.player === null && /finished Sleepover!/.test(item.text)));
});

test('tally goals count only events after the goal appears, and reaching the crown total wins', () => {
  const state = position({ ...kings, a1: piece('rook'), a5: piece('queen', 2) }, 'snack', { crownsToWin: 1 });
  const next = act(state, 'move', 'a1', 'a5');
  assert.equal(next.result.winner, 1);
  assert.match(next.result.reason, /Owen’s crowns/);
  assert.equal(next.chaos.events.find(e => e.type === 'crown').final, true);
});

test('a near player can be robbed by “No! You play like this!” as the turn passes, and earns a Not Fair token', () => {
  const entries = { ...kings, a5: piece('rook'), b5: piece('rook'), c5: piece('knight'), g1: piece('bishop'), a8: piece('rook', 2) };
  const robbed = act(position(entries, 'sleepover', { nuhUhChance: 1 }), 'move', 'g1', 'h2');
  assert.notEqual(robbed.chaos.goal, 'sleepover');
  assert.equal(robbed.chaos.tokens[1], 1);
  assert.equal(robbed.chaos.events[0].type, 'nuh-uh');
  assert.deepEqual(robbed.chaos.events[0].robbed, [1]);
  const safe = act(position(entries, 'sleepover', { nuhUhChance: 0 }), 'move', 'g1', 'h2');
  assert.equal(safe.chaos.goal, 'sleepover');
  assert.equal(safe.chaos.tokens[1], 0);
});

test('Owen gets bored after the countdown, never picking a goal someone is already close to', () => {
  let state = position({ ...kings, a1: piece('rook'), a8: piece('rook', 2), b5: piece('rook'), c5: piece('rook') }, 'knock', { boredTurns: 2, nuhUhChance: 0 });
  assert.equal(publicView(state).chaos.turnsLeft, 2);
  state = act(state, 'move', 'a1', 'a2');
  assert.equal(state.chaos.goal, 'knock');
  assert.equal(publicView(state).chaos.turnsLeft, 1);
  state = act(state, 'move', 'a8', 'a7');
  assert.notEqual(state.chaos.goal, 'knock');
  assert.equal(state.chaos.events[0].type, 'bored');
  assert.equal(publicView(state).chaos.turnsLeft, 2);
  for (let seed = 0; seed < 40; seed++) {
    let close = position({ ...kings, a1: piece('rook'), a8: piece('rook', 2), b5: piece('rook'), c5: piece('rook'), d5: piece('rook') }, 'knock', { boredTurns: 2, nuhUhChance: 0 });
    close.chaos.goalTurn = 0;
    close.chaos.seed = seed;
    close = act(close, 'move', 'a1', 'a2');
    assert.equal(close.chaos.events[0].type, 'bored');
    assert.notEqual(close.chaos.goal, 'sleepover', 'Player 1 is already one piece away');
  }
});

test('Not Fair tokens redraw or lock the goal as a free side action, once per turn', () => {
  const state = position({ ...kings, a1: piece('rook'), a8: piece('rook', 2) }, 'knock', { boredTurns: 2, nuhUhChance: 1 });
  state.chaos.tokens[1] = 2;
  const kinds = getLegalActions(state).map(a => a.kind);
  assert.ok(kinds.includes('goal-redraw') && kinds.includes('goal-lock'));
  assert.ok(!kinds.includes('end-turn'));

  const redrawn = applyAction(state, { kind: 'goal-redraw' });
  assert.notEqual(redrawn.chaos.goal, 'knock');
  assert.equal(redrawn.chaos.tokens[1], 1);
  assert.equal(redrawn.currentPlayer, 1);
  assert.equal(redrawn.actionsLeft, 1);
  assert.equal(redrawn.turnActivity, false);
  assert.ok(!getLegalActions(redrawn).some(a => a.kind.startsWith('goal-')), 'one token per turn');

  let locked = applyAction(state, { kind: 'goal-lock' });
  assert.equal(publicView(locked).chaos.locked, true);
  locked = act(locked, 'move', 'a1', 'a2');
  locked = act(locked, 'move', 'a8', 'a7');
  assert.equal(locked.chaos.goal, 'knock', 'protected through the next turn although Owen is bored');
  locked = act(locked, 'move', 'a2', 'a3');
  assert.notEqual(locked.chaos.goal, 'knock', 'the promise ends after your next turn');
});

test('redrawing your own nearly finished goal does not refund a token', () => {
  const state = position({ ...kings, a5: piece('rook'), b5: piece('rook'), c5: piece('knight'), g1: piece('bishop') }, 'sleepover');
  state.chaos.tokens[1] = 1;
  const next = applyAction(state, { kind: 'goal-redraw' });
  assert.equal(next.chaos.tokens[1], 0);
});

test('goal progress counts revealed pieces only, and stalemate ignores token actions', () => {
  const hidden = position({ ...kings, a5: piece('rook', 1, false), b5: piece('rook', 1, false), c5: piece('rook') }, 'sleepover');
  assert.equal(publicView(hidden).chaos.progress[1], 1);
  const stuck = position({ a8: piece('king', 2), b6: piece('queen'), h1: piece('king') }, 'knock');
  stuck.currentPlayer = 2;
  stuck.chaos.tokens[2] = 1;
  assert.deepEqual(getLegalActions(stuck), []);
});

test('seeded random play with Owen’s Rules stays legal and replayable', () => {
  const run = seed => {
    const random = seeded(seed);
    let state = createGame({ chaos: { enabled: true } }, random);
    for (let i = 0; i < 400 && !state.result; i++) {
      const actions = getLegalActions(state);
      state = applyAction(state, actions[Math.floor(random() * actions.length)]);
      assert.ok(GOALS.some(goal => goal.id === state.chaos.goal));
      assert.ok(state.chaos.tokens[1] <= 3 && state.chaos.tokens[2] <= 3);
    }
    return state;
  };
  for (const seed of [1, 2, 3, 4, 5]) assert.deepEqual(run(seed).chaos, run(seed).chaos);
});

test('a big catch gives one Sugar Rush per turn, and every fourth toy pays a Not Fair token', () => {
  const state = position({ ...kings, a1: piece('rook'), a5: piece('knight', 2), c1: piece('rook'), c6: piece('bishop', 2), a8: piece('rook', 2) }, 'knock', { nuhUhChance: 0 });
  state.captured = [piece('pawn', 2), piece('pawn', 2), piece('pawn', 2)];
  const snapshot = structuredClone(state);
  const rush = act(state, 'move', 'a1', 'a5');
  assert.deepEqual(state, snapshot);
  assert.equal(rush.currentPlayer, 1, 'the extra action keeps the turn');
  assert.equal(rush.actionsLeft, 1);
  assert.deepEqual(rush.chaos.events.map(e => e.type), ['capture', 'toy-token', 'sugar']);
  assert.equal(rush.chaos.tokens[1], 1);
  assert.deepEqual(rush.chaos.events[0].toys, [{ type: 'knight', count: 1, owner: 2 }]);
  const second = act(rush, 'move', 'c1', 'c6');
  assert.equal(second.currentPlayer, 2, 'only one Sugar Rush per turn');
  assert.ok(!second.chaos.events.some(e => e.type === 'sugar'));
  assert.equal(second.chaos.tokens[1], 1);
});

test('pawn captures fill the Toy Box without a Sugar Rush, and pawns stack with the pawn in front', () => {
  const state = position({ ...kings, d4: piece('pawn'), e5: piece('pawn', 2), d3: piece('pawn') }, 'knock', { nuhUhChance: 0 });
  const next = act(state, 'move', 'd4', 'e5');
  assert.equal(next.currentPlayer, 2);
  assert.deepEqual(next.chaos.events.map(e => e.type), ['capture']);
  const stacking = getLegalActions(state).filter(a => a.kind === 'stack');
  assert.ok(stacking.some(a => a.from === sq('d3') && a.to === sq('d4')));
  assert.ok(!getLegalActions(position({ ...kings, d4: piece('pawn'), d3: piece('pawn') }, 'knock')).some(a => a.kind === 'stack' && a.from === sq('d4') && a.to === sq('d5')));
});
