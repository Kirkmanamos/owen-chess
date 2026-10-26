import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, getLegalActions, randomLayout, viewFor, defenseStrength } from '../../crown/src/engine.js';
import { HOME, THRONE, ARMY, LAND_STACK, SQUARES, SETTINGS, index } from '../../crown/src/rules.js';

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const LAYOUT = ['crown', 'champion', 'guard', 'guard', 'scout', 'scout', 'archer', 'builder', 'assassin', null];
const started = (random = seeded(1)) => applyAction(applyAction(createGame({ random }), { kind: 'place', layout: LAYOUT }), { kind: 'place', layout: LAYOUT });

// An empty battlefield of plains for focused scenarios; Player 1 to act.
function arena(units, land = {}) {
  const state = started();
  state.units.fill(null);
  state.land.fill('plains');
  for (const [square, type] of Object.entries(land)) state.land[square] = type;
  let id = 100;
  for (const [square, unit] of Object.entries(units)) state.units[square] = { id: id++, revealed: true, ...unit };
  state.phase = 'act';
  state.currentPlayer = 1;
  return state;
}
const sq = (row, col) => index(row, col);
const crowns = { [sq(10, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } };

test('a new game has homes, the Throne, a full land stack and hands of two', () => {
  const state = createGame({ random: seeded(3) });
  assert.equal(state.land.filter(Boolean).length, 21);
  assert.equal(state.land[THRONE], 'throne');
  assert.equal(state.stack.length + state.hands[1].length + state.hands[2].length, LAND_STACK.length);
  assert.equal(state.hands[1].length, 2);
  assert.equal(state.phase, 'setup');
  assert.equal(ARMY.length, 9);
});

test('players place their own armies, then Player 1 starts by building', () => {
  const state = started();
  assert.equal(state.units.filter(Boolean).length, 18);
  assert.equal(state.units[HOME[1][0]].type, 'crown');
  assert.equal(state.phase, 'build');
  assert.equal(state.currentPlayer, 1);
  assert.ok(getLegalActions(state).every(a => a.kind === 'build'));
  assert.throws(() => applyAction(createGame(), { kind: 'place', layout: ['crown', ...Array(9).fill(null)] }), /whole army/);
  assert.equal(randomLayout(seeded(2)).filter(Boolean).length, 9);
});

test('land must touch existing land; Player 2 lays two tiles on the first turn', () => {
  let state = started();
  const spots = new Set(getLegalActions(state).map(a => a.at));
  assert.ok(spots.has(sq(8, 3)) && !spots.has(sq(7, 3)));
  const tile = state.hands[1][0];
  state = applyAction(state, { kind: 'build', tile, at: sq(8, 3) });
  assert.equal(state.land[sq(8, 3)], tile);
  assert.equal(state.hands[1].length, 2);
  assert.equal(state.phase, 'act');
  state = applyAction(state, { kind: 'reveal', at: HOME[1][1] });
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.buildsLeft, 2);
  state = applyAction(state, { kind: 'build', tile: state.hands[2][0], at: sq(2, 3) });
  assert.equal(state.phase, 'build');
  state = applyAction(state, { kind: 'build', tile: state.hands[2][0], at: sq(3, 3) });
  assert.equal(state.phase, 'act');
});

test('hidden units move one square; revealed scouts move two; rivers and gaps block', () => {
  const state = arena({ ...crowns, [sq(5, 1)]: { owner: 1, type: 'guard', revealed: false }, [sq(5, 5)]: { owner: 1, type: 'scout' } }, { [sq(4, 5)]: 'river', [sq(6, 1)]: null });
  const moves = from => getLegalActions(state).filter(a => a.kind === 'move' && a.from === from).map(a => a.to).sort((a, b) => a - b);
  assert.deepEqual(moves(sq(5, 1)), [sq(4, 1), sq(5, 0), sq(5, 2)]);
  assert.ok(!moves(sq(5, 5)).includes(sq(4, 5)) && !moves(sq(5, 5)).includes(sq(3, 5)));
  assert.ok(moves(sq(5, 5)).includes(sq(7, 5)) && moves(sq(5, 5)).includes(sq(4, 4)));
});

