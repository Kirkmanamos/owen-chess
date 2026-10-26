import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, getLegalActions, randomLayout, viewFor, targetCandidates } from '../../crown/src/engine.js';
import { CORE, HOME, ARMY, DECKS, SURGES, SETTINGS, index, neighbors, distance } from '../../crown/src/rules.js';

function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const sq = (row, col) => index(row, col);
const LAYOUT = ['crown', 'champion', 'guard', 'guard', 'scout', 'scout', 'archer', 'builder', 'assassin', null];
const started = (seed = 1) => applyAction(applyAction(createGame({ random: seeded(seed) }), { kind: 'place', layout: LAYOUT }), { kind: 'place', layout: LAYOUT });

// A fully landed field for focused scenarios. Player 1 to act with 2 actions.
function arena(units, { land = {}, shattered = false, player = 1 } = {}) {
  const state = started();
  state.units.fill(null);
  state.land = state.land.map((_, square) => square === CORE ? 'core' : 'plains');
  for (const [square, type] of Object.entries(land)) state.land[square] = type;
  let id = 100;
  for (const [square, unit] of Object.entries(units)) state.units[square] = { id: id++, revealed: true, ...unit };
  Object.assign(state, { phase: 'act', currentPlayer: player, actionsLeft: 2, turnNumber: 3, round: 2, shattered, deckName: shattered ? 'wild' : 'calm' });
  state.surge = { card: 'grow', targets: [] };
  state.upcoming = shattered ? { card: 'sink', targets: [] } : null;
  if (shattered) state.deck = [...DECKS.wild];
  return state;
}
// Play through Grow and aiming steps that interrupt a scripted sequence.
function settle(state) {
  while (state.phase === 'grow' || state.phase === 'aim') state = applyAction(state, state.phase === 'aim' ? { kind: 'keep-aim' } : getLegalActions(state)[0]);
  return state;
}
const kings = { [sq(8, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } };
// Resolve a chosen surge: Player 2 ends the round (or any turn after the Shattering).
function surge(state, card, targets = []) {
  state.surge = { card, targets };
  state.currentPlayer = 2;
  return applyAction(state, { kind: 'end-turn' });
}

test('a new game starts with homes, the Core patch and a face-up Calm surge', () => {
  const state = createGame({ random: seeded(3) });
  assert.equal(state.land.filter(Boolean).length, 25);
  assert.equal(state.land[CORE], 'core');
  assert.ok(DECKS.calm.includes(state.surge.card));
  assert.equal(state.surge.targets.length, SURGES[state.surge.card].targets);
  assert.equal(state.deck.length, 7);
  assert.equal(ARMY.length, 9);
});

test('Player 1 gets one action on the first turn, then the Core surges after Player 2', () => {
  let state = started();
  assert.equal(state.actionsLeft, 1);
  state = applyAction(state, { kind: 'reveal', at: HOME[1][1] });
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.actionsLeft, 2);
  const card = state.surge.card;
  state = applyAction(state, { kind: 'reveal', at: HOME[2][1] });
  assert.equal(state.currentPlayer, 2);
  state = applyAction(state, { kind: 'end-turn' });
  assert.ok(state.log.some(entry => entry.text === `The Core surged: ${SURGES[card].name}.`));
  if (card === 'grow') assert.equal(state.phase, 'grow');
  else { assert.equal(state.currentPlayer, 1); assert.equal(state.round, 2); }
});

test('squares have 4 neighbours, and hexes 6 in a brick layout', () => {
  assert.equal(neighbors(CORE, false).length, 4);
  assert.deepEqual(neighbors(CORE, true).sort((a, b) => a - b), [sq(3, 2), sq(3, 3), sq(4, 2), sq(4, 4), sq(5, 2), sq(5, 3)]);
  assert.deepEqual(neighbors(sq(3, 3), true).sort((a, b) => a - b), [sq(2, 3), sq(2, 4), sq(3, 2), sq(3, 4), sq(4, 3), sq(4, 4)]);
  assert.equal(distance(sq(0, 0), sq(2, 2), false), 4);
  assert.equal(distance(sq(0, 0), sq(2, 2), true), 3);
});

