import { otherPlayer } from '../board.js';
import { attackedSquares } from './movement.js';

export function kingSquare(state, player) {
  return state.board.findIndex(piece => piece?.owner === player && piece.type === 'king' && piece.revealed);
}

export function isAttacked(state, square, byPlayer) {
  return state.board.some((piece, from) => piece?.owner === byPlayer && piece.revealed && attackedSquares(state, from).includes(square));
}

export function isInCheck(state, player) {
  const square = kingSquare(state, player);
  return square !== -1 && isAttacked(state, square, otherPlayer(player));
}

export function newlyCheckedKing(before, after, action) {
  if (!after.rules.king.revealResponse) return null;
  const square = ['reveal', 'challenge'].includes(action.kind) ? action.to : action.scout;
  if (square === undefined) return null;
  const piece = after.board[square];
  return piece.type === 'king' && isInCheck(after, piece.owner) ? piece.owner : null;
}
