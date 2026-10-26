// Crown & Veil rule data. Everything here is a number or a list, so playtest
// changes rarely need to touch the engine.
export const COLS = 7;
export const ROWS = 11;
export const SQUARES = COLS * ROWS;

export const index = (row, col) => row * COLS + col;
export const rowOf = square => Math.floor(square / COLS);
export const colOf = square => square % COLS;
export const inside = (row, col) => row >= 0 && row < ROWS && col >= 0 && col < COLS;
export const otherPlayer = player => player === 1 ? 2 : 1;
export const distance = (a, b) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
export const squareName = square => `${'abcdefg'[colOf(square)]}${ROWS - rowOf(square)}`;
export const ORTHOGONAL = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function neighbors(square) {
  return ORTHOGONAL.flatMap(([dr, dc]) => inside(rowOf(square) + dr, colOf(square) + dc) ? [index(rowOf(square) + dr, colOf(square) + dc)] : []);
}

// Player 1 starts at the bottom (rows 10–11 in the rules draft), Player 2 at the top.
const homeRows = { 1: [9, 10], 2: [0, 1] };
export const HOME = Object.fromEntries([1, 2].map(player => [player, homeRows[player].flatMap(row => [1, 2, 3, 4, 5].map(col => index(row, col)))]));
export const THRONE = index(5, 3);

export const UNITS = {
  crown: { name: 'Crown', strength: 0, count: 1, text: 'If it is captured, you lose.' },
  champion: { name: 'Champion', strength: 5, count: 1, text: 'No special ability.' },
  guard: { name: 'Guard', strength: 3, count: 2, text: 'While revealed, friendly units next to it get +1 strength when defending.' },
  scout: { name: 'Scout', strength: 2, count: 2, text: 'When revealed: look at one enemy hidden unit up to 3 squares away. Once revealed, moves up to 2 squares.' },
  archer: { name: 'Archer', strength: 2, count: 1, text: 'Attacks a unit exactly 2 squares away in a straight line, and never moves to attack.' },
  builder: { name: 'Builder', strength: 1, count: 1, text: 'When revealed: lay 2 extra land tiles.' },
  assassin: { name: 'Assassin', strength: 1, count: 1, text: 'Always wins when it attacks the Crown or the Champion.' }
};
export const ARMY = Object.entries(UNITS).flatMap(([type, unit]) => Array(unit.count).fill(type));

export const LAND = {
  plains: { name: 'Plains', count: 16, text: 'No effect.' },
  forest: { name: 'Forest', count: 6, text: 'Units here cannot be peeked at.' },
  hill: { name: 'Hill', count: 5, text: '+1 strength when defending here.' },
  river: { name: 'River', count: 3, text: 'No unit may enter it.' }
};
export const LAND_STACK = Object.entries(LAND).flatMap(([type, land]) => Array(land.count).fill(type));

export const SETTINGS = {
  handSize: 2,
  scoutRange: 3,
  builderTiles: 2,
  secondPlayerFirstBuilds: 2,
  // After the land stack and both hands are empty, this many more turns
  // (counting each player's turn separately) before the Throne count decides.
  finalTurns: 20,
  throneZone: 2
};
