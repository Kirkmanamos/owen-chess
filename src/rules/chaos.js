import { otherPlayer, rowOf, colOf, index } from '../board.js';
import { isInCheck } from './king.js';
import { roll } from './random.js';
import { partsOf } from './powers.js';

// Owen's Rules: the win condition is a goal that keeps changing. The
// chaos is tamed three ways: changes are telegraphed (a visible boredom
// countdown and a "nervous" warning), crowns bank progress across goals, and a
// yanked goal pays out a Not Fair token. Every input is public information, so
// goal progress never leaks a hidden identity.

const POINTS = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
const MIDDLE = [index(3, 3), index(3, 4), index(4, 3), index(4, 4)];
const enemyHalf = (square, player) => player === 1 ? rowOf(square) <= 3 : rowOf(square) >= 4;
const ownRank = (square, player) => player === 1 ? 8 - rowOf(square) : rowOf(square) + 1;
const mine = (state, player) => state.board.flatMap((piece, square) => piece?.owner === player && piece.revealed ? [{ ...piece, square }] : []);
const size = pieces => pieces.reduce((total, piece) => total + piece.count, 0);
const capturedBy = (state, player) => size(state.captured.filter(piece => piece.owner !== player));

// Board goals read the current position. Tally goals count public events after
// the goal appears, so a fresh goal always starts both players at zero.
export const GOALS = [
  { id: 'sleepover', icon: '🏕️', title: 'Sleepover!', target: 4,
    text: 'Get 4 of your pieces into the other team’s half at the same time.',
    progress: (state, player) => size(mine(state, player).filter(p => enemyHalf(p.square, player))) },
  { id: 'parade', icon: '🎺', title: 'Parade Time', target: 6,
    text: 'Line up 6 of your revealed pieces on one row.',
    progress: (state, player) => Math.max(0, ...Array.from({ length: 8 }, (_, row) => size(mine(state, player).filter(p => rowOf(p.square) === row)))) },
  { id: 'snack', icon: '🍪', title: 'Snack Attack', target: 8, near: 5,
    text: 'Eat 8 points of enemy pieces after this goal appears. Pawn 1, knight or bishop 3, rook 5, queen 9.',
    tally: (before, after, action, actor) => after.captured.slice(before.captured.length).filter(p => p.owner !== actor).reduce((total, p) => total + POINTS[p.type] * p.count, 0) },
  { id: 'knock', icon: '🚪', title: 'Knock Knock', target: 4,
    text: 'Flip 4 hidden enemy tiles by challenging or scouting after this goal appears.',
    tally: (before, after, action) => (action.kind === 'challenge' ? 1 : 0) + (action.scout !== undefined ? 1 : 0) },
  { id: 'gotcha', icon: '👉', title: 'Gotcha!', target: 2,
    text: 'Put the other king in check 2 times after this goal appears.',
    tally: (before, after, action, actor) => isInCheck(after, otherPlayer(actor)) && !isInCheck(before, otherPlayer(actor)) ? 1 : 0 },
  { id: 'everybody', icon: '🎉', title: 'Everybody Out!', target: 10,
    text: 'Have 10 of your pieces revealed at the same time.',
    progress: (state, player) => size(mine(state, player)) },
  { id: 'adventure', icon: '🗺️', title: 'King’s Big Adventure', target: 5,
    text: 'Walk your revealed king up to your sixth rank. Brave king!',
    progress: (state, player) => {
      const king = mine(state, player).find(p => p.type === 'king');
      return king ? Math.min(5, ownRank(king.square, player) - 1) : 0;
    } },
  { id: 'rainbow', icon: '🌈', title: 'Show Me Everybody', target: 6,
    text: 'Have one of every kind revealed: pawn, knight, bishop, rook, queen and king.',
    progress: (state, player) => new Set(mine(state, player).map(p => p.type)).size },
  { id: 'middle', icon: '🍩', title: 'Hog the Middle', target: 3,
    text: 'Stand on 3 of the 4 middle squares (d4, e4, d5, e5) at once.',
    progress: (state, player) => mine(state, player).filter(p => MIDDLE.includes(p.square)).length },
  { id: 'edges', icon: '🤗', title: 'Hug the Board', target: 4,
    text: 'Touch all four edges at once: rank 1, rank 8, the a-file and the h-file.',
    progress: (state, player) => {
      const squares = mine(state, player).map(p => p.square);
      return [s => rowOf(s) === 0, s => rowOf(s) === 7, s => colOf(s) === 0, s => colOf(s) === 7].filter(edge => squares.some(edge)).length;
    } },
  { id: 'pawn-party', icon: '🥳', title: 'Pawn Party', target: 3,
    text: 'Get 3 pawns into the other team’s half. A pawn stack counts as 2.',
    progress: (state, player) => size(mine(state, player).filter(p => p.type === 'pawn' && enemyHalf(p.square, player))) },
  { id: 'twins', icon: '👯', title: 'Twin Towers', target: 2, needsStacks: true,
    text: 'Have 2 stacks on the board at the same time.',
    progress: (state, player) => mine(state, player).filter(p => p.count >= 2).length },
  { id: 'collector', icon: '🧸', title: 'Toy Collector', target: 3,
    text: 'Be ahead by 3 captured pieces. A captured stack counts as 2.',
    progress: (state, player) => Math.max(0, capturedBy(state, player) - capturedBy(state, otherPlayer(player))) }
];
const GOAL = Object.fromEntries(GOALS.map(goal => [goal.id, goal]));

