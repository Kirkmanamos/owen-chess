import { AROUND, ORTHOGONAL, offset, rowOf, colOf } from '../board.js';
import { pick } from './random.js';

// Owen's stacks: any of your pieces except the king can stack, up to 3 high,
// including toys taken from your Toy Box. A stack moves like every piece in it
// put together, plus one power. Every stack spins the power slots: a 2-high
// stack spins the normal reel, and stacking a third piece spins the super reel.

export const MAX_STACK = 3;
export const STACK_REACH = 2;
const KNIGHT = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];

export const POWERS = {
  bouncy: { icon: '🦘', name: 'Bouncy', text: 'Also jumps exactly 2 squares in any straight line, right over anything.' },
  froggy: { icon: '🐸', name: 'Froggy', text: 'Also hops like a unicorn.' },
  floaty: { icon: '🎈', name: 'Floaty', text: 'Also floats to any square up to 2 away, over anything.' },
  ghosty: { icon: '👻', name: 'Ghosty', text: 'Also glides up to 3 squares in any straight line, right through pieces.' },
  fort: { icon: '🛡️', name: 'Fort', text: 'Can’t be captured. Ever.' },
  sticky: { icon: '🍯', name: 'Sticky', text: 'Enemy pieces touching it are stuck and can’t move.' },
  swappy: { icon: '🔄', name: 'Swappy', text: 'Can swap places with any of your pieces, anywhere.' },
  sneezy: { icon: '🤧', name: 'Sneezy', text: 'Can sneeze: every enemy touching it is pushed one square away.' },
  pewpew: { icon: '🎯', name: 'Pew Pew', text: 'Can zap an enemy exactly 2 squares away in a straight line, without moving.' },
  // Super powers: the reel for 3-high stacks. Three of a kind hits its jackpot.
  choochoo: { icon: '🚂', name: 'Choo-Choo', text: 'Also slides like a rook.', triple: 'pawn', super: true },
  rainbow: { icon: '🌈', name: 'Rainbow Unicorn', text: 'Hops like a unicorn once, or twice in a row.', triple: 'knight', super: true },
  wizard: { icon: '🧙', name: 'Wizard', text: 'Can teleport to any empty square of its color.', triple: 'bishop', super: true },
  crusher: { icon: '🏰', name: 'Castle Crusher', text: 'Slides like a rook, right through pieces.', triple: 'rook', super: true },
  mega: { icon: '💥', name: 'Mega', text: 'Also moves like a queen.', triple: 'queen', super: true }
};
// The slot reels. Your own pieces spin the tame reel; a captured toy mixed in
// spins the wild one. A third piece spins the super reel.
export const REELS = {
  tame: ['bouncy', 'froggy', 'floaty', 'fort', 'sticky', 'ghosty'],
  wild: ['swappy', 'sneezy', 'pewpew', 'ghosty', 'floaty', 'bouncy'],
  super: ['choochoo', 'rainbow', 'wizard', 'crusher', 'mega']
};
const TRIPLES = Object.fromEntries(Object.entries(POWERS).filter(([, p]) => p.triple).map(([id, p]) => [p.triple, id]));

export const partsOf = piece => piece.parts ?? Array.from({ length: piece.count }, () => ({ type: piece.type, color: piece.owner }));
export const isMixed = (parts, owner) => parts.some(part => part.color !== owner);
const tripleOf = parts => parts.length === 3 && parts.every(part => part.type === parts[0].type) ? TRIPLES[parts[0].type] ?? null : null;

// Builds the piece for a list of parts. A new stack gets `power: null` until
// the engine spins for it, so legality checks never peek at the result.
export function pieceFromParts(parts, owner) {
  if (parts.length === 1) return { owner, type: parts[0].type, revealed: true, count: 1, moved: true };
  return { owner, type: parts[0].type, revealed: true, count: parts.length, moved: true, parts, power: null };
}

export const reelFor = (parts, owner) => tripleOf(parts) ? 'jackpot' : parts.length === 3 ? 'super' : isMixed(parts, owner) ? 'wild' : 'tame';

function spinPower(chaos, parts, owner, reel) {
  if (reel === 'jackpot') return tripleOf(parts);
  // A unicorn already hops, so Froggy would add nothing.
  return pick(chaos, REELS[reel].filter(id => id !== 'froggy' || !parts.some(part => part.type === 'knight')));
}

// After a real action: spin the slots for every stack that was just made.
export function discoverPowers(next, squares) {
  const { chaos } = next;
  for (const square of squares) {
    const piece = next.board[square];
    if (!piece?.parts || piece.power !== null) continue;
    const reel = reelFor(piece.parts, piece.owner);
    piece.power = spinPower(chaos, piece.parts, piece.owner, reel);
    chaos.events.push({ type: 'power', player: piece.owner, square, power: piece.power, reel, parts: piece.parts.map(part => ({ ...part })) });
  }
}

const near = (from, reach) => {
  const squares = [];
  for (let dr = -reach; dr <= reach; dr++) for (let dc = -reach; dc <= reach; dc++) {
    const to = offset(from, dr, dc);
    if (to !== null && to !== from) squares.push(to);
  }
  return squares;
};
const ghostRays = (from, directions, max) => directions.flatMap(([dr, dc]) => Array.from({ length: max }, (_, i) => offset(from, dr * (i + 1), dc * (i + 1)))).filter(to => to !== null);
const jumps = (from, list) => list.map(([dr, dc]) => offset(from, dr, dc)).filter(to => to !== null);