test('a unit reaching the Core shatters the field and switches to the Wild deck', () => {
  const state = arena({ ...kings, [sq(2, 3)]: { owner: 1, type: 'scout' } });
  const next = applyAction(state, { kind: 'move', from: sq(2, 3), to: sq(3, 3) });
  assert.equal(next.shattered, true);
  assert.equal(next.deckName, 'wild');
  // The surge already showing still comes next; the first Wild card follows it.
  assert.deepEqual(next.surge, state.surge);
  assert.ok(DECKS.wild.includes(next.upcoming.card));
  assert.match(next.log.at(-1).text, /The Shattering/);
  // After the Shattering the Core surges after every turn, including Player 1's.
  const ended = applyAction(next, { kind: 'end-turn' });
  assert.ok(ended.log.some(entry => entry.text.startsWith('The Core surged')));
});

test('the Shattering happens at the end of round 6 at the latest', () => {
  const state = arena(kings, { player: 2 });
  state.round = SETTINGS.shatterRound;
  const next = surge(state, 'bloom');
  assert.equal(next.shattered, true);
  assert.equal(next.currentPlayer, 1);
  assert.ok(DECKS.calm.includes(next.surge.card));
  assert.ok(DECKS.wild.includes(next.upcoming.card));
});

test('after the Shattering every surge is shown through a turn of each player', () => {
  let state = arena(kings, { shattered: true });
  state.surge = { card: 'bolt', targets: [sq(3, 3)] };
  state.upcoming = { card: 'storm', targets: [sq(5, 3), sq(4, 2)] };
  state = settle(applyAction(state, { kind: 'end-turn' })); // Player 1 ends; the bolt strikes
  assert.equal(state.currentPlayer, 2);
  assert.deepEqual(state.surge, { card: 'storm', targets: [sq(5, 3), sq(4, 2)] });
  assert.ok(state.upcoming && DECKS.wild.includes(state.upcoming.card));
  const shown = state.upcoming;
  state = settle(applyAction(state, { kind: 'end-turn' })); // Player 2 ends; the storm strikes
  assert.deepEqual(state.surge, shown);
  assert.equal(viewFor(state, 1).upcoming.card, state.upcoming.card);
});

test('one unit may act twice but attack only once per turn', () => {
  const state = arena({ ...kings, [sq(4, 0)]: { owner: 1, type: 'champion' }, [sq(4, 1)]: { owner: 2, type: 'builder' }, [sq(3, 0)]: { owner: 2, type: 'scout' } });
  const after = applyAction(state, { kind: 'attack', from: sq(4, 0), to: sq(4, 1) });
  assert.equal(after.currentPlayer, 1);
  assert.ok(!getLegalActions(after).some(a => a.kind === 'attack'));
  assert.ok(getLegalActions(after).some(a => a.kind === 'move' && a.from === sq(4, 1)));
});

test('a revealed Crown rallies neighbours by +1 when attacking and defending', () => {
  const state = arena({ [sq(8, 0)]: { owner: 2, type: 'crown', revealed: false }, [sq(4, 0)]: { owner: 1, type: 'crown' }, [sq(4, 1)]: { owner: 1, type: 'scout' }, [sq(4, 2)]: { owner: 2, type: 'guard' } });
  const tie = applyAction(state, { kind: 'attack', from: sq(4, 1), to: sq(4, 2) });
  assert.equal(tie.units[sq(4, 1)], null);
  assert.equal(tie.units[sq(4, 2)], null);
  assert.match(tie.log.at(-1).text, /\(3 vs 3\)/);
});

test('after the Shattering the archer shoots along hex lines', () => {
  const state = arena({ ...kings, [sq(4, 3)]: { owner: 1, type: 'archer' }, [sq(2, 2)]: { owner: 2, type: 'guard', revealed: false } }, { shattered: true });
  assert.deepEqual(getLegalActions(state).filter(a => a.kind === 'attack').map(a => a.to), [sq(2, 2)]);
});

