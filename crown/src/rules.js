// Crown & Veil 0.2 — The Wild Core. Rule data and board geometry.
// Squares are numbered row by row from the top; Player 2's home is at the top.
export const COLS = 7;
export const ROWS = 9;
export const SQUARES = COLS * ROWS;

export const index = (row, col) => row * COLS + col;
export const rowOf = square => Math.floor(square / COLS);
export const colOf = square => square % COLS;
export const inside = (row, col) => row >= 0 && row < ROWS && col >= 0 && col < COLS;
export const otherPlayer = player => player === 1 ? 2 : 1;
// Names follow the rules draft: Player 2's home is rows 1–2, Player 1's rows 8–9.
export const squareName = square => `${'abcdefg'[colOf(square)]}${rowOf(square) + 1}`;

export const CORE = index(4, 3);
export const CORE_PATCH = [CORE, index(3, 3), index(5, 3), index(4, 2), index(4, 4)];
export const HOME = {
  1: [7, 8].flatMap(row => [1, 2, 3, 4, 5].map(col => index(row, col))),
  2: [0, 1].flatMap(row => [1, 2, 3, 4, 5].map(col => index(row, col)))
};

// Geometry changes at the Shattering. Before it, squares have 4 neighbours.
// After it, every odd row is shifted half a cell right (a brick layout) and
// each cell has 6 neighbours. Cube coordinates give hex distances and lines.
const SQUARE_DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const HEX_DIRECTIONS = [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]];

function toCube(square) {
  const row = rowOf(square), col = colOf(square);
  const x = col - (row - (row & 1)) / 2;
  return [x, -x - row, row];
}
function fromCube([x, , z]) {
  const row = z, col = x + (z - (z & 1)) / 2;
  return inside(row, col) ? index(row, col) : null;
}

export function step(square, direction, hex) {
  if (!hex) {
    const row = rowOf(square) + direction[0], col = colOf(square) + direction[1];
    return inside(row, col) ? index(row, col) : null;
  }
  const cube = toCube(square);
  return fromCube(cube.map((value, i) => value + direction[i]));
}

export const directions = hex => hex ? HEX_DIRECTIONS : SQUARE_DIRECTIONS;
export const neighbors = (square, hex) => directions(hex).map(direction => step(square, direction, hex)).filter(square => square !== null);

export function distance(a, b, hex) {
  if (!hex) return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
  const [ca, cb] = [toCube(a), toCube(b)];
  return Math.max(...ca.map((value, i) => Math.abs(value - cb[i])));
}

// Screen position of a cell's centre, in cell widths. Used to push units
// "directly away" from the Core and by the screen to draw the brick layout.
export function position(square, hex) {
  const row = rowOf(square), col = colOf(square);
  return hex ? [col + (row & 1) / 2, row * 0.866] : [col, row];
}

export const UNITS = {
  crown: { name: 'Crown', strength: 0, count: 1, text: 'If it is captured, you lose. While revealed, friendly units next to it get +1 strength.' },
  champion: { name: 'Champion', strength: 5, count: 1, text: 'No special ability.' },
  guard: { name: 'Guard', strength: 3, count: 2, text: 'While revealed, friendly units next to it get +1 strength when defending.' },
  scout: { name: 'Scout', strength: 2, count: 2, text: 'When revealed: look at one enemy hidden unit up to 3 steps away. Once revealed, moves up to 2 steps.' },
  archer: { name: 'Archer', strength: 2, count: 1, text: 'Attacks a unit exactly 2 steps away in a straight line, over an empty space, and never moves to attack.' },
  builder: { name: 'Builder', strength: 1, count: 1, text: 'When revealed: lay 2 land tiles of your choice touching existing land.' },
  assassin: { name: 'Assassin', strength: 1, count: 1, text: 'Always wins when it attacks the Crown or the Champion.' }
};
export const ARMY = Object.entries(UNITS).flatMap(([type, unit]) => Array(unit.count).fill(type));

export const LAND = {
  plains: { name: 'Plains', text: 'No effect.' },
  forest: { name: 'Forest', text: 'Units here cannot be peeked at.' },
  hill: { name: 'Hill', text: '+1 strength when defending here.' }
};

// `targets` is how many squares a card marks when it is turned face up.
export const SURGES = {
  grow: { name: 'Grow', targets: 0, text: 'Each player, starting with the next to move, lays 1 land tile touching existing land.' },
  bloom: { name: 'Bloom', targets: 0, text: 'Every square without land within 2 steps of the Core becomes Plains.' },
  flare: { name: 'Flare', targets: 1, text: 'A hidden unit on the marked square is turned face up.' },
  tremor: { name: 'Tremor', targets: 0, text: 'Every unit next to the Core is pushed 1 step directly away from it.' },
  bolt: { name: 'Bolt', targets: 1, text: 'The marked square is struck with strength 3.' },
  storm: { name: 'Storm', targets: 2, text: 'Bolts strike both marked squares with strength 3.' },
  pulse: { name: 'Pulse', targets: 0, text: 'Every unit within 2 steps of the Core is pushed 1 step directly away from it.' },
  sink: { name: 'Sink', targets: 1, text: 'The marked land square is removed, if it is still empty.' },
  wildFlare: { name: 'Wild Flare', targets: 0, text: 'Every hidden unit next to the Core is turned face up.' }
};
export const DECKS = {
  calm: ['grow', 'grow', 'grow', 'bloom', 'flare', 'flare', 'tremor', 'bolt'],
  wild: ['storm', 'storm', 'pulse', 'pulse', 'sink', 'sink', 'wildFlare', 'grow']
};

export const SETTINGS = {
  actionsPerTurn: 2,
  firstTurnActions: 1,
  scoutRange: 3,
  builderTiles: 2,
  boltStrength: 3,
  targetRange: 2, // Flare and Bolt marks fall within this many steps of the Core
  sinkRange: 3,
  shatterRound: 6, // the Shattering happens at the end of this round at the latest
  holdTurns: 2, // a revealed Crown must start this many of its turns on the Core in a row
  maxRounds: 30 // a safety net: after this the Core burns out and the game is drawn
};
