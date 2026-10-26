// Simulation bots. They see only public information: hidden tiles (including
// their own) are valued at the expected value of that army's unrevealed pool,
// and reveal or challenge outcomes are never peeked at before choosing.
import { applyAction, getLegalActions } from '../../src/engine.js';
import { attackedSquares } from '../../src/rules/movement.js';
import { isInCheck } from '../../src/rules/king.js';
import { ARMY } from '../../src/rules/setup.js';
import { positionKey } from '../../src/rules/outcome.js';
import { otherPlayer, isPromotionRank } from '../../src/board.js';

export const VALUE = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const HIDDEN_DISCOUNT = 0.7;
const pieceValue = p => VALUE[p.type] * (p.count || 1);

// Expected value of one hidden tile for an owner, from public facts only.
function hiddenValue(state, owner) {
  const remaining = {};
  for (const type of ARMY) remaining[type] = (remaining[type] || 0) + 1;
  const seen = [...state.board.filter(p => p?.owner === owner && p.revealed), ...state.captured.filter(p => p.owner === owner)];
  for (const p of seen) {
    // Promoted pieces began as pawns; pawn stacks account for two pawns.
    const type = remaining[p.type] > 0 ? p.type : 'pawn';
    remaining[type] = Math.max(0, remaining[type] - (p.count || 1));
  }
  let total = 0, count = 0;
  for (const [type, n] of Object.entries(remaining)) { total += VALUE[type] * n; count += n; }
  return count ? total / count : 0;
}

// Public board after an action, without learning any hidden identity. A tile
// that slides out stays hidden but is marked `pending`: it blocks and can be
// attacked (at its expected value), but exerts no attacks yet.
function publicAfter(state, action) {
  const board = state.board.map(p => p && (p.revealed ? { ...p } : { owner: p.owner, revealed: false, count: 1, pending: p.pending }));
  const piece = board[action.from];
  switch (action.kind) {
    case 'reveal':
      board[action.to] = { ...piece, pending: true };
      board[action.from] = null;
      break;
    case 'move':
      board[action.to] = { ...piece };
      board[action.from] = null;
      if (piece.type === 'pawn' && piece.count === 1 && isPromotionRank(action.to, piece.owner)) board[action.to].type = state.rules.pawn.promotion;
      break;
    case 'stack':
      board[action.from] = null;
      board[action.to] = null;
      board[action.step ?? action.to] = { ...piece, count: 2 };
      break;
    case 'unstack':
      board[action.from] = { ...piece, count: 1 };
      board[action.to] = { ...piece, count: 1 };
      break;
  }
  return { ...state, board };
}

// `meToMove` says who acts next: the side to move can rescue or capture first.
function evaluate(state, me, meToMove = false) {
  const opp = otherPlayer(me);
  const hidden = { [me]: hiddenValue(state, me), [opp]: hiddenValue(state, opp) };
  const attacks = { [me]: new Map(), [opp]: new Map() };
  const mobility = { [me]: 0, [opp]: 0 };
  let material = 0;
  state.board.forEach((p, sq) => {
    if (!p) return;
    // A hidden tile is worth a little less than its average: it cannot act yet.
    const value = p.revealed ? pieceValue(p) : HIDDEN_DISCOUNT * hidden[p.owner];
    material += p.owner === me ? value : -value;
    if (!p.revealed) return;
    const squares = attackedSquares(state, sq);
    mobility[p.owner] += squares.length;
    const attackerValue = p.type === 'king' ? 100 : pieceValue(p);
    for (const t of squares) attacks[p.owner].set(t, Math.min(attacks[p.owner].get(t) ?? Infinity, attackerValue));
  });
  // Worst exposure for each side: an attacked revealed piece loses its value if
  // undefended, otherwise the difference against the cheapest attacker.
  const exposure = owner => {
    const enemy = otherPlayer(owner);
    let worst = 0;
    state.board.forEach((p, sq) => {
      if (p?.owner !== owner || !(p.revealed || p.pending) || p.type === 'king' || !attacks[enemy].has(sq)) return;
      const value = p.pending ? hidden[owner] : pieceValue(p);
      const loss = attacks[owner].has(sq) ? Math.max(0, value - attacks[enemy].get(sq)) : value;
      worst = Math.max(worst, loss);
    });
    return worst;
  };
  const [mine, theirs] = meToMove ? [0.15, 0.9] : [0.9, 0.15];
  return material - mine * exposure(me) + theirs * exposure(opp) + 0.03 * (mobility[me] - mobility[opp])
    + (isInCheck(state, opp) ? 0.4 : 0);
}

function scoreAction(state, action, me) {
  if (action.kind === 'end-turn' || action.kind === 'finish-response') return evaluate(publicAfter(state, { kind: 'none' }), me);
  if (action.kind === 'challenge') return evaluate(publicAfter(state, action), me) + 0.3;
  const after = publicAfter(state, action);
  let score = evaluate(after, me);
  if (action.scout !== undefined) score += 0.3;
  // Only actions without a flip may consult the real engine: to spot mate, and
  // to avoid shuffling back into positions already seen (repetition draws).
  if (action.kind !== 'reveal' && action.scout === undefined) {
    const real = applyAction(state, action);
    if (real.result?.winner === me) score += 1000;
    const seen = real.repetitions[positionKey(real)] - 1;
    score -= 0.6 * seen;
  }
  return score;
}

const endsTurn = (state, action) => action.kind === 'end-turn' || state.bonusRevealPending || state.response
  || state.actionsLeft - (action.kind === 'reveal' && !state.rules.turn.revealCostsAction ? 0 : 1) <= 0;

// Two-ply: assume the opponent answers with its best one-ply reply on the
// public board, then score the position with us to move.
function lookaheadScore(state, action, me) {
  const base = scoreAction(state, action, me);
  if (base > 500 || action.kind === 'finish-response' || !endsTurn(state, action)) return base;
  const opp = otherPlayer(me);
  const after = {
    ...publicAfter(state, action), currentPlayer: opp, actionsLeft: 1, response: null, responseQueue: [],
    bonusRevealPending: false, turnActivity: false, result: null
  };
  const replies = getLegalActions(after);
  if (!replies.length) return isInCheck(after, opp) ? base + 500 : base;
  let best = null;
  for (const reply of replies) {
    const leaf = publicAfter(after, reply);
    const theirs = evaluate(leaf, opp) + (reply.kind === 'challenge' ? 0.3 : 0);
    if (!best || theirs > best.theirs) best = { theirs, mine: evaluate(leaf, me, true) };
  }
  // Keep the one-ply extras (repetition, scouting, challenges) on top.
  return best.mine + (base - evaluate(publicAfter(state, action), me));
}

export const bots = {
  random: (state, actions, random) => ({ action: actions[Math.floor(random() * actions.length)] }),
  // One-ply greedy with small noise so games vary.
  greedy: (state, actions, random) => {
    const me = state.currentPlayer;
    const scored = actions.map(action => ({ action, score: scoreAction(state, action, me) + random() * 0.2 }));
    scored.sort((a, b) => b.score - a.score);
    const close = scored.filter(s => scored[0].score - s.score < 0.5).length;
    return { action: scored[0].action, close };
  },
  lookahead: (state, actions, random) => {
    const me = state.currentPlayer;
    const scored = actions.map(action => ({ action, score: lookaheadScore(state, action, me) + random() * 0.2 }));
    scored.sort((a, b) => b.score - a.score);
    const close = scored.filter(s => scored[0].score - s.score < 0.5).length;
    return { action: scored[0].action, close };
  }
};

export { getLegalActions, applyAction };