export function progressOf(state, player, goal = GOAL[state.chaos.goal]) {
  return goal.tally ? state.chaos.tally[player] : goal.progress(state, player);
}

const nearAt = goal => goal.near ?? goal.target - 1;
export function isNear(state, player) {
  const goal = GOAL[state.chaos.goal];
  const progress = progressOf(state, player, goal);
  return progress >= nearAt(goal) && progress < goal.target;
}

const isLocked = state => state.turnNumber < state.chaos.lockedUntil;
const owen = (state, text) => state.history.push({ number: state.actionNumber, player: null, text: `Owen: ${text}` });

// Owen never picks a goal someone is already close to finishing.
function drawGoal(state) {
  const { chaos } = state;
  const fresh = goal => goal.tally || [1, 2].every(player => goal.progress(state, player) < nearAt(goal));
  const allowed = GOALS.filter(goal => goal.id !== chaos.goal && (!goal.needsStacks || state.rules.stack.enabled));
  const preferred = allowed.filter(goal => fresh(goal) && !chaos.recent.includes(goal.id));
  const pool = preferred.length ? preferred : allowed.filter(fresh).length ? allowed.filter(fresh) : allowed;
  const goal = pool[Math.floor(roll(chaos) * pool.length)];
  chaos.goal = goal.id;
  chaos.goalTurn = state.turnNumber;
  chaos.tally = { 1: 0, 2: 0 };
  chaos.recent = [...chaos.recent, goal.id].slice(-4);
  return goal;
}

// Whenever a goal is yanked away (other than by being won), anyone one step
// from finishing it gets a Not Fair token.
function changeGoal(state, reason, player = null) {
  const { chaos } = state;
  const robbed = [1, 2].filter(p => p !== player && isNear(state, p));
  for (const p of robbed) chaos.tokens[p] = Math.min(state.rules.chaos.maxTokens, chaos.tokens[p] + 1);
  const goal = drawGoal(state);
  chaos.events.push({ type: reason, player, robbed, goal: goal.id });
  const lead = { 'nuh-uh': 'Nuh-uh! I changed my mind.', bored: 'I’m bored of that one.', redraw: `Not fair? Okay, Player ${player} gets a new goal.` }[reason];
  owen(state, `${lead} New goal: ${goal.title}.${robbed.length ? ` Not Fair token for ${robbed.map(p => `Player ${p}`).join(' and ')}.` : ''}`);
}

export function createChaos(state, random) {
  state.chaos = {
    seed: Math.floor(random() * 4294967296) >>> 0, goal: null, goalTurn: 1, tally: { 1: 0, 2: 0 },
    crowns: { 1: 0, 2: 0 }, tokens: { 1: 0, 2: 0 }, lockedUntil: 0, lockedBy: null, tokenTurn: 0, sugarTurn: 0, hugTurn: 0, recent: [], events: [],
    toys: { 1: [], 2: [] }, recipes: {}
  };
  drawGoal(state);
}

// Spending a token is a free side action. It never uses up an ordinary action
// or unlocks End turn, and it is limited to one per turn.
export function chaosActions(state) {
  const { chaos } = state;
  if (!chaos || state.result || state.response || state.bonusRevealPending) return [];
  if (!chaos.tokens[state.currentPlayer] || chaos.tokenTurn === state.turnNumber || isLocked(state)) return [];
  return [{ kind: 'goal-redraw' }, { kind: 'goal-lock' }];
}

export function applyChaosAction(state, action) {
  const next = { ...state, chaos: { ...structuredClone(state.chaos), events: [] }, history: [...state.history] };
  const player = state.currentPlayer;
  next.chaos.tokens[player] -= 1;
  next.chaos.tokenTurn = state.turnNumber;
  if (action.kind === 'goal-redraw') changeGoal(next, 'redraw', player);
  else {
    next.chaos.lockedUntil = state.turnNumber + 3; // Through the opponent's turn and your next one.
    next.chaos.lockedBy = player;
    next.chaos.events.push({ type: 'lock', player, goal: next.chaos.goal });
    owen(next, `Pinky promise with Player ${player}: ${GOAL[next.chaos.goal].title} stays until Player ${player}'s next turn ends.`);
  }
  return next;
}

