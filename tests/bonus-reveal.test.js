import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getLegalActions, applyAction, publicView } from '../src/engine.js';
import { positionKey } from '../src/rules/outcome.js';
import { isInCheck } from '../src/rules/king.js';

const sq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
const piece = (type, owner = 1, revealed = true, count = 1) => ({ type, owner, revealed, count, moved: true });
const base = () => ({ a1: piece('rook'), d4: piece('pawn', 1, false), c3: piece('knight', 1, false), h8: piece('king', 2, false) });
function position(entries = base(), turn = {}, stack = {}) {
  const state = createGame({ turn: { bonusReveal: true, ...turn }, stack });
  state.board.fill(null);
  for (const [name, tile] of Object.entries(entries)) state.board[sq(name)] = tile;
  state.repetitions = { [positionKey(state)]: 1 };
  return state;
}
function act(state, kind, from, to, extra = {}) {
  return applyAction(state, { kind, ...(from ? { from: sq(from) } : {}), ...(to ? { to: sq(to) } : {}), ...extra });
}

test('bonus reveal defaults off and rejects nonboolean configuration', () => {
  assert.equal(createGame().rules.turn.bonusReveal, false);
  assert.equal(createGame().bonusRevealPending, false);
  assert.throws(() => createGame({ turn: { bonusReveal: 'true' } }), /boolean/);
  const next = act(position(base(), { bonusReveal: false }), 'move', 'a1', 'b1');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.bonusRevealPending, false);
});

test('a normal action offers one optional reveal, then passes without another move', () => {
  const original = position();
  const snapshot = structuredClone(original);
  const bonus = act(original, 'move', 'a1', 'b1');
  assert.deepEqual(original, snapshot);
  assert.equal(bonus.currentPlayer, 1);
  assert.equal(bonus.actionsLeft, 0);
  assert.equal(bonus.turnNumber, 1);
  assert.equal(bonus.bonusRevealPending, true);
  assert.equal(publicView(bonus).bonusRevealPending, true);
  assert.ok(getLegalActions(bonus).every(a => ['reveal', 'end-turn'].includes(a.kind)));
  const next = act(bonus, 'reveal', 'd4', 'e4');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.turnNumber, 2);
  assert.equal(next.actionsLeft, 1);
  assert.equal(next.bonusRevealPending, false);
  assert.equal(next.board[sq('e4')].revealed, true);
  assert.equal(next.actionNumber, 2);
  assert.match(next.history.at(-1).text, /^Bonus reveal: Slid d4 → e4/);
  assert.throws(() => act(next, 'move', 'e4', 'e5'), /not legal/);
  assert.throws(() => act(next, 'reveal', 'c3', 'd3'), /not legal/);
});

test('skipping the bonus leaves the board unchanged and passes immediately', () => {
  const bonus = act(position(), 'move', 'a1', 'b1');
  const skipped = act(bonus, 'end-turn');
  assert.deepEqual(skipped.board, bonus.board);
  assert.equal(skipped.currentPlayer, 2);
  assert.equal(skipped.bonusRevealPending, false);
  assert.equal(skipped.history.at(-1).text, 'Skipped the bonus reveal.');
});

test('a normal reveal may be followed by one bonus reveal, including newly exposed tiles', () => {
  const initial = position({ d4: piece('bishop', 1, false), c4: piece('queen', 1, false), h8: piece('king', 2, false) });
  const bonus = act(initial, 'reveal', 'd4', 'f4');
  assert.equal(bonus.bonusRevealPending, true);
  assert.throws(() => act(bonus, 'move', 'f4', 'g5'), /not legal/);
  const next = act(bonus, 'reveal', 'c4', 'e4');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.board.filter(p => p?.owner === 1 && p.revealed).length, 2);
});

test('the bonus is once after all paid actions, including on the next player turn', () => {
  const entries = { ...base(), a8: piece('rook', 2), d8: piece('pawn', 2, false) };
  const first = act(position(entries, { actionsPerTurn: 2 }), 'move', 'a1', 'b1');
  assert.equal(first.actionsLeft, 1);
  assert.equal(first.bonusRevealPending, false);
  const bonus = act(first, 'move', 'b1', 'b2');
  assert.equal(bonus.bonusRevealPending, true);
  const nextPlayer = act(bonus, 'reveal', 'd4', 'e4');
  const nextFirst = act(nextPlayer, 'move', 'a8', 'b8');
  assert.equal(nextFirst.bonusRevealPending, false);
  const nextBonus = act(nextFirst, 'move', 'b8', 'b7');
  assert.equal(nextBonus.currentPlayer, 2);
  assert.equal(nextBonus.bonusRevealPending, true);
  const returned = act(nextBonus, 'reveal', 'd8', 'e8');
  assert.equal(returned.currentPlayer, 1);
  const again = act(act(returned, 'move', 'b2', 'b1'), 'move', 'b1', 'a1');
  assert.equal(again.bonusRevealPending, true);
});

test('ending a multi-action turn early declines any bonus', () => {
  const first = act(position(base(), { actionsPerTurn: 3 }), 'move', 'a1', 'b1');
  const next = act(first, 'end-turn');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.bonusRevealPending, false);
});

