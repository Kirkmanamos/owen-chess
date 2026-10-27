import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { positionKey } from '../src/rules/outcome.js';
import { POWERS, recipeKey } from '../src/rules/powers.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = true) => ({ type, owner, revealed, count: 1, moved: true });
const stack = (types, power, owner = 1, colors = types.map(() => owner)) => ({ type: types[0], owner, revealed: true, count: types.length, moved: true, parts: types.map((type, i) => ({ type, color: colors[i] })), power });
function seeded(seed = 5) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function position(entries, chaos = {}) {
  const state = createGame({ chaos: { enabled: true, nuhUhChance: 0, ...chaos } }, seeded());
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.chaos.goal = 'knock';
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
const act = (state, kind, from, to, extra = {}) => applyAction(state, { kind, ...(from ? { from: sq(from) } : {}), ...(to ? { to: sq(to) } : {}), ...extra });
const kings = { h1: piece('king'), h8: piece('king', 2, false) };
const targets = (state, from) => getLegalActions(state).filter(a => a.from === sq(from)).map(a => `${a.kind}:${a.to === undefined ? '' : 'abcdefgh'[a.to % 8] + (8 - Math.floor(a.to / 8))}`);

test('classic mode keeps pawn-only stacking', () => {
  const state = createGame({}, seeded());
  state.board.fill(null);
  state.board[sq('d4')] = piece('queen');
  state.board[sq('e4')] = piece('knight');
  state.board[sq('h1')] = piece('king');
  assert.ok(!getLegalActions(state).some(a => a.kind === 'stack'));
});

test('any two pieces stack from up to 2 squares away, and the first stack each turn is free', () => {
  const state = position({ ...kings, d4: piece('queen'), f4: piece('knight'), a8: piece('rook', 2) });
  assert.ok(getLegalActions(state).some(a => a.kind === 'stack' && a.from === sq('d4') && a.to === sq('f4')));
  assert.ok(!getLegalActions(state).some(a => a.kind === 'stack' && (a.from === sq('h1') || a.to === sq('h1'))), 'kings never stack');
  const snapshot = structuredClone(state);
  const next = act(state, 'stack', 'd4', 'f4');
  assert.deepEqual(state, snapshot);
  const made = next.board[sq('f4')];
  assert.deepEqual(made.parts, [{ type: 'knight', color: 1 }, { type: 'queen', color: 1 }]);
  assert.ok(['bouncy', 'floaty', 'fort', 'sticky', 'ghosty'].includes(made.power), 'tame pool, and no Froggy with a unicorn inside');
  assert.equal(next.chaos.recipes[recipeKey(made.parts, 1)], made.power);
  assert.deepEqual(next.chaos.events.map(e => e.type), ['power']);
  assert.equal(next.chaos.events[0].isNew, true);
  assert.equal(next.currentPlayer, 1, 'the free stack keeps the turn');
  assert.equal(next.actionsLeft, 1);
  assert.equal(publicView(next).chaos.freeStack, false);
  assert.equal(publicView(next).board[sq('f4')].power, made.power);
  assert.ok(getLegalActions(next).some(a => a.from === sq('f4') && a.kind === 'move'), 'the new stack can move right away');
});

test('a recipe keeps its power for the rest of the game, and stacks top out at 3', () => {
  let state = position({ ...kings, a1: piece('bishop'), b1: piece('rook'), a3: piece('bishop'), b3: piece('rook'), c3: piece('pawn'), a8: piece('rook', 2) });
  state = act(state, 'stack', 'a1', 'b1');
  const power = state.board[sq('b1')].power;
  state = act(state, 'move', 'h1', 'g1');
  state = act(state, 'move', 'a8', 'a7');
  state = act(state, 'stack', 'a3', 'b3');
  assert.equal(state.board[sq('b3')].power, power);
  assert.equal(state.chaos.events[0].isNew, false);
  state = act(state, 'move', 'g1', 'h1');
  state = act(state, 'move', 'a7', 'a8');
  assert.ok(getLegalActions(state).some(a => a.kind === 'stack' && a.from === sq('c3') && a.to === sq('b3')));
  state = act(state, 'stack', 'c3', 'b3');
  assert.equal(state.board[sq('b3')].count, 3);
  assert.ok(!getLegalActions(state).some(a => a.kind === 'stack' && (a.to === sq('b3') || a.from === sq('b3'))));
});

test('three of a kind always makes its signature power', () => {
  const state = position({ ...kings, a1: stack(['rook', 'rook'], 'fort'), b1: piece('rook'), a8: piece('rook', 2) });
  const next = act(state, 'stack', 'b1', 'a1');
  assert.equal(next.board[sq('a1')].power, 'crusher');
  assert.equal(next.chaos.events[0].power, 'crusher');
  assert.ok(targets(next, 'a1').includes('move:a7'), 'slides through pieces');
});

test('captured stacks come apart into toys, and a toy mixed in rolls a wild power', () => {
  let state = position({ ...kings, d4: piece('rook'), d6: stack(['knight', 'pawn'], 'floaty', 2), a8: piece('rook', 2) });
  state = act(state, 'move', 'd4', 'd6');
  assert.deepEqual(state.chaos.toys[1].map(t => t.type), ['knight', 'pawn']);
  assert.equal(state.currentPlayer, 1, 'Sugar Rush for catching a unicorn');
  const adopt = getLegalActions(state).filter(a => a.kind === 'adopt' && a.from === sq('d6'));
  assert.deepEqual(adopt.map(a => a.toy).sort(), ['knight', 'pawn']);
  state = applyAction(state, { kind: 'adopt', from: sq('d6'), toy: 'knight' });
  const made = state.board[sq('d6')];
  assert.deepEqual(made.parts, [{ type: 'rook', color: 1 }, { type: 'knight', color: 2 }]);
  assert.ok(['swappy', 'sneezy', 'pewpew', 'ghosty', 'floaty', 'bouncy'].includes(made.power));
  assert.deepEqual(state.chaos.toys[1].map(t => t.type), ['pawn']);
});

test('only your own top piece pops off; toys stay stuck', () => {
  const state = position({ ...kings, d4: stack(['rook', 'knight', 'bishop'], 'fort', 1, [1, 2, 1]), a8: piece('rook', 2) });
  const next = act(state, 'unstack', 'd4', 'e4');
  assert.deepEqual(next.board[sq('e4')], { owner: 1, type: 'bishop', revealed: true, count: 1, moved: true });
  assert.deepEqual(next.board[sq('d4')].parts.map(p => p.type), ['rook', 'knight']);
  const stuck = position({ ...kings, d4: stack(['rook', 'knight'], 'swappy', 1, [1, 2]), a8: piece('rook', 2) });
  assert.ok(!getLegalActions(stuck).some(a => a.kind === 'unstack'));
});

test('Fort cannot be captured; Sticky freezes touching enemies', () => {
  const fort = position({ ...kings, d4: piece('rook'), d6: stack(['pawn', 'pawn'], 'fort', 2), a8: piece('rook', 2) });
  assert.ok(!targets(fort, 'd4').includes('move:d6'));
  const sticky = position({ ...kings, d4: piece('rook'), d5: stack(['pawn', 'pawn'], 'sticky', 2), a8: piece('rook', 2) });
  assert.ok(!getLegalActions(sticky).some(a => a.from === sq('d4') && a.kind === 'move'));
});

test('Pew Pew zaps without moving, Sneezy pushes, Swappy swaps, Bouncy jumps', () => {
  const pew = act(position({ ...kings, d4: stack(['pawn', 'pawn'], 'pewpew'), d6: piece('bishop', 2), a8: piece('rook', 2) }), 'zap', 'd4', 'd6');
  assert.equal(pew.board[sq('d6')], null);
  assert.ok(pew.board[sq('d4')].parts);
  assert.equal(pew.captured.at(-1).type, 'bishop');

  const sneeze = act(position({ ...kings, d4: stack(['pawn', 'pawn'], 'sneezy'), d5: piece('rook', 2, false), e4: piece('pawn', 2), c3: piece('pawn', 2), b2: piece('pawn', 1), a8: piece('rook', 2) }), 'sneeze', 'd4');
  assert.ok(sneeze.board[sq('d6')] && !sneeze.board[sq('d6')].revealed, 'hidden tiles get pushed but stay hidden');
  assert.equal(sneeze.board[sq('f4')].type, 'pawn');
  assert.equal(sneeze.board[sq('c3')].owner, 2, 'blocked by b2, so it stays');

  const swap = act(position({ ...kings, d4: stack(['pawn', 'pawn'], 'swappy'), a2: piece('queen'), a8: piece('rook', 2) }), 'swap', 'd4', 'a2');
  assert.equal(swap.board[sq('d4')].type, 'queen');
  assert.ok(swap.board[sq('a2')].parts);

  const bouncy = position({ ...kings, d4: stack(['pawn', 'pawn'], 'bouncy'), d5: piece('rook'), a8: piece('rook', 2) });
  assert.ok(targets(bouncy, 'd4').includes('move:d6'));
});

test('every power has a name, icon and description', () => {
  for (const power of Object.values(POWERS)) assert.ok(power.icon && power.name && power.text);
});

test('seeded random play with stacks and powers stays legal and keeps one king each', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const random = seeded(seed);
    let state = createGame({ chaos: { enabled: true } }, random);
    for (let i = 0; i < 500 && !state.result; i++) {
      const actions = getLegalActions(state);
      const stacks = actions.filter(a => ['stack', 'adopt', 'swap', 'sneeze', 'zap'].includes(a.kind));
      const pool = stacks.length && random() < 0.5 ? stacks : actions;
      state = applyAction(state, pool[Math.floor(random() * pool.length)]);
      for (const owner of [1, 2]) assert.equal(state.board.filter(p => p?.owner === owner && p.type === 'king').length, 1);
      assert.ok(state.board.every(p => !p || p.count <= 3));
    }
  }
});
