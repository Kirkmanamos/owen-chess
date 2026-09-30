import { index } from '../board.js';

export const ARMY = ['king', 'queen', 'rook', 'rook', 'bishop', 'bishop', 'knight', 'knight', ...Array(8).fill('pawn')];

export function shuffled(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function setupBoard(rules, random = Math.random) {
  const board = Array(64).fill(null);
  for (const owner of [1, 2]) {
    const pieces = shuffled(ARMY, random);
    for (let i = 0; i < 16; i++) {
      const row = Math.floor(i / 4) + (owner === 1 ? 4 : 0);
      const col = i % 4;
      board[index(row, col)] = { owner, type: pieces[i], revealed: false, count: 1, moved: false };
    }
  }
  return board;
}