test('unlimited free reveals supersede the bounded bonus without another phase', () => {
  let state = position(base(), { revealCostsAction: false });
  state = act(state, 'reveal', 'd4', 'e4');
  state = act(state, 'reveal', 'c3', 'd3');
  assert.equal(state.actionsLeft, 1);
  assert.equal(state.bonusRevealPending, false);
  state = act(state, 'move', 'a1', 'b1');
  assert.equal(state.currentPlayer, 2);
  assert.equal(state.bonusRevealPending, false);
});

test('turn ends automatically when no own hidden tiles remain', () => {
  const next = act(position({ a1: piece('rook'), h8: piece('king', 2, false) }), 'move', 'a1', 'b1');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.result, null);
});

test('no bonus is offered when every reveal would expose the known king', () => {
  const state = position({ a1: piece('king'), b2: piece('bishop', 1, false), c3: piece('bishop', 2), g1: piece('knight'), h8: piece('king', 2, false) });
  const next = act(state, 'move', 'g1', 'f3');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.bonusRevealPending, false);
});

test('bonus legality continues to protect the known king without disclosing hidden types', () => {
  const state = position({ a1: piece('king'), a2: piece('pawn', 1, false), a8: piece('rook', 2), h1: piece('knight'), h8: piece('king', 2, false) });
  const bonus = act(state, 'move', 'h1', 'f2');
  const actions = getLegalActions(bonus);
  assert.deepEqual(actions.filter(a => a.kind === 'reveal').map(a => a.to), [sq('a3')]);
  assert.throws(() => act(bonus, 'reveal', 'a2', 'b2'), /not legal/);
  const view = publicView(bonus);
  for (const type of ['pawn', 'knight', 'bishop', 'rook', 'queen']) {
    bonus.board[sq('a2')].type = type;
    assert.deepEqual(getLegalActions(bonus), actions);
    assert.deepEqual(publicView(bonus), view);
  }
});

test('all six hidden identities have identical bonus choices and public projections', () => {
  const bonus = act(position(), 'move', 'a1', 'b1');
  const actions = getLegalActions(bonus);
  const view = publicView(bonus);
  for (const type of ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']) {
    bonus.board[sq('d4')].type = type;
    assert.deepEqual(getLegalActions(bonus), actions);
    assert.deepEqual(publicView(bonus), view);
  }
});

test('moves, captures, challenges, stacks and enemy reveals cannot spend the bonus', () => {
  const state = position({ ...base(), c1: piece('pawn'), d1: piece('pawn'), f1: piece('bishop', 2, false), b4: piece('knight', 2), f3: piece('pawn', 1, true, 2) });
  const bonus = act(state, 'move', 'a1', 'b1');
  for (const [kind, from, to] of [['move', 'b1', 'b2'], ['move', 'b1', 'b4'], ['challenge', 'd1', 'f1'], ['stack', 'c1', 'd1'], ['unstack', 'f3', 'g3'], ['reveal', 'h8', 'g8']]) {
    assert.throws(() => act(bonus, kind, from, to), /not legal/);
  }
  assert.throws(() => act(bonus, 'reveal', 'd4', 'e4', { scout: sq('f1') }), /not legal/);
});

test('giving ordinary check ends the turn without offering a bonus', () => {
  const state = position({ a1: piece('rook'), d4: piece('pawn', 1, false), h7: piece('king', 2) });
  const next = act(state, 'move', 'a1', 'a7');
  assert.equal(isInCheck(next, 2), true);
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.bonusRevealPending, false);
});

test('a bonus may give check, and the opponent must answer it normally', () => {
  const state = position({ a1: piece('knight'), d4: piece('rook', 1, false), e8: piece('king', 2) });
  const bonus = act(state, 'move', 'a1', 'b3');
  const next = act(bonus, 'reveal', 'd4', 'e4');
  assert.equal(isInCheck(next, 2), true);
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.response, null);
  assert.equal(next.bonusRevealPending, false);
});

test('a king uncovered by the bonus gets its response, which never earns another bonus', () => {
  const state = position({ a1: piece('knight'), d4: piece('king', 1, false), c2: piece('pawn', 1, false), e8: piece('rook', 2), h8: piece('king', 2, false) });
  const bonus = act(state, 'move', 'a1', 'b3');
  const response = act(bonus, 'reveal', 'd4', 'e4');
  assert.equal(response.currentPlayer, 1);
  assert.equal(response.response.player, 1);
  assert.equal(response.bonusRevealPending, false);
  assert.equal(response.actionsLeft, 1);
  const next = act(response, 'move', 'e4', 'd4');
  assert.equal(next.currentPlayer, 2);
  assert.equal(next.response, null);
  assert.equal(next.bonusRevealPending, false);
});

