import { otherPlayer } from './board.js';
import { getLegalActions, applyAction } from './engine.js';
import { ARMY, shuffled } from './rules/setup.js';
import { attackedSquares } from './rules/movement.js';
import { isAttacked, isInCheck } from './rules/king.js';

export const AI_LEVELS = ['easy', 'normal'];
export const VALUES = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const WIN = 10000;

const pieceValue = piece => VALUES[piece.type] * (piece.count ?? 1);

// The computer plays fair: it sees only what a human at the table sees.
// Hidden identities are erased first, then the remaining public facts
// (revealed and captured pieces) say which types are still unaccounted for.
function concealed(state) {
  return {
    ...state,
    board: state.board.map(piece => piece && (piece.revealed ? { ...piece } : { owner: piece.owner, revealed: false, count: 1, moved: piece.moved })),
    captured: state.captured.map(piece => ({ ...piece })),
    // Repetition keys encode hidden types, so they are not public information.
    repetitions: {}
  };
}

function unseenPool(view, owner) {
  const pool = [...ARMY];
  const remove = type => {
    // A promoted queen came from a pawn; the original queen may still be hidden.
    const at = pool.indexOf(type);
    const pawn = pool.indexOf('pawn');
    if (at !== -1) pool.splice(at, 1);
    else if (pawn !== -1) pool.splice(pawn, 1);
  };
  const seen = [...view.board.filter(p => p?.revealed), ...view.captured].filter(p => p.owner === owner);
  for (const piece of seen) for (let i = 0; i < (piece.count ?? 1); i++) remove(piece.type);
  return pool;
}

// One plausible world consistent with the public board.
function sampleWorld(view, random) {
  const world = { ...view, board: view.board.map(piece => piece && { ...piece }) };
  for (const owner of [1, 2]) {
    const hidden = world.board.flatMap((piece, square) => piece?.owner === owner && !piece.revealed ? [square] : []);
    const pool = shuffled(unseenPool(view, owner), random);
    // Kings are never captured, so an unrevealed king is always among the hidden tiles.
    const king = pool.indexOf('king');
    if (king >= hidden.length && hidden.length) {
      const slot = Math.floor(random() * hidden.length);
      [pool[slot], pool[king]] = [pool[king], pool[slot]];
    }
    hidden.forEach((square, i) => { world.board[square].type = pool[i] ?? 'pawn'; });
  }
  return world;
}

const sameAction = (a, b) => ['kind', 'from', 'to', 'step', 'scout', 'over'].every(key => a[key] === b[key]);

function mobility(state, player) {
  return state.board.reduce((sum, piece, from) => piece?.owner === player && piece.revealed && piece.type !== 'king' ? sum + attackedSquares(state, from).length : sum, 0);
}

// The worst loss the opponent can inflict with one capture next turn.
function hangingLoss(state, player) {
  const enemy = otherPlayer(player);
  let worst = 0;
  state.board.forEach((piece, square) => {
    if (piece?.owner !== player || !piece.revealed || piece.type === 'king' || !isAttacked(state, square, enemy)) return;
    const cheapest = Math.min(...state.board.flatMap((attacker, from) =>
      attacker?.owner === enemy && attacker.revealed && attackedSquares(state, from).includes(square) ? [pieceValue(attacker)] : []));
    const loss = isAttacked(state, square, player) ? pieceValue(piece) - cheapest : pieceValue(piece);
    worst = Math.max(worst, loss);
  });
  return worst;
}

export function evaluate(state, player) {
  if (state.result) return state.result.winner === player ? WIN : state.result.winner ? -WIN : 0;
  const enemy = otherPlayer(player);
  let score = 0;
  for (const piece of state.board) {
    if (!piece) continue;
    score += (piece.owner === player ? 1 : -1) * pieceValue(piece);
    // A revealed king can be checked and mated; a hidden one cannot.
    if (piece.type === 'king' && piece.revealed) score += piece.owner === player ? -1.5 : 1.5;
  }
  score += 0.04 * (mobility(state, player) - mobility(state, enemy));
  if (isInCheck(state, enemy)) score += 0.3;
  if (isInCheck(state, player)) score -= 0.5;
  if (state.currentPlayer === enemy) score -= 0.9 * hangingLoss(state, player);
  else score += 0.3 * hangingLoss(state, enemy);
  return score;
}

function scoreAction(state, action, worlds, player) {
  let total = 0;
  for (const world of worlds) {
    try {
      total += evaluate(applyAction(world, action), player);
    } catch {
      // Should not happen: legality does not depend on hidden identities.
      total -= WIN;
    }
  }
  return total / worlds.length;
}

function captureValue(state, action) {
  if (action.kind !== 'move') return 0;
  const target = state.board[action.to];
  return target ? pieceValue(target) : 0;
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

// Easy: mostly random, but never misses a capture-free checkmate or a juicy capture.
function chooseEasy(state, actions, view, random) {
  const world = sampleWorld(view, random);
  const known = actions.filter(a => a.kind === 'move');
  const mate = known.find(a => applyAction(world, a).result?.winner === state.currentPlayer);
  if (mate) return mate;
  const captures = known.filter(a => captureValue(view, a) > 0).sort((a, b) => captureValue(view, b) - captureValue(view, a));
  if (captures.length && random() < 0.7) return captures[0];
  return pick(actions, random);
}

// Normal: averages a one-move evaluation over several plausible hidden worlds,
// so reveals and challenges are judged by their odds rather than their secrets.
function chooseNormal(state, actions, view, random, samples) {
  const worlds = Array.from({ length: samples }, () => sampleWorld(view, random));
  let best = [];
  let bestScore = -Infinity;
  for (const action of actions) {
    const score = scoreAction(state, action, worlds, state.currentPlayer) + random() * 0.01;
    if (score > bestScore + 1e-9) { best = [action]; bestScore = score; }
    else if (Math.abs(score - bestScore) <= 1e-9) best.push(action);
  }
  return pick(best, random);
}

export function chooseAction(state, { level = 'normal', random = Math.random, samples = 6 } = {}) {
  if (!AI_LEVELS.includes(level)) throw new Error(`Unknown computer level: ${level}`);
  const actions = getLegalActions(state);
  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];
  const view = concealed(state);
  const choice = level === 'easy' ? chooseEasy(state, actions, view, random) : chooseNormal(state, actions, view, random, samples);
  return actions.find(action => sameAction(action, choice));
}
