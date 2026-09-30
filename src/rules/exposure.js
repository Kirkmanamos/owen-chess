import { offset, forward } from '../board.js';

// The opening slide reveals only at its destination, regardless of identity.
// Right is always toward file h; forward follows the owner's pawn direction.
// Legacy modes remain available so playtests can compare opening rules.
export function revealDestinations(state, square) {
  const piece = state.board[square];
  if (!piece || piece.revealed) return [];
  const rules = state.rules.exposure;
  const directions = rules.mode === 'flexible'
    ? [[0, 1, rules.rightRange], [0, -1, rules.leftRange], [forward(piece.owner), 0, rules.forwardRange]]
    : [[0, 1, 1], [0, -1, rules.mode === 'either-horizontal' ? 1 : 0]];
  return directions.flatMap(([dr, dc, range]) => {
    const destinations = [];
    for (let distance = 1; distance <= range; distance++) {
      const to = offset(square, dr * distance, dc * distance);
      // A reveal cannot capture or jump over any tile, including hidden ones.
      if (to === null || state.board[to] !== null) break;
      destinations.push(to);
    }
    return destinations;
  });
}

export function isExposed(state, square) {
  return revealDestinations(state, square).length > 0;
}