test('bolts reveal and destroy weak units, but strong ones survive', () => {
  const state = arena({ ...kings, [sq(3, 3)]: { owner: 1, type: 'scout', revealed: false }, [sq(5, 3)]: { owner: 2, type: 'champion', revealed: false } });
  const next = surge(state, 'storm', [sq(3, 3), sq(5, 3)]);
  assert.equal(next.units[sq(3, 3)], null);
  assert.equal(next.units[sq(5, 3)].revealed, true);
  assert.equal(next.fallen.length, 1);
});

test('a bolt on the Crown ends the game', () => {
  const state = arena({ [sq(8, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(3, 3)]: { owner: 2, type: 'crown', revealed: false } });
  assert.deepEqual(surge(state, 'bolt', [sq(3, 3)]).result, { winner: 1, reason: 'The enemy Crown was captured' });
});

test('tremors and pulses push units directly away from the Core when there is room', () => {
  const state = arena({ ...kings, [sq(3, 3)]: { owner: 1, type: 'guard' }, [sq(4, 4)]: { owner: 2, type: 'guard' }, [sq(5, 3)]: { owner: 1, type: 'scout' }, [sq(6, 3)]: { owner: 2, type: 'scout' } });
  const next = surge(state, 'tremor');
  assert.equal(next.units[sq(2, 3)].type, 'guard');
  assert.equal(next.units[sq(4, 5)].type, 'guard');
  assert.equal(next.units[sq(5, 3)].type, 'scout'); // blocked by the unit behind it
  const wild = arena({ ...kings, [sq(3, 3)]: { owner: 1, type: 'guard' }, [sq(2, 3)]: { owner: 2, type: 'scout' } }, { shattered: true });
  const pulsed = surge(wild, 'pulse');
  assert.equal(distance(pulsed.units.findIndex(u => u?.type === 'guard'), CORE, true), 2);
  assert.equal(distance(pulsed.units.findIndex(u => u?.type === 'scout'), CORE, true), 3);
});

test('flares, sinks and blooms change what is known and where land is', () => {
  const state = arena({ ...kings, [sq(3, 3)]: { owner: 2, type: 'assassin', revealed: false } }, { land: { [sq(2, 1)]: null, [sq(6, 5)]: null } });
  assert.equal(surge(structuredClone(state), 'flare', [sq(3, 3)]).units[sq(3, 3)].revealed, true);
  assert.equal(surge(structuredClone(state), 'sink', [sq(5, 5)]).land[sq(5, 5)], null);
  const bloomed = surge(structuredClone(state), 'bloom');
  assert.equal(bloomed.land[sq(6, 5)], null); // 3 steps from the Core
  assert.equal(bloomed.land[sq(2, 1)], null);
  state.land[sq(2, 3)] = null;
  assert.equal(surge(structuredClone(state), 'bloom').land[sq(2, 3)], 'plains');
});

test('Grow lets the next player, then the other, lay a tile of their choice', () => {
  const state = arena(kings, { land: { [sq(2, 3)]: null, [sq(6, 3)]: null } });
  let next = surge(state, 'grow');
  assert.equal(next.phase, 'grow');
  assert.equal(next.currentPlayer, 1);
  next = applyAction(next, { kind: 'grow', tile: 'hill', at: sq(2, 3) });
  assert.equal(next.currentPlayer, 2);
  next = applyAction(next, { kind: 'grow', tile: 'forest', at: sq(6, 3) });
  assert.equal(next.phase, 'act');
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.land[sq(2, 3)], 'hill');
});