test('only revealed units attack, and the higher strength wins and advances', () => {
  const state = arena({ ...crowns, [sq(5, 2)]: { owner: 1, type: 'champion' }, [sq(5, 3)]: { owner: 2, type: 'guard', revealed: false }, [sq(6, 3)]: { owner: 1, type: 'guard', revealed: false } });
  assert.ok(!getLegalActions(state).some(a => a.kind === 'attack' && a.from === sq(6, 3)));
  const next = applyAction(state, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
  assert.equal(next.units[sq(5, 3)].type, 'champion');
  assert.equal(next.units[sq(5, 2)], null);
  assert.equal(next.currentPlayer, 2);
});

test('hills and revealed guards add defense; ties remove both units', () => {
  const state = arena({ ...crowns, [sq(5, 2)]: { owner: 1, type: 'guard' }, [sq(5, 3)]: { owner: 2, type: 'scout' }, [sq(4, 3)]: { owner: 2, type: 'guard' } }, { [sq(5, 3)]: 'hill' });
  assert.equal(defenseStrength(state, sq(5, 3)), 4);
  const lost = applyAction(state, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
  assert.equal(lost.units[sq(5, 2)], null);
  assert.equal(lost.units[sq(5, 3)].type, 'scout');
  const even = arena({ ...crowns, [sq(5, 2)]: { owner: 1, type: 'guard' }, [sq(5, 3)]: { owner: 2, type: 'guard', revealed: false } });
  const tie = applyAction(even, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
  assert.equal(tie.units[sq(5, 2)], null);
  assert.equal(tie.units[sq(5, 3)], null);
});

test('the assassin always beats the Champion, and capturing the Crown wins', () => {
  const state = arena({ ...crowns, [sq(5, 2)]: { owner: 1, type: 'assassin' }, [sq(5, 3)]: { owner: 2, type: 'champion' } }, { [sq(5, 3)]: 'hill' });
  assert.equal(applyAction(state, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) }).units[sq(5, 3)].type, 'assassin');
  const regicide = arena({ [sq(10, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(5, 2)]: { owner: 1, type: 'scout' }, [sq(5, 3)]: { owner: 2, type: 'crown', revealed: false } });
  const won = applyAction(regicide, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
  assert.deepEqual(won.result, { winner: 1, reason: 'The enemy Crown was captured' });
  assert.equal(won.phase, 'over');
  assert.deepEqual(getLegalActions(won), []);
});

test('the archer shoots two squares over an empty middle square and never moves to attack', () => {
  const state = arena({ ...crowns, [sq(5, 1)]: { owner: 1, type: 'archer' }, [sq(5, 3)]: { owner: 2, type: 'builder', revealed: false }, [sq(3, 1)]: { owner: 2, type: 'guard' }, [sq(4, 1)]: { owner: 1, type: 'guard', revealed: false }, [sq(6, 1)]: { owner: 2, type: 'scout' } });
  const targets = getLegalActions(state).filter(a => a.kind === 'attack' && a.from === sq(5, 1)).map(a => a.to);
  assert.deepEqual(targets, [sq(5, 3)]);
  const next = applyAction(state, { kind: 'attack', from: sq(5, 1), to: sq(5, 3) });
  assert.equal(next.units[sq(5, 1)].type, 'archer');
  assert.equal(next.units[sq(5, 3)], null);
});

test('revealing a scout lets you peek at a hidden enemy outside forests', () => {
  const state = arena({ ...crowns, [sq(5, 2)]: { owner: 1, type: 'scout', revealed: false }, [sq(5, 4)]: { owner: 2, type: 'champion', revealed: false }, [sq(4, 2)]: { owner: 2, type: 'assassin', revealed: false } }, { [sq(4, 2)]: 'forest' });
  const peeking = applyAction(state, { kind: 'reveal', at: sq(5, 2) });
  assert.equal(peeking.phase, 'peek');
  assert.deepEqual(getLegalActions(peeking), [{ kind: 'peek', at: sq(5, 4) }]);
  const done = applyAction(peeking, { kind: 'peek', at: sq(5, 4) });
  assert.equal(viewFor(done, 1).units[sq(5, 4)].seen, 'champion');
  assert.equal(viewFor(done, 2).units[sq(5, 2)].type, 'scout');
  assert.equal(done.currentPlayer, 2);
});

test('revealing the builder lays two extra tiles before the turn ends', () => {
  let state = started();
  state = applyAction(state, { kind: 'build', tile: state.hands[1][0], at: sq(8, 3) });
  const builder = HOME[1].find(square => state.units[square]?.type === 'builder');
  state = applyAction(state, { kind: 'reveal', at: builder });
  assert.equal(state.phase, 'bonus-build');
  state = applyAction(state, { kind: 'build', tile: state.hands[1][0], at: sq(7, 3) });
  assert.equal(state.currentPlayer, 1);
  state = applyAction(state, { kind: 'build', tile: state.hands[1][0], at: sq(6, 3) });
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.land.filter(Boolean).length, 24);
});

test('succession swaps the Crown in secret and marks old peeks as stale', () => {
  const state = arena({ [sq(10, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(10, 1)]: { owner: 1, type: 'guard', revealed: false }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } });
  state.knowledge[2][state.units[sq(10, 1)].id] = { type: 'guard', turn: 1 };
  state.turnNumber = 5;
  const next = applyAction(state, { kind: 'succession', with: sq(10, 1) });
  assert.equal(next.units[sq(10, 1)].type, 'crown');
  assert.equal(next.units[sq(10, 0)].type, 'guard');
  assert.deepEqual(viewFor(next, 2).units[sq(10, 1)], { id: next.units[sq(10, 1)].id, owner: 1, revealed: false, seen: 'guard', stale: true });
  assert.match(next.log.at(-1).text, /succession/);
  next.currentPlayer = 1; next.phase = 'act';
  assert.ok(!getLegalActions(next).some(a => a.kind === 'succession'));
});

test('a revealed Crown that starts its turn on the Throne wins', () => {
  const state = arena({ [sq(6, 3)]: { owner: 1, type: 'crown' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } });
  let next = applyAction(state, { kind: 'move', from: sq(6, 3), to: THRONE });
  assert.equal(next.result, null);
  next = applyAction(next, getLegalActions(next).find(a => a.kind === 'reveal' || a.kind === 'move'));
  assert.deepEqual(next.result, { winner: 1, reason: 'The Crown holds the Throne' });
});

test('the view hides enemy identities and the enemy hand', () => {
  const view = viewFor(started(), 2);
  for (const square of HOME[1]) if (view.units[square]) assert.deepEqual(Object.keys(view.units[square]).sort(), ['id', 'owner', 'revealed']);
  assert.equal(typeof view.opponentHand, 'number');
  assert.equal(view.hand.length, 2);
});

test('random games always finish within the countdown and conserve units', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const random = seeded(seed);
    let state = createGame({ random });
    state = applyAction(state, { kind: 'place', layout: randomLayout(random) });
    state = applyAction(state, { kind: 'place', layout: randomLayout(random) });
    for (let step = 0; step < 2000 && !state.result; step++) {
      const actions = getLegalActions(state);
      state = applyAction(state, actions[Math.floor(random() * actions.length)]);
      assert.ok(state.units.filter(Boolean).length <= 18);
      assert.ok(state.land.filter(Boolean).length <= 21 + LAND_STACK.length && state.land.length === SQUARES);
    }
    assert.ok(state.result, `seed ${seed} did not finish`);
    assert.equal(state.phase, 'over');
  }
  assert.equal(SETTINGS.finalTurns, 20);
});
