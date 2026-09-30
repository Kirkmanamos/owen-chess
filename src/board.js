export const SIZE = 8;
export const otherPlayer = player => player === 1 ? 2 : 1;
export const forward = player => player === 1 ? -1 : 1;
export const inside = (row, col) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
export const index = (row, col) => row * SIZE + col;
export const rowOf = square => Math.floor(square / SIZE);
export const colOf = square => square % SIZE;
export const offset = (square, dr, dc) => {
  const row = rowOf(square) + dr;
  const col = colOf(square) + dc;
  return inside(row, col) ? index(row, col) : null;
};
export const squareName = square => `${'abcdefgh'[colOf(square)]}${8 - rowOf(square)}`;
export const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
export const AROUND = [...ORTHOGONAL, ...DIAGONAL];
export const isPromotionRank = (square, player) => rowOf(square) === (player === 1 ? 0 : 7);
