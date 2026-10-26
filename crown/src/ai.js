import { applyAction, getLegalActions, shuffled, defenseStrength, attackStrength, moveDestinations } from './engine.js';
import { HOME, CORE, ARMY, SETTINGS, otherPlayer, neighbors, distance, directions, step, rowOf } from './rules.js';

export const VALUE = { crown: 0, champion: 6, guard: 4, scout: 3, archer: 3, builder: 2, assassin: 3 };
const WIN = 10000;

// Setup: usually tuck the Crown into the back row with Guards beside it,
// but not always, so a human cannot simply read the arrangement.
export function chooseLayout(player, random = Math.random) {
  const home = HOME[player];
  const back = home.filter(square => rowOf(square) === (player === 1 ? 8 : 0));
  const crownSquare = random() < 0.75 ? back[1 + Math.floor(random() * 3)] : home[Math.floor(random() * home.length)];
  const layout = Array(home.length).fill(undefined);
  layout[home.indexOf(crownSquare)] = 'crown';
  const beside = shuffled(neighbors(crownSquare, false).filter(square => home.includes(square)), random);
  beside.slice(0, 2).forEach(square => { layout[home.indexOf(square)] = 'guard'; });
  const rest = [...ARMY];
  for (const type of layout.filter(Boolean)) rest.splice(rest.indexOf(type), 1);
  const fill = shuffled([...rest, null], random);
  return layout.map(type => type === undefined ? fill.pop() : type);
}

const isStale = (state, viewer, seen) => state.successionTurn[otherPlayer(viewer)] !== null && state.successionTurn[otherPlayer(viewer)] > seen.turn;

// One plausible world built only from what `me` may know. Enemy hidden units
// are drawn from the unaccounted-for pool, and the unseen order of the surge
// deck and the engine's random seed are replaced, so future surge cards and
// marks stay unknown, just as they are to a human.
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
  world.deck = shuffled(state.deck, random);
  world.seed = Math.floor(random() * 2 ** 32);
  return world;
}

function wouldWin(state, from, to) {
  const attacker = state.units[from];
  const defender = state.units[to];
  if (attacker.type === 'assassin' && ['crown', 'champion'].includes(defender.type)) return true;
  return attackStrength(state, from) > defenseStrength(state, to);
}

// Whether the unit on `from`, standing on `at`, could strike `to` — geometry only.
function strikesFrom(state, from, at, to) {
  const hex = state.shattered;
  if (state.units[from].type !== 'archer') return neighbors(at, hex).includes(to);
  return directions(hex).some(direction => {
    const middle = step(at, direction, hex);
    return middle !== null && (!state.units[middle] || middle === from) && step(middle, direction, hex) === to;
  });
}

const canStrike = (state, from, to) => Boolean(state.units[from]?.revealed) && strikesFrom(state, from, from, to);

// Units of `player` that could defeat the unit on `target` within one full turn
// of two actions: move then attack, or reveal then attack. In a sampled world
// hidden enemy units have guessed identities, so their threat is a guess too.
const reachThreats = (state, player, target) => state.units.flatMap((unit, from) => {
  if (unit?.owner !== player || canStrike(state, from, target) || !wouldWin(state, from, target)) return [];
  const reach = unit.revealed ? moveDestinations(state, from).some(at => strikesFrom(state, from, at, target)) : strikesFrom(state, from, from, target);
  return reach ? [from] : [];
});

// Revealed units of `player` that could attack `target` and win.
const strikers = (state, player, target) => state.units.flatMap((unit, from) =>
  unit?.owner === player && canStrike(state, from, target) && wouldWin(state, from, target) ? [from] : []);

