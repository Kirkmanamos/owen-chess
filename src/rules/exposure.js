import { offset } from '../board.js';

// A reveal IS a horizontal slide into a gap, not an in-place flip. The default
// rightward exit exposes exactly the four d-file tiles of each starting army.
export function revealDestinations(state, square) {
  const piece = state.board[square];
  if (!piece || piece.revealed) return [];
  const directions = state.rules.exposure.mode === 'either-horizontal' ? [1, -1] : [1];
  return directions.map(dc => offset(square, 0, dc)).filter(to => to !== null && state.board[to] === null);
}

export function isExposed(state, square) {
  return revealDestinations(state, square).length > 0;
}
