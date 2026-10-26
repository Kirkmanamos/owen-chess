import { applyAction, getLegalActions, shuffled, defenseStrength } from './engine.js';
import { HOME, THRONE, UNITS, ARMY, LAND_STACK, SETTINGS, otherPlayer, neighbors, distance, rowOf, colOf } from './rules.js';

export const VALUE = { crown: 0, champion: 6, guard: 4, scout: 3, archer: 3, builder: 2, assassin: 3 };
const WIN = 10000;

// Setup: usually tuck the Crown into the back row with Guards beside it,
// but not always, so a human cannot simply read the arrangement.
export function chooseLayout(player, random = Math.random) {
  const home = HOME[player];
  const back = home.filter(square => rowOf(square) === (player === 1 ? 10 : 0));
  const crownSquare = random() < 0.75 ? back[1 + Math.floor(random() * 3)] : home[Math.floor(random() * home.length)];
  const layout = Array(home.length).fill(undefined);
  layout[home.indexOf(crownSquare)] = 'crown';
  const beside = shuffled(neighbors(crownSquare).filter(square => home.includes(square)), random);
  beside.slice(0, 2).forEach(square => { layout[home.indexOf(square)] = 'guard'; });
  const rest = [...ARMY];
  for (const type of layout.filter(Boolean)) rest.splice(rest.indexOf(type), 1);
  const fill = shuffled([...rest, null], random);
  return layout.map(type => type === undefined ? fill.pop() : type);
}

const isStale = (state, viewer, seen) => state.successionTurn[otherPlayer(viewer)] !== null && state.successionTurn[otherPlayer(viewer)] > seen.turn;

// One plausible world built only from what `me` may know: the enemy's hidden
// units are drawn from its unaccounted-for units (minus fresh Scout reports),
// and the unseen land tiles are reshuffled between the stack and the enemy hand.
function sampleWorld(state, me, random) {
  const enemy = otherPlayer(me);
  const world = structuredClone({ ...state, log: [] });
  const pool = [...ARMY];
  const take = type => { const at = pool.indexOf(type); if (at !== -1) pool.splice(at, 1); };
  const unknown = [];
  state.units.forEach((unit, square) => {
    if (unit?.owner !== enemy) return;
    const seen = state.knowledge[me][unit.id];
    if (unit.revealed) take(unit.type);
    else if (seen && !isStale(state, me, seen)) { take(seen.type); world.units[square].type = seen.type; }
    else unknown.push(square);
  });
  state.fallen.filter(unit => unit.owner === enemy).forEach(unit => take(unit.type));
  // A Crown that has not been seen must be among the unknown hidden units.
  const draw = shuffled(pool, random);
  const crown = draw.indexOf('crown');
  if (crown >= unknown.length && unknown.length) {
    const slot = Math.floor(random() * unknown.length);
    [draw[slot], draw[crown]] = [draw[crown], draw[slot]];
  }
  unknown.forEach((square, i) => { world.units[square].type = draw[i]; });

  const land = [...LAND_STACK];
  state.land.forEach((type, square) => { if (type && type !== 'throne' && !HOME[1].includes(square) && !HOME[2].includes(square)) land.splice(land.indexOf(type), 1); });
  state.hands[me].forEach(type => land.splice(land.indexOf(type), 1));
  const unseen = shuffled(land, random);
  world.hands[enemy] = unseen.splice(0, state.hands[enemy].length);
  world.stack = unseen;
  return world;
}

function wouldWin(state, from, to) {
  const attacker = state.units[from];
  const defender = state.units[to];
  if (attacker.type === 'assassin' && ['crown', 'champion'].includes(defender.type)) return true;
  return UNITS[attacker.type].strength > defenseStrength(state, to);
}

function canStrike(state, from, to) {
  const attacker = state.units[from];
  if (!attacker?.revealed) return false;
  if (attacker.type !== 'archer') return distance(from, to) === 1;
  const sameLine = rowOf(from) === rowOf(to) || colOf(from) === colOf(to);
  const middle = (from + to) / 2;
  return sameLine && distance(from, to) === 2 && !state.units[middle];
}

// Revealed units of `player` that could attack `target` and win.
const strikers = (state, player, target) => state.units.flatMap((unit, from) =>
  unit?.owner === player && canStrike(state, from, target) && wouldWin(state, from, target) ? [from] : []);