// How badly a showing surge will hurt `player`'s units if it fires on this board.
function surgeThreat(state, player, surge) {
  if (!surge) return 0;
  const { card, targets } = surge;
  let loss = 0;
  for (const square of targets) {
    const unit = state.units[square];
    if (unit?.owner !== player) continue;
    if (['bolt', 'storm'].includes(card) && SETTINGS.boltStrength >= defenseStrength(state, square)) loss += unit.type === 'crown' ? 50 : VALUE[unit.type];
    if (card === 'flare' && !unit.revealed) loss += unit.type === 'crown' ? 2 : 0.3;
  }
  return loss;
}

export function evaluate(state, me) {
  if (state.result) return state.result.winner === me ? WIN : state.result.winner ? -WIN : 0;
  const enemy = otherPlayer(me);
  const toMove = state.currentPlayer;
  const hex = state.shattered;
  let score = 0;
  const crowns = {};
  state.units.forEach((unit, square) => {
    if (!unit) return;
    const sign = unit.owner === me ? 1 : -1;
    score += sign * VALUE[unit.type];
    if (unit.revealed && unit.type !== 'crown') score += sign * 0.25;
    if (unit.type === 'crown') crowns[unit.owner] = square;
  });

  // Crown safety outweighs everything except winning.
  const crownDanger = owner => {
    const square = crowns[owner];
    const attacker = otherPlayer(owner);
    let danger = strikers(state, attacker, square).length ? (toMove === attacker ? 60 : 8) : 0;
    // With two actions, a unit one step away (or hidden next door) is a threat too.
    if (!danger && reachThreats(state, attacker, square).length) danger = toMove === attacker ? 45 : 6;
    const known = state.knowledge[attacker][state.units[square].id];
    if (known && known.type === 'crown' && !isStale(state, attacker, known)) danger += 3;
    return danger;
  };
  score -= crownDanger(me);
  score += 0.6 * crownDanger(enemy);

  // The Core: holding it aims the surges, and a revealed Crown there is a win in waiting.
  const coreValue = player => {
    const holder = state.units[CORE];
    if (holder?.owner !== player) return 0;
    if (holder.type !== 'crown' || !holder.revealed) return 1.5;
    return strikers(state, otherPlayer(player), CORE).length ? 2 : 8 + 6 * state.crownHold[player];
  };
  score += coreValue(me) - coreValue(enemy);
  // Revealed Crowns lead from the front: drift toward the Core.
  for (const player of [me, enemy]) {
    const crown = state.units[crowns[player]];
    if (crown.revealed) score += (player === me ? 1 : -1) * 0.3 * Math.max(0, 5 - distance(crowns[player], CORE, hex));
  }

  // The side about to move can take the best losing unit of the other side.
  const exposed = owner => Math.max(0, ...state.units.flatMap((unit, square) =>
    unit?.owner === owner && unit.revealed && unit.type !== 'crown' && strikers(state, otherPlayer(owner), square).length ? [VALUE[unit.type]] : []));
  if (toMove === enemy) score -= 0.8 * exposed(me);
  else score += 0.4 * exposed(enemy);

  // Stay out from under both showing surges: after this turn there is no chance
  // to move before either strikes. The enemy can still dodge the second one.
  score -= 0.9 * (surgeThreat(state, me, state.surge) + surgeThreat(state, me, state.upcoming));
  score += 0.5 * surgeThreat(state, enemy, state.surge) + 0.15 * surgeThreat(state, enemy, state.upcoming);

  // Fighters close in on where the enemy Crown is likely to be, and everyone presses toward the Core.
  state.units.forEach((unit, square) => {
    if (unit?.owner !== me) return;
    if (unit.revealed && !['crown', 'builder'].includes(unit.type)) score -= 0.08 * distance(square, crowns[enemy], hex);
    if (unit.type !== 'crown') score -= 0.04 * distance(square, CORE, hex);
  });
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
    // Ending a turn early is only worth it when nothing else helps.
    const score = total / worlds.length + random() * 0.05 - (action.kind === 'end-turn' ? 0.2 : 0);
    if (score > bestScore) { best = action; bestScore = score; }
  }
  return actions.find(action => sameAction(action, best));
}