test('a normal reveal response and a challenge ambush both suppress the bonus', () => {
  const state = position({ d4: piece('king', 1, false), c2: piece('pawn', 1, false), e8: piece('rook', 2), h8: piece('king', 2, false) });
  const response = act(state, 'reveal', 'd4', 'e4');
  assert.equal(response.bonusRevealPending, false);
  const escaped = act(response, 'move', 'e4', 'd4');
  assert.equal(escaped.currentPlayer, 2);
  assert.equal(escaped.bonusRevealPending, false);
  const ambush = position({ a1: piece('king'), c1: piece('rook'), c2: piece('knight', 2, false), d4: piece('pawn', 1, false), h8: piece('king', 2, false) });
  const attacked = act(ambush, 'challenge', 'c1', 'c2');
  assert.equal(attacked.response.player, 1);
  assert.equal(attacked.bonusRevealPending, false);
  const safe = act(attacked, 'move', 'a1', 'b1');
  assert.equal(safe.currentPlayer, 2);
  assert.equal(safe.bonusRevealPending, false);
});

test('a challenged enemy king gets its response before any optional reveal', () => {
  const state = position({ a1: piece('rook'), a4: piece('king', 2, false), d4: piece('pawn', 1, false), h8: piece('pawn', 2, false) });
  const response = act(state, 'challenge', 'a1', 'a4');
  assert.equal(response.currentPlayer, 2);
  assert.equal(response.response.player, 2);
  assert.equal(response.bonusRevealPending, false);
  const next = act(response, 'move', 'a4', 'b4');
  assert.equal(next.currentPlayer, 1);
  assert.equal(next.bonusRevealPending, false);
});

test('all stack experiment combinations can be followed by one independent bonus', () => {
  for (let mask = 0; mask < 8; mask++) {
    const stack = { anyAdjacent: Boolean(mask & 1), stackAndStep: Boolean(mask & 2), scouting: Boolean(mask & 4) };
    const state = position({ c3: piece('pawn'), d3: piece('pawn'), f5: piece('bishop', 2, false), a2: piece('pawn', 1, false), h8: piece('king', 2, false) }, {}, stack);
    const extra = stack.stackAndStep ? { step: sq('e4'), ...(stack.scouting ? { scout: sq('f5') } : {}) } : {};
    const bonus = act(state, 'stack', 'c3', 'd3', extra);
    assert.equal(bonus.bonusRevealPending, true);
    const next = act(bonus, 'reveal', 'a2', 'b2');
    assert.equal(next.currentPlayer, 2);
    assert.equal(next.bonusRevealPending, false);
  }
});

test('bonus reveal promotion and repetition keys preserve normal rule semantics', () => {
  const state = position({ a1: piece('rook'), d7: piece('pawn', 1, false), h8: piece('king', 2, false) });
  const bonus = act(state, 'move', 'a1', 'b1');
  assert.notEqual(positionKey(bonus), positionKey({ ...bonus, bonusRevealPending: false }));
  const next = act(bonus, 'reveal', 'd7', 'd8');
  assert.equal(next.board[sq('d8')].type, 'queen');
  assert.match(next.history.at(-1).text, /Bonus reveal:.*revealing pawn\. Promoted to queen/);
  assert.equal(next.currentPlayer, 2);
});

test('a trapped king revealed during the bonus still gets only one preparation action', () => {
  const state = position({ a1: piece('knight'), d4: piece('king', 1, false), c2: piece('pawn', 1, false), d8: piece('rook', 2), e8: piece('rook', 2), f8: piece('rook', 2), h8: piece('king', 2, false) });
  const bonus = act(state, 'move', 'a1', 'b3');
  const response = act(bonus, 'reveal', 'd4', 'e4');
  assert.equal(response.result, null);
  const next = act(response, 'reveal', 'c2', 'd2');
  assert.equal(next.result.winner, 2);
  assert.equal(next.bonusRevealPending, false);
  assert.deepEqual(getLegalActions(next), []);
});

test('seeded play combines the bonus with every stack profile and turn allowance', () => {
  for (let mask = 0; mask < 8; mask++) {
    let seed = 100 + mask;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    let state = createGame({ turn: { bonusReveal: true, actionsPerTurn: 1 + mask % 3 }, stack: { anyAdjacent: Boolean(mask & 1), stackAndStep: Boolean(mask & 2), scouting: Boolean(mask & 4) } }, random);
    for (let i = 0; i < 200 && !state.result; i++) {
      const actions = getLegalActions(state);
      assert.ok(actions.length);
      if (state.bonusRevealPending) {
        assert.equal(state.actionsLeft, 0);
        assert.equal(state.response, null);
        assert.ok(actions.every(a => ['reveal', 'end-turn'].includes(a.kind)));
      }
      const before = state;
      state = applyAction(state, actions[Math.floor(random() * actions.length)]);
      if (before.bonusRevealPending) assert.equal(state.bonusRevealPending, false);
      assert.ok(state.actionsLeft >= 0);
      for (const owner of [1, 2]) {
        const pieces = [...state.board.filter(Boolean), ...state.captured].filter(p => p.owner === owner);
        assert.equal(pieces.reduce((total, p) => total + p.count, 0), 16);
        assert.equal(state.board.filter(p => p?.owner === owner && p.type === 'king').length, 1);
      }
    }
  }
});
