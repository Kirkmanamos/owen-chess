import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, getLegalActions, randomLayout } from '../../crown/src/engine.js';
import { chooseAction, chooseLayout } from '../../crown/src/ai.js';
import { HOME, ARMY, index } from '../../crown/src/rules.js';

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const sq = (row, col) => index(row, col);
const sameLegal = (state, action) => getLegalActions(state).some(legal => JSON.stringify(legal) === JSON.stringify(action));

function arena(units, player = 1) {
  const state = applyAction(applyAction(createGame({ random: seeded(1) }), { kind: 'place', layout: randomLayout(seeded(2)) }), { kind: 'place', layout: randomLayout(seeded(3)) });
  state.units.fill(null);
  state.land.fill('plains');
  let id = 100;
  for (const [square, unit] of Object.entries(units)) state.units[square] = { id: id++, revealed: true, ...unit };
  state.phase = 'act';
  state.currentPlayer = player;
  return state;
}

test('computer layouts are complete armies, usually with the Crown in the back row', () => {
  let back = 0;
  const random = seeded(11);
  for (let game = 1; game <= 40; game++) {
    for (const player of [1, 2]) {
      const layout = chooseLayout(player, random);
      assert.deepEqual(layout.filter(Boolean).sort(), [...ARMY].sort());
      const crown = HOME[player][layout.indexOf('crown')];
      if (Math.floor(crown / 7) === (player === 1 ? 10 : 0)) back++;
    }
  }
  assert.ok(back > 40 && back < 80, `back-row crowns: ${back}`);
});

test('the computer captures a Crown it can reach and wins', () => {
  const state = arena({ [sq(10, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(5, 2)]: { owner: 1, type: 'champion' }, [sq(5, 3)]: { owner: 2, type: 'crown' }, [sq(0, 6)]: { owner: 2, type: 'guard', revealed: false } });
  const action = chooseAction(state, { random: seeded(4) });
  assert.deepEqual(action, { kind: 'attack', from: sq(5, 2), to: sq(5, 3) });
});

test('the computer moves its revealed Crown out of a losing attack', () => {
  const state = arena({ [sq(5, 2)]: { owner: 1, type: 'crown' }, [sq(5, 3)]: { owner: 2, type: 'scout' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false }, [sq(9, 6)]: { owner: 1, type: 'guard', revealed: false } });
  const action = chooseAction(state, { random: seeded(5) });
  const after = applyAction(state, action);
  const crown = after.units.findIndex(unit => unit?.owner === 1 && unit.type === 'crown');
  assert.ok(Math.abs(crown - sq(5, 3)) !== 1 && Math.abs(crown - sq(5, 3)) !== 7, `crown stayed next to the scout: ${JSON.stringify(action)}`);
});

test('the choice never depends on the enemy hidden identities', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const a = arena({ [sq(9, 2)]: { owner: 1, type: 'crown', revealed: false }, [sq(6, 3)]: { owner: 1, type: 'champion' }, [sq(4, 3)]: { owner: 2, type: 'guard', revealed: false }, [sq(4, 2)]: { owner: 2, type: 'crown', revealed: false }, [sq(1, 4)]: { owner: 2, type: 'assassin', revealed: false } });
    const b = structuredClone(a);
    [b.units[sq(4, 3)].type, b.units[sq(4, 2)].type, b.units[sq(1, 4)].type] = ['crown', 'assassin', 'guard'];
    assert.deepEqual(chooseAction(a, { random: seeded(seed) }), chooseAction(b, { random: seeded(seed) }));
  }
  const fresh = createGame({ random: seeded(9) });
  const one = applyAction(applyAction(fresh, { kind: 'place', layout: randomLayout(seeded(1)) }), { kind: 'place', layout: randomLayout(seeded(2)) });
  const two = applyAction(applyAction(fresh, { kind: 'place', layout: randomLayout(seeded(1)) }), { kind: 'place', layout: randomLayout(seeded(5)) });
  assert.deepEqual(chooseAction(one, { random: seeded(3) }), chooseAction(two, { random: seeded(3) }));
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
