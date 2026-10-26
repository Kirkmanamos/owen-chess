import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, getLegalActions, randomLayout } from '../../crown/src/engine.js';
import { chooseAction, chooseLayout } from '../../crown/src/ai.js';
import { HOME, ARMY, CORE, index, rowOf } from '../../crown/src/rules.js';

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const sq = (row, col) => index(row, col);
const sameLegal = (state, action) => getLegalActions(state).some(legal => JSON.stringify(legal) === JSON.stringify(action));

function arena(units, { player = 1, surge = { card: 'grow', targets: [] } } = {}) {
  const state = applyAction(applyAction(createGame({ random: seeded(1) }), { kind: 'place', layout: randomLayout(seeded(2)) }), { kind: 'place', layout: randomLayout(seeded(3)) });
  state.units.fill(null);
  state.land = state.land.map((_, square) => square === CORE ? 'core' : 'plains');
  let id = 100;
  for (const [square, unit] of Object.entries(units)) state.units[square] = { id: id++, revealed: true, ...unit };
  Object.assign(state, { phase: 'act', currentPlayer: player, actionsLeft: 2, turnNumber: 3, round: 2, surge });
  return state;
}

test('computer layouts are complete armies, usually with the Crown in the back row', () => {
  const random = seeded(11);
  let back = 0;
  for (let game = 0; game < 40; game++) {
    for (const player of [1, 2]) {
      const layout = chooseLayout(player, random);
      assert.deepEqual(layout.filter(Boolean).sort(), [...ARMY].sort());
      if (rowOf(HOME[player][layout.indexOf('crown')]) === (player === 1 ? 8 : 0)) back++;
    }
  }
  assert.ok(back > 40 && back < 80, `back-row crowns: ${back}`);
});

test('the computer captures a Crown it can reach', () => {
  const state = arena({ [sq(8, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(5, 2)]: { owner: 1, type: 'champion' }, [sq(5, 3)]: { owner: 2, type: 'crown' }, [sq(0, 6)]: { owner: 2, type: 'guard', revealed: false } });
  assert.deepEqual(chooseAction(state, { random: seeded(4) }), { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
});

test('the computer steps out from under a marked bolt', () => {
  const state = arena({ [sq(8, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(3, 3)]: { owner: 1, type: 'champion' }, [sq(5, 3)]: { owner: 1, type: 'scout' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } }, { surge: { card: 'bolt', targets: [sq(5, 3)] } });
  state.actionsLeft = 1;
  const action = chooseAction(state, { random: seeded(5) });
  assert.equal(action.kind, 'move');
  assert.equal(action.from, sq(5, 3));
});

test('a revealed Crown next to an unguarded Core steps onto it', () => {
  const state = arena({ [sq(4, 2)]: { owner: 1, type: 'crown' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false }, [sq(1, 0)]: { owner: 2, type: 'guard', revealed: false } });
  state.shattered = true; state.deckName = 'wild'; state.upcoming = { card: 'sink', targets: [] };
  state.actionsLeft = 1;
  assert.deepEqual(chooseAction(state, { random: seeded(6) }), { kind: 'move', from: sq(4, 2), to: CORE });
});

test('the choice never depends on the enemy hidden identities', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const a = arena({ [sq(7, 2)]: { owner: 1, type: 'crown', revealed: false }, [sq(5, 3)]: { owner: 1, type: 'champion' }, [sq(3, 3)]: { owner: 2, type: 'guard', revealed: false }, [sq(3, 2)]: { owner: 2, type: 'crown', revealed: false }, [sq(1, 4)]: { owner: 2, type: 'assassin', revealed: false } });
    const b = structuredClone(a);
    [b.units[sq(3, 3)].type, b.units[sq(3, 2)].type, b.units[sq(1, 4)].type] = ['crown', 'assassin', 'guard'];
    // The deck order and seed are secret too.
    b.deck.reverse(); b.seed += 12345;
    assert.deepEqual(chooseAction(a, { random: seeded(seed) }), chooseAction(b, { random: seeded(seed) }));
  }
});

test('computer self-play completes legal games', () => {
  for (let seed = 1; seed <= 3; seed++) {
    const random = seeded(seed);
    let state = createGame({ random });
    while (!state.result) {
      const action = chooseAction(state, { random, samples: 2 });
      if (state.phase !== 'setup') assert.ok(sameLegal(state, action));
      state = applyAction(state, action);
    }
    assert.equal(state.phase, 'over');
  }
});

test('the computer keeps its revealed Crown out of move-and-attack reach', () => {
  // The enemy Champion on b6 can step next to a Crown left on a7 and strike in one
  // turn. The only safe square, a8, is farther from the Core.
  const state = arena({ [sq(6, 0)]: { owner: 1, type: 'crown' }, [sq(5, 1)]: { owner: 2, type: 'champion' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false }, [sq(8, 6)]: { owner: 1, type: 'guard', revealed: false } });
  state.actionsLeft = 1;
  const after = applyAction(state, chooseAction(state, { random: seeded(8) }));
  assert.equal(after.units.findIndex(unit => unit?.owner === 1 && unit.type === 'crown'), sq(7, 0));
});