function pathToThrone(state, player) {
  const passable = square => state.land[square] && state.land[square] !== 'river';
  const seen = new Set([THRONE]);
  let frontier = [THRONE];
  for (let steps = 0; steps <= 12; steps++) {
    if (frontier.some(square => state.units[square]?.owner === player)) return steps;
    frontier = frontier.flatMap(neighbors).filter(square => !seen.has(square) && (passable(square) || state.units[square]?.owner === player));
    frontier.forEach(square => seen.add(square));
    if (!frontier.length) break;
  }
  return 13;
}

export function evaluate(state, me) {
  if (state.result) return state.result.winner === me ? WIN : state.result.winner ? -WIN : 0;
  const enemy = otherPlayer(me);
  const toMove = state.currentPlayer;
  let score = 0;
  let myCrown = -1, theirCrown = -1;
  state.units.forEach((unit, square) => {
    if (!unit) return;
    const sign = unit.owner === me ? 1 : -1;
    score += sign * VALUE[unit.type];
    if (unit.revealed && unit.type !== 'crown') score += sign * 0.25;
    if (unit.type === 'crown') unit.owner === me ? myCrown = square : theirCrown = square;
  });

  // Crown safety outweighs everything except winning.
  const crownDanger = (crown, owner) => {
    const attacker = otherPlayer(owner);
    let danger = strikers(state, attacker, crown).length ? (toMove === attacker ? 60 : 8) : 0;
    danger += 0.7 * neighbors(crown).filter(n => state.units[n]?.owner === attacker && !state.units[n].revealed).length;
    const crownUnit = state.units[crown];
    if (crownUnit.revealed) danger += 1.5 - 0.6 * Math.max(0, 4 - distance(crown, THRONE));
    const known = state.knowledge[attacker][crownUnit.id];
    if (known && known.type === 'crown' && !isStale(state, attacker, known)) danger += 3;
    return danger;
  };
  score -= crownDanger(myCrown, me);
  score += crownDanger(theirCrown, enemy) * 0.6;

  // The side about to move can take the best losing unit of the other side.
  const exposed = (owner) => Math.max(0, ...state.units.flatMap((unit, square) =>
    unit?.owner === owner && unit.revealed && unit.type !== 'crown' && strikers(state, otherPlayer(owner), square).length ? [VALUE[unit.type]] : []));
  if (toMove === enemy) score -= 0.8 * exposed(me);
  else score += 0.4 * exposed(enemy);

  // Hunt: revealed fighters drift toward where the enemy Crown is likely to be.
  state.units.forEach((unit, square) => {
    if (unit?.owner === me && unit.revealed && !['crown', 'builder'].includes(unit.type)) score -= 0.08 * distance(square, theirCrown);
  });

  const zone = player => state.units.filter((unit, square) => unit?.owner === player && distance(square, THRONE) <= SETTINGS.throneZone).length;
  // Holding the Throne zone matters more and more as the final countdown runs down.
  const urgency = state.finalTurnsLeft === null ? 0.3 : 2 + 3 * (1 - state.finalTurnsLeft / SETTINGS.finalTurns);
  score += urgency * (zone(me) - zone(enemy));
  score -= 0.25 * pathToThrone(state, me);
  score += 0.4 * Object.entries(state.knowledge[me]).filter(([id, seen]) =>
    !isStale(state, me, seen) && state.units.some(unit => unit && String(unit.id) === id && !unit.revealed)).length;
  return score;
}

const sameAction = (a, b) => ['kind', 'at', 'from', 'to', 'tile', 'with'].every(key => a[key] === b[key]);

export function chooseAction(state, { random = Math.random, samples = 4 } = {}) {
  const me = state.currentPlayer;
  if (state.result) return null;
  if (state.phase === 'setup') return { kind: 'place', layout: chooseLayout(me, random) };
  const actions = getLegalActions(state);
  if (actions.length <= 1) return actions[0] ?? null;
  const worlds = Array.from({ length: samples }, () => sampleWorld(state, me, random));
  let best = null, bestScore = -Infinity;
  for (const action of actions) {
    let total = 0;
    for (const world of worlds) total += evaluate(applyAction(world, action), me);
    const score = total / worlds.length + random() * 0.05;
    if (score > bestScore) { best = action; bestScore = score; }
  }
  return actions.find(action => sameAction(action, best));
}
