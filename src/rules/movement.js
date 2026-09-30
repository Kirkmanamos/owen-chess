import { AROUND, ORTHOGONAL, DIAGONAL, forward, offset, rowOf } from '../board.js';
import { stackAttacks, stackMoves } from './pawn-stack.js';

const KNIGHT = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];

function rays(state, from, directions) {
  const targets = [];
  for (const [dr, dc] of directions) {
    let to = offset(from, dr, dc);
    while (to !== null) {
      targets.push(to);
      if (state.board[to]) break;
      to = offset(to, dr, dc);
    }
  }
  return targets;
}

// Attack geometry is independent of turn and self-check, as in chess. Hidden
// pieces block lines but exert no attacks. This also handles pinned defenders.
export const MOVEMENT = {
  king: (state, from) => AROUND.map(([dr, dc]) => offset(from, dr, dc)).filter(s => s !== null),
  queen: (state, from) => rays(state, from, AROUND),
  rook: (state, from) => rays(state, from, ORTHOGONAL),
  bishop: (state, from) => rays(state, from, DIAGONAL),
  knight: (state, from) => KNIGHT.map(([dr, dc]) => offset(from, dr, dc)).filter(s => s !== null),
  pawn: (state, from) => [-1, 1].map(dc => offset(from, forward(state.board[from].owner), dc)).filter(s => s !== null)
};

export function attackedSquares(state, from) {
  const piece = state.board[from];
  if (!piece?.revealed) return [];
  if (piece.type === 'pawn' && piece.count === 2) return stackAttacks(state, from);
  return MOVEMENT[piece.type](state, from);
}

function targetAction(state, from, to) {
  const target = state.board[to];
  if (!target) return { kind: 'move', from, to };
  if (target.owner === state.board[from].owner) return null;
  if (!target.revealed) return { kind: 'challenge', from, to };
  if (target.type === 'king') return null;
  return { kind: 'move', from, to };
}

export function movementActions(state, from) {
  const piece = state.board[from];
  if (!piece?.revealed) return [];
  if (piece.type === 'pawn' && piece.count === 2) return stackMoves(state, from);
  if (piece.type !== 'pawn') return attackedSquares(state, from).map(to => targetAction(state, from, to)).filter(Boolean);

  const actions = [];
  const d = forward(piece.owner);
  const one = offset(from, d, 0);
  if (one !== null && !state.board[one]) {
    actions.push({ kind: 'move', from, to: one });
    const two = offset(from, d * 2, 0);
    const home = piece.owner === 1 ? 6 : 1;
    if (state.rules.pawn.initialDoubleStep && !piece.moved && rowOf(from) === home && two !== null && !state.board[two]) actions.push({ kind: 'move', from, to: two });
  }
  for (const to of attackedSquares(state, from)) {
    if (state.board[to]) {
      const action = targetAction(state, from, to);
      if (action) actions.push(action);
    }
  }
  return actions;
}