test('a unit on the Core lets its owner re-aim the surge after next, and is immune to surges', () => {
  const state = arena({ ...kings, [CORE]: { owner: 1, type: 'guard' }, [sq(3, 3)]: { owner: 2, type: 'scout' } }, { player: 2, shattered: true });
  state.surge = { card: 'sink', targets: [] };
  state.upcoming = { card: 'bolt', targets: [sq(5, 3)] };
  state.deck = ['storm', ...DECKS.wild];
  let next = applyAction(state, { kind: 'end-turn' }); // Player 2 ends; the bolt is next, then a storm
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.phase, 'aim');
  assert.equal(next.upcoming.card, 'storm');
  assert.ok(!targetCandidates(next, 'storm').includes(CORE));
  next = applyAction(next, { kind: 'aim', at: sq(3, 3) });
  assert.equal(next.phase, 'aim'); // the storm has a second mark
  next = applyAction(next, { kind: 'keep-aim' });
  assert.equal(next.phase, 'act');
  // The bolt striking at the end of this turn keeps its mark; only the storm after it moved.
  assert.deepEqual(next.surge, { card: 'bolt', targets: [sq(5, 3)] });
  assert.equal(next.upcoming.targets[0], sq(3, 3));
});

test('a revealed Crown that starts two turns in a row on the Core wins', () => {
  let state = arena({ [sq(3, 3)]: { owner: 1, type: 'crown' }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } }, { shattered: true });
  state = applyAction(state, { kind: 'move', from: sq(3, 3), to: CORE });
  state = settle(applyAction(state, { kind: 'end-turn' }));
  state = settle(applyAction(state, { kind: 'end-turn' }));
  assert.equal(state.result, null);
  assert.equal(state.crownHold[1], 1);
  state = settle(applyAction(state, { kind: 'end-turn' }));
  state = settle(applyAction(state, { kind: 'end-turn' }));
  assert.deepEqual(state.result, { winner: 1, reason: 'The Crown harnessed the Core' });
});

test('succession needs both actions', () => {
  const state = arena({ [sq(8, 0)]: { owner: 1, type: 'crown', revealed: false }, [sq(8, 1)]: { owner: 1, type: 'guard', revealed: false }, [sq(0, 6)]: { owner: 2, type: 'crown', revealed: false } });
  assert.ok(getLegalActions(state).some(a => a.kind === 'succession'));
  const next = applyAction(state, { kind: 'succession', with: sq(8, 1) });
  assert.equal(next.units[sq(8, 1)].type, 'crown');
  assert.equal(next.currentPlayer, 2);
  state.actionsLeft = 1;
  assert.ok(!getLegalActions(state).some(a => a.kind === 'succession'));
});

test('the view lists enemy types still unaccounted for and hides the rest', () => {
  const state = arena({ ...kings, [sq(3, 3)]: { owner: 2, type: 'scout', revealed: true }, [sq(2, 2)]: { owner: 2, type: 'archer', revealed: false } });
  state.fallen.push({ owner: 2, type: 'builder' });
  const view = viewFor(state, 1);
  assert.deepEqual(view.unaccounted.sort(), ARMY.filter((t, i) => !(t === 'scout' && i === ARMY.indexOf('scout')) && t !== 'builder').sort());
  assert.deepEqual(Object.keys(view.units[sq(2, 2)]).sort(), ['id', 'owner', 'revealed']);
});

test('random games always finish and never create units', () => {
  const endings = {};
  for (let seed = 1; seed <= 30; seed++) {
    const random = seeded(seed);
    let state = createGame({ random });
    state = applyAction(state, { kind: 'place', layout: randomLayout(random) });
    state = applyAction(state, { kind: 'place', layout: randomLayout(random) });
    for (let step = 0; step < 5000 && !state.result; step++) {
      const actions = getLegalActions(state);
      // Ending the turn early is rarer than a real action, so games move.
      const real = actions.filter(a => a.kind !== 'end-turn' || actions.length === 1);
      state = applyAction(state, real.length && random() < 0.95 ? real[Math.floor(random() * real.length)] : actions.at(-1));
      assert.ok(state.units.filter(Boolean).length + state.fallen.length === 18);
    }
    assert.ok(state.result, `seed ${seed} did not finish`);
    endings[state.result.reason] = (endings[state.result.reason] ?? 0) + 1;
  }
  assert.ok(!endings['The Core burned itself out'] || endings['The Core burned itself out'] < 30);
});