// Captured enemies go into the capturer's Toy Box. A big catch (anything but a
// pawn) gives a Sugar Rush, one extra action at most once per turn, and every
// fourth toy pays a Not Fair token. Returns whether to add the extra action.
export const TOYS_PER_TOKEN = 4;
export function captureRewards(before, next, action, actor) {
  const toys = next.captured.slice(before.captured.length);
  if (!next.chaos || !toys.length) return false;
  const { chaos } = next;
  const square = action.step ?? action.to;
  chaos.events.push({ type: 'capture', player: actor, square, toys: toys.map(p => ({ type: p.type, count: p.count, owner: p.owner })) });
  // A captured stack comes apart: every piece in it becomes its own toy.
  chaos.toys = { ...chaos.toys, [actor]: [...chaos.toys[actor], ...toys.flatMap(partsOf)] };
  const earned = Math.floor(capturedBy(next, actor) / TOYS_PER_TOKEN) - Math.floor(capturedBy(before, actor) / TOYS_PER_TOKEN);
  if (earned > 0 && chaos.tokens[actor] < next.rules.chaos.maxTokens) {
    chaos.tokens[actor] = Math.min(next.rules.chaos.maxTokens, chaos.tokens[actor] + earned);
    chaos.events.push({ type: 'toy-token', player: actor, square });
    owen(next, `Player ${actor}'s Toy Box is full enough for a Not Fair token!`);
  }
  const sugar = toys.some(p => p.type !== 'pawn') && chaos.sugarTurn !== before.turnNumber;
  if (sugar) {
    chaos.sugarTurn = before.turnNumber;
    chaos.events.push({ type: 'sugar', player: actor, square });
    owen(next, `Sugar rush! Player ${actor} gets one more action.`);
  }
  return sugar;
}

// Runs after every ordinary action. The engine has already given `next` its own
// chaos copy (with this action's capture events) and a fresh history array.
export function updateChaos(before, next, action, actor) {
  if (!before.chaos) return null;
  const { chaos } = next;
  const goal = GOAL[chaos.goal];
  if (goal.tally) chaos.tally[actor] += goal.tally(before, next, action, actor);

  const winner = [actor, otherPlayer(actor)].find(player => progressOf(next, player, goal) >= goal.target);
  if (winner) {
    chaos.crowns[winner] += 1;
    owen(next, `Player ${winner} finished ${goal.title} and gets a crown!`);
    if (chaos.crowns[winner] >= next.rules.chaos.crownsToWin) {
      chaos.events.push({ type: 'crown', player: winner, goal: goal.id, final: true });
      return { winner, reason: `Collected ${chaos.crowns[winner]} of Owen’s crowns` };
    }
    chaos.lockedUntil = 0;
    const fresh = drawGoal(next);
    chaos.events.push({ type: 'crown', player: winner, goal: fresh.id });
    owen(next, `New goal: ${fresh.title}.`);
    return null;
  }

  // Changes only happen as the turn passes, and never during a pinky promise.
  if (next.turnNumber === before.turnNumber || isLocked(next)) return null;
  if ([1, 2].some(player => isNear(next, player)) && roll(chaos) < next.rules.chaos.nuhUhChance) changeGoal(next, 'nuh-uh');
  else if (turnsLeft(next) <= 0) changeGoal(next, 'bored');
  return null;
}

const turnsLeft = state => state.chaos.goalTurn + state.rules.chaos.boredTurns - state.turnNumber;

export function publicChaos(state) {
  const { chaos } = state;
  if (!chaos) return null;
  const goal = GOAL[chaos.goal];
  const per = fn => ({ 1: fn(1), 2: fn(2) });
  return {
    goal: { id: goal.id, icon: goal.icon, title: goal.title, text: goal.text, target: goal.target, tally: Boolean(goal.tally) },
    progress: per(player => Math.min(goal.target, progressOf(state, player, goal))),
    near: per(player => isNear(state, player)),
    crowns: { ...chaos.crowns }, tokens: { ...chaos.tokens },
    crownsToWin: state.rules.chaos.crownsToWin, nuhUhChance: state.rules.chaos.nuhUhChance,
    turnsLeft: Math.max(0, turnsLeft(state)), locked: isLocked(state), lockedBy: isLocked(state) ? chaos.lockedBy : null,
    events: structuredClone(chaos.events), toys: structuredClone(chaos.toys),
    recipes: Object.entries(chaos.recipes).map(([key, power]) => ({ key, power })),
    freeStack: chaos.hugTurn !== state.turnNumber
  };
}