// Attack geometry: the union of every part's movement, plus the power. A pawn
// part steps one square in any direction, like the original pawn stacks.
export function stackTargets(state, from, movement) {
  const piece = state.board[from];
  const squares = new Set();
  for (const type of new Set(piece.parts.map(part => part.type))) {
    for (const to of type === 'pawn' ? jumps(from, AROUND) : movement[type](state, from)) squares.add(to);
  }
  const add = list => list.forEach(to => squares.add(to));
  switch (piece.power) {
    case 'bouncy': add(jumps(from, AROUND.map(([dr, dc]) => [dr * 2, dc * 2]))); break;
    case 'froggy': add(jumps(from, KNIGHT)); break;
    case 'mega': add(movement.queen(state, from)); break;
    case 'floaty': add(near(from, 2)); break;
    case 'ghosty': add(ghostRays(from, AROUND, 3)); break;
    case 'choochoo': add(movement.rook(state, from)); break;
    case 'crusher': add(ghostRays(from, ORTHOGONAL, 7)); break;
    case 'rainbow': add(jumps(from, KNIGHT).flatMap(hop => [hop, ...jumps(hop, KNIGHT)])); break;
  }
  squares.delete(from);
  return [...squares];
}

const isEnemy = (piece, owner) => piece && piece.owner !== owner;
export const canBeCaptured = target => target.type !== 'king' && target.power !== 'fort';

// Touching an enemy Sticky stack freezes a piece in place (it can still stack).
export function isStuck(state, from) {
  const owner = state.board[from].owner;
  return jumps(from, AROUND).some(to => isEnemy(state.board[to], owner) && state.board[to].revealed && state.board[to].power === 'sticky');
}

// Power actions beyond ordinary moves. Only public facts decide availability.
export function specialActions(state, from) {
  const piece = state.board[from];
  const actions = [];
  if (piece.power === 'swappy') {
    state.board.forEach((other, to) => { if (to !== from && other?.owner === piece.owner && other.revealed) actions.push({ kind: 'swap', from, to }); });
  }
  if (piece.power === 'sneezy' && sneezePushes(state, from).length) actions.push({ kind: 'sneeze', from });
  if (piece.power === 'pewpew') {
    for (const to of jumps(from, AROUND.map(([dr, dc]) => [dr * 2, dc * 2]))) {
      const target = state.board[to];
      if (isEnemy(target, piece.owner) && target.revealed && canBeCaptured(target)) actions.push({ kind: 'zap', from, to });
    }
  }
  if (piece.power === 'wizard') {
    const shade = square => (rowOf(square) + colOf(square)) % 2;
    state.board.forEach((other, to) => { if (!other && shade(to) === shade(from)) actions.push({ kind: 'move', from, to }); });
  }
  return actions;
}

// Every touching enemy, hidden or not, slides one square straight away if that square is empty.
export function sneezePushes(state, from) {
  const owner = state.board[from].owner;
  return AROUND.flatMap(([dr, dc]) => {
    const mid = offset(from, dr, dc);
    const out = mid === null ? null : offset(mid, dr, dc);
    return out !== null && isEnemy(state.board[mid], owner) && !state.board[out] ? [[mid, out]] : [];
  });
}

const stackable = piece => piece?.revealed && piece.type !== 'king';

// Stack with any of your pieces up to STACK_REACH squares away (it hops over),
// add a toy from your Toy Box, or pop your top piece off onto an empty neighbor.
export function owenCombinationActions(state, from) {
  const piece = state.board[from];
  if (!stackable(piece)) return [];
  const actions = [];
  for (const to of near(from, STACK_REACH)) {
    const partner = state.board[to];
    if (partner?.owner === piece.owner && stackable(partner) && piece.count + partner.count <= MAX_STACK) actions.push({ kind: 'stack', from, to });
  }
  if (piece.count < MAX_STACK) {
    for (const toy of new Set(state.chaos.toys[piece.owner].map(t => t.type))) actions.push({ kind: 'adopt', from, toy });
  }
  if (piece.parts && poppable(piece) !== -1) {
    for (const to of jumps(from, AROUND)) if (!state.board[to]) actions.push({ kind: 'unstack', from, to });
  }
  return actions;
}

// Toys stay stuck on; only your own top piece (never the bottom one) pops off.
const poppable = piece => piece.parts.findLastIndex((part, i) => i > 0 && part.color === piece.owner);

// Board changes for Owen's stack actions. `next` already has a copied board.
export function changeOwenBoard(next, action, piece, capture) {
  const chaos = next.chaos;
  switch (action.kind) {
    case 'stack': {
      const base = next.board[action.to];
      next.board[action.from] = null;
      next.board[action.to] = null;
      next.board[action.step ?? action.to] = pieceFromParts([...partsOf(base), ...partsOf(piece)], piece.owner);
      break;
    }
    case 'adopt': {
      const toys = [...chaos.toys[piece.owner]];
      const toy = toys.splice(toys.findIndex(t => t.type === action.toy), 1)[0];
      next.chaos = { ...chaos, toys: { ...chaos.toys, [piece.owner]: toys } };
      next.board[action.from] = pieceFromParts([...partsOf(piece), toy], piece.owner);
      break;
    }
    case 'unstack': {
      const parts = [...piece.parts];
      const [top] = parts.splice(poppable(piece), 1);
      next.board[action.from] = pieceFromParts(parts, piece.owner);
      next.board[action.to] = pieceFromParts([top], piece.owner);
      break;
    }
    case 'swap':
      [next.board[action.from], next.board[action.to]] = [{ ...next.board[action.to], moved: true }, { ...piece, moved: true }];
      break;
    case 'sneeze':
      for (const [mid, out] of sneezePushes(next, action.from)) {
        next.board[out] = { ...next.board[mid], moved: true };
        next.board[mid] = null;
      }
      break;
    case 'zap':
      capture(action.to);
      break;
  }
}
